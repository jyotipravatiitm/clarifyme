CREATE TYPE "public"."session_status" AS ENUM('in_progress', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "anon_visitors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_by_user_id" text,
	"claimed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"challenge_id" text NOT NULL,
	"kind" text NOT NULL,
	"input" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"pass" boolean NOT NULL,
	"stars" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"anon_id" uuid,
	"lesson_id" text NOT NULL,
	"track_id" text NOT NULL,
	"status" "session_status" DEFAULT 'in_progress' NOT NULL,
	"stars" integer,
	"xp" integer,
	"hearts_left" integer,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"progress" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_session_id_lesson_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."lesson_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_sessions" ADD CONSTRAINT "lesson_sessions_anon_id_anon_visitors_id_fk" FOREIGN KEY ("anon_id") REFERENCES "public"."anon_visitors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attempts_session_idx" ON "attempts" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "lesson_sessions_user_idx" ON "lesson_sessions" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "lesson_sessions_anon_idx" ON "lesson_sessions" USING btree ("anon_id");