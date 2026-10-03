"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";

export type Mood = "idle" | "think" | "happy" | "sad" | "cheer";

const INK = "#2b2d42";
const RED = "#ff5d5d";
const RED_DARK = "#d9413f";
const WALL = "#fffaf2";
const WALL_SHADE = "#f1e6d6";
const GLASS = "#ffe27a";

/**
 * Lumi, the ClarifyMe lighthouse. Her beam cuts through fog — and fog is vague writing.
 * "No fog allowed." Pure SVG + Motion; `mood` drives the beam, face and arms.
 */
export function Mascot({ mood = "idle", size = 120, className = "" }: { mood?: Mood; size?: number; className?: string }) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const happy = mood === "happy" || mood === "cheer";

  const body = reduce
    ? undefined
    : {
        idle: { y: [0, -2, 0], rotate: 0, transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" as const } },
        think: { y: 0, rotate: [-2, 2, -2], transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" as const } },
        happy: { y: [0, -10, 0], rotate: 0, transition: { duration: 0.45, repeat: 2, ease: "easeOut" as const } },
        sad: { y: 2, rotate: -3, transition: { type: "spring" as const, stiffness: 120 } },
        cheer: { y: [0, -16, 0], rotate: [0, -4, 4, 0], transition: { duration: 0.7, repeat: Infinity, repeatDelay: 0.35 } },
      }[mood];

  const beam = reduce
    ? undefined
    : {
        idle: { rotate: [-18, 18, -18], opacity: 0.85, transition: { duration: 5, repeat: Infinity, ease: "easeInOut" as const } },
        think: { rotate: [-8, 8, -8], opacity: [0.25, 0.7, 0.25], transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" as const } },
        happy: { rotate: 0, opacity: 1, scaleY: [1, 1.5, 1], transition: { duration: 0.6, repeat: 2 } },
        sad: { rotate: 10, opacity: 0.2, transition: { duration: 0.6 } },
        cheer: { rotate: [0, 360], opacity: 1, transition: { duration: 2.2, repeat: Infinity, ease: "linear" as const } },
      }[mood];

  const armL = mood === "cheer" ? { d: ["M42 74 Q30 66 30 54", "M42 72 Q28 58 34 44", "M42 74 Q30 66 30 54"] } : mood === "sad" ? { d: "M42 76 Q34 84 36 92" } : { d: "M42 74 Q32 78 33 88" };
  const armR =
    happy ? { d: ["M78 74 Q90 66 90 54", "M78 72 Q92 58 86 44", "M78 74 Q90 66 90 54"] } : mood === "think" ? { d: "M78 74 Q86 70 80 62" } : mood === "sad" ? { d: "M78 76 Q86 84 84 92" } : { d: "M78 74 Q88 78 87 88" };

  return (
    <motion.div className={className} style={{ width: size, height: size }} animate={body} aria-hidden>
      <svg viewBox="0 0 120 120" width={size} height={size} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={`beamR${uid}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={GLASS} stopOpacity="0.95" />
            <stop offset="1" stopColor={GLASS} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`beamL${uid}`} x1="1" x2="0" y1="0" y2="0">
            <stop offset="0" stopColor={GLASS} stopOpacity="0.95" />
            <stop offset="1" stopColor={GLASS} stopOpacity="0" />
          </linearGradient>
          <clipPath id={`tower${uid}`}>
            <path d="M45 50 H75 L82 104 H38 Z" />
          </clipPath>
          <radialGradient id={`glow${uid}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff6c9" />
            <stop offset="1" stopColor={GLASS} />
          </radialGradient>
        </defs>

        {/* light beam (behind the tower); its box is centred on the lamp, so it rotates around it */}
        <motion.g animate={beam} initial={false}>
          <polygon points="60,37 118,22 118,52" fill={`url(#beamR${uid})`} />
          <polygon points="60,37 2,22 2,52" fill={`url(#beamL${uid})`} />
        </motion.g>

        {/* rock + shadow */}
        <ellipse cx="60" cy="112" rx="34" ry="5" fill={INK} opacity="0.08" />
        <path d="M30 108 Q34 98 46 100 L74 100 Q86 98 90 108 Z" fill="#9aa5b8" />
        <path d="M34 108 Q38 102 48 103 L60 103" stroke="#b9c2d1" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* arms */}
        <motion.path d="M42 74 Q32 78 33 88" stroke={RED_DARK} strokeWidth="6" strokeLinecap="round" fill="none" animate={armL} transition={{ duration: 0.7, repeat: mood === "cheer" ? Infinity : 0, repeatDelay: 0.35 }} />
        <motion.path d="M78 74 Q88 78 87 88" stroke={RED_DARK} strokeWidth="6" strokeLinecap="round" fill="none" animate={armR} transition={{ duration: 0.7, repeat: happy ? Infinity : 0, repeatDelay: 0.35 }} />

        {/* tower with stripes */}
        <g clipPath={`url(#tower${uid})`}>
          <rect x="30" y="48" width="60" height="60" fill={WALL} />
          <rect x="30" y="62" width="60" height="10" fill={RED} />
          <rect x="30" y="84" width="60" height="10" fill={RED} />
          <rect x="66" y="48" width="24" height="60" fill={WALL_SHADE} opacity="0.55" />
        </g>
        <path d="M45 50 H75 L82 104 H38 Z" fill="none" stroke={INK} strokeOpacity="0.12" strokeWidth="1.5" />
        {/* door */}
        <path d="M55 104 V96 Q60 90 65 96 V104 Z" fill={INK} opacity="0.8" />

        {/* gallery + lamp room */}
        <rect x="38" y="46" width="44" height="6" rx="3" fill={INK} />
        <rect x="43" y="25" width="34" height="22" rx="7" fill={`url(#glow${uid})`} stroke={INK} strokeWidth="2.5" />
        {/* roof */}
        <path d="M40 26 Q60 6 80 26 Z" fill={RED} stroke={RED_DARK} strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="60" cy="10" r="3.2" fill={RED_DARK} />

        {/* face inside the lamp room */}
        <circle cx="49" cy="40" r="3" fill="#ff8fa3" opacity={mood === "sad" ? 0.25 : 0.6} />
        <circle cx="71" cy="40" r="3" fill="#ff8fa3" opacity={mood === "sad" ? 0.25 : 0.6} />
        {happy ? (
          <g stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none">
            <path d="M50 34 q4 -5 8 0" />
            <path d="M62 34 q4 -5 8 0" />
          </g>
        ) : (
          <motion.g
            animate={reduce ? undefined : { scaleY: [1, 1, 0.1, 1] }}
            transition={{ duration: 3.4, repeat: Infinity, times: [0, 0.9, 0.95, 1] }}
            style={{ originY: "34px" }}
          >
            <ellipse cx="54" cy="34" rx="3.6" ry="4.4" fill="#fff" />
            <ellipse cx="66" cy="34" rx="3.6" ry="4.4" fill="#fff" />
            <circle cx={mood === "think" ? 55 : 54.5} cy={mood === "think" ? 31.5 : mood === "sad" ? 35.5 : 34.5} r="2.3" fill={INK} />
            <circle cx={mood === "think" ? 67 : 66.5} cy={mood === "think" ? 31.5 : mood === "sad" ? 35.5 : 34.5} r="2.3" fill={INK} />
          </motion.g>
        )}
        {mood === "sad" && (
          <g stroke={INK} strokeWidth="1.6" strokeLinecap="round">
            <path d="M50 29 l6 -2" />
            <path d="M70 29 l-6 -2" />
          </g>
        )}
        {mood === "sad" ? (
          <path d="M56 43 q4 -3 8 0" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
        ) : mood === "think" ? (
          <circle cx="61" cy="42.5" r="1.6" fill={INK} />
        ) : (
          <path d={happy ? "M55 40.5 q5 6 10 0 z" : "M56 41 q4 3.5 8 0"} stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill={happy ? INK : "none"} />
        )}

        {/* fog drifting over a sad Lumi */}
        {mood === "sad" && (
          <motion.g animate={reduce ? undefined : { x: [10, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}>
            <Cloud x={84} y={30} s={1.05} opacity={0.95} />
            <Cloud x={34} y={46} s={0.7} opacity={0.85} />
          </motion.g>
        )}
        {/* thinking dots */}
        {mood === "think" &&
          [0, 1, 2].map((i) => (
            <motion.circle key={i} cx={90 + i * 7} cy={14 - i * 4} r={2 + i * 0.6} fill={INK} opacity={0.5} animate={reduce ? undefined : { opacity: [0.15, 0.7, 0.15] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
          ))}
        {/* sparkles when cheering */}
        {mood === "cheer" &&
          [
            [18, 18],
            [102, 14],
            [12, 70],
            [108, 66],
          ].map(([x, y], i) => (
            <motion.path
              key={i}
              d={`M${x} ${y - 5} L${x + 1.5} ${y - 1.5} L${x + 5} ${y} L${x + 1.5} ${y + 1.5} L${x} ${y + 5} L${x - 1.5} ${y + 1.5} L${x - 5} ${y} L${x - 1.5} ${y - 1.5} Z`}
              fill="#ffc23d"
              animate={reduce ? undefined : { scale: [0, 1.2, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.25 }}
              style={{ originX: `${x}px`, originY: `${y}px` }}
            />
          ))}
      </svg>
    </motion.div>
  );
}

/** A soft fog cloud. Fog = vague writing; Lumi clears it. */
export function Cloud({ x, y, s = 1, opacity = 1 }: { x: number; y: number; s?: number; opacity?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={opacity}>
      <ellipse cx="0" cy="6" rx="18" ry="7" fill="#c9d1de" />
      <circle cx="-8" cy="2" r="7" fill="#d7dde8" />
      <circle cx="4" cy="-1" r="9" fill="#e1e6ee" />
      <circle cx="13" cy="4" r="6" fill="#d7dde8" />
    </g>
  );
}

/** Drifting fog banks for hero and empty-state backgrounds. */
export function FogBank({ className = "" }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 400 80" className={className} preserveAspectRatio="none" aria-hidden>
      {[
        [40, 40, 1.6, 0.9, 0],
        [160, 50, 2, 0.75, 1],
        [290, 38, 1.8, 0.85, 2],
        [370, 55, 1.4, 0.7, 3],
      ].map(([x, y, s, o, i]) => (
        <motion.g key={i} animate={reduce ? undefined : { x: [0, i % 2 ? 14 : -14, 0] }} transition={{ duration: 7 + i, repeat: Infinity, ease: "easeInOut" }}>
          <Cloud x={x} y={y} s={s} opacity={o} />
        </motion.g>
      ))}
    </svg>
  );
}
