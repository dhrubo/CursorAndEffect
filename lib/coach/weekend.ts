import { gbp } from "@/lib/format";
import { addDays, daysBetween, weekday } from "@/lib/saver/dates";
import type { SaverState, Transaction, TxCategory } from "@/lib/saver/schema";
import { divertImpact } from "@/lib/timeline/eta";
import { primaryGoal } from "./rules";

/** Weekends run Friday to Sunday, so payday Fridays count. */
const WEEKEND_DAYS = 3;
const RECOVERY_WEEKS = 3;
const MIN_OVERSPEND = 20;

export type WeekendOverspend = {
  start: string;
  end: string;
  spent: number;
  typical: number;
  over: number;
  merchants: { merchant: string; amount: number }[];
  goalId: string;
  goalName: string;
  /** Days the overspend adds to the primary plan's arrival. */
  deltaDays: number;
};

export type RecoveryOption = {
  id: "trim_eating_out" | "swap_weekends" | "pause_category";
  title: string;
  detail: string;
  ideas: string[];
  perWeek: number;
  weeks: number;
  total: number;
  coversOverspend: boolean;
  /** Days the plan's arrival comes back by if the total goes to the plan. */
  daysWonBack: number;
};

export type WeekendRecoveryPlan = {
  overspend: WeekendOverspend;
  weeks: number;
  options: RecoveryOption[];
};

const SWAP_IDEAS = [
  "Host a dinner at home and split the shop",
  "Brunch at home, then a walk or a free gallery",
  "A pub quiz or film night instead of a big night out",
];

const PAUSE: Partial<Record<TxCategory, { label: string; ideas: string[] }>> = {
  shopping: {
    label: "shopping",
    ideas: ["Leave things in the basket for a week before buying", "Mute sale emails until it's back"],
  },
  nights_out: {
    label: "nights out",
    ideas: ["One night out a week, not two", "Pre-drinks at home, then one round out"],
  },
  subscriptions: {
    label: "subscriptions",
    ideas: ["Pause one you haven't opened this month", "Share a family plan with a friend"],
  },
};

function round(n: number): number {
  return Math.round(n);
}

function spend(transactions: Transaction[], from: string, to: string, categories: TxCategory[]): Transaction[] {
  return transactions.filter(
    (tx) => tx.amount < 0 && categories.includes(tx.category) && tx.date >= from && tx.date <= to,
  );
}

function total(transactions: Transaction[]): number {
  return transactions.reduce((sum, tx) => sum - tx.amount, 0);
}

/** The most recent Friday-to-Sunday that has fully passed. */
export function lastWeekend(today: string): { start: string; end: string } {
  const back = weekday(today) === 0 ? 7 : weekday(today);
  const end = addDays(today, -back);
  return { start: addDays(end, -(WEEKEND_DAYS - 1)), end };
}

function earliest(transactions: Transaction[]): string | null {
  return transactions.reduce<string | null>((min, tx) => (min === null || tx.date < min ? tx.date : min), null);
}

/** Usual weekly spend in a category over the eight weeks before `before`. */
function weeklyAverage(transactions: Transaction[], before: string, categories: TxCategory[]): number {
  const first = earliest(transactions);
  if (!first) return 0;
  const from = addDays(before, -56) < first ? first : addDays(before, -56);
  const days = daysBetween(from, before);
  if (days < 7) return 0;
  return (total(spend(transactions, from, addDays(before, -1), categories)) * 7) / days;
}

/** Earlier weekends inside the feed, newest first. */
function earlierWeekends(transactions: Transaction[], start: string): { start: string; end: string }[] {
  const first = earliest(transactions);
  const weekends: { start: string; end: string }[] = [];
  for (let n = 1; n <= 8 && first; n += 1) {
    const from = addDays(start, -7 * n);
    if (from < first) break;
    weekends.push({ start: from, end: addDays(from, WEEKEND_DAYS - 1) });
  }
  return weekends;
}

export function detectWeekendOverspend(state: SaverState): WeekendOverspend | null {
  const goal = primaryGoal(state);
  if (!goal) return null;
  const { start, end } = lastWeekend(state.today);
  const recent = spend(state.transactions, start, end, ["eating_out"]);
  const spent = total(recent);
  const history = earlierWeekends(state.transactions, start);
  if (history.length < 3) return null;
  const typical =
    history.reduce((sum, weekend) => sum + total(spend(state.transactions, weekend.start, weekend.end, ["eating_out"])), 0) /
    history.length;
  const over = round(spent - typical);
  if (over < MIN_OVERSPEND || spent < typical * 1.3) return null;

  const byMerchant = new Map<string, number>();
  for (const tx of recent) byMerchant.set(tx.merchant, (byMerchant.get(tx.merchant) ?? 0) - tx.amount);

  return {
    start,
    end,
    spent: round(spent),
    typical: round(typical),
    over,
    merchants: [...byMerchant]
      .map(([merchant, amount]) => ({ merchant, amount: round(amount) }))
      .sort((a, b) => b.amount - a.amount),
    goalId: goal.id,
    goalName: goal.name,
    deltaDays: divertImpact(goal, over, { today: state.today }).deltaDays,
  };
}

function option(
  state: SaverState,
  overspend: WeekendOverspend,
  fields: Omit<RecoveryOption, "total" | "coversOverspend" | "daysWonBack">,
): RecoveryOption {
  const goal = state.goals.find((item) => item.id === overspend.goalId);
  const sum = fields.perWeek * fields.weeks;
  return {
    ...fields,
    total: sum,
    coversOverspend: sum >= overspend.over,
    daysWonBack: goal ? divertImpact(goal, Math.min(sum, overspend.over), { today: state.today }).deltaDays : 0,
  };
}

/** Two or three ways to win back last weekend's overspend from the person's own usual spending. */
export function planWeekendRecovery(state: SaverState): WeekendRecoveryPlan | null {
  const overspend = detectWeekendOverspend(state);
  if (!overspend) return null;
  const weeks = RECOVERY_WEEKS;
  const target = Math.ceil(overspend.over / weeks);
  const options: RecoveryOption[] = [];

  const eatingOut = weeklyAverage(state.transactions, overspend.start, ["eating_out"]);
  const trim = Math.min(target, round(eatingOut * 0.7));
  if (trim >= 5) {
    const cap = round(eatingOut - trim);
    options.push(
      option(state, overspend, {
        id: "trim_eating_out",
        title: `Keep eating out to ${gbp(cap)} a week`,
        detail: `You usually spend about ${gbp(eatingOut)} a week eating out. Holding it to ${gbp(cap)} for ${weeks} weeks saves ${gbp(trim)} a week.`,
        ideas: ["Lunch from home on workdays", "One meal out a week, not two or three"],
        perWeek: trim,
        weeks,
      }),
    );
  }

  const usualWeekend =
    earlierWeekends(state.transactions, overspend.start).reduce(
      (sum, weekend) => sum + total(spend(state.transactions, weekend.start, weekend.end, ["eating_out", "nights_out"])),
      0,
    ) / Math.max(1, earlierWeekends(state.transactions, overspend.start).length);
  const cheaper = Math.max(10, round(usualWeekend * 0.35));
  const swapSaving = round(usualWeekend - cheaper);
  if (swapSaving >= 5) {
    const swapWeeks = Math.min(weeks, Math.max(1, Math.ceil(overspend.over / swapSaving)));
    options.push(
      option(state, overspend, {
        id: "swap_weekends",
        title: `Swap ${swapWeeks === 1 ? "next weekend" : `the next ${swapWeeks} weekends`} for cheaper plans`,
        detail: `A usual weekend of eating and going out costs you about ${gbp(usualWeekend)}. Plans closer to ${gbp(cheaper)} keep the social bit and save ${gbp(swapSaving)} a weekend.`,
        ideas: SWAP_IDEAS,
        perWeek: swapSaving,
        weeks: swapWeeks,
      }),
    );
  }

  const pause = (Object.keys(PAUSE) as TxCategory[])
    .map((category) => ({ category, weekly: weeklyAverage(state.transactions, overspend.start, [category]) }))
    .filter((row) => row.category !== "nights_out" || !options.some((item) => item.id === "swap_weekends"))
    .sort((a, b) => b.weekly - a.weekly)[0];
  if (pause && pause.weekly >= 5) {
    const perWeek = Math.min(target, round(pause.weekly * 0.75));
    const { label, ideas } = PAUSE[pause.category]!;
    const merchant = spend(state.transactions, addDays(overspend.start, -56), overspend.end, [pause.category])[0]?.merchant;
    options.push(
      option(state, overspend, {
        id: "pause_category",
        title: `Ease off ${label} for ${weeks} weeks`,
        detail: `${merchant ? `${merchant} and the rest of your ` : "Your "}${label} comes to about ${gbp(pause.weekly)} a week. Skipping most of it for ${weeks} weeks saves ${gbp(perWeek)} a week.`,
        ideas,
        perWeek,
        weeks,
      }),
    );
  }

  if (options.length === 0) return null;
  return { overspend, weeks, options: options.slice(0, 3) };
}

/** The coach's opening line when the person first opens the coach. */
export function weekendNudge(state: SaverState, overspend: WeekendOverspend): string {
  const name = state.profile.name.trim();
  const days = overspend.deltaDays > 0 ? ` That pushes ${overspend.goalName} back about ${overspend.deltaDays} days.` : "";
  return `${name ? `Hey ${name}, l` : "L"}ast weekend's eating out came to ${gbp(overspend.spent)}, about ${gbp(overspend.over)} more than a usual weekend.${days} Want to find a plan to save that back towards your goals?`;
}

export const WEEKEND_ACCEPT = "Yes, let's find a plan to save it back";
