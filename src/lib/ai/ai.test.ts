import { describe, expect, it, vi } from "vitest";
import OpenAI from "openai";
import { z } from "zod";
import { extractJSON, generateJSON, type ChatClient, type LLMConfig } from "./llm";
import { decide, type JevConfig } from "./jev";

const cfg: LLMConfig = { baseURL: "http://x", apiKey: "k", model: "m", responseFormat: "json_schema" };
const jev: JevConfig = { url: "https://jev.test/decisions", apiKey: "or-key", model: "~typesafe/jev-latest" };

function fakeClient(replies: (string | Error)[]) {
  const create = vi.fn(async () => {
    const r = replies.shift();
    if (r instanceof Error) throw r;
    return { choices: [{ message: { content: r } }] };
  });
  return { client: { chat: { completions: { create } } } as unknown as ChatClient, create };
}

describe("extractJSON", () => {
  it("handles fences and chatter", () => {
    expect(extractJSON('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJSON('Sure! {"a":2} hope that helps')).toEqual({ a: 2 });
  });
});

describe("generateJSON", () => {
  const schema = z.object({ n: z.number() });

  it("uses strict json_schema and validates", async () => {
    const { client, create } = fakeClient(['{"n":3}']);
    await expect(generateJSON(schema, "t", "sys", "user", { config: cfg, client })).resolves.toEqual({ n: 3 });
    const body = (create.mock.calls[0] as unknown[])[0] as { response_format: { type: string } };
    expect(body.response_format.type).toBe("json_schema");
  });

  it("falls back to json_object when the provider rejects json_schema", async () => {
    const err = new OpenAI.BadRequestError(400, { message: "response_format json_schema not supported" }, "response_format json_schema not supported", new Headers());
    const { client, create } = fakeClient([err, '{"n":4}']);
    await expect(generateJSON(schema, "t", "sys", "user", { config: cfg, client })).resolves.toEqual({ n: 4 });
    const second = (create.mock.calls[1] as unknown[])[0] as { response_format: { type: string }; messages: { content: string }[] };
    expect(second.response_format.type).toBe("json_object");
    expect(second.messages[0].content).toContain("JSON Schema");
  });

  it("repairs once, then gives up", async () => {
    const ok = fakeClient(['{"n":"x"}', '{"n":5}']);
    await expect(generateJSON(schema, "t", "s", "u", { config: cfg, client: ok.client })).resolves.toEqual({ n: 5 });
    const bad = fakeClient(["nope", "still nope"]);
    await expect(generateJSON(schema, "t", "s", "u", { config: cfg, client: bad.client })).rejects.toThrow(/did not match/);
  });
});

describe("decide (Jev)", () => {
  it("posts state + questions to the Decisions API and returns typed answers", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ id: "d1", answers: { ok: { type: "noul", noul: 0.91 }, team: { type: "choice", choice: "a", probabilities: { a: 0.8, b: 0.2 }, confidence: 0.7 } } }), { status: 200 }),
    );
    const a = await decide(
      { text: "hi" },
      { ok: { type: "noul", instructions: "ok?" }, team: { type: "choice", instructions: "which?", criteria: { a: "A", b: "B" } } },
      { jev, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(a.ok.noul).toBe(0.91);
    expect(a.team.choice).toBe("a");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(jev.url);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer or-key");
    expect(JSON.parse(init.body as string)).toMatchObject({ model: "~typesafe/jev-latest", state: { text: "hi" } });
  });

  it("throws on HTTP errors and missing answers", async () => {
    const err = vi.fn(async () => new Response("bad", { status: 402 }));
    await expect(decide("s", { q: { type: "noul", instructions: "?" } }, { jev, fetchImpl: err as unknown as typeof fetch })).rejects.toThrow(/402/);
    const missing = vi.fn(async () => new Response(JSON.stringify({ answers: {} }), { status: 200 }));
    await expect(decide("s", { q: { type: "noul", instructions: "?" } }, { jev, fetchImpl: missing as unknown as typeof fetch })).rejects.toThrow(/missing/);
  });

  it("throws when nothing is configured", async () => {
    await expect(decide("s", { q: { type: "noul", instructions: "?" } }, { jev: null, llm: null })).rejects.toThrow(/No decision engine/);
  });
});
