import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/data/personas";
import { transactionsForPersona } from "@/data/transactions";
import { buildPlan } from "@/lib/finance/ladder";
import { openingHistory } from "@/lib/history";
import { buildCheckIn } from "./build";

const today = new Date(2026, 9, 2);
const priya = PERSONAS.find((persona) => persona.id === "priya")!.profile;

describe("check-in", () => {
  it("leads with a steady standing, a win, and a concrete next step for Priya", () => {
    const history = openingHistory(priya, buildPlan(priya), today);
    const checkin = buildCheckIn({
      profile: priya,
      history,
      transactions: transactionsForPersona("priya"),
      today,
    });
    expect(checkin.standing).toBe("steady");
    expect(checkin.headline).toBe("Priya, you're steady.");
    expect(checkin.wins[0].title).toMatch(/saved more/i);
    expect(checkin.changes.some((change) => change.direction === "better")).toBe(true);
    expect(checkin.risks.some((risk) => /0%/.test(risk.title))).toBe(true);
    expect(checkin.nextAction.prompt).toBe("What spending could I cut?");
    expect(checkin.figures.monthlySurplus).toBeGreaterThan(0);
    expect(checkin.figures.freeableMonthly).toBeGreaterThan(0);
    expect(checkin.milestones.some((milestone) => milestone.id === "debt-free")).toBe(true);
  });

  it("has no month-on-month changes without a previous snapshot", () => {
    const checkin = buildCheckIn({
      profile: priya,
      history: [],
      transactions: transactionsForPersona("priya"),
      today,
    });
    expect(checkin.changes).toEqual([]);
    expect(checkin.wins[0].title).toMatch(/covered/i);
  });

  it("calls a missed-payment budget stretched", () => {
    const stretched = buildCheckIn({
      profile: { ...priya, missedPayments: true, netMonthlyIncome: 500 },
      history: [],
      transactions: transactionsForPersona("priya"),
      today,
    });
    expect(stretched.standing).toBe("stretched");
    expect(stretched.nextAction.title).toMatch(/debt advice/i);
  });
});
