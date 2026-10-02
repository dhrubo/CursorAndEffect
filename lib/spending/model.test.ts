import { describe, expect, it } from "vitest";
import { SPENDING_CATEGORIES, groupMonths, isEssentialCategory, summariseMonth, type Transaction } from "./model";

const sample: Transaction[] = [
  {
    id: "1",
    personaId: "sam",
    date: "2026-04-02",
    merchant: "Tesco",
    category: "groceries",
    amount: 40,
  },
  {
    id: "2",
    personaId: "sam",
    date: "2026-04-03",
    merchant: "Pret",
    category: "eating_out",
    amount: 10,
  },
  {
    id: "3",
    personaId: "sam",
    date: "2026-05-01",
    merchant: "Landlord",
    category: "bills",
    amount: 900,
  },
];

describe("spending model", () => {
  it("splits essentials from discretionary spend", () => {
    expect(isEssentialCategory("bills")).toBe(true);
    expect(isEssentialCategory("eating_out")).toBe(false);
    const april = summariseMonth("2026-04", sample);
    expect(april.essential).toBe(40);
    expect(april.discretionary).toBe(10);
    expect(april.total).toBe(50);
  });

  it("groups transactions into calendar months", () => {
    const months = groupMonths(sample);
    expect(months.map((month) => month.month)).toEqual(["2026-04", "2026-05"]);
    expect(months[1].essential).toBe(900);
  });

  it("covers the category taxonomy", () => {
    expect(SPENDING_CATEGORIES).toHaveLength(7);
    expect(summariseMonth("2026-04", []).total).toBe(0);
  });
});
