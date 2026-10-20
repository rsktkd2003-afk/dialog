import { isMinor } from "./body";
import { carbRangeGPerKg, type ExerciseBlock } from "./energy";
import { consecutiveHighIntensityDays } from "./load";
import { slope } from "./stats";
import type { Goal, Intensity } from "./types";

export type SuggestionLevel = "care" | "caution" | "info" | "positive";

export type Suggestion = {
  id: string;
  level: SuggestionLevel;
  title: string;
  detail: string;
  /** 提案の根拠となった記録 */
  evidence: string[];
};

export type NutritionDay = {
  date: string;
  entryCount: number;
  energyKcal: number;
  proteinG: number;
  carbsG: number;
  /** 栄養値が不明な記録を含むか */
  hasUnknown: boolean;
};

export type PracticeDay = { date: string; minutes: number; intensity: Intensity; rpe: number | null };
export type WeightPoint = { date: string; weightKg: number };
export type DiscomfortSite = "shoulder" | "elbow" | "lower_back" | "knee" | "ankle" | "other";
export type ConditionDay = {
  date: string;
  sleepHours: number | null;
  discomforts: { site: DiscomfortSite; level: number }[];
};
export type StrengthTrend = { exerciseName: string; recentBest: number | null; previousBest: number | null };
export type ReachPoint = { date: string; valueCm: number };

export const SITE_LABELS: Record<DiscomfortSite, string> = {
  shoulder: "肩",
  elbow: "肘",
  lower_back: "腰",
  knee: "膝",
  ankle: "足首",
  other: "その他",
};

export type SuggestionInput = {
  today: string;
  age: number | null;
  primaryGoal: Goal | null;
  latestWeightKg: number | null;
  proteinTargetG: number | null;
  nutritionDays: NutritionDay[];
  practiceDays: PracticeDay[];
  weights: WeightPoint[];
  conditions: ConditionDay[];
  strengthTrends: StrengthTrend[];
  /** 実測の最高到達点のみ */
  measuredSpikeReaches: ReachPoint[];
};

export function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
}

const ORDER: Record<SuggestionLevel, number> = { care: 0, caution: 1, info: 2, positive: 3 };

export const PAIN_CONSULT_MESSAGE =
  "痛みがある状態で無理に練習を続けることは勧めません。痛みが続く・繰り返す・強くなる場合は、医師（整形外科・スポーツドクター）や理学療法士などの専門職に相談してください。このアプリは診断を行いません。";

export function isHighIntensity(p: { intensity: Intensity; rpe: number | null }): boolean {
  return p.intensity === "high" || (p.rpe != null && p.rpe >= 7);
}

export function buildSuggestions(input: SuggestionInput): Suggestion[] {
  const out: Suggestion[] = [];
  const { today } = input;
  const weekAgo = addDays(today, -7);

  // 1. 痛み・違和感
  const recentConds = input.conditions.filter((c) => c.date > addDays(today, -14) && c.date <= today);
  const painful = recentConds
    .filter((c) => c.date > weekAgo)
    .flatMap((c) => c.discomforts.filter((d) => d.level >= 2).map((d) => ({ date: c.date, ...d })));
  const siteDays = new Map<DiscomfortSite, Set<string>>();
  for (const c of recentConds) {
    for (const d of c.discomforts) {
      if (!siteDays.has(d.site)) siteDays.set(d.site, new Set());
      siteDays.get(d.site)!.add(c.date);
    }
  }
  const recurring = [...siteDays.entries()].filter(([, days]) => days.size >= 3);
  if (painful.length > 0 || recurring.length > 0) {
    const evidence = [
      ...painful.map((p) => `${p.date} ${SITE_LABELS[p.site]}：${p.level >= 3 ? "強い痛み" : "痛み"}`),
      ...recurring.map(([site, days]) => `${SITE_LABELS[site]}の違和感・痛み：直近14日で${days.size}日記録`),
    ];
    out.push({
      id: "pain",
      level: "care",
      title: recurring.length > 0 ? "同じ部位の違和感が繰り返し記録されています" : "痛みの記録があります",
      detail: PAIN_CONSULT_MESSAGE,
      evidence,
    });
  }

  // 2. 高強度の連続
  const highDays = new Map<string, boolean>();
  for (const p of input.practiceDays) {
    if (isHighIntensity(p)) highDays.set(p.date, true);
  }
  const streakEnd = highDays.get(today) ? today : addDays(today, -1);
  const streak = consecutiveHighIntensityDays(
    [...highDays.keys()].map((date) => ({ date, highIntensity: true })),
    streakEnd,
  );
  if (streak >= 3) {
    out.push({
      id: "high_intensity_streak",
      level: "caution",
      title: `高強度の練習が${streak}日続いています`,
      detail: "疲労が抜けにくい状態の可能性があります。睡眠・食事の確保や、強度を落とす日・休養日の設定を検討してください。",
      evidence: [`${addDays(streakEnd, -(streak - 1))}〜${streakEnd}：強度「高」またはRPE7以上`],
    });
  }

  // 3. タンパク質
  const pastNutrition = input.nutritionDays
    .filter((d) => d.date < today && d.date >= weekAgo && d.entryCount > 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 3);
  if (input.proteinTargetG != null && pastNutrition.length >= 3) {
    const avg = pastNutrition.reduce((s, d) => s + d.proteinG, 0) / pastNutrition.length;
    if (avg < input.proteinTargetG * 0.8) {
      const evidence = pastNutrition.map((d) => `${d.date}：タンパク質 ${Math.round(d.proteinG)} g`);
      evidence.push(`目標 ${Math.round(input.proteinTargetG)} g／直近${pastNutrition.length}日平均 ${Math.round(avg)} g`);
      if (pastNutrition.some((d) => d.hasUnknown)) evidence.push("栄養値が不明な記録を含むため、実際より少なく集計されている可能性があります");
      out.push({
        id: "protein_low",
        level: "caution",
        title: "タンパク質が目標より少ない日が続いています",
        detail: "毎食に肉・魚・卵・大豆製品・乳製品などを1品加えると補いやすくなります。",
        evidence,
      });
    }
  }

  // 4. 練習日の炭水化物
  if (input.latestWeightKg != null) {
    const w = input.latestWeightKg;
    const byDate = new Map<string, PracticeDay[]>();
    for (const p of input.practiceDays) {
      if (p.date >= today || p.date < weekAgo) continue;
      byDate.set(p.date, [...(byDate.get(p.date) ?? []), p]);
    }
    const low: string[] = [];
    for (const [date, sessions] of byDate) {
      const n = input.nutritionDays.find((d) => d.date === date && d.entryCount > 0);
      if (!n) continue;
      const blocks: ExerciseBlock[] = sessions.map((s) => ({ kind: "volleyball", intensity: s.intensity, minutes: s.minutes }));
      const range = carbRangeGPerKg(blocks);
      const perKg = n.carbsG / w;
      if (perKg < range.min) low.push(`${date}：炭水化物 ${perKg.toFixed(1)} g/kg（目安 ${range.min}〜${range.max} g/kg）`);
    }
    if (low.length >= 2) {
      out.push({
        id: "carb_low_practice",
        level: "caution",
        title: "練習日に炭水化物が不足している可能性があります",
        detail: "練習前後に主食（ごはん・パン・麺など）を増やすと、練習時のエネルギー確保につながります。記録漏れがないかも確認してください。",
        evidence: low.sort(),
      });
    }
  }

  // 5. 睡眠
  const sleepRecords = input.conditions.filter((c) => c.date > weekAgo && c.date <= today && c.sleepHours != null);
  if (sleepRecords.length >= 4) {
    const avg = sleepRecords.reduce((s, c) => s + (c.sleepHours ?? 0), 0) / sleepRecords.length;
    const minor = input.age != null && isMinor(input.age);
    const threshold = minor ? 8 : 7;
    if (avg < threshold) {
      out.push({
        id: "sleep_short",
        level: "caution",
        title: "睡眠時間が短めです",
        detail: minor
          ? "13〜18歳では1晩8〜10時間の睡眠が推奨されています（米国睡眠医学会）。"
          : "成人では1晩7時間以上の睡眠が推奨されています（米国睡眠医学会・睡眠研究学会）。",
        evidence: [`直近7日のうち${sleepRecords.length}日の平均 ${avg.toFixed(1)} 時間`],
      });
    }
  }

  // 6. 体重推移
  const recentWeights = input.weights.filter((w) => w.date > addDays(today, -28) && w.date <= today);
  if (recentWeights.length >= 4) {
    const sorted = [...recentWeights].sort((a, b) => (a.date < b.date ? -1 : 1));
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    const span = dayDiff(first.date, last.date);
    const s = span >= 14 ? slope(sorted.map((w) => ({ x: dayDiff(first.date, w.date), y: w.weightKg }))) : null;
    if (s != null) {
      const pctPerWeek = ((s * 7) / last.weightKg) * 100;
      const evidence = [
        `${first.date} ${first.weightKg} kg → ${last.date} ${last.weightKg} kg（${sorted.length}回の記録）`,
        `推移の傾き：週あたり ${pctPerWeek >= 0 ? "+" : ""}${pctPerWeek.toFixed(2)}%`,
      ];
      if (pctPerWeek <= -1) {
        out.push({
          id: "weight_rapid_loss",
          level: "caution",
          title: "体重が急に減っています",
          detail: "週1%を超える減少はパフォーマンスや体調に影響する可能性があります。食事量が不足していないか確認し、意図しない減少が続く場合は指導者や医療専門職に相談してください。",
          evidence,
        });
      } else if (input.primaryGoal === "fat_loss" && pctPerWeek > 0.2) {
        out.push({
          id: "weight_against_goal",
          level: "info",
          title: "体重が増加傾向です",
          detail: "体脂肪減少の目標に対して体重が増えています。設定画面でエネルギー目標を少し下げる調整を検討できます（体組成の変化で体重が増える場合もあります）。",
          evidence,
        });
      } else if (input.primaryGoal === "hypertrophy" && pctPerWeek < 0) {
        out.push({
          id: "weight_against_goal",
          level: "info",
          title: "体重が減少傾向です",
          detail: "筋肥大の目標に対して体重が減っています。食事量が足りているか確認し、必要に応じてエネルギー目標を調整してください。",
          evidence,
        });
      } else if (input.primaryGoal === "maintain_weight" && Math.abs(pctPerWeek) > 0.5) {
        out.push({
          id: "weight_against_goal",
          level: "info",
          title: pctPerWeek > 0 ? "体重が増加傾向です" : "体重が減少傾向です",
          detail: "体重維持の目標に対して変化が見られます。エネルギー目標の調整を検討してください。",
          evidence,
        });
      }
    }
  }

  // 7. 筋力の伸び
  const progressing = input.strengthTrends
    .filter((t) => t.recentBest != null && t.previousBest != null && t.recentBest > t.previousBest * 1.025)
    .slice(0, 3);
  if (progressing.length > 0) {
    out.push({
      id: "strength_progress",
      level: "positive",
      title: "筋力の記録が伸びています",
      detail: "推定1RMが前の4週間より上がっています（推定値は参考値です）。",
      evidence: progressing.map(
        (t) => `${t.exerciseName}：${t.previousBest!.toFixed(1)} kg → ${t.recentBest!.toFixed(1)} kg（推定1RM）`,
      ),
    });
  }

  // 8. ジャンプ（最高到達点）
  const reaches = [...input.measuredSpikeReaches].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (reaches.length >= 3 && dayDiff(reaches[0]!.date, reaches[reaches.length - 1]!.date) >= 42) {
    const cutoff = addDays(today, -28);
    const before = reaches.filter((r) => r.date < cutoff);
    const recent = reaches.filter((r) => r.date >= cutoff);
    if (before.length > 0 && recent.length > 0) {
      const bestBefore = Math.max(...before.map((r) => r.valueCm));
      const bestRecent = Math.max(...recent.map((r) => r.valueCm));
      if (bestRecent > bestBefore) {
        out.push({
          id: "jump_progress",
          level: "positive",
          title: "最高到達点が自己ベストを更新しています",
          detail: "直近4週間の実測値がそれ以前の最高値を上回りました。",
          evidence: [`それ以前の最高 ${bestBefore} cm → 直近4週間の最高 ${bestRecent} cm`],
        });
      } else {
        out.push({
          id: "jump_plateau",
          level: "info",
          title: "最高到達点が横ばいです",
          detail: "直近4週間の実測値がそれ以前の最高値に届いていません。疲労状態や測定条件の違いも影響します。下半身の筋力記録や練習量と合わせて確認してみてください。",
          evidence: [`それ以前の最高 ${bestBefore} cm／直近4週間の最高 ${bestRecent} cm（実測${reaches.length}回）`],
        });
      }
    }
  }

  return out.sort((a, b) => ORDER[a.level] - ORDER[b.level]);
}
