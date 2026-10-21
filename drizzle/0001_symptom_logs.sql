CREATE TYPE "public"."symptom_impact" AS ENUM('none', 'slight', 'limited', 'unable');--> statement-breakpoint
CREATE TYPE "public"."symptom_kind" AS ENUM('pain', 'discomfort', 'tightness', 'numbness', 'other');--> statement-breakpoint
CREATE TYPE "public"."symptom_side" AS ENUM('right', 'left', 'both', 'center', 'na');--> statement-breakpoint
CREATE TYPE "public"."symptom_site" AS ENUM('ankle', 'knee', 'shoulder', 'lower_back', 'wrist', 'hip', 'calf', 'thigh', 'neck', 'back', 'other');--> statement-breakpoint
CREATE TYPE "public"."symptom_situation" AS ENUM('landing', 'during_exercise', 'after_exercise', 'daily_life', 'at_rest', 'other');--> statement-breakpoint
CREATE TABLE "symptom_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"site" "symptom_site" NOT NULL,
	"side" "symptom_side" NOT NULL,
	"kind" "symptom_kind" NOT NULL,
	"level" smallint NOT NULL,
	"situation" "symptom_situation" NOT NULL,
	"impact" "symptom_impact" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "symptom_level_check" CHECK ("symptom_logs"."level" between 0 and 10),
	CONSTRAINT "symptom_note_length_check" CHECK ("symptom_logs"."note" is null or char_length("symptom_logs"."note") <= 500)
);
--> statement-breakpoint
ALTER TABLE "symptom_logs" ADD CONSTRAINT "symptom_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "symptom_user_date_idx" ON "symptom_logs" USING btree ("user_id","date");