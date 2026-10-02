"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { GoalFileSchema, type Goal } from "@/lib/goals/model";

const STORAGE_KEY = "nextpound.goals.v1";
const CHANGE_EVENT = "nextpound-goals-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

const getSnapshot = () => window.localStorage.getItem(STORAGE_KEY);
const getServerSnapshot = () => undefined;

export function saveGoals(profileName: string, goals: Goal[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ profileName, goals }));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useGoals(profileName: string) {
  const raw = useSyncExternalStore<string | null | undefined>(subscribe, getSnapshot, getServerSnapshot);

  const goals = useMemo(() => {
    if (!raw) return [];
    try {
      const parsed = GoalFileSchema.safeParse(JSON.parse(raw));
      if (!parsed.success || parsed.data.profileName !== profileName) return [];
      return parsed.data.goals;
    } catch {
      return [];
    }
  }, [raw, profileName]);

  const save = useCallback((next: Goal[]) => saveGoals(profileName, next), [profileName]);

  return { goals, loaded: raw !== undefined, save };
}
