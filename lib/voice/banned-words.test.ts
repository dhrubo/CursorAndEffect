import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/data/personas";
import { buildMockReply } from "@/lib/ai/mock";
import { buildPlan } from "@/lib/finance/ladder";
import { deriveMilestones, distanceLeftLine } from "@/lib/goals/milestones";
import { openingHistory } from "@/lib/history";
import { buildWrappedStory } from "@/lib/wrapped/story";
import type { Goal } from "@/lib/goals/model";

/**
 * User-visible milestone and coach builders only.
 * Ladder safety copy such as "we don't recommend specific investments" stays in
 * lib/finance/ladder.ts and is not scanned here.
 */
const BANNED: { label: string; pattern: RegExp }[] = [
  { label: "failed", pattern: /\bfailed\b/i },
  { label: "bad", pattern: /\bbad\b/i },
  { label: "impulsive", pattern: /\bimpulsive\b/i },
  { label: "regret", pattern: /\bregret\b/i },
  { label: "don't", pattern: /\bdon['’]t\b/i },
  { label: "should have", pattern: /\bshould have\b/i },
];

const PROMPTS = [
  "How am I doing?",
  "What spending could I cut?",
  "Avalanche or snowball for my debts?",
  "What should I do with my next £500?",
];

const goal: Goal = {
  id: "holiday",
  name: "Cornwall week",
  target: 800,
  targetDate: "2027-06-01",
  saved: 200,
  kind: "purchase",
};

function bannedIn(text: string): string[] {
  return BANNED.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label);
}

describe("milestone and coach copy", () => {
  it("keeps banned words out of milestone headlines, wrapped slides and scripted coach replies", () => {
    const today = new Date(2026, 9, 2);
    const lines: string[] = [];

    for (const persona of PERSONAS) {
      const profile = persona.profile;
      const plan = buildPlan(profile);
      const milestones = deriveMilestones({ profile, plan, goals: [goal], today });
      for (const milestone of milestones) lines.push(distanceLeftLine(milestone));

      const story = buildWrappedStory({
        profile,
        goals: [goal],
        history: openingHistory(profile, plan, today),
        today,
      });
      lines.push(story.pin.name, story.pin.eta);
      for (const beat of story.beats) lines.push(beat.kicker, beat.title, beat.figure, beat.body);

      for (const prompt of PROMPTS) {
        lines.push(buildMockReply({ profile, text: prompt, goals: [goal], today }).text);
      }
    }

    const hits = lines.flatMap((line) => bannedIn(line).map((word) => `${word}: ${line}`));
    expect(hits).toEqual([]);
  });
});