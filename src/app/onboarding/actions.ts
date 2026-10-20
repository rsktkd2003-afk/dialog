"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/components/form";
import { requireUser } from "@/lib/auth/server";
import { todayString } from "@/lib/date";
import { getDb } from "@/lib/db/client";
import { addBodyMeasurement, addJumpMeasurement, bodyMeasurementInput, jumpMeasurementInput } from "@/lib/repo/body";
import { basicInfoInput, completeOnboarding, goalsInput, habitsInput, upsertProfile } from "@/lib/repo/profile";
import { toFieldErrors } from "@/lib/validation";

/** 設定画面から編集した場合は設定画面に戻る（戻り先は固定値のみ許可） */
function next(step: number, form?: FormData): never {
  if (form?.get("returnTo") === "/settings") redirect("/settings?saved=1");
  redirect(step >= 4 ? "/onboarding/done" : `/onboarding?step=${step + 1}`);
}

export async function saveBasicInfo(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = basicInfoInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  const today = todayString();
  const d = parsed.data;
  if (d.birthDate && d.birthDate > today) return { errors: { birthDate: "未来の日付は入力できません" } };
  await upsertProfile(getDb(), user.id, {
    ...d,
    ageYears: d.birthDate ? null : d.ageYears,
    ageRecordedOn: !d.birthDate && d.ageYears != null ? today : null,
  });
  next(1, form);
}

const REACH_FIELDS = [
  ["standingReach", "standing_reach"],
  ["spikeReach", "spike_reach"],
  ["blockReach", "block_reach"],
] as const;

export async function saveMeasurements(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const raw = Object.fromEntries(form);
  const date = todayString();
  const db = getDb();
  const bodyFields = ["weightKg", "bodyFatPct", "waistCm", "neckCm", "chestCm", "hipCm", "thighCm", "calfCm"];
  const hasBody = bodyFields.some((k) => typeof raw[k] === "string" && raw[k].trim() !== "");
  const errors: Record<string, string> = {};

  let body = null;
  if (hasBody) {
    const parsed = bodyMeasurementInput.safeParse({ ...raw, date });
    if (!parsed.success) Object.assign(errors, toFieldErrors(parsed.error));
    else body = parsed.data;
  }
  const jumps = [];
  for (const [field, kind] of REACH_FIELDS) {
    const v = raw[field];
    if (typeof v !== "string" || v.trim() === "") continue;
    const parsed = jumpMeasurementInput.safeParse({
      date,
      kind,
      valueCm: v,
      measurementType: raw.reachMeasurementType || "self_reported",
      footwear: raw.reachFootwear || "unknown",
    });
    if (!parsed.success) errors[field] = parsed.error.issues[0]?.message ?? "入力を確認してください";
    else jumps.push(parsed.data);
  }
  if (Object.keys(errors).length > 0) return { errors };
  if (body) await addBodyMeasurement(db, user.id, body);
  for (const j of jumps) await addJumpMeasurement(db, user.id, j);
  next(2, form);
}

export async function saveHabits(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = habitsInput.safeParse({
    ...Object.fromEntries(form),
    practiceDays: form.getAll("practiceDays"),
    strengthDays: form.getAll("strengthDays"),
  });
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  const d = parsed.data;
  await upsertProfile(getDb(), user.id, {
    ...d,
    practicePerWeek: d.practicePerWeek ?? (d.practiceDays.length || null),
    strengthPerWeek: d.strengthPerWeek ?? (d.strengthDays.length || null),
  });
  next(3, form);
}

export async function saveGoals(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const goals = form.getAll("goals");
  const raw = Object.fromEntries(form);
  // 目標が1つだけなら自動的に最優先にする
  const primary = raw.primaryGoal || (goals.length === 1 ? goals[0] : "");
  const parsed = goalsInput.safeParse({ ...raw, goals, primaryGoal: primary });
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  const db = getDb();
  await upsertProfile(db, user.id, parsed.data);
  if (form.get("returnTo") === "/settings") next(4, form);
  await completeOnboarding(db, user.id);
  next(4);
}

export async function skipStep(form: FormData): Promise<void> {
  await requireUser();
  const step = Number(form.get("step"));
  if (step >= 4) {
    const user = await requireUser();
    await completeOnboarding(getDb(), user.id);
  }
  next(Number.isInteger(step) && step >= 1 && step <= 4 ? step : 1);
}
