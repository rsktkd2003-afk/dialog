import { buildSuggestions, type Suggestion } from "../calc/suggestions";
import { jumpHeightFromReach } from "../calc/jump";
import { maxByDate } from "../calc/pairing";
import type { Goal } from "../calc/types";
import { addDays } from "../date";
import type { Db } from "../db/types";
import { listBodyMeasurements, listJumpMeasurements } from "../repo/body";
import { getCondition, listConditions } from "../repo/condition";
import { dailyNutrition } from "../repo/meals";
import { listPractices } from "../repo/practice";
import { getProfile } from "../repo/profile";
import { strengthTrends } from "../repo/training";
import { getTargetsForDate } from "./targets";

/** 最優先目標ごとのホーム画面カードの表示順 */
export type DashboardCard = "nutrition" | "plan" | "condition" | "weight" | "jump" | "strength";

export function cardOrder(goal: Goal | null): DashboardCard[] {
  switch (goal) {
    case "jump":
    case "spike":
      return ["jump", "strength", "plan", "condition", "nutrition", "weight"];
    case "max_strength":
    case "hypertrophy":
      return ["strength", "nutrition", "plan", "weight", "condition", "jump"];
    case "fat_loss":
    case "maintain_weight":
      return ["nutrition", "weight", "plan", "condition", "strength", "jump"];
    case "condition":
      return ["condition", "plan", "nutrition", "weight", "strength", "jump"];
    default:
      return ["nutrition", "plan", "condition", "weight", "strength", "jump"];
  }
}

export async function loadDashboard(db: Db, userId: string, today: string) {
  const profile = await getProfile(db, userId);
  const primaryGoal = (profile?.primaryGoal as Goal | null) ?? null;
  const targets = await getTargetsForDate(db, userId, today);
  const since28 = addDays(today, -27);
  const since56 = addDays(today, -55);
  const since90 = addDays(today, -89);

  const [nutrition, practices, conditions, todayCondition, bodies, jumps, trends] = await Promise.all([
    dailyNutrition(db, userId, addDays(today, -7), today),
    listPractices(db, userId, { from: addDays(today, -14), to: today }),
    listConditions(db, userId, { from: addDays(today, -14), to: today }),
    getCondition(db, userId, today),
    listBodyMeasurements(db, userId, { from: since90, to: today }),
    listJumpMeasurements(db, userId, { limit: 300 }),
    strengthTrends(db, userId, today, since56, since28),
  ]);

  const todayNutrition = nutrition.find((n) => n.date === today) ?? null;
  const weights = bodies
    .filter((b) => b.weightKg != null)
    .map((b) => ({ date: b.date, weightKg: b.weightKg! }));
  const spikeMeasured = jumps.filter((j) => j.kind === "spike_reach" && j.measurementType === "measured");
  const standing = jumps.filter((j) => j.kind === "standing_reach");
  const latestSpike = jumps.find((j) => j.kind === "spike_reach") ?? null;
  const latestBlock = jumps.find((j) => j.kind === "block_reach") ?? null;
  const latestJumpHeight = latestSpike ? jumpHeightFromReach(latestSpike, standing) : null;

  const proteinTarget = targets.ok ? targets.targets.proteinG.min : null;
  const suggestions: Suggestion[] = buildSuggestions({
    today,
    age: targets.ok ? targets.age : null,
    primaryGoal,
    latestWeightKg: weights[0]?.weightKg ?? null,
    proteinTargetG: proteinTarget,
    nutritionDays: nutrition.map((n) => ({ ...n, hasUnknown: n.unknownCount > 0 })),
    practiceDays: practices.map((p) => ({ date: p.date, minutes: p.durationMin, intensity: p.intensity, rpe: p.rpe })),
    weights,
    conditions: conditions.map((c) => ({
      date: c.date,
      sleepHours: c.sleepHours,
      discomforts: c.discomforts.map((d) => ({ site: d.site, level: d.level })),
    })),
    strengthTrends: trends,
    measuredSpikeReaches: spikeMeasured.map((j) => ({ date: j.date, valueCm: j.valueCm })),
  });

  const lowerBody = trends.filter((t) => t.bodyPart === "lower" && t.recentBest != null);
  const otherStrength = trends.filter((t) => t.bodyPart !== "lower" && t.recentBest != null);

  return {
    profile,
    primaryGoal,
    order: cardOrder(primaryGoal),
    targets,
    todayNutrition,
    todayCondition,
    weights: [...weights].reverse(),
    spikeSeries: maxByDate(spikeMeasured.map((j) => ({ date: j.date, value: j.valueCm }))),
    latestSpike,
    latestBlock,
    latestJumpHeight,
    strength: { lowerBody, other: otherStrength },
    suggestions,
  };
}
