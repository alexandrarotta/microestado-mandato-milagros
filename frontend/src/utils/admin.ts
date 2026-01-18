export function getAdminHint(adminPerTick: number, adminUnlocked: boolean) {
  if (!adminUnlocked) return "Bloqueado";
  return `+${adminPerTick.toFixed(3)}/tick`;
}
