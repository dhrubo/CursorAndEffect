import { createUIMessageStream, createUIMessageStreamResponse, type UIMessageChunk } from "ai";
import { transactionsForProfile } from "@/data/transactions";
import { buildCheckIn, type CheckIn } from "@/lib/checkin/build";
import { compareDebtStrategies, repayableDebts } from "@/lib/finance/debt";
import { buildPlan } from "@/lib/finance/ladder";
import { compareOverpayVsSave, remortgageOptions } from "@/lib/finance/mortgage";
import { findSavingsProducts, type SavingsSearch } from "@/lib/finance/savings";
import { gbp, months, pct } from "@/lib/format";
import type { Goal } from "@/lib/goals/model";
import type { HistorySnapshot } from "@/lib/history";
import type { Profile } from "@/lib/profile";
import {
  reviewSpending,
  suggestSpendingChanges,
  type SpendingReview,
  type SpendingSuggestion,
} from "@/lib/spending/insights";

export type MockIntent =
  | "greeting"
  | "checkin"
  | "suggest"
  | "review"
  | "debt"
  | "overpay"
  | "remortgage"
  | "savings"
  | "allocate";

type IncomingMessage = {
  role: string;
  parts?: { type: string; text?: string }[];
};

export type MockToolCall = {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output: unknown;
};

export type MockReply = {
  intent: MockIntent;
  text: string;
  calls: MockToolCall[];
};

export function lastUserText(messages: IncomingMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "user") continue;
    const text = (message.parts ?? [])
      .filter((part) => part.type === "text")
      .map((part) => part.text ?? "")
      .join(" ")
      .trim();
    if (text) return text;
  }
  return "";
}

export function detectIntent(text: string): MockIntent {
  const normalised = text.toLowerCase();
  if (/^(?:hi|hello|hey|good (?:morning|afternoon|evening))(?:\b|[!,.?])/.test(normalised.trim())) return "greeting";
  if (/how am i|how'm i|how are you|check-?in|am i doing|how am i doing/.test(normalised)) return "checkin";
  if (/what spending|could i cut|subscription|eating out|free up|spend less|unused|spending change/.test(normalised)) {
    return "suggest";
  }
  if (/what changed in my spending|review my spending|my spending/.test(normalised)) return "review";
  if (/avalanche|snowball|debt|towards them|0%|balance transfer|overdraft/.test(normalised)) return "debt";
  if (/overpay/.test(normalised)) return "overpay";
  if (/remortgage|mortgage deal|deal ends|standard variable/.test(normalised)) return "remortgage";
  if (/where should i keep|emergency fund|lifetime isa|\blisa\b|savings account|savings product/.test(normalised)) {
    return "savings";
  }
  if (/next £|what should i do|with my next|allocate|bonus/.test(normalised)) return "allocate";
  return "checkin";
}

function poundsIn(text: string): number | undefined {
  const match = text.replace(/,/g, "").match(/£\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*pounds/i);
  const raw = match?.[1] ?? match?.[2];
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function checkInText(checkin: CheckIn): string {
  const win = checkin.wins[0];
  const risk = checkin.risks[0];
  const sentences = [checkin.headline];
  if (win) sentences.push(`One thing going well: ${win.title}. ${win.detail}`);
  if (risk) sentences.push(`The thing to watch is ${risk.title}.`);
  sentences.push(checkin.nextAction.detail);
  sentences.push("Want me to look at that with you?");
  return sentences.join(" ");
}

function spendingText(review: SpendingReview, suggestions: SpendingSuggestion[]): string {
  const top = suggestions[0];
  const mover = review.topMovers[0];
  if (!top) {
    return mover
      ? `I noticed ${mover.label} moved the most between ${review.previousMonth ?? "the earlier month"} and ${review.latestMonth}. Nothing in the feed looks like a clean monthly cut. Does that match how the month felt?`
      : "I looked through the spending feed and nothing stands out as a clean cut. Does that match how the month felt?";
  }
  const noticed = mover
    ? `I noticed ${mover.label} is the biggest shift, and ${top.title.toLowerCase()} is the change I'd look at first.`
    : `I noticed ${top.title.toLowerCase()}.`;
  return `${noticed} ${top.detail} Does that match what you meant to keep? ${top.planEffect.progressLine}`;
}

function debtText(profile: Profile, extra: number | undefined): { text: string; output: unknown; input: Record<string, unknown> } {
  const input = extra === undefined ? {} : { extraPerMonth: extra };
  if (repayableDebts(profile.debts).length === 0) {
    return {
      input,
      output: { error: "The user has no debts to compare (student loans are excluded)." },
      text: "There aren't any repayable debts to compare. Student loans are left out of this. Want to look at where spare cash could sit instead?",
    };
  }
  const comparison = compareDebtStrategies(profile, input);
  const output = { ...comparison, timelines: undefined };
  const chosen = output[output.recommended];
  const name = output.recommended === "avalanche" ? "Avalanche" : "Snowball";
  return {
    input,
    output,
    text: `${name} is the one I'd start with here. It takes ${months(chosen.months)} and the interest gap versus the other order is ${gbp(output.interestSavedWithAvalanche)}. The card has the payoff order. Is the interest saving the point, or do you want the quick win of clearing a balance sooner?`,
  };
}

function friend(name: string, text: string): string {
  const who = name.trim();
  if (!who || text.toLowerCase().startsWith(who.toLowerCase())) return text;
  return `${who}, ${text}`;
}

export function buildMockReply(input: {
  profile: Profile;
  text: string;
  messages?: IncomingMessage[];
  goals?: Goal[];
  history?: HistorySnapshot[];
  today?: Date;
}): MockReply {
  const reply = composeMockReply(input);
  return { ...reply, text: friend(input.profile.name, reply.text) };
}

function composeMockReply(input: {
  profile: Profile;
  text: string;
  messages?: IncomingMessage[];
  goals?: Goal[];
  history?: HistorySnapshot[];
  today?: Date;
}): MockReply {
  const intent = detectIntent(input.text);
  const amount = poundsIn(input.text);

  if (intent === "greeting") {
    const hasSpokenBefore = (input.messages ?? []).some((message) => message.role === "assistant");
    return {
      intent,
      text: hasSpokenBefore
        ? `I’m here, ${input.profile.name || "and listening"}. What would you like to look at?`
        : `Hi ${input.profile.name || "there"}. How are you feeling about your money today — what’s on your mind?`,
      calls: [],
    };
  }

  if (intent === "checkin") {
    const output = buildCheckIn({
      profile: input.profile,
      goals: input.goals,
      history: input.history,
      today: input.today,
    });
    return {
      intent,
      text: checkInText(output),
      calls: [{ id: "mock-checkin", name: "get_checkin", input: {}, output }],
    };
  }

  if (intent === "suggest" || intent === "review") {
    const transactions = transactionsForProfile(input.profile);
    const review = reviewSpending(transactions);
    const suggestions = suggestSpendingChanges(input.profile, transactions);
    return {
      intent,
      text: spendingText(review, suggestions),
      calls: [
        { id: "mock-review", name: "review_spending", input: {}, output: review },
        { id: "mock-suggest", name: "suggest_spending_changes", input: {}, output: { suggestions } },
      ],
    };
  }

  if (intent === "debt") {
    const debt = debtText(input.profile, amount);
    return {
      intent,
      text: debt.text,
      calls: [{ id: "mock-debt", name: "compare_debt_strategies", input: debt.input, output: debt.output }],
    };
  }

  if (intent === "overpay") {
    const lumpSum = amount ?? input.profile.nextAmount;
    const output =
      compareOverpayVsSave(input.profile, { lumpSum }) ??
      ({ error: "The user hasn't added a mortgage to their profile." } as const);
    const text =
      "error" in output
        ? `${output.error} Want to add a mortgage on the numbers page?`
        : `${output.current.verdict === "save" ? "Saving wins" : output.current.verdict === "overpay" ? "Overpaying wins" : "It's too close to call"} for ${gbp(output.lumpSum)} over ${output.horizonYears} years at ${pct(output.current.mortgageRatePct)}. The card has both sides. Want to see what changes when the deal ends?`;
    return {
      intent,
      text,
      calls: [{ id: "mock-overpay", name: "compare_overpay_vs_save", input: { lumpSum }, output }],
    };
  }

  if (intent === "remortgage") {
    const output = remortgageOptions(input.profile) ?? { error: "The user hasn't added a mortgage to their profile." };
    const text =
      "error" in output
        ? `${output.error} Want to add a mortgage on the numbers page?`
        : `I compared illustrative deals against staying put or drifting onto the standard variable rate. The cheapest on the card is ${output.options[0] ? `${output.options[0].product.provider} ${output.options[0].product.name}` : "listed there"}. Rates are illustrative as of ${output.ratesAsOf}. Want to look at overpaying versus saving as well?`;
    return {
      intent,
      text,
      calls: [{ id: "mock-remortgage", name: "compare_remortgage_options", input: {}, output }],
    };
  }

  if (intent === "savings") {
    const goal: SavingsSearch["goal"] = /house|lisa|deposit/.test(input.text.toLowerCase())
      ? "house"
      : /emergency/.test(input.text.toLowerCase())
        ? "emergency"
        : "short_term";
    const savedAmount = amount ?? (input.profile.cashSavings > 0 ? input.profile.cashSavings : input.profile.nextAmount);
    const output = findSavingsProducts(input.profile, goal, savedAmount);
    const top = output.matches.find((match) => match.eligible);
    const text = top
      ? `For ${gbp(output.amount)}, ${top.product.provider} ${top.product.name} is the first account I'd look at, at ${pct(top.product.aer)} AER. The card lists the rest, illustrative as of ${output.ratesAsOf}. Is this money for an emergency, or can it stay put for longer?`
      : `I couldn't find an eligible account for ${gbp(output.amount)}. Want to try a different amount?`;
    return {
      intent,
      text,
      calls: [{ id: "mock-savings", name: "find_savings_products", input: { goal, amount: savedAmount }, output }],
    };
  }

  const plannedAmount = amount ?? input.profile.nextAmount;
  const plan = buildPlan(input.profile, plannedAmount);
  const placed = plan.allocations.filter((row) => row.amount > 0).slice(0, 3);
  const where =
    placed.length === 0
      ? "The plan stops before splitting the money."
      : `It puts ${placed.map((row) => `${gbp(row.amount)} on ${row.title}`).join(", ")}.`;
  return {
    intent: "allocate",
    text: `For ${gbp(plan.amount)}, ${where} The card has the full ladder. Want to try a different amount?`,
    calls: [{ id: "mock-allocate", name: "allocate_next_amount", input: { amount: plannedAmount }, output: plan }],
  };
}

export function createMockUIMessageStream(reply: MockReply): ReadableStream<UIMessageChunk> {
  return createUIMessageStream({
    generateId: () => "mock-reply",
    execute: ({ writer }) => {
      writer.write({ type: "start", messageId: "mock-reply" });
      writer.write({ type: "start-step" });
      writer.write({ type: "text-start", id: "reply" });
      writer.write({ type: "text-delta", id: "reply", delta: reply.text });
      writer.write({ type: "text-end", id: "reply" });
      writer.write({ type: "finish-step" });
      for (const call of reply.calls) {
        writer.write({ type: "start-step" });
        writer.write({
          type: "tool-input-available",
          toolCallId: call.id,
          toolName: call.name,
          input: call.input,
        });
        writer.write({
          type: "tool-output-available",
          toolCallId: call.id,
          output: call.output,
        });
        writer.write({ type: "finish-step" });
      }
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });
}

export function mockChatResponse(input: {
  profile: Profile;
  messages: IncomingMessage[];
  goals?: Goal[];
  history?: HistorySnapshot[];
  today?: Date;
}): Response {
  const reply = buildMockReply({
    profile: input.profile,
    text: lastUserText(input.messages),
    messages: input.messages,
    goals: input.goals,
    history: input.history,
    today: input.today,
  });
  return createUIMessageStreamResponse({
    stream: createMockUIMessageStream(reply),
    headers: { "x-nextpound-scripted": "1" },
  });
}
