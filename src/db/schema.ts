import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { Progress } from "@/lib/progress-core";

/** A browser that has used ClarifyMe without signing in (cookie `cm_anon`). */
export const anonVisitors = pgTable("anon_visitors", {
  id: uuid("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  claimedByUserId: text("claimed_by_user_id"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
});

/** Per-user progress (XP, streak, stars), keyed by Clerk user id. */
export const profiles = pgTable("profiles", {
  userId: text("user_id").primaryKey(),
  progress: jsonb("progress").$type<Progress>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessionStatus = pgEnum("session_status", ["in_progress", "completed", "failed"]);

/** One play-through of one lesson. */
export const lessonSessions = pgTable(
  "lesson_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id"),
    anonId: uuid("anon_id").references(() => anonVisitors.id, { onDelete: "set null" }),
    lessonId: text("lesson_id").notNull(),
    trackId: text("track_id").notNull(),
    status: sessionStatus("status").notNull().default("in_progress"),
    stars: integer("stars"),
    xp: integer("xp"),
    heartsLeft: integer("hearts_left"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("lesson_sessions_user_idx").on(t.userId, t.startedAt), index("lesson_sessions_anon_idx").on(t.anonId)],
);

/** Every Check press: what the learner submitted and what the judge said. */
export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => lessonSessions.id, { onDelete: "cascade" }),
    challengeId: text("challenge_id").notNull(),
    kind: text("kind", { enum: ["write", "break", "choice", "tap"] }).notNull(),
    input: jsonb("input").notNull(),
    result: jsonb("result").notNull(),
    pass: boolean("pass").notNull(),
    stars: integer("stars").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("attempts_session_idx").on(t.sessionId, t.createdAt)],
);

export type LessonSession = typeof lessonSessions.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
