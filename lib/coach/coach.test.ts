import { describe, expect, it } from "vitest";
import { SAVER_PERSONAS } from "@/data/saver-personas";
import { applyDemoAction } from "@/lib/saver/actions";
import { parseSaverState } from "@/lib/saver/schema";
import { BANNED_PHRASES, REMINDER_COPY, allSampleCopy, reminderAt } from "./copy";
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
    const samples = allSampleCopy();
    expect(samples).toContain("Before that coffee");
    expect(samples).toContain("Remember, you can have your coffee at the office, skip that Nero stop");
    expect(samples).toContain("Before that night out");
    expect(samples).toContain("That £46 puts Bali on 12 Sep instead of 4 Sep. Keep the plan, or put £20 toward Bali.");
    expect(samples).toContain("Spotify is coming up");
    expect(samples).toContain("Spotify, £12.99, usually leaves around the 4th. On Bali, that is about 1 day later.");
    expect(samples).toContain("£28 is still yours");
    expect(samples).toContain("£28 left this week. Move it to Bali and arrive 2 days earlier.");
    const blob = samples.join(" ").toLowerCase();
    for (const phrase of BANNED_PHRASES) {
      const pattern = new RegExp(`\\b${phrase.replace(" ", "\\s+")}\\b`, "i");
      expect(blob).not.toMatch(pattern);
    }
  });

  it("wraps the reminder rotation back to the Nero line", () => {
    expect(reminderAt(4)).toBe(REMINDER_COPY[0]);
  });
});

describe("saver fixtures", () => {
  it("parses both demo households", () => {
    for (const persona of SAVER_PERSONAS) {
      expect(parseSaverState(persona.state)?.goals.length).toBeGreaterThan(0);
    }
  });
});
