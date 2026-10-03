"use client";

import Link from "next/link";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { motion } from "motion/react";
import { Clock, Flame, Gem, Star } from "lucide-react";
import type { LessonReward } from "@/lib/progress";
import { Mascot } from "@/components/game/Mascot";
import { BottomPortal } from "./BottomPortal";

export function CompleteScreen({ reward, stars, seconds, flawless }: { reward: LessonReward; stars: number[]; seconds: number; flawless: boolean }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#1fb88a", "#ffc23d", "#a660f0", "#2f8cf0", "#ff6b3d"];
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.4 }, colors });
    const t = setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0 }, colors }), 300);
    const t2 = setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1 }, colors }), 450);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, []);

  const avg = stars.length ? stars.reduce((a, b) => a + b, 0) / stars.length : 0;
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6 pt-8 text-center">
      <Mascot mood="cheer" size={160} />
      <div>
        <h1 className="text-4xl font-black text-gold" style={{ color: "var(--gold-shade)" }}>
          Lesson complete!
        </h1>
        <p className="mt-1 text-lg font-bold text-ink-soft">{flawless ? "Flawless: no hearts lost. +5 bonus XP" : "Every rewrite makes the next one easier."}</p>
      </div>

      <div className="grid w-full max-w-md grid-cols-3 gap-3">
        <Tile color="var(--gold)" label="Total XP" delay={0.2}>
          <Gem size={20} /> {reward.xpGained}
        </Tile>
        <Tile color="var(--brand)" label="Clarity" delay={0.35}>
          {[0, 1, 2].map((i) => (
            <Star key={i} size={18} className={i < Math.round(avg) ? "fill-current" : "opacity-30"} />
          ))}
        </Tile>
        <Tile color="var(--spec)" label="Time" delay={0.5}>
          <Clock size={20} /> {mm}:{ss}
        </Tile>
      </div>

      {reward.streakExtended && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.8 }} className="flex items-center gap-2 rounded-2xl bg-flame/15 px-4 py-2 text-lg font-black text-flame">
          <Flame size={26} className="fill-flame" /> {reward.newStreak} day streak!
        </motion.div>
      )}
      {reward.goalReached && !reward.streakExtended && <p className="font-black text-gold-shade">Daily goal reached!</p>}

      <BottomPortal>
        <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-line bg-bg">
          <div className="mx-auto flex max-w-2xl justify-end px-4 py-4">
            <Link href="/" className="btn3d min-w-40">
              Continue
            </Link>
          </div>
        </div>
      </BottomPortal>
    </motion.div>
  );
}

function Tile({ color, label, delay, children }: { color: string; label: string; delay: number; children: React.ReactNode }) {
  return (
    <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", delay }} className="overflow-hidden rounded-2xl border-2" style={{ borderColor: color, background: color }}>
      <p className="py-1 text-xs font-black uppercase tracking-widest text-white">{label}</p>
      <div className="flex items-center justify-center gap-1 rounded-t-xl bg-surface py-3 text-xl font-black" style={{ color }}>
        {children}
      </div>
    </motion.div>
  );
}
