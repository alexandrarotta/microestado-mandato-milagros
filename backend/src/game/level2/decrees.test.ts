import { test } from "node:test";
import assert from "node:assert/strict";
import type Database from "better-sqlite3";
import { enactLevel2Decree } from "./decrees.js";

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
    admin: 20,
    happiness: 50,
    stability: 50,
    institutionalTrust: 50,
    corruption: 40,
    reputation: 50,
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

test("level2 decrees do not enact in level1", () => {
  const state = buildState();
  state.level = 1;
  const result = enactLevel2Decree(state, "DEC_TRANSPARENCY", {
    userId: 1,
    db: stubDb
  });
  assert.equal(result.ok, false);
});

test("level2 decrees apply effects and cooldown", () => {
  const state = buildState();
  const result = enactLevel2Decree(state, "DEC_TRANSPARENCY", {
    userId: 1,
    db: stubDb
  });
  assert.equal(result.ok, true);
  const decrees = (state.level2 as { decrees: { cooldownUntilById: Record<string, number>; history: unknown[] } }).decrees;
  assert.ok(decrees.cooldownUntilById.DEC_TRANSPARENCY > 0);
  assert.equal(decrees.history.length, 1);
});
