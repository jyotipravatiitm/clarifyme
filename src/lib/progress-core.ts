/** Pure progress logic, shared by the browser store and the server. */

export type TrackId = "writing" | "thinking" | "spec";

/** Today's quest counters. Reset when the day changes. */
export interface QuestDay {
  day: string | null;
  lessons: number;
  perfect: number;
  claimed: string[];
}

/** Per-learner progress (browser storage, synced to the account when signed in). */
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
  /** Finished the welcome flow (track + daily goal). */
  onboarded: boolean;
  /** Track picked during onboarding; the path opens on it. */
  track: TrackId | null;
  /** Treasure chests already opened on the path. */
  chests: string[];
  quests: QuestDay;
  /** XP earned per day (last 30 days), for the profile activity row. */
  activity: Record<string, number>;
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
  onboarded: false,
  track: null,
  chests: [],
  quests: { day: null, lessons: 0, perfect: 0, claimed: [] },
  activity: {},
};

export const CHEST_XP = 15;

export function today(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function shiftDay(day: string, delta: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return today(new Date(y, m - 1, d + delta));
}

/** Fills fields missing from older saved progress. */
export function normalizeProgress(p: Partial<Progress> | null | undefined): Progress {
  const base = { ...DEFAULT_PROGRESS, ...(p ?? {}) };
  return { ...base, quests: { ...DEFAULT_PROGRESS.quests, ...(p?.quests ?? {}) }, chests: p?.chests ?? [], activity: p?.activity ?? {} };
}

/** Rolls the daily counters over and breaks a streak that missed a day. */
export function withFreshDay(input: Progress, now = today()): Progress {
  let next = normalizeProgress(input);
  if (next.dailyDay !== now) next = { ...next, dailyXp: 0, dailyDay: now };
  if (next.quests.day !== now) next = { ...next, quests: { day: now, lessons: 0, perfect: 0, claimed: [] } };
  if (next.streakDay && next.streakDay !== now && next.streakDay !== shiftDay(now, -1)) next = { ...next, streak: 0 };
  return next;
}

export interface LessonReward {
  xpGained: number;
  streakExtended: boolean;
  goalReached: boolean;
  newStreak: number;
}

/** Adds XP for today: total, daily goal, streak and activity log. */
export function addXp(p: Progress, xp: number, now = today()): { next: Progress; reward: LessonReward } {
  const base = withFreshDay(p, now);
  const dailyXp = base.dailyXp + xp;
  const goalReached = base.dailyXp < base.dailyGoal && dailyXp >= base.dailyGoal;
  const streakExtended = dailyXp >= base.dailyGoal && base.streakDay !== now;
  const streak = streakExtended ? base.streak + 1 : base.streak;
  const activity: Record<string, number> = { ...base.activity, [now]: (base.activity[now] ?? 0) + xp };
  const cutoff = shiftDay(now, -30);
  for (const day of Object.keys(activity)) if (day < cutoff) delete activity[day];
  return {
    next: { ...base, xp: base.xp + xp, dailyXp, streak, streakDay: streakExtended ? now : base.streakDay, activity },
    reward: { xpGained: xp, streakExtended, goalReached, newStreak: streak },
  };
}

/** Pure reducer so it can be unit tested. `perfect` = steps answered with 3 stars. */
export function applyLessonResult(p: Progress, lessonId: string, stars: number, xp: number, now = today(), perfect = 0): { next: Progress; reward: LessonReward } {
  const { next: withXp, reward } = addXp(p, xp, now);
  const prev = withXp.completed[lessonId];
  const next: Progress = {
    ...withXp,
    completed: { ...withXp.completed, [lessonId]: { stars: Math.max(prev?.stars ?? 0, stars), xp: Math.max(prev?.xp ?? 0, xp) } },
    quests: { ...withXp.quests, lessons: withXp.quests.lessons + 1, perfect: withXp.quests.perfect + perfect },
  };
  return { next, reward };
}

/** Opens a treasure chest once. Returns null when it was already opened. */
export function applyChest(p: Progress, chestId: string, now = today()): { next: Progress; reward: LessonReward } | null {
  if (p.chests?.includes(chestId)) return null;
  const { next, reward } = addXp(p, CHEST_XP, now);
  return { next: { ...next, chests: [...next.chests, chestId] }, reward };
}

/**
 * Merges two progress records (e.g. this browser and the server) without losing anything:
 * highest XP, best stars per lesson, the fresher streak, and today's larger daily XP.
 */
export function mergeProgress(aIn: Progress, bIn: Progress): Progress {
  const a = normalizeProgress(aIn);
  const b = normalizeProgress(bIn);
  const completed: Progress["completed"] = { ...a.completed };
  for (const [id, v] of Object.entries(b.completed)) {
    const prev = completed[id];
    completed[id] = { stars: Math.max(prev?.stars ?? 0, v.stars), xp: Math.max(prev?.xp ?? 0, v.xp) };
  }
  const streakSrc = (a.streakDay ?? "") > (b.streakDay ?? "") ? a : (b.streakDay ?? "") > (a.streakDay ?? "") ? b : a.streak >= b.streak ? a : b;
  const dailySrc = (a.dailyDay ?? "") > (b.dailyDay ?? "") ? a : (b.dailyDay ?? "") > (a.dailyDay ?? "") ? b : a.dailyXp >= b.dailyXp ? a : b;
  const qa = a.quests;
  const qb = b.quests;
  const quests: QuestDay =
    (qa.day ?? "") === (qb.day ?? "")
      ? { day: qa.day, lessons: Math.max(qa.lessons, qb.lessons), perfect: Math.max(qa.perfect, qb.perfect), claimed: [...new Set([...qa.claimed, ...qb.claimed])] }
      : (qa.day ?? "") > (qb.day ?? "")
        ? qa
        : qb;
  const activity: Record<string, number> = { ...a.activity };
  for (const [d, v] of Object.entries(b.activity)) activity[d] = Math.max(activity[d] ?? 0, v);
  return {
    ...a,
    xp: Math.max(a.xp, b.xp),
    streak: streakSrc.streak,
    streakDay: streakSrc.streakDay,
    dailyXp: dailySrc.dailyXp,
    dailyDay: dailySrc.dailyDay,
    dailyGoal: a.onboarded || !b.onboarded ? a.dailyGoal : b.dailyGoal,
    completed,
    muted: a.muted,
    onboarded: a.onboarded || b.onboarded,
    track: a.track ?? b.track,
    chests: [...new Set([...a.chests, ...b.chests])],
    quests,
    activity,
  };
}
