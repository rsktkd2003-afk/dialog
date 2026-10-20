import { and, desc, eq, gte, isNotNull, lte } from "drizzle-orm";
import { z } from "zod";
import { bodyMeasurements, jumpMeasurements } from "../db/schema";
import type { Db } from "../db/types";
import { LIMITS, dateString, optionalEnum, optionalNumber, optionalText } from "../validation";

const circ = (label: string) => optionalNumber(LIMITS.circumferenceCm[0], LIMITS.circumferenceCm[1], label);

export const bodyMeasurementInput = z
  .object({
    date: dateString,
    weightKg: optionalNumber(LIMITS.weightKg[0], LIMITS.weightKg[1], "体重"),
    bodyFatPct: optionalNumber(LIMITS.bodyFatPct[0], LIMITS.bodyFatPct[1], "体脂肪率"),
    bodyFatMethod: optionalEnum(["bia_scale", "caliper", "dxa", "other"] as const),
    waistCm: circ("ウエスト"),
    neckCm: circ("首周り"),
    chestCm: circ("胸囲"),
    hipCm: circ("ヒップ"),
    thighCm: circ("太もも周囲"),
    calfCm: circ("ふくらはぎ周囲"),
    note: optionalText(500),
  })
  .refine(
    (v) => [v.weightKg, v.bodyFatPct, v.waistCm, v.neckCm, v.chestCm, v.hipCm, v.thighCm, v.calfCm].some((x) => x != null),
    { message: "少なくとも1つの測定値を入力してください", path: ["_form"] },
  )
  .refine((v) => v.bodyFatPct == null || v.bodyFatMethod != null, {
    message: "体脂肪率の計測方法を選択してください",
    path: ["bodyFatMethod"],
  });

export type BodyMeasurementInput = z.infer<typeof bodyMeasurementInput>;

export const JUMP_KINDS = [
  "standing_reach",
  "spike_reach",
  "block_reach",
  "approach_jump",
  "vertical_jump",
  "standing_broad_jump",
] as const;

export const JUMP_KIND_LABELS: Record<(typeof JUMP_KINDS)[number], string> = {
  standing_reach: "立位指高",
  spike_reach: "最高到達点（スパイク）",
  block_reach: "ブロック最高到達点",
  approach_jump: "助走ジャンプ高",
  vertical_jump: "その場垂直跳び",
  standing_broad_jump: "立ち幅跳び",
};

const JUMP_LIMITS: Record<(typeof JUMP_KINDS)[number], readonly [number, number]> = {
  standing_reach: LIMITS.reachCm,
  spike_reach: LIMITS.reachCm,
  block_reach: LIMITS.reachCm,
  approach_jump: LIMITS.verticalJumpCm,
  vertical_jump: LIMITS.verticalJumpCm,
  standing_broad_jump: LIMITS.broadJumpCm,
};

export const jumpMeasurementInput = z
  .object({
    date: dateString,
    kind: z.enum(JUMP_KINDS),
    valueCm: z.coerce.number({ error: "数値を入力してください" }),
    measurementType: z.enum(["measured", "self_reported", "estimated"]),
    footwear: z.enum(["shoes", "barefoot", "unknown"]).default("unknown"),
    method: optionalText(100),
    note: optionalText(500),
  })
  .superRefine((v, ctx) => {
    const [min, max] = JUMP_LIMITS[v.kind];
    if (!(v.valueCm >= min && v.valueCm <= max)) {
      ctx.addIssue({ code: "custom", path: ["valueCm"], message: `${min}〜${max} cm の範囲で入力してください` });
    }
  });

export type JumpMeasurementInput = z.infer<typeof jumpMeasurementInput>;

export async function addBodyMeasurement(db: Db, userId: string, input: BodyMeasurementInput) {
  const [row] = await db.insert(bodyMeasurements).values({ userId, ...input }).returning();
  return row!;
}

export async function listBodyMeasurements(db: Db, userId: string, opts: { from?: string; to?: string; limit?: number } = {}) {
  const conds = [eq(bodyMeasurements.userId, userId)];
  if (opts.from) conds.push(gte(bodyMeasurements.date, opts.from));
  if (opts.to) conds.push(lte(bodyMeasurements.date, opts.to));
  return db
    .select()
    .from(bodyMeasurements)
    .where(and(...conds))
    .orderBy(desc(bodyMeasurements.date), desc(bodyMeasurements.createdAt))
    .limit(opts.limit ?? 500);
}

export async function deleteBodyMeasurement(db: Db, userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(bodyMeasurements)
    .where(and(eq(bodyMeasurements.id, id), eq(bodyMeasurements.userId, userId)))
    .returning({ id: bodyMeasurements.id });
  return rows.length > 0;
}

export async function latestWeight(db: Db, userId: string, onOrBefore?: string) {
  const conds = [eq(bodyMeasurements.userId, userId), isNotNull(bodyMeasurements.weightKg)];
  if (onOrBefore) conds.push(lte(bodyMeasurements.date, onOrBefore));
  const [row] = await db
    .select({ date: bodyMeasurements.date, weightKg: bodyMeasurements.weightKg })
    .from(bodyMeasurements)
    .where(and(...conds))
    .orderBy(desc(bodyMeasurements.date), desc(bodyMeasurements.createdAt))
    .limit(1);
  return row && row.weightKg != null ? { date: row.date, weightKg: row.weightKg } : null;
}

/** 計測された体脂肪率の最新値（計測方法つき）。推定値は保存しない設計のため、すべて計測値。 */
export async function latestBodyFat(db: Db, userId: string) {
  const [row] = await db
    .select({ date: bodyMeasurements.date, bodyFatPct: bodyMeasurements.bodyFatPct, method: bodyMeasurements.bodyFatMethod })
    .from(bodyMeasurements)
    .where(and(eq(bodyMeasurements.userId, userId), isNotNull(bodyMeasurements.bodyFatPct)))
    .orderBy(desc(bodyMeasurements.date), desc(bodyMeasurements.createdAt))
    .limit(1);
  return row && row.bodyFatPct != null ? { date: row.date, bodyFatPct: row.bodyFatPct, method: row.method } : null;
}

export async function latestWaist(db: Db, userId: string) {
  const [row] = await db
    .select({ date: bodyMeasurements.date, waistCm: bodyMeasurements.waistCm })
    .from(bodyMeasurements)
    .where(and(eq(bodyMeasurements.userId, userId), isNotNull(bodyMeasurements.waistCm)))
    .orderBy(desc(bodyMeasurements.date), desc(bodyMeasurements.createdAt))
    .limit(1);
  return row && row.waistCm != null ? { date: row.date, waistCm: row.waistCm } : null;
}

export async function addJumpMeasurement(db: Db, userId: string, input: JumpMeasurementInput) {
  const [row] = await db.insert(jumpMeasurements).values({ userId, ...input }).returning();
  return row!;
}

export async function listJumpMeasurements(db: Db, userId: string, opts: { kind?: (typeof JUMP_KINDS)[number]; limit?: number } = {}) {
  const conds = [eq(jumpMeasurements.userId, userId)];
  if (opts.kind) conds.push(eq(jumpMeasurements.kind, opts.kind));
  return db
    .select()
    .from(jumpMeasurements)
    .where(and(...conds))
    .orderBy(desc(jumpMeasurements.date), desc(jumpMeasurements.createdAt))
    .limit(opts.limit ?? 500);
}

export async function deleteJumpMeasurement(db: Db, userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(jumpMeasurements)
    .where(and(eq(jumpMeasurements.id, id), eq(jumpMeasurements.userId, userId)))
    .returning({ id: jumpMeasurements.id });
  return rows.length > 0;
}
