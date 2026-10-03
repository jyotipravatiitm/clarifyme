import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import type { DB } from "@/db";
import { anonVisitors, attempts, lessonSessions, profiles, type Attempt, type LessonSession } from "@/db/schema";
import type { Progress } from "@/lib/progress-core";

/** Who is making a request: a signed-in Clerk user, an anonymous browser, or both (just after sign-in). */
export interface Actor {
  userId: string | null;
  anonId: string | null;
}

export interface TrialStatus {
  /** False when the server cannot enforce a trial (no database, no auth, or FREE_LESSONS=0). */
  enabled: boolean;
  signedIn: boolean;
  used: number;
  limit: number;
  remaining: number;
  requiresSignIn: boolean;
}

export async function ensureAnon(db: DB, anonId: string): Promise<void> {
  await db.insert(anonVisitors).values({ id: anonId }).onConflictDoNothing();
}

/**
 * Moves an anonymous visitor's sessions to the user who just signed in.
 * Idempotent: only the first call for a visitor does work. Returns sessions moved.
 */
export async function claimAnon(db: DB, anonId: string, userId: string): Promise<number> {
  const claimed = await db
    .update(anonVisitors)
    .set({ claimedByUserId: userId, claimedAt: new Date() })
    .where(and(eq(anonVisitors.id, anonId), isNull(anonVisitors.claimedByUserId)))
    .returning({ id: anonVisitors.id });
  if (!claimed.length) return 0;
  const moved = await db
    .update(lessonSessions)
    .set({ userId })
    .where(and(eq(lessonSessions.anonId, anonId), isNull(lessonSessions.userId)))
    .returning({ id: lessonSessions.id });
  return moved.length;
}

export async function trialStatus(db: DB, actor: Actor, limit: number, authOn: boolean): Promise<TrialStatus> {
  const signedIn = !!actor.userId;
  if (!authOn || limit <= 0 || signedIn || !actor.anonId) {
    return { enabled: authOn && limit > 0 && !signedIn, signedIn, used: 0, limit, remaining: limit, requiresSignIn: false };
  }
  const [row] = await db
    .select({ n: count() })
    .from(lessonSessions)
    .where(and(eq(lessonSessions.anonId, actor.anonId), isNull(lessonSessions.userId), eq(lessonSessions.status, "completed")));
  const used = Number(row?.n ?? 0);
  const remaining = Math.max(0, limit - used);
  return { enabled: true, signedIn, used, limit, remaining, requiresSignIn: remaining === 0 };
}

export class TrialExhaustedError extends Error {
  constructor(public trial: TrialStatus) {
    super("signin_required");
  }
}

export async function startSession(
  db: DB,
  actor: Actor,
  lesson: { lessonId: string; trackId: string },
  trial: { limit: number; authOn: boolean },
): Promise<{ id: string; trial: TrialStatus }> {
  if (actor.anonId) await ensureAnon(db, actor.anonId);
  const status = await trialStatus(db, actor, trial.limit, trial.authOn);
  if (status.requiresSignIn) throw new TrialExhaustedError(status);
  const [row] = await db
    .insert(lessonSessions)
    .values({ userId: actor.userId, anonId: actor.anonId, lessonId: lesson.lessonId, trackId: lesson.trackId })
    .returning({ id: lessonSessions.id });
  return { id: row.id, trial: status };
}

/** A session belongs to its user, or (before any sign-in) to the anonymous browser that started it. */
export function ownsSession(actor: Actor, s: Pick<LessonSession, "userId" | "anonId">): boolean {
  if (s.userId) return s.userId === actor.userId;
  return !!actor.anonId && s.anonId === actor.anonId;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getOwnedSession(db: DB, actor: Actor, id: string): Promise<LessonSession | null> {
  if (!UUID_RE.test(id)) return null;
  const [s] = await db.select().from(lessonSessions).where(eq(lessonSessions.id, id)).limit(1);
  return s && ownsSession(actor, s) ? s : null;
}

export async function recordAttempt(
  db: DB,
  sessionId: string,
  a: { challengeId: string; kind: "write" | "break" | "choice" | "tap"; input: unknown; result: unknown; pass: boolean; stars: number },
): Promise<void> {
  await db.insert(attempts).values({ sessionId, ...a });
}

export async function finishSession(
  db: DB,
  actor: Actor,
  id: string,
  r: { status: "completed" | "failed"; stars: number; xp: number; heartsLeft: number },
): Promise<LessonSession | null> {
  const s = await getOwnedSession(db, actor, id);
  if (!s || s.status !== "in_progress") return null;
  const [updated] = await db
    .update(lessonSessions)
    .set({ ...r, completedAt: new Date() })
    .where(and(eq(lessonSessions.id, id), eq(lessonSessions.status, "in_progress")))
    .returning();
  return updated ?? null;
}

export interface SessionSummary extends LessonSession {
  attemptCount: number;
}

export async function listSessions(db: DB, userId: string, limit = 100): Promise<SessionSummary[]> {
  const rows = await db
    .select({ s: lessonSessions, attemptCount: count(attempts.id) })
    .from(lessonSessions)
    .leftJoin(attempts, eq(attempts.sessionId, lessonSessions.id))
    .where(eq(lessonSessions.userId, userId))
    .groupBy(lessonSessions.id)
    .orderBy(desc(lessonSessions.startedAt))
    .limit(limit);
  return rows.filter((r) => r.attemptCount > 0 || r.s.status !== "in_progress").map((r) => ({ ...r.s, attemptCount: Number(r.attemptCount) }));
}

export async function getSessionDetail(db: DB, userId: string, id: string): Promise<{ session: LessonSession; attempts: Attempt[] } | null> {
  const s = await getOwnedSession(db, { userId, anonId: null }, id);
  if (!s) return null;
  const rows = await db.select().from(attempts).where(eq(attempts.sessionId, id)).orderBy(attempts.createdAt);
  return { session: s, attempts: rows };
}

export async function getProfileProgress(db: DB, userId: string): Promise<Progress | null> {
  const [p] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return p?.progress ?? null;
}

export async function saveProfileProgress(db: DB, userId: string, progress: Progress): Promise<void> {
  await db
    .insert(profiles)
    .values({ userId, progress, updatedAt: new Date() })
    .onConflictDoUpdate({ target: profiles.userId, set: { progress, updatedAt: new Date() } });
}

/** Deletes everything stored for a user (sessions cascade to attempts). */
export async function deleteUserData(db: DB, userId: string): Promise<void> {
  const own = await db.select({ id: lessonSessions.id }).from(lessonSessions).where(eq(lessonSessions.userId, userId));
  if (own.length) await db.delete(lessonSessions).where(inArray(lessonSessions.id, own.map((o) => o.id)));
  await db.delete(profiles).where(eq(profiles.userId, userId));
  await db.update(anonVisitors).set({ claimedByUserId: null }).where(eq(anonVisitors.claimedByUserId, userId));
}
