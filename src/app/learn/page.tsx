import type { Metadata } from "next";
import { TRACKS, getChallenge } from "@/lib/content";
import { aiStatus } from "@/lib/ai/status";
import { LearnClient } from "@/components/game/LearnClient";
import type { LessonMeta } from "@/components/game/PathMap";

export const metadata: Metadata = { title: "Learn · ClarifyMe" };

/** XP and step count per lesson, for the "START +N XP" popovers. */
function lessonMeta(): Record<string, LessonMeta> {
  const meta: Record<string, LessonMeta> = {};
  for (const t of TRACKS)
    for (const u of t.units)
      for (const l of u.lessons) meta[l.id] = { steps: l.steps.length, xp: l.steps.reduce((sum, s) => sum + (getChallenge(s)?.xp ?? 0), 0) };
  return meta;
}

export default function LearnPage() {
  const ai = aiStatus();
  return <LearnClient tracks={TRACKS} meta={lessonMeta()} aiLabel={ai.label} aiOn={ai.jev || ai.llm} />;
}
