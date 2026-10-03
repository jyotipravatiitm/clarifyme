import type { Rule } from "./types";
import { findPhrases } from "./text";

const STRONG = ["shall", "must", "must not", "shall not"];

export const modalKeywords: Rule = (text, opts) => {
  const out = [];
  for (const h of findPhrases(text, ["should", "could", "might", "will try", "ideally", "hopefully"])) {
    out.push({
      ruleId: "modalKeywords" as const,
      severity: "warn" as const,
      start: h.start,
      end: h.end,
      message: `"${text.slice(h.start, h.end)}" sounds like a wish. Is it required or not?`,
      suggestion: `Use "must" if it is required. Use "may" if it is optional.`,
    });
  }
  if (opts.requireModal && findPhrases(text, STRONG).length === 0 && text.trim()) {
    out.push({
      ruleId: "modalKeywords" as const,
      severity: "error" as const,
      start: 0,
      end: Math.min(text.length, text.trimEnd().length),
      message: `No "must" or "shall". A reader cannot tell if this is a rule or a description.`,
      suggestion: `State the requirement with "must" or "shall".`,
    });
  }
  return out;
};
