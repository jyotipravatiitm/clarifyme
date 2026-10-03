# ClarifyMe

Bite-size games that train **clear writing** and **clear thinking**, in the playful style of language-learning apps.

If a sentence can mean two things, someone will read the other one. ClarifyMe makes you practice until it can't.

## Two kinds of challenge

| | What you do | How it is judged |
|---|---|---|
| **Write it** | Write 1–2 lines for a small task, e.g. "write an EARS requirement for an auto-locking door". | Fast **rules** flag vague words, passive voice, "and/or", unclear pronouns, missing *must/shall*, broken EARS templates, word budgets and non-simple words. Then an **adversarial AI reader** tries to misread you on purpose and shows a **counterexample**. |
| **Break it** | Read a loose spec (password reset, refund policy...) or argument, and list the corner cases or hidden assumptions. | Each case is matched against a hidden list ("You caught 5/8"). Valid cases outside the list count as **bonus finds**. The ones you missed are revealed once you pass. |

There are three tracks: **Writing** (ASD-STE100, plain language, BLUF, EARS), **Thinking** (claims, hidden assumptions, steelmanning) and **Spec** (corner cases, TLA+-style invariants). You also get XP, a daily goal, a streak, 3 hearts per lesson, stars, and Clara the speech-bubble mascot.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

It works **without any API key**: rules plus keyword matching (the "Offline judge"). Add keys for the full AI judge:

```bash
cp .env.example .env.local
```

## AI setup

ClarifyMe uses two kinds of model, and each is optional.

### 1. Generative LLM: any OpenAI-compatible endpoint

The generative LLM writes counterexamples, rewrite hints and coaching notes. It uses the `openai` SDK's Chat Completions API, so you can point it at any compatible provider:

| Provider | `LLM_BASE_URL` |
|---|---|
| OpenAI | `https://api.openai.com/v1` |
| OpenRouter (any model) | `https://openrouter.ai/api/v1` |
| Anthropic (Claude) | `https://api.anthropic.com/v1/` |
| Ollama (local) | `http://localhost:11434/v1` |

Set `LLM_API_KEY` and `LLM_MODEL` too. Answers are requested as strict JSON Schema (`response_format: json_schema`, generated from Zod schemas). If the provider rejects that, the app retries in JSON mode with the schema in the prompt, then validates the reply and repairs it once. To always use JSON mode, set `LLM_RESPONSE_FORMAT=json_object`.

### 2. Jev: fast typed decisions (TypeSafe, via OpenRouter)

[Jev](https://openrouter.ai/docs/guides/community/jev) is a *decision model*, not a chat model. It answers typed questions about a `state` with calibrated probabilities:

- `noul`: yes/no probability.
- `choice`: pick a label.
- `score`: a position on an ordered scale.

TypeSafe says it is 20–200× faster than an LLM. ClarifyMe uses it for the verdicts and keeps the LLM for the words:

| Where | Jev question |
|---|---|
| Write it | `score` clarity (unclear → crystal clear), `noul` meets intent, `noul` only one reading |
| Break it | per case: `choice` over hidden case ids + `none`, `noul` "is this a real gap?" |

The LLM is called only when Jev says the answer is not clear, so good answers come back fast and cost almost nothing. Set `OPENROUTER_API_KEY` to turn on Jev. Without it, the same typed questions go to the LLM (`decide()` in `src/lib/ai/jev.ts`).

The request shape is `POST https://openrouter.ai/api/alpha/decisions` with `{ model, state, questions }`. Keys stay on the server, and the learner's text is always passed as data.

## Project layout

```
src/
  app/                    pages (home path, /lesson/[id], /about) and API routes (/api/check, /api/break)
  components/game/        Mascot, PathMap, TopBar, icons
  components/lesson/      LessonRunner, WriteStep, BreakStep, FeedbackSheet, CompleteScreen
  content/                tracks.json + challenges/*.json  ← add new challenges here
  lib/rules/              deterministic clarity rules
  lib/ai/                 OpenAI-compatible LLM client, Jev client
  lib/judge/              combines rules + Jev + LLM into a verdict, stars and feedback
  lib/progress.ts         XP / streak / stars in localStorage
scripts/smoke.mjs         end-to-end browser test with screenshots
```

### Adding a challenge

Add an object to `src/content/challenges/*.json` and reference its `id` in a lesson in `src/content/tracks.json`. The Zod schema in `src/lib/content.ts` documents every field.

- **Write** challenges need:
  - a hidden `intent` (what a correct answer must mean);
  - `rules`;
  - `mustMention` keyword groups for offline checks;
  - `hints`;
  - an `exampleGood`.
- **Break** challenges need `hiddenCases`, each with `keywords` groups for offline matching.

`npm test` checks that every example answer passes its own rules and that every hidden case matches its own keywords.

## Scripts

```bash
npm test           # unit tests (rules, content, AI clients with mocks, judges, progress)
npm run lint
npm run typecheck
npm run build && PORT=3000 npm start
BASE_URL=http://localhost:3000 npm run e2e   # Playwright smoke test, writes screenshots/
```

## Inspiration

- **Controlled languages**: ASD-STE100, EARS, Attempto Controlled English, RFC 2119, Plain Language, Up-Goer Five.
- **Specification**: TLA+, P, Alloy, Quint, Dafny.
- **Thinking**: Toulmin, Argdown, the Pyramid Principle, BLUF.
- **Prose linters**: Vale, proselint, write-good.

See `/about` in the app for links.

## Roadmap ideas

- Swap the SVG mascot for a Rive state machine (the `mood` prop maps 1:1 to state-machine inputs).
- Accounts and a server database for progress across devices, plus leaderboards.
- More drills: argument maps (Toulmin/Argdown), "explain to a 10-year-old", TLA+/Quint invariants checked by a real model checker.
