import { isMinor } from "./body";
import type { SourceId } from "./sources";
import type { ActivityLevel, Goal, Intensity, Range, Sex, Warning } from "./types";
import { mapRange } from "./types";

// ---------------------------------------------------------------------------
// 基礎代謝量
// ---------------------------------------------------------------------------

export type BmrMethod = "jiss_ffm" | "mifflin";

export type BmrInput = {
  weightKg: number | null;
  heightCm: number | null;
  age: number | null;
  sex: Sex | null;
  /** 計測された体脂肪率のみを渡すこと（外見や周囲径からの推定値は渡さない） */
  measuredBodyFatPct: number | null;
};

export type BmrEstimate = {
  kcal: Range;
  method: BmrMethod;
  formula: string;
  fatFreeMassKg: number | null;
  sources: SourceId[];
  warnings: Warning[];
};

export type MissingResult = { ok: false; missing: string[]; message: string };
export type BmrResult = { ok: true; value: BmrEstimate } | MissingResult;

/** Mifflin-St Jeor 式 */
export function mifflinStJeor(weightKg: number, heightCm: number, age: number, sex: "male" | "female"): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

/** 国立スポーツ科学センターの方法：除脂肪量1kgあたり28.5kcal */
export function jissFfmBmr(fatFreeMassKg: number): number {
  return 28.5 * fatFreeMassKg;
}

/**
 * 基礎代謝量の参考値を推定する。
 * - 計測された体脂肪率がある場合：除脂肪量ベース（性別に依存しない）
 * - ない場合：Mifflin-St Jeor 式（身長・年齢が必要）。性別未回答なら男女両方の式で幅を示す。
 * 必要な値が欠けている場合は推定せず、不足項目を返す。
 */
export function estimateBmr(input: BmrInput): BmrResult {
  const warnings: Warning[] = [];
  if (input.weightKg == null) {
    return { ok: false, missing: ["体重"], message: "基礎代謝量の推定には体重の記録が必要です。" };
  }
  const minor = input.age != null && isMinor(input.age);

  if (input.measuredBodyFatPct != null) {
    const ffm = input.weightKg * (1 - input.measuredBodyFatPct / 100);
    if (minor) {
      warnings.push({
        code: "bmr_minor",
        message: "成長期の選手では推定誤差が大きくなる可能性があります。",
      });
    }
    warnings.push({
      code: "bmr_bodyfat_device",
      message: "体脂肪率の計測方法（体組成計など）によって除脂肪量は変動し、推定値にも影響します。",
    });
    const v = jissFfmBmr(ffm);
    return {
      ok: true,
      value: {
        kcal: { min: v, max: v },
        method: "jiss_ffm",
        formula: "28.5 × 除脂肪量(kg)",
        fatFreeMassKg: ffm,
        sources: ["koshimizu2005"],
        warnings,
      },
    };
  }

  const missing: string[] = [];
  if (input.heightCm == null) missing.push("身長");
  if (input.age == null) missing.push("年齢（生年月日）");
  if (missing.length > 0 || input.heightCm == null || input.age == null) {
    return {
      ok: false,
      missing,
      message: "基礎代謝量の推定には身長と年齢、または計測した体脂肪率が必要です。",
    };
  }

  if (input.age < 19) {
    warnings.push({
      code: "bmr_minor",
      message: "Mifflin-St Jeor式は19歳以上の成人データから作られた式です。成長期の選手では推定誤差が大きくなる可能性があります。",
    });
  }
  warnings.push({
    code: "bmr_athlete",
    message: "体格に対して筋肉量が多い選手では、実際より低く推定される場合があります。体脂肪率を計測すると除脂肪量ベースの推定に切り替わります。",
  });

  let kcal: Range;
  if (input.sex === "male" || input.sex === "female") {
    const v = mifflinStJeor(input.weightKg, input.heightCm, input.age, input.sex);
    kcal = { min: v, max: v };
  } else {
    const f = mifflinStJeor(input.weightKg, input.heightCm, input.age, "female");
    const m = mifflinStJeor(input.weightKg, input.heightCm, input.age, "male");
    kcal = { min: f, max: m };
    warnings.push({
      code: "bmr_sex_range",
      message: "性別が未回答のため、男女それぞれの式で計算した幅で表示しています。体脂肪率を計測すると性別に依存しない推定ができます。",
    });
  }
  return {
    ok: true,
    value: {
      kcal,
      method: "mifflin",
      formula:
        input.sex === "male"
          ? "10×体重 + 6.25×身長 − 5×年齢 + 5"
          : input.sex === "female"
            ? "10×体重 + 6.25×身長 − 5×年齢 − 161"
            : "10×体重 + 6.25×身長 − 5×年齢 + (5 または −161)",
      fatFreeMassKg: null,
      sources: ["mifflin1990"],
      warnings,
    },
  };
}

// ---------------------------------------------------------------------------
// 1日の消費エネルギー
// ---------------------------------------------------------------------------

/** 運動時間を除いた日常生活の身体活動レベル（アプリ設定値。FAO/WHO/UNU 2004 を参考） */
export const BASE_PAL: Record<ActivityLevel, number> = { low: 1.4, normal: 1.5, high: 1.7 };

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  low: "低い（座っている時間が長い）",
  normal: "ふつう（通学・通勤で歩く、立ち仕事が少しある）",
  high: "高い（立ち仕事・移動が多い）",
};

export type ExerciseKind = "volleyball" | "strength";

/** 2011 Compendium of Physical Activities のMETs値 */
export const METS: Record<ExerciseKind, Record<Intensity, number>> = {
  // 15720 非競技的 3.0 / 15710 一般 4.0 / 15711 競技的（体育館） 6.0
  volleyball: { low: 3.0, moderate: 4.0, high: 6.0 },
  // 02050 複数種目 8-15回 3.5 / 02054 パワーリフティング・ボディビル 高強度 6.0
  strength: { low: 3.5, moderate: 3.5, high: 6.0 },
};

export type ExerciseBlock = { kind: ExerciseKind; intensity: Intensity; minutes: number };

export type Expenditure = {
  totalKcal: number;
  baseKcal: number;
  exerciseKcal: number;
  exerciseMinutes: number;
};

/**
 * 1日の消費エネルギーを推定する。
 * 二重計上を防ぐため、日常生活分(BMR×PAL)は運動時間を除いた時間に対してのみ計上し、
 * 運動時間はMETs×体重×時間で置き換える。
 */
export function dailyExpenditure(
  bmrKcal: number,
  weightKg: number,
  activity: ActivityLevel,
  blocks: ExerciseBlock[],
): Expenditure {
  const exerciseMinutes = Math.min(
    1440,
    blocks.reduce((s, b) => s + Math.max(0, b.minutes), 0),
  );
  const baseKcal = (bmrKcal * BASE_PAL[activity] * (1440 - exerciseMinutes)) / 1440;
  let remaining = exerciseMinutes;
  let exerciseKcal = 0;
  for (const b of blocks) {
    const m = Math.min(Math.max(0, b.minutes), remaining);
    remaining -= m;
    exerciseKcal += METS[b.kind][b.intensity] * weightKg * (m / 60);
  }
  return { totalKcal: baseKcal + exerciseKcal, baseKcal, exerciseKcal, exerciseMinutes };
}

// ---------------------------------------------------------------------------
// 栄養目標
// ---------------------------------------------------------------------------

export const PROTEIN_RANGE_G_PER_KG = { min: 1.2, max: 2.0 } as const;
export const FAT_PCT_RANGE = { min: 20, max: 30 } as const;
export const FAT_PCT_TARGET = 25;

/** 運動量に応じた炭水化物の推奨範囲(g/kg/日)。ACSM 2016 の区分を練習時間に対応付けたもの。 */
export function carbRangeGPerKg(blocks: ExerciseBlock[]): { min: number; max: number; label: string } {
  const minutes = blocks.reduce((s, b) => s + Math.max(0, b.minutes), 0);
  const onlyLow = blocks.every((b) => b.intensity === "low");
  if (minutes < 45 || onlyLow) return { min: 3, max: 5, label: "軽い運動・休養日" };
  if (minutes <= 90) return { min: 5, max: 7, label: "中程度（1日約1時間）" };
  if (minutes <= 240) return { min: 6, max: 10, label: "多い（1日1〜3時間の中〜高強度）" };
  return { min: 8, max: 12, label: "非常に多い（1日4時間以上）" };
}

export type GoalAdjustment = {
  kind: "deficit" | "surplus" | "none";
  kcal: Range;
  note: string;
};

export type TargetInput = {
  bmr: BmrEstimate;
  weightKg: number;
  age: number | null;
  activity: ActivityLevel;
  blocks: ExerciseBlock[];
  primaryGoal: Goal | null;
  /** ユーザーが体重推移などを見て設定した調整量(kcal) */
  manualAdjustKcal: number;
};

export type DailyTargets = {
  expenditure: Range;
  exerciseKcal: Range;
  goalAdjustment: GoalAdjustment;
  energyKcal: Range;
  proteinG: Range;
  proteinGPerKg: number;
  fatG: Range;
  carbsG: Range;
  carbsGPerKg: Range;
  carbRecommendation: { min: number; max: number; label: string };
  warnings: Warning[];
  sources: SourceId[];
};

function round10(v: number): number {
  return Math.round(v / 10) * 10;
}

function roundRange(r: Range, fn: (v: number) => number = Math.round): Range {
  return { min: fn(r.min), max: fn(r.max) };
}

function goalAdjustment(goal: Goal | null, expenditure: number, age: number | null): { kcal: number; kind: GoalAdjustment["kind"] } {
  if (goal === "fat_loss") {
    if (age == null || isMinor(age)) return { kcal: 0, kind: "none" };
    return { kcal: -Math.min(expenditure * 0.1, 500), kind: "deficit" };
  }
  if (goal === "hypertrophy") return { kcal: Math.min(expenditure * 0.1, 300), kind: "surplus" };
  return { kcal: 0, kind: "none" };
}

/**
 * 1日の摂取目標を算出する。
 * タンパク質(g/kg)と脂質(エネルギー比)を先に決め、残りを炭水化物に割り当てる。
 * 炭水化物が運動量に応じた推奨範囲を外れる場合は警告する（自動で数値を書き換えない）。
 */
export function computeDailyTargets(input: TargetInput): DailyTargets {
  const warnings: Warning[] = [];
  const sources = new Set<SourceId>([...input.bmr.sources, "fao2004", "thomas2016", "morton2018", "dri2025"]);
  if (input.blocks.length > 0) sources.add("ainsworth2011");

  const proteinGPerKg = input.primaryGoal === "fat_loss" ? 2.0 : 1.6;
  const proteinG = proteinGPerKg * input.weightKg;
  const carbRecommendation = carbRangeGPerKg(input.blocks);

  const perBmr = (bmr: number) => {
    const exp = dailyExpenditure(bmr, input.weightKg, input.activity, input.blocks);
    const adj = goalAdjustment(input.primaryGoal, exp.totalKcal, input.age);
    let energy = exp.totalKcal + adj.kcal + input.manualAdjustKcal;
    let floored = false;
    if (energy < bmr) {
      energy = bmr;
      floored = true;
    }
    const fatG = (energy * (FAT_PCT_TARGET / 100)) / 9;
    const carbsG = Math.max(0, (energy - proteinG * 4 - fatG * 9) / 4);
    return { exp, adj, energy, floored, fatG, carbsG };
  };

  const a = perBmr(input.bmr.kcal.min);
  const b = perBmr(input.bmr.kcal.max);
  const range = (f: (x: typeof a) => number): Range => {
    const x = f(a);
    const y = f(b);
    return { min: Math.min(x, y), max: Math.max(x, y) };
  };

  if (input.primaryGoal === "fat_loss" && (input.age == null || isMinor(input.age))) {
    warnings.push({
      code: "minor_no_deficit",
      message:
        input.age == null
          ? "年齢が未入力のため、減量のためのエネルギー調整は行っていません。"
          : "18歳未満の選手には減量のためのエネルギー削減を自動で適用していません。体重を調整したい場合は指導者や医師・管理栄養士に相談してください。",
    });
  }
  if (a.floored || b.floored) {
    warnings.push({
      code: "floor_bmr",
      message: "目標が基礎代謝量の推定値を下回るため、基礎代謝量の推定値を下限としています。極端な食事制限は推奨しません。",
    });
  }
  if (input.primaryGoal === "hypertrophy") {
    warnings.push({
      code: "surplus_app_setting",
      message: "筋肥大目標では消費エネルギーの10%（上限300kcal）を上乗せしています。これはアプリの初期設定値で、体重推移を見て調整してください。",
    });
  }
  if (input.primaryGoal === "fat_loss" && a.adj.kind === "deficit") {
    warnings.push({
      code: "deficit_app_setting",
      message: "体脂肪減少目標では消費エネルギーの10%（上限500kcal）を差し引いています。これはアプリの初期設定値です。体重が週1%以上減る場合は調整してください。",
    });
  }

  const carbsGPerKg = range((x) => x.carbsG / input.weightKg);
  if (carbsGPerKg.max < carbRecommendation.min) {
    warnings.push({
      code: "carb_below_range",
      message: `エネルギー目標に対して炭水化物が運動量の目安（${carbRecommendation.min}〜${carbRecommendation.max} g/kg）を下回ります。練習量が多い日はエネルギー目標の見直しを検討してください。`,
    });
  }

  const ffm = input.bmr.fatFreeMassKg;
  if (ffm != null) {
    const ea = range((x) => (x.energy - x.exp.exerciseKcal) / ffm);
    if (ea.min < 30) {
      sources.add("redS2023");
      warnings.push({
        code: "low_energy_availability",
        message: "運動分を差し引いたエネルギーが除脂肪量1kgあたり30kcalを下回る可能性があります。エネルギー不足による体調への影響に注意してください。",
      });
    }
  }

  return {
    expenditure: roundRange(range((x) => x.exp.totalKcal), round10),
    exerciseKcal: roundRange(range((x) => x.exp.exerciseKcal), round10),
    goalAdjustment: {
      kind: a.adj.kind,
      kcal: roundRange(range((x) => x.adj.kcal), round10),
      note:
        a.adj.kind === "deficit"
          ? "体脂肪減少のための調整"
          : a.adj.kind === "surplus"
            ? "筋肥大のための調整"
            : "調整なし",
    },
    energyKcal: roundRange(range((x) => x.energy), round10),
    proteinG: roundRange({ min: proteinG, max: proteinG }),
    proteinGPerKg,
    fatG: roundRange(range((x) => x.fatG)),
    carbsG: roundRange(range((x) => x.carbsG)),
    carbsGPerKg: mapRange(carbsGPerKg, (v) => Math.round(v * 10) / 10),
    carbRecommendation,
    warnings,
    sources: [...sources],
  };
}
