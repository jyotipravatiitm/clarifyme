import { NextResponse } from "next/server";
import { z } from "zod";
import { getChallenge } from "@/lib/content";
import { cleanCases, judgeBreak } from "@/lib/judge/break";
import { guardJudge } from "@/server/guard";
import { recordAttempt } from "@/server/sessions";

const Body = z.object({
  challengeId: z.string().max(80),
  cases: z.array(z.string().max(600)).max(30),
  giveUp: z.boolean().default(false),
  sessionId: z.string().max(64).nullish(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const c = getChallenge(parsed.data.challengeId);
  if (!c || c.kind !== "break") return NextResponse.json({ error: "Unknown challenge" }, { status: 404 });
  const g = await guardJudge(req, parsed.data.sessionId);
  if (!g.ok) return g.response;

  const result = await judgeBreak(c, parsed.data.cases, parsed.data.giveUp);
  if (result.aiError) console.warn(`[break] AI fallback for ${c.id}: ${result.aiError}`);
  if (g.db && g.session) {
    await recordAttempt(g.db, g.session.id, {
      challengeId: c.id,
      kind: "break",
      input: { cases: cleanCases(parsed.data.cases), giveUp: parsed.data.giveUp },
      result,
      pass: result.pass,
      stars: result.stars,
    });
  }
  return NextResponse.json(result);
}
