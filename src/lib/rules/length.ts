import type { Rule } from "./types";
import { sentences, tokenize } from "./text";

export const sentenceLength: Rule = (text, opts) => {
  const max = opts.maxWords ?? 20;
  return sentences(text)
    .map((s) => ({ s, n: tokenize(s.text).length }))
    .filter(({ n }) => n > max)
    .map(({ s, n }) => ({
      ruleId: "sentenceLength" as const,
      severity: "warn" as const,
      start: s.start,
      end: s.end,
      message: `This sentence has ${n} words. Keep each sentence to ${max} words or fewer.`,
      suggestion: "Split it into two sentences, one idea each.",
    }));
};

export const totalWords: Rule = (text, opts) => {
  const max = opts.maxTotalWords;
  if (!max) return [];
  const tokens = tokenize(text);
  if (tokens.length <= max) return [];
  const first = tokens[max];
  return [
    {
      ruleId: "totalWords",
      severity: "error",
      start: first.start,
      end: tokens[tokens.length - 1].end,
      message: `${tokens.length} words. The limit is ${max}. Everything after word ${max} is over budget.`,
      suggestion: "Lead with the point. Cut anything the reader can live without.",
    },
  ];
};
