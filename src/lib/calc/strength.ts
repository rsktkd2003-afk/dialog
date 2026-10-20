export type SetRecord = {
  weightKg: number;
  reps: number;
  side?: "both" | "left" | "right";
};

/** 推定式が実用上妥当とされる回数の上限。これを超える回数では推定しない。 */
export const E1RM_MAX_REPS = 10;

export function epley(weightKg: number, reps: number): number {
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

export function brzycki(weightKg: number, reps: number): number {
  return (weightKg * 36) / (37 - reps);
}

export type E1rmEstimate = {
  epley: number;
  brzycki: number;
  /** 2式の平均（参考値） */
  average: number;
};

/**
 * 1RMの推定値（参考値）。1〜10回の範囲外、または重量0以下の場合は null。
 * 自重種目やフォーム・疲労の影響は考慮していない。
 */
export function estimateOneRepMax(weightKg: number, reps: number): E1rmEstimate | null {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null;
  if (!Number.isInteger(reps) || reps < 1 || reps > E1RM_MAX_REPS) return null;
  const e = epley(weightKg, reps);
  const b = brzycki(weightKg, reps);
  return { epley: e, brzycki: b, average: (e + b) / 2 };
}

/** セット群の中で最も高い推定1RM（平均値）を返す。推定可能なセットがなければ null。 */
export function bestEstimatedOneRepMax(sets: SetRecord[]): number | null {
  let best: number | null = null;
  for (const s of sets) {
    const est = estimateOneRepMax(s.weightKg, s.reps);
    if (est && (best == null || est.average > best)) best = est.average;
  }
  return best;
}

/** 総負荷量（重量×回数の合計, kg） */
export function volumeLoad(sets: SetRecord[]): number {
  return sets.reduce((s, x) => s + Math.max(0, x.weightKg) * Math.max(0, x.reps), 0);
}

export function heaviestSet(sets: SetRecord[]): SetRecord | null {
  let best: SetRecord | null = null;
  for (const s of sets) {
    if (!best || s.weightKg > best.weightKg || (s.weightKg === best.weightKg && s.reps > best.reps)) best = s;
  }
  return best;
}
