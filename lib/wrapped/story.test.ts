import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/data/personas";
import { openingHistory } from "@/lib/history";
import { buildPlan } from "@/lib/finance/ladder";
import { buildWrappedStory } from "./story";

describe("wrapped story", () => {
  it("builds six beats for Priya", () => {
    const priya = PERSONAS.find((persona) => persona.id === "priya")!.profile;
    const today = new Date(2026, 9, 2);
    const story = buildWrappedStory({
      profile: priya,
      history: openingHistory(priya, buildPlan(priya), today),
      today,
    });
    expect(story.beats.map((beat) => beat.id)).toEqual(["saved", "best-month", "shift", "milestones", "debt", "next"]);
    expect(story.beats.every((beat) => beat.title && beat.body && beat.figure)).toBe(true);
    expect(story.share.name).toBe("Priya");
  });
});
