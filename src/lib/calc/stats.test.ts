import { describe, expect, it } from "vitest";
import { describeCorrelation, pearson, slope } from "./stats";
import { consecutiveHighIntensityDays, sessionLoad } from "./load";

describe("pearson", () => {
  it("完全な正の相関", () => {
    expect(pearson([{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 6 }])).toBeCloseTo(1);
  });
  it("分散0やデータ不足は null", () => {
    expect(pearson([{ x: 1, y: 2 }, { x: 1, y: 3 }])).toBeNull();
    expect(pearson([{ x: 1, y: 2 }])).toBeNull();
  });
  it("表現", () => {
    expect(describeCorrelation(0.1)).toContain("ほとんど");
    expect(describeCorrelation(-0.5)).toBe("中程度の負の関連が見られます");
  });
});

describe("slope", () => {
  it("傾き", () => {
    expect(slope([{ x: 0, y: 70 }, { x: 7, y: 69.3 }])).toBeCloseTo(-0.1);
  });
});

describe("load", () => {
  it("セッションRPE", () => {
    expect(sessionLoad(7, 120)).toBe(840);
  });
  it("連続高強度日数", () => {
    const recs = ["2026-10-18", "2026-10-19", "2026-10-20", "2026-10-15"].map((date) => ({ date, highIntensity: true }));
    expect(consecutiveHighIntensityDays(recs, "2026-10-20")).toBe(3);
    expect(consecutiveHighIntensityDays(recs, "2026-10-17")).toBe(0);
  });
  it("月またぎ", () => {
    const recs = ["2026-09-30", "2026-10-01"].map((date) => ({ date, highIntensity: true }));
    expect(consecutiveHighIntensityDays(recs, "2026-10-01")).toBe(2);
  });
});
