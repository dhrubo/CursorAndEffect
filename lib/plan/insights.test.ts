import { describe, expect, it } from "vitest";
import { SAVER_PERSONAS } from "@/data/saver-personas";
import { parseSaverState } from "@/lib/saver/schema";
import { buildPlanState } from "./build-state";
import { goalStatus, planInsights } from "./insights";

const TRANSCRIPT = [
  "I'm Alex.",
  "I want to buy a house, about £30k saved of £75k, by June 2029.",
  "We're getting married in August 2028 and the wedding is £20k, we've saved £8k.",
  "We also want to travel in September 2027, £3k saved of £6k.",
].join("\n");

describe("plan insights", () => {
  it("marks the house behind, and the wedding and trip on track", () => {
    const state = buildPlanState({
      transcript: TRANSCRIPT,
      connections: { banking: true, investments: true, other: true },
    });
    const byId = Object.fromEntries(state.goals.map((goal) => [goal.id, goal]));
    expect(goalStatus(byId.home, state.today)).toBe("Needs attention");
    expect(goalStatus(byId.wedding, state.today)).toBe("On track");
    expect(goalStatus(byId.travel, state.today)).toBe("On track");
    const notes = planInsights(state);
    expect(notes.some((note) => note.includes("House deposit") && note.includes("behind"))).toBe(true);
    expect(notes.some((note) => note.includes("large expenses"))).toBe(true);
    expect(notes.some((note) => note.includes("£200"))).toBe(true);
    expect(notes.some((note) => note.includes("on track"))).toBe(true);
    expect(state.profile.debts[0]?.name).toBe("Credit card");
    expect(state.planEvents?.length).toBeGreaterThanOrEqual(3);
    expect(parseSaverState(state)?.profile.name).toBe("Alex");
  });

  it("keeps Jordyn's goals when the transcript does not name two plans", () => {
    const state = buildPlanState({
      transcript: "hello",
      connections: { banking: true, investments: true, other: true },
    });
    expect(state.goals[0]?.name).toBe(SAVER_PERSONAS[0].state.goals[0]?.name);
    expect(state.profile.debts).toHaveLength(1);
    expect(planInsights(state).length).toBeGreaterThan(0);
  });
});