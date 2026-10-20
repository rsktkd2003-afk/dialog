import { GOAL_LABELS } from "@/lib/calc/types";
import { ACTIVITY_LABELS } from "@/lib/calc/energy";
import { WEEKDAY_LABELS } from "@/lib/date";

export const SEX_OPTIONS = [
  ["male", "男性"],
  ["female", "女性"],
  ["unspecified", "回答しない"],
] as const;

export const HAND_OPTIONS = [
  ["right", "右"],
  ["left", "左"],
  ["both", "両方"],
] as const;

export const POSITION_OPTIONS = [
  ["アウトサイドヒッター", "アウトサイドヒッター"],
  ["オポジット", "オポジット"],
  ["ミドルブロッカー", "ミドルブロッカー"],
  ["セッター", "セッター"],
  ["リベロ", "リベロ"],
  ["その他", "その他・未定"],
] as const;

export const INTENSITY_OPTIONS = [
  ["low", "低い（基礎練習・軽め中心）"],
  ["moderate", "ふつう"],
  ["high", "高い（試合形式・全力が多い）"],
] as const;

export const STRENGTH_EXP_OPTIONS = [
  ["none", "ほとんどない"],
  ["lt1y", "1年未満"],
  ["1to3y", "1〜3年"],
  ["gt3y", "3年以上"],
] as const;

export const ACTIVITY_OPTIONS = (Object.keys(ACTIVITY_LABELS) as (keyof typeof ACTIVITY_LABELS)[]).map((k) => [k, ACTIVITY_LABELS[k]] as const);

export const WEEKDAY_OPTIONS = [1, 2, 3, 4, 5, 6, 0].map((d) => [String(d), WEEKDAY_LABELS[d]!] as const);

export const GOAL_OPTIONS = (Object.keys(GOAL_LABELS) as (keyof typeof GOAL_LABELS)[]).map((k) => [k, GOAL_LABELS[k]] as const);

export const BODY_FAT_METHOD_OPTIONS = [
  ["bia_scale", "体組成計（体重計型など）"],
  ["caliper", "キャリパー（皮下脂肪厚）"],
  ["dxa", "DXA"],
  ["other", "その他"],
] as const;

export const MEASUREMENT_TYPE_OPTIONS = [
  ["measured", "実測（その場で測った）"],
  ["self_reported", "自己申告（覚えている値）"],
  ["estimated", "推定値"],
] as const;

export const FOOTWEAR_OPTIONS = [
  ["shoes", "シューズあり"],
  ["barefoot", "裸足"],
  ["unknown", "不明"],
] as const;
