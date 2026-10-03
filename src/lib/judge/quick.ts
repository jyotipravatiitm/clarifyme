import { tapAnswer, tapTokens, type ChoiceChallenge, type TapChallenge } from "@/lib/content";
import type { QuickResult } from "./types";

const PRAISE = ["Crystal clear!", "No fog here!", "Nicely spotted!", "Sharp eyes!", "Exactly right!"];

function praise(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PRAISE[h % PRAISE.length];
}

export function gradeChoice(c: ChoiceChallenge, picked: number): QuickResult {
  const correctIndex = c.options.findIndex((o) => o.correct);
  const pass = picked === correctIndex;
  return {
    kind: "choice",
    pass,
    stars: pass ? 3 : 0,
    headline: pass ? praise(c.id) : "Not quite",
    feedback: pass ? c.options[correctIndex].why : `${c.options[picked]?.why ?? ""} The clear answer: “${c.options[correctIndex].text}”`.trim(),
    correctIndex,
    picked,
    whys: c.options.map((o) => o.why),
    options: c.options.map((o) => o.text),
  };
}

export function gradeTap(c: TapChallenge, tapped: number[]): QuickResult {
  const tokens = tapTokens(c.sentence);
  const answer = tapAnswer(c);
  const picked = [...new Set(tapped.filter((i) => Number.isInteger(i) && i >= 0 && i < tokens.length))].sort((a, b) => a - b);
  const missed = answer.filter((i) => !picked.includes(i));
  const extra = picked.filter((i) => !answer.includes(i));
  const pass = missed.length === 0 && extra.length === 0;
  return {
    kind: "tap",
    pass,
    stars: pass ? 3 : 0,
    headline: pass ? praise(c.id) : missed.length && !extra.length ? "Almost — you missed some" : "Not quite",
    feedback: c.explain,
    tokens,
    answer,
    tapped: picked,
    missed,
    extra,
  };
}
