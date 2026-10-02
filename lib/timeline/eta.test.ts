import { describe, expect, it } from "vitest";
import { SAVER_PERSONAS } from "@/data/saver-personas";
import { divertImpact, projectGoal, replan } from "./eta";

const bali = SAVER_PERSONAS[0].state.goals[0];
const today = SAVER_PERSONAS[0].state.today;

describe("projectGoal", () => {
  it("counts days from the weekly save, and names the arrival", () => {
    const projection = projectGoal(bali, { today });
    expect(projection.amountLeft).toBe(640);
    expect(projection.daysLeft).toBeGreaterThan(40);
    expect(projection.etaDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(projection.series.at(-1)?.saved).toBe(bali.targetAmount);
  });

  it("shows a later arrival when money is diverted", () => {
    const impact = divertImpact(bali, 46, { today });
    expect(impact.deltaDays).toBeGreaterThan(0);
    expect(impact.onTrackEta).toBeTruthy();
    expect(impact.divertedEta! > impact.onTrackEta!).toBe(true);
  });

  it("raises the weekly amount when the date stays put", () => {
    const behind = { ...bali, savedSoFar: 200, targetDate: "2026-11-01" };
    const plan = replan(behind, today, "date");
    expect(plan.targetDate).toBe("2026-11-01");
    expect(plan.weeklyAmount).toBeGreaterThan(bali.autoSave.amount);
  });
});
