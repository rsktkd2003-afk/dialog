import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../src/lib/db/types";
import { foods } from "../src/lib/db/schema";
import {
  addMealEntry,
  addQuickEntry,
  applyMealSet,
  copyMeal,
  createFood,
  createMealSetFromMeal,
  createRecipe,
  dailyNutrition,
  listFrequentFoods,
  listMealEntries,
  searchFoods,
  setFavorite,
  listFavoriteFoods,
  updateFood,
  foodInput,
} from "../src/lib/repo/meals";
import { createTestDb, createTestUser } from "./helpers/db";

let db: Db;
let close: () => Promise<void>;
let uid: string;

const base = {
  brand: null, category: "ingredient" as const, servingLabel: null, source: "user_label" as const,
};

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  uid = (await createTestUser(db, "meal")).id;
});
afterAll(async () => close());

describe("食事記録", () => {
  it("記録時点の栄養値を保存し、後から食品を編集しても過去の記録は変わらない", async () => {
    const f = await createFood(db, uid, { ...base, name: "鶏むね肉", basis: "per100g", servingG: null, energyKcal: 105, proteinG: 23, fatG: 1.5, carbsG: 0 });
    const e = await addMealEntry(db, uid, { date: "2026-10-10", meal: "dinner", foodId: f.id, amount: 150, unit: "g" });
    expect(e.energyKcal).toBeCloseTo(157.5);
    expect(e.proteinG).toBeCloseTo(34.5);
    await updateFood(db, uid, f.id, { ...base, name: "鶏むね肉", basis: "per100g", servingG: null, energyKcal: 999, proteinG: 1, fatG: 1, carbsG: 1 });
    const [after] = await listMealEntries(db, uid, "2026-10-10");
    expect(after!.energyKcal).toBeCloseTo(157.5);
  });

  it("栄養不明の記録は不明として集計する", async () => {
    await addQuickEntry(db, uid, { date: "2026-10-10", meal: "lunch", name: "外食（内容不明）", energyKcal: null, proteinG: null, fatG: null, carbsG: null });
    const [day] = await dailyNutrition(db, uid, "2026-10-10", "2026-10-10");
    expect(day!.entryCount).toBe(2);
    expect(day!.unknownCount).toBe(1);
    expect(day!.energyKcal).toBeCloseTo(157.5);
  });

  it("1食の重さがない1食あたり食品をグラム指定すると拒否", async () => {
    const f = await createFood(db, uid, { ...base, name: "弁当", category: "prepared", basis: "perServing", servingG: null, energyKcal: 700, proteinG: 25, fatG: 20, carbsG: 100 });
    await expect(addMealEntry(db, uid, { date: "2026-10-10", meal: "lunch", foodId: f.id, amount: 300, unit: "g" })).rejects.toThrow();
  });

  it("過去の食事をコピー", async () => {
    const n = await copyMeal(db, uid, { date: "2026-10-10", meal: "dinner" }, { date: "2026-10-11", meal: "lunch" });
    expect(n).toBe(1);
    const entries = await listMealEntries(db, uid, "2026-10-11");
    expect(entries[0]!.meal).toBe("lunch");
  });

  it("お気に入りメニューは食品のある記録のみ保存し、適用時に再計算", async () => {
    const set = await createMealSetFromMeal(db, uid, { name: "定番", date: "2026-10-10", meal: "dinner" });
    expect(set).toEqual({ id: expect.any(String), itemCount: 1, skipped: 0 });
    const lunchSet = await createMealSetFromMeal(db, uid, { name: "昼", date: "2026-10-10", meal: "lunch" });
    expect(lunchSet).toBeNull();
    expect(await applyMealSet(db, uid, set!.id, "2026-10-12", "breakfast")).toBe(1);
  });

  it("レシピは材料から1人前を計算し、不明な材料があればその項目は不明", async () => {
    const rice = await createFood(db, uid, { ...base, name: "ごはん", basis: "per100g", servingG: 150, energyKcal: 156, proteinG: 2.5, fatG: 0.3, carbsG: 37.1 });
    const sauce = await createFood(db, uid, { ...base, name: "たれ", basis: "perServing", servingG: 20, energyKcal: 40, proteinG: null, fatG: 0, carbsG: 8 });
    const r = await createRecipe(db, uid, {
      name: "どんぶり", servings: 2,
      items: [{ foodId: rice.id, amount: 400, unit: "g" }, { foodId: sauce.id, amount: 2, unit: "serving" }],
    });
    expect(r.energyKcal).toBeCloseTo((624 + 80) / 2);
    expect(r.proteinG).toBeNull();
    expect(r.servingG).toBeCloseTo(220);
    expect(r.source).toBe("recipe");
  });

  it("検索は LIKE の特殊文字をエスケープ", async () => {
    await createFood(db, uid, { ...base, name: "100%果汁", basis: "per100g", servingG: null, energyKcal: 40, proteinG: 0.5, fatG: 0, carbsG: 10 });
    expect((await searchFoods(db, uid, "%")).map((f) => f.name)).toEqual(["100%果汁"]);
    expect(await searchFoods(db, uid, "_")).toHaveLength(0);
  });

  it("共通食品は全員が検索でき、お気に入り登録できる", async () => {
    const [pub] = await db.insert(foods).values({ name: "共通テスト食品", basis: "per100g", energyKcal: 100, proteinG: 1, fatG: 1, carbsG: 1, source: "mext", sourceRef: "T-1" }).returning();
    expect((await searchFoods(db, uid, "共通テスト")).length).toBe(1);
    expect(await setFavorite(db, uid, pub!.id, true)).toBe(true);
    expect((await listFavoriteFoods(db, uid)).map((f) => f.id)).toContain(pub!.id);
  });

  it("よく食べる食品", async () => {
    const list = await listFrequentFoods(db, uid, "2026-09-01");
    expect(list[0]!.name).toBe("鶏むね肉");
  });
});

describe("食品入力の境界値", () => {
  const valid = { name: "x", category: "ingredient", basis: "per100g", source: "user_label", energyKcal: "900", proteinG: "100" };
  it("100gあたりの上限", () => {
    expect(foodInput.safeParse(valid).success).toBe(true);
    expect(foodInput.safeParse({ ...valid, energyKcal: "901" }).success).toBe(false);
    expect(foodInput.safeParse({ ...valid, proteinG: "100.1" }).success).toBe(false);
  });
  it("空欄は不明(null)として受け付ける", () => {
    const r = foodInput.safeParse({ ...valid, energyKcal: "", proteinG: "" });
    expect(r.success && r.data.energyKcal).toBeNull();
  });
  it("負の値・文字は拒否", () => {
    expect(foodInput.safeParse({ ...valid, fatG: "-1" }).success).toBe(false);
    expect(foodInput.safeParse({ ...valid, fatG: "abc" }).success).toBe(false);
  });
  it("本人以外の出所(成分表)は登録できない", () => {
    expect(foodInput.safeParse({ ...valid, source: "mext" }).success).toBe(false);
  });
});
