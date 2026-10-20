import type { Warning } from "./types";

/** 年齢（満年齢）を算出する。基準日は today。 */
export function ageFromBirthDate(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = today.split("-").map(Number) as [number, number, number];
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age;
}

export type AgeInput = {
  birthDate?: string | null;
  /** 生年月日の代わりに入力された年齢と、その入力日 */
  ageYears?: number | null;
  ageRecordedOn?: string | null;
};

export type AgeResult = { age: number; approximate: boolean } | null;

/**
 * 生年月日があれば満年齢を、なければ入力された年齢に経過年数を加えた概算年齢を返す。
 * どちらもなければ null（推定しない）。
 */
export function resolveAge(input: AgeInput, today: string): AgeResult {
  if (input.birthDate) return { age: ageFromBirthDate(input.birthDate, today), approximate: false };
  if (input.ageYears != null) {
    const elapsed = input.ageRecordedOn ? ageFromBirthDate(input.ageRecordedOn, today) : 0;
    return { age: input.ageYears + Math.max(0, elapsed), approximate: true };
  }
  return null;
}

export function isMinor(age: number): boolean {
  return age < 18;
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export type BmiAssessment = {
  value: number;
  /** 成人の判定区分。未成年・年齢不明の場合は null（成人基準を当てはめない） */
  category: "underweight" | "normal" | "obese" | null;
  warnings: Warning[];
};

/** 日本肥満学会の成人区分。18歳未満には適用しない。 */
export function assessBmi(weightKg: number, heightCm: number, age: number | null): BmiAssessment {
  const value = bmi(weightKg, heightCm);
  const warnings: Warning[] = [
    {
      code: "bmi_athlete",
      message: "BMIは筋肉量と脂肪量を区別しません。筋肉量の多い選手では高めに出ることがあります。",
    },
  ];
  if (age == null) {
    warnings.push({ code: "bmi_age_unknown", message: "年齢が未入力のため判定区分は表示していません。" });
    return { value, category: null, warnings };
  }
  if (isMinor(age)) {
    warnings.push({
      code: "bmi_minor",
      message: "18歳未満には成人のBMI区分を当てはめていません。成長曲線などでの評価が必要です。",
    });
    return { value, category: null, warnings };
  }
  const category = value < 18.5 ? "underweight" : value < 25 ? "normal" : "obese";
  return { value, category, warnings };
}

export function waistToHeightRatio(waistCm: number, heightCm: number): number {
  return waistCm / heightCm;
}

/** 体脂肪率(%)と体重から除脂肪量(kg)を算出する。体脂肪率は計測値のみを受け付ける。 */
export function fatFreeMass(weightKg: number, bodyFatPct: number): number {
  return weightKg * (1 - bodyFatPct / 100);
}
