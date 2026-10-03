"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Check, Crown, Lock, Star } from "lucide-react";
import type { Track } from "@/lib/content";
import type { Progress } from "@/lib/progress";
import { Icon } from "./Icon";
import { Mascot } from "./Mascot";

/** Horizontal offsets that make the path wind like a river. */
const WIGGLE = [0, 52, 78, 52, 0, -52, -78, -52];

export function PathMap({ track, progress }: { track: Track; progress: Progress }) {
  // The first unfinished lesson is the current one; everything after it is locked.
  const order = track.units.flatMap((u) => u.lessons.map((l) => l.id));
  const currentId = order.find((id) => !progress.completed[id]) ?? null;
  const position = new Map(order.map((id, i) => [id, i]));
  return (
    <div className="flex flex-col gap-10">
      {track.units.map((unit, u) => (
        <section key={unit.id} aria-labelledby={`unit-${unit.id}`}>
          <div className="mb-8 rounded-2xl px-5 py-4 text-white" style={{ background: `var(--${track.id})`, boxShadow: `0 4px 0 var(--${track.id}-shade)` }}>
            <p className="text-sm font-extrabold uppercase tracking-widest opacity-80">Unit {u + 1}</p>
            <h2 id={`unit-${unit.id}`} className="text-2xl font-black">
              {unit.title}
            </h2>
            <p className="font-bold opacity-90">{unit.description}</p>
          </div>
          <ol className="flex flex-col items-center gap-6">
            {unit.lessons.map((lesson) => {
              const i = position.get(lesson.id)!;
              const done = progress.completed[lesson.id];
              const isCurrent = lesson.id === currentId;
              const locked = !done && !isCurrent;
              const x = WIGGLE[i % WIGGLE.length];
              return (
                <li key={lesson.id} className="relative" style={{ transform: `translateX(${x}px)` }}>
                  <LessonNode
                    href={`/lesson/${lesson.id}`}
                    title={lesson.title}
                    icon={lesson.icon}
                    trackId={track.id}
                    state={done ? "done" : isCurrent ? "current" : "locked"}
                    stars={done?.stars ?? 0}
                  />
                  {isCurrent && (
                    <div className={`pointer-events-none absolute top-1/2 hidden -translate-y-1/2 sm:block ${x > 0 ? "right-full mr-6" : "left-full ml-6"}`}>
                      <Mascot size={96} />
                    </div>
                  )}
                  {locked && <span className="sr-only">Locked</span>}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

function LessonNode({
  href,
  title,
  icon,
  trackId,
  state,
  stars,
}: {
  href: string;
  title: string;
  icon: string;
  trackId: string;
  state: "done" | "current" | "locked";
  stars: number;
}) {
  const color = state === "locked" ? "var(--locked)" : state === "done" ? "var(--gold)" : `var(--${trackId})`;
  const shade = state === "locked" ? "var(--locked-shade)" : state === "done" ? "var(--gold-shade)" : `var(--${trackId}-shade)`;
  const node = (
    <motion.div
      whileHover={state !== "locked" ? { scale: 1.06 } : undefined}
      whileTap={state !== "locked" ? { scale: 0.94, y: 4 } : undefined}
      className="relative flex h-[72px] w-[78px] items-center justify-center rounded-[50%] text-white"
      style={{ background: color, boxShadow: `0 7px 0 ${shade}` }}
    >
      {state === "locked" ? (
        <Lock size={30} strokeWidth={3} className="text-ink-soft/60" />
      ) : state === "done" ? (
        stars >= 3 ? <Crown size={34} strokeWidth={2.75} className="text-[#7a5200]" /> : <Check size={36} strokeWidth={3.5} className="text-[#7a5200]" />
      ) : (
        <Icon name={icon} size={32} strokeWidth={2.75} />
      )}
      {state === "current" && (
        <motion.span
          className="absolute -inset-2.5 rounded-[50%] border-[5px]"
          style={{ borderColor: color, opacity: 0.35 }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
  return (
    <div className="flex flex-col items-center gap-2">
      {state === "current" && (
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="card relative -mb-1 px-3 py-1.5 text-sm font-extrabold uppercase tracking-wider"
          style={{ color }}
        >
          Start
          <span className="absolute -bottom-[9px] left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-line bg-surface" />
        </motion.div>
      )}
      {state === "locked" ? (
        <div title={`${title} (locked)`} aria-disabled>
          {node}
        </div>
      ) : (
        <Link href={href} aria-label={`${title}${state === "done" ? `, completed with ${stars} stars` : ", start lesson"}`} className="rounded-full outline-offset-8">
          {node}
        </Link>
      )}
      <span className={`max-w-32 text-center text-sm font-extrabold ${state === "locked" ? "text-ink-soft/60" : "text-ink"}`}>{title}</span>
      {state === "done" && (
        <span className="-mt-1 flex gap-0.5" aria-hidden>
          {[0, 1, 2].map((s) => (
            <Star key={s} size={14} strokeWidth={2.5} className={s < stars ? "fill-gold text-gold" : "text-line"} />
          ))}
        </span>
      )}
    </div>
  );
}
