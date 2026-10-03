"use client";

import type { Issue } from "@/lib/rules";
import type { Counterexample } from "@/lib/judge/types";

export interface Marker {
  n: number;
  start: number;
  end: number;
  kind: "error" | "warn" | "tip" | "ce";
}

const RANK = { ce: 0, error: 1, warn: 2, tip: 3 } as const;

export function buildMarkers(issues: Issue[], counterexamples: Counterexample[]): Marker[] {
  const markers: Marker[] = [];
  let n = 1;
  for (const ce of counterexamples) if (ce.start !== null && ce.end !== null) markers.push({ n: n++, start: ce.start, end: ce.end, kind: "ce" });
  for (const i of issues) if (i.end > i.start) markers.push({ n: n++, start: i.start, end: i.end, kind: i.severity });
  return markers;
}

/** Renders the answer with highlighted spans and numbered badges that match the feedback list. */
export function MarkedText({ text, markers }: { text: string; markers: Marker[] }) {
  const cuts = new Set([0, text.length]);
  for (const m of markers) {
    cuts.add(Math.max(0, Math.min(text.length, m.start)));
    cuts.add(Math.max(0, Math.min(text.length, m.end)));
  }
  const points = [...cuts].sort((a, b) => a - b);
  const parts: React.ReactNode[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const seg = text.slice(a, b);
    const covering = markers.filter((m) => m.start <= a && m.end >= b).sort((x, y) => RANK[x.kind] - RANK[y.kind]);
    const startsHere = markers.filter((m) => m.start === a);
    if (!covering.length) {
      parts.push(<span key={a}>{seg}</span>);
      continue;
    }
    parts.push(
      <mark key={a} className={`mark-${covering[0].kind}`}>
        {startsHere.map((m) => (
          <sup key={m.n} className="mr-0.5 select-none rounded bg-ink px-1 text-[10px] font-black text-bg">
            {m.n}
          </sup>
        ))}
        {seg}
      </mark>,
    );
  }
  return <p className="whitespace-pre-wrap text-lg leading-9">{parts}</p>;
}
