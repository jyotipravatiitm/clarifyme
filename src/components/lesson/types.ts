export interface StepProps<C> {
  challenge: C;
  trackId: string;
  muted: boolean;
  /** Server session this lesson belongs to, or null when the app runs without a database. */
  sessionId: string | null;
  /** Called when the learner gets it wrong. Costs a heart. */
  onMistake: () => void;
  /** Called when the learner presses Continue after finishing the step. */
  onDone: (stars: number) => void;
}

export function xpFor(base: number, stars: number): number {
  if (stars >= 3) return base;
  if (stars === 2) return Math.round(base * 0.8);
  if (stars === 1) return Math.round(base * 0.6);
  return 2;
}

/** POSTs to a judging route and turns error bodies into readable messages. */
export async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/** True when a key event comes from a text field (so single-letter shortcuts must not fire). */
export function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
}
