import { z } from "zod";
import writing from "@/content/challenges/writing.json";
import thinking from "@/content/challenges/thinking.json";
import spec from "@/content/challenges/spec.json";
import tracksJson from "@/content/tracks.json";

const RuleIdSchema = z.enum([
  "sentenceLength",
  "totalWords",
  "passiveVoice",
  "vagueWords",
  "ambiguousPronoun",
  "andOr",
  "modalKeywords",
  "earsTemplate",
  "simpleWords",
  "steWords",
]);

const Base = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  /** Short label for the skill this step trains, shown as a chip. */
  skill: z.string(),
  xp: z.number().int().positive().default(10),
});

export const WriteChallengeSchema = Base.extend({
  kind: z.literal("write"),
  prompt: z.string(),
  /** Text the learner rewrites or works from, if any. */
  source: z.string().optional(),
  /** What a correct answer must mean. Hidden from the learner; given to the AI judge. */
  intent: z.string(),
  rules: z.array(z.object({ id: RuleIdSchema, severity: z.enum(["error", "warn", "tip"]).optional() })),
  options: z
    .object({
      maxWords: z.number().int().positive().optional(),
      maxTotalWords: z.number().int().positive().optional(),
      requireModal: z.boolean().optional(),
      allowWords: z.array(z.string()).optional(),
    })
    .default({}),
  /** Words the answer must contain (case-insensitive) when checking without AI. */
  mustMention: z.array(z.array(z.string())).default([]),
  placeholder: z.string().optional(),
  hints: z.array(z.string()).min(1),
  exampleGood: z.string(),
});

export const HiddenCaseSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  description: z.string(),
  /**
   * Offline matching: the learner's case matches when, for every group,
   * at least one word in the group appears in it.
   */
  keywords: z.array(z.array(z.string()).min(1)).min(1),
});

export const BreakChallengeSchema = Base.extend({
  kind: z.literal("break"),
  /** What the learner should hunt for: "corner cases", "hidden assumptions"... */
  huntFor: z.string(),
  prompt: z.string(),
  spec: z.string(),
  hiddenCases: z.array(HiddenCaseSchema).min(3),
  minToPass: z.number().int().positive(),
  hints: z.array(z.string()).min(1),
});

export const ChallengeSchema = z.discriminatedUnion("kind", [WriteChallengeSchema, BreakChallengeSchema]);
export type WriteChallenge = z.infer<typeof WriteChallengeSchema>;
export type BreakChallenge = z.infer<typeof BreakChallengeSchema>;
export type Challenge = z.infer<typeof ChallengeSchema>;
export type HiddenCase = z.infer<typeof HiddenCaseSchema>;

export const LessonSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  icon: z.string(),
  steps: z.array(z.string()).min(1),
});

export const TrackSchema = z.object({
  id: z.enum(["writing", "thinking", "spec"]),
  title: z.string(),
  tagline: z.string(),
  color: z.string(),
  units: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      lessons: z.array(LessonSchema).min(1),
    }),
  ),
});
export type Track = z.infer<typeof TrackSchema>;
export type Lesson = z.infer<typeof LessonSchema>;

export const CHALLENGES: Challenge[] = z.array(ChallengeSchema).parse([...writing, ...thinking, ...spec]);
export const TRACKS: Track[] = z.array(TrackSchema).parse(tracksJson);

const byId = new Map(CHALLENGES.map((c) => [c.id, c]));

export function getChallenge(id: string): Challenge | undefined {
  return byId.get(id);
}

export interface LessonRef {
  track: Track;
  lesson: Lesson;
  /** Position of the lesson in the whole track, 0-based. */
  index: number;
}

export function allLessons(): LessonRef[] {
  const out: LessonRef[] = [];
  for (const track of TRACKS) {
    let index = 0;
    for (const unit of track.units) for (const lesson of unit.lessons) out.push({ track, lesson, index: index++ });
  }
  return out;
}

export function getLesson(id: string): LessonRef | undefined {
  return allLessons().find((l) => l.lesson.id === id);
}

/** What the browser may see. The hidden intent and hidden cases stay on the server. */
export type PublicChallenge =
  | (Omit<WriteChallenge, "intent" | "mustMention"> & { kind: "write" })
  | (Omit<BreakChallenge, "hiddenCases"> & { kind: "break"; caseCount: number });

export function toPublic(c: Challenge): PublicChallenge {
  if (c.kind === "write") {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { intent, mustMention, ...rest } = c;
    return rest;
  }
  const { hiddenCases, ...rest } = c;
  return { ...rest, caseCount: hiddenCases.length };
}
