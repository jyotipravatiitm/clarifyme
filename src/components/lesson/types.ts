export interface StepProps<C> {
  challenge: C;
  trackId: string;
  muted: boolean;
  /** Called when the learner gets it wrong. Costs a heart. */
  onMistake: () => void;
  /** Called when the learner presses Continue after finishing the step. */
  onDone: (stars: number) => void;
  /** Mood for the mascot is lifted so the runner can react too. */
  aiLabel: string;
}

export function xpFor(base: number, stars: number): number {
  if (stars >= 3) return base;
  if (stars === 2) return Math.round(base * 0.8);
  if (stars === 1) return Math.round(base * 0.6);
  return 2;
}
