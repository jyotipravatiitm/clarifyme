import { NextResponse } from "next/server";
import { z } from "zod";
import { getChallenge } from "@/lib/content";
import { judgeWrite } from "@/lib/judge/write";

const Body = z.object({ challengeId: z.string().max(80), text: z.string().max(4000) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const c = getChallenge(parsed.data.challengeId);
  if (!c || c.kind !== "write") return NextResponse.json({ error: "Unknown challenge" }, { status: 404 });
  const result = await judgeWrite(c, parsed.data.text);
  if (result.aiError) console.warn(`[check] AI fallback for ${c.id}: ${result.aiError}`);
  return NextResponse.json(result);
}
