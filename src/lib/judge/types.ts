import type { Issue } from "@/lib/rules";

export type JudgeMode = "offline" | "jev" | "llm" | "jev+llm";

export interface Counterexample {
  quote: string;
  /** Offsets of `quote` in the answer, when found. */
  start: number | null;
  end: number | null;
  reading: string;
  scenario: string;
}

export interface WriteResult {
  pass: boolean;
  stars: 0 | 1 | 2 | 3;
  verdict: "clear" | "almost" | "unclear";
  headline: string;
  feedback: string;
  issues: Issue[];
  counterexamples: Counterexample[];
  /** 0..3 when an AI judge ran. */
  clarity: number | null;
  meetsIntent: boolean;
  rewriteHint: string | null;
  mode: JudgeMode;
  /** Set when an AI call failed and we fell back to offline checks. */
  aiError?: string;
}

export type CaseStatus = "match" | "bonus" | "invalid" | "duplicate" | "unverified";

export interface CaseResult {
  text: string;
  status: CaseStatus;
  caseId: string | null;
  title: string | null;
  note: string | null;
}

export interface BreakResult {
  pass: boolean;
  stars: 0 | 1 | 2 | 3;
  headline: string;
  cases: CaseResult[];
  caught: string[];
  total: number;
  bonus: number;
  minToPass: number;
  /** Only filled when the learner passed (or gave up), so a retry is not spoiled. */
  missed: { id: string; title: string; description: string }[];
  mode: JudgeMode;
  aiError?: string;
}
