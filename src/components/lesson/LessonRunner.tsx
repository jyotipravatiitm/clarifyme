"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Heart, X } from "lucide-react";
import type { PublicChallenge } from "@/lib/content";
import { completeLesson, useProgress, type LessonReward } from "@/lib/progress";
import { play } from "@/lib/sfx";
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

export function LessonRunner({ lesson, steps, aiLabel }: { lesson: LessonInfo; steps: PublicChallenge[]; aiLabel: string }) {
  const { muted } = useProgress();
  const [attempt, setAttempt] = useState(0);
  const [index, setIndex] = useState(0);
  const [hearts, setHearts] = useState(HEARTS);
  const [stars, setStars] = useState<number[]>([]);
  const [phase, setPhase] = useState<"play" | "done" | "dead">("play");
  const [reward, setReward] = useState<LessonReward | null>(null);
  const [heartPulse, setHeartPulse] = useState(0);
  const startedAt = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, [attempt]);

  const progress = (index + (phase === "done" ? 1 : 0)) / steps.length;

  function mistake() {
    setHeartPulse((n) => n + 1);
    setHearts((h) => Math.max(0, h - 1));
  }

  useEffect(() => {
    if (hearts > 0 || phase !== "play") return;
    const t = setTimeout(() => setPhase("dead"), 1400);
    return () => clearTimeout(t);
  }, [hearts, phase]);

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
  }

  function restart() {
    setAttempt((a) => a + 1);
    setIndex(0);
    setHearts(HEARTS);
    setStars([]);
    setPhase("play");
  }

  const step = steps[index];
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4">
      <header className="sticky top-0 z-20 flex items-center gap-4 bg-bg py-4">
        <Link href="/" className="rounded-xl p-1 text-ink-soft hover:bg-bg-soft" aria-label="Quit lesson">
          <X size={28} strokeWidth={2.75} />
        </Link>
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-bg-soft" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Lesson progress">
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
        <motion.div key={heartPulse} animate={heartPulse ? { scale: [1, 1.4, 1], rotate: [0, -12, 12, 0] } : undefined} className="flex items-center gap-1 text-lg font-black text-heart" aria-label={`${hearts} hearts left`}>
          <Heart size={26} className="fill-heart" strokeWidth={2.5} />
          {hearts}
        </motion.div>
      </header>

      <main className="flex-1 pb-6 pt-2">
        <AnimatePresence mode="wait">
          {phase === "play" && step && (
            <motion.div key={`${attempt}-${step.id}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
              <p className="mb-1 text-sm font-black uppercase tracking-widest" style={{ color: `var(--${lesson.trackId}-shade)` }}>
                {step.skill}
              </p>
              <h1 className="mb-5 text-2xl font-black sm:text-3xl">{step.title}</h1>
              {step.kind === "write" ? (
                <WriteStep challenge={step} trackId={lesson.trackId} muted={muted} onMistake={mistake} onDone={done} aiLabel={aiLabel} />
              ) : (
                <BreakStep challenge={step} trackId={lesson.trackId} muted={muted} onMistake={mistake} onDone={done} aiLabel={aiLabel} />
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
