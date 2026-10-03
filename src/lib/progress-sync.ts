"use client";

import { getProgressSnapshot, replaceProgress, type Progress } from "./progress";

let lastSynced: string | null = null;

/** A fingerprint of everything worth syncing (the mute switch stays per device). */
export function progressSignature(p: Progress): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { muted, ...rest } = p;
  return JSON.stringify(rest);
}

export function needsSync(p: Progress): boolean {
  return progressSignature(p) !== lastSynced;
}

/** Merges this browser's progress into the signed-in account and adopts the result. */
export async function syncProgress(): Promise<void> {
  try {
    const res = await fetch("/api/progress", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(getProgressSnapshot()) });
    if (!res.ok) return;
    const { progress } = await res.json();
    if (progress) {
      replaceProgress(progress);
      lastSynced = progressSignature(getProgressSnapshot());
    }
  } catch {
    /* offline: the next change retries */
  }
}
