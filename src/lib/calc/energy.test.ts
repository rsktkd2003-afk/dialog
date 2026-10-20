import { describe, expect, it } from "vitest";
import {
  carbRangeGPerKg,
  computeDailyTargets,
  dailyExpenditure,
  estimateBmr,
  mifflinStJeor,
  type BmrEstimate,
} from "./energy";

function bmrOk(input: Parameters<typeof estimateBmr>[0]): BmrEstimate {
  const r = estimateBmr(input);
  if (!r.ok) throw new Error(r.message);
  return r.value;
}

describe("estimateBmr", () => {
  it("Mifflin-St Jeor 男性", () => {
    expect(mifflinStJeor(70, 175, 20, "male")).toBeCloseTo(1698.75);
    expect(mifflinStJeor(70, 175, 20, "female")).toBeCloseTo(1532.75);
  });

  it("体脂肪率の実測値があれば除脂肪量ベース（性別に依存しない）", () => {
    const v = bmrOk({ weightKg: 70, heightCm: null, age: null, sex: "unspecified", measuredBodyFatPct: 15 });
    expect(v.method).toBe("jiss_ffm");
    expect(v.kcal.min).toBeCloseTo(1695.75);
    expect(v.kcal.max).toBeCloseTo(1695.75);
    expect(v.fatFreeMassKg).toBeCloseTo(59.5);
  });

  it("性別未回答なら男女の式の幅を返す", () => {
    const v = bmrOk({ weightKg: 70, heightCm: 175, age: 20, sex: "unspecified", measuredBodyFatPct: null });
    expect(v.kcal.min).toBeCloseTo(1532.75);
    expect(v.kcal.max).toBeCloseTo(1698.75);
    expect(v.warnings.some((w) => w.code === "bmr_sex_range")).toBe(true);
  });

  it("性別がnullでも幅で返す（勝手に補完しない）", () => {
    const v = bmrOk({ weightKg: 70, heightCm: 175, age: 20, sex: null, measuredBodyFatPct: null });
    expect(v.kcal.min).not.toBe(v.kcal.max);
  });

  it("体重がなければ推定しない", () => {
    const r = estimateBmr({ weightKg: null, heightCm: 175, age: 20, sex: "male", measuredBodyFatPct: null });
    expect(r.ok).toBe(false);
  });

  it("身長・年齢が欠けていれば不足項目を返す", () => {
    const r = estimateBmr({ weightKg: 70, heightCm: null, age: null, sex: "male", measuredBodyFatPct: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.missing).toEqual(["身長", "年齢（生年月日）"]);
  });

  it("19歳未満には成人式の限界を警告", () => {
    const v = bmrOk({ weightKg: 60, heightCm: 170, age: 16, sex: "male", measuredBodyFatPct: null });
    expect(v.warnings.some((w) => w.code === "bmr_minor")).toBe(true);
  });
});

describe("dailyExpenditure", () => {
  it("休養日は BMR × 日常生活PAL", () => {
    const e = dailyExpenditure(1700, 70, "normal", []);
    expect(e.totalKcal).toBeCloseTo(2550);
    expect(e.exerciseKcal).toBe(0);
  });

  it("運動時間分は日常生活PALから除外して二重計上しない", () => {
    const e = dailyExpenditure(1700, 70, "normal", [{ kind: "volleyball", intensity: "moderate", minutes: 120 }]);
    expect(e.baseKcal).toBeCloseTo((1700 * 1.5 * 1320) / 1440);
    expect(e.exerciseKcal).toBeCloseTo(4 * 70 * 2);
    expect(e.totalKcal).toBeCloseTo(2337.5 + 560);
  });

  it("運動時間は1日(1440分)を超えて計上しない", () => {
    const e = dailyExpenditure(1700, 70, "normal", [
      { kind: "volleyball", intensity: "high", minutes: 1000 },
      { kind: "strength", intensity: "high", minutes: 1000 },
    ]);
    expect(e.exerciseMinutes).toBe(1440);
    expect(e.baseKcal).toBe(0);
    expect(e.exerciseKcal).toBeCloseTo(6 * 70 * (1000 / 60) + 6 * 70 * (440 / 60));
  });

  it("負の時間は0として扱う", () => {
    const e = dailyExpenditure(1700, 70, "normal", [{ kind: "volleyball", intensity: "high", minutes: -30 }]);
    expect(e.totalKcal).toBeCloseTo(2550);
  });
});

describe("carbRangeGPerKg", () => {
  it("境界値", () => {
    expect(carbRangeGPerKg([]).min).toBe(3);
    expect(carbRangeGPerKg([{ kind: "volleyball", intensity: "moderate", minutes: 44 }]).min).toBe(3);
    expect(carbRangeGPerKg([{ kind: "volleyball", intensity: "moderate", minutes: 45 }]).min).toBe(5);
    expect(carbRangeGPerKg([{ kind: "volleyball", intensity: "moderate", minutes: 90 }]).min).toBe(5);
    expect(carbRangeGPerKg([{ kind: "volleyball", intensity: "moderate", minutes: 91 }]).min).toBe(6);
    expect(carbRangeGPerKg([{ kind: "volleyball", intensity: "high", minutes: 241 }]).min).toBe(8);
    expect(carbRangeGPerKg([{ kind: "volleyball", intensity: "low", minutes: 180 }]).min).toBe(3);
  });
});

describe("computeDailyTargets", () => {
  const male20 = bmrOk({ weightKg: 70, heightCm: 175, age: 20, sex: "male", measuredBodyFatPct: null });
  const base = {
    bmr: male20,
    weightKg: 70,
    age: 20,
    activity: "normal" as const,
    blocks: [],
    primaryGoal: null,
    manualAdjustKcal: 0,
  };

  it("休養日・調整なし", () => {
    const t = computeDailyTargets(base);
    // 1698.75 × 1.5 = 2548.125
    expect(t.energyKcal).toEqual({ min: 2550, max: 2550 });
    expect(t.proteinG).toEqual({ min: 112, max: 112 });
    expect(t.fatG.min).toBe(71);
    expect(t.carbsG.min).toBe(366);
    expect(t.goalAdjustment.kind).toBe("none");
  });

  it("体脂肪減少（成人）は10%減", () => {
    const t = computeDailyTargets({ ...base, primaryGoal: "fat_loss" });
    expect(t.goalAdjustment.kind).toBe("deficit");
    expect(t.energyKcal.min).toBe(2290);
    expect(t.proteinGPerKg).toBe(2.0);
  });

  it("体脂肪減少の削減量は500kcalが上限", () => {
    const big = bmrOk({ weightKg: 100, heightCm: 195, age: 25, sex: "male", measuredBodyFatPct: null });
    const t = computeDailyTargets({
      ...base,
      bmr: big,
      weightKg: 100,
      primaryGoal: "fat_loss",
      blocks: [{ kind: "volleyball", intensity: "high", minutes: 240 }],
    });
    expect(t.goalAdjustment.kcal).toEqual({ min: -500, max: -500 });
  });

  it("未成年には減量の削減を適用しない", () => {
    const minor = bmrOk({ weightKg: 60, heightCm: 170, age: 16, sex: "male", measuredBodyFatPct: null });
    const t = computeDailyTargets({ ...base, bmr: minor, weightKg: 60, age: 16, primaryGoal: "fat_loss" });
    expect(t.goalAdjustment.kind).toBe("none");
    expect(t.warnings.some((w) => w.code === "minor_no_deficit")).toBe(true);
  });

  it("年齢不明でも減量の削減を適用しない", () => {
    const ffm = bmrOk({ weightKg: 70, heightCm: null, age: null, sex: null, measuredBodyFatPct: 15 });
    const t = computeDailyTargets({ ...base, bmr: ffm, age: null, primaryGoal: "fat_loss" });
    expect(t.goalAdjustment.kind).toBe("none");
  });

  it("基礎代謝量の推定値を下限とする", () => {
    const t = computeDailyTargets({ ...base, manualAdjustKcal: -2000 });
    expect(t.energyKcal.min).toBe(1700);
    expect(t.warnings.some((w) => w.code === "floor_bmr")).toBe(true);
  });

  it("性別未回答なら目標も幅で返す", () => {
    const unspecified = bmrOk({ weightKg: 70, heightCm: 175, age: 20, sex: "unspecified", measuredBodyFatPct: null });
    const t = computeDailyTargets({ ...base, bmr: unspecified });
    expect(t.energyKcal.min).toBeLessThan(t.energyKcal.max);
    expect(t.carbsG.min).toBeLessThan(t.carbsG.max);
  });

  it("練習日は運動分が加算され、炭水化物の目安も変わる", () => {
    const t = computeDailyTargets({ ...base, blocks: [{ kind: "volleyball", intensity: "high", minutes: 150 }] });
    expect(t.exerciseKcal.min).toBe(1050);
    expect(t.carbRecommendation.min).toBe(6);
    expect(t.sources).toContain("ainsworth2011");
  });

  it("炭水化物が目安を下回る場合は警告（数値は書き換えない）", () => {
    const t = computeDailyTargets({
      ...base,
      primaryGoal: "fat_loss",
      blocks: [{ kind: "volleyball", intensity: "high", minutes: 300 }],
    });
    expect(t.warnings.some((w) => w.code === "carb_below_range")).toBe(true);
  });

  it("除脂肪量が分かる場合はエネルギー不足を警告", () => {
    const ffm = bmrOk({ weightKg: 70, heightCm: null, age: 25, sex: null, measuredBodyFatPct: 10 });
    const t = computeDailyTargets({
      ...base,
      bmr: ffm,
      primaryGoal: "fat_loss",
      manualAdjustKcal: -800,
      blocks: [{ kind: "volleyball", intensity: "high", minutes: 180 }],
    });
    expect(t.warnings.some((w) => w.code === "low_energy_availability")).toBe(true);
  });
});
