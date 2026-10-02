import { xai } from "@ai-sdk/xai";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
} from "ai";
import { buildSystemPrompt } from "@/lib/ai/systemPrompt";
import { createTools, type AppUIMessage } from "@/lib/ai/tools";
import { ProfileSchema } from "@/lib/profile";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!process.env.XAI_API_KEY) {
    return Response.json(
      { error: "The chat guide needs an xAI API key. Add XAI_API_KEY to .env.local and restart the dev server." },
      { status: 500 },
    );
  }

  const body = (await req.json()) as { messages?: AppUIMessage[]; profile?: unknown };
  const profile = ProfileSchema.safeParse(body.profile);
  if (!profile.success || !Array.isArray(body.messages)) {
    return Response.json({ error: "Invalid request: a valid profile and messages are required." }, { status: 400 });
  }

  const modelId = process.env.XAI_MODEL || "grok-4.7";
  const tools = createTools(profile.data);
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
