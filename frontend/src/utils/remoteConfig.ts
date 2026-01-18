import type { RemoteConfigDefaults } from "../types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(
  base: Record<string, unknown>,
  overrides: Record<string, unknown>
) {
  const result: Record<string, unknown> = { ...base };
  Object.entries(overrides).forEach(([key, value]) => {
    const current = result[key];
    if (isPlainObject(value) && isPlainObject(current)) {
      result[key] = deepMerge(current, value);
      return;
    }
    result[key] = value;
  });
  return result;
}

export function mergeRemoteConfig(
  defaults: RemoteConfigDefaults,
  overrides: Record<string, unknown>
): RemoteConfigDefaults {
  return deepMerge(defaults as Record<string, unknown>, overrides) as RemoteConfigDefaults;
}
