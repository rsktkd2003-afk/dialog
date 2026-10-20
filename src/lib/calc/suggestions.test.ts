import { describe, expect, it } from "vitest";
import { buildSuggestions, type SuggestionInput } from "./suggestions";

const base: SuggestionInput = {
  today: "2026-10-20",
  age: 20,
  primaryGoal: null,
  latestWeightKg: 70,
  proteinTargetG: 112,
  nutritionDays: [],
  practiceDays: [],
  weights: [],
  conditions: [],
  strengthTrends: [],
  measuredSpikeReaches: [],
};

const ids = (i: SuggestionInput) => buildSuggestions(i).map((s) => s.id);

describe("buildSuggestions", () => {
  it("記録がなければ提案を生成しない", () => {
    expect(buildSuggestions(base)).toEqual([]);
  });

  it("タンパク質不足：直近3日以上の記録が必要、根拠を示す", () => {
    const days = ["2026-10-17", "2026-10-18", "2026-10-19"].map((date) => ({
      date, entryCount: 3, energyKcal: 2000, proteinG: 60, carbsG: 300, hasUnknown: false,
    }));
    const s = buildSuggestions({ ...base, nutritionDays: days });
    expect(s[0]!.id).toBe("protein_low");
    expect(s[0]!.evidence.some((e) => e.includes("平均 60 g"))).toBe(true);
    expect(ids({ ...base, nutritionDays: days.slice(0, 2) })).not.toContain("protein_low");
    // 当日分は集計途中のため含めない
    expect(ids({ ...base, nutritionDays: [...days.slice(0, 2), { ...days[0]!, date: "2026-10-20" }] })).not.toContain("protein_low");
  });

  it("目標の80%以上なら提案しない", () => {
    const days = ["2026-10-17", "2026-10-18", "2026-10-19"].map((date) => ({
      date, entryCount: 3, energyKcal: 2000, proteinG: 90, carbsG: 300, hasUnknown: false,
    }));
    expect(ids({ ...base, nutritionDays: days })).not.toContain("protein_low");
  });

  it("高強度の連続（3日以上）", () => {
    const practiceDays = ["2026-10-18", "2026-10-19", "2026-10-20"].map((date) => ({ date, minutes: 120, intensity: "moderate" as const, rpe: 8 }));
    expect(ids({ ...base, practiceDays })).toContain("high_intensity_streak");
    expect(ids({ ...base, practiceDays: practiceDays.slice(1) })).not.toContain("high_intensity_streak");
  });

  it("練習日の炭水化物不足は2日以上で提案", () => {
    const practiceDays = ["2026-10-17", "2026-10-18"].map((date) => ({ date, minutes: 150, intensity: "high" as const, rpe: null }));
    const nutritionDays = practiceDays.map((p) => ({ date: p.date, entryCount: 3, energyKcal: 2000, proteinG: 120, carbsG: 250, hasUnknown: false }));
    expect(ids({ ...base, practiceDays, nutritionDays })).toContain("carb_low_practice");
    expect(ids({ ...base, practiceDays: practiceDays.slice(0, 1), nutritionDays })).not.toContain("carb_low_practice");
  });

  it("痛みの記録は医療専門職への相談を案内し、最優先で表示", () => {
    const s = buildSuggestions({
      ...base,
      practiceDays: ["2026-10-18", "2026-10-19", "2026-10-20"].map((date) => ({ date, minutes: 120, intensity: "high" as const, rpe: null })),
      conditions: [{ date: "2026-10-19", sleepHours: 7, discomforts: [{ site: "knee", level: 2 }] }],
    });
    expect(s[0]!.id).toBe("pain");
    expect(s[0]!.level).toBe("care");
    expect(s[0]!.detail).toContain("診断を行いません");
  });

  it("違和感(レベル1)でも同じ部位が14日中3日以上なら案内", () => {
    const conditions = ["2026-10-08", "2026-10-12", "2026-10-16"].map((date) => ({ date, sleepHours: null, discomforts: [{ site: "shoulder" as const, level: 1 }] }));
    expect(ids({ ...base, conditions })).toContain("pain");
    expect(ids({ ...base, conditions: conditions.slice(1) })).not.toContain("pain");
  });

  it("睡眠：未成年は8時間、成人は7時間を基準", () => {
    const conditions = ["2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"].map((date) => ({ date, sleepHours: 7.5, discomforts: [] }));
    expect(ids({ ...base, conditions })).not.toContain("sleep_short");
    expect(ids({ ...base, age: 16, conditions })).toContain("sleep_short");
  });

  it("体重の急減（週1%以上）", () => {
    const w = [
      { date: "2026-10-01", weightKg: 70 },
      { date: "2026-10-06", weightKg: 69 },
      { date: "2026-10-11", weightKg: 68 },
      { date: "2026-10-16", weightKg: 67 },
    ];
    expect(ids({ ...base, weights: w })).toContain("weight_rapid_loss");
  });

  it("体重推移は14日以上の幅と4件以上が必要", () => {
    const w = [
      { date: "2026-10-10", weightKg: 70 },
      { date: "2026-10-12", weightKg: 69 },
      { date: "2026-10-14", weightKg: 68 },
      { date: "2026-10-16", weightKg: 67 },
    ];
    expect(ids({ ...base, weights: w })).not.toContain("weight_rapid_loss");
  });

  it("筋力の伸び（2.5%超）", () => {
    const strengthTrends = [
      { exerciseName: "バックスクワット", recentBest: 105, previousBest: 100 },
      { exerciseName: "ベンチプレス", recentBest: 101, previousBest: 100 },
    ];
    const s = buildSuggestions({ ...base, strengthTrends });
    expect(s[0]!.id).toBe("strength_progress");
    expect(s[0]!.evidence).toHaveLength(1);
  });

  it("最高到達点の停滞と更新", () => {
    const old = [
      { date: "2026-08-01", valueCm: 320 },
      { date: "2026-09-01", valueCm: 322 },
    ];
    expect(ids({ ...base, measuredSpikeReaches: [...old, { date: "2026-10-10", valueCm: 321 }] })).toContain("jump_plateau");
    expect(ids({ ...base, measuredSpikeReaches: [...old, { date: "2026-10-10", valueCm: 325 }] })).toContain("jump_progress");
    // 期間が6週未満なら判定しない
    expect(ids({ ...base, measuredSpikeReaches: [{ date: "2026-09-20", valueCm: 320 }, { date: "2026-09-25", valueCm: 320 }, { date: "2026-10-10", valueCm: 319 }] })).toEqual([]);
  });
});
