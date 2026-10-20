/** セッションRPE法によるトレーニング負荷（任意単位 AU）＝ RPE(0〜10) × 時間(分) */
export function sessionLoad(rpe: number, minutes: number): number {
  return Math.max(0, rpe) * Math.max(0, minutes);
}

export type DailyLoadRecord = { date: string; highIntensity: boolean };

/**
 * 指定日までに高強度の日が何日連続しているかを数える。
 * records には1日1件（その日に高強度のセッションがあれば true）を渡す。
 */
export function consecutiveHighIntensityDays(records: DailyLoadRecord[], endDate: string): number {
  const byDate = new Map(records.map((r) => [r.date, r.highIntensity]));
  let count = 0;
  let d = new Date(endDate + "T00:00:00Z");
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    if (byDate.get(key) !== true) break;
    count += 1;
    d = new Date(d.getTime() - 86400000);
  }
  return count;
}
