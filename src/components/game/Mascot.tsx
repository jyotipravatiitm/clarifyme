"use client";

import { motion, useReducedMotion } from "motion/react";

export type Mood = "idle" | "think" | "happy" | "sad" | "cheer";

/**
 * Clara, the ClarifyMe mascot: a speech bubble who wants every sentence to mean one thing.
 * Pure SVG + Motion. Swap in a Rive state machine later by keeping the same `mood` prop.
 */
export function Mascot({ mood = "idle", size = 120, className = "" }: { mood?: Mood; size?: number; className?: string }) {
  const reduce = useReducedMotion();
  const body = {
    idle: { y: [0, -4, 0], rotate: 0, transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" as const } },
    think: { y: 0, rotate: [-3, 3, -3], transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" as const } },
    happy: { y: [0, -14, 0], rotate: 0, transition: { duration: 0.5, repeat: 2, ease: "easeOut" as const } },
    sad: { y: 4, rotate: -4, transition: { type: "spring" as const, stiffness: 120 } },
    cheer: { y: [0, -22, 0], rotate: [0, -6, 6, 0], transition: { duration: 0.7, repeat: Infinity, repeatDelay: 0.4 } },
  }[mood];

  const eyesClosedHappy = mood === "happy" || mood === "cheer";
  return (
    <motion.div className={className} style={{ width: size, height: size }} animate={reduce ? undefined : body} aria-hidden>
      <svg viewBox="0 0 120 120" width={size} height={size}>
        {/* shadow */}
        <ellipse cx="60" cy="112" rx="30" ry="5" fill="currentColor" opacity="0.08" />
        {/* arms */}
        <motion.path
          d="M18 62 Q6 52 10 40"
          stroke="var(--brand-shade)"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
          animate={mood === "cheer" ? { d: ["M18 62 Q6 52 10 40", "M18 58 Q4 40 14 26", "M18 62 Q6 52 10 40"] } : mood === "sad" ? { d: "M18 66 Q10 76 14 86" } : { d: "M18 64 Q8 70 12 80" }}
          transition={{ duration: 0.7, repeat: mood === "cheer" ? Infinity : 0, repeatDelay: 0.4 }}
        />
        <motion.path
          d="M102 62 Q114 52 110 40"
          stroke="var(--brand-shade)"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
          animate={
            mood === "cheer" || mood === "happy"
              ? { d: ["M102 62 Q114 52 110 40", "M102 58 Q116 40 106 26", "M102 62 Q114 52 110 40"] }
              : mood === "think"
                ? { d: "M100 70 Q92 60 84 58" }
                : mood === "sad"
                  ? { d: "M102 66 Q110 76 106 86" }
                  : { d: "M102 64 Q112 70 108 80" }
          }
          transition={{ duration: 0.7, repeat: mood === "cheer" ? Infinity : 0, repeatDelay: 0.4 }}
        />
        {/* body: speech bubble */}
        <path d="M24 22 h72 a16 16 0 0 1 16 16 v40 a16 16 0 0 1 -16 16 h-36 l-16 14 v-14 h-20 a16 16 0 0 1 -16 -16 v-40 a16 16 0 0 1 16 -16 z" fill="var(--brand)" />
        <path d="M24 22 h72 a16 16 0 0 1 16 16 v6 h-104 v-6 a16 16 0 0 1 16 -16 z" fill="#fff" opacity="0.18" />
        {/* cheeks */}
        <circle cx="34" cy="68" r="6" fill="#ff8fa3" opacity={mood === "sad" ? 0.2 : 0.55} />
        <circle cx="86" cy="68" r="6" fill="#ff8fa3" opacity={mood === "sad" ? 0.2 : 0.55} />
        {/* eyes */}
        {eyesClosedHappy ? (
          <g stroke="#1d2033" strokeWidth="5" strokeLinecap="round" fill="none">
            <path d="M36 54 q8 -10 16 0" />
            <path d="M68 54 q8 -10 16 0" />
          </g>
        ) : (
          <g>
            <motion.g
              animate={reduce ? undefined : { scaleY: [1, 1, 0.1, 1] }}
              transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.9, 0.95, 1] }}
              style={{ originY: "52px" }}
            >
              <ellipse cx="44" cy="52" rx="9" ry="11" fill="#fff" />
              <ellipse cx="76" cy="52" rx="9" ry="11" fill="#fff" />
              <circle cx={mood === "think" ? 47 : 45} cy={mood === "think" ? 47 : mood === "sad" ? 56 : 53} r="5" fill="#1d2033" />
              <circle cx={mood === "think" ? 79 : 77} cy={mood === "think" ? 47 : mood === "sad" ? 56 : 53} r="5" fill="#1d2033" />
              <circle cx={mood === "think" ? 49 : 47} cy={mood === "think" ? 45 : 51} r="1.6" fill="#fff" />
              <circle cx={mood === "think" ? 81 : 79} cy={mood === "think" ? 45 : 51} r="1.6" fill="#fff" />
            </motion.g>
            {mood === "sad" && (
              <g stroke="#1d2033" strokeWidth="3" strokeLinecap="round">
                <path d="M34 42 l12 -5" />
                <path d="M86 42 l-12 -5" />
              </g>
            )}
          </g>
        )}
        {/* mouth */}
        {mood === "sad" ? (
          <path d="M52 78 q8 -7 16 0" stroke="#1d2033" strokeWidth="4" strokeLinecap="round" fill="none" />
        ) : mood === "think" ? (
          <circle cx="62" cy="76" r="3.5" fill="#1d2033" />
        ) : (
          <path d={eyesClosedHappy ? "M48 70 q12 16 24 0 z" : "M51 72 q9 9 18 0"} stroke="#1d2033" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill={eyesClosedHappy ? "#1d2033" : "none"} />
        )}
        {/* thinking dots */}
        {mood === "think" &&
          [0, 1, 2].map((i) => (
            <motion.circle key={i} cx={98 + i * 7} cy={14 - i * 3} r={2.2 + i * 0.6} fill="var(--brand-shade)" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
          ))}
      </svg>
    </motion.div>
  );
}
