import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { BasicInfoForm, GoalsForm, HabitsForm } from "@/app/onboarding/StepForms";
import { requireUser } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import { getProfile } from "@/lib/repo/profile";

export const metadata: Metadata = { title: "プロフィール編集" };
export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser();
  const { tab = "basic" } = await searchParams;
  const p = await getProfile(getDb(), user.id);
  const d = {
    ...p,
    practiceDays: p?.practiceDays?.map(String) ?? [],
    strengthDays: p?.strengthDays?.map(String) ?? [],
    goals: p?.goals ?? [],
    onboardingCompletedAt: undefined,
    updatedAt: undefined,
  };
  const tabs = [
    ["basic", "基本情報"],
    ["habits", "運動習慣"],
    ["goals", "目標"],
  ] as const;
  return (
    <>
      <PageHeader title="プロフィール編集" back="/settings" />
      <nav className="mb-4 flex gap-1 rounded-xl bg-surface-2 p-1" aria-label="編集する項目">
        {tabs.map(([k, l]) => (
          <a key={k} href={`/settings/profile?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={`flex min-h-10 flex-1 items-center justify-center rounded-lg text-sm ${tab === k ? "bg-surface font-semibold" : "text-ink-2"}`}>
            {l}
          </a>
        ))}
      </nav>
      {tab === "habits" ? <HabitsForm d={d} returnTo="/settings" /> : tab === "goals" ? <GoalsForm d={d} returnTo="/settings" /> : <BasicInfoForm d={d} returnTo="/settings" />}
      <p className="mt-4 text-xs text-muted">体重・体脂肪率・周囲径は「体・分析」画面から記録します（履歴として保存されます）。</p>
    </>
  );
}
