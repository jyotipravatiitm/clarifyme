import { addXp, today, withFreshDay, type LessonReward, type Progress } from "./progress-core";

export type QuestId = "xp" | "perfect" | "lessons";

export interface Quest {
  id: QuestId;
  title: string;
  value: number;
  target: number;
  reward: number;
  done: boolean;
  claimed: boolean;
}

export const PERFECT_TARGET = 5;
export const LESSONS_TARGET = 2;

/** Today's three quests, Duolingo style. They reset every local day. */
export function questsFor(p: Progress, now = today()): Quest[] {
  const f = withFreshDay(p, now);
  const raw: Omit<Quest, "done" | "claimed">[] = [
    { id: "xp", title: `Earn ${f.dailyGoal} XP`, value: f.dailyXp, target: f.dailyGoal, reward: 10 },
    { id: "perfect", title: `Get ${PERFECT_TARGET} perfect answers`, value: f.quests.perfect, target: PERFECT_TARGET, reward: 10 },
    { id: "lessons", title: `Finish ${LESSONS_TARGET} lessons`, value: f.quests.lessons, target: LESSONS_TARGET, reward: 15 },
  ];
  return raw.map((q) => ({ ...q, value: Math.min(q.value, q.target), done: q.value >= q.target, claimed: f.quests.claimed.includes(q.id) }));
}

/** Claims a finished quest's chest. Returns null if it isn't finished or was already claimed. */
export function applyQuestClaim(p: Progress, id: QuestId, now = today()): { next: Progress; reward: LessonReward } | null {
  const q = questsFor(p, now).find((x) => x.id === id);
  if (!q || !q.done || q.claimed) return null;
  const { next, reward } = addXp(withFreshDay(p, now), q.reward, now);
  return { next: { ...next, quests: { ...next.quests, claimed: [...next.quests.claimed, id] } }, reward };
}
