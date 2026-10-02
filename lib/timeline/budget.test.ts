import { describe, expect, it } from "vitest";
import { SAVER_PERSONAS } from "@/data/saver-personas";
import { payCycleStack } from "./budget";

describe("payCycleStack", () => {
  it("returns income, committed, spent and what is left", () => {
    const cycle = payCycleStack(SAVER_PERSONAS[0].state);
    expect(cycle.income).toBeGreaterThan(0);
    expect(cycle.spent).toBeGreaterThan(0);
    expect(cycle.leftForGoals).toBe(cycle.income - cycle.committed - cycle.spent);
  });
});
