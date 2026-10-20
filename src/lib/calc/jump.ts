import type { Warning } from "./types";

export type MeasurementType = "measured" | "self_reported" | "estimated";
export type Footwear = "shoes" | "barefoot" | "unknown";

export type ReachRecord = {
  date: string;
  valueCm: number;
  measurementType: MeasurementType;
  footwear: Footwear;
};

export type JumpHeightResult =
  | { ok: true; heightCm: number; standingReachDate: string; warnings: Warning[] }
  | { ok: false; reason: string };

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

/**
 * 最高到達点と立位指高の差からジャンプ高を算出する。
 * 両方が実測であることを条件とし、靴の条件が異なる・不明な場合や測定日が離れている場合は警告する。
 * 算出値は「算出値」であり実測のジャンプ高とは区別して表示すること。
 */
export function jumpHeightFromReach(reach: ReachRecord, standingReaches: ReachRecord[]): JumpHeightResult {
  if (reach.measurementType !== "measured") {
    return { ok: false, reason: "最高到達点が実測ではないため、ジャンプ高を算出していません。" };
  }
  const candidates = standingReaches
    .filter((s) => s.measurementType === "measured" && s.date <= reach.date)
    .sort((x, y) => (x.date < y.date ? 1 : -1));
  const standing = candidates[0];
  if (!standing) {
    return { ok: false, reason: "この日以前に実測した立位指高がないため、ジャンプ高を算出できません。" };
  }
  const warnings: Warning[] = [];
  if (reach.footwear === "unknown" || standing.footwear === "unknown") {
    warnings.push({ code: "footwear_unknown", message: "靴の着用条件が不明な記録を含みます。" });
  } else if (reach.footwear !== standing.footwear) {
    warnings.push({
      code: "footwear_mismatch",
      message: "最高到達点と立位指高で靴の着用条件が異なるため、ジャンプ高に誤差が生じます。",
    });
  }
  const gap = daysBetween(standing.date, reach.date);
  if (gap > 180) {
    warnings.push({
      code: "standing_reach_old",
      message: `立位指高の測定から${gap}日経過しています。成長期などで変化している可能性があります。`,
    });
  }
  const heightCm = reach.valueCm - standing.valueCm;
  if (heightCm <= 0) {
    return { ok: false, reason: "最高到達点が立位指高以下のため、測定条件を確認してください。" };
  }
  return { ok: true, heightCm, standingReachDate: standing.date, warnings };
}
