import { NextResponse } from "next/server";
import { z } from "zod";
import { getChallenge } from "@/lib/content";
import { judgeBreak } from "@/lib/judge/break";

const Body = z.object({
  challengeId: z.string().max(80),
  cases: z.array(z.string().max(600)).max(30),
  giveUp: z.boolean().default(false),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const c = getChallenge(parsed.data.challengeId);
  if (!c || c.kind !== "break") return NextResponse.json({ error: "Unknown challenge" }, { status: 404 });
  const result = await judgeBreak(c, parsed.data.cases, parsed.data.giveUp);
  if (result.aiError) console.warn(`[break] AI fallback for ${c.id}: ${result.aiError}`);
  return NextResponse.json(result);
}
