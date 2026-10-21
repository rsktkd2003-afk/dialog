import { eq, inArray } from "drizzle-orm";
import {
  bodyMeasurements,
  conditionLogs,
  exercises,
  favoriteFoods,
  foods,
  jumpMeasurements,
  mealEntries,
  mealSetItems,
  mealSets,
  practiceSessions,
  profiles,
  recipeItems,
  symptomLogs,
  users,
  workoutSets,
  workoutTemplates,
  workouts,
} from "../db/schema";
import type { Db } from "../db/types";

/** 本人のデータをすべて書き出す（パスワードハッシュ・セッションは含めない） */
export async function exportUserData(db: Db, userId: string) {
  const [user] = await db
    .select({ id: users.id, email: users.email, displayName: users.displayName, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId));
  const ownFoods = await db.select().from(foods).where(eq(foods.ownerUserId, userId));
  const ownSets = await db.select().from(mealSets).where(eq(mealSets.userId, userId));
  const foodIds = ownFoods.map((f) => f.id);
  const setIds = ownSets.map((s) => s.id);
  return {
    exportedAt: new Date().toISOString(),
    format: "volley-conditioning-export/v1",
    user,
    profile: (await db.select().from(profiles).where(eq(profiles.userId, userId)))[0] ?? null,
    bodyMeasurements: await db.select().from(bodyMeasurements).where(eq(bodyMeasurements.userId, userId)),
    jumpMeasurements: await db.select().from(jumpMeasurements).where(eq(jumpMeasurements.userId, userId)),
    foods: ownFoods,
    recipeItems: foodIds.length ? await db.select().from(recipeItems).where(inArray(recipeItems.recipeFoodId, foodIds)) : [],
    favoriteFoods: await db.select().from(favoriteFoods).where(eq(favoriteFoods.userId, userId)),
    mealEntries: await db.select().from(mealEntries).where(eq(mealEntries.userId, userId)),
    mealSets: ownSets,
    mealSetItems: setIds.length ? await db.select().from(mealSetItems).where(inArray(mealSetItems.mealSetId, setIds)) : [],
    exercises: await db.select().from(exercises).where(eq(exercises.userId, userId)),
    workouts: await db.select().from(workouts).where(eq(workouts.userId, userId)),
    workoutSets: await db.select().from(workoutSets).where(eq(workoutSets.userId, userId)),
    workoutTemplates: await db.select().from(workoutTemplates).where(eq(workoutTemplates.userId, userId)),
    practiceSessions: await db.select().from(practiceSessions).where(eq(practiceSessions.userId, userId)),
    conditionLogs: await db.select().from(conditionLogs).where(eq(conditionLogs.userId, userId)),
    symptomLogs: await db.select().from(symptomLogs).where(eq(symptomLogs.userId, userId)),
  };
}
