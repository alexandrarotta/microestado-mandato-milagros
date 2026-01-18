import type Database from "better-sqlite3";
import { getDecreesForRegime, type Level2DecreeDef } from "./decrees.catalog.js";
import { addNews, applyLevel2Effects, formatEffectsSummary } from "./utils.js";
import { runElectionInternal } from "./elections.js";

interface Level2DecreesState {
  cooldownUntilById: Record<string, number>;
  history: Array<{ decreeId: string; enactedTick: number; summary: string }>;
}

function getTickCount(state: Record<string, unknown>) {
  return typeof state.tickCount === "number" ? state.tickCount : 0;
}

function ensureDecreesState(state: Record<string, unknown>) {
  const level2 = state.level2 as Record<string, unknown> | undefined;
  if (!level2) return null;
  if (!level2.decrees) {
    level2.decrees = { cooldownUntilById: {}, history: [] };
  }
  return level2.decrees as Level2DecreesState;
}

function canAfford(state: Record<string, unknown>, decree: Level2DecreeDef) {
  const treasury = typeof state.treasury === "number" ? state.treasury : 0;
  const admin = typeof state.admin === "number" ? state.admin : 0;
  if (typeof decree.cost.treasury === "number" && treasury < decree.cost.treasury) {
    return false;
  }
  if (typeof decree.cost.admin === "number" && admin < decree.cost.admin) {
    return false;
  }
  return true;
}

export function enactLevel2Decree(
  state: Record<string, unknown>,
  decreeId: string,
  context: { userId: number; db: Database }
) {
  if (state.level !== 2 || !state.level2) {
    return { ok: false, status: 400, error: "Level 2 not active" };
  }

  const level2 = state.level2 as Record<string, unknown>;
  const decreesState = ensureDecreesState(state);
  if (!decreesState) {
    return { ok: false, status: 400, error: "Level 2 not initialized" };
  }

  const roleId = (state.leader as { roleId?: string } | undefined)?.roleId;
  const decrees = getDecreesForRegime(roleId);
  const decree = decrees.find((item) => item.id === decreeId);
  if (!decree) {
    return { ok: false, status: 404, error: "Decree not found" };
  }

  const level2Phase =
    typeof (level2.phase as number | undefined) === "number" ? (level2.phase as number) : 1;
  if (decree.requires?.minPhase && level2Phase < decree.requires.minPhase) {
    return { ok: false, status: 400, error: "Phase locked" };
  }
  if (decree.requires?.regimesAny?.length) {
    if (!roleId || !decree.requires.regimesAny.includes(roleId)) {
      return { ok: false, status: 403, error: "Regime not allowed" };
    }
  }

  const tickCount = getTickCount(state);
  const cooldownUntil = decreesState.cooldownUntilById[decree.id] ?? 0;
  if (tickCount < cooldownUntil) {
    return { ok: false, status: 400, error: "Cooldown active", cooldownUntil };
  }

  if (!canAfford(state, decree)) {
    return { ok: false, status: 400, error: "Insufficient resources" };
  }

  if (decree.action === "CALL_ELECTIONS") {
    const electionResult = runElectionInternal(state, context.userId, context.db, {
      bypassCooldown: false
    });
    if (!electionResult.ok) {
      return electionResult;
    }
  } else {
    if (typeof decree.cost.treasury === "number") {
      state.treasury = Math.max(
        0,
        (typeof state.treasury === "number" ? state.treasury : 0) - decree.cost.treasury
      );
    }
    if (typeof decree.cost.admin === "number") {
      state.admin = Math.max(
        0,
        (typeof state.admin === "number" ? state.admin : 0) - decree.cost.admin
      );
    }
    applyLevel2Effects(state, decree.effects);
  }

  decreesState.cooldownUntilById[decree.id] = tickCount + decree.cooldownTicks;
  const summary = decree.summary ?? formatEffectsSummary(decree.effects) ?? decree.title;
  decreesState.history.unshift({ decreeId: decree.id, enactedTick: tickCount, summary });
  if (decreesState.history.length > 30) {
    decreesState.history = decreesState.history.slice(0, 30);
  }

  level2.decrees = decreesState;

  addNews(state, `DECRETO: ${decree.title} - ${summary}`, "SYSTEM");

  return { ok: true, summary };
}
