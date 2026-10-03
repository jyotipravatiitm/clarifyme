"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, Bot, WifiOff, X } from "lucide-react";
import type { Track } from "@/lib/content";
import { setTrack, useProgress, type TrackId } from "@/lib/progress";
import { AppShell } from "@/components/shell/AppShell";
import { QuestsCard, TrialCard } from "@/components/shell/StatsRail";
import { Icon } from "./Icon";
import { Mascot } from "./Mascot";
import { PathMap, type LessonMeta } from "./PathMap";

export function LearnClient({ tracks, meta, aiLabel, aiOn }: { tracks: Track[]; meta: Record<string, LessonMeta>; aiLabel: string; aiOn: boolean }) {
  const progress = useProgress();
  const trackId: TrackId = progress.track ?? "writing";
  const track = tracks.find((t) => t.id === trackId) ?? tracks[0];
  const [unitIndex, setUnitIndex] = useState(0);
  const [guide, setGuide] = useState(false);
  const pathRef = useRef<HTMLDivElement>(null);

  // The sticky banner shows the unit currently in view, like Duolingo's section header.
  useEffect(() => {
    const sections = pathRef.current?.querySelectorAll<HTMLElement>("section[data-unit]");
    if (!sections?.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setUnitIndex(Number((visible[0].target as HTMLElement).dataset.unit));
      },
      { rootMargin: "-140px 0px -55% 0px" },
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [track.id]);

  const unit = track.units[Math.min(unitIndex, track.units.length - 1)];
  const lessons = track.units.flatMap((u) => u.lessons);
  const doneCount = lessons.filter((l) => progress.completed[l.id]).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-xl">
        <nav aria-label="Courses" className="mb-4 flex gap-2">
          {tracks.map((t) => {
            const active = t.id === track.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTrack(t.id);
                  setUnitIndex(0);
                  window.scrollTo({ top: 0 });
                }}
                aria-pressed={active}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 px-2 py-2 text-sm font-extrabold transition-colors"
                style={
                  active
                    ? { borderColor: `var(--${t.id})`, background: `color-mix(in srgb, var(--${t.id}) 12%, var(--surface))`, color: `var(--${t.id}-shade)` }
                    : { borderColor: "var(--border)", color: "var(--text-soft)" }
                }
              >
                <Icon name={t.id} size={20} /> {t.title}
              </button>
            );
          })}
        </nav>

        {/* sticky unit banner */}
        <div className="sticky top-16 z-20 -mx-1 mb-8 px-1 pt-1 lg:top-0 lg:pt-6">
          <motion.div
            key={`${track.id}-${unit.id}`}
            initial={{ opacity: 0.6, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-2xl px-5 py-4 text-white"
            style={{ background: `var(--${track.id})`, boxShadow: `0 4px 0 var(--${track.id}-shade)` }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold uppercase tracking-widest opacity-80">
                {track.title} · Unit {unitIndex + 1}
              </p>
              <h1 className="truncate text-2xl font-black">{unit.title}</h1>
            </div>
            <button
              type="button"
              onClick={() => setGuide(true)}
              className="flex shrink-0 items-center gap-2 rounded-xl border-2 border-white/40 px-3 py-2 text-sm font-black uppercase tracking-wider hover:bg-white/10"
            >
              <BookOpen size={18} /> <span className="hidden sm:inline">Guidebook</span>
            </button>
          </motion.div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:hidden">
          <QuestsCard compact />
          <TrialCard />
        </div>

        <div ref={pathRef}>
          <PathMap track={track} progress={progress} meta={meta} muted={progress.muted} />
        </div>

        <footer className="mt-16 flex flex-col items-center gap-2 text-center text-sm font-bold text-ink-soft">
          <p>
            {doneCount}/{lessons.length} lessons done in {track.title}
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-soft px-3 py-1">
            {aiOn ? <Bot size={16} /> : <WifiOff size={16} />} {aiLabel}
          </span>
          <p>
            Inspired by ASD-STE100, EARS, TLA+ and friends.{" "}
            <Link href="/about" className="text-brand underline underline-offset-2">
              Why this works
            </Link>
          </p>
        </footer>
      </div>

      <AnimatePresence>
        {guide && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setGuide(false)}>
            <motion.div
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label={`Guidebook: ${unit.title}`}
              className="card w-full max-w-lg p-6"
            >
              <div className="mb-4 flex items-start gap-3">
                <Mascot mood="happy" size={72} />
                <div className="flex-1">
                  <p className="text-sm font-extrabold uppercase tracking-widest" style={{ color: `var(--${track.id}-shade)` }}>
                    Guidebook · Unit {unitIndex + 1}
                  </p>
                  <h2 className="text-2xl font-black">{unit.title}</h2>
                  <p className="font-bold text-ink-soft">{unit.description}</p>
                </div>
                <button type="button" onClick={() => setGuide(false)} aria-label="Close guidebook" className="rounded-lg p-1 text-ink-soft hover:bg-bg-soft">
                  <X size={22} />
                </button>
              </div>
              <ul className="flex flex-col gap-2">
                {unit.lessons.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 rounded-xl bg-bg-soft px-3 py-2 font-bold">
                    <Icon name={l.icon} size={20} />
                    {l.title}
                    {progress.completed[l.id] && <span className="ml-auto text-sm text-good-text">Done</span>}
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
