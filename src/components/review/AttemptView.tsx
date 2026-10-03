"use client";

import { CircleCheck, CircleX } from "lucide-react";
import type { BreakResult, WriteResult } from "@/lib/judge/types";
import { MarkedText, buildMarkers } from "@/components/lesson/MarkedText";
import { CaseResultList, CounterexampleList, IssueList, JudgeTag, MissedList, RewriteHint, ScoreLine } from "./ResultViews";

export interface AttemptData {
  id: string;
  kind: "write" | "break";
  input: { text?: string; cases?: string[]; giveUp?: boolean };
  result: WriteResult | BreakResult;
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
        {a.kind === "write" ? <WriteAttempt text={a.input.text ?? ""} result={a.result as WriteResult} /> : <BreakAttempt result={a.result as BreakResult} giveUp={!!a.input.giveUp} />}
        <JudgeTag result={a.result} />
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
