import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/data/personas";
import { transactionsForPersona } from "@/data/transactions";
import { buildPlan } from "@/lib/finance/ladder";
import { reviewSpending, suggestSpendingChanges } from "@/lib/spending/insights";
import { buildNudges } from "./nudges";

describe("nudges", () => {
  it("turns Priya's 0% warning and spending insights into openers", () => {
    const priya = PERSONAS.find((persona) => persona.id === "priya")!.profile;
    const feed = transactionsForPersona("priya");
    const nudges = buildNudges({
      plan: buildPlan(priya),
      review: reviewSpending(feed),
      suggestions: suggestSpendingChanges(priya, feed),
    });
    expect(nudges.length).toBeGreaterThan(1);
    expect(nudges.some((nudge) => /0%/.test(nudge.title))).toBe(true);
    expect(nudges.some((nudge) => nudge.prompt === "What spending could I cut?")).toBe(true);
    expect(new Set(nudges.map((nudge) => nudge.id)).size).toBe(nudges.length);
  });
});
