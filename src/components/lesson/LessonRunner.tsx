"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Heart, X } from "lucide-react";
import type { PublicChallenge } from "@/lib/content";
import { completeLesson, useProgress, type LessonReward } from "@/lib/progress";
import { syncProgress } from "@/lib/progress-sync";
import { announceTrial, type TrialInfo } from "@/lib/trial-client";
import { track } from "@/lib/analytics";
import { play } from "@/lib/sfx";
import { Mascot } from "@/components/game/Mascot";
import { TrialGate } from "@/components/auth/TrialGate";
import { BreakStep } from "./BreakStep";
import { CompleteScreen } from "./CompleteScreen";
import { OutOfHearts } from "./OutOfHearts";
import { WriteStep } from "./WriteStep";
import { xpFor } from "./types";

const HEARTS = 3;

export interface LessonInfo {
  id: string;
  title: string;
  trackId: string;
  trackTitle: string;
}

type Phase = "starting" | "play" | "done" | "dead" | "gate" | "error";

export function LessonRunner({ lesson, steps }: { lesson: LessonInfo; steps: PublicChallenge[] }) {
  const router = useRouter();
  const { muted } = useProgress();
  const [attempt, setAttempt] = useState(0);
  const [index, setIndex] = useState(0);
  const [hearts, setHearts] = useState(HEARTS);
  const [stars, setStars] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>("starting");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [trialUsed, setTrialUsed] = useState(0);
  const [reward, setReward] = useState<LessonReward | null>(null);
  const [heartPulse, setHeartPulse] = useState(0);
  const startedAt = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  const start = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId: lesson.id }) });
      const body = await res.json().catch(() => ({}));
      if (res.status === 402) {
        setTrialUsed(body.trial?.used ?? 0);
        setPhase("gate");
        return;
      }
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setSessionId(body.sessionId ?? null);
      if (body.trial) announceTrial(body.trial as TrialInfo);
      startedAt.current = Date.now();
      setPhase("play");
      track("lesson_start", { lesson: lesson.id, track: lesson.trackId });
    } catch {
      setPhase("error");
    }
  }, [lesson.id, lesson.trackId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- starting a server session is an external sync
    void start();
  }, [start, attempt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push("/");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const finish = useCallback(
    async (status: "completed" | "failed", s: number, xp: number, heartsLeft: number) => {
      if (!sessionId) return;
      try {
        const res = await fetch(`/api/sessions/${sessionId}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, stars: s, xp, heartsLeft }),
        });
        const body = await res.json().catch(() => null);
        if (body?.trial) {
          announceTrial(body.trial as TrialInfo);
          if (body.trial.signedIn) void syncProgress();
        }
      } catch {
        /* local progress is already saved */
      }
    },
    [sessionId],
  );

  const progress = (index + (phase === "done" ? 1 : 0)) / steps.length;

  function mistake() {
    setHeartPulse((n) => n + 1);
    setHearts((h) => Math.max(0, h - 1));
  }

  useEffect(() => {
    if (hearts > 0 || phase !== "play") return;
    const t = setTimeout(() => {
      setPhase("dead");
      track("lesson_failed", { lesson: lesson.id, step: index });
      void finish("failed", 0, 0, 0);
    }, 1400);
    return () => clearTimeout(t);
  }, [hearts, phase, finish, lesson.id, index]);

  function done(s: number) {
    const all = [...stars, s];
    setStars(all);
    if (index + 1 < steps.length) {
      setIndex(index + 1);
      play("tap", muted);
      return;
    }
    const xp = steps.reduce((sum, c, i) => sum + xpFor(c.xp, all[i] ?? 0), 0) + (hearts === HEARTS ? 5 : 0);
    const avg = Math.round(all.reduce((a, b) => a + b, 0) / all.length);
    setElapsed(Math.round((Date.now() - startedAt.current) / 1000));
    setReward(completeLesson(lesson.id, avg, xp));
    setPhase("done");
    play("complete", muted);
    track("lesson_complete", { lesson: lesson.id, track: lesson.trackId, stars: avg, xp, hearts_left: hearts });
    void finish("completed", avg, xp, hearts);
  }

  function restart() {
    setIndex(0);
    setHearts(HEARTS);
    setStars([]);
    setSessionId(null);
    setPhase("starting");
    setAttempt((a) => a + 1);
  }

  const step = steps[index];
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 lg:max-w-5xl">
      <header className="sticky top-0 z-20 flex items-center gap-4 bg-bg py-4">
        <Link href="/" className="flex items-center gap-1 rounded-xl p-1 text-ink-soft hover:bg-bg-soft" aria-label="Quit lesson">
          <X size={28} strokeWidth={2.75} />
          <kbd className="hidden rounded-md border-2 border-b-4 border-line px-1.5 text-[11px] font-black lg:inline">Esc</kbd>
        </Link>
        <div className={`h-4 flex-1 overflow-hidden rounded-full bg-bg-soft ${phase === "gate" || phase === "error" ? "invisible" : ""}`} role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Lesson progress">
          <motion.div
            className="relative h-full rounded-full"
            style={{ background: `var(--${lesson.trackId})` }}
            initial={false}
            animate={{ width: `${Math.max(4, progress * 100)}%` }}
            transition={{ type: "spring", stiffness: 140, damping: 20 }}
          >
            <span className="absolute inset-x-2 top-1 h-1 rounded-full bg-white/35" />
          </motion.div>
        </div>
        <motion.div key={heartPulse} animate={heartPulse ? { scale: [1, 1.4, 1], rotate: [0, -12, 12, 0] } : undefined} className={`flex items-center gap-1 text-lg font-black text-heart ${phase === "gate" || phase === "error" ? "invisible" : ""}`} aria-label={`${hearts} hearts left`}>
          <Heart size={26} className="fill-heart" strokeWidth={2.5} />
          {hearts}
        </motion.div>
      </header>

      <main className="flex-1 pb-6 pt-2">
        <AnimatePresence mode="wait">
          {phase === "starting" && (
            <motion.div key="starting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center pt-24">
              <Mascot mood="think" size={110} />
            </motion.div>
          )}
          {phase === "error" && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 pt-16 text-center">
              <Mascot mood="sad" size={120} />
              <p className="text-xl font-black">Could not start the lesson.</p>
              <button type="button" className="btn3d" onClick={() => setAttempt((a) => a + 1)}>
                Try again
              </button>
            </motion.div>
          )}
          {phase === "gate" && <TrialGate key="gate" used={trialUsed} />}
          {phase === "play" && step && (
            <motion.div key={`${attempt}-${step.id}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
              <p className="mb-1 text-sm font-black uppercase tracking-widest" style={{ color: `var(--${lesson.trackId}-shade)` }}>
                {step.skill}
              </p>
              <h1 className="mb-5 text-2xl font-black sm:text-3xl">{step.title}</h1>
              {step.kind === "write" ? (
                <WriteStep challenge={step} trackId={lesson.trackId} muted={muted} sessionId={sessionId} onMistake={mistake} onDone={done} />
              ) : (
                <BreakStep challenge={step} trackId={lesson.trackId} muted={muted} sessionId={sessionId} onMistake={mistake} onDone={done} />
              )}
            </motion.div>
          )}
          {phase === "done" && reward && <CompleteScreen key="done" reward={reward} stars={stars} seconds={elapsed} flawless={hearts === HEARTS} />}
          {phase === "dead" && <OutOfHearts key="dead" onRetry={restart} />}
        </AnimatePresence>
      </main>
    </div>
  );
}
