"use client";

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: Gtag;
    dataLayer?: unknown[];
  }
}

export type AnalyticsEvent =
  | "lesson_start"
  | "answer_check"
  | "lesson_complete"
  | "lesson_failed"
  | "trial_gate_shown"
  | "sign_up_click"
  | "hint_used"
  | "cookie_opt_out";

/** Sends a GA4 event if analytics is loaded and allowed. Never send answer text here. */
export function track(event: AnalyticsEvent, params: Record<string, string | number | boolean> = {}) {
  try {
    window.gtag?.("event", event, params);
  } catch {
    /* analytics must never break the app */
  }
}
