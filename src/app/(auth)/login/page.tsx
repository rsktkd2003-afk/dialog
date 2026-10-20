import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { LoginForm } from "../AuthForms";

export const metadata: Metadata = { title: "ログイン" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const { deleted } = await searchParams;
  return (
    <>
      {deleted && <p role="status" className="mb-4 rounded-lg bg-surface-2 px-3 py-2 text-sm">アカウントとすべてのデータを削除しました。</p>}
      <h1 className="mb-4 text-lg font-semibold">ログイン</h1>
      <LoginForm />
    </>
  );
}
