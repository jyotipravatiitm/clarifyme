"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Flame, Gift, Target, Trophy, Zap } from "lucide-react";
import { claimQuest, useProgress } from "@/lib/progress";
import { questsFor, type Quest } from "@/lib/quests";
import { useTrial } from "@/lib/trial-client";
import { play } from "@/lib/sfx";
import { useFeatures } from "@/components/Features";
import { SignUpCta } from "@/components/auth/Account";
import { openCookieSettings } from "@/components/analytics/CookieBanner";
import { Mascot } from "@/components/game/Mascot";
import { ChestIcon, GemIcon, ReviewIcon } from "@/components/game/NavIcons";

const QUEST_ICON: Record<Quest["id"], React.ReactNode> = {
  xp: <Zap size={30} className="fill-gold text-gold" style={{ color: "var(--gold-shade)" }} />,
  perfect: <Target size={30} className="text-good" />,
  lessons: <Trophy size={30} className="text-[var(--spec)]" />,
};

/** Daily quests with progress bars and chests, Duolingo style. */
export function QuestsCard({ compact = false }: { compact?: boolean }) {
  const p = useProgress();
  const quests = questsFor(p);
  const shown = compact ? quests.filter((q) => !q.claimed).slice(0, 1) : quests;
  return (
    <div className="card px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-lg font-black">Daily Quests</p>
        <Link href="/quests" className="text-sm font-black uppercase tracking-wider text-[var(--spec)]">
          View all
        </Link>
      </div>
      {shown.length === 0 && <p className="font-bold text-ink-soft">All done for today. See you tomorrow!</p>}
      <ul className="flex flex-col gap-4">
        {shown.map((q) => (
          <QuestRow key={q.id} q={q} muted={p.muted} />
        ))}
      </ul>
    </div>
  );
}

export function QuestRow({ q, muted }: { q: Quest; muted: boolean }) {
  const pct = Math.round((q.value / q.target) * 100);
  return (
    <li className="flex items-center gap-3">
      <span className="shrink-0">{QUEST_ICON[q.id]}</span>
      <div className="min-w-0 flex-1">
        <p className="font-extrabold">{q.title}</p>
        <div className="relative mt-1.5 h-4 overflow-hidden rounded-full bg-bg-soft">
          <motion.div className="h-full rounded-full bg-gold" initial={false} animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 120, damping: 18 }} />
          <span className="absolute inset-0 text-center text-[11px] font-black leading-4 text-ink-soft">
            {q.value} / {q.target}
          </span>
        </div>
      </div>
      {q.done && !q.claimed ? (
        <motion.button
          type="button"
          onClick={() => {
            if (claimQuest(q.id)) play("complete", muted);
          }}
          animate={{ rotate: [0, -8, 8, 0] }}
          transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 1 }}
          aria-label={`Claim ${q.reward} XP`}
          className="shrink-0"
        >
          <ChestIcon size={38} />
        </motion.button>
      ) : (
        <span className="shrink-0" title={q.claimed ? "Claimed" : `${q.reward} XP reward`}>
          <ChestIcon size={38} open={q.claimed} gray={!q.claimed} />
        </span>
      )}
    </li>
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
          <p className="text-sm font-bold text-ink-soft">Create a free profile to keep going and save your answers.</p>
        </div>
      </div>
      {trial.enabled && (
        <div className="mx-4 mt-3 h-2.5 overflow-hidden rounded-full bg-bg-soft">
          <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className="p-4">
        <SignUpCta className="btn3d w-full !text-sm" from="rail">
          <Gift size={18} /> Create a profile
        </SignUpCta>
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
          <GemIcon size={24} />
          <span style={{ color: "var(--spec)" }}>{p.xp}</span>
        </span>
      </div>
      <TrialCard />
      <QuestsCard />
      {auth && (
        <Link href="/history" className="card flex items-center gap-3 px-4 py-3 font-extrabold hover:bg-bg-soft">
          <ReviewIcon size={28} /> Review your answers
        </Link>
      )}
      <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 px-1 text-xs font-black uppercase tracking-wider text-ink-soft">
        <Link href="/about" className="hover:text-ink">
          About
        </Link>
        <Link href="/privacy" className="hover:text-ink">
          Privacy
        </Link>
        {analytics && (
          <button type="button" onClick={openCookieSettings} className="uppercase hover:text-ink">
            Cookies
          </button>
        )}
      </nav>
    </div>
  );
}
