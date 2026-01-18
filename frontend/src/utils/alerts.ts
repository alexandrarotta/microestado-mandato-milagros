export type AlertLevel = "OK" | "WARN" | "CRITICAL";

export const ALERT_SCORE: Record<AlertLevel, number> = {
  OK: 0,
  WARN: 1,
  CRITICAL: 2
};

export function getStabilityAlert(value: number): AlertLevel {
  if (value < 25) return "CRITICAL";
  if (value < 50) return "WARN";
  return "OK";
}

export function getHappinessAlert(value: number): AlertLevel {
  if (value < 25) return "CRITICAL";
  if (value < 50) return "WARN";
  return "OK";
}

export function getCorruptionAlert(value: number): AlertLevel {
  if (value > 75) return "CRITICAL";
  if (value > 50) return "WARN";
  return "OK";
}

export function getDebtAlert(debtRatio: number): AlertLevel {
  if (debtRatio > 0.9) return "CRITICAL";
  if (debtRatio > 0.6) return "WARN";
  return "OK";
}

export function getGrowthAlert(value: number): AlertLevel {
  if (value < -1) return "CRITICAL";
  if (value < 0) return "WARN";
  return "OK";
}

export function getTourismPressureAlert(value: number): AlertLevel {
  if (value > 80) return "CRITICAL";
  if (value > 60) return "WARN";
  return "OK";
}

export function getAdminAlert(
  admin: number,
  hasAdminNeeds: boolean,
  adminUnlocked: boolean
): AlertLevel {
  if (!hasAdminNeeds) return "OK";
  if (!adminUnlocked) return "WARN";
  if (admin <= 0) return "CRITICAL";
  if (admin < 5) return "WARN";
  return "OK";
}
