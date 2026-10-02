import { describe, expect, it } from "vitest";
import { SAVER_PERSONAS } from "@/data/saver-personas";
import { applyDemoAction } from "@/lib/saver/actions";
import { parseSaverState } from "@/lib/saver/schema";
import { BANNED_PHRASES, allSampleCopy } from "./copy";
import { evaluateCoach } from "./rules";
import { classifyTypology } from "./typology";

describe("coach", () => {
  it("reads Jordyn as a Social Connector and Jordan as a Steady Builder", () => {
    expect(classifyTypology(SAVER_PERSONAS[0].state.transactions).name).toBe("Social Connector");
    expect(classifyTypology(SAVER_PERSONAS[1].state.transactions).name).toBe("Steady Builder");
  });

  it("raises one slip for a night out and ignores a coffee", () => {
    const night = applyDemoAction(SAVER_PERSONAS[0].state, "night-out");
    const slips = night.coachEvents.filter((event) => event.kind === "spend");
    expect(slips).toHaveLength(1);
    expect(slips[0].severity === "big" || slips[0].severity === "small").toBe(true);

    const again = applyDemoAction(night, "coffee");
    expect(again.coachEvents.filter((event) => event.kind === "spend")).toHaveLength(1);
  });

  it("offers a replan after a missed save and an idle note when cash lands", () => {
    const missed = applyDemoAction(SAVER_PERSONAS[0].state, "skip-save");
    expect(missed.coachEvents.some((event) => event.kind === "replan")).toBe(true);
    const idle = applyDemoAction(SAVER_PERSONAS[0].state, "idle-cash");
    expect(idle.coachEvents.some((event) => event.kind === "idle")).toBe(true);
  });

  it("caps a second slip on the same day", () => {
    const once = applyDemoAction(SAVER_PERSONAS[0].state, "night-out");
    expect(evaluateCoach(once).filter((event) => event.kind === "spend")).toHaveLength(0);
  });

  it("keeps coach copy free of shame, streaks and points", () => {
    const blob = allSampleCopy().join(" ").toLowerCase();
    for (const phrase of BANNED_PHRASES) {
      const pattern = new RegExp(`\\b${phrase.replace(" ", "\\s+")}\\b`, "i");
      expect(blob).not.toMatch(pattern);
    }
  });
});

describe("saver fixtures", () => {
  it("parses both demo households", () => {
    for (const persona of SAVER_PERSONAS) {
      expect(parseSaverState(persona.state)?.goals.length).toBeGreaterThan(0);
    }
  });
});
