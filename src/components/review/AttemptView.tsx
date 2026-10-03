"use client";

import { CircleCheck, CircleX } from "lucide-react";
import type { BreakResult, QuickResult, WriteResult } from "@/lib/judge/types";
import { MarkedText, buildMarkers } from "@/components/lesson/MarkedText";
import { CaseResultList, CounterexampleList, IssueList, JudgeTag, MissedList, RewriteHint, ScoreLine } from "./ResultViews";

export interface AttemptData {
  id: string;
  kind: "write" | "break" | "choice" | "tap";
  input: { text?: string; cases?: string[]; giveUp?: boolean; choice?: number; taps?: number[] };
  result: WriteResult | BreakResult | QuickResult;
  pass: boolean;
  stars: number;
  createdAt: string;
}

/** One past Check, re-rendered exactly like the live feedback. */
export function AttemptView({ a, n }: { a: AttemptData; n: number }) {
  const time = new Date(a.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return (
    <article className={`card overflow-hidden ${a.pass ? "!border-good/50" : "!border-bad/40"}`}>
      <header className={`flex items-center gap-2 px-4 py-2 font-black ${a.pass ? "bg-good-bg text-good-text" : "bg-bad-bg text-bad-text"}`}>
        {a.pass ? <CircleCheck size={20} /> : <CircleX size={20} />}
        Try {n}: {a.result.headline}
        <span className="ml-auto text-xs font-bold opacity-70">{time}</span>
      </header>
      <div className="flex flex-col gap-3 px-4 py-3">
        {a.kind === "write" ? (
          <WriteAttempt text={a.input.text ?? ""} result={a.result as WriteResult} />
        ) : a.kind === "break" ? (
          <BreakAttempt result={a.result as BreakResult} giveUp={!!a.input.giveUp} />
        ) : (
          <QuickAttempt result={a.result as QuickResult} />
        )}
        {(a.kind === "write" || a.kind === "break") && <JudgeTag result={a.result as WriteResult | BreakResult} />}
      </div>
    </article>
  );
}

function WriteAttempt({ text, result }: { text: string; result: WriteResult }) {
  const markers = buildMarkers(result.issues, result.counterexamples);
  return (
    <>
      <div className="rounded-xl bg-bg-soft px-3 py-2">
        <MarkedText text={text} markers={markers} />
      </div>
      <p className="font-bold text-ink-soft">{result.feedback}</p>
      <CounterexampleList result={result} markers={markers} />
      <IssueList result={result} />
      <RewriteHint hint={result.rewriteHint} />
    </>
  );
}

function BreakAttempt({ result, giveUp }: { result: BreakResult; giveUp: boolean }) {
  return (
    <>
      <ScoreLine result={result} />
      <CaseResultList cases={result.cases} />
      <MissedList missed={result.missed} title={giveUp ? "Revealed" : "Missed"} />
    </>
  );
}

function QuickAttempt({ result }: { result: QuickResult }) {
  if (result.kind === "choice") {
    return (
      <>
        <ul className="flex flex-col gap-1.5">
          {(result.options ?? []).map((text, i) => {
            const correct = i === result.correctIndex;
            const wrong = i === result.picked && !correct;
            return (
              <li
                key={i}
                className={`rounded-xl border-2 px-3 py-2 font-bold ${correct ? "border-good bg-good-bg text-good-text" : wrong ? "border-bad bg-bad-bg text-bad-text" : "border-line opacity-60"}`}
              >
                {text}
                {i === result.picked && <span className="ml-2 text-xs font-black uppercase tracking-wider opacity-70">your answer</span>}
              </li>
            );
          })}
        </ul>
        <p className="font-bold text-ink-soft">{result.feedback}</p>
      </>
    );
  }
  return (
    <>
      <p className="flex flex-wrap gap-1.5">
        {(result.tokens ?? []).map((w, i) => {
          const cls = result.extra?.includes(i)
            ? "border-bad bg-bad-bg text-bad-text line-through"
            : result.missed?.includes(i)
              ? "border-dashed border-bad text-bad-text"
              : result.answer?.includes(i)
                ? "border-good bg-good-bg text-good-text"
                : "border-transparent text-ink-soft";
          return (
            <span key={i} className={`rounded-lg border-2 px-2 py-0.5 font-bold ${cls}`}>
              {w}
            </span>
          );
        })}
      </p>
      <p className="font-bold text-ink-soft">{result.feedback}</p>
    </>
  );
}
