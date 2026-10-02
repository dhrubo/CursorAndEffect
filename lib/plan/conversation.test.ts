import { describe, expect, it } from "vitest";
import { parseCoachReply, scriptedTurn } from "./conversation";

describe("conversation replies", () => {
  it("reads a Claude JSON reply and marks the conversation finished", () => {
    const turn = parseCoachReply('{"reply":"I have enough. Let me check I heard you right.","done":true}');
    expect(turn).toEqual({
      reply: "I have enough. Let me check I heard you right.",
      done: true,
    });
  });

  it("ignores a reply that is not JSON", () => {
    expect(parseCoachReply("just some words")).toBeNull();
  });

  it("keeps a scripted reply when Claude is not used", () => {
    const turn = scriptedTurn("I want a house and a wedding. That's everything.");
    expect(turn.done).toBe(true);
    expect(turn.reply).toMatch(/check I heard you right/i);
  });
});
