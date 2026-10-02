import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/data/personas";
import { transactionsForPersona } from "@/data/transactions";
import { buildPlan } from "@/lib/finance/ladder";
import { planEffectOfCut, reviewSpending, suggestSpendingChanges } from "./insights";

const priya = PERSONAS.find((persona) => persona.id === "priya")!.profile;
const feed = transactionsForPersona("priya");

describe("spending insights", () => {
  it("detects monthly recurring charges and unused subscriptions", () => {
    const review = reviewSpending(feed);
    const merchants = review.recurring.map((row) => row.merchant);
    expect(merchants).toContain("ClassPass");
    expect(merchants).toContain("Netflix");
    expect(merchants).not.toContain("Sainsbury's");
    expect(review.unusedSubscriptions.map((row) => row.merchant)).toEqual(["ClassPass"]);
    expect(review.months).toHaveLength(6);
  });

  it("ranks the biggest month-over-month category move", () => {
    const review = reviewSpending(feed);
    expect(review.latestMonth).toBe("2026-09");
    expect(review.previousMonth).toBe("2026-08");
    const eating = review.categoryDeltas.find((row) => row.category === "eating_out");
    expect(eating?.delta).toBeGreaterThan(0);
    expect(review.topMovers[0].category).toBe("eating_out");
  });

  it("expresses a cut as ladder progress through buildPlan", () => {
    const before = buildPlan(priya);
    const effect = planEffectOfCut(priya, 30);
    expect(effect.surplusAfter).toBe(before.metrics.monthlySurplus + 30);
    expect(effect.surplusBefore).toBe(before.metrics.monthlySurplus);
    expect(effect.progressLine.length).toBeGreaterThan(10);
    expect(effect.oneMonthDestination).toBeTruthy();
  });

  it("suggests cancelling the unused subscription and trimming the jump", () => {
    const suggestions = suggestSpendingChanges(priya, feed);
    expect(suggestions.map((suggestion) => suggestion.id)).toContain("unused:ClassPass");
    expect(suggestions.some((suggestion) => suggestion.category === "eating_out")).toBe(true);
    for (const suggestion of suggestions) {
      expect(suggestion.freeableMonthly).toBeGreaterThanOrEqual(5);
      expect(suggestion.planEffect.freeableMonthly).toBe(suggestion.freeableMonthly);
    }
  });
});
