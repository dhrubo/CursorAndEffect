import { xai } from "@ai-sdk/xai";
import { z } from "zod";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
} from "ai";
import { mockChatResponse } from "@/lib/ai/mock";
import { buildSystemPrompt } from "@/lib/ai/systemPrompt";
import { createTools, type AppUIMessage } from "@/lib/ai/tools";
import { GoalSchema } from "@/lib/goals/model";
import { HistorySnapshotSchema } from "@/lib/history";
import { ProfileSchema } from "@/lib/profile";

export const maxDuration = 60;

export async function GET() {
  return Response.json({ scripted: !process.env.XAI_API_KEY });
}

export async function POST(req: Request) {
  let body: { messages?: AppUIMessage[]; profile?: unknown; goals?: unknown; history?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid request: a valid profile and messages are required." }, { status: 400 });
  }

  const profile = ProfileSchema.safeParse(body.profile);
  const goals = z.array(GoalSchema).safeParse(body.goals ?? []);
  const history = z.array(HistorySnapshotSchema).safeParse(body.history ?? []);
  if (!profile.success || !Array.isArray(body.messages) || !goals.success || !history.success) {
    return Response.json({ error: "Invalid request: a valid profile and messages are required." }, { status: 400 });
  }

  if (!process.env.XAI_API_KEY) {
    return mockChatResponse({
      profile: profile.data,
      messages: body.messages,
      goals: goals.data,
      history: history.data,
    });
  }

  const modelId = process.env.XAI_MODEL || "grok-4.7";
  const tools = createTools(profile.data, { goals: goals.data, history: history.data });
  const result = streamText({
    model: xai(modelId),
    instructions: buildSystemPrompt(profile.data),
    messages: await convertToModelMessages(body.messages, { tools, ignoreIncompleteToolCalls: true }),
    tools,
    stopWhen: isStepCount(5),
    // Low effort keeps chat replies snappy; non-reasoning models reject the option.
    providerOptions: modelId.includes("non-reasoning") ? undefined : { xai: { reasoningEffort: "low" } },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      tools,
      onError: (error) => {
        console.error("[chat]", error);
        return error instanceof Error ? error.message : "Something went wrong talking to Grok.";
      },
    }),
  });
}
