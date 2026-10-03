import { NextResponse } from "next/server";
import { z } from "zod";
import { getChallenge } from "@/lib/content";
import { gradeChoice, gradeTap } from "@/lib/judge/quick";
import { guardJudge } from "@/server/guard";
import { recordAttempt } from "@/server/sessions";

const Body = z.object({
  challengeId: z.string().max(80),
  sessionId: z.string().max(64).nullish(),
  choice: z.number().int().min(0).max(10).optional(),
  taps: z.array(z.number().int().min(0).max(200)).max(60).optional(),
});

/** Grades one-tap questions (choice / tap). Answers never reach the browser before this call. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const c = getChallenge(parsed.data.challengeId);
  if (!c || (c.kind !== "choice" && c.kind !== "tap")) return NextResponse.json({ error: "Unknown challenge" }, { status: 404 });
  const g = await guardJudge(req, parsed.data.sessionId);
  if (!g.ok) return g.response;

  let result;
  let input: unknown;
  if (c.kind === "choice") {
    if (parsed.data.choice === undefined || parsed.data.choice >= c.options.length) return NextResponse.json({ error: "Pick an option" }, { status: 400 });
    result = gradeChoice(c, parsed.data.choice);
    input = { choice: parsed.data.choice };
  } else {
    result = gradeTap(c, parsed.data.taps ?? []);
    input = { taps: result.tapped };
  }
  if (g.db && g.session) {
    await recordAttempt(g.db, g.session.id, { challengeId: c.id, kind: c.kind, input, result, pass: result.pass, stars: result.stars });
  }
  return NextResponse.json(result);
}
