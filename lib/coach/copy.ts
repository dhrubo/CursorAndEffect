import { gbp } from "@/lib/format";
import { formatDayMonth } from "@/lib/saver/dates";

export type CoachCopy = { title: string; detail: string };

export function spendCopy(input: {
  goalName: string;
  amount: number;
  from: string;
  to: string;
  deltaDays: number;
}): CoachCopy {
  const days = input.deltaDays === 1 ? "1 day" : `${input.deltaDays} days`;
  return {
    title: `${input.goalName} · ${days} later`,
    detail: `That ${gbp(input.amount)} puts ${input.goalName} on ${formatDayMonth(input.to)} instead of ${formatDayMonth(input.from)}.`,
  };
}

export function protectCopy(goalName: string, spare: number, daysEarlier: number): CoachCopy {
  const sooner = daysEarlier > 0 ? ` Move it to ${goalName} and you land ${daysEarlier} ${daysEarlier === 1 ? "day" : "days"} earlier.` : "";
  return {
    title: `${gbp(spare)} is spare`,
    detail: `${gbp(spare)} is still yours this pay cycle.${sooner}`,
  };
}

export function idleCopy(goalName: string, amount: number, aer: number): CoachCopy {
  return {
    title: `${gbp(amount)} is sitting still`,
    detail: `Your current account is holding ${gbp(amount)} you do not need before payday. It can sit in ${goalName} at about ${aer}% instead.`,
  };
}

export function replanCopy(goalName: string, weekly: number, keepDate: string, laterDate: string): CoachCopy {
  return {
    title: `Friday's save missed ${goalName}`,
    detail: `${gbp(weekly)} a week for the next few weeks keeps ${goalName} on ${formatDayMonth(keepDate)}, or we move the arrival to ${formatDayMonth(laterDate)}.`,
  };
}

export function bounceBackCopy(goalName: string, arrival: string): CoachCopy {
  return {
    title: "Worth it",
    detail: `A cook-in on Saturday and one less ride home puts ${goalName} back on ${formatDayMonth(arrival)}.`,
  };
}

export function milestoneCopy(name: string, wins: string, focus: string, next: string): CoachCopy {
  return {
    title: `Hey ${name}`,
    detail: `${wins} ${focus} Next up: ${next}`,
  };
}

export function neroReminderCopy(): CoachCopy {
  return {
    title: "Before that coffee",
    detail: "Remember, you can have your coffee at the office, skip that Nero stop",
  };
}

export const REMINDER_COPY: CoachCopy[] = [
  neroReminderCopy(),
  {
    title: "Before that night out",
    detail: "That £46 puts Bali on 12 Sep instead of 4 Sep. Keep the plan, or put £20 toward Bali.",
  },
  {
    title: "Spotify is coming up",
    detail: "Spotify, £12.99, usually leaves around the 4th. On Bali, that is about 1 day later.",
  },
  {
    title: "£28 is still yours",
    detail: "£28 left this week. Move it to Bali and arrive 2 days earlier.",
  },
];

export function reminderAt(index: number): CoachCopy {
  return REMINDER_COPY[index % REMINDER_COPY.length];
}

export const BANNED_PHRASES = [
  "failed",
  "bad",
  "impulsive",
  "regret",
  "don't",
  "should have",
  "streak",
  "points",
  "due date",
  "great work",
] as const;

export function allSampleCopy(): string[] {
  return [
    spendCopy({ goalName: "Bali", amount: 46, from: "2026-09-04", to: "2026-09-12", deltaDays: 8 }),
    protectCopy("Bali", 28, 2),
    idleCopy("Bali", 600, 4.1),
    replanCopy("Bali", 52, "2026-09-04", "2026-09-18"),
    bounceBackCopy("Bali", "2026-09-04"),
    milestoneCopy("Jordyn", "Bali is moving.", "One thing to look at: nights out.", "the next £45."),
    ...REMINDER_COPY,
  ].flatMap((copy) => [copy.title, copy.detail]);
}
