import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { RegisterForm } from "../AuthForms";

export const metadata: Metadata = { title: "新規登録" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <>
      <h1 className="mb-1 text-lg font-semibold">新規登録</h1>
      <p className="mb-4 text-sm text-ink-2">記録はあなたのアカウントでのみ表示されます。チームなど他の人への共有機能は現在ありません。</p>
      <RegisterForm />
    </>
  );
}
