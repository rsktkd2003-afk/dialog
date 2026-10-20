import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import { getProfile } from "@/lib/repo/profile";
import { skipStep } from "./actions";
import { BasicInfoForm, GoalsForm, HabitsForm, MeasurementsForm } from "./StepForms";

export const metadata: Metadata = { title: "初回登録" };

const STEPS = ["基本情報", "身体測定", "運動習慣", "目標"];

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const step = Math.min(4, Math.max(1, Number(sp.step) || 1));
  const p = await getProfile(getDb(), user.id);
  const d = {
    birthDate: p?.birthDate,
    ageYears: p?.ageYears,
    sex: p?.sex,
    heightCm: p?.heightCm,
    experienceYears: p?.experienceYears,
    position: p?.position,
    dominantHand: p?.dominantHand,
    practicePerWeek: p?.practicePerWeek,
    practiceMinutes: p?.practiceMinutes,
    practiceIntensity: p?.practiceIntensity,
    practiceDays: p?.practiceDays?.map(String) ?? [],
    maxJumpsPerSession: p?.maxJumpsPerSession,
    strengthPerWeek: p?.strengthPerWeek,
    strengthMinutes: p?.strengthMinutes,
    strengthDays: p?.strengthDays?.map(String) ?? [],
    strengthExperience: p?.strengthExperience,
    dailyActivity: p?.dailyActivity,
    usualSleepHours: p?.usualSleepHours,
    goals: p?.goals ?? [],
    primaryGoal: p?.primaryGoal,
    otherGoal: p?.otherGoal,
  };

  return (
    <main className="mx-auto max-w-lg px-4 pb-16 pt-6">
      <p className="text-xs text-muted">ようこそ、{user.displayName}さん</p>
      <h1 className="mt-1 text-xl font-bold">{STEPS[step - 1]}</h1>
      <div className="mt-3" aria-label={`ステップ ${step} / ${STEPS.length}`}>
        <div className="flex gap-1.5" aria-hidden="true">
          {STEPS.map((label, i) => (
            <span key={label} className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-accent" : "bg-surface-2"}`} />
          ))}
        </div>
        <p className="mt-1.5 text-xs text-muted">
          ステップ {step} / {STEPS.length}・すべて任意です。分からない項目は空欄のまま進めます。
        </p>
      </div>
      <div className="mt-5">
        {step === 1 && <BasicInfoForm d={d} />}
        {step === 2 && <MeasurementsForm />}
        {step === 3 && <HabitsForm d={d} />}
        {step === 4 && <GoalsForm d={d} />}
      </div>
      <form action={skipStep} className="mt-3">
        <input type="hidden" name="step" value={step} />
        <button type="submit" className="min-h-11 w-full rounded-xl text-sm text-ink-2 underline">
          {step === 4 ? "目標を設定せずに始める" : "このステップをスキップ"}
        </button>
      </form>
    </main>
  );
}
