/** Colourful, illustrated navigation icons (Duolingo-style), drawn for ClarifyMe. */

type P = { size?: number };

export function LearnIcon({ size = 32 }: P) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <path d="M5 15 L16 5 L27 15 Z" fill="#ff5d5d" />
      <path d="M8 14 H24 V27 H8 Z" fill="#ffc23d" />
      <path d="M8 14 H24 V17 H8 Z" fill="#e09b00" opacity="0.4" />
      <rect x="13" y="19" width="6" height="8" rx="1.5" fill="#d9413f" />
      <rect x="10" y="17" width="3" height="3" rx="0.8" fill="#fffaf2" />
      <path d="M4 15.5 L16 4.5 L28 15.5" stroke="#d9413f" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function QuestsIcon({ size = 32 }: P) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <path d="M5 13 Q5 6 16 6 Q27 6 27 13 Z" fill="#c8761a" />
      <rect x="5" y="13" width="22" height="13" rx="2" fill="#e8962f" />
      <rect x="5" y="13" width="22" height="3" fill="#b5651a" />
      <rect x="14" y="12" width="4" height="7" rx="1" fill="#ffc23d" stroke="#b5651a" strokeWidth="1" />
      <path d="M9 6.8 V26 M23 6.8 V26" stroke="#b5651a" strokeWidth="1.6" />
    </svg>
  );
}

export function ReviewIcon({ size = 32 }: P) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <rect x="7" y="5" width="18" height="23" rx="3" fill="#e9f0ff" stroke="#2f8cf0" strokeWidth="2" />
      <path d="M11 11 H21 M11 15 H21 M11 19 H17" stroke="#2f8cf0" strokeWidth="2" strokeLinecap="round" />
      <circle cx="22" cy="22" r="5.5" fill="#34c759" />
      <path d="M19.5 22 l2 2 l3.5 -4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ProfileIcon({ size = 32 }: P) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <circle cx="16" cy="16" r="13" fill="#a660f0" />
      <circle cx="16" cy="13" r="5" fill="#ffd9b8" />
      <path d="M7.5 25 Q16 15 24.5 25" fill="#ffd9b8" />
      <path d="M10.5 11 Q16 4 21.5 11 Q19 8.5 16 9 Q13 8.5 10.5 11 Z" fill="#2b2d42" />
    </svg>
  );
}

export function AboutIcon({ size = 32 }: P) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <polygon points="16,10 31,6 31,14" fill="#ffe27a" />
      <polygon points="16,10 1,6 1,14" fill="#ffe27a" />
      <path d="M12 13 H20 L22 28 H10 Z" fill="#fffaf2" stroke="#2b2d42" strokeOpacity="0.15" />
      <rect x="10" y="17" width="12" height="3" fill="#ff5d5d" />
      <rect x="10" y="23" width="12" height="3" fill="#ff5d5d" />
      <rect x="12" y="6" width="8" height="6" rx="2" fill="#ffe27a" stroke="#2b2d42" strokeWidth="1.5" />
      <path d="M11 6.5 Q16 1 21 6.5 Z" fill="#ff5d5d" />
    </svg>
  );
}

/** Small gem used for XP rewards. */
export function GemIcon({ size = 20 }: P) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden>
      <path d="M4 3 H16 L19 8 L10 18 L1 8 Z" fill="#2f8cf0" />
      <path d="M4 3 L7 8 H1 Z M16 3 L13 8 H19 Z" fill="#7cc0ff" />
      <path d="M7 8 L10 18 L13 8 Z" fill="#1d65b8" />
    </svg>
  );
}

/** Closed treasure chest (path node / quest reward). */
export function ChestIcon({ size = 40, open = false, gray = false }: P & { open?: boolean; gray?: boolean }) {
  const wood = gray ? "#c4c7d3" : "#e8962f";
  const dark = gray ? "#a8acba" : "#b5651a";
  const lid = gray ? "#b6b9c6" : "#c8761a";
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden>
      {open ? <path d="M6 15 Q8 4 20 4 Q32 4 34 15 L30 17 Q28 9 20 9 Q12 9 10 17 Z" fill={lid} /> : <path d="M5 17 Q5 7 20 7 Q35 7 35 17 Z" fill={lid} />}
      {open && <ellipse cx="20" cy="18" rx="12" ry="3" fill="#ffc23d" />}
      <rect x="5" y="17" width="30" height="17" rx="3" fill={wood} />
      <rect x="5" y="17" width="30" height="4" fill={dark} />
      <rect x="17.5" y="16" width="5" height="9" rx="1.2" fill={gray ? "#dfe1e8" : "#ffc23d"} stroke={dark} strokeWidth="1.2" />
      <path d="M11 8 V34 M29 8 V34" stroke={dark} strokeWidth="2" opacity={open ? 0.6 : 1} />
    </svg>
  );
}

export function TrophyIcon({ size = 40, gray = false }: P & { gray?: boolean }) {
  const gold = gray ? "#c4c7d3" : "#ffc23d";
  const shade = gray ? "#a8acba" : "#e09b00";
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden>
      <path d="M10 6 H30 V14 Q30 24 20 25 Q10 24 10 14 Z" fill={gold} />
      <path d="M10 9 H5 Q5 18 12 18 M30 9 H35 Q35 18 28 18" stroke={shade} strokeWidth="2.5" fill="none" />
      <rect x="17" y="25" width="6" height="5" fill={shade} />
      <rect x="12" y="30" width="16" height="5" rx="2" fill={shade} />
      <path d="M16 11 L18 15 L22 15.5 L19 18 L20 22 L16.5 20 L13 22 L14 18 L11 15.5 L15 15 Z" fill="#fff" opacity={gray ? 0.5 : 0.8} transform="translate(3.5 -2)" />
    </svg>
  );
}
