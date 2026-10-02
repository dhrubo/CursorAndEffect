import { describe, expect, it } from "vitest";
import { SAVER_PERSONAS } from "@/data/saver-personas";
import { buildCheckpoints, depositSize, firstStepWithinAWeek } from "./checkpoints";

describe("checkpoints", () => {
  it("puts the first step within 7 days and on an exact deposit", () => {
    const state = SAVER_PERSONAS[0].state;
    const goal = state.goals[0];
    const items = buildCheckpoints(goal, state.today);
    const first = items.find((item) => item.kind === "step");
    expect(first).toBeTruthy();
    expect(firstStepWithinAWeek(goal, state.today)).toBe(true);
    expect(first!.amount - goal.savedSoFar).toBe(depositSize(goal));
    expect(items.at(-1)?.kind).toBe("finish");
  });

  it("still lands a step within a week when the save is monthly", () => {
    const goal = {
      ...SAVER_PERSONAS[0].state.goals[2],
      savedSoFar: 400,
      autoSave: { amount: 80, cadence: "payday" as const, enabled: true },
    };
    expect(firstStepWithinAWeek(goal, SAVER_PERSONAS[0].state.today)).toBe(true);
    expect(depositSize(goal)).toBe(20);
  });
});
