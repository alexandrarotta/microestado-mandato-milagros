import { test } from "node:test";
import assert from "node:assert/strict";
import type Database from "better-sqlite3";
import { maybeTriggerLevel2Event, resolveLevel2Event } from "./events.js";

const stubDb = {
  prepare: () => ({
    get: () => ({ medals_json: "[]" }),
    run: () => {}
  })
} as unknown as Database;

function buildState() {
  return {
    level: 2,
    tickCount: 10,
    treasury: 200,
    happiness: 50,
    stability: 50,
    institutionalTrust: 50,
    corruption: 40,
    reputation: 50,
    admin: 10,
    employment: 50,
    innovation: 40,
    inequality: 40,
    environmentalImpact: 30,
    resources: 40,
    growthPct: 0.2,
    leader: { roleId: "PRESIDENT" },
    news: [],
    level2: {
      phase: 2,
      complete: false,
      gameOver: false,
      elections: { cooldownUntilTick: 0 },
      macro: { inflationPct: 0.2, regime: "STABLE", centralBank: { cooldownUntilTick: 0 } },
      advisors: [],
      industries: { chosenBaseIndustryId: null, activeIndustries: [] },
      projects: {},
      events: { pending: null, nextCheckTick: 0, history: [] },
      decrees: { cooldownUntilById: {}, history: [] }
    }
  } as Record<string, unknown>;
}

test("level2 events do not trigger in level1", () => {
  const state = buildState();
  state.level = 1;
  const result = maybeTriggerLevel2Event(state);
  assert.equal(result.triggered, false);
});

test("level2 events trigger pending when ready", () => {
  const state = buildState();
  const result = maybeTriggerLevel2Event(state);
  assert.equal(result.updated, true);
  const events = (state.level2 as { events: { pending: unknown } }).events;
  assert.ok(events.pending, "pending event should exist");
});

test("level2 events resolve and add history", () => {
  const state = buildState();
  const events = (state.level2 as { events: { pending: unknown; history: unknown[] } }).events;
  events.pending = {
    instanceId: "evt_1",
    eventId: "L2_CORRUPTION_SCANDAL",
    title: "Escandalo",
    body: "",
    createdTick: 5,
    options: []
  };
  const result = resolveLevel2Event(state, "evt_1", "INVESTIGATE", {
    userId: 1,
    db: stubDb
  });
  assert.equal(result.ok, true);
  assert.equal(events.pending, null);
  assert.equal(events.history.length, 1);
  assert.ok(
    typeof (state as { corruption: number }).corruption === "number",
    "corruption updated"
  );
});
