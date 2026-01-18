import { describe, expect, it } from "vitest";
import {
  activatePlanAnticrisis,
  maybeUnlockPlanAnticrisis
} from "./engine";
import {
  getPlanAnticrisisCooldownUntil,
  getPlanAnticrisisUnlocked,
  PLAN_ANTICRISIS_COOLDOWN_TICKS
} from "../utils/planAnticrisis";
import type { GameSave } from "../types";

const makeSave = (overrides: Partial<GameSave> = {}) =>
  ({
    treasury: 0,
    stability: 40,
    happiness: 40,
    corruption: 40,
    tourismPressure: 20,
    tickCount: 10,
    news: [],
    emergencyPlanUnlocked: false,
    emergencyPlanCooldownUntil: 0,
    unlocks: { planAnticrisisUnlocked: false },
    cooldowns: { planAnticrisisUntilTick: 0 },
    ...overrides
  }) as GameSave;

describe("plan anticrisis unlock", () => {
  it("unlocks when treasury hits zero", () => {
    const save = makeSave({ treasury: 0, unlocks: { planAnticrisisUnlocked: false } });
    const unlocked = maybeUnlockPlanAnticrisis(save);
    expect(unlocked).toBe(true);
    expect(getPlanAnticrisisUnlocked(save)).toBe(true);
  });
});

describe("plan anticrisis activation", () => {
  it("activates once and sets cooldown when ready", () => {
    const save = makeSave({
      unlocks: { planAnticrisisUnlocked: true },
      emergencyPlanUnlocked: true,
      tickCount: 25
    });
    const result = activatePlanAnticrisis(save, "auto");
    expect(result.ok).toBe(true);
    expect(getPlanAnticrisisCooldownUntil(save)).toBe(
      save.tickCount + PLAN_ANTICRISIS_COOLDOWN_TICKS
    );
  });

  it("does not activate during cooldown", () => {
    const save = makeSave({
      unlocks: { planAnticrisisUnlocked: true },
      emergencyPlanUnlocked: true,
      tickCount: 10,
      cooldowns: { planAnticrisisUntilTick: 99 },
      emergencyPlanCooldownUntil: 99
    });
    const result = activatePlanAnticrisis(save, "auto");
    expect(result.ok).toBe(false);
    expect(getPlanAnticrisisCooldownUntil(save)).toBe(99);
  });
});

describe("plan anticrisis critical bonus", () => {
  it("adds +10 only to CRITICAL metrics and clamps", () => {
    const save = makeSave({
      unlocks: { planAnticrisisUnlocked: true },
      emergencyPlanUnlocked: true,
      stability: 10,
      happiness: 10,
      corruption: 90,
      tourismPressure: 95,
      treasury: 0
    });
    activatePlanAnticrisis(save, "auto");
    expect(save.stability).toBe(70);
    expect(save.happiness).toBe(30);
    expect(save.corruption).toBe(60);
    expect(save.tourismPressure).toBe(100);
  });
});
