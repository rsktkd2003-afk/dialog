import { describe, expect, it } from "vitest";
import { nutrientsForAmount, recipePerServing, sumNutrients, type FoodNutrition } from "./nutrition";

const rice: FoodNutrition = { basis: "per100g", servingG: 150, energyKcal: 156, proteinG: 2.5, fatG: 0.3, carbsG: 37.1 };
const bento: FoodNutrition = { basis: "perServing", servingG: null, energyKcal: 650, proteinG: 25, fatG: null, carbsG: 90 };

describe("nutrientsForAmount", () => {
  it("100gあたり × グラム", () => {
    const r = nutrientsForAmount(rice, 200, "g");
    expect(r.ok && r.value.energyKcal).toBeCloseTo(312);
  });
  it("100gあたり × 食数（1食の重さあり）", () => {
    const r = nutrientsForAmount(rice, 1, "serving");
    expect(r.ok && r.value.energyKcal).toBeCloseTo(234);
  });
  it("1食あたり × 食数。不明値は null のまま", () => {
    const r = nutrientsForAmount(bento, 0.5, "serving");
    expect(r.ok && r.value).toEqual({ energyKcal: 325, proteinG: 12.5, fatG: null, carbsG: 45 });
  });
  it("1食の重さがない食品をグラム指定するとエラー", () => {
    expect(nutrientsForAmount(bento, 100, "g").ok).toBe(false);
  });
  it("0以下・非数はエラー", () => {
    expect(nutrientsForAmount(rice, 0, "g").ok).toBe(false);
    expect(nutrientsForAmount(rice, Number.NaN, "g").ok).toBe(false);
  });
});

describe("sumNutrients", () => {
  it("不明値を0として合計しつつ件数を数える", () => {
    const t = sumNutrients([
      { energyKcal: 100, proteinG: 10, fatG: 1, carbsG: 10 },
      { energyKcal: 200, proteinG: null, fatG: 2, carbsG: 20 },
    ]);
    expect(t).toEqual({ energyKcal: 300, proteinG: 10, fatG: 3, carbsG: 30, unknownCount: 1, entryCount: 2 });
  });
});

describe("recipePerServing", () => {
  it("材料に不明値があればその項目は不明", () => {
    const r = recipePerServing(
      [
        { energyKcal: 400, proteinG: 20, fatG: 10, carbsG: 50 },
        { energyKcal: 200, proteinG: 10, fatG: null, carbsG: 10 },
      ],
      2,
    );
    expect(r).toEqual({ energyKcal: 300, proteinG: 15, fatG: null, carbsG: 30 });
  });
});
