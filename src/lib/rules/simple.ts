import type { Rule } from "./types";
import { stems, tokenize } from "./text";
import { isCommon } from "./common-words";

export const simpleWords: Rule = (text, opts) => {
  const allow = new Set((opts.allowWords ?? []).map((w) => w.toLowerCase()));
  return tokenize(text)
    .filter((t) => !isCommon(t.word, stems, allow))
    .map((t) => ({
      ruleId: "simpleWords" as const,
      severity: "error" as const,
      start: t.start,
      end: t.end,
      message: `"${t.word}" is not on the simple-words list.`,
      suggestion: "Say what it does or what it looks like, using everyday words.",
    }));
};
