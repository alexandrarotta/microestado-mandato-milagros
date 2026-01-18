import type Database from "better-sqlite3";
import { Level2EventsCatalog, type Level2EventDef } from "./events.catalog.js";
import {
  addNews,
  applyLevel2Effects,
  formatEffectsSummary,
  getActiveIndustryTags,
  makeId
} from "./utils.js";
import { runElectionInternal } from "./elections.js";

interface Level2EventState {
  pending: null | {
    instanceId: string;
    eventId: string;
    title: string;
    body: string;
    createdTick: number;
    options: Array<{ optionId: string; label: string; hint?: string }>;
  };
  nextCheckTick: number;
  history: Array<{
    instanceId: string;
    eventId: string;
    title: string;
    chosenOptionId: string;
    createdTick: number;
    resolvedTick: number;
    outcomeSummary: string;
  }>;
}

const EVENT_CHECK_MIN = 10;
const EVENT_CHECK_MAX = 18;
const HISTORY_LIMIT = 40;

function getTickCount(state: Record<string, unknown>) {
  return typeof state.tickCount === "number" ? state.tickCount : 0;
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function ensureEventState(state: Record<string, unknown>) {
  const level2 = state.level2 as Record<string, unknown> | undefined;
  if (!level2) return null;
  if (!level2.events) {
    level2.events = {
      pending: null,
      nextCheckTick: 0,
      history: []
    };
  }
  return level2.events as Level2EventState;
}

function isEventEligible(
  event: Level2EventDef,
  state: Record<string, unknown>,
  activeTags: Set<string>
) {
  const level2 = state.level2 as { phase?: number; macro?: { regime?: string } } | undefined;
  const phase = typeof level2?.phase === "number" ? level2?.phase : 1;
  if (phase < event.minPhase) return false;

  const requires = event.requires;
  if (requires?.regimesAny?.length) {
    const roleId = (state.leader as { roleId?: string } | undefined)?.roleId;
    if (!roleId || !requires.regimesAny.includes(roleId)) return false;
  }
  if (requires?.inflationRegimesAny?.length) {
    const inflationRegime = level2?.macro?.regime;
    if (!inflationRegime || !requires.inflationRegimesAny.includes(inflationRegime)) {
      return false;
    }
  }
  if (requires?.industryTagsAny?.length) {
    if (!requires.industryTagsAny.some((tag) => activeTags.has(tag))) {
      return false;
    }
  }
  return true;
}

function pickWeightedEvent(events: Level2EventDef[]) {
  if (events.length === 0) return null;
  const totalWeight = events.reduce((sum, event) => sum + (event.weight ?? 1), 0);
  let roll = Math.random() * totalWeight;
  for (const event of events) {
    roll -= event.weight ?? 1;
    if (roll <= 0) return event;
  }
  return events[events.length - 1];
}

export function maybeTriggerLevel2Event(state: Record<string, unknown>) {
  if (state.level !== 2 || !state.level2) return { triggered: false };

  const level2 = state.level2 as Record<string, unknown>;
  const eventsState = ensureEventState(state);
  if (!eventsState) return { triggered: false };
  if (eventsState.pending) return { triggered: false };

  const tickCount = getTickCount(state);
  if (tickCount < eventsState.nextCheckTick) {
    return { triggered: false };
  }

  const activeTags = getActiveIndustryTags(state);
  const eligible = Level2EventsCatalog.filter((event) =>
    isEventEligible(event, state, activeTags)
  );

  const selected = pickWeightedEvent(eligible);
  if (!selected) {
    eventsState.nextCheckTick = tickCount + EVENT_CHECK_MIN;
    return { triggered: false, updated: true };
  }

  const instanceId = makeId("l2evt");
  eventsState.pending = {
    instanceId,
    eventId: selected.id,
    title: selected.title,
    body: selected.body,
    createdTick: tickCount,
    options: selected.options.map((option) => ({
      optionId: option.id,
      label: option.label,
      hint: option.hint
    }))
  };
  eventsState.nextCheckTick = tickCount + randomBetween(EVENT_CHECK_MIN, EVENT_CHECK_MAX);

  addNews(state, `EVENTO: ${selected.title} - Se requiere decision.`, "EVENT");
  level2.events = eventsState;
  return { triggered: true, updated: true };
}

export function resolveLevel2Event(
  state: Record<string, unknown>,
  instanceId: string,
  optionId: string,
  context: { userId: number; db: Database }
) {
  if (state.level !== 2 || !state.level2) {
    return { ok: false, status: 400, error: "Level 2 not active" };
  }

  const level2 = state.level2 as Record<string, unknown>;
  const eventsState = ensureEventState(state);
  if (!eventsState?.pending) {
    return { ok: false, status: 400, error: "No pending event" };
  }
  if (eventsState.pending.instanceId !== instanceId) {
    return { ok: false, status: 400, error: "Event mismatch" };
  }

  const eventDef = Level2EventsCatalog.find(
    (event) => event.id === eventsState.pending?.eventId
  );
  if (!eventDef) {
    return { ok: false, status: 400, error: "Event not found" };
  }

  const option = eventDef.options.find((item) => item.id === optionId);
  if (!option) {
    return { ok: false, status: 400, error: "Option not found" };
  }

  const tickCount = getTickCount(state);

  if (eventDef.id === "L2_COALITION_BREAKS" && option.id === "CALL_ELECTIONS") {
    const electionResult = runElectionInternal(state, context.userId, context.db, {
      bypassCooldown: false
    });
    if (!electionResult.ok) {
      return electionResult;
    }
  } else {
    applyLevel2Effects(state, option.effects);
  }

  const baseOutcome = option.outcome ?? "La decision deja una estela confusa.";
  const effectSummary = formatEffectsSummary(option.effects);
  const outcomeSummary = effectSummary
    ? `${baseOutcome} (${effectSummary}).`
    : baseOutcome;

  eventsState.history.unshift({
    instanceId,
    eventId: eventDef.id,
    title: eventDef.title,
    chosenOptionId: option.id,
    createdTick: eventsState.pending.createdTick,
    resolvedTick: tickCount,
    outcomeSummary
  });
  if (eventsState.history.length > HISTORY_LIMIT) {
    eventsState.history = eventsState.history.slice(0, HISTORY_LIMIT);
  }

  eventsState.pending = null;
  level2.events = eventsState;

  addNews(
    state,
    `EVENTO: ${eventDef.title}. Decision: ${option.label}. Resultado: ${outcomeSummary}`,
    "EVENT"
  );

  return { ok: true, outcomeSummary };
}
