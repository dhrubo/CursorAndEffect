import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/data/personas";
import { EMPTY_PROFILE, type Profile } from "@/lib/profile";
import { buildPlan } from "./ladder";

const persona = (id: string): Profile => {
  const p = PERSONAS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown persona ${id}`);
  return structuredClone(p.profile);
};

const byRule = (plan: ReturnType<typeof buildPlan>) =>
  plan.allocations.reduce<Record<string, number>>((acc, a) => {
    acc[a.ruleId] = (acc[a.ruleId] ?? 0) + a.amount;
    return acc;
  }, {});

describe("buildPlan", () => {
  it("always allocates exactly the amount given when not in crisis", () => {
    for (const p of PERSONAS) {
      const plan = buildPlan(p.profile, 7777);
      expect(plan.allocated).toBe(7777);
      expect(plan.allocations.reduce((s, a) => s + a.amount, 0)).toBe(7777);
    }
  });

  it("Sam: tops up the buffer, then the emergency fund, then the Lifetime ISA", () => {
    const plan = buildPlan(persona("sam"), 5000);
    expect(byRule(plan)).toEqual({ starter_buffer: 350, emergency_fund: 3100, lisa: 1550 });
    expect(plan.steps.find((s) => s.ruleId === "lisa")?.status).toBe("todo");
  });

  it("Sam: never prioritises the student loan", () => {
    const plan = buildPlan(persona("sam"), 50000);
    expect(plan.allocations.some((a) => a.destination.includes("Student loan"))).toBe(false);
  });

  it("Priya: buffer first, then the overdraft before the credit card (highest APR first)", () => {
    const plan = buildPlan(persona("priya"), 1500);
    expect(plan.allocations.map((a) => [a.ruleId, a.amount])).toEqual([
      ["starter_buffer", 611],
      ["high_interest_debt", 650],
      ["high_interest_debt", 239],
    ]);
    expect(plan.allocations[1].destination).toContain("overdraft");
    expect(plan.steps.find((s) => s.ruleId === "employer_match")?.status).toBe("action");
    expect(plan.warnings.some((w) => w.title.includes("0% deal"))).toBe(true);
  });

  it("Priya: skips the 0% card while its promo is active", () => {
    const plan = buildPlan(persona("priya"), 20000);
    expect(plan.allocations.some((a) => a.destination.includes("Balance transfer"))).toBe(false);
  });

  it("Mark: saving beats overpaying a 2.09% mortgage, using a tax-free ISA", () => {
    const plan = buildPlan(persona("mark"), 10000);
    expect(byRule(plan)).toEqual({ long_term: 10000 });
    expect(plan.allocations[0].destination).toContain("Cash ISA");
    expect(plan.steps.find((s) => s.ruleId === "mortgage_vs_save")?.status).toBe("skipped");
    expect(plan.warnings.some((w) => w.title.includes("deal ends in 4 months"))).toBe(true);
    expect(plan.quickWins.some((q) => q.title.includes("tax"))).toBe(true);
  });

  it("recommends overpaying when the mortgage rate beats savings", () => {
    const p = persona("mark");
    p.mortgage!.ratePct = 6.5;
    const plan = buildPlan(p, 10000);
    expect(byRule(plan).mortgage_vs_save).toBe(10000);
  });

  it("caps mortgage overpayments at the yearly allowance", () => {
    const p = persona("mark");
    p.mortgage!.ratePct = 6.5;
    p.mortgage!.overpaidThisYear = 15000;
    const plan = buildPlan(p, 10000);
    expect(byRule(plan).mortgage_vs_save).toBe(3500);
    expect(byRule(plan).long_term).toBe(6500);
  });

  it("stops and signposts free debt advice when outgoings exceed income", () => {
    const plan = buildPlan({ ...EMPTY_PROFILE, netMonthlyIncome: 1000, essentialMonthlySpend: 1400 }, 500);
    expect(plan.stopped).toBe(true);
    expect(plan.allocations).toHaveLength(0);
    expect(plan.signposts.map((s) => s.name)).toContain("StepChange");
  });

  it("stops when payments have been missed", () => {
    const plan = buildPlan({ ...EMPTY_PROFILE, missedPayments: true }, 500);
    expect(plan.stopped).toBe(true);
  });
});
