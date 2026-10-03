"use client";

import { motion } from "motion/react";
import { CircleCheck, CircleHelp, CircleX, Copy, Lightbulb, Sparkles } from "lucide-react";
import type { BreakResult, CaseResult, WriteResult } from "@/lib/judge/types";
import type { Marker } from "@/components/lesson/MarkedText";

/** Counterexamples from the adversarial reader, numbered to match the marks in the answer. */
export function CounterexampleList({ result, markers }: { result: WriteResult; markers: Marker[] }) {
  if (!result.counterexamples.length) return null;
  return (
    <ol className="flex flex-col gap-2">
      {result.counterexamples.map((ce, i) => {
        const n = markers.find((m) => m.kind === "ce" && m.start === ce.start)?.n;
        return (
          <li key={i} className="rounded-xl border-2 bg-surface/80 px-3 py-2 text-ink" style={{ borderColor: "color-mix(in srgb, var(--thinking) 30%, transparent)" }}>
            <p className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--thinking-shade)" }}>
              {n && <span className="mr-1 rounded bg-ink px-1 text-[10px] text-bg">{n}</span>}
              Counterexample
            </p>
            <p>
              <span className="font-black">&ldquo;{ce.quote}&rdquo;</span> could mean: {ce.reading}
            </p>
            <p className="text-ink-soft">Picture this: {ce.scenario}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function IssueList({ result }: { result: WriteResult }) {
  const offset = result.counterexamples.filter((c) => c.start !== null).length;
  const shown = result.issues.filter((i) => i.end > i.start);
  if (!shown.length) return null;
  return (
    <ol className="flex flex-col gap-1.5">
      {shown.map((i, k) => (
        <li key={k} className="flex gap-2 rounded-xl bg-surface/70 px-3 py-2 text-ink">
          <span
            className="mt-0.5 h-fit rounded px-1.5 text-xs font-black text-white"
            style={{ background: i.severity === "error" ? "var(--bad)" : i.severity === "warn" ? "var(--gold-shade)" : "var(--spec)" }}
          >
            {k + 1 + offset}
          </span>
          <span>
            {i.message} {i.suggestion && <span className="text-ink-soft">{i.suggestion}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function RewriteHint({ hint }: { hint: string | null }) {
  if (!hint) return null;
  return (
    <p className="flex gap-2">
      <Lightbulb size={20} className="shrink-0 text-gold" /> {hint}
    </p>
  );
}

const JUDGE_LABEL = { offline: "Checked offline with rules", jev: "Judged by Jev", llm: "Judged by AI", "jev+llm": "Judged by Jev + AI reader" } as const;

export function JudgeTag({ result }: { result: WriteResult | BreakResult }) {
  return (
    <p className="text-xs font-bold opacity-70">
      {JUDGE_LABEL[result.mode]}
      {result.aiError ? " (AI unavailable, used rules)" : ""}
    </p>
  );
}

export function ScoreLine({ result }: { result: BreakResult }) {
  const pct = Math.round((result.caught.length / result.total) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="h-4 flex-1 overflow-hidden rounded-full" style={{ background: "color-mix(in srgb, var(--text) 10%, transparent)" }}>
        <motion.div className="h-full rounded-full bg-gold" initial={{ width: "0%" }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }} style={{ minWidth: pct ? 8 : 0 }} />
      </div>
      <span className="shrink-0 font-black text-ink">
        {result.caught.length}/{result.total}
        {result.bonus ? ` +${result.bonus} bonus` : ""}
      </span>
    </div>
  );
}

export const STATUS_STYLE: Record<CaseResult["status"], { label: string; icon: React.ReactNode; card: string }> = {
  match: { label: "Caught", icon: <CircleCheck size={24} className="fill-good text-good-bg" />, card: "!border-good/50 !bg-good-bg" },
  bonus: { label: "Bonus find", icon: <Sparkles size={24} className="text-gold" />, card: "!border-gold/60" },
  invalid: { label: "Not a gap", icon: <CircleX size={24} className="fill-bad text-bad-bg" />, card: "!border-bad/40 !bg-bad-bg" },
  duplicate: { label: "Already caught", icon: <Copy size={22} className="text-ink-soft" />, card: "opacity-70" },
  unverified: { label: "Not checked", icon: <CircleHelp size={24} className="text-ink-soft" />, card: "border-dashed" },
};

export function CaseNote({ r }: { r: CaseResult }) {
  if (!r.title && !r.note) return <p className="text-sm font-extrabold opacity-80">{STATUS_STYLE[r.status].label}</p>;
  return (
    <p className="text-sm font-extrabold opacity-80">
      <span>{sentence(`${STATUS_STYLE[r.status].label}${r.title ? `: ${r.title}` : ""}`)} </span>
      {r.note}
    </p>
  );
}

/** Adds a full stop unless the text already ends in punctuation. */
function sentence(t: string): string {
  return /[.?!'"’”]$/.test(t) ? t : `${t}.`;
}

/** Read-only list of judged cases (used in history). */
export function CaseResultList({ cases }: { cases: CaseResult[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {cases.map((r, i) => (
        <li key={i} className={`card flex items-start gap-3 px-3 py-2.5 ${STATUS_STYLE[r.status].card}`}>
          <span className="mt-0.5 shrink-0">{STATUS_STYLE[r.status].icon}</span>
          <div className="min-w-0 flex-1">
            <p className="break-words">{r.text}</p>
            <CaseNote r={r} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function MissedList({ missed, title }: { missed: BreakResult["missed"]; title: string }) {
  if (!missed.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-black uppercase tracking-wider opacity-80">{title}</p>
      {missed.map((m) => (
        <div key={m.id} className="rounded-xl bg-surface/70 px-3 py-2 text-ink">
          <span className="font-black">{sentence(m.title)}</span> {m.description}
        </div>
      ))}
    </div>
  );
}
