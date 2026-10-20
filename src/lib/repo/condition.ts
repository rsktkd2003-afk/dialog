import { and, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { conditionLogs, type Discomfort } from "../db/schema";
import type { Db } from "../db/types";
import { LIMITS, dateString, optionalInt, optionalNumber, optionalText } from "../validation";

export const DISCOMFORT_SITES = ["shoulder", "elbow", "lower_back", "knee", "ankle", "other"] as const;
export const DISCOMFORT_LEVEL_LABELS = { 1: "違和感", 2: "痛み", 3: "強い痛み" } as const;

const discomfort = z.object({
  site: z.enum(DISCOMFORT_SITES),
  side: z.enum(["left", "right", "both"]).nullable().default(null),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  note: z.string().trim().max(200).nullable().default(null),
});

export const conditionInput = z.object({
  date: dateString,
  sleepHours: optionalNumber(LIMITS.sleepHours[0], LIMITS.sleepHours[1], "睡眠時間"),
  sleepQuality: optionalInt(LIMITS.scale5[0], LIMITS.scale5[1], "睡眠の質"),
  fatigue: optionalInt(LIMITS.scale5[0], LIMITS.scale5[1], "全身疲労"),
  soreness: optionalInt(LIMITS.scale5[0], LIMITS.scale5[1], "筋肉痛"),
  feeling: optionalInt(LIMITS.scale5[0], LIMITS.scale5[1], "調子"),
  isRestDay: z.coerce.boolean().default(false),
  discomforts: z.array(discomfort).max(DISCOMFORT_SITES.length * 3).default([]),
  note: optionalText(500),
});
export type ConditionInput = z.infer<typeof conditionInput>;
export type ConditionLog = typeof conditionLogs.$inferSelect;

/** 1日1件。同じ日に再入力した場合は上書きする。 */
export async function upsertCondition(db: Db, userId: string, input: ConditionInput): Promise<ConditionLog> {
  const values = { ...input, discomforts: input.discomforts as Discomfort[] };
  const [row] = await db
    .insert(conditionLogs)
    .values({ ...values, userId })
    .onConflictDoUpdate({
      target: [conditionLogs.userId, conditionLogs.date],
      set: { ...values, updatedAt: new Date() },
    })
    .returning();
  return row!;
}

export async function getCondition(db: Db, userId: string, date: string): Promise<ConditionLog | null> {
  const [row] = await db
    .select()
    .from(conditionLogs)
    .where(and(eq(conditionLogs.userId, userId), eq(conditionLogs.date, date)))
    .limit(1);
  return row ?? null;
}

export async function listConditions(db: Db, userId: string, opts: { from?: string; to?: string; limit?: number } = {}) {
  const conds = [eq(conditionLogs.userId, userId)];
  if (opts.from) conds.push(gte(conditionLogs.date, opts.from));
  if (opts.to) conds.push(lte(conditionLogs.date, opts.to));
  return db
    .select()
    .from(conditionLogs)
    .where(and(...conds))
    .orderBy(desc(conditionLogs.date))
    .limit(opts.limit ?? 400);
}

export async function deleteCondition(db: Db, userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(conditionLogs)
    .where(and(eq(conditionLogs.id, id), eq(conditionLogs.userId, userId)))
    .returning({ id: conditionLogs.id });
  return rows.length > 0;
}
