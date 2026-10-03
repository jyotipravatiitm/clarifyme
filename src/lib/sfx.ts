"use client";

/**
 * Tiny synthesized sound effects (Web Audio), so the app ships no audio files.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.18) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export type Sfx = "tap" | "correct" | "wrong" | "complete" | "add";

export function play(name: Sfx, muted: boolean) {
  if (muted) return;
  switch (name) {
    case "tap":
      tone(660, 0, 0.06, "triangle", 0.08);
      break;
    case "add":
      tone(880, 0, 0.07, "triangle", 0.1);
      tone(1175, 0.05, 0.08, "triangle", 0.08);
      break;
    case "correct":
      tone(784, 0, 0.12, "triangle");
      tone(1175, 0.09, 0.22, "triangle");
      break;
    case "wrong":
      tone(220, 0, 0.18, "sawtooth", 0.07);
      tone(196, 0.12, 0.25, "sawtooth", 0.06);
      break;
    case "complete":
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.28, "triangle", 0.14));
      break;
  }
  if (name === "wrong" && typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(60);
    } catch {
      /* ignore */
    }
  }
}
