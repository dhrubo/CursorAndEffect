import { describe, expect, it } from "vitest";
import {
  applySuggestion,
  bannedWord,
  buildCoach,
  coachCopy,
  coffeeWeek,
  daysFor,
  idleCashWeek,
  nightOutWeek,
  quietWeek,
} from "./model";

describe("spending coach", () => {
  it("turns a £46 night out into 8 days on the Bali timeline", () => {
    expect(daysFor(45, 46)).toBe(8);
    const view = buildCoach(nightOutWeek());
    expect(view.monitor.active).toBe(true);
    expect(view.monitor.body).toContain("Coach sees you have spent an extra bit of money");
    expect(view.extraAmount).toBe(46);
    expect(view.delayDays).toBe(8);
    expect(view.leftoverAmount).toBe(34);
    expect(view.save.active).toBe(true);
    expect(view.save.title).toBe("If you have spent more money I suggest ways to save it");
    expect(view.utilise.active).toBe(true);
    expect(view.utilise.title).toBe("If you have any left I show ways we can utilise it");
    expect(view.save.suggestions.map((item) => item.id)).toEqual(["put-toward", "cook-in", "skip-ride"]);
  });

  it("keeps a quiet week on the utilise path only", () => {
    const view = buildCoach(quietWeek());
    expect(view.monitor.active).toBe(false);
    expect(view.save.active).toBe(false);
    expect(view.save.suggestions).toHaveLength(0);
    expect(view.utilise.active).toBe(true);
    expect(view.leftoverAmount).toBe(80);
    expect(view.utilise.suggestions[0]?.id).toBe("move-leftover");
  });

  it("offers the idle current-account cash when money is left over", () => {
    const view = buildCoach(idleCashWeek());
    const idle = view.utilise.suggestions.find((item) => item.id === "move-idle");
    expect(idle?.amount).toBe(600);
    expect(idle?.detail).toContain("4.35%");
  });

  it("pulls the date back when a save suggestion is applied", () => {
    const before = buildCoach(nightOutWeek());
    const after = buildCoach(applySuggestion(nightOutWeek(), "put-toward"));
    expect(after.extraAmount).toBe(26);
    expect(after.delayDays).toBeLessThan(before.delayDays);
    expect(after.amountLeft).toBe(before.amountLeft - 20);
  });

  it("moves leftover cash onto the goal", () => {
    const after = buildCoach(applySuggestion(quietWeek(), "move-leftover"));
    expect(after.leftoverAmount).toBe(0);
    expect(after.utilise.active).toBe(false);
    expect(after.amountLeft).toBe(1800 - 1450 - 80);
  });

  it("keeps a small coffee inside the save path", () => {
    const view = buildCoach(coffeeWeek());
    expect(view.delayDays).toBe(1);
    expect(view.save.suggestions.map((item) => item.id)).toEqual(["put-toward"]);
    expect(view.save.suggestions[0]?.amount).toBe(3.4);
  });

  it("uses the Nuture voice in every line", () => {
    const weeks = [nightOutWeek(), quietWeek(), coffeeWeek(), idleCashWeek()];
    for (const week of weeks) {
      for (const line of coachCopy(buildCoach(week))) {
        expect(bannedWord(line)).toBeNull();
      }
    }
  });
});
