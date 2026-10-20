import { describe, expect, it } from "vitest";
import { bestEstimatedOneRepMax, estimateOneRepMax, heaviestSet, volumeLoad } from "./strength";

describe("estimateOneRepMax", () => {
  it("Epley と Brzycki", () => {
    const e = estimateOneRepMax(100, 5)!;
    expect(e.epley).toBeCloseTo(116.667, 2);
    expect(e.brzycki).toBeCloseTo(112.5);
    expect(e.average).toBeCloseTo(114.583, 2);
  });
  it("1回は重量そのもの", () => {
    const e = estimateOneRepMax(100, 1)!;
    expect(e.epley).toBe(100);
    expect(e.brzycki).toBeCloseTo(100);
  });
  it("適用範囲外は推定しない", () => {
    expect(estimateOneRepMax(100, 10)).not.toBeNull();
    expect(estimateOneRepMax(100, 11)).toBeNull();
    expect(estimateOneRepMax(100, 0)).toBeNull();
    expect(estimateOneRepMax(0, 5)).toBeNull();
    expect(estimateOneRepMax(100, 2.5)).toBeNull();
  });
});

describe("集計", () => {
  const sets = [
    { weightKg: 80, reps: 8 },
    { weightKg: 100, reps: 3 },
    { weightKg: 60, reps: 15 },
  ];
  it("総負荷量", () => {
    expect(volumeLoad(sets)).toBe(640 + 300 + 900);
  });
  it("最大推定1RMは範囲内のセットのみから", () => {
    expect(bestEstimatedOneRepMax(sets)).toBeCloseTo((100 * 1.1 + (100 * 36) / 34) / 2);
    expect(bestEstimatedOneRepMax([{ weightKg: 60, reps: 15 }])).toBeNull();
  });
  it("最大重量のセット", () => {
    expect(heaviestSet(sets)).toEqual({ weightKg: 100, reps: 3 });
    expect(heaviestSet([])).toBeNull();
  });
});
