export function formatPct(value: number, decimals = 0, signed = false) {
  const sign = value < 0 ? "-" : signed && value > 0 ? "+" : "";
  return `${sign}${Math.abs(value).toFixed(decimals)}%`;
}

export function formatIndexPct(value: number, decimals = 1) {
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(decimals)}%`;
}
