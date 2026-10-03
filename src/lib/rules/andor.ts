import type { Rule } from "./types";

export const andOr: Rule = (text) => {
  const out = [];
  for (const m of text.matchAll(/\b(and\/or|[A-Za-z]+\/[A-Za-z]+)\b/gi)) {
    const start = m.index ?? 0;
    const isAndOr = m[0].toLowerCase() === "and/or";
    out.push({
      ruleId: "andOr" as const,
      severity: isAndOr ? ("error" as const) : ("warn" as const),
      start,
      end: start + m[0].length,
      message: isAndOr
        ? `"and/or" leaves the reader to pick: one, the other, or both?`
        : `"${m[0]}" with a slash can mean "and", "or", or "either". Pick one word.`,
      suggestion: isAndOr ? `Write "A, B, or both" — or choose "and" or "or".` : `Write "A or B" or "A and B".`,
    });
  }
  return out;
};
