import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/data/personas";
import { transactionsForPersona } from "@/data/transactions";
import { buildPlan } from "@/lib/finance/ladder";
import { openingHistory } from "@/lib/history";
import { buildCoachProgress } from "./progress";

const today = new Date(2026, 9, 2);
const priya = PERSONAS.find((persona) => persona.id === "priya")!.profile;

describe("buildCoachProgress", () => {
  it("packs Priya's check-in, milestones and nudges into one snapshot", () => {
    const progress = buildCoachProgress({
      profile: priya,
      history: openingHistory(priya, buildPlan(priya), today),
      transactions: transactionsForPersona("priya"),
      today,
    });

    expect(progress.checkin.headline).toBe("Priya, you're steady.");
    expect(progress.checkin.standing).toBe("steady");
    expect(progress.milestones).toEqual(progress.checkin.milestones);
    expect(progress.milestones.some((milestone) => milestone.id === "debt-free")).toBe(true);
    expect(progress.milestones.some((milestone) => milestone.id === "starter-buffer")).toBe(true);
    expect(progress.nudges.length).toBeGreaterThan(0);
    expect(progress.nudges.every((nudge) => nudge.prompt.trim().length > 0)).toBe(true);
    expect(progress.nudges.some((nudge) => /0%/.test(nudge.title) || /spend/i.test(nudge.prompt))).toBe(true);
  });

  it("stays empty of month-on-month changes when there is no earlier snapshot", () => {
    const progress = buildCoachProgress({
      profile: priya,
      history: [],
      transactions: transactionsForPersona("priya"),
      today,
    });
    expect(progress.checkin.changes).toEqual([]);
    expect(progress.milestones.length).toBeGreaterThan(0);
  });
});
