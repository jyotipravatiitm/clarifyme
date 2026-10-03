import { describe, expect, it } from "vitest";
import { CHALLENGES, TRACKS, allLessons, getChallenge, toPublic } from "./content";
import { runRules } from "./rules";
import { matchesAllGroups } from "./judge/keywords";

describe("content", () => {
  it("has unique challenge and lesson ids", () => {
    const ids = CHALLENGES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    const lessonIds = allLessons().map((l) => l.lesson.id);
    expect(new Set(lessonIds).size).toBe(lessonIds.length);
  });

  it("every lesson step points to a challenge, and every challenge is used", () => {
    const used = new Set<string>();
    for (const t of TRACKS) for (const u of t.units) for (const l of u.lessons) for (const s of l.steps) {
      expect(getChallenge(s), `${l.id} -> ${s}`).toBeDefined();
      used.add(s);
    }
    expect([...used].sort()).toEqual(CHALLENGES.map((c) => c.id).sort());
  });

  it("every example answer passes its own rules (no errors) and mentions what it must", () => {
    for (const c of CHALLENGES) {
      if (c.kind !== "write") continue;
      const errors = runRules(c.exampleGood, c.rules, c.options).filter((i) => i.severity === "error");
      expect(errors.map((e) => `${c.id}: ${e.message}`)).toEqual([]);
      expect(matchesAllGroups(c.exampleGood, c.mustMention), `${c.id} example misses mustMention`).toBe(true);
    }
  });

  it("break challenges are passable", () => {
    for (const c of CHALLENGES) {
      if (c.kind !== "break") continue;
      expect(c.minToPass).toBeLessThanOrEqual(c.hiddenCases.length);
      // each hidden case's own description should match its keywords offline
      for (const h of c.hiddenCases) expect(matchesAllGroups(`${h.title}. ${h.description}`, h.keywords), `${c.id}/${h.id}`).toBe(true);
    }
  });

  it("public view hides answers", () => {
    for (const c of CHALLENGES) {
      const p = JSON.stringify(toPublic(c));
      if (c.kind === "write") expect(p).not.toContain(c.intent);
      else for (const h of c.hiddenCases) expect(p).not.toContain(h.description);
    }
  });
});
