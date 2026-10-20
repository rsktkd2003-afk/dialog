"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/form";
import { requireUser } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import {
  DomainError,
  MEAL_TYPES,
  addMealEntry,
  addQuickEntry,
  applyMealSet,
  archiveFood,
  copyMeal,
  createFood,
  createMealSetFromMeal,
  createRecipe,
  deleteMealEntry,
  deleteMealSet,
  foodInput,
  mealEntryInput,
  quickEntryInput,
  recipeInput,
  setFavorite,
} from "@/lib/repo/meals";
import { dateString, toFieldErrors } from "@/lib/validation";

function fail(e: unknown): ActionState {
  if (e instanceof DomainError) return { ok: false, message: e.message };
  throw e;
}

export async function addEntryAction(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = mealEntryInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  try {
    const e = await addMealEntry(getDb(), user.id, parsed.data);
    revalidatePath("/meals");
    return { ok: true, message: `「${e.name}」を記録しました` };
  } catch (e) {
    return fail(e);
  }
}

export async function addQuickEntryAction(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = quickEntryInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  await addQuickEntry(getDb(), user.id, parsed.data);
  revalidatePath("/meals");
  return { ok: true, message: `「${parsed.data.name}」を記録しました` };
}

export async function deleteEntryAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = z.string().uuid().safeParse(form.get("id"));
  if (id.success) await deleteMealEntry(getDb(), user.id, id.data);
  revalidatePath("/meals");
}

const copySchema = z.object({
  fromDate: dateString,
  toDate: dateString,
  meal: z.preprocess((v) => (v === "" ? undefined : v), z.enum(MEAL_TYPES).optional()),
});

export async function copyMealAction(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = copySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "コピー元の指定が正しくありません" };
  const { fromDate, toDate, meal } = parsed.data;
  const n = await copyMeal(getDb(), user.id, { date: fromDate, meal }, { date: toDate, meal });
  revalidatePath("/meals");
  return n === 0 ? { ok: false, message: "コピーできる記録がありませんでした" } : { ok: true, message: `${n}件をコピーしました` };
}

const saveSetSchema = z.object({
  name: z.string().trim().min(1, "メニュー名を入力してください").max(40),
  date: dateString,
  meal: z.enum(MEAL_TYPES),
});

export async function saveMealSetAction(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = saveSetSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  const r = await createMealSetFromMeal(getDb(), user.id, parsed.data);
  if (!r) return { ok: false, message: "登録済みの食品から記録した食事がないため、メニューを保存できません" };
  revalidatePath("/meals");
  return {
    ok: true,
    message: `メニュー「${parsed.data.name}」を保存しました${r.skipped > 0 ? `（食品登録のない${r.skipped}件は除外）` : ""}`,
  };
}

const applySetSchema = z.object({ setId: z.string().uuid(), date: dateString, meal: z.enum(MEAL_TYPES) });

export async function applyMealSetAction(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = applySetSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "指定が正しくありません" };
  try {
    const n = await applyMealSet(getDb(), user.id, parsed.data.setId, parsed.data.date, parsed.data.meal);
    revalidatePath("/meals");
    return { ok: true, message: `${n}品を記録しました` };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteMealSetAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = z.string().uuid().safeParse(form.get("id"));
  if (id.success) await deleteMealSet(getDb(), user.id, id.data);
  revalidatePath("/meals");
}

export async function toggleFavoriteAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = z.string().uuid().safeParse(form.get("foodId"));
  if (id.success) await setFavorite(getDb(), user.id, id.data, form.get("favorite") === "1");
  revalidatePath("/meals/add");
  revalidatePath("/foods");
}

function safeReturn(v: FormDataEntryValue | null): string {
  return typeof v === "string" && /^\/meals\/add\?[\w=&%-]*$/.test(v) ? v : "/foods";
}

export async function createFoodAction(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = foodInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  const food = await createFood(getDb(), user.id, parsed.data);
  revalidatePath("/foods");
  const ret = safeReturn(form.get("returnTo"));
  redirect(ret === "/foods" ? ret : `${ret}&q=${encodeURIComponent(food.name)}`);
}

export async function archiveFoodAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const id = z.string().uuid().safeParse(form.get("foodId"));
  if (id.success) await archiveFood(getDb(), user.id, id.data);
  revalidatePath("/foods");
}

export async function createRecipeAction(_p: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const ids = form.getAll("itemFoodId");
  const amounts = form.getAll("itemAmount");
  const units = form.getAll("itemUnit");
  const items = ids.map((foodId, i) => ({ foodId, amount: amounts[i], unit: units[i] })).filter((it) => it.amount !== "");
  const parsed = recipeInput.safeParse({ name: form.get("name"), servings: form.get("servings"), items });
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  try {
    await createRecipe(getDb(), user.id, parsed.data);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/foods");
  redirect("/foods");
}
