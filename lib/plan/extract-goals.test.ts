import { describe, expect, it } from "vitest";
import { extractGoals } from "./extract-goals";

const TRANSCRIPT = [
  "I'm Alex.",
  "I want to buy a house, about £30k saved of £75k, by June 2029.",
  "We're getting married in August 2028 and the wedding is £20k, we've saved £8k.",
  "We also want to travel in September 2027, £3k saved of £6k.",
].join("\n");

describe("extractGoals", () => {
  it("reads goals, amounts, and dates from a conversation", () => {
    const extraction = extractGoals(TRANSCRIPT);
    expect(extraction.thin).toBe(false);
    expect(extraction.name).toBe("Alex");
    const house = extraction.goals.find((goal) => goal.id === "home");
    const wedding = extraction.goals.find((goal) => goal.id === "wedding");
    const travel = extraction.goals.find((goal) => goal.id === "travel");
    expect(house).toMatchObject({ targetAmount: 75000, savedSoFar: 30000, targetDate: "2029-06-01" });
    expect(wedding).toMatchObject({ targetAmount: 20000, savedSoFar: 8000, targetDate: "2028-08-01" });
    expect(travel).toMatchObject({ targetAmount: 6000, savedSoFar: 3000, targetDate: "2027-09-01" });
    expect(extraction.events.find((event) => event.goalId === "wedding")?.cost).toBe(5000);
  });

  it("falls back to the Jordyn household when the conversation is thin", () => {
    const extraction = extractGoals("I'm not sure yet. Maybe a holiday someday.");
    expect(extraction.thin).toBe(true);
    expect(extraction.goals.map((goal) => goal.name)).toContain("Bali with friends");
    expect(extraction.name).toBe("Jordyn");
  });
});
