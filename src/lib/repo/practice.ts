import { and, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { practiceSessions } from "../db/schema";
import type { Db } from "../db/types";
import { LIMITS, dateString, optionalInt, optionalText, requiredInt } from "../validation";

export const INTENSITY_LABELS = { low: "低", moderate: "中", high: "高" } as const;

export const practiceInput = z.object({
  date: dateString,
  startTime: z.preprocess(
    (v) => (v === "" ? null : v),
    z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "時刻の形式が正しくありません").nullable(),
  ),
  durationMin: requiredInt(LIMITS.practiceMin[0], LIMITS.practiceMin[1], "練習時間"),
  intensity: z.enum(["low", "moderate", "high"]),
  rpe: optionalInt(LIMITS.rpe[0], LIMITS.rpe[1], "RPE"),
  jumpCount: optionalInt(LIMITS.count[0], LIMITS.count[1], "ジャンプ回数"),
  spikeCount: optionalInt(LIMITS.count[0], LIMITS.count[1], "スパイク本数"),
  performance: optionalInt(LIMITS.scale5[0], LIMITS.scale5[1], "調子"),
  fatigue: optionalInt(LIMITS.scale5[0], LIMITS.scale5[1], "疲労感"),
  note: optionalText(500),
});
export type PracticeInput = z.infer<typeof practiceInput>;
export type PracticeSession = typeof practiceSessions.$inferSelect;

export async function addPractice(db: Db, userId: string, input: PracticeInput): Promise<PracticeSession> {
  const [row] = await db.insert(practiceSessions).values({ ...input, userId }).returning();
  return row!;
}

export async function listPractices(db: Db, userId: string, opts: { from?: string; to?: string; limit?: number } = {}) {
  const conds = [eq(practiceSessions.userId, userId)];
  if (opts.from) conds.push(gte(practiceSessions.date, opts.from));
  if (opts.to) conds.push(lte(practiceSessions.date, opts.to));
  return db
    .select()
    .from(practiceSessions)
    .where(and(...conds))
    .orderBy(desc(practiceSessions.date), desc(practiceSessions.createdAt))
    .limit(opts.limit ?? 200);
}

export async function deletePractice(db: Db, userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(practiceSessions)
    .where(and(eq(practiceSessions.id, id), eq(practiceSessions.userId, userId)))
    .returning({ id: practiceSessions.id });
  return rows.length > 0;
}
