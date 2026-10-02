import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { z } from "zod";
import { CONVERSATION_INSTRUCTIONS, dialogue, parseCoachReply, scriptedTurn, type DialogueLine } from "@/lib/plan/conversation";

export const maxDuration = 30;

const Body = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["coach", "user"]),
        text: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1)
    .max(40),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const messages = parsed.data.messages as DialogueLine[];
  const transcript = messages
    .filter((line) => line.role === "user")
    .map((line) => line.text)
    .join("\n");
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(scriptedTurn(transcript));
  }

  try {
    const result = await generateText({
      model: anthropic(process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5"),
      system: CONVERSATION_INSTRUCTIONS,
      prompt: `${dialogue(messages)}\n\nReply with the JSON object only.`,
    });
    return Response.json(parseCoachReply(result.text) ?? scriptedTurn(transcript));
  } catch {
    return Response.json(scriptedTurn(transcript));
  }
}
