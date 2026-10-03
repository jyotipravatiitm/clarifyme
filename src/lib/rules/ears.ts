import type { Rule } from "./types";
import { sentences } from "./text";

/**
 * EARS (Easy Approach to Requirements Syntax), Mavin et al., Rolls-Royce.
 *   Ubiquitous:    The <system> shall <response>.
 *   Event-driven:  When <trigger>, the <system> shall <response>.
 *   State-driven:  While <state>, the <system> shall <response>.
 *   Unwanted:      If <condition>, then the <system> shall <response>.
 *   Optional:      Where <feature>, the <system> shall <response>.
 *   Complex:       combinations, e.g. While <state>, when <trigger>, the ...
 */
const EARS_RE = /^(?:(?:while|when|where|if)\s+[^,]+,\s*(?:then\s+)?)*the\s+[a-z0-9][\w\s'-]*?\s+shall(?:\s+not)?\s+\S+/i;

export const EARS_TEMPLATES = [
  "The <system> shall <response>.",
  "When <trigger>, the <system> shall <response>.",
  "While <state>, the <system> shall <response>.",
  "If <condition>, then the <system> shall <response>.",
  "Where <feature>, the <system> shall <response>.",
];

export function matchesEars(sentence: string): boolean {
  return EARS_RE.test(sentence.trim());
}

export const earsTemplate: Rule = (text) =>
  sentences(text)
    .filter((s) => !matchesEars(s.text))
    .map((s) => ({
      ruleId: "earsTemplate" as const,
      severity: "error" as const,
      start: s.start,
      end: s.end,
      message: "This sentence does not fit an EARS template.",
      suggestion: `Try: "When <trigger>, the <system> shall <response>." or "If <condition>, then the <system> shall <response>."`,
    }));
