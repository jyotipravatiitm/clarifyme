"use client";

import { getProgressSnapshot, replaceProgress } from "./progress";

/** Merges this browser's progress into the signed-in account and adopts the result. */
export async function syncProgress(): Promise<void> {
  try {
    const res = await fetch("/api/progress", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(getProgressSnapshot()) });
    if (!res.ok) return;
    const { progress } = await res.json();
    if (progress) replaceProgress(progress);
  } catch {
    /* offline: the next sync catches up */
  }
}
