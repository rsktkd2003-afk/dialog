import { and, asc, desc, eq, gte, inArray, isNull, lt, or } from "drizzle-orm";
import { z } from "zod";
import { bestEstimatedOneRepMax, volumeLoad } from "../calc/strength";
import { exercises, workoutSets, workoutTemplates, workouts, type TemplateItem } from "../db/schema";
import type { Db } from "../db/types";
import { LIMITS, dateString, optionalInt, optionalNumber, optionalText, requiredInt, requiredNumber } from "../validation";
import { DomainError } from "./meals";

export const SPLIT_LABELS = { upper: "上半身", lower: "下半身", full: "全身", other: "その他" } as const;
export const BODY_PART_LABELS = { lower: "下半身", upper: "上半身", core: "体幹", full: "全身" } as const;
export const SIDE_LABELS = { both: "両側", left: "左", right: "右" } as const;

export const exerciseInput = z.object({
  name: z.string().trim().min(1, "種目名を入力してください").max(60),
  bodyPart: z.enum(["lower", "upper", "core", "full"]),
  unilateral: z.coerce.boolean().default(false),
});

export const setInput = z
  .object({
    exerciseId: z.string().uuid(),
    side: z.enum(["both", "left", "right"]).default("both"),
    weightKg: requiredNumber(LIMITS.liftKg[0], LIMITS.liftKg[1], "重量"),
    reps: requiredInt(LIMITS.reps[0], LIMITS.reps[1], "回数"),
    rpe: optionalNumber(1, 10, "RPE"),
    rir: optionalInt(LIMITS.rir[0], LIMITS.rir[1], "RIR"),
    restSec: optionalInt(LIMITS.restSec[0], LIMITS.restSec[1], "休憩"),
  })
  .refine((v) => v.rpe == null || Number.isInteger(v.rpe * 2), { message: "RPEは0.5刻みで入力してください", path: ["rpe"] });

export const workoutInput = z.object({
  date: dateString,
  title: optionalText(60),
  split: z.enum(["upper", "lower", "full", "other"]).default("other"),
  durationMin: optionalInt(1, 300, "時間"),
  sessionRpe: optionalInt(LIMITS.rpe[0], LIMITS.rpe[1], "セッションRPE"),
  note: optionalText(500),
  sets: z.array(setInput).min(1, "セットを1つ以上入力してください").max(100),
});
export type WorkoutInput = z.infer<typeof workoutInput>;

export const templateInput = z.object({
  name: z.string().trim().min(1, "テンプレート名を入力してください").max(60),
  split: z.enum(["upper", "lower", "full", "other"]).default("other"),
  items: z
    .array(
      z.object({
        exerciseId: z.string().uuid(),
        sets: requiredInt(1, 20, "セット数"),
        reps: requiredInt(LIMITS.reps[0], LIMITS.reps[1], "回数"),
        weightKg: optionalNumber(LIMITS.liftKg[0], LIMITS.liftKg[1], "重量"),
        side: z.enum(["both", "left", "right"]).default("both"),
      }),
    )
    .min(1)
    .max(30),
});

export type Exercise = typeof exercises.$inferSelect;

const accessibleExercise = (userId: string) => or(eq(exercises.userId, userId), isNull(exercises.userId));

export async function listExercises(db: Db, userId: string): Promise<Exercise[]> {
  return db
    .select()
    .from(exercises)
    .where(and(accessibleExercise(userId), eq(exercises.archived, false)))
    .orderBy(asc(exercises.bodyPart), asc(exercises.name));
}

export async function createExercise(db: Db, userId: string, input: z.infer<typeof exerciseInput>): Promise<Exercise> {
  const [row] = await db.insert(exercises).values({ ...input, userId }).returning();
  return row!;
}

async function assertExercisesAccessible(db: Db, userId: string, ids: string[]): Promise<void> {
  const unique = [...new Set(ids)];
  const rows = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(inArray(exercises.id, unique), accessibleExercise(userId)));
  if (rows.length !== unique.length) throw new DomainError("種目が見つかりません。");
}

export async function createWorkout(db: Db, userId: string, input: WorkoutInput): Promise<string> {
  await assertExercisesAccessible(db, userId, input.sets.map((s) => s.exerciseId));
  return db.transaction(async (tx) => {
    const { sets, ...w } = input;
    const [row] = await tx.insert(workouts).values({ ...w, userId }).returning({ id: workouts.id });
    await tx.insert(workoutSets).values(sets.map((s, i) => ({ ...s, workoutId: row!.id, userId, position: i })));
    return row!.id;
  });
}

export async function getWorkout(db: Db, userId: string, workoutId: string) {
  const [w] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .limit(1);
  if (!w) return null;
  const sets = await db
    .select({ set: workoutSets, exerciseName: exercises.name, bodyPart: exercises.bodyPart })
    .from(workoutSets)
    .innerJoin(exercises, eq(exercises.id, workoutSets.exerciseId))
    .where(and(eq(workoutSets.workoutId, w.id), eq(workoutSets.userId, userId)))
    .orderBy(asc(workoutSets.position));
  return { ...w, sets: sets.map((s) => ({ ...s.set, exerciseName: s.exerciseName, bodyPart: s.bodyPart })) };
}

export async function listWorkouts(db: Db, userId: string, opts: { from?: string; limit?: number } = {}) {
  const conds = [eq(workouts.userId, userId)];
  if (opts.from) conds.push(gte(workouts.date, opts.from));
  const ws = await db
    .select()
    .from(workouts)
    .where(and(...conds))
    .orderBy(desc(workouts.date), desc(workouts.createdAt))
    .limit(opts.limit ?? 50);
  if (ws.length === 0) return [];
  const sets = await db
    .select({ workoutId: workoutSets.workoutId, weightKg: workoutSets.weightKg, reps: workoutSets.reps, exerciseName: exercises.name })
    .from(workoutSets)
    .innerJoin(exercises, eq(exercises.id, workoutSets.exerciseId))
    .where(and(eq(workoutSets.userId, userId), inArray(workoutSets.workoutId, ws.map((w) => w.id))));
  return ws.map((w) => {
    const own = sets.filter((s) => s.workoutId === w.id);
    return {
      ...w,
      setCount: own.length,
      volumeKg: volumeLoad(own),
      exerciseNames: [...new Set(own.map((s) => s.exerciseName))],
    };
  });
}

export async function deleteWorkout(db: Db, userId: string, workoutId: string): Promise<boolean> {
  const rows = await db
    .delete(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .returning({ id: workouts.id });
  return rows.length > 0;
}

/** 種目ごとの前回記録（指定日より前の直近ワークアウトのセット） */
export async function previousSets(db: Db, userId: string, exerciseIds: string[], beforeDate: string) {
  const result = new Map<string, { date: string; sets: { weightKg: number; reps: number; side: string; rpe: number | null; rir: number | null }[] }>();
  if (exerciseIds.length === 0) return result;
  const rows = await db
    .select({
      exerciseId: workoutSets.exerciseId,
      workoutId: workoutSets.workoutId,
      date: workouts.date,
      weightKg: workoutSets.weightKg,
      reps: workoutSets.reps,
      side: workoutSets.side,
      rpe: workoutSets.rpe,
      rir: workoutSets.rir,
      position: workoutSets.position,
    })
    .from(workoutSets)
    .innerJoin(workouts, eq(workouts.id, workoutSets.workoutId))
    .where(
      and(eq(workoutSets.userId, userId), inArray(workoutSets.exerciseId, exerciseIds), lt(workouts.date, beforeDate)),
    )
    .orderBy(desc(workouts.date), desc(workouts.createdAt), asc(workoutSets.position))
    .limit(500);
  const chosenWorkout = new Map<string, string>();
  for (const r of rows) {
    if (!chosenWorkout.has(r.exerciseId)) chosenWorkout.set(r.exerciseId, r.workoutId);
    if (chosenWorkout.get(r.exerciseId) !== r.workoutId) continue;
    const entry = result.get(r.exerciseId) ?? { date: r.date, sets: [] };
    entry.sets.push({ weightKg: r.weightKg, reps: r.reps, side: r.side, rpe: r.rpe, rir: r.rir });
    result.set(r.exerciseId, entry);
  }
  return result;
}

export type ExerciseHistoryPoint = { date: string; bestE1rm: number | null; maxWeightKg: number; volumeKg: number };

/** 種目の日別推移（推定1RMの最大値・最大重量・総負荷量） */
export async function exerciseHistory(db: Db, userId: string, exerciseId: string, from?: string): Promise<ExerciseHistoryPoint[]> {
  const conds = [eq(workoutSets.userId, userId), eq(workoutSets.exerciseId, exerciseId)];
  if (from) conds.push(gte(workouts.date, from));
  const rows = await db
    .select({ date: workouts.date, weightKg: workoutSets.weightKg, reps: workoutSets.reps })
    .from(workoutSets)
    .innerJoin(workouts, eq(workouts.id, workoutSets.workoutId))
    .where(and(...conds))
    .orderBy(asc(workouts.date));
  const byDate = new Map<string, { weightKg: number; reps: number }[]>();
  for (const r of rows) byDate.set(r.date, [...(byDate.get(r.date) ?? []), r]);
  return [...byDate.entries()].map(([date, sets]) => ({
    date,
    bestE1rm: bestEstimatedOneRepMax(sets),
    maxWeightKg: Math.max(...sets.map((s) => s.weightKg)),
    volumeKg: volumeLoad(sets),
  }));
}

/** 種目ごとの直近4週間と、その前の4週間の推定1RMの最大値 */
export async function strengthTrends(db: Db, userId: string, today: string, fromDate: string, splitDate: string) {
  const rows = await db
    .select({
      exerciseId: workoutSets.exerciseId,
      name: exercises.name,
      bodyPart: exercises.bodyPart,
      date: workouts.date,
      weightKg: workoutSets.weightKg,
      reps: workoutSets.reps,
    })
    .from(workoutSets)
    .innerJoin(workouts, eq(workouts.id, workoutSets.workoutId))
    .innerJoin(exercises, eq(exercises.id, workoutSets.exerciseId))
    .where(and(eq(workoutSets.userId, userId), gte(workouts.date, fromDate)));
  const byEx = new Map<string, { name: string; bodyPart: string; recent: typeof rows; previous: typeof rows }>();
  for (const r of rows) {
    if (r.date > today) continue;
    const e = byEx.get(r.exerciseId) ?? { name: r.name, bodyPart: r.bodyPart, recent: [], previous: [] };
    (r.date >= splitDate ? e.recent : e.previous).push(r);
    byEx.set(r.exerciseId, e);
  }
  return [...byEx.entries()].map(([exerciseId, e]) => ({
    exerciseId,
    exerciseName: e.name,
    bodyPart: e.bodyPart,
    recentBest: bestEstimatedOneRepMax(e.recent),
    previousBest: bestEstimatedOneRepMax(e.previous),
  }));
}

// --- テンプレート -------------------------------------------------------------

export async function createTemplate(db: Db, userId: string, input: z.infer<typeof templateInput>): Promise<string> {
  await assertExercisesAccessible(db, userId, input.items.map((i) => i.exerciseId));
  const [row] = await db
    .insert(workoutTemplates)
    .values({ userId, name: input.name, split: input.split, items: input.items as TemplateItem[] })
    .returning({ id: workoutTemplates.id });
  return row!.id;
}

/** 過去のワークアウトをテンプレートとして保存する */
export async function createTemplateFromWorkout(db: Db, userId: string, workoutId: string, name: string): Promise<string | null> {
  const w = await getWorkout(db, userId, workoutId);
  if (!w) return null;
  const items: TemplateItem[] = [];
  for (const s of w.sets) {
    const last = items[items.length - 1];
    if (last && last.exerciseId === s.exerciseId && last.side === s.side && last.reps === s.reps && last.weightKg === s.weightKg) {
      last.sets += 1;
    } else {
      items.push({ exerciseId: s.exerciseId, sets: 1, reps: s.reps, weightKg: s.weightKg, side: s.side });
    }
  }
  const [row] = await db
    .insert(workoutTemplates)
    .values({ userId, name, split: w.split, items })
    .returning({ id: workoutTemplates.id });
  return row!.id;
}

export async function listTemplates(db: Db, userId: string) {
  return db.select().from(workoutTemplates).where(eq(workoutTemplates.userId, userId)).orderBy(desc(workoutTemplates.createdAt));
}

export async function getTemplate(db: Db, userId: string, id: string) {
  const [row] = await db
    .select()
    .from(workoutTemplates)
    .where(and(eq(workoutTemplates.id, id), eq(workoutTemplates.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function deleteTemplate(db: Db, userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(workoutTemplates)
    .where(and(eq(workoutTemplates.id, id), eq(workoutTemplates.userId, userId)))
    .returning({ id: workoutTemplates.id });
  return rows.length > 0;
}
