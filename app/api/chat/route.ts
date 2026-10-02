import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
} from "ai";
import { mockChatResponse } from "@/lib/ai/mock";
import { buildCoachPrompt, buildSystemPrompt } from "@/lib/ai/systemPrompt";
import { createSaverTools, createTools, type AppUIMessage } from "@/lib/ai/tools";
import { ProfileSchema } from "@/lib/profile";
import { deriveProfile } from "@/lib/saver/derive-profile";
import { SaverStateSchema } from "@/lib/saver/schema";

export const maxDuration = 60;

export async function GET() {
  return Response.json({ scripted: !process.env.ANTHROPIC_API_KEY });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { messages?: AppUIMessage[]; profile?: unknown; state?: unknown }
    | null;
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request: a JSON body is required." }, { status: 400 });
  }
  const state = SaverStateSchema.safeParse(body.state);
  const profile = ProfileSchema.safeParse(body.profile);
  if (!Array.isArray(body.messages) || (!state.success && !profile.success)) {
    return Response.json({ error: "Invalid request: messages and a saver state or profile are required." }, { status: 400 });
  }

  const resolvedProfile = profile.success ? profile.data : deriveProfile(state.data!);
  if (!process.env.ANTHROPIC_API_KEY) {
    return mockChatResponse({
      profile: resolvedProfile,
      state: state.success ? state.data : undefined,
      messages: body.messages,
    });
  }

  const tools = state.success ? createSaverTools(state.data) : createTools(resolvedProfile);
  const instructions = state.success ? buildCoachPrompt(state.data) : buildSystemPrompt(resolvedProfile);
  const result = streamText({
    model: anthropic(process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5"),
    instructions,
    messages: await convertToModelMessages(body.messages, { tools, ignoreIncompleteToolCalls: true }),
    tools,
    stopWhen: isStepCount(5),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      tools,
      onError: () => {
        console.error("[chat] request failed");
        return "Something went wrong talking to the coach.";
      },
    }),
  });
}
