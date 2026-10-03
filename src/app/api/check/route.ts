import { NextResponse } from "next/server";
import { z } from "zod";
import { getChallenge } from "@/lib/content";
import { judgeWrite } from "@/lib/judge/write";
import { guardJudge } from "@/server/guard";
import { recordAttempt } from "@/server/sessions";

const Body = z.object({ challengeId: z.string().max(80), text: z.string().max(4000), sessionId: z.string().max(64).nullish() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const c = getChallenge(parsed.data.challengeId);
  if (!c || c.kind !== "write") return NextResponse.json({ error: "Unknown challenge" }, { status: 404 });
  const g = await guardJudge(req, parsed.data.sessionId);
  if (!g.ok) return g.response;

  const result = await judgeWrite(c, parsed.data.text);
  if (result.aiError) console.warn(`[check] AI fallback for ${c.id}: ${result.aiError}`);
  if (g.db && g.session) {
    await recordAttempt(g.db, g.session.id, { challengeId: c.id, kind: "write", input: { text: parsed.data.text.slice(0, 1500) }, result, pass: result.pass, stars: result.stars });
  }
  return NextResponse.json(result);
}
