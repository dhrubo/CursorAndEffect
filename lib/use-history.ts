"use client";

import { useMemo, useSyncExternalStore } from "react";
import { HISTORY_EVENT, HISTORY_KEY, HistoryFileSchema, type HistorySnapshot } from "@/lib/history";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(HISTORY_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(HISTORY_EVENT, onChange);
  };
}

const getSnapshot = () => window.localStorage.getItem(HISTORY_KEY);
const getServerSnapshot = () => undefined;

export function useHistory(profileName: string) {
  const raw = useSyncExternalStore<string | null | undefined>(subscribe, getSnapshot, getServerSnapshot);

  const snapshots = useMemo(() => {
    if (!raw) return [];
    try {
      const parsed = HistoryFileSchema.safeParse(JSON.parse(raw));
      if (!parsed.success || parsed.data.profileName !== profileName) return [];
      return parsed.data.snapshots;
    } catch {
      return [];
    }
  }, [raw, profileName]);

  return { snapshots, ready: raw !== undefined && snapshots.length > 0 };
}

export type { HistorySnapshot };
