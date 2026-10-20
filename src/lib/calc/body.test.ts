import { describe, expect, it } from "vitest";
import { ageFromBirthDate, assessBmi, bmi, fatFreeMass, resolveAge, waistToHeightRatio } from "./body";

describe("ageFromBirthDate", () => {
  it("誕生日前日はまだ加算しない", () => {
    expect(ageFromBirthDate("2008-04-02", "2026-04-01")).toBe(17);
    expect(ageFromBirthDate("2008-04-02", "2026-04-02")).toBe(18);
  });
  it("うるう日生まれ", () => {
    expect(ageFromBirthDate("2004-02-29", "2026-02-28")).toBe(21);
    expect(ageFromBirthDate("2004-02-29", "2026-03-01")).toBe(22);
  });
});

describe("resolveAge", () => {
  it("生年月日を優先する", () => {
    expect(resolveAge({ birthDate: "2000-01-01", ageYears: 30 }, "2026-10-20")).toEqual({ age: 26, approximate: false });
  });
  it("年齢入力は経過年数を加えた概算", () => {
    expect(resolveAge({ ageYears: 20, ageRecordedOn: "2024-10-21" }, "2026-10-20")).toEqual({ age: 21, approximate: true });
  });
  it("どちらもなければ推定しない", () => {
    expect(resolveAge({}, "2026-10-20")).toBeNull();
  });
});

describe("BMI", () => {
  it("計算値", () => {
    expect(bmi(70, 175)).toBeCloseTo(22.857, 3);
  });
  it("成人区分の境界値", () => {
    expect(assessBmi(18.5 * 1.7 * 1.7, 170, 25).category).toBe("normal");
    expect(assessBmi(18.49 * 1.7 * 1.7, 170, 25).category).toBe("underweight");
    expect(assessBmi(25 * 1.7 * 1.7, 170, 25).category).toBe("obese");
  });
  it("未成年・年齢不明には区分を当てはめない", () => {
    expect(assessBmi(80, 170, 17).category).toBeNull();
    expect(assessBmi(80, 170, 17).warnings.some((w) => w.code === "bmi_minor")).toBe(true);
    expect(assessBmi(80, 170, null).category).toBeNull();
  });
});

describe("その他の身体指標", () => {
  it("ウエスト身長比", () => {
    expect(waistToHeightRatio(80, 160)).toBe(0.5);
  });
  it("除脂肪量", () => {
    expect(fatFreeMass(70, 15)).toBeCloseTo(59.5);
  });
});
