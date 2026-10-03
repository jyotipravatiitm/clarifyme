import type { Rule } from "./types";

const BE = "(?:am|is|are|was|were|be|been|being|get|gets|got|gotten)";
const IRREGULAR = [
  "done", "made", "given", "taken", "sent", "seen", "known", "shown", "written", "chosen",
  "broken", "kept", "held", "left", "lost", "paid", "put", "set", "sold", "told", "found",
  "built", "bought", "caught", "taught", "thrown", "driven", "hidden", "forgotten", "begun",
  "run", "read", "cut", "shut", "hit", "won", "spent", "meant", "brought", "thought",
];
const PARTICIPLE = `(?:[a-z]+ed|${IRREGULAR.join("|")})`;
const PASSIVE_RE = new RegExp(`\\b${BE}\\s+(?:[a-z]+ly\\s+)?${PARTICIPLE}\\b`, "gi");

// Adjectives that look like participles and are fine after "is".
const ALLOWED = new Set(["tired", "interested", "excited", "bored", "scared", "worried", "pleased", "supposed", "used", "allowed", "required", "needed"]);

export const passiveVoice: Rule = (text) => {
  const out = [];
  for (const m of text.matchAll(PASSIVE_RE)) {
    const last = m[0].split(/\s+/).pop()!.toLowerCase();
    if (ALLOWED.has(last)) continue;
    const start = m.index ?? 0;
    out.push({
      ruleId: "passiveVoice" as const,
      severity: "tip" as const,
      start,
      end: start + m[0].length,
      message: `"${m[0]}" is passive. Who does it? Passive voice hides the actor.`,
      suggestion: "Name the actor first: \"The system locks the door\", not \"The door is locked\".",
    });
  }
  return out;
};
