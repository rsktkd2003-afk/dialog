"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormMessage, SubmitButton, type ActionState } from "@/components/form";
import { loginAction, registerAction } from "./actions";

export function LoginForm() {
  const [state, action] = useActionState<ActionState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="メールアドレス" name="email" type="email" autoComplete="email" inputMode="email" required error={state.errors?.email} />
      <Field label="パスワード" name="password" type="password" autoComplete="current-password" required error={state.errors?.password} />
      <SubmitButton className="w-full">ログイン</SubmitButton>
      <p className="text-center text-sm text-ink-2">
        はじめての方は <Link href="/register" className="font-semibold text-accent underline">新規登録</Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState<ActionState, FormData>(registerAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="表示名" name="displayName" autoComplete="nickname" required error={state.errors?.displayName} hint="チーム機能で他の人に表示される名前です" />
      <Field label="メールアドレス" name="email" type="email" autoComplete="email" inputMode="email" required error={state.errors?.email} />
      <Field label="パスワード" name="password" type="password" autoComplete="new-password" required minLength={10} error={state.errors?.password} hint="10文字以上" />
      <Field label="パスワード（確認）" name="passwordConfirm" type="password" autoComplete="new-password" required error={state.errors?.passwordConfirm} />
      <div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="agree" className="mt-1 size-5 shrink-0" />
          <span>
            <Link href="/privacy" className="text-accent underline" target="_blank">プライバシーポリシー</Link>
            を確認し、同意します。
          </span>
        </label>
        {state.errors?.agree && <p className="mt-1 text-xs text-critical-ink">{state.errors.agree}</p>}
      </div>
      <p className="text-xs text-muted">18歳未満の方は、保護者の方と一緒に内容を確認してから利用してください。</p>
      <SubmitButton className="w-full">登録して始める</SubmitButton>
      <p className="text-center text-sm text-ink-2">
        登録済みの方は <Link href="/login" className="font-semibold text-accent underline">ログイン</Link>
      </p>
    </form>
  );
}
