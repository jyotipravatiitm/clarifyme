"use client";

import Link from "next/link";
import { Flame, Volume2, VolumeX } from "lucide-react";
import { motion } from "motion/react";
import { setMuted, useProgress } from "@/lib/progress";
import { Mascot } from "./Mascot";
import { GemIcon } from "./NavIcons";

export function TopBar() {
  const p = useProgress();
  const streakToday = p.streakDay !== null && p.dailyXp >= p.dailyGoal;
  return (
    <header className="sticky top-0 z-30 border-b-2 border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
        <Link href="/learn" className="flex items-center gap-1.5" aria-label="ClarifyMe home">
          <Mascot size={40} />
          <span className="text-2xl font-black tracking-tight text-brand">clarifyme</span>
        </Link>
        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          <Stat label={`${p.streak} day streak`} title="Day streak">
            <Flame size={24} strokeWidth={2.5} className={streakToday ? "fill-flame text-flame" : "text-ink-soft/50"} />
            <span className={streakToday ? "text-flame" : "text-ink-soft"}>{p.streak}</span>
          </Stat>
          <Stat label={`${p.xp} XP`} title="Total XP">
            <GemIcon size={22} />
            <motion.span key={p.xp} initial={{ scale: 1.4 }} animate={{ scale: 1 }} style={{ color: "var(--spec)" }}>
              {p.xp}
            </motion.span>
          </Stat>
          <button
            type="button"
            onClick={() => setMuted(!p.muted)}
            className="rounded-xl p-2 text-ink-soft hover:bg-bg-soft"
            aria-label={p.muted ? "Turn sound on" : "Turn sound off"}
          >
            {p.muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
}

function Stat({ children, label, title }: { children: React.ReactNode; label: string; title: string }) {
  return (
    <div className="flex items-center gap-1 rounded-xl px-2 py-1 text-lg font-extrabold" aria-label={label} title={title}>
      {children}
    </div>
  );
}
