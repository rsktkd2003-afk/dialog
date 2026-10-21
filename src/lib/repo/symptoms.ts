import { and, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { symptomLogs } from "../db/schema";
import type { Db } from "../db/types";
import { dateString, optionalText, requiredInt } from "../validation";

export const SYMPTOM_SITES = ["ankle", "knee", "shoulder", "lower_back", "wrist", "hip", "calf", "thigh", "neck", "back", "other"] as const;
export const SYMPTOM_SIDES = ["right", "left", "both", "center", "na"] as const;
export const SYMPTOM_KINDS = ["pain", "discomfort", "tightness", "numbness", "other"] as const;
export const SYMPTOM_SITUATIONS = ["landing", "during_exercise", "after_exercise", "daily_life", "at_rest", "other"] as const;
export const SYMPTOM_IMPACTS = ["none", "slight", "limited", "unable"] as const;

export type SymptomSite = (typeof SYMPTOM_SITES)[number];
export type SymptomKind = (typeof SYMPTOM_KINDS)[number];
export type SymptomImpact = (typeof SYMPTOM_IMPACTS)[number];

export const SYMPTOM_SITE_LABELS: Record<SymptomSite, string> = {
  ankle: "足首",
  knee: "膝",
  shoulder: "肩",
  lower_back: "腰",
  wrist: "手首",
  hip: "股関節",
  calf: "ふくらはぎ",
  thigh: "太もも",
  neck: "首",
  back: "背中",
  other: "その他",
};
export const SYMPTOM_SIDE_LABELS: Record<(typeof SYMPTOM_SIDES)[number], string> = {
  right: "右",
  left: "左",
  both: "両側",
  center: "中央",
  na: "該当なし",
};
export const SYMPTOM_KIND_LABELS: Record<SymptomKind, string> = {
  pain: "痛み",
  discomfort: "違和感",
  tightness: "張り・こわばり",
  numbness: "しびれ",
  other: "その他",
};
export const SYMPTOM_SITUATION_LABELS: Record<(typeof SYMPTOM_SITUATIONS)[number], string> = {
  landing: "ジャンプの着地時",
  during_exercise: "運動中",
  after_exercise: "運動後",
  daily_life: "日常生活",
  at_rest: "安静時",
  other: "その他",
};
export const SYMPTOM_IMPACT_LABELS: Record<SymptomImpact, string> = {
  none: "影響なし",
  slight: "少し気になる",
  limited: "動作が制限される",
  unable: "運動できない",
};

export const SYMPTOM_NOTE_MAX = 500;

export const symptomInput = z.object({
  date: dateString,
  site: z.enum(SYMPTOM_SITES, { error: "部位を選択してください" }),
  side: z.enum(SYMPTOM_SIDES, { error: "左右を選択してください" }),
  kind: z.enum(SYMPTOM_KINDS, { error: "症状の種類を選択してください" }),
  level: requiredInt(0, 10, "程度"),
  situation: z.enum(SYMPTOM_SITUATIONS, { error: "発生する場面を選択してください" }),
  impact: z.enum(SYMPTOM_IMPACTS, { error: "運動への影響を選択してください" }),
  note: optionalText(SYMPTOM_NOTE_MAX),
});
export type SymptomInput = z.infer<typeof symptomInput>;
export type SymptomLog = typeof symptomLogs.$inferSelect;

export async function addSymptom(db: Db, userId: string, input: SymptomInput): Promise<SymptomLog> {
  const [row] = await db.insert(symptomLogs).values({ ...input, userId }).returning();
  return row!;
}

export async function listSymptoms(db: Db, userId: string, opts: { from?: string; to?: string; limit?: number } = {}) {
  const conds = [eq(symptomLogs.userId, userId)];
  if (opts.from) conds.push(gte(symptomLogs.date, opts.from));
  if (opts.to) conds.push(lte(symptomLogs.date, opts.to));
  return db
    .select()
    .from(symptomLogs)
    .where(and(...conds))
    .orderBy(desc(symptomLogs.date), desc(symptomLogs.createdAt))
    .limit(opts.limit ?? 200);
}

export async function deleteSymptom(db: Db, userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(symptomLogs)
    .where(and(eq(symptomLogs.id, id), eq(symptomLogs.userId, userId)))
    .returning({ id: symptomLogs.id });
  return rows.length > 0;
}
