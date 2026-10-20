"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/form";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth/password";
import { endSession, requireUser, startSession } from "@/lib/auth/server";
import { changePassword, deleteAccount } from "@/lib/auth/service";
import { getDb } from "@/lib/db/client";
import { energyAdjustInput, upsertProfile } from "@/lib/repo/profile";
import { toFieldErrors } from "@/lib/validation";

export async function saveEnergyAdjustAction(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = energyAdjustInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "−1000〜1000 kcal の整数で入力してください" };
  await upsertProfile(getDb(), user.id, parsed.data);
  revalidatePath("/", "layout");
  return { ok: true, message: "調整量を保存しました" };
}

const pwSchema = z
  .object({
    current: z.string().min(1, "現在のパスワードを入力してください").max(PASSWORD_MAX_LENGTH),
    next: z.string().min(PASSWORD_MIN_LENGTH, `${PASSWORD_MIN_LENGTH}文字以上にしてください`).max(PASSWORD_MAX_LENGTH),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "新しいパスワードが一致しません", path: ["confirm"] });

export async function changePasswordAction(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = pwSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: Object.values(toFieldErrors(parsed.error))[0] };
  const ok = await changePassword(getDb(), user.id, parsed.data.current, parsed.data.next);
  if (!ok) return { ok: false, message: "現在のパスワードが正しくありません" };
  // 全セッションを無効化したため、この端末では新しいセッションを開始する
  await startSession(user.id);
  return { ok: true, message: "パスワードを変更しました。他の端末ではログアウトされます。" };
}

export async function deleteAccountAction(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (form.get("confirmText") !== "削除") return { ok: false, message: "確認のため「削除」と入力してください" };
  const ok = await deleteAccount(getDb(), user.id, String(form.get("password") ?? ""));
  if (!ok) return { ok: false, message: "パスワードが正しくありません" };
  await endSession();
  redirect("/login?deleted=1");
}
