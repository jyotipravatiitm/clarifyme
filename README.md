# ClarifyMe

[![CI & Deploy](https://github.com/jyotipravatiitm/clarifyme/actions/workflows/ci-deploy.yml/badge.svg)](https://github.com/jyotipravatiitm/clarifyme/actions/workflows/ci-deploy.yml)

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

With no configuration it runs fully anonymous, with rules plus keyword matching (the "Offline judge"). Each integration below switches on when its env vars are set. See `.env.example`.

| Feature | Needs | Without it |
|---|---|---|
| AI judging | `LLM_*` and/or `OPENROUTER_API_KEY` | Rules + keyword matching |
| Accounts, free-lesson trial, session review | Clerk keys + `DATABASE_URL` | Anonymous; progress stays in the browser |
| Google Analytics + cookie banner | `NEXT_PUBLIC_GA_ID` | No analytics, no banner |

## Works on phone and desktop

- **Phone and tablet**: top bar with streak/XP, a bottom tab bar (Learn / Review / About), and bottom feedback sheets.
- **Desktop browsers (≥1024px)**: a left sidebar for navigation and your account, the lesson path in the middle, and from 1280px a right rail with the streak, XP, daily goal and free-lesson card. Lessons use two columns: the task or spec on the left, your answer on the right.
- **Keyboard**:

  | Key | Action |
  |---|---|
  | `Ctrl/⌘ + Enter` | Check |
  | `Enter` | Continue / try again |
  | `Enter` (in Break it) | Add a case |
  | `H` | Hint |
  | `Esc` | Quit the lesson |

## Accounts, free trial and session review (Clerk + PostgreSQL)

- **Guests** can play `FREE_LESSONS` lessons (default **10**) without an account. The count is kept **on the server**, per browser (`cm_anon` cookie). When a guest starts lesson 11, a friendly gate asks them to create a free account. A lesson that is already running is never interrupted.
- **On sign-up/sign-in**, the guest's sessions move to the account automatically, so nothing is lost. Progress (XP, streak, stars) is merged and synced across devices.
- **Review** (`/history`) lists every lesson session. Opening one shows each answer the learner checked, re-rendered with the same highlights, counterexamples, rule notes and case verdicts they saw live.
- **Privacy** (`/privacy`) explains what is stored. Signed-in users can delete all of their saved data there.
- When a database is set, the judging API only accepts requests that belong to an in-progress session owned by the caller, so the free-lesson limit cannot be skipped by calling the API directly. Requests are also rate limited (`RATE_LIMIT_PER_MINUTE`).

Clerk setup:
1. Create an application at [dashboard.clerk.com](https://dashboard.clerk.com) and turn on the sign-in methods you want (email, Google...).
2. Copy the keys into `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
3. For production, create a Clerk **production instance** for your domain and add the DNS records Clerk shows you.

Database: PostgreSQL via [Drizzle ORM](https://orm.drizzle.team). The schema is in `src/db/schema.ts` and the SQL migrations are in `drizzle/`. Migrations run automatically when the server boots. After changing the schema, run `npm run db:generate`.

## Google Analytics and cookies

Set `NEXT_PUBLIC_GA_ID=G-XXXXXXX` to load GA4 with Google Consent Mode v2.

- **Default (`NEXT_PUBLIC_GA_CONSENT=opt-out`)**: analytics is on, and a cookie banner on the first visit lets people **opt out**. Opting out disables GA and deletes the `_ga` cookies. "Cookie settings" in the side rail or on `/privacy` reopens the banner.
- **`opt-in`**: analytics stays off until the visitor allows it. Use this if you have EU/UK visitors, because GDPR requires opt-in consent for analytics cookies.

Events sent: `lesson_start`, `answer_check` (kind, pass, stars, judge mode), `lesson_complete`, `lesson_failed`, `hint_used`, `trial_gate_shown`, `sign_up_click`, `cookie_opt_out`. Answer text is never sent to Google, and advertising signals are always denied.

## Deploy to your VPS

**Automatic:** every push to the default branch is tested and deployed by GitHub Actions (`.github/workflows/ci-deploy.yml`). One-time setup takes about 5 minutes: **[DEPLOY.md](DEPLOY.md)**. The manual steps below still work.

The stack is one `docker compose` file: the app (Next.js standalone, non-root), **PostgreSQL 17**, **Caddy** (automatic HTTPS) and **nightly `pg_dump` backups** to `./backups`. Only ports 80 and 443 are exposed.

```bash
# on the VPS (Docker + compose plugin installed), with DNS A/AAAA records pointing at it
git clone <this repo> clarifyme && cd clarifyme
cp .env.example .env
nano .env        # DOMAIN, POSTGRES_PASSWORD, Clerk keys, GA id, AI keys
docker compose up -d --build
docker compose logs -f app        # "[db] migrations applied" then "Ready"
curl https://$DOMAIN/api/health   # {"ok":true,"db":"up"}
```

| Task | Command |
|---|---|
| Update | `git pull && docker compose up -d --build` |
| Restore a backup | `gunzip -c backups/daily/<file>.sql.gz \| docker compose exec -T db psql -U clarifyme clarifyme` |
| Inspect data | `docker compose exec db psql -U clarifyme clarifyme` |

The rate limiter keeps its counters in memory, so run a single `app` container (fine for one VPS). Add Redis before scaling out.

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
  app/                    pages (/, /lesson/[id], /history, /privacy, /about, /sign-in, /sign-up) + API routes
  proxy.ts                Clerk session handling (Next 16 "proxy", formerly middleware)
  instrumentation.ts      runs DB migrations on boot
  components/shell/       AppShell (sidebar, rail, tab bar), StatsRail
  components/game/        Mascot, PathMap, TopBar, icons
  components/lesson/      LessonRunner, WriteStep, BreakStep, FeedbackSheet, CompleteScreen
  components/review/      history list, attempt replay, shared result views
  components/auth/        Clerk provider, account button, trial gate, delete-data
  components/analytics/   GA4 loader + cookie banner
  content/                tracks.json + challenges/*.json  ← add new challenges here
  db/                     Drizzle schema, client, migrator
  server/                 actor (user / guest), sessions repository, trial, rate limit
  lib/rules/              deterministic clarity rules
  lib/ai/                 OpenAI-compatible LLM client, Jev client
  lib/judge/              combines rules + Jev + LLM into a verdict, stars and feedback
  lib/progress*.ts        XP / streak / stars (browser store + server sync)
drizzle/                  SQL migrations
Dockerfile, docker-compose.yml, Caddyfile
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
npm test           # unit tests (rules, content, AI clients with mocks, judges, progress, consent)
TEST_DATABASE_URL=postgres://localhost/clarifyme_test npm test   # also runs the Postgres repository tests
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
- Leaderboards and friends, now that accounts exist.
- More drills: argument maps (Toulmin/Argdown), "explain to a 10-year-old", TLA+/Quint invariants checked by a real model checker.
