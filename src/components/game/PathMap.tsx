"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import { Check, Crown, Lock, Star } from "lucide-react";
import type { Track } from "@/lib/content";
import { openChest, type Progress } from "@/lib/progress";
import { play } from "@/lib/sfx";
import { Icon } from "./Icon";
import { FogBank, Mascot } from "./Mascot";
import { ChestIcon, GemIcon, TrophyIcon } from "./NavIcons";

/** Horizontal offsets that make the path wind like a river. */
const WIGGLE = [0, 46, 70, 46, 0, -46, -70, -46];

export interface LessonMeta {
  xp: number;
  steps: number;
}

type Item =
  | { kind: "lesson"; id: string; title: string; icon: string; n: number; of: number }
  | { kind: "chest"; id: string; after: string[] }
  | { kind: "trophy"; id: string; unitTitle: string; lessons: string[] };

/** Lessons of a unit, with a chest after the 2nd lesson and a trophy at the end. */
function unitItems(unit: Track["units"][number]): Item[] {
  const items: Item[] = [];
  unit.lessons.forEach((l, i) => {
    items.push({ kind: "lesson", id: l.id, title: l.title, icon: l.icon, n: i + 1, of: unit.lessons.length });
    if (i === 1) items.push({ kind: "chest", id: `${unit.id}-chest`, after: unit.lessons.slice(0, 2).map((x) => x.id) });
  });
  items.push({ kind: "trophy", id: `${unit.id}-trophy`, unitTitle: unit.title, lessons: unit.lessons.map((x) => x.id) });
  return items;
}

export function PathMap({ track, progress, meta, muted }: { track: Track; progress: Progress; meta: Record<string, LessonMeta>; muted: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  // The first unfinished lesson is the current one; everything after it is locked.
  const order = track.units.flatMap((u) => u.lessons.map((l) => l.id));
  const currentId = order.find((id) => !progress.completed[id]) ?? null;
  const currentIndex = currentId ? order.indexOf(currentId) : order.length;

  useEffect(() => {
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !root.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  function claim(chestId: string) {
    const reward = openChest(chestId);
    if (!reward) return;
    play("complete", muted);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) confetti({ particleCount: 70, spread: 60, origin: { y: 0.55 }, colors: ["#ffc23d", "#2f8cf0", "#1fb88a"] });
    setToast(`+${reward.xpGained} XP from the chest!`);
    setTimeout(() => setToast(null), 2200);
  }

  let pos = 0;
  return (
    <div ref={root} className="relative flex flex-col gap-12">
      {track.units.map((unit, u) => {
        const items = unitItems(unit);
        const unitStart = order.indexOf(unit.lessons[0].id);
        const unitLocked = unitStart > currentIndex;
        return (
          <section key={unit.id} data-unit={u} aria-labelledby={`unit-${unit.id}`} className="relative">
            <div className="mb-10 flex items-center gap-4 text-ink-soft">
              <span className="h-0.5 flex-1 bg-line" />
              <h2 id={`unit-${unit.id}`} className="text-center text-lg font-extrabold">
                {unit.title}
              </h2>
              <span className="h-0.5 flex-1 bg-line" />
            </div>
            {unitLocked && <FogBank className="pointer-events-none absolute inset-x-0 top-24 z-10 h-40 w-full opacity-70" />}
            <ol className="flex flex-col items-center gap-7">
              {items.map((item) => {
                const x = WIGGLE[pos++ % WIGGLE.length];
                const key = `${track.id}:${item.id}`;
                return (
                  <li key={key} className="relative" style={{ transform: `translateX(${x}px)`, zIndex: open === key ? 40 : 1 }}>
                    {item.kind === "lesson" ? (
                      <LessonNode
                        item={item}
                        trackId={track.id}
                        state={progress.completed[item.id] ? "done" : item.id === currentId ? "current" : "locked"}
                        stars={progress.completed[item.id]?.stars ?? 0}
                        xp={meta[item.id]?.xp ?? 10}
                        open={open === key}
                        onToggle={() => setOpen(open === key ? null : key)}
                        mascotSide={x > 0 ? "left" : "right"}
                      />
                    ) : item.kind === "chest" ? (
                      <ChestNode
                        state={progress.chests.includes(item.id) ? "opened" : item.after.every((id) => progress.completed[id]) ? "ready" : "locked"}
                        open={open === key}
                        onToggle={() => setOpen(open === key ? null : key)}
                        onClaim={() => claim(item.id)}
                      />
                    ) : (
                      <TrophyNode
                        earned={item.lessons.every((id) => progress.completed[id])}
                        unitTitle={item.unitTitle}
                        open={open === key}
                        onToggle={() => setOpen(open === key ? null : key)}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="card fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 px-5 py-3 text-lg font-black lg:bottom-10"
            role="status"
          >
            <GemIcon size={24} /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Popover({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6 }}
      className="absolute left-1/2 top-full z-30 mt-4 w-72 -translate-x-1/2 rounded-2xl p-4 text-left text-white shadow-lg"
      style={{ background: color }}
      role="dialog"
    >
      <span className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45" style={{ background: color }} />
      {children}
    </motion.div>
  );
}

function LessonNode({
  item,
  trackId,
  state,
  stars,
  xp,
  open,
  onToggle,
  mascotSide,
}: {
  item: Extract<Item, { kind: "lesson" }>;
  trackId: string;
  state: "done" | "current" | "locked";
  stars: number;
  xp: number;
  open: boolean;
  onToggle: () => void;
  mascotSide: "left" | "right";
}) {
  const color = state === "locked" ? "var(--locked)" : state === "done" ? "var(--gold)" : `var(--${trackId})`;
  const shade = state === "locked" ? "var(--locked-shade)" : state === "done" ? "var(--gold-shade)" : `var(--${trackId}-shade)`;
  return (
    <div className="flex flex-col items-center">
      {state === "current" && !open && (
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="card relative -mb-1 mb-2 px-3 py-1.5 text-sm font-extrabold uppercase tracking-wider"
          style={{ color: shade }}
        >
          Start
          <span className="absolute -bottom-[9px] left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-line bg-surface" />
        </motion.div>
      )}
      <motion.button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${item.title}${state === "done" ? `, completed with ${stars} stars` : state === "locked" ? ", locked" : ", current lesson"}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.94, y: 4 }}
        className="relative flex h-[68px] w-[74px] items-center justify-center rounded-[50%] text-white outline-offset-8"
        style={{ background: color, boxShadow: `0 7px 0 ${shade}` }}
      >
        <span className="absolute inset-x-3 top-1.5 h-3 rounded-full bg-white/25" />
        {state === "locked" ? (
          <Lock size={28} strokeWidth={3} className="text-ink-soft/60" />
        ) : state === "done" ? (
          stars >= 3 ? <Crown size={32} strokeWidth={2.75} className="text-[#7a5200]" /> : <Check size={34} strokeWidth={3.5} className="text-[#7a5200]" />
        ) : (
          <Icon name={item.icon} size={30} strokeWidth={2.75} />
        )}
        {state === "current" && (
          <motion.span className="absolute -inset-2.5 rounded-[50%] border-[5px]" style={{ borderColor: color, opacity: 0.35 }} animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
        )}
      </motion.button>
      {state === "done" && (
        <span className="mt-3 flex gap-0.5" aria-hidden>
          {[0, 1, 2].map((s) => (
            <Star key={s} size={14} strokeWidth={2.5} className={s < stars ? "fill-gold text-gold" : "text-line"} />
          ))}
        </span>
      )}
      {state === "current" && (
        <div className={`pointer-events-none absolute top-0 hidden sm:block ${mascotSide === "left" ? "right-full mr-8" : "left-full ml-8"}`}>
          <Mascot size={110} />
        </div>
      )}
      <AnimatePresence>
        {open && (
          <Popover color={state === "locked" ? "var(--locked-shade)" : color}>
            <p className="text-lg font-black">{item.title}</p>
            {state === "locked" ? (
              <>
                <p className="mb-3 font-bold opacity-90">Finish the lessons above to clear the fog and unlock this one.</p>
                <button type="button" disabled className="w-full rounded-xl bg-white/40 py-3 text-sm font-black uppercase tracking-wider">
                  Locked
                </button>
              </>
            ) : (
              <>
                <p className="mb-3 font-bold opacity-90">
                  Lesson {item.n} of {item.of}
                  {state === "done" ? " · completed" : ""}
                </p>
                <Link
                  href={`/lesson/${item.id}`}
                  className="block w-full rounded-xl bg-white py-3 text-center text-sm font-black uppercase tracking-wider"
                  style={{ color: shade, boxShadow: "0 4px 0 rgba(0,0,0,0.15)" }}
                >
                  {state === "done" ? "Practice +5 XP" : `Start +${xp} XP`}
                </Link>
              </>
            )}
          </Popover>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChestNode({ state, open, onToggle, onClaim }: { state: "locked" | "ready" | "opened"; open: boolean; onToggle: () => void; onClaim: () => void }) {
  return (
    <div className="flex flex-col items-center">
      <motion.button
        type="button"
        onClick={state === "ready" ? onClaim : onToggle}
        aria-label={state === "ready" ? "Open treasure chest" : state === "opened" ? "Opened chest" : "Locked chest"}
        animate={state === "ready" ? { rotate: [0, -6, 6, -4, 0] } : undefined}
        transition={state === "ready" ? { duration: 0.8, repeat: Infinity, repeatDelay: 1.6 } : undefined}
        whileTap={{ scale: 0.92 }}
        className="relative"
      >
        <ChestIcon size={72} open={state === "opened"} gray={state === "locked"} />
        {state === "ready" && <span className="absolute -right-1 -top-1 h-4 w-4 animate-ping rounded-full bg-gold" />}
      </motion.button>
      <AnimatePresence>
        {open && state !== "ready" && (
          <Popover color={state === "locked" ? "var(--locked-shade)" : "var(--gold-shade)"}>
            <p className="font-black">{state === "locked" ? "Treasure ahead!" : "Chest opened"}</p>
            <p className="font-bold opacity-90">{state === "locked" ? "Finish the two lessons above to open it." : "You already claimed this one. More chests further down the path."}</p>
          </Popover>
        )}
      </AnimatePresence>
    </div>
  );
}

function TrophyNode({ earned, unitTitle, open, onToggle }: { earned: boolean; unitTitle: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="flex flex-col items-center">
      <motion.button type="button" onClick={onToggle} whileTap={{ scale: 0.92 }} aria-label={earned ? `Unit trophy: ${unitTitle}` : "Unit trophy, not yet earned"}>
        <TrophyIcon size={72} gray={!earned} />
      </motion.button>
      <AnimatePresence>
        {open && (
          <Popover color={earned ? "var(--gold-shade)" : "var(--locked-shade)"}>
            <p className="font-black">{earned ? "Unit complete!" : "Unit trophy"}</p>
            <p className="font-bold opacity-90">{earned ? `You cleared all the fog in “${unitTitle}”.` : `Finish every lesson in “${unitTitle}” to earn it.`}</p>
          </Popover>
        )}
      </AnimatePresence>
    </div>
  );
}
