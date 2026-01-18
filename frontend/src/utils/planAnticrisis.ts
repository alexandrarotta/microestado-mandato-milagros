import type { GameSave } from "../types";

export const PLAN_ANTICRISIS_COOLDOWN_TICKS = 70;
export const PLAN_ANTICRISIS_BASE_EFFECTS = {
  stability: 50,
  happiness: 10,
  treasury: 200,
  corruption: -40
} as const;

export function getPlanAnticrisisUnlocked(save: GameSave) {
  return save.unlocks?.planAnticrisisUnlocked ?? save.emergencyPlanUnlocked ?? false;
}

export function setPlanAnticrisisUnlocked(save: GameSave, unlocked: boolean) {
  save.unlocks = {
    ...(save.unlocks ?? {}),
    planAnticrisisUnlocked: unlocked
  };
  save.emergencyPlanUnlocked = unlocked;
}

export function getPlanAnticrisisCooldownUntil(save: GameSave) {
  return (
    save.cooldowns?.planAnticrisisUntilTick ?? save.emergencyPlanCooldownUntil ?? 0
  );
}

export function setPlanAnticrisisCooldownUntil(save: GameSave, tick: number) {
  save.cooldowns = {
    ...(save.cooldowns ?? {}),
    planAnticrisisUntilTick: tick
  };
  save.emergencyPlanCooldownUntil = tick;
}
