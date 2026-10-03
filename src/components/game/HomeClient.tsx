"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Bot, WifiOff } from "lucide-react";
import type { Track } from "@/lib/content";
import { useProgress } from "@/lib/progress";
import { Icon } from "./Icon";
import { PathMap } from "./PathMap";
import { TopBar } from "./TopBar";

const TAB_KEY = "clarifyme:track";

export function HomeClient({ tracks, aiLabel, aiOn }: { tracks: Track[]; aiLabel: string; aiOn: boolean }) {
  const progress = useProgress();
  const [trackId, setTrackId] = useState<Track["id"]>("writing");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(TAB_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore a per-viewer preference after hydration
      if (saved && tracks.some((t) => t.id === saved)) setTrackId(saved as Track["id"]);
    } catch {
      /* storage blocked */
    }
  }, [tracks]);

  const pick = (id: Track["id"]) => {
    setTrackId(id);
    try {
      window.localStorage.setItem(TAB_KEY, id);
    } catch {
      /* storage blocked */
    }
  };

  const track = tracks.find((t) => t.id === trackId) ?? tracks[0];
  const lessons = track.units.flatMap((u) => u.lessons);
  const doneCount = lessons.filter((l) => progress.completed[l.id]).length;
  const goalPct = Math.min(100, Math.round((progress.dailyXp / progress.dailyGoal) * 100));

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <nav aria-label="Tracks" className="grid grid-cols-3 gap-2">
            {tracks.map((t) => {
              const active = t.id === track.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pick(t.id)}
                  aria-pressed={active}
                  className="card flex flex-col items-center gap-1 px-2 py-3 text-sm font-extrabold transition-colors"
                  style={active ? { borderColor: `var(--${t.id})`, background: `color-mix(in srgb, var(--${t.id}) 12%, var(--surface))`, color: `var(--${t.id}-shade)` } : undefined}
                >
                  <Icon name={t.id} size={26} />
                  {t.title}
                </button>
              );
            })}
          </nav>
          <div className="card flex items-center gap-3 px-4 py-3 sm:w-56">
            <div className="flex-1">
              <p className="text-sm font-extrabold">Daily goal</p>
              <div className="mt-1.5 h-3.5 overflow-hidden rounded-full bg-bg-soft">
                <motion.div className="h-full rounded-full bg-gold" initial={false} animate={{ width: `${goalPct}%` }} transition={{ type: "spring", stiffness: 120, damping: 18 }} />
              </div>
              <p className="mt-1 text-xs font-bold text-ink-soft">
                {Math.min(progress.dailyXp, progress.dailyGoal)} / {progress.dailyGoal} XP
              </p>
            </div>
          </div>
        </div>

        <motion.div key={track.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black">{track.title}</h1>
              <p className="font-bold text-ink-soft">{track.tagline}</p>
            </div>
            <p className="shrink-0 text-sm font-extrabold text-ink-soft">
              {doneCount}/{lessons.length} done
            </p>
          </div>
          <PathMap track={track} progress={progress} />
        </motion.div>

        <footer className="mt-16 flex flex-col items-center gap-2 text-center text-sm font-bold text-ink-soft">
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
      </main>
    </>
  );
}
