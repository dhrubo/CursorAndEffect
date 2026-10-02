import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/data/personas";
import { buildPlan } from "@/lib/finance/ladder";
import { ensureHistory, memoryStore, openingHistory, previousSnapshot, upsertSnapshot, snapshotFromPlan } from "./history";

const priya = PERSONAS.find((persona) => persona.id === "priya")!.profile;
const today = new Date(2026, 9, 2);

describe("history", () => {
  it("replaces the snapshot for the same month and keeps order", () => {
    const plan = buildPlan(priya);
    const first = snapshotFromPlan(priya, plan, today);
    const later = { ...first, cashSavings: first.cashSavings + 25 };
    const older = { ...first, month: "2026-08", recordedAt: "2026-08-15" };
    const stored = upsertSnapshot([older, first], later);
    expect(stored.map((row) => row.month)).toEqual(["2026-08", "2026-10"]);
    expect(stored[1].cashSavings).toBe(first.cashSavings + 25);
    expect(previousSnapshot(stored, "2026-10")?.month).toBe("2026-08");
  });

  it("seeds a prior month the first time, then updates in place", () => {
    const plan = buildPlan(priya);
    const store = memoryStore();
    const seeded = ensureHistory(priya, plan, store, today);
    expect(seeded.map((row) => row.month)).toEqual(["2026-09", "2026-10"]);
    expect(seeded[0].cashSavings).toBe(priya.cashSavings - 80);
    expect(openingHistory(priya, plan, today)[0].totalDebt).toBe(plan.metrics.totalDebt + 40);

    const again = ensureHistory({ ...priya, cashSavings: priya.cashSavings + 10 }, buildPlan({ ...priya, cashSavings: priya.cashSavings + 10 }), store, today);
    expect(again).toHaveLength(2);
    expect(again[1].cashSavings).toBe(priya.cashSavings + 10);
    expect(again[0].month).toBe("2026-09");
  });

  it("starts a fresh file when the profile name changes", () => {
    const store = memoryStore();
    ensureHistory(priya, buildPlan(priya), store, today);
    const mark = PERSONAS.find((persona) => persona.id === "mark")!.profile;
    const next = ensureHistory(mark, buildPlan(mark), store, today);
    expect(next[1].cashSavings).toBe(mark.cashSavings);
    expect(next[0].cashSavings).toBe(mark.cashSavings - 80);
  });
});
