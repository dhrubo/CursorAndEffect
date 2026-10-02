import { describe, expect, it } from "vitest";
import { SAVER_PERSONAS } from "@/data/saver-personas";
import { detectWeekendOverspend, lastWeekend, planWeekendRecovery, weekendNudge } from "./weekend";

const jordyn = SAVER_PERSONAS.find((persona) => persona.id === "jordyn")!.state;
const jordan = SAVER_PERSONAS.find((persona) => persona.id === "jordan")!.state;

describe("weekend overspend", () => {
  it("looks at the last full Friday to Sunday", () => {
    expect(lastWeekend("2026-10-02")).toEqual({ start: "2026-09-25", end: "2026-09-27" });
    expect(lastWeekend("2026-09-27")).toEqual({ start: "2026-09-18", end: "2026-09-20" });
  });

  it("spots Jordyn's payday weekend of eating out", () => {
    const overspend = detectWeekendOverspend(jordyn)!;
    expect(overspend.spent).toBeGreaterThan(overspend.typical);
    expect(overspend.over).toBeGreaterThanOrEqual(20);
    expect(overspend.goalName).toBe("Bali with friends");
    expect(weekendNudge(jordyn, overspend)).toContain("Want to find a plan");
  });

  it("stays quiet for a usual weekend", () => {
    expect(detectWeekendOverspend({ ...jordyn, transactions: jordyn.transactions.filter((tx) => !tx.id.startsWith("weekend-")) })).toBeNull();
    expect(detectWeekendOverspend(jordan)).toBeNull();
  });

  it("offers two or three ways to win it back", () => {
    const plan = planWeekendRecovery(jordyn)!;
    expect(plan.options.length).toBeGreaterThanOrEqual(2);
    expect(plan.options.length).toBeLessThanOrEqual(3);
    for (const option of plan.options) {
      expect(option.total).toBe(option.perWeek * option.weeks);
      expect(option.daysWonBack).toBeGreaterThan(0);
    }
  });
});

describe("scripted weekend replies", () => {
  it("offers the options, then confirms a pick", async () => {
    const { buildMockReply } = await import("@/lib/ai/mock");
    const { deriveProfile } = await import("@/lib/saver/derive-profile");
    const { WEEKEND_ACCEPT } = await import("./weekend");
    const profile = deriveProfile(jordyn);
    const offer = buildMockReply({ profile, state: jordyn, text: WEEKEND_ACCEPT });
    expect(offer.calls[0]?.name).toBe("plan_weekend_recovery");
    const title = planWeekendRecovery(jordyn)!.options[1].title;
    const pick = buildMockReply({ profile, state: jordyn, text: `Let's try this one: ${title.toLowerCase()}` });
    expect(pick.intent).toBe("weekend");
    expect(pick.text).toContain("days closer");
  });
});
