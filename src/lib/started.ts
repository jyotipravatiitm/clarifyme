"use client";

export const STARTED_COOKIE = "cm_started";

/** Remembers that this browser has started learning, so "/" opens the path instead of the landing page. */
export function markStarted() {
  try {
    document.cookie = `${STARTED_COOKIE}=1; Path=/; Max-Age=${60 * 60 * 24 * 400}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  } catch {
    /* ignore */
  }
}
