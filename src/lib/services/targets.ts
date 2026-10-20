import { and, eq } from "drizzle-orm";
import { resolveAge } from "../calc/body";
import { computeDailyTargets, estimateBmr, type BmrEstimate, type DailyTargets, type ExerciseBlock } from "../calc/energy";
import type { Goal, Warning } from "../calc/types";
import { addDays, weekday } from "../date";
import { workouts } from "../db/schema";
import type { Db } from "../db/types";
import { latestBodyFat, latestWeight } from "../repo/body";
import { listPractices } from "../repo/practice";
import { getProfile, type Profile } from "../repo/profile";

export type DayPlan = {
  /** logged=記録あり / planned=予定（曜日設定）/ rest=予定なし */
  basis: "logged" | "planned" | "rest";
  blocks: ExerciseBlock[];
  labels: string[];
  notes: string[];
};

/** その日の運動内容を記録または予定から決める */
export async function resolveDayPlan(db: Db, userId: string, profile: Profile | null, date: string): Promise<DayPlan> {
  const blocks: ExerciseBlock[] = [];
  const labels: string[] = [];
  const notes: string[] = [];
  const practices = await listPractices(db, userId, { from: date, to: date });
  const dayWorkouts = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.userId, userId), eq(workouts.date, date)));

  let logged = false;
  if (practices.length > 0) {
    logged = true;
    for (const p of practices) {
      blocks.push({ kind: "volleyball", intensity: p.intensity, minutes: p.durationMin });
      labels.push(`バレー練習 ${p.durationMin}分（記録）`);
    }
  } else if (profile?.practiceDays?.includes(weekday(date))) {
    if (profile.practiceMinutes && profile.practiceIntensity) {
      blocks.push({ kind: "volleyball", intensity: profile.practiceIntensity, minutes: profile.practiceMinutes });
      labels.push(`バレー練習 ${profile.practiceMinutes}分（予定）`);
    } else {
      labels.push("バレー練習（予定）");
      notes.push("練習時間・強度が未設定のため、予定の練習はエネルギー計算に含めていません。");
    }
  }

  if (dayWorkouts.length > 0) {
    logged = true;
    for (const w of dayWorkouts) {
      const minutes = w.durationMin ?? profile?.strengthMinutes ?? null;
      if (minutes == null) {
        labels.push("筋トレ（記録・時間未入力）");
        notes.push("筋トレの時間が未入力のため、エネルギー計算に含めていません。");
        continue;
      }
      const intensity = w.sessionRpe != null && w.sessionRpe >= 7 ? "high" : "moderate";
      blocks.push({ kind: "strength", intensity, minutes });
      labels.push(`筋トレ ${minutes}分（記録${w.durationMin == null ? "・時間は普段の設定値" : ""}）`);
    }
  } else if (profile?.strengthDays?.includes(weekday(date))) {
    if (profile.strengthMinutes) {
      blocks.push({ kind: "strength", intensity: "moderate", minutes: profile.strengthMinutes });
      labels.push(`筋トレ ${profile.strengthMinutes}分（予定）`);
    } else {
      labels.push("筋トレ（予定）");
      notes.push("筋トレの時間が未設定のため、予定の筋トレはエネルギー計算に含めていません。");
    }
  }

  const basis = logged ? "logged" : labels.length > 0 ? "planned" : "rest";
  return { basis, blocks, labels, notes };
}

export type TargetsResult =
  | {
      ok: true;
      targets: DailyTargets;
      bmr: BmrEstimate;
      plan: DayPlan;
      weight: { date: string; weightKg: number };
      age: number | null;
      warnings: Warning[];
    }
  | { ok: false; missing: string[]; message: string; plan: DayPlan };

const BODY_FAT_MAX_AGE_DAYS = 90;
const WEIGHT_STALE_DAYS = 30;

export async function getTargetsForDate(db: Db, userId: string, date: string): Promise<TargetsResult> {
  const profile = await getProfile(db, userId);
  const plan = await resolveDayPlan(db, userId, profile, date);
  const weight = await latestWeight(db, userId, date);
  const bodyFat = await latestBodyFat(db, userId);
  const ageInfo = profile ? resolveAge(profile, date) : null;
  const warnings: Warning[] = [];

  const useBodyFat = bodyFat != null && bodyFat.date <= date && bodyFat.date >= addDays(date, -BODY_FAT_MAX_AGE_DAYS);
  if (bodyFat && !useBodyFat && bodyFat.date <= date) {
    warnings.push({
      code: "bodyfat_old",
      message: `体脂肪率の記録（${bodyFat.date}）が${BODY_FAT_MAX_AGE_DAYS}日以上前のため、推定には使っていません。`,
    });
  }

  const bmr = estimateBmr({
    weightKg: weight?.weightKg ?? null,
    heightCm: profile?.heightCm ?? null,
    age: ageInfo?.age ?? null,
    sex: profile?.sex ?? null,
    measuredBodyFatPct: useBodyFat ? bodyFat.bodyFatPct : null,
  });
  if (!bmr.ok || !weight) {
    return {
      ok: false,
      missing: bmr.ok ? ["体重"] : bmr.missing,
      message: bmr.ok ? "体重の記録が必要です。" : bmr.message,
      plan,
    };
  }
  if (weight.date < addDays(date, -WEIGHT_STALE_DAYS)) {
    warnings.push({ code: "weight_old", message: `最新の体重記録が${weight.date}です。最近の体重を記録すると推定が更新されます。` });
  }
  if (ageInfo?.approximate) {
    warnings.push({ code: "age_approx", message: "年齢は入力時の年齢から概算しています。生年月日を入力すると正確になります。" });
  }
  if (!profile?.dailyActivity) {
    warnings.push({ code: "activity_default", message: "普段の活動量が未設定のため「ふつう」として計算しています。" });
  }

  const targets = computeDailyTargets({
    bmr: bmr.value,
    weightKg: weight.weightKg,
    age: ageInfo?.age ?? null,
    activity: profile?.dailyActivity ?? "normal",
    blocks: plan.blocks,
    primaryGoal: (profile?.primaryGoal as Goal | null) ?? null,
    manualAdjustKcal: profile?.energyAdjustKcal ?? 0,
  });

  return { ok: true, targets, bmr: bmr.value, plan, weight, age: ageInfo?.age ?? null, warnings };
}
