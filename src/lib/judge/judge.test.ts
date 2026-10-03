import { describe, expect, it, vi } from "vitest";
import { getChallenge, type BreakChallenge, type WriteChallenge } from "@/lib/content";
import type { JevConfig } from "@/lib/ai/jev";
import type { ChatClient, LLMConfig } from "@/lib/ai/llm";
import { judgeWrite } from "./write";
import { cleanCases, judgeBreak } from "./break";
import { hasKeyword } from "./keywords";

const offline = { decide: { jev: null, llm: null }, llm: { enabled: false } };
const write = (id: string) => getChallenge(id) as WriteChallenge;
const brk = (id: string) => getChallenge(id) as BreakChallenge;

describe("keywords", () => {
  it("matches at word starts and symbols as substrings", () => {
    expect(hasKeyword("The link expires", "expir")).toBe(true);
    expect(hasKeyword("unexpired", "expir")).toBe(false);
    expect(hasKeyword("below 20%", "%")).toBe(true);
  });
});

describe("judgeWrite offline", () => {
  it("passes the example answer with stars", async () => {
    const c = write("w-ears-1");
    const r = await judgeWrite(c, c.exampleGood, offline);
    expect(r.pass).toBe(true);
    expect(r.stars).toBeGreaterThan(0);
    expect(r.mode).toBe("offline");
  });

  it("fails a vague answer and explains", async () => {
    const r = await judgeWrite(write("w-ears-1"), "The door should lock after a while.", offline);
    expect(r.pass).toBe(false);
    expect(r.stars).toBe(0);
    expect(r.issues.some((i) => i.ruleId === "earsTemplate")).toBe(true);
    expect(r.issues.some((i) => i.ruleId === "vagueWords" && i.severity === "error")).toBe(true);
  });

  it("fails an empty answer", async () => {
    const r = await judgeWrite(write("w-ears-1"), "   ", offline);
    expect(r.pass).toBe(false);
    expect(r.headline).toMatch(/Write something/);
  });
});

describe("judgeWrite with Jev + LLM", () => {
  const jev: JevConfig = { url: "https://jev.test", apiKey: "k", model: "jev" };
  const llmCfg: LLMConfig = { baseURL: "http://x", apiKey: "k", model: "m", responseFormat: "json_schema" };

  it("asks the LLM for counterexamples when Jev says it is ambiguous, and highlights the quote", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          answers: {
            clarity: { type: "score", score: 1.1, probabilities: {}, confidence: 0.9 },
            meets_intent: { type: "noul", noul: 0.8 },
            one_reading: { type: "noul", noul: 0.2 },
          },
        }),
      ),
    );
    const create = vi.fn(async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify({
              headline: "Two readings found!",
              counterexamples: [{ quote: "30 seconds", reading: "30 seconds after it opened", scenario: "Someone holds it open; it locks on them." }],
              missing: [],
              rewrite_hint: "Say what starts the timer.",
            }),
          },
        },
      ],
    }));
    const client = { chat: { completions: { create } } } as unknown as ChatClient;
    const text = "After 30 seconds, the door controller shall lock the door.";
    const r = await judgeWrite(write("w-ears-1"), text, { decide: { jev, fetchImpl: fetchImpl as unknown as typeof fetch }, llm: { config: llmCfg, client } });
    expect(r.mode).toBe("jev+llm");
    expect(r.pass).toBe(false);
    expect(r.counterexamples[0].start).toBe(text.indexOf("30 seconds"));
    expect(r.rewriteHint).toBe("Say what starts the timer.");
  });

  it("skips the LLM when Jev says it is crystal clear", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          answers: {
            clarity: { type: "score", score: 2.9, probabilities: {}, confidence: 0.95 },
            meets_intent: { type: "noul", noul: 0.95 },
            one_reading: { type: "noul", noul: 0.95 },
          },
        }),
      ),
    );
    const create = vi.fn();
    const client = { chat: { completions: { create } } } as unknown as ChatClient;
    const c = write("w-ears-1");
    const r = await judgeWrite(c, c.exampleGood, { decide: { jev, fetchImpl: fetchImpl as unknown as typeof fetch }, llm: { config: llmCfg, client } });
    expect(create).not.toHaveBeenCalled();
    expect(r.mode).toBe("jev");
    expect(r.pass).toBe(true);
    expect(r.stars).toBe(3);
  });

  it("falls back to offline checks when the AI call fails", async () => {
    const fetchImpl = vi.fn(async () => new Response("down", { status: 503 }));
    const c = write("w-ears-1");
    const r = await judgeWrite(c, c.exampleGood, { decide: { jev, fetchImpl: fetchImpl as unknown as typeof fetch }, llm: { enabled: false } });
    expect(r.mode).toBe("offline");
    expect(r.aiError).toMatch(/503/);
    expect(r.pass).toBe(true);
  });
});

describe("judgeBreak", () => {
  it("cleans bullets, blanks and duplicates", () => {
    expect(cleanCases(["- a", "1. b", "", "A", "  "])).toEqual(["a", "b"]);
  });

  it("matches offline by keywords and hides missed cases on a fail", async () => {
    const r = await judgeBreak(brk("s-break-reset"), ["How long until the link expires?", "What if the email is not registered?", "what is the meaning of life"], false, offline);
    expect(r.caught.sort()).toEqual(["expiry-time", "unknown-email"]);
    expect(r.cases[2].status).toBe("unverified");
    expect(r.pass).toBe(false);
    expect(r.missed).toEqual([]);
  });

  it("reveals missed cases when the learner gives up", async () => {
    const r = await judgeBreak(brk("s-break-reset"), ["How long until the link expires?"], true, offline);
    expect(r.missed.length).toBe(r.total - 1);
  });

  it("passes with enough catches and marks duplicates", async () => {
    const r = await judgeBreak(
      brk("s-break-reset"),
      ["The link expires after how many hours?", "Expiry time is undefined", "Email not registered?", "Request a reset twice: does the old link work?", "Can the link be used twice?"],
      false,
      offline,
    );
    expect(r.cases[1].status).toBe("duplicate");
    expect(r.caught.length).toBe(4);
    expect(r.pass).toBe(true);
    expect(r.missed.length).toBe(r.total - 4);
  });

  it("uses Jev choice + noul answers", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          answers: {
            match_0: { type: "choice", choice: "sessions", probabilities: { sessions: 0.9, none: 0.1 }, confidence: 0.9 },
            valid_0: { type: "noul", noul: 0.95 },
            match_1: { type: "choice", choice: "none", probabilities: { none: 0.9 }, confidence: 0.9 },
            valid_1: { type: "noul", noul: 0.9 },
            match_2: { type: "choice", choice: "none", probabilities: { none: 0.95 }, confidence: 0.95 },
            valid_2: { type: "noul", noul: 0.1 },
          },
        }),
      ),
    );
    const r = await judgeBreak(brk("s-break-reset"), ["Do my other devices get logged out?", "Is the link sent over HTTPS only?", "The link is blue"], false, {
      decide: { jev: { url: "https://jev.test", apiKey: "k", model: "jev" }, fetchImpl: fetchImpl as unknown as typeof fetch },
      llm: { enabled: false },
    });
    expect(r.mode).toBe("jev");
    expect(r.cases.map((c) => c.status)).toEqual(["match", "bonus", "invalid"]);
    expect(r.bonus).toBe(1);
  });
});
