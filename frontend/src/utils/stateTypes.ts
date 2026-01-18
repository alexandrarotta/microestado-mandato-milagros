import type { StateTypeConfig } from "../types";

export function formatFormalName(
  baseName: string,
  stateTypeId: string,
  stateTypes: StateTypeConfig[],
  otherText?: string
) {
  const trimmedName = baseName.trim();
  if (!trimmedName) return "";

  const stateType = stateTypes.find((item) => item.id === stateTypeId);
  if (!stateType || stateType.id === "NONE") {
    return trimmedName;
  }

  if (stateType.id === "OTHER") {
    const custom = (otherText ?? "").trim();
    if (!custom) return trimmedName;
    if (custom.includes("{name}")) {
      return custom.replace(/\{name\}/g, trimmedName);
    }
    return `${custom} de ${trimmedName}`;
  }

  if (!stateType.prefix) {
    return trimmedName;
  }

  return `${stateType.prefix}${trimmedName}`;
}
