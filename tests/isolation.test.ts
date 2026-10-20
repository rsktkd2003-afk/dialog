import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../src/lib/db/types";
import {
  addBodyMeasurement,
  addJumpMeasurement,
  deleteBodyMeasurement,
  deleteJumpMeasurement,
  listBodyMeasurements,
  listJumpMeasurements,
} from "../src/lib/repo/body";
import { getCondition, listConditions, upsertCondition, deleteCondition } from "../src/lib/repo/condition";
import { exportUserData } from "../src/lib/repo/export";
import {
  addMealEntry,
  applyMealSet,
  archiveFood,
  copyMeal,
  createFood,
  createMealSetFromMeal,
  createRecipe,
  deleteMealEntry,
  deleteMealSet,
  getAccessibleFood,
  listMealEntries,
  searchFoods,
  setFavorite,
  updateFood,
} from "../src/lib/repo/meals";
import { addPractice, deletePractice, listPractices } from "../src/lib/repo/practice";
import { getProfile, upsertProfile } from "../src/lib/repo/profile";
import {
  createExercise,
  createTemplate,
  createTemplateFromWorkout,
  createWorkout,
  deleteTemplate,
  deleteWorkout,
  exerciseHistory,
  getTemplate,
  getWorkout,
  listExercises,
  listWorkouts,
  previousSets,
} from "../src/lib/repo/training";
import { createTestDb, createTestUser } from "./helpers/db";

let db: Db;
let close: () => Promise<void>;
let alice: { id: string };
let bob: { id: string };

const body = {
  date: "2026-10-01", weightKg: 70, bodyFatPct: null, bodyFatMethod: null, waistCm: null, neckCm: null,
  chestCm: null, hipCm: null, thighCm: null, calfCm: null, note: null,
};
const foodBase = {
  name: "アリスの秘密の食品", brand: null, category: "ingredient" as const, basis: "per100g" as const, servingG: 100,
  servingLabel: null, energyKcal: 200, proteinG: 20, fatG: 5, carbsG: 10, source: "user_label" as const,
};

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  alice = await createTestUser(db, "alice");
  bob = await createTestUser(db, "bob");
});
afterAll(async () => close());

describe("ユーザー間のデータ分離", () => {
  it("プロフィール", async () => {
    await upsertProfile(db, alice.id, { heightCm: 180 });
    expect((await getProfile(db, alice.id))?.heightCm).toBe(180);
    expect(await getProfile(db, bob.id)).toBeNull();
  });

  it("身体測定・ジャンプ測定", async () => {
    const m = await addBodyMeasurement(db, alice.id, body);
    expect(await listBodyMeasurements(db, bob.id)).toHaveLength(0);
    expect(await deleteBodyMeasurement(db, bob.id, m.id)).toBe(false);
    expect(await listBodyMeasurements(db, alice.id)).toHaveLength(1);

    const j = await addJumpMeasurement(db, alice.id, {
      date: "2026-10-01", kind: "spike_reach", valueCm: 320, measurementType: "measured", footwear: "shoes", method: null, note: null,
    });
    expect(await listJumpMeasurements(db, bob.id)).toHaveLength(0);
    expect(await deleteJumpMeasurement(db, bob.id, j.id)).toBe(false);
  });

  it("食品：他人の食品は検索・参照・記録・編集・お気に入り・レシピ材料にできない", async () => {
    const f = await createFood(db, alice.id, foodBase);
    expect((await searchFoods(db, bob.id, "秘密")).length).toBe(0);
    expect((await searchFoods(db, alice.id, "秘密")).length).toBe(1);
    expect(await getAccessibleFood(db, bob.id, f.id)).toBeNull();
    await expect(addMealEntry(db, bob.id, { date: "2026-10-01", meal: "lunch", foodId: f.id, amount: 100, unit: "g" })).rejects.toThrow();
    expect(await updateFood(db, bob.id, f.id, { ...foodBase, name: "改ざん" })).toBe(false);
    expect(await archiveFood(db, bob.id, f.id)).toBe(false);
    expect(await setFavorite(db, bob.id, f.id, true)).toBe(false);
    await expect(createRecipe(db, bob.id, { name: "x", servings: 1, items: [{ foodId: f.id, amount: 100, unit: "g" }] })).rejects.toThrow();
  });

  it("食事記録・コピー・メニュー", async () => {
    const f = await createFood(db, alice.id, { ...foodBase, name: "ごはん" });
    const e = await addMealEntry(db, alice.id, { date: "2026-10-02", meal: "dinner", foodId: f.id, amount: 150, unit: "g" });
    expect(await listMealEntries(db, bob.id, "2026-10-02")).toHaveLength(0);
    expect(await deleteMealEntry(db, bob.id, e.id)).toBe(false);
    // 他人の日付をコピー元にしても、自分の記録しか対象にならない
    expect(await copyMeal(db, bob.id, { date: "2026-10-02" }, { date: "2026-10-03" })).toBe(0);
    const set = await createMealSetFromMeal(db, alice.id, { name: "夕食", date: "2026-10-02", meal: "dinner" });
    expect(set).not.toBeNull();
    await expect(applyMealSet(db, bob.id, set!.id, "2026-10-03", "dinner")).rejects.toThrow();
    expect(await deleteMealSet(db, bob.id, set!.id)).toBe(false);
  });

  it("筋トレ：他人の種目・ワークアウト・テンプレートを扱えない", async () => {
    const own = await createExercise(db, alice.id, { name: "アリス専用種目", bodyPart: "lower", unilateral: false });
    expect((await listExercises(db, bob.id)).some((e) => e.id === own.id)).toBe(false);
    const set = { exerciseId: own.id, side: "both" as const, weightKg: 100, reps: 5, rpe: null, rir: null, restSec: null };
    const w = { date: "2026-10-01", title: null, split: "lower" as const, durationMin: 60, sessionRpe: 7, note: null };
    await expect(createWorkout(db, bob.id, { ...w, sets: [set] })).rejects.toThrow();
    const wid = await createWorkout(db, alice.id, { ...w, sets: [set] });
    expect(await getWorkout(db, bob.id, wid)).toBeNull();
    expect(await listWorkouts(db, bob.id)).toHaveLength(0);
    expect(await deleteWorkout(db, bob.id, wid)).toBe(false);
    expect((await previousSets(db, bob.id, [own.id], "2027-01-01")).size).toBe(0);
    expect(await exerciseHistory(db, bob.id, own.id)).toHaveLength(0);
    expect(await createTemplateFromWorkout(db, bob.id, wid, "盗用")).toBeNull();
    await expect(
      createTemplate(db, bob.id, { name: "t", split: "lower", items: [{ exerciseId: own.id, sets: 3, reps: 5, weightKg: 100, side: "both" }] }),
    ).rejects.toThrow();
    const tid = await createTemplateFromWorkout(db, alice.id, wid, "下半身A");
    expect(await getTemplate(db, bob.id, tid!)).toBeNull();
    expect(await deleteTemplate(db, bob.id, tid!)).toBe(false);
    expect(await getWorkout(db, alice.id, wid)).not.toBeNull();
  });

  it("練習・コンディション", async () => {
    const p = await addPractice(db, alice.id, {
      date: "2026-10-01", startTime: null, durationMin: 120, intensity: "high", rpe: 8, jumpCount: null,
      spikeCount: null, performance: 3, fatigue: 4, note: null,
    });
    expect(await listPractices(db, bob.id)).toHaveLength(0);
    expect(await deletePractice(db, bob.id, p.id)).toBe(false);
    const c = await upsertCondition(db, alice.id, {
      date: "2026-10-01", sleepHours: 7, sleepQuality: 3, fatigue: 3, soreness: 2, feeling: 3, isRestDay: false,
      discomforts: [{ site: "knee", side: "left", level: 2, note: null }], note: null,
    });
    expect(await getCondition(db, bob.id, "2026-10-01")).toBeNull();
    expect(await listConditions(db, bob.id)).toHaveLength(0);
    expect(await deleteCondition(db, bob.id, c.id)).toBe(false);
  });

  it("エクスポートには本人のデータのみ含まれ、パスワードハッシュを含まない", async () => {
    const a = await exportUserData(db, alice.id);
    const b = await exportUserData(db, bob.id);
    expect(a.bodyMeasurements.length).toBeGreaterThan(0);
    expect(b.bodyMeasurements).toHaveLength(0);
    expect(b.foods).toHaveLength(0);
    expect(b.mealEntries).toHaveLength(0);
    expect(JSON.stringify(a)).not.toContain("scrypt$");
    expect(JSON.stringify(b)).not.toContain(alice.id);
  });
});
