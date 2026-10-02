import { coachFollowUp } from "./extract-goals";
import { replyEndsConversation } from "./voice";

export type DialogueLine = { role: "coach" | "user"; text: string };

export const CONVERSATION_INSTRUCTIONS = `You are the voice of Nurture, a warm UK savings coach, talking out loud with one person.
Reply in one or two short sentences. No lists, no headings, and no regulated financial advice.
Learn their life plans: a home, a wedding, travel, family, retirement, debt, emergency savings, investing, or a career change. Notice rough costs, target dates, what matters most, and upcoming events. Use their name if they offer it.
Ask one natural follow-up. Do not run through a questionnaire.
When you already know at least two goals, or they say they are finished, set done to true and include the exact phrase "check I heard you right".
Return only JSON with this shape: {"reply":"...","done":false}`;

export function parseCoachReply(raw: string): { reply: string; done: boolean } | null {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const data = JSON.parse(trimmed) as { reply?: unknown; done?: unknown };
    if (typeof data.reply !== "string" || !data.reply.trim()) return null;
    const reply = data.reply.trim();
    return { reply, done: data.done === true || replyEndsConversation(reply) };
  } catch {
    return null;
  }
}

export function scriptedTurn(transcript: string): { reply: string; done: boolean } {
  const reply = coachFollowUp(transcript);
  return { reply, done: replyEndsConversation(reply) };
}

export function dialogue(messages: DialogueLine[]): string {
  return messages.map((line) => `${line.role === "coach" ? "Coach" : "Person"}: ${line.text}`).join("\n");
}

export async function nextCoachLine(messages: DialogueLine[]): Promise<{ reply: string; done: boolean }> {
  const transcript = messages
    .filter((line) => line.role === "user")
    .map((line) => line.text)
    .join("\n");
  try {
    const response = await fetch("/api/conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    if (response.ok) {
      const data = (await response.json()) as { reply?: unknown; done?: unknown };
      if (typeof data.reply === "string" && data.reply.trim()) {
        const reply = data.reply.trim();
        return { reply, done: data.done === true || replyEndsConversation(reply) };
      }
    }
  } catch {
    // The scripted coach keeps the demo moving if the request fails.
  }
  return scriptedTurn(transcript);
}
