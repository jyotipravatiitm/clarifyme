import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { getLesson } from "@/lib/content";
import { getActor } from "@/server/actor";
import { clerkEnabled, freeLessons } from "@/server/config";
import { TrialExhaustedError, startSession } from "@/server/sessions";
import { trialFor } from "@/server/trial";

const Body = z.object({ lessonId: z.string().max(80) });

/** Starts a lesson session. Returns 402 when an anonymous visitor has used up the free lessons. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const ref = getLesson(parsed.data.lessonId);
  if (!ref) return NextResponse.json({ error: "Unknown lesson" }, { status: 404 });

  const actor = await getActor({ create: true });
  const db = getDb();
  if (!db) return NextResponse.json({ sessionId: null, trial: await trialFor(actor) });
  try {
    const { id, trial } = await startSession(db, actor, { lessonId: ref.lesson.id, trackId: ref.track.id }, { limit: freeLessons(), authOn: clerkEnabled() });
    return NextResponse.json({ sessionId: id, trial });
  } catch (err) {
    if (err instanceof TrialExhaustedError) return NextResponse.json({ code: "signin_required", trial: err.trial }, { status: 402 });
    throw err;
  }
}
