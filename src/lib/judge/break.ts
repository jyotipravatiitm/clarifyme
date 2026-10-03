import { z } from "zod";
import type { BreakChallenge } from "@/lib/content";
import { decide, decideEngine, type Criterion, type DecideOptions, type JevQuestion } from "@/lib/ai/jev";
import { generateJSON, llmConfig, type GenerateOptions } from "@/lib/ai/llm";
import { matchesAllGroups } from "./keywords";
import { SYSTEM_BREAK_COACH, breakUserPrompt } from "./prompts";
import type { BreakResult, CaseResult, JudgeMode } from "./types";

export const MAX_CASES = 15;
const MAX_CASE_LEN = 300;
const NONE = "none";

const NotesSchema = z.object({ notes: z.array(z.object({ index: z.number().int(), note: z.string() })) });

export interface BreakDeps {
  decide?: DecideOptions;
  llm?: GenerateOptions & { enabled?: boolean };
}

export function cleanCases(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    const t = r.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim().slice(0, MAX_CASE_LEN);
    const key = t.toLowerCase();
    if (!t || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= MAX_CASES) break;
  }
  return out;
}

/**
 * @param revealMissed true when the learner gave up: show missed cases even on a fail.
 */
export async function judgeBreak(c: BreakChallenge, rawCases: string[], revealMissed = false, deps: BreakDeps = {}): Promise<BreakResult> {
  const cases = cleanCases(rawCases);
  const engine = decideEngine(deps.decide);
  const llmOn = deps.llm?.enabled ?? (deps.llm?.config ?? llmConfig()) !== null;
  const used = new Set<"jev" | "llm">();
  let aiError: string | undefined;

  let results: CaseResult[] | null = null;
  if (engine && cases.length) {
    try {
      results = await classifyWithAI(c, cases, deps.decide);
      used.add(engine);
      if (llmOn) {
        const needNotes = results.map((r, index) => ({ index, text: r.text, status: r.status })).filter((r) => r.status === "bonus" || r.status === "invalid");
        if (needNotes.length) {
          try {
            const { notes } = await generateJSON(NotesSchema, "case_notes", SYSTEM_BREAK_COACH, breakUserPrompt(c, needNotes), deps.llm);
            used.add("llm");
            for (const n of notes) if (results[n.index]) results[n.index].note = n.note;
          } catch {
            // Notes are a nicety; the verdicts already stand.
          }
        }
      }
    } catch (err) {
      aiError = err instanceof Error ? err.message : String(err);
      results = null;
    }
  }
  results ??= classifyOffline(c, cases);

  const caught = [...new Set(results.filter((r) => r.status === "match").map((r) => r.caseId!))];
  const bonus = results.filter((r) => r.status === "bonus").length;
  const total = c.hiddenCases.length;
  const pass = caught.length + bonus >= c.minToPass;
  const ratio = caught.length / total;
  const stars: BreakResult["stars"] = !pass ? 0 : ratio >= 0.85 ? 3 : ratio >= 0.6 ? 2 : 1;

  const headline = !cases.length
    ? "Add at least one case first!"
    : pass
      ? ratio === 1
        ? "You caught every single one!"
        : `Nice hunting: ${caught.length}/${total} caught!`
      : `${caught.length}/${total} caught. You need ${c.minToPass}.`;

  const mode: JudgeMode = used.has("jev") && used.has("llm") ? "jev+llm" : used.has("jev") ? "jev" : used.has("llm") ? "llm" : "offline";
  return {
    pass,
    stars,
    headline,
    cases: results,
    caught,
    total,
    bonus,
    minToPass: c.minToPass,
    missed: pass || revealMissed ? c.hiddenCases.filter((h) => !caught.includes(h.id)).map(({ id, title, description }) => ({ id, title, description })) : [],
    mode,
    ...(aiError ? { aiError } : {}),
  };
}

function classifyOffline(c: BreakChallenge, cases: string[]): CaseResult[] {
  const taken = new Set<string>();
  return cases.map((text) => {
    const hits = c.hiddenCases.filter((h) => matchesAllGroups(text, h.keywords));
    const fresh = hits.find((h) => !taken.has(h.id));
    if (fresh) {
      taken.add(fresh.id);
      return { text, status: "match", caseId: fresh.id, title: fresh.title, note: null };
    }
    if (hits.length) return { text, status: "duplicate", caseId: hits[0].id, title: hits[0].title, note: "You already caught this one." };
    return { text, status: "unverified", caseId: null, title: null, note: "Offline mode can't check this one. Add an AI key to get it judged." };
  });
}

async function classifyWithAI(c: BreakChallenge, cases: string[], opts?: DecideOptions): Promise<CaseResult[]> {
  const criteria: Record<string, Criterion> = {};
  for (const h of c.hiddenCases) criteria[h.id] = { what: `${h.title}: ${h.description}` };
  criteria[NONE] = { what: "None of the listed gaps: a different point, or not a gap at all" };

  const questions: Record<string, JevQuestion> = {};
  cases.forEach((_, i) => {
    questions[`match_${i}`] = { type: "choice", instructions: `Which listed gap in the spec does learner_cases.c${i} describe?`, criteria };
    questions[`valid_${i}`] = {
      type: "noul",
      instructions: `Does learner_cases.c${i} point to a real ${c.huntFor.replace(/s$/, "")} that the spec leaves undefined, ambiguous, or wrong?`,
      criteria: { true: "A real gap: two reasonable readers or engineers could act differently", false: "The spec already answers it, it is off-topic, or it is not a real problem" },
    };
  });

  const state = { spec: c.spec, looking_for: c.huntFor, learner_cases: Object.fromEntries(cases.map((t, i) => [`c${i}`, t])) };
  const answers = await decide(state, questions, opts);

  const taken = new Set<string>();
  return cases.map((text, i) => {
    const m = answers[`match_${i}`];
    const v = answers[`valid_${i}`];
    const label = m.type === "choice" ? m.choice : NONE;
    const p = m.type === "choice" ? (m.probabilities[label] ?? 0) : 0;
    const validP = v.type === "noul" ? v.noul : 0;
    const hidden = c.hiddenCases.find((h) => h.id === label);
    if (hidden && p >= 0.45) {
      if (taken.has(hidden.id)) return { text, status: "duplicate", caseId: hidden.id, title: hidden.title, note: "You already caught this one." };
      taken.add(hidden.id);
      return { text, status: "match", caseId: hidden.id, title: hidden.title, note: null };
    }
    if (validP >= 0.65) return { text, status: "bonus", caseId: null, title: "Bonus find", note: null };
    return { text, status: "invalid", caseId: null, title: null, note: null };
  });
}
