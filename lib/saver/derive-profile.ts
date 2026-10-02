import type { Profile } from "@/lib/profile";
import type { SaverState } from "./schema";

export function deriveProfile(state: SaverState): Profile {
  const current = state.accounts.filter((account) => account.kind === "current");
  const cash = state.accounts.filter((account) => account.kind === "easy_access" || account.kind === "cash_isa");
  const lisa = state.accounts.filter((account) => account.kind === "lisa");
  const isa = state.accounts.filter((account) => account.kind === "cash_isa" || account.kind === "lisa" || account.kind === "stocks_isa");
  return {
    ...state.profile,
    cashSavings: sum(cash),
    idleCurrentAccountCash: sum(current),
    isaContributedThisYear: Math.max(state.profile.isaContributedThisYear, sum(isa)),
    lisaContributedThisYear: Math.max(state.profile.lisaContributedThisYear, sum(lisa)),
  };
}

function sum(accounts: { balance: number }[]): number {
  return Math.round(accounts.reduce((total, account) => total + account.balance, 0));
}
