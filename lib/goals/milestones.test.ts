import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/data/personas";
import { buildPlan } from "@/lib/finance/ladder";
import { deriveMilestones, nextMilestone } from "./milestones";
import type { Goal } from "./model";

const today = new Date(2026, 9, 2);

function profile(id: string) {
  return PERSONAS.find((persona) => persona.id === id)!.profile;
}

const goal: Goal = {
  id: "holiday",
  name: "Cornwall week",
  target: 800,
  targetDate: "2027-06-01",
  saved: 200,
  kind: "purchase",
};

describe("milestones", () => {
  it("derives ladder milestones for Sam without a form", () => {
    const sam = profile("sam");
    const milestones = deriveMilestones({ profile: sam, plan: buildPlan(sam), today });
    expect(milestones.map((milestone) => milestone.id)).toEqual([
      "starter-buffer",
      "emergency-fund",
      "lisa-allowance",
      "house-deposit",
    ]);
    const buffer = milestones[0];
    expect(buffer.pct).toBeLessThan(100);
    expect(buffer.projectedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(buffer.source).toBe("ladder");
  });

  it("includes a debt-free date for Priya and skips the Lifetime ISA", () => {
    const priya = profile("priya");
    const milestones = deriveMilestones({ profile: priya, plan: buildPlan(priya), today });
    expect(milestones.some((milestone) => milestone.id === "lisa-allowance")).toBe(false);
    const debt = milestones.find((milestone) => milestone.id === "debt-free");
    expect(debt?.projectedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(debt?.pct).toBeLessThan(100);
    expect(nextMilestone(milestones)?.id).toBe("starter-buffer");
  });

  it("marks Mark's cash milestones as already crossed", () => {
    const mark = profile("mark");
    const milestones = deriveMilestones({ profile: mark, plan: buildPlan(mark), today });
    expect(milestones.find((milestone) => milestone.id === "starter-buffer")?.pct).toBe(100);
    expect(milestones.find((milestone) => milestone.id === "emergency-fund")?.crossedAt).toBe("2026-10-02");
    expect(milestones.some((milestone) => milestone.id === "debt-free")).toBe(false);
  });

  it("appends a named goal", () => {
    const sam = profile("sam");
    const milestones = deriveMilestones({ profile: sam, plan: buildPlan(sam), goals: [goal], today });
    const appended = milestones.at(-1);
    expect(appended).toMatchObject({ id: "goal:holiday", label: "Cornwall week", source: "goal", current: 200, target: 800 });
    expect(appended?.projectedDate).toBeDefined();
  });

  it("brings a projected date forward when freed spending is included", () => {
    const sam = profile("sam");
    const plan = buildPlan(sam);
    const plain = deriveMilestones({ profile: sam, plan, today });
    const faster = deriveMilestones({ profile: sam, plan, freeableMonthly: 400, today });
    const plainDate = plain.find((milestone) => milestone.id === "emergency-fund")?.projectedDate;
    const fasterDate = faster.find((milestone) => milestone.id === "emergency-fund")?.projectedDate;
    expect(plainDate).toBeDefined();
    expect(fasterDate).toBeDefined();
    expect(fasterDate! < plainDate!).toBe(true);
  });
});
