import "server-only";
import { getDb } from "@/db";
import { clerkEnabled, freeLessons } from "./config";
import { trialStatus, type Actor, type TrialStatus } from "./sessions";

export async function trialFor(actor: Actor): Promise<TrialStatus> {
  const db = getDb();
  const limit = freeLessons();
  if (!db) return { enabled: false, signedIn: !!actor.userId, used: 0, limit, remaining: limit, requiresSignIn: false };
  return trialStatus(db, actor, limit, clerkEnabled());
}
