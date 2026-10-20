CREATE TYPE "public"."activity_level" AS ENUM('low', 'normal', 'high');--> statement-breakpoint
CREATE TYPE "public"."amount_unit" AS ENUM('g', 'serving');--> statement-breakpoint
CREATE TYPE "public"."nutrition_basis" AS ENUM('per100g', 'perServing');--> statement-breakpoint
CREATE TYPE "public"."body_fat_method" AS ENUM('bia_scale', 'caliper', 'dxa', 'other');--> statement-breakpoint
CREATE TYPE "public"."body_part" AS ENUM('lower', 'upper', 'core', 'full');--> statement-breakpoint
CREATE TYPE "public"."food_category" AS ENUM('ingredient', 'prepared', 'eating_out', 'supplement', 'recipe', 'other');--> statement-breakpoint
CREATE TYPE "public"."food_source" AS ENUM('user_label', 'user_estimate', 'mext', 'recipe');--> statement-breakpoint
CREATE TYPE "public"."footwear" AS ENUM('shoes', 'barefoot', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."intensity" AS ENUM('low', 'moderate', 'high');--> statement-breakpoint
CREATE TYPE "public"."jump_kind" AS ENUM('standing_reach', 'spike_reach', 'block_reach', 'approach_jump', 'vertical_jump', 'standing_broad_jump');--> statement-breakpoint
CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');--> statement-breakpoint
CREATE TYPE "public"."measurement_type" AS ENUM('measured', 'self_reported', 'estimated');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('male', 'female', 'unspecified');--> statement-breakpoint
CREATE TYPE "public"."side" AS ENUM('both', 'left', 'right');--> statement-breakpoint
CREATE TYPE "public"."split" AS ENUM('upper', 'lower', 'full', 'other');--> statement-breakpoint
CREATE TYPE "public"."strength_experience" AS ENUM('none', 'lt1y', '1to3y', 'gt3y');--> statement-breakpoint
CREATE TABLE "body_measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"weight_kg" double precision,
	"body_fat_pct" double precision,
	"body_fat_method" "body_fat_method",
	"waist_cm" double precision,
	"neck_cm" double precision,
	"chest_cm" double precision,
	"hip_cm" double precision,
	"thigh_cm" double precision,
	"calf_cm" double precision,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "condition_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"sleep_hours" double precision,
	"sleep_quality" smallint,
	"fatigue" smallint,
	"soreness" smallint,
	"feeling" smallint,
	"is_rest_day" boolean DEFAULT false NOT NULL,
	"discomforts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "condition_scale_check" CHECK (coalesce("condition_logs"."fatigue", 1) between 1 and 5 and coalesce("condition_logs"."soreness", 1) between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"body_part" "body_part" NOT NULL,
	"unilateral" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorite_foods" (
	"user_id" uuid NOT NULL,
	"food_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorite_foods_user_id_food_id_pk" PRIMARY KEY("user_id","food_id")
);
--> statement-breakpoint
CREATE TABLE "foods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid,
	"name" text NOT NULL,
	"brand" text,
	"category" "food_category" DEFAULT 'other' NOT NULL,
	"basis" "nutrition_basis" NOT NULL,
	"serving_g" double precision,
	"serving_label" text,
	"energy_kcal" double precision,
	"protein_g" double precision,
	"fat_g" double precision,
	"carbs_g" double precision,
	"source" "food_source" NOT NULL,
	"source_ref" text,
	"recipe_servings" double precision,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jump_measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"kind" "jump_kind" NOT NULL,
	"value_cm" double precision NOT NULL,
	"measurement_type" "measurement_type" NOT NULL,
	"footwear" "footwear" DEFAULT 'unknown' NOT NULL,
	"method" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"meal" "meal_type" NOT NULL,
	"food_id" uuid,
	"name" text NOT NULL,
	"amount" double precision NOT NULL,
	"unit" "amount_unit" NOT NULL,
	"energy_kcal" double precision,
	"protein_g" double precision,
	"fat_g" double precision,
	"carbs_g" double precision,
	"source" "food_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_set_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_set_id" uuid NOT NULL,
	"food_id" uuid NOT NULL,
	"amount" double precision NOT NULL,
	"unit" "amount_unit" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"start_time" text,
	"duration_min" smallint NOT NULL,
	"intensity" "intensity" NOT NULL,
	"rpe" smallint,
	"jump_count" smallint,
	"spike_count" smallint,
	"performance" smallint,
	"fatigue" smallint,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"birth_date" date,
	"age_years" smallint,
	"age_recorded_on" date,
	"sex" "sex",
	"height_cm" double precision,
	"experience_years" double precision,
	"position" text,
	"dominant_hand" text,
	"practice_per_week" smallint,
	"practice_minutes" smallint,
	"practice_intensity" "intensity",
	"practice_days" smallint[],
	"max_jumps_per_session" smallint,
	"strength_per_week" smallint,
	"strength_minutes" smallint,
	"strength_days" smallint[],
	"strength_experience" "strength_experience",
	"daily_activity" "activity_level",
	"usual_sleep_hours" double precision,
	"goals" text[] DEFAULT '{}'::text[] NOT NULL,
	"primary_goal" text,
	"other_goal" text,
	"energy_adjust_kcal" integer DEFAULT 0 NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_food_id" uuid NOT NULL,
	"food_id" uuid NOT NULL,
	"amount" double precision NOT NULL,
	"unit" "amount_unit" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"failed_login_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workout_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"side" "side" DEFAULT 'both' NOT NULL,
	"weight_kg" double precision NOT NULL,
	"reps" smallint NOT NULL,
	"rpe" double precision,
	"rir" smallint,
	"rest_sec" smallint
);
--> statement-breakpoint
CREATE TABLE "workout_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"split" "split" DEFAULT 'other' NOT NULL,
	"items" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"title" text,
	"split" "split" DEFAULT 'other' NOT NULL,
	"duration_min" smallint,
	"session_rpe" smallint,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "body_measurements" ADD CONSTRAINT "body_measurements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condition_logs" ADD CONSTRAINT "condition_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_foods" ADD CONSTRAINT "favorite_foods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_foods" ADD CONSTRAINT "favorite_foods_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jump_measurements" ADD CONSTRAINT "jump_measurements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_entries" ADD CONSTRAINT "meal_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_entries" ADD CONSTRAINT "meal_entries_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_set_items" ADD CONSTRAINT "meal_set_items_meal_set_id_meal_sets_id_fk" FOREIGN KEY ("meal_set_id") REFERENCES "public"."meal_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_set_items" ADD CONSTRAINT "meal_set_items_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_sets" ADD CONSTRAINT "meal_sets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_recipe_food_id_foods_id_fk" FOREIGN KEY ("recipe_food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "body_user_date_idx" ON "body_measurements" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "condition_user_date_idx" ON "condition_logs" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "exercises_user_idx" ON "exercises" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "foods_owner_idx" ON "foods" USING btree ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "foods_public_ref_idx" ON "foods" USING btree ("source","source_ref") WHERE "foods"."owner_user_id" is null;--> statement-breakpoint
CREATE INDEX "jump_user_date_idx" ON "jump_measurements" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "meal_user_date_idx" ON "meal_entries" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "practice_user_date_idx" ON "practice_sessions" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sets_workout_idx" ON "workout_sets" USING btree ("workout_id");--> statement-breakpoint
CREATE INDEX "sets_user_exercise_idx" ON "workout_sets" USING btree ("user_id","exercise_id");--> statement-breakpoint
CREATE INDEX "workouts_user_date_idx" ON "workouts" USING btree ("user_id","date");