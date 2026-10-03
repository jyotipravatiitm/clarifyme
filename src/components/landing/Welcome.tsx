"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft } from "lucide-react";
import { finishOnboarding, type TrackId } from "@/lib/progress";
import { markStarted } from "@/lib/started";
import { Icon } from "@/components/game/Icon";
import { Mascot } from "@/components/game/Mascot";

interface TrackOption {
  id: TrackId;
  title: string;
  tagline: string;
  firstLesson: string;
}

const BLURBS: Record<TrackId, { name: string; who: string }> = {
  writing: { name: "Writing", who: "Emails, docs, instructions and requirements" },
  thinking: { name: "Thinking", who: "Arguments, assumptions and decisions" },
  spec: { name: "Specs", who: "Edge cases and rules that must always hold" },
};

const GOALS = [
  { xp: 10, label: "Casual", minutes: "5 min / day" },
  { xp: 20, label: "Regular", minutes: "10 min / day" },
  { xp: 30, label: "Serious", minutes: "15 min / day" },
  { xp: 50, label: "Intense", minutes: "20 min / day" },
];

/** Two quick questions, then straight into the first lesson. */
export function Welcome({ tracks, initialTrack }: { tracks: TrackOption[]; initialTrack: TrackId | null }) {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1>(initialTrack ? 1 : 0);
  const [track, setTrack] = useState<TrackId | null>(initialTrack);
  const [goal, setGoal] = useState<number | null>(20);

  function next() {
    if (step === 0 && track) return setStep(1);
    if (step === 1 && track && goal) {
      finishOnboarding(track, goal);
      markStarted();
      router.push(`/lesson/${tracks.find((t) => t.id === track)!.firstLesson}`);
    }
  }

  const ready = step === 0 ? !!track : !!goal;
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4">
      <header className="flex items-center gap-4 py-5">
        {step === 1 ? (
          <button type="button" onClick={() => setStep(0)} aria-label="Back" className="rounded-xl p-1 text-ink-soft hover:bg-bg-soft">
            <ChevronLeft size={28} strokeWidth={2.75} />
          </button>
        ) : (
          <Link href="/" aria-label="Back to home" className="rounded-xl p-1 text-ink-soft hover:bg-bg-soft">
            <ChevronLeft size={28} strokeWidth={2.75} />
          </Link>
        )}
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-bg-soft">
          <motion.div className="h-full rounded-full bg-brand" animate={{ width: step === 0 ? "33%" : "70%" }} />
        </div>
      </header>

      <main className="flex-1 pb-32">
        <div className="mb-8 flex items-center gap-3">
          <Mascot size={96} mood={ready ? "happy" : "idle"} />
          <div className="card relative px-4 py-3 text-xl font-black">
            <span className="absolute -left-[9px] top-6 h-4 w-4 rotate-45 border-b-2 border-l-2 border-line bg-surface" aria-hidden />
            {step === 0 ? "What do you want to get better at?" : "How much time can you give me each day?"}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 0 ? (
            <motion.ul key="tracks" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="grid gap-4 sm:grid-cols-3">
              {tracks.map((t) => {
                const active = track === t.id;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setTrack(t.id)}
                      aria-pressed={active}
                      className="flex h-full w-full flex-col items-center gap-3 rounded-2xl border-2 px-4 py-6 text-center transition-colors"
                      style={
                        active
                          ? { borderColor: `var(--${t.id})`, background: `color-mix(in srgb, var(--${t.id}) 12%, var(--surface))`, boxShadow: `0 4px 0 var(--${t.id})` }
                          : { borderColor: "var(--border)", boxShadow: "0 4px 0 var(--border)" }
                      }
                    >
                      <span className="flex h-16 w-16 items-center justify-center rounded-2xl text-white" style={{ background: `var(--${t.id})` }}>
                        <Icon name={t.id} size={34} />
                      </span>
                      <span className="text-xl font-black">{BLURBS[t.id].name}</span>
                      <span className="text-sm font-bold text-ink-soft">{BLURBS[t.id].who}</span>
                    </button>
                  </li>
                );
              })}
            </motion.ul>
          ) : (
            <motion.ul key="goals" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="mx-auto flex max-w-md flex-col gap-3">
              {GOALS.map((g) => {
                const active = goal === g.xp;
                return (
                  <li key={g.xp}>
                    <button
                      type="button"
                      onClick={() => setGoal(g.xp)}
                      aria-pressed={active}
                      className="flex w-full items-center justify-between rounded-2xl border-2 px-5 py-4 text-lg font-black transition-colors"
                      style={
                        active
                          ? { borderColor: "var(--spec)", color: "var(--spec)", background: "color-mix(in srgb, var(--spec) 10%, var(--surface))" }
                          : { borderColor: "var(--border)", boxShadow: "0 3px 0 var(--border)" }
                      }
                    >
                      <span>{g.minutes}</span>
                      <span className={active ? "" : "text-ink-soft"}>{g.label}</span>
                    </button>
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t-2 border-line bg-bg">
        <div className="mx-auto flex max-w-3xl justify-end px-4 py-4">
          <button type="button" className="btn3d w-full sm:w-auto sm:min-w-48" disabled={!ready} onClick={next}>
            {step === 0 ? "Continue" : "Start my first lesson"}
          </button>
        </div>
      </div>
    </div>
  );
}
