import { xai } from "@ai-sdk/xai";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
} from "ai";
import { buildCoachPrompt, buildSystemPrompt } from "@/lib/ai/systemPrompt";
import { createSaverTools, createTools, type AppUIMessage } from "@/lib/ai/tools";
import { ProfileSchema } from "@/lib/profile";
import { SaverStateSchema } from "@/lib/saver/schema";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!process.env.XAI_API_KEY) {
    return Response.json(
      { error: "The coach needs an xAI API key. Add XAI_API_KEY to .env.local and restart the dev server." },
      { status: 500 },
    );
  }

  const body = (await req.json()) as { messages?: AppUIMessage[]; profile?: unknown; state?: unknown };
  const state = SaverStateSchema.safeParse(body.state);
  const profile = ProfileSchema.safeParse(body.profile);
  if (!Array.isArray(body.messages) || (!state.success && !profile.success)) {
    return Response.json({ error: "Invalid request: messages and a saver state or profile are required." }, { status: 400 });
  }

  const modelId = process.env.XAI_MODEL || "grok-4.7";
  const tools = state.success ? createSaverTools(state.data) : createTools(profile.data!);
  const instructions = state.success ? buildCoachPrompt(state.data) : buildSystemPrompt(profile.data!);
  const result = streamText({
    model: xai(modelId),
    instructions,
    messages: await convertToModelMessages(body.messages, { tools, ignoreIncompleteToolCalls: true }),
    tools,
    stopWhen: isStepCount(5),
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
