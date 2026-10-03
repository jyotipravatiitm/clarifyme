import { describe, expect, it } from "vitest";
import { DEFAULT_PROGRESS, applyChest, applyLessonResult, mergeProgress, normalizeProgress, withFreshDay } from "./progress-core";
import { applyQuestClaim, questsFor } from "./quests";

describe("progress", () => {
  it("adds XP, keeps best stars, and extends the streak once the daily goal is met", () => {
    const a = applyLessonResult(DEFAULT_PROGRESS, "l1", 2, 20, "2026-10-01");
    expect(a.next.xp).toBe(20);
    expect(a.reward.streakExtended).toBe(false);
    const b = applyLessonResult(a.next, "l1", 1, 15, "2026-10-01");
    expect(b.next.completed.l1).toEqual({ stars: 2, xp: 20 });
    expect(b.reward.goalReached).toBe(true);
    expect(b.reward.streakExtended).toBe(true);
    expect(b.next.streak).toBe(1);
    const c = applyLessonResult(b.next, "l2", 3, 30, "2026-10-01");
    expect(c.reward.streakExtended).toBe(false);
    expect(c.next.streak).toBe(1);
  });

  it("continues the streak the next day and resets it after a missed day", () => {
    const day1 = applyLessonResult(DEFAULT_PROGRESS, "l1", 3, 30, "2026-10-01").next;
    const day2 = applyLessonResult(day1, "l2", 3, 30, "2026-10-02").next;
    expect(day2.streak).toBe(2);
    expect(day2.dailyXp).toBe(30);
    expect(withFreshDay(day2, "2026-10-04").streak).toBe(0);
    expect(withFreshDay(day2, "2026-10-03").streak).toBe(2);
  });
});


describe("mergeProgress", () => {
  it("keeps the best of both", () => {
    const local = { ...DEFAULT_PROGRESS, xp: 50, streak: 2, streakDay: "2026-10-02", completed: { a: { stars: 3, xp: 20 }, b: { stars: 1, xp: 5 } } };
    const server = { ...DEFAULT_PROGRESS, xp: 80, streak: 5, streakDay: "2026-10-01", completed: { b: { stars: 2, xp: 8 }, c: { stars: 3, xp: 25 } } };
    const m = mergeProgress(local, server);
    expect(m.xp).toBe(80);
    expect(m.streak).toBe(2);
    expect(m.streakDay).toBe("2026-10-02");
    expect(m.completed).toEqual({ a: { stars: 3, xp: 20 }, b: { stars: 2, xp: 8 }, c: { stars: 3, xp: 25 } });
  });
});


describe("chests and quests", () => {
  it("opens a chest once", () => {
    const a = applyChest(DEFAULT_PROGRESS, "writing-u1-c1", "2026-10-01")!;
    expect(a.next.xp).toBe(15);
    expect(applyChest(a.next, "writing-u1-c1", "2026-10-01")).toBeNull();
  });

  it("tracks and claims daily quests, resetting each day", () => {
    let p = applyLessonResult(DEFAULT_PROGRESS, "l1", 3, 20, "2026-10-01", 3).next;
    p = applyLessonResult(p, "l2", 3, 20, "2026-10-01", 2).next;
    const qs = questsFor(p, "2026-10-01");
    expect(qs.map((q) => [q.id, q.done])).toEqual([["xp", true], ["perfect", true], ["lessons", true]]);
    const claimed = applyQuestClaim(p, "lessons", "2026-10-01")!;
    expect(claimed.next.xp).toBe(p.xp + 15);
    expect(applyQuestClaim(claimed.next, "lessons", "2026-10-01")).toBeNull();
    expect(questsFor(claimed.next, "2026-10-02").every((q) => !q.done && !q.claimed)).toBe(true);
  });

  it("refuses unfinished quests and fills old saved progress", () => {
    expect(applyQuestClaim(DEFAULT_PROGRESS, "xp", "2026-10-01")).toBeNull();
    const old = normalizeProgress({ xp: 5 } as never);
    expect(old.chests).toEqual([]);
    expect(old.quests.claimed).toEqual([]);
  });
});
