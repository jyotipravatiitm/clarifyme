import type { Issue, Rule, RuleId, RuleOptions, RuleSetting } from "./types";
import { sentenceLength, totalWords } from "./length";
import { passiveVoice } from "./passive";
import { vagueWords } from "./vague";
import { ambiguousPronoun } from "./pronoun";
import { andOr } from "./andor";
import { modalKeywords } from "./modal";
import { earsTemplate } from "./ears";
import { simpleWords } from "./simple";
import { steWords } from "./ste";

export * from "./types";

export const RULES: Record<RuleId, Rule> = {
  sentenceLength,
  totalWords,
  passiveVoice,
  vagueWords,
  ambiguousPronoun,
  andOr,
  modalKeywords,
  earsTemplate,
  simpleWords,
  steWords,
};

export const RULE_LABELS: Record<RuleId, string> = {
  sentenceLength: "Short sentences",
  totalWords: "Word budget",
  passiveVoice: "Active voice",
  vagueWords: "No vague words",
  ambiguousPronoun: "Clear pronouns",
  andOr: "No and/or",
  modalKeywords: "Must, not should",
  earsTemplate: "EARS template",
  simpleWords: "Simple words only",
  steWords: "Simplified English",
};

const SEVERITY_ORDER = { error: 0, warn: 1, tip: 2 } as const;

export function runRules(text: string, settings: RuleSetting[], opts: RuleOptions = {}): Issue[] {
  const issues: Issue[] = [];
  for (const s of settings) {
    for (const issue of RULES[s.id](text, opts)) {
      issues.push(s.severity ? { ...issue, severity: s.severity } : issue);
    }
  }
  return issues.sort((a, b) => a.start - b.start || SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
