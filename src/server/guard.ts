import "server-only";
import { NextResponse } from "next/server";
import { getDb, type DB } from "@/db";
import type { LessonSession } from "@/db/schema";
import { getActor } from "./actor";
import { rateLimit } from "./rateLimit";
import { getOwnedSession, type Actor } from "./sessions";

const CHECKS_PER_MINUTE = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 30);

export type Guarded =
  | { ok: true; actor: Actor; db: DB | null; session: LessonSession | null }
  | { ok: false; response: NextResponse };

/**
 * Shared checks for the judging routes:
 * - rate limit per user / browser / IP,
 * - with a database, the request must belong to an in-progress session the caller owns
 *   (so the free-lesson limit cannot be skipped by calling the API directly).
 */
export async function guardJudge(req: Request, sessionId: string | null | undefined): Promise<Guarded> {
  const actor = await getActor();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = actor.userId ?? actor.anonId ?? `ip:${ip}`;
  const rl = rateLimit(`judge:${key}`, CHECKS_PER_MINUTE);
  if (!rl.ok) {
    return { ok: false, response: NextResponse.json({ error: "Too many checks. Take a breath and try again in a moment." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }) };
  }
  const db = getDb();
  if (!db) return { ok: true, actor, db: null, session: null };
  const session = sessionId ? await getOwnedSession(db, actor, sessionId) : null;
  if (!session || session.status !== "in_progress") {
    return { ok: false, response: NextResponse.json({ error: "This lesson session has ended. Restart the lesson." }, { status: 409 }) };
  }
  return { ok: true, actor, db, session };
}
