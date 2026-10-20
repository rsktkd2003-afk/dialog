import type { Point } from "./stats";

export type Dated = { date: string; value: number };

function dayNum(date: string): number {
  return Date.parse(date + "T00:00:00Z") / 86400000;
}

/**
 * y の各記録に対して、日付が maxGapDays 以内で最も近い x の記録を対応付ける。
 * direction="before" の場合は y の日付以前の x のみを対象とする。
 */
export function pairNearest(
  xs: Dated[],
  ys: Dated[],
  maxGapDays: number,
  direction: "any" | "before" = "any",
): (Point & { date: string })[] {
  const out: (Point & { date: string })[] = [];
  for (const y of ys) {
    let best: Dated | null = null;
    let bestGap = Infinity;
    for (const x of xs) {
      const diff = dayNum(y.date) - dayNum(x.date);
      if (direction === "before" && diff < 0) continue;
      const gap = Math.abs(diff);
      if (gap <= maxGapDays && gap < bestGap) {
        best = x;
        bestGap = gap;
      }
    }
    if (best) out.push({ x: best.value, y: y.value, date: y.date });
  }
  return out;
}

/** x の日付の offsetDays 日後の y を対応付ける（例：練習負荷と翌日の疲労） */
export function pairWithOffset(xs: Dated[], ys: Dated[], offsetDays: number): (Point & { date: string })[] {
  const yByDate = new Map(ys.map((y) => [y.date, y.value]));
  const out: (Point & { date: string })[] = [];
  for (const x of xs) {
    const d = new Date(x.date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + offsetDays);
    const v = yByDate.get(d.toISOString().slice(0, 10));
    if (v != null) out.push({ x: x.value, y: v, date: x.date });
  }
  return out;
}

/** 同じ日付の値を合計して1日1件にする */
export function sumByDate(items: Dated[]): Dated[] {
  const m = new Map<string, number>();
  for (const it of items) m.set(it.date, (m.get(it.date) ?? 0) + it.value);
  return [...m.entries()].map(([date, value]) => ({ date, value })).sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** 同じ日付の値のうち最大値を残して1日1件にする（同日に複数回測定した到達点など） */
export function maxByDate(items: Dated[]): Dated[] {
  const m = new Map<string, number>();
  for (const it of items) m.set(it.date, Math.max(m.get(it.date) ?? -Infinity, it.value));
  return [...m.entries()].map(([date, value]) => ({ date, value })).sort((a, b) => (a.date < b.date ? -1 : 1));
}
