"use client";

import { useEffect, useState } from "react";

export interface TrialInfo {
  enabled: boolean;
  signedIn: boolean;
  used: number;
  limit: number;
  remaining: number;
  requiresSignIn: boolean;
}

export const TRIAL_EVENT = "clarifyme:trial-changed";

export function announceTrial(t: TrialInfo) {
  window.dispatchEvent(new CustomEvent<TrialInfo>(TRIAL_EVENT, { detail: t }));
}

/** Free-lesson status for this browser, refreshed whenever a lesson starts or ends. */
export function useTrial(): TrialInfo | null {
  const [trial, setTrial] = useState<TrialInfo | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/trial", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((t) => alive && t && setTrial(t))
      .catch(() => {});
    const onChange = (e: Event) => setTrial((e as CustomEvent<TrialInfo>).detail);
    window.addEventListener(TRIAL_EVENT, onChange);
    return () => {
      alive = false;
      window.removeEventListener(TRIAL_EVENT, onChange);
    };
  }, []);
  return trial;
}
