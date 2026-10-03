"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_PROGRESS, applyLessonResult, withFreshDay, type LessonReward, type Progress } from "./progress-core";

export * from "./progress-core";

const KEY = "clarifyme:progress:v1";
const listeners = new Set<() => void>();
let snapshot: Progress | null = null;

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

/** Replaces local progress (used after loading the signed-in user's server copy). */
export function replaceProgress(p: Progress) {
  write(withFreshDay({ ...p, muted: getSnapshot().muted }));
}

export function getProgressSnapshot(): Progress {
  return getSnapshot();
}
