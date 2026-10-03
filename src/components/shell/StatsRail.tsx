"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Flame, Gem, Gift, History } from "lucide-react";
import { useProgress } from "@/lib/progress";
import { useTrial } from "@/lib/trial-client";
import { useFeatures } from "@/components/Features";
import { openCookieSettings } from "@/components/analytics/CookieBanner";
import { Mascot } from "@/components/game/Mascot";

export function DailyGoalCard() {
  const p = useProgress();
  const pct = Math.min(100, Math.round((p.dailyXp / p.dailyGoal) * 100));
  return (
    <div className="card px-4 py-3">
      <p className="text-sm font-extrabold">Daily goal</p>
      <div className="mt-1.5 h-3.5 overflow-hidden rounded-full bg-bg-soft">
        <motion.div className="h-full rounded-full bg-gold" initial={false} animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 120, damping: 18 }} />
      </div>
      <p className="mt-1 text-xs font-bold text-ink-soft">
        {Math.min(p.dailyXp, p.dailyGoal)} / {p.dailyGoal} XP
      </p>
    </div>
  );
}

export function TrialCard() {
  const trial = useTrial();
  const { auth } = useFeatures();
  if (!auth || !trial || trial.signedIn) return null;
  const pct = trial.enabled ? Math.round((trial.used / Math.max(1, trial.limit)) * 100) : 0;
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-3">
        <Mascot size={52} mood={trial.requiresSignIn ? "think" : "idle"} />
        <div>
          <p className="font-black">{trial.requiresSignIn ? "Free lessons used up" : `${trial.remaining} free lesson${trial.remaining === 1 ? "" : "s"} left`}</p>
          <p className="text-sm font-bold text-ink-soft">Sign up free to keep going and review every answer.</p>
        </div>
      </div>
      {trial.enabled && (
        <div className="mx-4 mt-3 h-2.5 overflow-hidden rounded-full bg-bg-soft">
          <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className="p-4">
        <Link href="/sign-up" className="btn3d w-full !text-sm">
          <Gift size={18} /> Create free account
        </Link>
      </div>
    </div>
  );
}

export function StatsRail() {
  const p = useProgress();
  const streakToday = p.streakDay !== null && p.dailyXp >= p.dailyGoal;
  const { analytics, auth } = useFeatures();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-around rounded-2xl px-2 py-1 text-lg font-extrabold">
        <span className="flex items-center gap-1.5" title="Day streak" aria-label={`${p.streak} day streak`}>
          <Flame size={26} strokeWidth={2.5} className={streakToday ? "fill-flame text-flame" : "text-ink-soft/50"} />
          <span className={streakToday ? "text-flame" : "text-ink-soft"}>{p.streak}</span>
        </span>
        <span className="flex items-center gap-1.5" title="Total XP" aria-label={`${p.xp} XP`}>
          <Gem size={24} strokeWidth={2.5} className="fill-gold/60 text-gold" />
          <span className="text-gold" style={{ color: "var(--gold-shade)" }}>
            {p.xp}
          </span>
        </span>
      </div>
      <DailyGoalCard />
      <TrialCard />
      {auth && (
        <Link href="/history" className="card flex items-center gap-3 px-4 py-3 font-extrabold hover:bg-bg-soft">
          <History size={22} className="text-brand" /> Review your sessions
        </Link>
      )}
      <nav className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-sm font-bold text-ink-soft">
        <Link href="/about" className="hover:text-ink">
          About
        </Link>
        <Link href="/privacy" className="hover:text-ink">
          Privacy
        </Link>
        {analytics && (
          <button type="button" onClick={openCookieSettings} className="hover:text-ink">
            Cookie settings
          </button>
        )}
      </nav>
    </div>
  );
}
