"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Clock, HeartCrack, Star } from "lucide-react";
import { Icon } from "@/components/game/Icon";

export interface HistoryItem {
  id: string;
  lessonTitle: string;
  icon: string;
  trackId: string;
  trackTitle: string;
  status: "in_progress" | "completed" | "failed";
  stars: number | null;
  xp: number | null;
  attemptCount: number;
  startedAt: string;
  completedAt: string | null;
}

function dayLabel(d: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export function HistoryList({ items }: { items: HistoryItem[] }) {
  const [filter, setFilter] = useState<string>("all");
  const tracks = [...new Map(items.map((i) => [i.trackId, i.trackTitle])).entries()];
  const groups = useMemo(() => {
    const out = new Map<string, HistoryItem[]>();
    for (const it of items) {
      if (filter !== "all" && it.trackId !== filter) continue;
      const key = dayLabel(new Date(it.startedAt));
      out.set(key, [...(out.get(key) ?? []), it]);
    }
    return [...out.entries()];
  }, [items, filter]);

  return (
    <div className="flex flex-col gap-6">
      {tracks.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by track">
          {[["all", "All"] as const, ...tracks].map(([id, title]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              aria-pressed={filter === id}
              className="rounded-full border-2 px-3 py-1 text-sm font-extrabold transition-colors"
              style={filter === id ? { borderColor: id === "all" ? "var(--brand)" : `var(--${id})`, color: id === "all" ? "var(--brand-shade)" : `var(--${id}-shade)` } : { borderColor: "var(--border)", color: "var(--text-soft)" }}
            >
              {title}
            </button>
          ))}
        </div>
      )}
      {groups.map(([day, list]) => (
        <section key={day}>
          <h2 className="mb-2 text-sm font-black uppercase tracking-widest text-ink-soft">{day}</h2>
          <ul className="flex flex-col gap-2">
            {list.map((it) => {
              const mins = it.completedAt ? Math.max(1, Math.round((+new Date(it.completedAt) - +new Date(it.startedAt)) / 60000)) : null;
              return (
                <li key={it.id}>
                  <Link href={`/history/${it.id}`} className="card flex items-center gap-4 px-4 py-3 transition-colors hover:bg-bg-soft">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white" style={{ background: `var(--${it.trackId})`, boxShadow: `0 3px 0 var(--${it.trackId}-shade)` }}>
                      <Icon name={it.icon} size={22} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-black">{it.lessonTitle}</p>
                      <p className="flex flex-wrap items-center gap-x-3 text-sm font-bold text-ink-soft">
                        <span>{it.trackTitle}</span>
                        <span>{it.attemptCount} check{it.attemptCount === 1 ? "" : "s"}</span>
                        {mins && (
                          <span className="inline-flex items-center gap-1">
                            <Clock size={13} /> {mins} min
                          </span>
                        )}
                        {it.xp ? <span style={{ color: "var(--gold-shade)" }}>+{it.xp} XP</span> : null}
                      </p>
                    </div>
                    {it.status === "completed" ? (
                      <span className="flex gap-0.5" aria-label={`${it.stars ?? 0} stars`}>
                        {[0, 1, 2].map((s) => (
                          <Star key={s} size={18} strokeWidth={2.5} className={s < (it.stars ?? 0) ? "fill-gold text-gold" : "text-line"} />
                        ))}
                      </span>
                    ) : it.status === "failed" ? (
                      <span className="flex items-center gap-1 text-sm font-extrabold text-heart">
                        <HeartCrack size={18} /> Out of hearts
                      </span>
                    ) : (
                      <span className="text-sm font-extrabold text-ink-soft">Unfinished</span>
                    )}
                    <ChevronRight size={20} className="text-ink-soft" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
