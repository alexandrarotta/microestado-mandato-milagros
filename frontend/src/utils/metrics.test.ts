import { describe, expect, it } from "vitest";
import { formatIndexPct } from "./formatPct";
import { getGdpIndex, resolveBaselineGdp } from "./metrics";

describe("getGdpIndex", () => {
  it("returns 100.0% when gdp equals baseline", () => {
    const index = getGdpIndex(620, 620);
    expect(formatIndexPct(index, 1)).toBe("100.0%");
  });

  it("returns 50.0% when gdp is half of baseline", () => {
    const index = getGdpIndex(310, 620);
    expect(formatIndexPct(index, 1)).toBe("50.0%");
  });

  it("returns 200.0% when gdp doubles baseline", () => {
    const index = getGdpIndex(1240, 620);
    expect(formatIndexPct(index, 1)).toBe("200.0%");
  });

  it("resolves missing baseline to current gdp", () => {
    expect(resolveBaselineGdp(620, undefined)).toBe(620);
    expect(resolveBaselineGdp(620, 0)).toBe(620);
    const index = getGdpIndex(620, undefined);
    expect(formatIndexPct(index, 1)).toBe("100.0%");
  });
});
