export type Basis = "per100g" | "perServing";
export type AmountUnit = "g" | "serving";

export type Nutrients = {
  energyKcal: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
};

export type FoodNutrition = Nutrients & {
  basis: Basis;
  /** 1食(1個)あたりのグラム数。不明なら null */
  servingG: number | null;
};

export const NUTRIENT_KEYS = ["energyKcal", "proteinG", "fatG", "carbsG"] as const;

export type AmountResult = { ok: true; value: Nutrients } | { ok: false; reason: string };

/**
 * 食品の栄養値と分量から摂取量を算出する。
 * 栄養値が不明(null)な項目は null のまま返し、0として扱わない。
 */
export function nutrientsForAmount(food: FoodNutrition, amount: number, unit: AmountUnit): AmountResult {
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: "分量は0より大きい値を入力してください。" };
  let factor: number;
  if (food.basis === "per100g") {
    if (unit === "g") factor = amount / 100;
    else if (food.servingG != null && food.servingG > 0) factor = (food.servingG * amount) / 100;
    else return { ok: false, reason: "この食品は1食あたりの重さが未登録のため、グラムで入力してください。" };
  } else {
    if (unit === "serving") factor = amount;
    else if (food.servingG != null && food.servingG > 0) factor = amount / food.servingG;
    else return { ok: false, reason: "この食品は1食あたりの重さが未登録のため、食数で入力してください。" };
  }
  const value = {} as Nutrients;
  for (const k of NUTRIENT_KEYS) {
    const v = food[k];
    value[k] = v == null ? null : v * factor;
  }
  return { ok: true, value };
}

export type NutrientTotals = {
  energyKcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  /** いずれかの栄養値が不明な記録の件数 */
  unknownCount: number;
  entryCount: number;
};

export function sumNutrients(entries: Nutrients[]): NutrientTotals {
  const t: NutrientTotals = { energyKcal: 0, proteinG: 0, fatG: 0, carbsG: 0, unknownCount: 0, entryCount: entries.length };
  for (const e of entries) {
    let unknown = false;
    for (const k of NUTRIENT_KEYS) {
      const v = e[k];
      if (v == null) unknown = true;
      else t[k] += v;
    }
    if (unknown) t.unknownCount += 1;
  }
  return t;
}

/**
 * レシピ（材料の合計）から1人前あたりの栄養値を算出する。
 * いずれかの材料で不明な項目は、レシピでも不明(null)とする。
 */
export function recipePerServing(items: Nutrients[], servings: number): Nutrients {
  const result: Nutrients = { energyKcal: 0, proteinG: 0, fatG: 0, carbsG: 0 };
  for (const k of NUTRIENT_KEYS) {
    let sum: number | null = 0;
    for (const it of items) {
      const v = it[k];
      if (v == null || sum == null) sum = null;
      else sum += v;
    }
    result[k] = sum == null || servings <= 0 ? null : sum / servings;
  }
  return result;
}
