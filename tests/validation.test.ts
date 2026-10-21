import { describe, expect, it } from "vitest";
import { bodyMeasurementInput, jumpMeasurementInput } from "../src/lib/repo/body";
import { conditionInput } from "../src/lib/repo/condition";
import { practiceInput } from "../src/lib/repo/practice";
import { basicInfoInput, goalsInput } from "../src/lib/repo/profile";
import { setInput } from "../src/lib/repo/training";
import { dateString } from "../src/lib/validation";

describe("日付", () => {
  it("存在しない日付を拒否", () => {
    expect(dateString.safeParse("2026-02-29").success).toBe(false);
    expect(dateString.safeParse("2028-02-29").success).toBe(true);
    expect(dateString.safeParse("2026-13-01").success).toBe(false);
    expect(dateString.safeParse("20261001").success).toBe(false);
  });
});

describe("身体測定", () => {
  const d = { date: "2026-10-01" };
  it("全項目空は拒否", () => {
    expect(bodyMeasurementInput.safeParse(d).success).toBe(false);
  });
  it("体重の境界値", () => {
    expect(bodyMeasurementInput.safeParse({ ...d, weightKg: "25" }).success).toBe(true);
    expect(bodyMeasurementInput.safeParse({ ...d, weightKg: "24.9" }).success).toBe(false);
    expect(bodyMeasurementInput.safeParse({ ...d, weightKg: "250" }).success).toBe(true);
    expect(bodyMeasurementInput.safeParse({ ...d, weightKg: "250.1" }).success).toBe(false);
  });
  it("体脂肪率には計測方法が必須（推定値を計測値として扱わない）", () => {
    expect(bodyMeasurementInput.safeParse({ ...d, bodyFatPct: "15" }).success).toBe(false);
    expect(bodyMeasurementInput.safeParse({ ...d, bodyFatPct: "15", bodyFatMethod: "bia_scale" }).success).toBe(true);
  });
});

describe("ジャンプ測定", () => {
  const base = { date: "2026-10-01", measurementType: "measured", footwear: "shoes" };
  it("種類ごとの範囲", () => {
    expect(jumpMeasurementInput.safeParse({ ...base, kind: "spike_reach", valueCm: "320" }).success).toBe(true);
    expect(jumpMeasurementInput.safeParse({ ...base, kind: "spike_reach", valueCm: "60" }).success).toBe(false);
    expect(jumpMeasurementInput.safeParse({ ...base, kind: "vertical_jump", valueCm: "60" }).success).toBe(true);
    expect(jumpMeasurementInput.safeParse({ ...base, kind: "vertical_jump", valueCm: "151" }).success).toBe(false);
  });
});

describe("プロフィール", () => {
  it("最優先目標は選択した目標から", () => {
    expect(goalsInput.safeParse({ goals: ["jump"], primaryGoal: "jump" }).success).toBe(true);
    expect(goalsInput.safeParse({ goals: ["jump"], primaryGoal: "fat_loss" }).success).toBe(false);
    expect(goalsInput.safeParse({ goals: [], primaryGoal: "" }).success).toBe(true);
  });
  it("任意項目はすべて空でよい", () => {
    const r = basicInfoInput.safeParse({});
    expect(r.success).toBe(true);
  });
  it("身長の境界値", () => {
    expect(basicInfoInput.safeParse({ heightCm: "99" }).success).toBe(false);
    expect(basicInfoInput.safeParse({ heightCm: "100" }).success).toBe(true);
  });
});

describe("練習・セット・コンディション", () => {
  it("練習時間は1〜600分", () => {
    const p = { date: "2026-10-01", intensity: "high", startTime: "" };
    expect(practiceInput.safeParse({ ...p, durationMin: "0" }).success).toBe(false);
    expect(practiceInput.safeParse({ ...p, durationMin: "600" }).success).toBe(true);
    expect(practiceInput.safeParse({ ...p, durationMin: "601" }).success).toBe(false);
    expect(practiceInput.safeParse({ ...p, durationMin: "120", startTime: "25:00" }).success).toBe(false);
  });
  it("RPEは0.5刻み、回数は整数", () => {
    const s = { exerciseId: "00000000-0000-4000-8000-000000000000", weightKg: "100", reps: "5" };
    expect(setInput.safeParse({ ...s, rpe: "8.5" }).success).toBe(true);
    expect(setInput.safeParse({ ...s, rpe: "8.3" }).success).toBe(false);
    expect(setInput.safeParse({ ...s, reps: "5.5" }).success).toBe(false);
    expect(setInput.safeParse({ ...s, reps: "0" }).success).toBe(false);
  });
  it("コンディションの5段階", () => {
    expect(conditionInput.safeParse({ date: "2026-10-01", fatigue: "6" }).success).toBe(false);
    expect(conditionInput.safeParse({ date: "2026-10-01", fatigue: "5" }).success).toBe(true);
  });
});

describe("必須の数値項目", () => {
  it("空欄を0として受け付けない", () => {
    const s = { exerciseId: "00000000-0000-4000-8000-000000000000", weightKg: "", reps: "5" };
    expect(setInput.safeParse(s).success).toBe(false);
    expect(setInput.safeParse({ ...s, weightKg: "0" }).success).toBe(true);
    expect(practiceInput.safeParse({ date: "2026-10-01", intensity: "high", startTime: "", durationMin: "" }).success).toBe(false);
  });
});
