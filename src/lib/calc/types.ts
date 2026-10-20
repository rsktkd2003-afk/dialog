export type Sex = "male" | "female" | "unspecified";
export type ActivityLevel = "low" | "normal" | "high";
export type Intensity = "low" | "moderate" | "high";

export type Goal =
  | "jump"
  | "spike"
  | "max_strength"
  | "hypertrophy"
  | "fat_loss"
  | "maintain_weight"
  | "condition"
  | "other";

export const GOAL_LABELS: Record<Goal, string> = {
  jump: "ジャンプ力向上",
  spike: "スパイク力向上",
  max_strength: "最大筋力向上",
  hypertrophy: "筋肥大",
  fat_loss: "体脂肪減少",
  maintain_weight: "体重維持",
  condition: "コンディション改善",
  other: "その他",
};

/** 最小値と最大値を持つ推定値。性別不明などで推定式が1つに定まらない場合に幅を持つ。 */
export type Range = { min: number; max: number };

export function isPoint(r: Range): boolean {
  return r.min === r.max;
}

export function mapRange(r: Range, fn: (v: number) => number): Range {
  const a = fn(r.min);
  const b = fn(r.max);
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

export type Warning = { code: string; message: string };
