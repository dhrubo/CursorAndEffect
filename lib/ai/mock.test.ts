import { readUIMessageStream } from "ai";
import { describe, expect, it } from "vitest";
import { PERSONAS } from "@/data/personas";
import { buildPlan } from "@/lib/finance/ladder";
import { openingHistory } from "@/lib/history";
import { buildMockReply, createMockUIMessageStream, detectIntent, mockChatResponse } from "./mock";

const today = new Date(2026, 9, 2);
const priya = PERSONAS.find((persona) => persona.id === "priya")!.profile;

function numbersIn(text: string): string[] {
  return text.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
}

describe("scripted chat", () => {
  it("routes the demo questions", () => {
    expect(detectIntent("How am I doing?")).toBe("checkin");
    expect(detectIntent("What spending could I cut?")).toBe("suggest");
    expect(detectIntent("Avalanche or snowball for my debts?")).toBe("debt");
    expect(detectIntent("What should I do with my next £1,500?")).toBe("allocate");
  });

  it("streams a check-in with a tool part, and a win before the risk", async () => {
    const history = openingHistory(priya, buildPlan(priya), today);
    const reply = buildMockReply({
      profile: priya,
      text: "How am I doing?",
      history,
      today,
    });
    expect(reply.calls.map((call) => call.name)).toEqual(["get_checkin"]);
    const message = await readUIMessageStreamMessage(reply);
    const tool = message.parts.find((part) => part.type === "tool-get_checkin");
    expect(tool && "state" in tool && tool.state).toBe("output-available");
    const text = message.parts.filter((part) => part.type === "text").map((part) => ("text" in part ? part.text : "")).join(" ");
    const winAt = text.indexOf("One thing going well");
    const riskAt = text.indexOf("The thing to watch");
    expect(winAt).toBeGreaterThan(-1);
    expect(riskAt).toBeGreaterThan(winAt);
    expect(text.trim().endsWith("?")).toBe(true);
    const haystack = JSON.stringify(reply.calls) + JSON.stringify(priya);
    for (const figure of numbersIn(text)) {
      const raw = figure.replace(/,/g, "");
      expect(haystack.includes(figure) || haystack.includes(raw), figure).toBe(true);
    }
  });

  it("answers a spending question with review and suggestion cards", async () => {
    const reply = buildMockReply({ profile: priya, text: "What spending could I cut?", today });
    expect(reply.calls.map((call) => call.name)).toEqual(["review_spending", "suggest_spending_changes"]);
    expect(reply.text).toMatch(/Does that match what you meant to keep\?/);
    const message = await readUIMessageStreamMessage(reply);
    expect(message.parts.some((part) => part.type === "tool-suggest_spending_changes")).toBe(true);
    const haystack = JSON.stringify(reply.calls);
    for (const figure of numbersIn(reply.text)) {
      const raw = figure.replace(/,/g, "");
      expect(haystack.includes(figure) || haystack.includes(raw), figure).toBe(true);
    }
  });

  it("returns the UI message stream response when no model key is used", async () => {
    const response = mockChatResponse({
      profile: priya,
      messages: [{ role: "user", parts: [{ type: "text", text: "How am I doing?" }] }],
      today,
    });
    expect(response.headers.get("x-nextpound-scripted")).toBe("1");
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const body = await response.text();
    expect(body).toContain("get_checkin");
    expect(body).toContain("[DONE]");
  });
});

async function readUIMessageStreamMessage(reply: ReturnType<typeof buildMockReply>) {
  let message;
  for await (const next of readUIMessageStream({ stream: createMockUIMessageStream(reply) })) {
    message = next;
  }
  if (!message) throw new Error("empty mock stream");
  return message;
}
