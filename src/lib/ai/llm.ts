import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

/**
 * Generative LLM through any OpenAI-compatible Chat Completions endpoint
 * (OpenAI, OpenRouter, Anthropic's OpenAI-compatible endpoint, Groq, Ollama...).
 */
export interface LLMConfig {
  baseURL: string;
  apiKey: string;
  model: string;
  /** "json_schema" = strict structured output; "json_object" = JSON mode + schema in the prompt. */
  responseFormat: "json_schema" | "json_object";
}

export function llmConfig(env: NodeJS.ProcessEnv = process.env): LLMConfig | null {
  const apiKey = env.LLM_API_KEY?.trim();
  const model = env.LLM_MODEL?.trim();
  if (!apiKey || !model) return null;
  return {
    baseURL: env.LLM_BASE_URL?.trim() || "https://api.openai.com/v1",
    apiKey,
    model,
    responseFormat: env.LLM_RESPONSE_FORMAT === "json_object" ? "json_object" : "json_schema",
  };
}

/** The slice of the OpenAI client we use, so tests can pass a fake. */
export interface ChatClient {
  chat: { completions: { create: OpenAI["chat"]["completions"]["create"] } };
}

let cached: { key: string; client: ChatClient } | null = null;

function getClient(cfg: LLMConfig): ChatClient {
  const key = `${cfg.baseURL}|${cfg.apiKey}`;
  if (!cached || cached.key !== key) {
    cached = { key, client: new OpenAI({ baseURL: cfg.baseURL, apiKey: cfg.apiKey, timeout: 45_000, maxRetries: 1 }) };
  }
  return cached.client;
}

export class LLMOutputError extends Error {}

/** Pulls a JSON object out of a reply, tolerating ``` fences or chatter around it. */
export function extractJSON(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced ? fenced[1] : content).trim();
  try {
    return JSON.parse(body);
  } catch {
    const first = body.indexOf("{");
    const last = body.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(body.slice(first, last + 1));
    throw new LLMOutputError("Reply was not JSON");
  }
}

function isFormatUnsupported(err: unknown): boolean {
  if (!(err instanceof OpenAI.APIError) || (err.status !== 400 && err.status !== 422)) return false;
  return /response_format|json_schema|structured/i.test(err.message);
}

export interface GenerateOptions {
  config?: LLMConfig;
  client?: ChatClient;
  temperature?: number;
}

/**
 * Asks the model for JSON that matches `schema` and validates it.
 * Tries strict json_schema first; if the provider rejects that, falls back to
 * JSON mode with the schema in the prompt. One repair retry on invalid output.
 */
export async function generateJSON<S extends z.ZodType>(
  schema: S,
  name: string,
  system: string,
  user: string,
  opts: GenerateOptions = {},
): Promise<z.infer<S>> {
  const cfg = opts.config ?? llmConfig();
  if (!cfg) throw new Error("LLM is not configured (set LLM_API_KEY and LLM_MODEL)");
  const client = opts.client ?? getClient(cfg);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  const call = async (mode: LLMConfig["responseFormat"]) => {
    const response_format =
      mode === "json_schema" ? zodResponseFormat(schema as never, name) : ({ type: "json_object" } as const);
    const sys =
      mode === "json_schema"
        ? system
        : `${system}\n\nReply with JSON only. It must match this JSON Schema:\n${JSON.stringify(z.toJSONSchema(schema))}`;
    const res = await client.chat.completions.create({
      model: cfg.model,
      messages: [{ role: "system", content: sys }, ...messages.slice(1)],
      response_format,
      temperature: opts.temperature ?? 0.2,
    });
    return res.choices[0]?.message?.content ?? "";
  };

  let mode = cfg.responseFormat;
  let content: string;
  try {
    content = await call(mode);
  } catch (err) {
    if (mode !== "json_schema" || !isFormatUnsupported(err)) throw err;
    mode = "json_object";
    content = await call(mode);
  }

  const first = tryParse(schema, content);
  if (first.ok) return first.value;

  // One repair attempt: show the model its own output and the validation error.
  messages.push({ role: "assistant", content }, { role: "user", content: `That reply was invalid: ${first.error}. Reply again with corrected JSON only.` });
  const retry = tryParse(schema, await call(mode));
  if (retry.ok) return retry.value;
  throw new LLMOutputError(`Model output did not match schema "${name}": ${retry.error}`);
}

function tryParse<S extends z.ZodType>(schema: S, content: string): { ok: true; value: z.infer<S> } | { ok: false; error: string } {
  try {
    const parsed = schema.safeParse(extractJSON(content));
    return parsed.success ? { ok: true, value: parsed.data } : { ok: false, error: z.prettifyError(parsed.error) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
