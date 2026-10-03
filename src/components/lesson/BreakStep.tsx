"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FileText, Lightbulb, Plus, X } from "lucide-react";
import type { PublicChallenge } from "@/lib/content";
import type { BreakResult, CaseResult } from "@/lib/judge/types";
import { track } from "@/lib/analytics";
import { play } from "@/lib/sfx";
import type { Mood } from "@/components/game/Mascot";
import { CaseNote, MissedList, STATUS_STYLE, ScoreLine } from "@/components/review/ResultViews";
import { BottomPortal } from "./BottomPortal";
import { FeedbackSheet } from "./FeedbackSheet";
import { Kbd } from "./Kbd";
import { PromptBubble } from "./PromptBubble";
import { isTyping, postJSON, type StepProps } from "./types";

type BreakPublic = Extract<PublicChallenge, { kind: "break" }>;
const MAX = 15;

export function BreakStep({ challenge: c, trackId, muted, sessionId, onMistake, onDone }: StepProps<BreakPublic>) {
  const [draft, setDraft] = useState("");
  const [cases, setCases] = useState<string[]>([]);
  const [result, setResult] = useState<BreakResult | null>(null);
  const [sheet, setSheet] = useState(false);
  const [checking, setChecking] = useState(false);
  const [hints, setHints] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const one = c.huntFor.replace(/s$/, "");
  const statusByText = new Map<string, CaseResult>((result?.cases ?? []).map((r) => [r.text, r]));
  const mood: Mood = checking ? "think" : sheet && result ? (result.pass ? "cheer" : "sad") : cases.length ? "happy" : "idle";

  function hint() {
    if (hints >= c.hints.length) return;
    setHints(hints + 1);
    track("hint_used", { challenge: c.id });
  }

  function add() {
    const t = draft.trim();
    if (!t || cases.length >= MAX || cases.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    setCases((cs) => [...cs, t]);
    setDraft("");
    play("add", muted);
    input.current?.focus();
  }

  async function check(giveUp = false) {
    if (checking || (!cases.length && !giveUp)) return;
    play("tap", muted);
    setChecking(true);
    setError(null);
    try {
      const r = await postJSON<BreakResult>("/api/break", { challengeId: c.id, cases, giveUp, sessionId });
      setResult(r);
      setSheet(true);
      track("answer_check", { kind: "break", challenge: c.id, pass: r.pass, stars: r.stars, mode: r.mode, caught: r.caught.length, give_up: giveUp });
      if (r.pass) play("correct", muted);
      else if (!giveUp) {
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
      if (sheet) return;
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void check();
      } else if (!isTyping(e) && e.key.toLowerCase() === "h") hint();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const gaveUp = !!result && !result.pass && result.missed.length > 0;

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

        <figure className="relative overflow-hidden rounded-2xl border-2 border-line bg-surface shadow-[0_4px_0_var(--border)] lg:sticky lg:top-24">
          <div className="flex items-center gap-2 border-b-2 border-line bg-bg-soft px-4 py-2 text-xs font-black uppercase tracking-widest text-ink-soft">
            <FileText size={14} /> The {c.huntFor === "corner cases" ? "spec" : "argument"}
            <span className="ml-auto rounded-full px-2 py-0.5 text-white" style={{ background: `var(--${trackId})` }}>
              {c.caseCount} hidden {c.huntFor}
            </span>
          </div>
          <blockquote className="px-4 py-4 font-serif text-xl leading-relaxed">{c.spec}</blockquote>
        </figure>
      </div>

      <div>
        <label htmlFor="case-input" className="mb-2 block text-sm font-black uppercase tracking-widest text-ink-soft">
          Your {c.huntFor} ({cases.length}
          {result ? "" : `, need ${c.minToPass}`})
        </label>
        <div className="flex gap-2">
          <input
            id="case-input"
            ref={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                add();
              }
            }}
            placeholder={`Add a ${one}...`}
            maxLength={300}
            disabled={sheet}
            className="min-w-0 flex-1 rounded-2xl border-2 border-line bg-bg-soft px-4 py-3 text-lg outline-none transition-colors placeholder:text-ink-soft/60 focus:border-brand focus:bg-surface"
            autoFocus
          />
          <button type="button" className={`btn3d ${trackId} px-4`} onClick={add} disabled={!draft.trim() || sheet || cases.length >= MAX} aria-label={`Add ${one}`}>
            <Plus size={22} strokeWidth={3} />
          </button>
        </div>
        <p className="mt-1.5 hidden text-xs font-bold text-ink-soft lg:block">
          <Kbd>Enter</Kbd> adds a {one} · <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd> checks
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {cases.map((t, i) => {
              const r = statusByText.get(t);
              return (
                <motion.li
                  key={t}
                  layout
                  initial={{ opacity: 0, y: -10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 40 }}
                  className={`card flex items-start gap-3 px-3 py-2.5 ${r ? STATUS_STYLE[r.status].card : ""}`}
                >
                  <span className="mt-0.5 shrink-0">{r ? STATUS_STYLE[r.status].icon : <span className="inline-block w-6 text-center font-black text-ink-soft">{i + 1}</span>}</span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words">{t}</p>
                    {r && <CaseNote r={r} />}
                  </div>
                  {!sheet && (
                    <button type="button" onClick={() => setCases((cs) => cs.filter((x) => x !== t))} className="rounded-lg p-1 text-ink-soft hover:bg-bg-soft" aria-label={`Remove: ${t}`}>
                      <X size={18} />
                    </button>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
        {error && <p className="mt-3 font-bold text-bad-text">Could not check: {error}</p>}
      </div>

      <div className="h-24 lg:col-span-2" />
      <BottomPortal>
        <AnimatePresence mode="wait">
          {!sheet || !result ? (
            <motion.div key="bar" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-line bg-bg">
              <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4 lg:max-w-5xl">
                <button type="button" className="btn3d ghost" onClick={hint} disabled={hints >= c.hints.length}>
                  <Lightbulb size={18} /> Hint <Kbd>H</Kbd>
                </button>
                <button type="button" className={`btn3d ${trackId} ml-auto min-w-40`} onClick={() => check()} disabled={!cases.length || checking}>
                  {checking ? "Judging..." : "Check"}
                </button>
              </div>
            </motion.div>
          ) : result.pass || gaveUp ? (
            <FeedbackSheet
              key="done"
              tone={result.pass ? "good" : "bad"}
              title={result.pass ? result.headline : "Here's what was hiding"}
              stars={result.pass ? result.stars : 0}
              actions={
                <button type="button" className={`btn3d ${result.pass ? "good" : "bad"} min-w-40`} onClick={() => onDone(result.pass ? result.stars : 0)} autoFocus>
                  Continue <Kbd>Enter</Kbd>
                </button>
              }
            >
              <ScoreLine result={result} />
              <MissedList missed={result.missed} title={result.pass ? "You missed these" : `The ${c.huntFor}`} />
            </FeedbackSheet>
          ) : (
            <FeedbackSheet
              key="retry"
              tone="bad"
              title={result.headline}
              actions={
                <>
                  <button type="button" className="btn3d ghost" onClick={() => check(true)} disabled={checking}>
                    Show me
                  </button>
                  <button
                    type="button"
                    className="btn3d bad min-w-40"
                    onClick={() => {
                      setSheet(false);
                      setCases((cs) => cs.filter((t) => statusByText.get(t)?.status !== "invalid" && statusByText.get(t)?.status !== "duplicate"));
                      play("tap", muted);
                    }}
                    autoFocus
                  >
                    Keep hunting <Kbd>Enter</Kbd>
                  </button>
                </>
              }
            >
              <ScoreLine result={result} />
              <p>Your catches stay. Cases that were not gaps are cleared so you can try new ones.</p>
            </FeedbackSheet>
          )}
        </AnimatePresence>
      </BottomPortal>
    </div>
  );
}
