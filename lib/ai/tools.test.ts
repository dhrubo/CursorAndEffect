import { describe, expect, it } from "vitest";
import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { isStepCount, simulateReadableStream, streamText, toUIMessageStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { PERSONAS } from "@/data/personas";
import { createTools } from "./tools";

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 5, text: 5, reasoning: 0 },
};

function scriptedModel(toolName: string, input: object) {
  let call = 0;
  return new MockLanguageModelV4({
    doStream: async () => {
      call += 1;
      const chunks: LanguageModelV4StreamPart[] =
        call === 1
          ? [
              { type: "stream-start", warnings: [] },
              { type: "tool-call", toolCallId: "call-1", toolName, input: JSON.stringify(input) },
              { type: "finish", usage, finishReason: { unified: "tool-calls", raw: "tool_calls" } },
            ]
          : [
              { type: "stream-start", warnings: [] },
              { type: "text-start", id: "t1" },
              { type: "text-delta", id: "t1", delta: "Here's the takeaway." },
              { type: "text-end", id: "t1" },
              { type: "finish", usage, finishReason: { unified: "stop", raw: "stop" } },
            ];
      return { stream: simulateReadableStream({ chunks }) };
    },
  });
}

async function runChat(personaId: string, toolName: string, input: object) {
  const profile = PERSONAS.find((p) => p.id === personaId)!.profile;
  const tools = createTools(profile);
  const result = streamText({
    model: scriptedModel(toolName, input),
    tools,
    prompt: "test",
    stopWhen: isStepCount(5),
  });
  const reader = toUIMessageStream({ stream: result.stream, tools }).getReader();
  const chunks: { type: string; [key: string]: unknown }[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value as (typeof chunks)[number]);
  }
  return chunks;
}

describe("chat tools through the AI SDK stream", () => {
  it("returns the calculated plan for allocate_next_amount, then the model's text", async () => {
    const chunks = await runChat("sam", "allocate_next_amount", { amount: 5000 });
    const output = chunks.find((c) => c.type === "tool-output-available")?.output as {
      amount: number;
      allocations: { ruleId: string; amount: number }[];
    };
    expect(output.amount).toBe(5000);
    expect(output.allocations.map((a) => a.ruleId)).toEqual(["starter_buffer", "emergency_fund", "lisa"]);
    expect(chunks.some((c) => c.type === "text-delta")).toBe(true);
  });

  it("drops the chart timelines from compare_debt_strategies output", async () => {
    const chunks = await runChat("priya", "compare_debt_strategies", {});
    const output = chunks.find((c) => c.type === "tool-output-available")?.output as Record<string, unknown>;
    expect(output.recommended).toBe("avalanche");
    expect(output.timelines).toBeUndefined();
  });

  it("explains when a mortgage tool is used without a mortgage", async () => {
    const chunks = await runChat("sam", "compare_remortgage_options", {});
    const output = chunks.find((c) => c.type === "tool-output-available")?.output as { error?: string };
    expect(output.error).toMatch(/mortgage/);
  });

  it("runs the overpay-vs-save what-if for Mark", async () => {
    const chunks = await runChat("mark", "compare_overpay_vs_save", { lumpSum: 10000 });
    const output = chunks.find((c) => c.type === "tool-output-available")?.output as {
      current: { verdict: string };
      afterDealEnds?: { verdict: string };
    };
    expect(output.current.verdict).toBe("save");
    expect(output.afterDealEnds).toBeDefined();
  });
});
