import { z } from "zod";
import { isoDate, monthKey, addMonths } from "@/lib/dates";
import type { Plan } from "@/lib/finance/ladder";
import { round2 } from "@/lib/spending/model";
import type { Profile } from "@/lib/profile";

export const HISTORY_KEY = "nextpound.history.v1";
export const HISTORY_EVENT = "nextpound-history-change";

export const HistorySnapshotSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  recordedAt: z.string(),
  cashSavings: z.number(),
  monthlySurplus: z.number(),
  totalDebt: z.number(),
  essentialMonthlySpend: z.number(),
  starterBufferTarget: z.number(),
  emergencyFundTarget: z.number(),
  lisaContributedThisYear: z.number(),
});

export type HistorySnapshot = z.infer<typeof HistorySnapshotSchema>;

export const HistoryFileSchema = z.object({
  profileName: z.string(),
  snapshots: z.array(HistorySnapshotSchema),
});

export type HistoryFile = z.infer<typeof HistoryFileSchema>;

export type KeyValueStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export function snapshotFromPlan(profile: Profile, plan: Plan, today = new Date()): HistorySnapshot {
  return {
    month: monthKey(today),
    recordedAt: isoDate(today),
    cashSavings: round2(profile.cashSavings),
    monthlySurplus: plan.metrics.monthlySurplus,
    totalDebt: plan.metrics.totalDebt,
    essentialMonthlySpend: round2(profile.essentialMonthlySpend),
    starterBufferTarget: plan.metrics.starterBufferTarget,
    emergencyFundTarget: plan.metrics.emergencyFundTarget,
    lisaContributedThisYear: round2(profile.lisaContributedThisYear),
  };
}

/** A prior month so the first check-in can say what changed. Only used when storage is empty. */
export function openingHistory(profile: Profile, plan: Plan, today = new Date()): HistorySnapshot[] {
  const current = snapshotFromPlan(profile, plan, today);
  const previousMonth = addMonths(`${current.month}-01`, -1).slice(0, 7);
  const previous: HistorySnapshot = {
    ...current,
    month: previousMonth,
    recordedAt: `${previousMonth}-15`,
    cashSavings: round2(Math.max(0, profile.cashSavings - 80)),
    totalDebt: round2(plan.metrics.totalDebt + (plan.metrics.totalDebt > 0 ? 40 : 0)),
  };
  return [previous, current];
}

export function upsertSnapshot(history: HistorySnapshot[], snapshot: HistorySnapshot): HistorySnapshot[] {
  const without = history.filter((row) => row.month !== snapshot.month);
  return [...without, snapshot].sort((a, b) => a.month.localeCompare(b.month)).slice(-24);
}

export function previousSnapshot(history: HistorySnapshot[], month: string): HistorySnapshot | undefined {
  const earlier = history.filter((row) => row.month < month);
  return earlier.at(-1);
}

export function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

function browserStore(): KeyValueStore {
  if (typeof window === "undefined") return memoryStore();
  return window.localStorage;
}

export function readHistory(store: KeyValueStore = browserStore()): HistoryFile {
  const raw = store.getItem(HISTORY_KEY);
  if (!raw) return { profileName: "", snapshots: [] };
  try {
    const parsed = HistoryFileSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : { profileName: "", snapshots: [] };
  } catch {
    return { profileName: "", snapshots: [] };
  }
}

export function writeHistory(file: HistoryFile, store: KeyValueStore = browserStore()) {
  store.setItem(HISTORY_KEY, JSON.stringify(file));
  if (typeof window !== "undefined" && store === window.localStorage) {
    window.dispatchEvent(new Event(HISTORY_EVENT));
  }
}

/** Keep one monthly snapshot per profile name. An empty file gets a prior month so diffs work. */
export function ensureHistory(
  profile: Profile,
  plan: Plan,
  store: KeyValueStore = browserStore(),
  today = new Date(),
): HistorySnapshot[] {
  const existing = readHistory(store);
  const samePerson = existing.profileName === profile.name && existing.snapshots.length > 0;
  const snapshots = samePerson
    ? upsertSnapshot(existing.snapshots, snapshotFromPlan(profile, plan, today))
    : openingHistory(profile, plan, today);
  writeHistory({ profileName: profile.name, snapshots }, store);
  return snapshots;
}
