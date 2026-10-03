import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { DB } from "@/db";
import { runMigrations } from "@/db/migrate";
import { DEFAULT_PROGRESS } from "@/lib/progress-core";
import {
  TrialExhaustedError,
  claimAnon,
  deleteUserData,
  finishSession,
  getOwnedSession,
  getProfileProgress,
  getSessionDetail,
  listSessions,
  recordAttempt,
  saveProfileProgress,
  startSession,
  trialStatus,
} from "./sessions";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

d("sessions repository (Postgres)", () => {
  let client: ReturnType<typeof postgres>;
  let db: DB;
  const trial = { limit: 2, authOn: true };
  const lesson = { lessonId: "ears", trackId: "writing" };

  beforeAll(async () => {
    client = postgres(url!, { max: 2, onnotice: () => {} });
    db = drizzle(client, { schema });
    await db.execute(sql`drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;`);
    await runMigrations(db);
  });
  afterAll(async () => {
    await client?.end();
  });
  beforeEach(async () => {
    await db.execute(sql`truncate attempts, lesson_sessions, profiles, anon_visitors cascade`);
  });

  async function playLesson(actor: { userId: string | null; anonId: string | null }) {
    const { id } = await startSession(db, actor, lesson, trial);
    await recordAttempt(db, id, { challengeId: "w-ears-1", kind: "write", input: { text: "x" }, result: { pass: true }, pass: true, stars: 3 });
    await finishSession(db, actor, id, { status: "completed", stars: 3, xp: 20, heartsLeft: 3 });
    return id;
  }

  it("lets an anonymous visitor finish FREE_LESSONS lessons, then requires sign-in", async () => {
    const anon = { userId: null, anonId: crypto.randomUUID() };
    await playLesson(anon);
    expect((await trialStatus(db, anon, 2, true)).remaining).toBe(1);
    await playLesson(anon);
    const t = await trialStatus(db, anon, 2, true);
    expect(t).toMatchObject({ used: 2, remaining: 0, requiresSignIn: true });
    await expect(startSession(db, anon, lesson, trial)).rejects.toBeInstanceOf(TrialExhaustedError);
  });

  it("does not count failed or unfinished sessions", async () => {
    const anon = { userId: null, anonId: crypto.randomUUID() };
    const { id } = await startSession(db, anon, lesson, trial);
    await finishSession(db, anon, id, { status: "failed", stars: 0, xp: 0, heartsLeft: 0 });
    await startSession(db, anon, lesson, trial);
    expect((await trialStatus(db, anon, 2, true)).used).toBe(0);
  });

  it("never gates signed-in users or when auth is off", async () => {
    const anon = { userId: null, anonId: crypto.randomUUID() };
    await playLesson(anon);
    await playLesson(anon);
    expect((await trialStatus(db, anon, 2, false)).requiresSignIn).toBe(false);
    const user = { userId: "user_1", anonId: anon.anonId };
    expect((await trialStatus(db, user, 2, true)).requiresSignIn).toBe(false);
    await expect(startSession(db, user, lesson, trial)).resolves.toBeTruthy();
  });

  it("claims trial sessions on sign-in, once, and shows them in history", async () => {
    const anon = { userId: null, anonId: crypto.randomUUID() };
    const id = await playLesson(anon);
    expect(await claimAnon(db, anon.anonId!, "user_2")).toBe(1);
    expect(await claimAnon(db, anon.anonId!, "user_3")).toBe(0);
    const list = await listSessions(db, "user_2");
    expect(list.map((s) => s.id)).toEqual([id]);
    expect(list[0].attemptCount).toBe(1);
    const detail = await getSessionDetail(db, "user_2", id);
    expect(detail?.attempts).toHaveLength(1);
    expect(await getSessionDetail(db, "user_3", id)).toBeNull();
  });

  it("enforces ownership", async () => {
    const a = { userId: null, anonId: crypto.randomUUID() };
    const b = { userId: null, anonId: crypto.randomUUID() };
    const { id } = await startSession(db, a, lesson, trial);
    expect(await getOwnedSession(db, a, id)).not.toBeNull();
    expect(await getOwnedSession(db, b, id)).toBeNull();
    expect(await getOwnedSession(db, a, "not-a-uuid")).toBeNull();
    expect(await finishSession(db, b, id, { status: "completed", stars: 3, xp: 1, heartsLeft: 3 })).toBeNull();
  });

  it("cannot finish a session twice", async () => {
    const a = { userId: "user_4", anonId: null };
    const { id } = await startSession(db, a, lesson, trial);
    expect(await finishSession(db, a, id, { status: "completed", stars: 2, xp: 10, heartsLeft: 2 })).not.toBeNull();
    expect(await finishSession(db, a, id, { status: "completed", stars: 3, xp: 99, heartsLeft: 3 })).toBeNull();
  });

  it("stores progress and deletes all user data", async () => {
    await saveProfileProgress(db, "user_5", { ...DEFAULT_PROGRESS, xp: 42 });
    await saveProfileProgress(db, "user_5", { ...DEFAULT_PROGRESS, xp: 50 });
    expect((await getProfileProgress(db, "user_5"))?.xp).toBe(50);
    await playLesson({ userId: "user_5", anonId: null });
    await deleteUserData(db, "user_5");
    expect(await getProfileProgress(db, "user_5")).toBeNull();
    expect(await listSessions(db, "user_5")).toEqual([]);
  });
});
