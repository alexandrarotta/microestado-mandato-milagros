export function resolveBaselineGdp(gdp: number, baselineGdp?: number | null) {
  if (typeof baselineGdp === "number" && baselineGdp > 0) {
    return baselineGdp;
  }
  const safeGdp = Number.isFinite(gdp) ? gdp : 1;
  return Math.max(1, safeGdp);
}

export function getGdpIndex(gdp: number, baselineGdp?: number | null) {
  const resolvedBaseline = resolveBaselineGdp(gdp, baselineGdp);
  if (!Number.isFinite(gdp) || !Number.isFinite(resolvedBaseline)) return 100;
  if (resolvedBaseline <= 0) return 100;
  return (gdp / resolvedBaseline) * 100;
}
