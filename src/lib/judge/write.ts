import { z } from "zod";
import type { WriteChallenge } from "@/lib/content";
import { runRules, type Issue } from "@/lib/rules";
import { decide, decideEngine, type DecideOptions } from "@/lib/ai/jev";
import { generateJSON, llmConfig, type GenerateOptions } from "@/lib/ai/llm";
import { missingGroups } from "./keywords";
import { SYSTEM_ADVERSARIAL_READER, writeUserPrompt } from "./prompts";
import type { Counterexample, JudgeMode, WriteResult } from "./types";

export const CLARITY_LEVELS = [
  { what: "Unclear: a typical reader would likely misunderstand it, or it does not say what was asked", examples: ["Things should be handled appropriately."] },
  { what: "Ambiguous: two reasonable readers would act differently (vague words, unclear pronoun, missing number)", examples: ["Respond to urgent tickets quickly."] },
  { what: "Mostly clear: one reading is clearly intended, but a careful reader could still find a small gap", examples: ["Reply to urgent tickets within 1 hour."] },
  { what: "Crystal clear: only one reasonable reading; every actor, number and condition is explicit", examples: ["Reply to every P1 ticket within 1 hour, 24/7."] },
];

const CounterexampleSchema = z.object({
  quote: z.string().describe("Exact words copied from the answer"),
  reading: z.string().describe("The other way a reader could take it"),
  scenario: z.string().describe("A concrete situation where that reading breaks the intent"),
});

export const AdversarialSchema = z.object({
  headline: z.string().describe("Max 8 words, friendly, e.g. 'Two readings found!'"),
  counterexamples: z.array(CounterexampleSchema).max(3),
  missing: z.array(z.string()).max(3).describe("Parts of the intended meaning the answer leaves out, as hints"),
  rewrite_hint: z.string().describe("One concrete tip for the next attempt, not a full answer"),
});

export interface WriteDeps {
  decide?: DecideOptions;
  llm?: GenerateOptions & { enabled?: boolean };
}

const MAX_TEXT = 1500;

export async function judgeWrite(c: WriteChallenge, rawText: string, deps: WriteDeps = {}): Promise<WriteResult> {
  const text = rawText.slice(0, MAX_TEXT);
  const issues = runRules(text, c.rules, c.options);
  const missing = missingGroups(text, c.mustMention);
  const offlineMeets = missing.length === 0;

  const engine = decideEngine(deps.decide);
  const llmOn = deps.llm?.enabled ?? (deps.llm?.config ?? llmConfig()) !== null;

  let clarity: number | null = null;
  let meetsIntent = offlineMeets;
  let counterexamples: Counterexample[] = [];
  let rewriteHint: string | null = null;
  let aiHeadline: string | null = null;
  let aiMissing: string[] = [];
  let aiError: string | undefined;
  const used = new Set<"jev" | "llm">();

  if (engine && text.trim()) {
    try {
      const a = await decide(
        { task: c.prompt, source_text: c.source ?? null, intended_meaning: c.intent, learner_answer: text },
        {
          clarity: { type: "score", instructions: "How clear and unambiguous is learner_answer, read literally?", criteria: CLARITY_LEVELS },
          meets_intent: {
            type: "noul",
            instructions: "Does learner_answer say what intended_meaning requires (all key points, nothing contradicting it)?",
            criteria: { true: "All key points of intended_meaning are present and correct", false: "A key point is missing, wrong, or contradicted" },
          },
          one_reading: { type: "noul", instructions: "Is there only one reasonable way to read learner_answer?" },
        },
        deps.decide,
      );
      used.add(engine);
      clarity = a.clarity.score;
      meetsIntent = a.meets_intent.noul >= 0.6;
      const needsCoaching = clarity < 2.5 || a.meets_intent.noul < 0.6 || a.one_reading.noul < 0.6;

      if (needsCoaching && llmOn) {
        const adv = await generateJSON(AdversarialSchema, "adversarial_reading", SYSTEM_ADVERSARIAL_READER, writeUserPrompt(c, text), deps.llm);
        used.add("llm");
        counterexamples = adv.counterexamples.map((ce) => locate(text, ce));
        rewriteHint = adv.rewrite_hint || null;
        aiHeadline = adv.headline;
        aiMissing = adv.missing;
      }
    } catch (err) {
      aiError = err instanceof Error ? err.message : String(err);
      clarity = null;
      meetsIntent = offlineMeets;
    }
  }

  const mode: JudgeMode = used.has("jev") && used.has("llm") ? "jev+llm" : used.has("jev") ? "jev" : used.has("llm") ? "llm" : "offline";
  return score({ c, text, issues, missing, meetsIntent, clarity, counterexamples, rewriteHint, aiHeadline, aiMissing, mode, aiError });
}

function locate(text: string, ce: z.infer<typeof CounterexampleSchema>): Counterexample {
  const idx = ce.quote ? text.toLowerCase().indexOf(ce.quote.toLowerCase()) : -1;
  return { ...ce, start: idx >= 0 ? idx : null, end: idx >= 0 ? idx + ce.quote.length : null };
}

interface ScoreInput {
  c: WriteChallenge;
  text: string;
  issues: Issue[];
  missing: string[][];
  meetsIntent: boolean;
  clarity: number | null;
  counterexamples: Counterexample[];
  rewriteHint: string | null;
  aiHeadline: string | null;
  aiMissing: string[];
  mode: JudgeMode;
  aiError?: string;
}

export function score(i: ScoreInput): WriteResult {
  const errors = i.issues.filter((x) => x.severity === "error").length;
  const warns = i.issues.filter((x) => x.severity === "warn").length;
  const empty = !i.text.trim();
  const clearEnough = i.clarity === null || i.clarity >= 2;
  const pass = !empty && i.meetsIntent && errors === 0 && i.counterexamples.length === 0 && clearEnough;

  let stars: WriteResult["stars"] = 0;
  if (pass) {
    const polish = warns + (i.clarity !== null && i.clarity < 2.5 ? 1 : 0);
    stars = polish === 0 ? 3 : polish <= 2 ? 2 : 1;
  }
  const verdict: WriteResult["verdict"] = pass ? (stars === 3 ? "clear" : "almost") : "unclear";

  let headline: string;
  let feedback: string;
  if (empty) {
    headline = "Write something first!";
    feedback = "Give it a go. Short is fine.";
  } else if (pass) {
    headline = stars === 3 ? "Crystal clear!" : stars === 2 ? "Clear, with a little polish left" : "It works, but it's rough";
    feedback =
      warns > 0
        ? `It means one thing and says the right thing. ${warns} small thing${warns > 1 ? "s" : ""} to polish for the full 3 stars.`
        : "Only one way to read it, and it says exactly what was needed.";
  } else {
    headline = i.aiHeadline ?? (i.counterexamples.length ? "Another reading found!" : errors ? (errors > 1 ? "Not quite: rules broken" : "Not quite: a rule is broken") : "Something important is missing");
    const parts: string[] = [];
    if (i.counterexamples.length) parts.push(`A reader could take this ${i.counterexamples.length + 1} different ways.`);
    if (errors) parts.push(`${errors} rule${errors > 1 ? "s" : ""} broken.`);
    if (!i.meetsIntent) {
      const hint = i.aiMissing[0] ?? "Something the task asks for is still missing. Read the task again, or tap Hint.";
      parts.push(hint);
    }
    feedback = parts.join(" ") || "A careful reader might still misread this.";
  }

  return {
    pass,
    stars,
    verdict,
    headline,
    feedback,
    issues: i.issues,
    counterexamples: i.counterexamples,
    clarity: i.clarity,
    meetsIntent: i.meetsIntent,
    rewriteHint: i.rewriteHint,
    mode: i.mode,
    ...(i.aiError ? { aiError: i.aiError } : {}),
  };
}
