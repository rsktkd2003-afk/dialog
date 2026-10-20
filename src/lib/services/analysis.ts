import { and, eq, gte } from "drizzle-orm";
import { pairNearest, pairWithOffset, sumByDate, type Dated } from "../calc/pairing";
import { MIN_PAIRS_FOR_CORRELATION, describeCorrelation, pearson, type Point } from "../calc/stats";
import { sessionLoad } from "../calc/load";
import { bestEstimatedOneRepMax } from "../calc/strength";
import { jumpHeightFromReach } from "../calc/jump";
import { addDays } from "../date";
import { exercises, workoutSets, workouts } from "../db/schema";
import type { Db } from "../db/types";
import { listBodyMeasurements, listJumpMeasurements } from "../repo/body";
import { listConditions } from "../repo/condition";
import { dailyNutrition } from "../repo/meals";
import { listPractices } from "../repo/practice";

export type Analysis = {
  id: string;
  title: string;
  xLabel: string;
  yLabel: string;
  pairing: string;
  points: (Point & { date: string })[];
  r: number | null;
  summary: string | null;
};

function analyze(a: Omit<Analysis, "r" | "summary">): Analysis {
  if (a.points.length < MIN_PAIRS_FOR_CORRELATION) return { ...a, r: null, summary: null };
  const r = pearson(a.points);
  return { ...a, r, summary: r == null ? "値のばらつきがないため計算できません" : describeCorrelation(r) };
}

const SQUAT_NAMES = ["バックスクワット", "フロントスクワット"];

export async function loadAnalyses(db: Db, userId: string, today: string): Promise<Analysis[]> {
  const from = addDays(today, -365);
  const [bodies, jumps, practices, conds, nutrition, squatRows] = await Promise.all([
    listBodyMeasurements(db, userId, { from, to: today, limit: 2000 }),
    listJumpMeasurements(db, userId, { limit: 2000 }),
    listPractices(db, userId, { from, to: today, limit: 2000 }),
    listConditions(db, userId, { from, to: today, limit: 2000 }),
    dailyNutrition(db, userId, from, today),
    db
      .select({ date: workouts.date, name: exercises.name, weightKg: workoutSets.weightKg, reps: workoutSets.reps })
      .from(workoutSets)
      .innerJoin(workouts, eq(workouts.id, workoutSets.workoutId))
      .innerJoin(exercises, eq(exercises.id, workoutSets.exerciseId))
      .where(and(eq(workoutSets.userId, userId), gte(workouts.date, from))),
  ]);

  const weights: Dated[] = bodies.filter((b) => b.weightKg != null).map((b) => ({ date: b.date, value: b.weightKg! }));
  const standing = jumps.filter((j) => j.kind === "standing_reach");
  const jumpHeights: Dated[] = jumps
    .filter((j) => j.kind === "spike_reach" && j.measurementType === "measured")
    .flatMap((j) => {
      const r = jumpHeightFromReach(j, standing);
      return r.ok ? [{ date: j.date, value: r.heightCm }] : [];
    });

  const squatByDate = new Map<string, { weightKg: number; reps: number }[]>();
  for (const s of squatRows) {
    if (!SQUAT_NAMES.includes(s.name)) continue;
    squatByDate.set(s.date, [...(squatByDate.get(s.date) ?? []), s]);
  }
  const squat: Dated[] = [...squatByDate.entries()].flatMap(([date, sets]) => {
    const v = bestEstimatedOneRepMax(sets);
    return v == null ? [] : [{ date, value: v }];
  });

  const loads = sumByDate(practices.filter((p) => p.rpe != null).map((p) => ({ date: p.date, value: sessionLoad(p.rpe!, p.durationMin) })));
  const nextFatigue: Dated[] = conds.filter((c) => c.fatigue != null).map((c) => ({ date: c.date, value: c.fatigue! }));
  const sleep: Dated[] = conds.filter((c) => c.sleepHours != null).map((c) => ({ date: c.date, value: c.sleepHours! }));
  const perf: Dated[] = practices.filter((p) => p.performance != null).map((p) => ({ date: p.date, value: p.performance! }));

  // 週平均エネルギー摂取量（4日以上記録した週）と、その週の体重変化
  const weekly: (Point & { date: string })[] = [];
  for (let i = 0; i < 52; i++) {
    const end = addDays(today, -7 * i);
    const start = addDays(end, -6);
    const days = nutrition.filter((n) => n.date >= start && n.date <= end && n.entryCount > 0);
    if (days.length < 4) continue;
    const w0 = pairNearest(weights, [{ date: start, value: 0 }], 2)[0];
    const w1 = pairNearest(weights, [{ date: end, value: 0 }], 2)[0];
    if (!w0 || !w1) continue;
    weekly.push({ x: days.reduce((s, d) => s + d.energyKcal, 0) / days.length, y: w1.x - w0.x, date: start });
  }

  return [
    analyze({ id: "weight_jump", title: "体重とジャンプ高", xLabel: "体重(kg)", yLabel: "ジャンプ高(cm, 算出値)", pairing: "ジャンプ測定日の前後3日以内の体重", points: pairNearest(weights, jumpHeights, 3) }),
    analyze({ id: "squat_jump", title: "スクワット推定1RMとジャンプ高", xLabel: "スクワット推定1RM(kg)", yLabel: "ジャンプ高(cm, 算出値)", pairing: "ジャンプ測定日以前14日以内の、最も近いスクワットの記録", points: pairNearest(squat, jumpHeights, 14, "before") }),
    analyze({ id: "load_fatigue", title: "練習負荷と翌日の疲労", xLabel: "練習負荷(AU)", yLabel: "翌日の全身疲労(1-5)", pairing: "練習日の負荷（RPE×時間）と翌日のコンディション記録", points: pairWithOffset(loads, nextFatigue, 1) }),
    analyze({ id: "sleep_perf", title: "睡眠時間と練習の調子", xLabel: "睡眠時間(h)", yLabel: "練習の調子(1-5)", pairing: "同じ日の睡眠記録と練習の主観的パフォーマンス", points: pairNearest(sleep, perf, 0) }),
    analyze({ id: "energy_weight", title: "エネルギー摂取量と体重変化", xLabel: "週平均摂取量(kcal)", yLabel: "週の体重変化(kg)", pairing: "4日以上食事を記録した週の平均と、週初め・週末の体重差", points: weekly }),
  ];
}
