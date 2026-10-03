"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleCheck, CircleX, Lightbulb, Quote, Sparkles } from "lucide-react";
import type { PublicChallenge } from "@/lib/content";
import { RULE_LABELS } from "@/lib/rules";
import { tokenize } from "@/lib/rules/text";
import type { WriteResult } from "@/lib/judge/types";
import { track } from "@/lib/analytics";
import { play } from "@/lib/sfx";
import type { Mood } from "@/components/game/Mascot";
import { CounterexampleList, IssueList, JudgeTag, RewriteHint } from "@/components/review/ResultViews";
import { BottomPortal } from "./BottomPortal";
import { FeedbackSheet } from "./FeedbackSheet";
import { Kbd } from "./Kbd";
import { MarkedText, buildMarkers } from "./MarkedText";
import { PromptBubble } from "./PromptBubble";
import { isTyping, postJSON, type StepProps } from "./types";

type WritePublic = Extract<PublicChallenge, { kind: "write" }>;

export function WriteStep({ challenge: c, trackId, muted, sessionId, onMistake, onDone }: StepProps<WritePublic>) {
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

  function hint() {
    if (hints >= c.hints.length) return;
    setHints(hints + 1);
    track("hint_used", { challenge: c.id });
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!result && !isTyping(e) && e.key.toLowerCase() === "h") hint();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function check() {
    if (!text.trim() || checking) return;
    play("tap", muted);
    setChecking(true);
    setError(null);
    try {
      const r = await postJSON<WriteResult>("/api/check", { challengeId: c.id, text, sessionId });
      setResult(r);
      track("answer_check", { kind: "write", challenge: c.id, pass: r.pass, stars: r.stars, mode: r.mode });
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
    <div className="grid gap-5 lg:grid-cols-2 lg:items-start lg:gap-10">
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
      </div>

      <div className="flex flex-col gap-4">
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
            <div className="card min-h-44 px-4 py-3 lg:min-h-64">
              <MarkedText text={text} markers={markers} />
            </div>
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void check();
                }
              }}
              placeholder={c.placeholder ?? "Type your answer..."}
              aria-label="Your answer"
              rows={5}
              maxLength={1500}
              className="block min-h-44 w-full resize-y rounded-2xl border-2 border-line bg-bg-soft px-4 py-3 pb-9 text-lg leading-relaxed outline-none transition-colors placeholder:text-ink-soft/60 focus:border-brand focus:bg-surface lg:min-h-64"
              autoFocus
            />
          )}
          <span className={`absolute bottom-3 right-4 text-sm font-extrabold ${budget && words > budget ? "text-bad" : "text-ink-soft"}`}>
            {words}
            {budget ? ` / ${budget}` : ""} words
          </span>
        </div>
        {error && <p className="font-bold text-bad-text">Could not check: {error}</p>}
      </div>

      <div className="h-24 lg:col-span-2" />
      <BottomPortal>
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div key="bar" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-line bg-bg">
              <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4 lg:max-w-5xl">
                <button type="button" className="btn3d ghost" onClick={hint} disabled={hints >= c.hints.length}>
                  <Lightbulb size={18} /> Hint <Kbd>H</Kbd>
                </button>
                <span className="ml-auto hidden text-sm font-bold text-ink-soft lg:inline">
                  <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd> to check
                </span>
                <button type="button" className={`btn3d ${trackId} ml-auto min-w-40 lg:ml-0`} onClick={check} disabled={!text.trim() || checking}>
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
                  Continue <Kbd>Enter</Kbd>
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
                    Try again <Kbd>Enter</Kbd>
                  </button>
                </>
              }
            >
              <p>{result.feedback}</p>
              <CounterexampleList result={result} markers={markers} />
              <IssueList result={result} />
              <RewriteHint hint={result.rewriteHint} />
              <JudgeTag result={result} />
            </FeedbackSheet>
          )}
        </AnimatePresence>
      </BottomPortal>
    </div>
  );
}
