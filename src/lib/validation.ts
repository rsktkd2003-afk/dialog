import { z } from "zod";
import { isValidDateString } from "./date";

/** フォームの空文字・未送信項目を null に変換する */
const emptyToNull = (v: unknown) => (v === undefined || (typeof v === "string" && v.trim() === "") ? null : v);

export function optionalNumber(min: number, max: number, label: string) {
  return z.preprocess(
    emptyToNull,
    z.coerce
      .number({ error: `${label}は数値で入力してください` })
      .min(min, `${label}は${min}以上で入力してください`)
      .max(max, `${label}は${max}以下で入力してください`)
      .nullable(),
  );
}

/** 必須項目の空欄は未入力として扱う（null を数値変換すると 0 になってしまうため） */
const emptyToUndefined = (v: unknown) => (v == null || (typeof v === "string" && v.trim() === "") ? undefined : v);

export function requiredNumber(min: number, max: number, label: string) {
  return z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: `${label}を入力してください` })
      .min(min, `${label}は${min}以上で入力してください`)
      .max(max, `${label}は${max}以下で入力してください`),
  );
}

export function optionalInt(min: number, max: number, label: string) {
  return z.preprocess(
    emptyToNull,
    z.coerce
      .number({ error: `${label}は数値で入力してください` })
      .int(`${label}は整数で入力してください`)
      .min(min, `${label}は${min}以上で入力してください`)
      .max(max, `${label}は${max}以下で入力してください`)
      .nullable(),
  );
}

export function requiredInt(min: number, max: number, label: string) {
  return z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ error: `${label}を入力してください` })
      .int(`${label}は整数で入力してください`)
      .min(min, `${label}は${min}以上で入力してください`)
      .max(max, `${label}は${max}以下で入力してください`),
  );
}

export function optionalText(max: number) {
  return z.preprocess(emptyToNull, z.string().trim().max(max, `${max}文字以内で入力してください`).nullable());
}

export const dateString = z
  .string()
  .refine(isValidDateString, "日付が正しくありません")
  .refine((s) => s >= "1900-01-01" && s <= "2100-12-31", "日付の範囲が正しくありません");

export const optionalDate = z.preprocess(emptyToNull, dateString.nullable());

export function optionalEnum<const T extends readonly [string, ...string[]]>(values: T) {
  return z.preprocess(emptyToNull, z.enum(values).nullable());
}

export const LIMITS = {
  heightCm: [100, 250],
  weightKg: [25, 250],
  bodyFatPct: [2, 70],
  circumferenceCm: [10, 250],
  ageYears: [10, 100],
  reachCm: [100, 450],
  verticalJumpCm: [5, 150],
  broadJumpCm: [50, 400],
  practiceMin: [1, 600],
  rpe: [0, 10],
  count: [0, 3000],
  liftKg: [0, 500],
  reps: [1, 100],
  rir: [0, 10],
  restSec: [0, 1800],
  sleepHours: [0, 16],
  scale5: [1, 5],
  energyKcal: [0, 5000],
  macroG: [0, 500],
  servingG: [0.1, 5000],
  amount: [0.01, 5000],
} as const;

export const email = z.string().trim().toLowerCase().email("メールアドレスの形式が正しくありません").max(254);

export type FieldErrors = Record<string, string>;

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function formToObject(form: FormData): Record<string, FormDataEntryValue | FormDataEntryValue[]> {
  const out: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
  for (const key of new Set(form.keys())) {
    const all = form.getAll(key);
    out[key] = key.endsWith("[]") ? all : (all[0] ?? "");
  }
  return out;
}
