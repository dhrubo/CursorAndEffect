import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/data/personas";
import type { Debt } from "@/lib/profile";
import { aprAt, compareDebtStrategies, simulatePayoff } from "./debt";

const debt = (overrides: Partial<Debt>): Debt => ({
  id: overrides.name ?? "d",
  name: "Debt",
  type: "credit_card",
  balance: 1000,
  apr: 20,
  minPayment: 25,
  ...overrides,
});

describe("simulatePayoff", () => {
  it("clears a 0% debt in balance / payment months with no interest", () => {
    const r = simulatePayoff([debt({ apr: 0, balance: 1200, minPayment: 100 })], 100, "avalanche");
    expect(r.feasible).toBe(true);
    expect(r.months).toBe(12);
    expect(r.totalInterest).toBe(0);
  });

  it("charges monthly interest at APR / 12", () => {
    const r = simulatePayoff([debt({ apr: 12, balance: 1000, minPayment: 0 })], 2000, "avalanche");
    expect(r.months).toBe(1);
    expect(r.totalInterest).toBe(10);
  });

  it("avalanche never costs more interest than snowball", () => {
    const debts = [
      debt({ name: "small-cheap", balance: 500, apr: 5, minPayment: 20 }),
      debt({ name: "big-expensive", balance: 4000, apr: 30, minPayment: 100 }),
    ];
    const a = simulatePayoff(debts, 400, "avalanche");
    const s = simulatePayoff(debts, 400, "snowball");
    expect(a.totalInterest).toBeLessThan(s.totalInterest);
    expect(s.payoffOrder[0].name).toBe("small-cheap");
    expect(a.payoffOrder[0].name).toBe("big-expensive");
  });

  it("flags budgets that never clear the debt", () => {
    const r = simulatePayoff([debt({ balance: 10000, apr: 30, minPayment: 50 })], 50, "avalanche");
    expect(r.feasible).toBe(false);
  });

  it("ignores student loans", () => {
    const r = simulatePayoff([debt({ type: "student_loan", balance: 40000 })], 100, "avalanche");
    expect(r.months).toBe(0);
  });
});

describe("aprAt", () => {
  it("switches to the revert APR when a promo ends", () => {
    const d = debt({ apr: 0, promoMonthsLeft: 3, revertApr: 24.9 });
    expect(aprAt(d, 2)).toBe(0);
    expect(aprAt(d, 3)).toBe(24.9);
  });
});

describe("compareDebtStrategies", () => {
  it("Priya: uses her monthly surplus and recommends avalanche", () => {
    const priya = PERSONAS.find((p) => p.id === "priya")!.profile;
    const c = compareDebtStrategies(priya);
    expect(c.minimumPayments).toBe(311);
    expect(c.extraPerMonth).toBe(839);
    expect(c.avalanche.feasible).toBe(true);
    expect(c.avalanche.totalInterest).toBeLessThanOrEqual(c.snowball.totalInterest);
    expect(c.promoWarnings[0]).toMatchObject({ monthsLeft: 5, monthlyToClear: 500 });
  });
});
