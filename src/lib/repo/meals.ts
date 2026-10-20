import { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import { nutrientsForAmount, recipePerServing, type FoodNutrition, type Nutrients } from "../calc/nutrition";
import { favoriteFoods, foods, mealEntries, mealSetItems, mealSets, recipeItems } from "../db/schema";
import type { Db } from "../db/types";
import { LIMITS, dateString, optionalNumber, optionalText, requiredNumber } from "../validation";

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];
export const MEAL_LABELS: Record<MealType, string> = { breakfast: "朝食", lunch: "昼食", dinner: "夕食", snack: "間食" };

export const FOOD_CATEGORIES = ["ingredient", "prepared", "eating_out", "supplement", "recipe", "other"] as const;
export const FOOD_CATEGORY_LABELS: Record<(typeof FOOD_CATEGORIES)[number], string> = {
  ingredient: "食材",
  prepared: "お惣菜・市販品",
  eating_out: "外食",
  supplement: "プロテイン・補助食品",
  recipe: "自炊レシピ",
  other: "その他",
};

export const FOOD_SOURCE_LABELS = {
  user_label: "栄養成分表示から登録",
  user_estimate: "本人による推定値",
  mext: "日本食品標準成分表",
  recipe: "材料から計算",
} as const;

const nutrient = (label: string, max: number) => optionalNumber(0, max, label);

export const foodInput = z
  .object({
    name: z.string().trim().min(1, "食品名を入力してください").max(100),
    brand: optionalText(100),
    category: z.enum(["ingredient", "prepared", "eating_out", "supplement", "other"]),
    basis: z.enum(["per100g", "perServing"]),
    servingG: optionalNumber(LIMITS.servingG[0], LIMITS.servingG[1], "1食の重さ"),
    servingLabel: optionalText(40),
    energyKcal: nutrient("エネルギー", LIMITS.energyKcal[1]),
    proteinG: nutrient("たんぱく質", LIMITS.macroG[1]),
    fatG: nutrient("脂質", LIMITS.macroG[1]),
    carbsG: nutrient("炭水化物", LIMITS.macroG[1]),
    source: z.enum(["user_label", "user_estimate"]),
  })
  .refine((v) => v.basis !== "per100g" || v.energyKcal == null || v.energyKcal <= 900, {
    message: "100gあたりのエネルギーは900kcal以下で入力してください",
    path: ["energyKcal"],
  })
  .refine((v) => v.basis !== "per100g" || [v.proteinG, v.fatG, v.carbsG].every((x) => x == null || x <= 100), {
    message: "100gあたりの栄養素は100g以下で入力してください",
    path: ["proteinG"],
  });
export type FoodInput = z.infer<typeof foodInput>;

export const mealEntryInput = z.object({
  date: dateString,
  meal: z.enum(MEAL_TYPES),
  foodId: z.string().uuid(),
  amount: requiredNumber(LIMITS.amount[0], LIMITS.amount[1], "分量"),
  unit: z.enum(["g", "serving"]),
});
export type MealEntryInput = z.infer<typeof mealEntryInput>;

/** 食品を登録せずに記録する（外食などで栄養値が不明な場合は空欄のまま記録できる） */
export const quickEntryInput = z.object({
  date: dateString,
  meal: z.enum(MEAL_TYPES),
  name: z.string().trim().min(1, "名前を入力してください").max(100),
  energyKcal: nutrient("エネルギー", LIMITS.energyKcal[1]),
  proteinG: nutrient("たんぱく質", LIMITS.macroG[1]),
  fatG: nutrient("脂質", LIMITS.macroG[1]),
  carbsG: nutrient("炭水化物", LIMITS.macroG[1]),
});
export type QuickEntryInput = z.infer<typeof quickEntryInput>;

export const recipeInput = z.object({
  name: z.string().trim().min(1, "レシピ名を入力してください").max(100),
  servings: requiredNumber(0.5, 50, "何人前"),
  items: z
    .array(
      z.object({
        foodId: z.string().uuid(),
        amount: requiredNumber(LIMITS.amount[0], LIMITS.amount[1], "分量"),
        unit: z.enum(["g", "serving"]),
      }),
    )
    .min(1, "材料を1つ以上追加してください")
    .max(50),
});
export type RecipeInput = z.infer<typeof recipeInput>;

export type Food = typeof foods.$inferSelect;
export type MealEntry = typeof mealEntries.$inferSelect;

export class DomainError extends Error {}

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => "\\" + m);
}

/** 本人の食品または共通食品のみ参照できる */
const accessible = (userId: string) => or(eq(foods.ownerUserId, userId), isNull(foods.ownerUserId));

export async function getAccessibleFood(db: Db, userId: string, foodId: string): Promise<Food | null> {
  const [row] = await db
    .select()
    .from(foods)
    .where(and(eq(foods.id, foodId), accessible(userId)))
    .limit(1);
  return row ?? null;
}

export type FoodListItem = Food & { isFavorite: boolean };

export async function searchFoods(db: Db, userId: string, query: string, limit = 30): Promise<FoodListItem[]> {
  const q = query.trim();
  const conds = [accessible(userId), eq(foods.archived, false)];
  if (q) conds.push(ilike(foods.name, `%${escapeLike(q)}%`));
  const rows = await db
    .select({ food: foods, favUser: favoriteFoods.userId })
    .from(foods)
    .leftJoin(favoriteFoods, and(eq(favoriteFoods.foodId, foods.id), eq(favoriteFoods.userId, userId)))
    .where(and(...conds))
    .orderBy(sql`${foods.ownerUserId} is null`, asc(foods.name))
    .limit(limit);
  return rows.map((r) => ({ ...r.food, isFavorite: r.favUser != null }));
}

export async function listFavoriteFoods(db: Db, userId: string): Promise<Food[]> {
  const rows = await db
    .select({ food: foods })
    .from(favoriteFoods)
    .innerJoin(foods, eq(foods.id, favoriteFoods.foodId))
    .where(and(eq(favoriteFoods.userId, userId), accessible(userId), eq(foods.archived, false)))
    .orderBy(desc(favoriteFoods.createdAt));
  return rows.map((r) => r.food);
}

/** よく食べる食品（直近の記録回数順） */
export async function listFrequentFoods(db: Db, userId: string, since: string, limit = 8): Promise<Food[]> {
  const freq = await db
    .select({ foodId: mealEntries.foodId, n: count() })
    .from(mealEntries)
    .where(and(eq(mealEntries.userId, userId), isNotNull(mealEntries.foodId), gte(mealEntries.date, since)))
    .groupBy(mealEntries.foodId)
    .orderBy(desc(count()))
    .limit(limit);
  const ids = freq.map((f) => f.foodId).filter((x): x is string => x != null);
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(foods)
    .where(and(inArray(foods.id, ids), accessible(userId), eq(foods.archived, false)));
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((x): x is Food => x != null);
}

export async function createFood(db: Db, userId: string, input: FoodInput): Promise<Food> {
  const [row] = await db
    .insert(foods)
    .values({ ...input, ownerUserId: userId })
    .returning();
  return row!;
}

export async function updateFood(db: Db, userId: string, foodId: string, input: FoodInput): Promise<boolean> {
  const rows = await db
    .update(foods)
    .set(input)
    .where(and(eq(foods.id, foodId), eq(foods.ownerUserId, userId), sql`${foods.category} <> 'recipe'`))
    .returning({ id: foods.id });
  return rows.length > 0;
}

/** 過去の記録に影響しないよう、削除ではなく非表示にする */
export async function archiveFood(db: Db, userId: string, foodId: string): Promise<boolean> {
  const rows = await db
    .update(foods)
    .set({ archived: true })
    .where(and(eq(foods.id, foodId), eq(foods.ownerUserId, userId)))
    .returning({ id: foods.id });
  return rows.length > 0;
}

export async function setFavorite(db: Db, userId: string, foodId: string, favorite: boolean): Promise<boolean> {
  if (!(await getAccessibleFood(db, userId, foodId))) return false;
  if (favorite) {
    await db.insert(favoriteFoods).values({ userId, foodId }).onConflictDoNothing();
  } else {
    await db.delete(favoriteFoods).where(and(eq(favoriteFoods.userId, userId), eq(favoriteFoods.foodId, foodId)));
  }
  return true;
}

function toFoodNutrition(f: Food): FoodNutrition {
  return {
    basis: f.basis,
    servingG: f.servingG,
    energyKcal: f.energyKcal,
    proteinG: f.proteinG,
    fatG: f.fatG,
    carbsG: f.carbsG,
  };
}

export async function createRecipe(db: Db, userId: string, input: RecipeInput): Promise<Food> {
  return db.transaction(async (tx) => {
    const ids = [...new Set(input.items.map((i) => i.foodId))];
    const rows = await tx
      .select()
      .from(foods)
      .where(and(inArray(foods.id, ids), accessible(userId)));
    const byId = new Map(rows.map((r) => [r.id, r]));
    const nutrients: Nutrients[] = [];
    let totalG: number | null = 0;
    for (const item of input.items) {
      const food = byId.get(item.foodId);
      if (!food) throw new DomainError("材料の食品が見つかりません。");
      const r = nutrientsForAmount(toFoodNutrition(food), item.amount, item.unit);
      if (!r.ok) throw new DomainError(`${food.name}：${r.reason}`);
      nutrients.push(r.value);
      const grams = item.unit === "g" ? item.amount : food.servingG != null ? food.servingG * item.amount : null;
      totalG = totalG == null || grams == null ? null : totalG + grams;
    }
    const per = recipePerServing(nutrients, input.servings);
    const [recipe] = await tx
      .insert(foods)
      .values({
        ownerUserId: userId,
        name: input.name,
        category: "recipe",
        basis: "perServing",
        servingG: totalG == null ? null : totalG / input.servings,
        servingLabel: "1人前",
        ...per,
        source: "recipe",
        recipeServings: input.servings,
      })
      .returning();
    await tx.insert(recipeItems).values(input.items.map((i) => ({ recipeFoodId: recipe!.id, ...i })));
    return recipe!;
  });
}

export async function addMealEntry(db: Db, userId: string, input: MealEntryInput): Promise<MealEntry> {
  const food = await getAccessibleFood(db, userId, input.foodId);
  if (!food) throw new DomainError("食品が見つかりません。");
  const r = nutrientsForAmount(toFoodNutrition(food), input.amount, input.unit);
  if (!r.ok) throw new DomainError(r.reason);
  const [row] = await db
    .insert(mealEntries)
    .values({
      userId,
      date: input.date,
      meal: input.meal,
      foodId: food.id,
      name: food.brand ? `${food.name}（${food.brand}）` : food.name,
      amount: input.amount,
      unit: input.unit,
      ...r.value,
      source: food.source,
    })
    .returning();
  return row!;
}

export async function addQuickEntry(db: Db, userId: string, input: QuickEntryInput): Promise<MealEntry> {
  const [row] = await db
    .insert(mealEntries)
    .values({ userId, ...input, amount: 1, unit: "serving", foodId: null, source: "user_estimate" })
    .returning();
  return row!;
}

export async function listMealEntries(db: Db, userId: string, date: string): Promise<MealEntry[]> {
  return db
    .select()
    .from(mealEntries)
    .where(and(eq(mealEntries.userId, userId), eq(mealEntries.date, date)))
    .orderBy(asc(mealEntries.createdAt));
}

export async function deleteMealEntry(db: Db, userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(mealEntries)
    .where(and(eq(mealEntries.id, id), eq(mealEntries.userId, userId)))
    .returning({ id: mealEntries.id });
  return rows.length > 0;
}

/** 過去の食事をコピーする。meal を省略すると1日分をそれぞれ同じ区分にコピーする。 */
export async function copyMeal(
  db: Db,
  userId: string,
  from: { date: string; meal?: MealType },
  to: { date: string; meal?: MealType },
): Promise<number> {
  const conds = [eq(mealEntries.userId, userId), eq(mealEntries.date, from.date)];
  if (from.meal) conds.push(eq(mealEntries.meal, from.meal));
  const src = await db.select().from(mealEntries).where(and(...conds)).orderBy(asc(mealEntries.createdAt));
  if (src.length === 0) return 0;
  await db.insert(mealEntries).values(
    src.map((e) => ({
      userId,
      date: to.date,
      meal: to.meal ?? e.meal,
      foodId: e.foodId,
      name: e.name,
      amount: e.amount,
      unit: e.unit,
      energyKcal: e.energyKcal,
      proteinG: e.proteinG,
      fatG: e.fatG,
      carbsG: e.carbsG,
      source: e.source,
    })),
  );
  return src.length;
}

export type DailyNutrition = {
  date: string;
  entryCount: number;
  unknownCount: number;
  energyKcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
};

export async function dailyNutrition(db: Db, userId: string, from: string, to: string): Promise<DailyNutrition[]> {
  const rows = await db
    .select({
      date: mealEntries.date,
      entryCount: sql<number>`count(*)::int`,
      unknownCount: sql<number>`count(*) filter (where ${mealEntries.energyKcal} is null or ${mealEntries.proteinG} is null or ${mealEntries.fatG} is null or ${mealEntries.carbsG} is null)::int`,
      energyKcal: sql<number>`coalesce(sum(${mealEntries.energyKcal}), 0)::float8`,
      proteinG: sql<number>`coalesce(sum(${mealEntries.proteinG}), 0)::float8`,
      fatG: sql<number>`coalesce(sum(${mealEntries.fatG}), 0)::float8`,
      carbsG: sql<number>`coalesce(sum(${mealEntries.carbsG}), 0)::float8`,
    })
    .from(mealEntries)
    .where(and(eq(mealEntries.userId, userId), gte(mealEntries.date, from), lte(mealEntries.date, to)))
    .groupBy(mealEntries.date)
    .orderBy(asc(mealEntries.date));
  return rows.map((r) => ({ ...r, entryCount: Number(r.entryCount), unknownCount: Number(r.unknownCount) }));
}

// --- お気に入りメニュー -------------------------------------------------------

export async function createMealSetFromMeal(
  db: Db,
  userId: string,
  input: { name: string; date: string; meal: MealType },
): Promise<{ id: string; itemCount: number; skipped: number } | null> {
  const entries = await db
    .select()
    .from(mealEntries)
    .where(and(eq(mealEntries.userId, userId), eq(mealEntries.date, input.date), eq(mealEntries.meal, input.meal)));
  const withFood = entries.filter((e) => e.foodId != null);
  if (withFood.length === 0) return null;
  return db.transaction(async (tx) => {
    const [set] = await tx.insert(mealSets).values({ userId, name: input.name }).returning({ id: mealSets.id });
    await tx
      .insert(mealSetItems)
      .values(withFood.map((e) => ({ mealSetId: set!.id, foodId: e.foodId!, amount: e.amount, unit: e.unit })));
    return { id: set!.id, itemCount: withFood.length, skipped: entries.length - withFood.length };
  });
}

export async function listMealSets(db: Db, userId: string) {
  const sets = await db.select().from(mealSets).where(eq(mealSets.userId, userId)).orderBy(desc(mealSets.createdAt));
  if (sets.length === 0) return [];
  const items = await db
    .select({ mealSetId: mealSetItems.mealSetId, name: foods.name, amount: mealSetItems.amount, unit: mealSetItems.unit })
    .from(mealSetItems)
    .innerJoin(foods, eq(foods.id, mealSetItems.foodId))
    .where(inArray(mealSetItems.mealSetId, sets.map((s) => s.id)));
  return sets.map((s) => ({ ...s, items: items.filter((i) => i.mealSetId === s.id) }));
}

export async function applyMealSet(db: Db, userId: string, setId: string, date: string, meal: MealType): Promise<number> {
  const [set] = await db
    .select()
    .from(mealSets)
    .where(and(eq(mealSets.id, setId), eq(mealSets.userId, userId)))
    .limit(1);
  if (!set) throw new DomainError("メニューが見つかりません。");
  const items = await db.select().from(mealSetItems).where(eq(mealSetItems.mealSetId, set.id));
  let n = 0;
  await db.transaction(async (tx) => {
    for (const it of items) {
      await addMealEntry(tx, userId, { date, meal, foodId: it.foodId, amount: it.amount, unit: it.unit });
      n += 1;
    }
  });
  return n;
}

export async function deleteMealSet(db: Db, userId: string, setId: string): Promise<boolean> {
  const rows = await db
    .delete(mealSets)
    .where(and(eq(mealSets.id, setId), eq(mealSets.userId, userId)))
    .returning({ id: mealSets.id });
  return rows.length > 0;
}
