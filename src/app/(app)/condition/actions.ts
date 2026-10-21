"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/components/form";
import { requireUser } from "@/lib/auth/server";
import { todayString } from "@/lib/date";
import { getDb } from "@/lib/db/client";
import { conditionInput, upsertCondition } from "@/lib/repo/condition";
import { addSymptom, deleteSymptom, symptomInput } from "@/lib/repo/symptoms";
import { toFieldErrors } from "@/lib/validation";

/**
 * 健康情報を含むため、DBエラーの詳細（クエリのパラメータ＝入力値）はログに出さない。
 * エラーの種類とコードのみ記録する。
 */
function logSafely(context: string, e: unknown): void {
  const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : undefined;
  const cause = typeof e === "object" && e !== null && "cause" in e ? (e as { cause: unknown }).cause : undefined;
  const causeCode = typeof cause === "object" && cause !== null && "code" in cause ? String((cause as { code: unknown }).code) : undefined;
  console.error(`[${context}] failed`, { name: e instanceof Error ? e.name : typeof e, code: code ?? causeCode });
}

/** 睡眠・疲労などの日常的な体調（1日1件）。旧形式の不調記録（discomforts）は変更しない。 */
export async function saveConditionAction(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = conditionInput.safeParse({ ...Object.fromEntries(form), isRestDay: form.get("isRestDay") === "on" });
  if (!parsed.success) return { errors: toFieldErrors(parsed.error), message: "入力内容を確認してください" };
  if (parsed.data.date > todayString()) return { ok: false, message: "未来の日付は記録できません" };
  try {
    // discomforts を undefined にして、保存済みの旧形式の不調記録を上書きしない
    await upsertCondition(getDb(), user.id, { ...parsed.data, discomforts: undefined });
  } catch (e) {
    logSafely("condition.save", e);
    return { ok: false, message: "保存できませんでした。時間をおいて再度お試しください。" };
  }
  revalidatePath("/condition");
  revalidatePath("/");
  return { ok: true, message: "体調を保存しました" };
}

export async function addSymptomAction(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = symptomInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error), message: "入力内容を確認してください" };
  if (parsed.data.date > todayString()) return { ok: false, errors: { date: "未来の日付は記録できません" }, message: "未来の日付は記録できません" };
  try {
    await addSymptom(getDb(), user.id, parsed.data);
  } catch (e) {
    logSafely("symptom.add", e);
    return { ok: false, message: "保存できませんでした。時間をおいて再度お試しください。" };
  }
  revalidatePath("/condition");
  revalidatePath("/");
  return {
    ok: true,
    message: "不調を記録しました。症状が続く・強くなる場合は、医師や理学療法士などの医療専門職に相談してください。",
  };
}

export async function deleteSymptomAction(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = z.string().uuid().safeParse(form.get("id"));
  if (!id.success) return { ok: false, message: "削除する記録が見つかりません" };
  let ok: boolean;
  try {
    ok = await deleteSymptom(getDb(), user.id, id.data);
  } catch (e) {
    logSafely("symptom.delete", e);
    return { ok: false, message: "削除できませんでした。時間をおいて再度お試しください。" };
  }
  revalidatePath("/condition");
  revalidatePath("/");
  return ok ? { ok: true, message: "削除しました" } : { ok: false, message: "削除する記録が見つかりません" };
}
