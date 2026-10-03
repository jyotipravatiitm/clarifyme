import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { DEFAULT_PROGRESS, mergeProgress, normalizeProgress, type Progress } from "@/lib/progress-core";
import { getActor } from "@/server/actor";
import { getProfileProgress, saveProfileProgress } from "@/server/sessions";

const ProgressSchema = z.object({
  xp: z.number().int().min(0),
  streak: z.number().int().min(0),
  streakDay: z.string().nullable(),
  dailyXp: z.number().int().min(0),
  dailyDay: z.string().nullable(),
  dailyGoal: z.number().int().positive(),
  completed: z.record(z.string().max(80), z.object({ stars: z.number().int().min(0).max(3), xp: z.number().int().min(0) })),
  muted: z.boolean(),
  onboarded: z.boolean().optional(),
  track: z.enum(["writing", "thinking", "spec"]).nullable().optional(),
  chests: z.array(z.string().max(80)).max(200).optional(),
  quests: z
    .object({ day: z.string().nullable(), lessons: z.number().int().min(0), perfect: z.number().int().min(0), claimed: z.array(z.string().max(20)).max(10) })
    .optional(),
  activity: z.record(z.string().max(10), z.number().int().min(0)).optional(),
});

async function signedIn() {
  const db = getDb();
  const { userId } = await getActor();
  return db && userId ? { db, userId } : null;
}

/** Server copy of the signed-in user's progress. */
export async function GET() {
  const ctx = await signedIn();
  if (!ctx) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return NextResponse.json({ progress: await getProfileProgress(ctx.db, ctx.userId) }, { headers: { "Cache-Control": "no-store" } });
}

/** Merges the browser's progress into the server copy and returns the result. */
export async function PUT(req: Request) {
  const ctx = await signedIn();
  if (!ctx) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = ProgressSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const current = (await getProfileProgress(ctx.db, ctx.userId)) ?? DEFAULT_PROGRESS;
  const merged: Progress = mergeProgress(normalizeProgress(parsed.data), current);
  await saveProfileProgress(ctx.db, ctx.userId, merged);
  return NextResponse.json({ progress: merged });
}
