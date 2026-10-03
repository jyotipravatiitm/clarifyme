import "server-only";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { clerkEnabled } from "./config";
import { claimAnon, type Actor } from "./sessions";

export const ANON_COOKIE = "cm_anon";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const claimedThisProcess = new Set<string>();

export async function currentUserId(): Promise<string | null> {
  if (!clerkEnabled()) return null;
  const { auth } = await import("@clerk/nextjs/server");
  return (await auth()).userId ?? null;
}

/**
 * Resolves the actor for a route handler. Creates the anonymous cookie when
 * `create` is set, and moves trial sessions to the user right after sign-in.
 */
export async function getActor({ create = false } = {}): Promise<Actor> {
  const jar = await cookies();
  let anonId = jar.get(ANON_COOKIE)?.value ?? null;
  if (anonId && !UUID_RE.test(anonId)) anonId = null;
  if (!anonId && create) {
    anonId = crypto.randomUUID();
    jar.set(ANON_COOKIE, anonId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
    });
  }
  const userId = await currentUserId();
  const db = getDb();
  if (db && userId && anonId && !claimedThisProcess.has(anonId)) {
    await claimAnon(db, anonId, userId);
    claimedThisProcess.add(anonId);
  }
  return { userId, anonId };
}

/** Read-only actor for server components (cannot set cookies there). */
export async function peekActor(): Promise<Actor> {
  const jar = await cookies();
  const raw = jar.get(ANON_COOKIE)?.value ?? null;
  return { userId: await currentUserId(), anonId: raw && UUID_RE.test(raw) ? raw : null };
}
