"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Quote } from "lucide-react";
import type { PublicChallenge } from "@/lib/content";
import type { QuickResult } from "@/lib/judge/types";
import { track } from "@/lib/analytics";
import { play } from "@/lib/sfx";
import type { Mood } from "@/components/game/Mascot";
import { BottomPortal } from "./BottomPortal";
import { FeedbackSheet } from "./FeedbackSheet";
import { Kbd } from "./Kbd";
import { PromptBubble } from "./PromptBubble";
import { isTyping, postJSON, type StepProps } from "./types";

type QuickPublic = Extract<PublicChallenge, { kind: "choice" | "tap" }>;

/**
 * One-tap questions, Duolingo style: pick an option (choice) or tap the fuzzy words (tap),
 * then CHECK. A wrong answer costs a heart and shows the right one; the lesson moves on.
 */
export function QuickStep({ challenge: c, trackId, muted, sessionId, onMistake, onDone }: StepProps<QuickPublic>) {
  const [picked, setPicked] = useState<number | null>(null);
  const [taps, setTaps] = useState<number[]>([]);
  const [result, setResult] = useState<QuickResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = c.kind === "choice" ? picked !== null : taps.length > 0;
  const mood: Mood = checking ? "think" : result ? (result.pass ? "happy" : "sad") : "idle";

  function choose(i: number) {
    if (result) return;
    setPicked(i);
    play("tap", muted);
  }
  function toggle(i: number) {
    if (result) return;
    setTaps((t) => (t.includes(i) ? t.filter((x) => x !== i) : [...t, i]));
    play("tap", muted);
  }

  async function check() {
    if (!ready || checking || result) return;
    setChecking(true);
    setError(null);
    try {
      const r = await postJSON<QuickResult>("/api/answer", { challengeId: c.id, sessionId, ...(c.kind === "choice" ? { choice: picked } : { taps }) });
      setResult(r);
      track("answer_check", { kind: c.kind, challenge: c.id, pass: r.pass, stars: r.stars });
      if (r.pass) play("correct", muted);
      else {
        play("wrong", muted);
        onMistake();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      if (!result && c.kind === "choice" && /^[1-4]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        if (i < c.options.length) choose(i);
      } else if (e.key === "Enter" && !result) {
        e.preventDefault();
        void check();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PromptBubble mood={mood}>{c.prompt}</PromptBubble>

      {c.kind === "choice" && c.source && (
        <figure className="rounded-2xl border-2 border-dashed border-line bg-bg-soft px-4 py-3">
          <figcaption className="mb-1 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-ink-soft">
            <Quote size={14} /> Read this
          </figcaption>
          <p className="text-lg leading-relaxed">{c.source}</p>
        </figure>
      )}

      {c.kind === "choice" ? (
        <ul className="flex flex-col gap-3" role="radiogroup" aria-label="Options">
          {c.options.map((text, i) => {
            const state = optionState(i, picked, result);
            return (
              <li key={i}>
                <motion.button
                  type="button"
                  role="radio"
                  aria-checked={picked === i}
                  onClick={() => choose(i)}
                  whileTap={result ? undefined : { y: 3 }}
                  className={`flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3.5 text-left text-lg font-bold transition-colors ${STATE_STYLE[state]}`}
                  style={{ boxShadow: state === "idle" ? "0 3px 0 var(--border)" : undefined }}
                >
                  <span className="mt-0.5 hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-current text-sm font-black opacity-70 sm:flex">{i + 1}</span>
                  <span className="flex-1">{text}</span>
                </motion.button>
                {result && result.whys && (state === "correct" || state === "wrong") && <p className="mt-1.5 px-2 text-sm font-bold text-ink-soft">{result.whys[i]}</p>}
              </li>
            );
          })}
        </ul>
      ) : (
        <div>
          <p className="mb-3 text-sm font-black uppercase tracking-widest text-ink-soft">
            Tap {c.targetCount === 1 ? "1 word" : `${c.targetCount} words`} · {taps.length} selected
          </p>
          <div className="flex flex-wrap gap-2.5" role="group" aria-label="Words in the sentence">
            {c.tokens.map((w, i) => {
              const s = tapState(i, taps, result);
              return (
                <motion.button
                  key={i}
                  type="button"
                  aria-pressed={taps.includes(i)}
                  onClick={() => toggle(i)}
                  whileTap={result ? undefined : { y: 3 }}
                  className={`rounded-xl border-2 px-3 py-2 text-lg font-bold transition-colors ${TAP_STYLE[s]}`}
                  style={{ boxShadow: s === "idle" ? "0 3px 0 var(--border)" : undefined }}
                >
                  {w}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
      {error && <p className="font-bold text-bad-text">Could not check: {error}</p>}

      <div className="h-24" />
      <BottomPortal>
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div key="bar" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-line bg-bg">
              <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4 lg:max-w-5xl">
                <span className="hidden text-sm font-bold text-ink-soft lg:inline">
                  {c.kind === "choice" ? (
                    <>
                      <Kbd>1</Kbd>–<Kbd>{c.options.length}</Kbd> to pick ·{" "}
                    </>
                  ) : null}
                  <Kbd>Enter</Kbd> to check
                </span>
                <button type="button" className={`btn3d ${ready ? trackId : ""} w-full lg:ml-auto lg:w-auto lg:min-w-48`} onClick={check} disabled={!ready || checking}>
                  {checking ? "Checking..." : "Check"}
                </button>
              </div>
            </motion.div>
          ) : (
            <FeedbackSheet
              key="result"
              tone={result.pass ? "good" : "bad"}
              title={result.headline}
              actions={
                <button type="button" className={`btn3d ${result.pass ? "good" : "bad"} w-full sm:w-auto sm:min-w-48`} onClick={() => onDone(result.stars)} autoFocus>
                  Continue <Kbd>Enter</Kbd>
                </button>
              }
            >
              <p>{result.feedback}</p>
            </FeedbackSheet>
          )}
        </AnimatePresence>
      </BottomPortal>
    </div>
  );
}

type OptionState = "idle" | "picked" | "correct" | "wrong" | "dim";

function optionState(i: number, picked: number | null, r: QuickResult | null): OptionState {
  if (!r) return picked === i ? "picked" : "idle";
  if (i === r.correctIndex) return "correct";
  if (i === r.picked) return "wrong";
  return "dim";
}

const STATE_STYLE: Record<OptionState, string> = {
  idle: "border-line bg-surface hover:bg-bg-soft",
  picked: "border-[var(--spec)] bg-[color-mix(in_srgb,var(--spec)_12%,var(--surface))] text-[var(--spec-shade)]",
  correct: "border-good bg-good-bg text-good-text",
  wrong: "border-bad bg-bad-bg text-bad-text",
  dim: "border-line bg-surface opacity-50",
};

type TapState = "idle" | "picked" | "hit" | "missed" | "extra" | "dim";

function tapState(i: number, taps: number[], r: QuickResult | null): TapState {
  if (!r) return taps.includes(i) ? "picked" : "idle";
  if (r.extra?.includes(i)) return "extra";
  if (r.missed?.includes(i)) return "missed";
  if (r.answer?.includes(i)) return "hit";
  return "dim";
}

const TAP_STYLE: Record<TapState, string> = {
  idle: "border-line bg-surface hover:bg-bg-soft",
  picked: "border-[var(--spec)] bg-[color-mix(in_srgb,var(--spec)_12%,var(--surface))] text-[var(--spec-shade)]",
  hit: "border-good bg-good-bg text-good-text",
  missed: "border-dashed border-bad text-bad-text",
  extra: "border-bad bg-bad-bg text-bad-text line-through",
  dim: "border-transparent bg-transparent text-ink-soft",
};
