import { describe, expect, it } from "vitest";
import { CHALLENGES, TRACKS, allLessons, getChallenge, normalizeWord, tapAnswer, tapTokens, toPublic, type ChoiceChallenge, type TapChallenge } from "./content";
import { runRules } from "./rules";
import { matchesAllGroups } from "./judge/keywords";
import { gradeChoice, gradeTap } from "./judge/quick";

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
      else if (c.kind === "break") for (const h of c.hiddenCases) expect(p).not.toContain(h.description);
      else if (c.kind === "choice") {
        expect(p).not.toContain('"correct"');
        for (const o of c.options) expect(p).not.toContain(o.why);
      } else {
        expect(p).not.toContain(c.explain);
        expect(p).not.toContain('"targets"');
      }
    }
  });

  it("quick questions are well-formed", () => {
    for (const c of CHALLENGES) {
      if (c.kind === "tap") {
        const answer = tapAnswer(c);
        // every target word appears in the sentence
        for (const t of c.targets) expect(tapTokens(c.sentence).some((w) => normalizeWord(w) === normalizeWord(t)), `${c.id}: "${t}"`).toBe(true);
        expect(answer.length, c.id).toBeGreaterThan(0);
      }
      if (c.kind === "choice") expect(c.options.filter((o) => o.correct)).toHaveLength(1);
    }
  });

  it("every lesson opens with quick checks and ends with a challenge", () => {
    for (const { lesson } of allLessons()) {
      const kinds = lesson.steps.map((s) => getChallenge(s)!.kind);
      expect(kinds[0] === "choice" || kinds[0] === "tap", lesson.id).toBe(true);
      expect(["write", "break"]).toContain(kinds[kinds.length - 1]);
    }
  });
});

describe("quick grading", () => {
  const choice = getChallenge("q-pro-1") as ChoiceChallenge;
  const tap = getChallenge("q-pro-2") as TapChallenge;

  it("grades choice questions", () => {
    const right = choice.options.findIndex((o) => o.correct);
    expect(gradeChoice(choice, right)).toMatchObject({ pass: true, stars: 3, correctIndex: right });
    const wrong = gradeChoice(choice, (right + 1) % choice.options.length);
    expect(wrong.pass).toBe(false);
    expect(wrong.feedback).toContain(choice.options[right].text);
  });

  it("grades tap questions, requiring every occurrence", () => {
    const answer = tapAnswer(tap);
    expect(answer.length).toBe(2); // "it" appears twice
    expect(gradeTap(tap, answer).pass).toBe(true);
    const partial = gradeTap(tap, [answer[0]]);
    expect(partial).toMatchObject({ pass: false, missed: [answer[1]], extra: [] });
    const extra = gradeTap(tap, [...answer, 0]);
    expect(extra).toMatchObject({ pass: false, extra: [0] });
    expect(gradeTap(tap, [999, -1]).tapped).toEqual([]);
  });
});
