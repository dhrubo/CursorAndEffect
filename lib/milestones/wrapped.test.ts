import { describe, expect, it } from "vitest";
import { SAVER_PERSONAS } from "@/data/saver-personas";
import { buildWrapped } from "./wrapped";

describe("buildWrapped", () => {
  it("ends on what's next and keeps the plan name in view", () => {
    const state = SAVER_PERSONAS[0].state;
    const slides = buildWrapped(state, "bali", 75);
    expect(slides.at(-1)?.kicker).toBe("What's next");
    expect(slides[0]?.kicker).toBe("Bali with friends");
    expect(slides.some((slide) => /streak|points/i.test(slide.headline + slide.detail))).toBe(false);
  });
});
