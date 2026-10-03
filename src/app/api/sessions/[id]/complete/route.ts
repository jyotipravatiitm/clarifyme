import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { getActor } from "@/server/actor";
import { finishSession } from "@/server/sessions";
import { trialFor } from "@/server/trial";

const Body = z.object({
  status: z.enum(["completed", "failed"]),
  stars: z.number().int().min(0).max(3),
  xp: z.number().int().min(0).max(1000),
  heartsLeft: z.number().int().min(0).max(5),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const db = getDb();
  const actor = await getActor();
  if (!db) return NextResponse.json({ ok: true, trial: await trialFor(actor) });
  const done = await finishSession(db, actor, (await params).id, parsed.data);
  if (!done) return NextResponse.json({ error: "Session not found or already finished" }, { status: 404 });
  return NextResponse.json({ ok: true, trial: await trialFor(actor) });
}
