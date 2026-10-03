/** Cookie-consent helpers shared by the banner and the GA loader. No React, so they are easy to test. */

export type ConsentChoice = "granted" | "denied";
/** opt-out: analytics on until the visitor says no. opt-in: off until the visitor says yes. */
export type ConsentMode = "opt-out" | "opt-in";

export const CONSENT_COOKIE = "cm_consent";
export const SETTINGS_EVENT = "clarifyme:cookie-settings";

export function consentMode(raw: string | undefined): ConsentMode {
  return raw === "opt-in" ? "opt-in" : "opt-out";
}

export function readConsent(cookieHeader: string): ConsentChoice | null {
  const m = cookieHeader.match(new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE}=(granted|denied)`));
  return (m?.[1] as ConsentChoice | undefined) ?? null;
}

export function effectiveConsent(mode: ConsentMode, saved: ConsentChoice | null): ConsentChoice {
  return saved ?? (mode === "opt-out" ? "granted" : "denied");
}

/** Names of Google Analytics cookies present (_ga, _ga_XXXX, _gid, _gat...). */
export function gaCookieNames(cookieHeader: string): string[] {
  return cookieHeader
    .split(";")
    .map((c) => c.split("=")[0].trim())
    .filter((n) => /^_ga($|_)|^_gid$|^_gat/.test(n));
}

export function consentCookie(choice: ConsentChoice, secure: boolean): string {
  return `${CONSENT_COOKIE}=${choice}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax${secure ? "; Secure" : ""}`;
}
