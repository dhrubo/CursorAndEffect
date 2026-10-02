import { describe, expect, it } from "vitest";
import { coachFollowUp } from "./extract-goals";
import { accentFor, estimatedWordDelays, preferredBritishVoice, replyEndsConversation, voiceStatus, wordAt } from "./voice";

describe("spoken highlighting", () => {
  it("maps a character position to the word being spoken", () => {
    const text = "Tell me another plan.";
    expect(wordAt(text, 0)).toBe(0);
    expect(wordAt(text, 5)).toBe(1);
    expect(wordAt(text, 16)).toBe(3);
  });

  it("spaces estimated words further apart at a slower rate", () => {
    const slow = estimatedWordDelays("A home, a wedding, time away.", 0.7);
    const normal = estimatedWordDelays("A home, a wedding, time away.", 1);
    expect(slow).toHaveLength(6);
    expect(slow[0]).toBe(0);
    expect(slow.at(-1)!).toBeGreaterThan(normal.at(-1)!);
  });

  it("names accents from a voice language", () => {
    expect(accentFor("en-GB")).toBe("British");
    expect(accentFor("en_US")).toBe("American");
    expect(accentFor("en-IE")).toBe("Irish");
  });
});

describe("voice conversation", () => {
  it("keeps the loop open until the coach is ready to confirm", () => {
    expect(replyEndsConversation("Tell me another plan that sits beside that one. A date or a rough cost helps, but a name for it is enough.")).toBe(false);
    const closing = coachFollowUp("I want a house and a wedding. That's everything.");
    expect(replyEndsConversation(closing)).toBe(true);
  });

  it("describes each phase without mentioning the browser when voice works", () => {
    expect(voiceStatus("idle", true)).toMatch(/microphone/i);
    expect(voiceStatus("listening", true)).toMatch(/Listening/);
    expect(voiceStatus("speaking", true)).toMatch(/Speaking/);
    expect(voiceStatus("idle", false)).toMatch(/type your answer/i);
  });
});
describe("coach voice", () => {
  const voice = (name: string, lang: string) => ({ name, lang, voiceURI: name }) as SpeechSynthesisVoice;

  it("always picks a British female voice over British male or other accents", () => {
    const voices = [
      voice("Daniel (Enhanced)", "en-GB"),
      voice("Samantha", "en-US"),
      voice("Google UK English Male", "en-GB"),
      voice("Google UK English Female", "en-GB"),
    ];
    expect(preferredBritishVoice(voices)?.name).toBe("Google UK English Female");
  });

  it("prefers a higher quality British female voice", () => {
    const voices = [voice("Kate", "en-GB"), voice("Serena (Premium)", "en-GB")];
    expect(preferredBritishVoice(voices)?.name).toBe("Serena (Premium)");
  });

  it("never falls back to a male or non-British voice", () => {
    expect(preferredBritishVoice([voice("Daniel", "en-GB"), voice("Samantha", "en-US")])).toBeUndefined();
  });
});
