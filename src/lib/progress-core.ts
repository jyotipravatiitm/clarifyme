/** Pure progress logic, shared by the browser store and the server. */

/** Per-learner progress, kept in this browser only. */
export interface Progress {
  xp: number;
  streak: number;
  /** Local date (YYYY-MM-DD) of the last day the daily goal was met. */
  streakDay: string | null;
  dailyXp: number;
  dailyDay: string | null;
  dailyGoal: number;
  completed: Record<string, { stars: number; xp: number }>;
  muted: boolean;
}

export const DEFAULT_PROGRESS: Progress = {
  xp: 0,
  streak: 0,
  streakDay: null,
  dailyXp: 0,
  dailyDay: null,
  dailyGoal: 30,
  completed: {},
  muted: false,
};

export function today(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterday(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return today(new Date(y, m - 1, d - 1));
}

/** A streak survives until the end of the day after it was last extended. */
export function withFreshDay(p: Progress, now = today()): Progress {
  let next = p;
  if (p.dailyDay !== now) next = { ...next, dailyXp: 0, dailyDay: now };
  if (p.streakDay && p.streakDay !== now && p.streakDay !== yesterday(now)) next = { ...next, streak: 0 };
  return next;
}

export interface LessonReward {
  xpGained: number;
  streakExtended: boolean;
  goalReached: boolean;
  newStreak: number;
}

/** Pure reducer so it can be unit tested. */
export function applyLessonResult(p: Progress, lessonId: string, stars: number, xp: number, now = today()): { next: Progress; reward: LessonReward } {
  const base = withFreshDay(p, now);
  const prev = base.completed[lessonId];
  const dailyXp = base.dailyXp + xp;
  const goalReached = base.dailyXp < base.dailyGoal && dailyXp >= base.dailyGoal;
  const streakExtended = dailyXp >= base.dailyGoal && base.streakDay !== now;
  const streak = streakExtended ? base.streak + 1 : base.streak;
  const next: Progress = {
    ...base,
    xp: base.xp + xp,
    dailyXp,
    streak,
    streakDay: streakExtended ? now : base.streakDay,
    completed: {
      ...base.completed,
      [lessonId]: { stars: Math.max(prev?.stars ?? 0, stars), xp: Math.max(prev?.xp ?? 0, xp) },
    },
  };
  return { next, reward: { xpGained: xp, streakExtended, goalReached, newStreak: streak } };
}

/**
 * Merges two progress records (e.g. this browser and the server) without losing anything:
 * highest XP, best stars per lesson, the fresher streak, and today's larger daily XP.
 */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const completed: Progress["completed"] = { ...a.completed };
  for (const [id, v] of Object.entries(b.completed)) {
    const prev = completed[id];
    completed[id] = { stars: Math.max(prev?.stars ?? 0, v.stars), xp: Math.max(prev?.xp ?? 0, v.xp) };
  }
  const streakSrc = (a.streakDay ?? "") > (b.streakDay ?? "") ? a : (b.streakDay ?? "") > (a.streakDay ?? "") ? b : a.streak >= b.streak ? a : b;
  const dailySrc = (a.dailyDay ?? "") > (b.dailyDay ?? "") ? a : (b.dailyDay ?? "") > (a.dailyDay ?? "") ? b : a.dailyXp >= b.dailyXp ? a : b;
  return {
    ...a,
    xp: Math.max(a.xp, b.xp),
    streak: streakSrc.streak,
    streakDay: streakSrc.streakDay,
    dailyXp: dailySrc.dailyXp,
    dailyDay: dailySrc.dailyDay,
    dailyGoal: a.dailyGoal,
    completed,
    muted: a.muted,
  };
}
