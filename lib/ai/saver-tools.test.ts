import { describe, expect, it } from "vitest";
import { SAVER_PERSONAS } from "@/data/saver-personas";
import { createSaverTools } from "./tools";

describe("saver coach tools", () => {
  it("names the plan and the days a £46 spend adds", async () => {
    const tools = createSaverTools(SAVER_PERSONAS[0].state);
    const result = await tools.simulate_spend.execute!({ amount: 46 }, {
      toolCallId: "call-1",
      messages: [],
      context: {},
    });
    expect(result).toMatchObject({ goalName: "Bali with friends", amount: 46 });
    if ("deltaDays" in result) expect(result.deltaDays).toBeGreaterThan(0);
  });

  it("checks in without inventing a second plan", async () => {
    const tools = createSaverTools(SAVER_PERSONAS[0].state);
    const result = await tools.milestone_check.execute!({}, { toolCallId: "call-2", messages: [], context: {} });
    expect(result).toMatchObject({ name: "Jordyn" });
    if ("goingWell" in result) expect(result.goingWell).toMatch(/Bali/);
  });
});
