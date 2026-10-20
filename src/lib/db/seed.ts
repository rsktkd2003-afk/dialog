import { and, eq, isNull } from "drizzle-orm";
import { exercises } from "./schema";
import type { Db } from "./types";

/** 全ユーザー共通の初期種目（名称と部位のみ。数値データは含まない） */
export const DEFAULT_EXERCISES: { name: string; bodyPart: "lower" | "upper" | "core" | "full"; unilateral?: boolean }[] = [
  { name: "バックスクワット", bodyPart: "lower" },
  { name: "フロントスクワット", bodyPart: "lower" },
  { name: "デッドリフト", bodyPart: "lower" },
  { name: "ルーマニアンデッドリフト", bodyPart: "lower" },
  { name: "ブルガリアンスクワット", bodyPart: "lower", unilateral: true },
  { name: "ランジ", bodyPart: "lower", unilateral: true },
  { name: "レッグプレス", bodyPart: "lower" },
  { name: "ヒップスラスト", bodyPart: "lower" },
  { name: "カーフレイズ", bodyPart: "lower" },
  { name: "ジャンプスクワット", bodyPart: "lower" },
  { name: "ベンチプレス", bodyPart: "upper" },
  { name: "ショルダープレス", bodyPart: "upper" },
  { name: "懸垂", bodyPart: "upper" },
  { name: "ラットプルダウン", bodyPart: "upper" },
  { name: "ベントオーバーロウ", bodyPart: "upper" },
  { name: "ダンベルロウ", bodyPart: "upper", unilateral: true },
  { name: "パワークリーン", bodyPart: "full" },
  { name: "ハングクリーン", bodyPart: "full" },
  { name: "アブローラー", bodyPart: "core" },
];

export async function seedDefaults(db: Db): Promise<void> {
  for (const ex of DEFAULT_EXERCISES) {
    const existing = await db
      .select({ id: exercises.id })
      .from(exercises)
      .where(and(isNull(exercises.userId), eq(exercises.name, ex.name)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(exercises).values({ name: ex.name, bodyPart: ex.bodyPart, unilateral: ex.unilateral ?? false });
    }
  }
}
