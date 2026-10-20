import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// enum
// ---------------------------------------------------------------------------

export const sexEnum = pgEnum("sex", ["male", "female", "unspecified"]);
export const intensityEnum = pgEnum("intensity", ["low", "moderate", "high"]);
export const activityEnum = pgEnum("activity_level", ["low", "normal", "high"]);
export const strengthExperienceEnum = pgEnum("strength_experience", ["none", "lt1y", "1to3y", "gt3y"]);
export const mealTypeEnum = pgEnum("meal_type", ["breakfast", "lunch", "dinner", "snack"]);
export const basisEnum = pgEnum("nutrition_basis", ["per100g", "perServing"]);
export const amountUnitEnum = pgEnum("amount_unit", ["g", "serving"]);
export const foodCategoryEnum = pgEnum("food_category", [
  "ingredient",
  "prepared",
  "eating_out",
  "supplement",
  "recipe",
  "other",
]);
/** 栄養値の出所。user_label=栄養成分表示から転記、user_estimate=本人の推定、mext=日本食品標準成分表、recipe=材料からの計算 */
export const foodSourceEnum = pgEnum("food_source", ["user_label", "user_estimate", "mext", "recipe"]);
export const bodyPartEnum = pgEnum("body_part", ["lower", "upper", "core", "full"]);
export const splitEnum = pgEnum("split", ["upper", "lower", "full", "other"]);
export const sideEnum = pgEnum("side", ["both", "left", "right"]);
export const jumpKindEnum = pgEnum("jump_kind", [
  "standing_reach",
  "spike_reach",
  "block_reach",
  "approach_jump",
  "vertical_jump",
  "standing_broad_jump",
]);
export const measurementTypeEnum = pgEnum("measurement_type", ["measured", "self_reported", "estimated"]);
export const footwearEnum = pgEnum("footwear", ["shoes", "barefoot", "unknown"]);
export const bodyFatMethodEnum = pgEnum("body_fat_method", ["bia_scale", "caliper", "dxa", "other"]);

// ---------------------------------------------------------------------------
// 認証
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  failedLoginCount: integer("failed_login_count").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** セッショントークンはハッシュ値のみを保存する */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// プロフィール
// ---------------------------------------------------------------------------

export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  birthDate: date("birth_date"),
  ageYears: smallint("age_years"),
  ageRecordedOn: date("age_recorded_on"),
  sex: sexEnum("sex"),
  heightCm: doublePrecision("height_cm"),
  experienceYears: doublePrecision("experience_years"),
  position: text("position"),
  dominantHand: text("dominant_hand"),
  practicePerWeek: smallint("practice_per_week"),
  practiceMinutes: smallint("practice_minutes"),
  practiceIntensity: intensityEnum("practice_intensity"),
  /** 練習する曜日（0=日〜6=土） */
  practiceDays: smallint("practice_days").array(),
  maxJumpsPerSession: smallint("max_jumps_per_session"),
  strengthPerWeek: smallint("strength_per_week"),
  strengthMinutes: smallint("strength_minutes"),
  strengthDays: smallint("strength_days").array(),
  strengthExperience: strengthExperienceEnum("strength_experience"),
  dailyActivity: activityEnum("daily_activity"),
  usualSleepHours: doublePrecision("usual_sleep_hours"),
  goals: text("goals").array().notNull().default(sql`'{}'::text[]`),
  primaryGoal: text("primary_goal"),
  otherGoal: text("other_goal"),
  energyAdjustKcal: integer("energy_adjust_kcal").notNull().default(0),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// 身体測定・ジャンプ測定
// ---------------------------------------------------------------------------

export const bodyMeasurements = pgTable(
  "body_measurements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    weightKg: doublePrecision("weight_kg"),
    bodyFatPct: doublePrecision("body_fat_pct"),
    bodyFatMethod: bodyFatMethodEnum("body_fat_method"),
    waistCm: doublePrecision("waist_cm"),
    neckCm: doublePrecision("neck_cm"),
    chestCm: doublePrecision("chest_cm"),
    hipCm: doublePrecision("hip_cm"),
    thighCm: doublePrecision("thigh_cm"),
    calfCm: doublePrecision("calf_cm"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("body_user_date_idx").on(t.userId, t.date)],
);

export const jumpMeasurements = pgTable(
  "jump_measurements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    kind: jumpKindEnum("kind").notNull(),
    valueCm: doublePrecision("value_cm").notNull(),
    measurementType: measurementTypeEnum("measurement_type").notNull(),
    footwear: footwearEnum("footwear").notNull().default("unknown"),
    method: text("method"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("jump_user_date_idx").on(t.userId, t.date)],
);

// ---------------------------------------------------------------------------
// 食事
// ---------------------------------------------------------------------------

/** ownerUserId が null の食品は全ユーザーが参照できる共通データ（成分表の取込など） */
export const foods = pgTable(
  "foods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    brand: text("brand"),
    category: foodCategoryEnum("category").notNull().default("other"),
    basis: basisEnum("basis").notNull(),
    servingG: doublePrecision("serving_g"),
    servingLabel: text("serving_label"),
    energyKcal: doublePrecision("energy_kcal"),
    proteinG: doublePrecision("protein_g"),
    fatG: doublePrecision("fat_g"),
    carbsG: doublePrecision("carbs_g"),
    source: foodSourceEnum("source").notNull(),
    sourceRef: text("source_ref"),
    /** レシピの場合の何人前か */
    recipeServings: doublePrecision("recipe_servings"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("foods_owner_idx").on(t.ownerUserId),
    uniqueIndex("foods_public_ref_idx")
      .on(t.source, t.sourceRef)
      .where(sql`${t.ownerUserId} is null`),
  ],
);

export const recipeItems = pgTable("recipe_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeFoodId: uuid("recipe_food_id")
    .notNull()
    .references(() => foods.id, { onDelete: "cascade" }),
  foodId: uuid("food_id")
    .notNull()
    .references(() => foods.id, { onDelete: "cascade" }),
  amount: doublePrecision("amount").notNull(),
  unit: amountUnitEnum("unit").notNull(),
});

export const favoriteFoods = pgTable(
  "favorite_foods",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    foodId: uuid("food_id")
      .notNull()
      .references(() => foods.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.foodId] })],
);

/** 食事記録。後から食品データが変わっても過去の記録が変わらないよう、栄養値を記録時点で保存する */
export const mealEntries = pgTable(
  "meal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    meal: mealTypeEnum("meal").notNull(),
    foodId: uuid("food_id").references(() => foods.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    amount: doublePrecision("amount").notNull(),
    unit: amountUnitEnum("unit").notNull(),
    energyKcal: doublePrecision("energy_kcal"),
    proteinG: doublePrecision("protein_g"),
    fatG: doublePrecision("fat_g"),
    carbsG: doublePrecision("carbs_g"),
    source: foodSourceEnum("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("meal_user_date_idx").on(t.userId, t.date)],
);

/** お気に入りメニュー（複数食品の組み合わせ） */
export const mealSets = pgTable("meal_sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mealSetItems = pgTable("meal_set_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  mealSetId: uuid("meal_set_id")
    .notNull()
    .references(() => mealSets.id, { onDelete: "cascade" }),
  foodId: uuid("food_id")
    .notNull()
    .references(() => foods.id, { onDelete: "cascade" }),
  amount: doublePrecision("amount").notNull(),
  unit: amountUnitEnum("unit").notNull(),
});

// ---------------------------------------------------------------------------
// 筋力トレーニング
// ---------------------------------------------------------------------------

/** userId が null の種目は全ユーザー共通の初期種目 */
export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    bodyPart: bodyPartEnum("body_part").notNull(),
    unilateral: boolean("unilateral").notNull().default(false),
    archived: boolean("archived").notNull().default(false),
  },
  (t) => [index("exercises_user_idx").on(t.userId)],
);

export const workouts = pgTable(
  "workouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    title: text("title"),
    split: splitEnum("split").notNull().default("other"),
    durationMin: smallint("duration_min"),
    sessionRpe: smallint("session_rpe"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("workouts_user_date_idx").on(t.userId, t.date)],
);

export const workoutSets = pgTable(
  "workout_sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    position: smallint("position").notNull(),
    side: sideEnum("side").notNull().default("both"),
    weightKg: doublePrecision("weight_kg").notNull(),
    reps: smallint("reps").notNull(),
    rpe: doublePrecision("rpe"),
    rir: smallint("rir"),
    restSec: smallint("rest_sec"),
  },
  (t) => [index("sets_workout_idx").on(t.workoutId), index("sets_user_exercise_idx").on(t.userId, t.exerciseId)],
);

export const workoutTemplates = pgTable("workout_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  split: splitEnum("split").notNull().default("other"),
  /** [{ exerciseId, sets, reps, weightKg }] */
  items: jsonb("items").$type<TemplateItem[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TemplateItem = { exerciseId: string; sets: number; reps: number; weightKg: number | null; side: "both" | "left" | "right" };

// ---------------------------------------------------------------------------
// バレーボール練習
// ---------------------------------------------------------------------------

export const practiceSessions = pgTable(
  "practice_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    startTime: text("start_time"),
    durationMin: smallint("duration_min").notNull(),
    intensity: intensityEnum("intensity").notNull(),
    rpe: smallint("rpe"),
    jumpCount: smallint("jump_count"),
    spikeCount: smallint("spike_count"),
    performance: smallint("performance"),
    fatigue: smallint("fatigue"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("practice_user_date_idx").on(t.userId, t.date)],
);

// ---------------------------------------------------------------------------
// コンディション
// ---------------------------------------------------------------------------

export type Discomfort = {
  site: "shoulder" | "elbow" | "lower_back" | "knee" | "ankle" | "other";
  side: "left" | "right" | "both" | null;
  /** 1=違和感 2=痛み 3=強い痛み */
  level: 1 | 2 | 3;
  note: string | null;
};

export const conditionLogs = pgTable(
  "condition_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    sleepHours: doublePrecision("sleep_hours"),
    sleepQuality: smallint("sleep_quality"),
    fatigue: smallint("fatigue"),
    soreness: smallint("soreness"),
    feeling: smallint("feeling"),
    isRestDay: boolean("is_rest_day").notNull().default(false),
    discomforts: jsonb("discomforts").$type<Discomfort[]>().notNull().default([]),
    note: text("note"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("condition_user_date_idx").on(t.userId, t.date),
    check("condition_scale_check", sql`coalesce(${t.fatigue}, 1) between 1 and 5 and coalesce(${t.soreness}, 1) between 1 and 5`),
  ],
);
