import type { Rule } from "./types";
import { findPhrases } from "./text";

/** Inspired by ASD-STE100: prefer the short, approved word with one meaning. */
export const STE_SWAPS: Record<string, string> = {
  utilize: "use",
  utilise: "use",
  commence: "start",
  initiate: "start",
  terminate: "stop",
  "prior to": "before",
  "in order to": "to",
  facilitate: "help",
  assist: "help",
  endeavor: "try",
  attempt: "try",
  obtain: "get",
  require: "need",
  modify: "change",
  indicate: "show",
  demonstrate: "show",
  regarding: "about",
  "in the event that": "if",
  "due to the fact that": "because",
  "at this point in time": "now",
  "a number of": "some (and then give the number)",
  numerous: "many (and then give the number)",
  additional: "more",
  subsequently: "then",
  sufficient: "enough",
  ensure: "make sure",
  perform: "do",
  accomplish: "do",
  "with regard to": "about",
  "in addition": "also",
  approximately: "about",
  remainder: "rest",
  inform: "tell",
  locate: "find",
  purchase: "buy",
};

export const steWords: Rule = (text) =>
  findPhrases(text, Object.keys(STE_SWAPS)).map((h) => ({
    ruleId: "steWords" as const,
    severity: "warn" as const,
    start: h.start,
    end: h.end,
    message: `"${text.slice(h.start, h.end)}" is not a simple-English word.`,
    suggestion: `Use "${STE_SWAPS[h.phrase]}".`,
  }));
