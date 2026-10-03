import type { Rule } from "./types";
import { tokenize } from "./text";

const PRONOUNS = new Set(["it", "they", "them", "this", "that", "these", "those", "its", "their"]);
const DETERMINERS = new Set(["the", "a", "an", "each", "every", "any", "this", "that", "these", "those", "your", "my", "our"]);

/**
 * Heuristic: a pronoun is risky when two or more different noun phrases
 * ("the user", "a file") appear before it. Then a reader must guess.
 */
export const ambiguousPronoun: Rule = (text) => {
  const tokens = tokenize(text);
  const out = [];
  const seenNouns = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const next = tokens[i + 1];
    const isPronoun = PRONOUNS.has(t.lower);
    // "this file" / "that user" are determiners, not pronouns.
    const actsAsDeterminer =
      (t.lower === "this" || t.lower === "that" || t.lower === "these" || t.lower === "those") &&
      next !== undefined &&
      next.start - t.end <= 1 &&
      !/^(is|was|are|were|will|can|must|shall|should|may|means|happens|has|does)$/.test(next.lower);
    if (isPronoun && !actsAsDeterminer && t.lower !== "that") {
      if (seenNouns.size >= 2) {
        out.push({
          ruleId: "ambiguousPronoun" as const,
          severity: "warn" as const,
          start: t.start,
          end: t.end,
          message: `"${t.word}" could point to ${[...seenNouns].slice(-2).map((n) => `"${n}"`).join(" or ")}. The reader has to guess.`,
          suggestion: "Repeat the noun instead of using a pronoun.",
        });
      }
    }
    if (DETERMINERS.has(t.lower) && next && !PRONOUNS.has(next.lower) && !DETERMINERS.has(next.lower)) {
      seenNouns.add(next.lower);
    }
  }
  return out;
};
