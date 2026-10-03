"use client";

import { useSyncExternalStore } from "react";

/** Per-learner progress, kept in this browser only. */
export interface Progress {
  xp: number;
  streak: number;
  /** Local date (YYYY-MM-DD) of the last day the daily goal was met. */
  streakDay: string | null;
  dailyXp: number;
  dailyDay: string | null;
  dailyGoal: number;
  completed: Record<string, { stars: number; xp: number }>;
  muted: boolean;
}

export const DEFAULT_PROGRESS: Progress = {
  xp: 0,
  streak: 0,
  streakDay: null,
  dailyXp: 0,
  dailyDay: null,
  dailyGoal: 30,
  completed: {},
  muted: false,
};

const KEY = "clarifyme:progress:v1";
const listeners = new Set<() => void>();
let snapshot: Progress | null = null;

export function today(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterday(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return today(new Date(y, m - 1, d - 1));
}

function read(): Progress {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PROGRESS;
    return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

function write(p: Progress) {
  snapshot = p;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Private mode or storage blocked: progress lives for this tab only.
  }
  listeners.forEach((l) => l());
}

function getSnapshot(): Progress {
  if (!snapshot) snapshot = withFreshDay(read());
  return snapshot;
}

/** A streak survives until the end of the day after it was last extended. */
export function withFreshDay(p: Progress, now = today()): Progress {
  let next = p;
  if (p.dailyDay !== now) next = { ...next, dailyXp: 0, dailyDay: now };
  if (p.streakDay && p.streakDay !== now && p.streakDay !== yesterday(now)) next = { ...next, streak: 0 };
  return next;
}

export function useProgress(): Progress {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => {
        if (e.key === KEY) {
          snapshot = null;
          cb();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    getSnapshot,
    () => DEFAULT_PROGRESS,
  );
}

export interface LessonReward {
  xpGained: number;
  streakExtended: boolean;
  goalReached: boolean;
  newStreak: number;
}

/** Pure reducer so it can be unit tested. */
export function applyLessonResult(p: Progress, lessonId: string, stars: number, xp: number, now = today()): { next: Progress; reward: LessonReward } {
  const base = withFreshDay(p, now);
  const prev = base.completed[lessonId];
  const dailyXp = base.dailyXp + xp;
  const goalReached = base.dailyXp < base.dailyGoal && dailyXp >= base.dailyGoal;
  const streakExtended = dailyXp >= base.dailyGoal && base.streakDay !== now;
  const streak = streakExtended ? base.streak + 1 : base.streak;
  const next: Progress = {
    ...base,
    xp: base.xp + xp,
    dailyXp,
    streak,
    streakDay: streakExtended ? now : base.streakDay,
    completed: {
      ...base.completed,
      [lessonId]: { stars: Math.max(prev?.stars ?? 0, stars), xp: Math.max(prev?.xp ?? 0, xp) },
    },
  };
  return { next, reward: { xpGained: xp, streakExtended, goalReached, newStreak: streak } };
}

export function completeLesson(lessonId: string, stars: number, xp: number): LessonReward {
  const { next, reward } = applyLessonResult(getSnapshot(), lessonId, stars, xp);
  write(next);
  return reward;
}

export function setMuted(muted: boolean) {
  write({ ...getSnapshot(), muted });
}

export function resetProgress() {
  write({ ...DEFAULT_PROGRESS, muted: getSnapshot().muted });
}
