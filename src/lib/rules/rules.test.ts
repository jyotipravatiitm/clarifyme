import { describe, expect, it } from "vitest";
import { runRules } from "./index";
import { matchesEars } from "./ears";
import { sentences, stems } from "./text";

const ids = (text: string, rule: Parameters<typeof runRules>[1][number]["id"], opts = {}) =>
  runRules(text, [{ id: rule }], opts).map((i) => text.slice(i.start, i.end));

describe("text utils", () => {
  it("splits sentences with offsets", () => {
    const s = sentences("One two. Three four!\nFive");
    expect(s.map((x) => x.text)).toEqual(["One two.", "Three four!", "Five"]);
    expect("One two. Three four!\nFive".slice(s[1].start, s[1].end)).toBe("Three four!");
  });
  it("stems common inflections", () => {
    expect(stems("stopped")).toContain("stop");
    expect(stems("tries")).toContain("try");
    expect(stems("making")).toContain("make");
  });
});

describe("rules", () => {
  it("flags long sentences", () => {
    const long = "word ".repeat(22).trim() + ".";
    expect(ids(long, "sentenceLength", { maxWords: 20 })).toHaveLength(1);
    expect(ids("Short and sweet.", "sentenceLength", { maxWords: 20 })).toHaveLength(0);
  });

  it("flags the over-budget tail", () => {
    expect(ids("one two three four", "totalWords", { maxTotalWords: 2 })).toEqual(["three four"]);
    expect(ids("one two", "totalWords", { maxTotalWords: 2 })).toEqual([]);
  });

  it("flags passive voice but not adjectives", () => {
    expect(ids("The door is locked by the system.", "passiveVoice")).toEqual(["is locked"]);
    expect(ids("The file was quickly deleted.", "passiveVoice")).toEqual(["was quickly deleted"]);
    expect(ids("The system locks the door.", "passiveVoice")).toEqual([]);
    expect(ids("I am tired.", "passiveVoice")).toEqual([]);
  });

  it("flags vague words as whole words only", () => {
    expect(ids("Respond quickly to some tickets as needed.", "vagueWords")).toEqual(["quickly", "some", "as needed"]);
    expect(ids("Respond to awesome tickets.", "vagueWords")).toEqual([]);
  });

  it("flags and/or and slashes", () => {
    expect(ids("Students and/or seniors.", "andOr")).toEqual(["and/or"]);
    expect(ids("Use email/SMS.", "andOr")).toEqual(["email/SMS"]);
  });

  it("flags pronouns with two candidate nouns", () => {
    const text = "When the user uploads the file, it is scanned.";
    expect(ids(text, "ambiguousPronoun")).toEqual(["it"]);
    expect(ids("The file is scanned and it is stored.", "ambiguousPronoun")).toEqual([]);
    expect(ids("When the user uploads the file, this file is scanned.", "ambiguousPronoun")).toEqual([]);
  });

  it("requires must/shall when asked, and flags 'should'", () => {
    expect(ids("The door locks.", "modalKeywords", { requireModal: true })).toHaveLength(1);
    expect(ids("The door must lock.", "modalKeywords", { requireModal: true })).toHaveLength(0);
    expect(ids("The door should lock.", "modalKeywords")).toEqual(["should"]);
  });

  it("recognises EARS templates", () => {
    expect(matchesEars("The door controller shall lock the door.")).toBe(true);
    expect(matchesEars("When the door has been closed for 30 seconds, the door controller shall lock the door.")).toBe(true);
    expect(matchesEars("While the drone is in flight, when the battery falls below 20%, the drone shall return to its launch point.")).toBe(true);
    expect(matchesEars("If the sensor fails, then the system shall stop the motor.")).toBe(true);
    expect(matchesEars("The door locks itself after a while.")).toBe(false);
    expect(matchesEars("Lock the door after 30 seconds.")).toBe(false);
  });

  it("suggests simplified-English swaps", () => {
    const issues = runRules("Utilize the key prior to opening.", [{ id: "steWords" }]);
    expect(issues.map((i) => i.suggestion)).toEqual(['Use "use".', 'Use "before".']);
  });

  it("flags uncommon words in simple-words mode", () => {
    expect(ids("A password is a secret word only you know.", "simpleWords")).toEqual([]);
    expect(ids("A credential authenticates you.", "simpleWords")).toEqual(["credential", "authenticates"]);
  });

  it("applies severity overrides", () => {
    const [issue] = runRules("Do it soon.", [{ id: "vagueWords", severity: "error" }]);
    expect(issue.severity).toBe("error");
  });
});
