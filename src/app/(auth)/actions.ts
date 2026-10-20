"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth/password";
import { endSession, startSession } from "@/lib/auth/server";
import { authenticate, createUser } from "@/lib/auth/service";
import { getDb } from "@/lib/db/client";
import { getProfile } from "@/lib/repo/profile";
import { email, toFieldErrors } from "@/lib/validation";
import type { ActionState } from "@/components/form";

const registerSchema = z
  .object({
    email,
    displayName: z.string().trim().min(1, "表示名を入力してください").max(40, "40文字以内で入力してください"),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `パスワードは${PASSWORD_MIN_LENGTH}文字以上にしてください`)
      .max(PASSWORD_MAX_LENGTH, `パスワードは${PASSWORD_MAX_LENGTH}文字以内にしてください`),
    passwordConfirm: z.string(),
    agree: z.literal("on", { error: "プライバシーポリシーへの同意が必要です" }),
  })
  .refine((v) => v.password === v.passwordConfirm, { message: "パスワードが一致しません", path: ["passwordConfirm"] });

export async function registerAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  const r = await createUser(getDb(), parsed.data);
  if (!r.ok) {
    return { errors: { email: "このメールアドレスでは登録できません。登録済みの場合はログインしてください。" } };
  }
  await startSession(r.user.id);
  redirect("/onboarding");
}

const loginSchema = z.object({ email, password: z.string().min(1, "パスワードを入力してください").max(PASSWORD_MAX_LENGTH) });

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  const db = getDb();
  const r = await authenticate(db, parsed.data.email, parsed.data.password);
  if (!r.ok) {
    return {
      message:
        r.reason === "locked"
          ? "ログインの失敗が続いたため、一時的にロックしています。15分ほど待ってから再度お試しください。"
          : "メールアドレスまたはパスワードが正しくありません。",
    };
  }
  await startSession(r.user.id);
  const profile = await getProfile(db, r.user.id);
  redirect(profile?.onboardingCompletedAt ? "/" : "/onboarding");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/login");
}
