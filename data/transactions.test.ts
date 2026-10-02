import { describe, expect, it } from "vitest";
import { FEED_MONTHS, feedIncludesDormantSubscription, generateTransactions, transactionsForPersona } from "./transactions";
import { SPENDING_CATEGORIES } from "@/lib/spending/model";

describe("transaction feed", () => {
  it("produces the same six months for every persona", () => {
    for (const id of ["sam", "priya", "mark"]) {
      const first = generateTransactions(id);
      const second = generateTransactions(id);
      expect(second).toEqual(first);
      const months = [...new Set(first.map((tx) => tx.date.slice(0, 7)))];
      expect(months).toEqual([...FEED_MONTHS]);
      expect(feedIncludesDormantSubscription(first)).toBe(true);
      for (const category of SPENDING_CATEGORIES) {
        expect(first.some((tx) => tx.category === category)).toBe(true);
      }
    }
  });

  it("keeps dormant subscriptions on a flat monthly amount", () => {
    const priya = transactionsForPersona("priya").filter((tx) => tx.merchant === "ClassPass");
    expect(priya).toHaveLength(6);
    expect(new Set(priya.map((tx) => tx.amount))).toEqual(new Set([29]));
    const days = priya.map((tx) => Number(tx.date.slice(8)));
    expect(days.every((day, index) => index === 0 || day === days[0])).toBe(true);
  });
});
