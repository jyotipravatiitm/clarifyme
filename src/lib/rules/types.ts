export type Severity = "error" | "warn" | "tip";

export type RuleId =
  | "sentenceLength"
  | "totalWords"
  | "passiveVoice"
  | "vagueWords"
  | "ambiguousPronoun"
  | "andOr"
  | "modalKeywords"
  | "earsTemplate"
  | "simpleWords"
  | "steWords";

/** One flagged span in the user's text. `start`/`end` are character offsets. */
export interface Issue {
  ruleId: RuleId;
  severity: Severity;
  start: number;
  end: number;
  message: string;
  suggestion?: string;
}

export interface RuleOptions {
  /** Max words per sentence (sentenceLength). STE uses 20 for procedures. */
  maxWords?: number;
  /** Max words in the whole answer (totalWords). */
  maxTotalWords?: number;
  /** Require a SHALL/MUST style keyword (modalKeywords). */
  requireModal?: boolean;
  /** Extra words allowed in simpleWords mode (usually the topic word itself). */
  allowWords?: string[];
}

export interface RuleSetting {
  id: RuleId;
  /** Overrides the rule's default severity. */
  severity?: Severity;
}

export type Rule = (text: string, opts: RuleOptions) => Issue[];
