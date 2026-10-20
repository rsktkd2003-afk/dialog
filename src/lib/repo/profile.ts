import { eq } from "drizzle-orm";
import { z } from "zod";
import { profiles } from "../db/schema";
import type { Db } from "../db/types";
import { LIMITS, optionalDate, optionalEnum, optionalInt, optionalNumber, optionalText } from "../validation";

export const GOAL_VALUES = [
  "jump",
  "spike",
  "max_strength",
  "hypertrophy",
  "fat_loss",
  "maintain_weight",
  "condition",
  "other",
] as const;

const weekdays = z.array(z.coerce.number().int().min(0).max(6)).max(7);

export const basicInfoInput = z.object({
  birthDate: optionalDate,
  ageYears: optionalInt(LIMITS.ageYears[0], LIMITS.ageYears[1], "年齢"),
  sex: optionalEnum(["male", "female", "unspecified"] as const),
  heightCm: optionalNumber(LIMITS.heightCm[0], LIMITS.heightCm[1], "身長"),
  experienceYears: optionalNumber(0, 60, "競技歴"),
  position: optionalText(40),
  dominantHand: optionalEnum(["right", "left", "both"] as const),
});

export const habitsInput = z.object({
  practicePerWeek: optionalInt(0, 14, "練習回数"),
  practiceMinutes: optionalInt(0, 600, "練習時間"),
  practiceIntensity: optionalEnum(["low", "moderate", "high"] as const),
  practiceDays: weekdays.default([]),
  maxJumpsPerSession: optionalInt(0, 2000, "ジャンプ回数"),
  strengthPerWeek: optionalInt(0, 14, "筋トレ回数"),
  strengthMinutes: optionalInt(0, 300, "筋トレ時間"),
  strengthDays: weekdays.default([]),
  strengthExperience: optionalEnum(["none", "lt1y", "1to3y", "gt3y"] as const),
  dailyActivity: optionalEnum(["low", "normal", "high"] as const),
  usualSleepHours: optionalNumber(LIMITS.sleepHours[0], LIMITS.sleepHours[1], "睡眠時間"),
});

export const goalsInput = z
  .object({
    goals: z.array(z.enum(GOAL_VALUES)).max(GOAL_VALUES.length).default([]),
    primaryGoal: optionalEnum(GOAL_VALUES),
    otherGoal: optionalText(200),
  })
  .refine((v) => v.primaryGoal == null || v.goals.includes(v.primaryGoal), {
    message: "最優先目標は選択した目標の中から選んでください",
    path: ["primaryGoal"],
  });

export const energyAdjustInput = z.object({
  energyAdjustKcal: z.coerce.number().int().min(-1000).max(1000),
});

export type Profile = typeof profiles.$inferSelect;
export type ProfilePatch = Partial<Omit<typeof profiles.$inferInsert, "userId" | "updatedAt">>;

export async function getProfile(db: Db, userId: string): Promise<Profile | null> {
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return row ?? null;
}

export async function upsertProfile(db: Db, userId: string, patch: ProfilePatch): Promise<void> {
  await db
    .insert(profiles)
    .values({ userId, ...patch })
    .onConflictDoUpdate({ target: profiles.userId, set: { ...patch, updatedAt: new Date() } });
}

export async function completeOnboarding(db: Db, userId: string): Promise<void> {
  await upsertProfile(db, userId, { onboardingCompletedAt: new Date() });
}
