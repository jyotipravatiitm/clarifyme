"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleCheck, CircleX, Lightbulb, Quote, Sparkles } from "lucide-react";
import type { PublicChallenge } from "@/lib/content";
import { RULE_LABELS } from "@/lib/rules";
import { tokenize } from "@/lib/rules/text";
import type { WriteResult } from "@/lib/judge/types";
import { play } from "@/lib/sfx";
import type { Mood } from "@/components/game/Mascot";
import { FeedbackSheet } from "./FeedbackSheet";
import { MarkedText, buildMarkers } from "./MarkedText";
import { BottomPortal } from "./BottomPortal";
import { PromptBubble } from "./PromptBubble";
import type { StepProps } from "./types";

type WritePublic = Extract<PublicChallenge, { kind: "write" }>;

export function WriteStep({ challenge: c, trackId, muted, onMistake, onDone }: StepProps<WritePublic>) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<WriteResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [fails, setFails] = useState(0);
  const [hints, setHints] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const words = tokenize(text).length;
  const budget = c.options.maxTotalWords;
  const mood: Mood = checking ? "think" : result ? (result.pass ? "happy" : "sad") : "idle";

  async function check() {
    if (!text.trim() || checking) return;
    play("tap", muted);
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challengeId: c.id, text }) });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `HTTP ${res.status}`);
      const r: WriteResult = await res.json();
      setResult(r);
      if (r.pass) play("correct", muted);
      else {
        play("wrong", muted);
        setFails((f) => f + 1);
        onMistake();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setChecking(false);
    }
  }

  const markers = result ? buildMarkers(result.issues, result.counterexamples) : [];
  const ruleStatus = (id: string) => (result ? (result.issues.some((i) => i.ruleId === id && i.severity !== "tip") ? "bad" : "good") : "idle");

  return (
    <div className="flex flex-col gap-5">
      <PromptBubble
        mood={mood}
        aside={
          hints > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5 border-t-2 border-dashed border-line pt-3 text-base text-ink-soft">
              {c.hints.slice(0, hints).map((h) => (
                <li key={h} className="flex gap-2">
                  <Lightbulb size={18} className="mt-0.5 shrink-0 text-gold" /> {h}
                </li>
              ))}
            </ul>
          )
        }
      >
        {c.prompt}
      </PromptBubble>

      {c.source && (
        <figure className="rounded-2xl border-2 border-dashed border-line bg-bg-soft px-4 py-3">
          <figcaption className="mb-1 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-ink-soft">
            <Quote size={14} /> Original
          </figcaption>
          <p className="whitespace-pre-wrap text-lg leading-relaxed">{c.source}</p>
        </figure>
      )}

      <ul className="flex flex-wrap gap-2" aria-label="Rules for this challenge">
        {c.rules.map((r) => {
          const s = ruleStatus(r.id);
          return (
            <li
              key={r.id}
              className={`flex items-center gap-1 rounded-full border-2 px-3 py-1 text-sm font-extrabold transition-colors ${
                s === "good" ? "border-good/40 bg-good-bg text-good-text" : s === "bad" ? "border-bad/40 bg-bad-bg text-bad-text" : "border-line text-ink-soft"
              }`}
            >
              {s === "good" ? <CircleCheck size={15} /> : s === "bad" ? <CircleX size={15} /> : null}
              {RULE_LABELS[r.id]}
              {r.id === "totalWords" && budget ? ` ≤ ${budget}` : ""}
              {r.id === "sentenceLength" ? ` ≤ ${c.options.maxWords ?? 20}/sentence` : ""}
            </li>
          );
        })}
      </ul>

      <div className="relative">
        {result ? (
          <div className="card min-h-40 px-4 py-3">
            <MarkedText text={text} markers={markers} />
          </div>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void check();
            }}
            placeholder={c.placeholder ?? "Type your answer..."}
            aria-label="Your answer"
            rows={5}
            maxLength={1500}
            className="block min-h-40 w-full resize-y rounded-2xl border-2 border-line bg-bg-soft px-4 py-3 text-lg leading-relaxed outline-none transition-colors placeholder:text-ink-soft/60 focus:border-brand focus:bg-surface"
            autoFocus
          />
        )}
        <span className={`absolute bottom-3 right-4 text-sm font-extrabold ${budget && words > budget ? "text-bad" : "text-ink-soft"}`}>
          {words}
          {budget ? ` / ${budget}` : ""} words
        </span>
      </div>
      {error && <p className="font-bold text-bad-text">Could not check: {error}</p>}

      {/* bottom bar */}
      <div className="h-24" />
      <BottomPortal>
      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div key="bar" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-line bg-bg">
            <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
              <button type="button" className="btn3d ghost" onClick={() => setHints((h) => Math.min(c.hints.length, h + 1))} disabled={hints >= c.hints.length}>
                <Lightbulb size={18} /> Hint
              </button>
              <button type="button" className={`btn3d ${trackId} ml-auto min-w-40`} onClick={check} disabled={!text.trim() || checking}>
                {checking ? "Reading..." : "Check"}
              </button>
            </div>
          </motion.div>
        ) : result.pass || revealed ? (
          <FeedbackSheet
            key="good"
            tone={result.pass ? "good" : "bad"}
            title={result.pass ? result.headline : "Here's one clear way"}
            stars={result.pass ? result.stars : 0}
            actions={
              <button type="button" className={`btn3d ${result.pass ? "good" : "bad"} min-w-40`} onClick={() => onDone(result.pass ? result.stars : 0)} autoFocus>
                Continue
              </button>
            }
          >
            {result.pass && <p>{result.feedback}</p>}
            {result.pass && <IssueList result={result} />}
            <div className="rounded-xl bg-surface/70 px-3 py-2 text-ink">
              <p className="flex items-center gap-1.5 text-sm font-black uppercase tracking-wider text-ink-soft">
                <Sparkles size={15} /> {result.pass ? "Another clear way to say it" : "Example answer"}
              </p>
              <p className="whitespace-pre-wrap">{c.exampleGood}</p>
            </div>
            <JudgeTag result={result} />
          </FeedbackSheet>
        ) : (
          <FeedbackSheet
            key="bad"
            tone="bad"
            title={result.headline}
            actions={
              <>
                {fails >= 2 && (
                  <button type="button" className="btn3d ghost" onClick={() => setRevealed(true)}>
                    Show me
                  </button>
                )}
                <button
                  type="button"
                  className="btn3d bad min-w-40"
                  onClick={() => {
                    setResult(null);
                    play("tap", muted);
                  }}
                  autoFocus
                >
                  Try again
                </button>
              </>
            }
          >
            <p>{result.feedback}</p>
            {result.counterexamples.length > 0 && (
              <ol className="flex flex-col gap-2">
                {result.counterexamples.map((ce, i) => (
                  <li key={i} className="rounded-xl border-2 border-[var(--thinking)]/30 bg-surface/80 px-3 py-2 text-ink">
                    <p className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--thinking-shade)" }}>
                      {markers.find((m) => m.kind === "ce" && m.start === ce.start) && <span className="mr-1 rounded bg-ink px-1 text-[10px] text-bg">{markers.find((m) => m.kind === "ce" && m.start === ce.start)!.n}</span>}
                      Counterexample
                    </p>
                    <p>
                      <span className="font-black">&ldquo;{ce.quote}&rdquo;</span> could mean: {ce.reading}
                    </p>
                    <p className="text-ink-soft">Picture this: {ce.scenario}</p>
                  </li>
                ))}
              </ol>
            )}
            <IssueList result={result} offset={result.counterexamples.filter((c2) => c2.start !== null).length} />
            {result.rewriteHint && (
              <p className="flex gap-2">
                <Lightbulb size={20} className="shrink-0 text-gold" /> {result.rewriteHint}
              </p>
            )}
            <JudgeTag result={result} />
          </FeedbackSheet>
        )}
      </AnimatePresence>
      </BottomPortal>
    </div>
  );
}

function IssueList({ result, offset = 0 }: { result: WriteResult; offset?: number }) {
  const shown = result.issues.filter((i) => i.end > i.start);
  if (!shown.length) return null;
  return (
    <ol className="flex flex-col gap-1.5">
      {shown.map((i, k) => (
        <li key={k} className="flex gap-2 rounded-xl bg-surface/70 px-3 py-2 text-ink">
          <span className={`mt-0.5 h-fit rounded px-1.5 text-xs font-black text-white ${i.severity === "error" ? "bg-bad" : i.severity === "warn" ? "bg-[var(--gold-shade)]" : "bg-[var(--spec)]"}`}>{k + 1 + offset}</span>
          <span>
            {i.message} {i.suggestion && <span className="text-ink-soft">{i.suggestion}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

function JudgeTag({ result }: { result: WriteResult }) {
  const label = { offline: "Checked offline with rules", jev: "Judged by Jev", llm: "Judged by AI", "jev+llm": "Judged by Jev + AI reader" }[result.mode];
  return (
    <p className="text-xs font-bold opacity-70">
      {label}
      {result.aiError ? " (AI unavailable, used rules)" : ""}
    </p>
  );
}
