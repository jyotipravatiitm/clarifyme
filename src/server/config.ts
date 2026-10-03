/** Server-side feature switches. Every integration is optional. */
export function clerkEnabled(): boolean {
  return !!(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

/** Lessons an anonymous visitor may complete before signing in. 0 disables the gate. */
export function freeLessons(): number {
  const n = Number(process.env.FREE_LESSONS ?? 10);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 10;
}
