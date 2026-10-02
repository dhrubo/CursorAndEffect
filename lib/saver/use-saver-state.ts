"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { DEMO_TODAY, goalsForLegacyProfile } from "@/data/saver-personas";
import { parseProfile, type Profile } from "@/lib/profile";
import { parseSaverState, type SaverState } from "./schema";

const STORAGE_KEY = "nurture.state.v2";
const PREVIOUS_KEY = "nuture.state.v2";
const LEGACY_KEY = "nextpound.profile.v1";
const CHANGE_EVENT = "nurture-state-change";

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

export function saveSaverState(state: SaverState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearSaverState() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function stateFromLegacyProfile(profile: Profile, today = DEMO_TODAY): SaverState {
  const { goals, accounts } = goalsForLegacyProfile(profile, today);
  return {
    version: 2,
    today,
    profile,
    goals,
    accounts,
    transactions: [],
    preferences: {
      interests: [],
      lifeStage: profile.age < 26 ? "early_career" : "settling",
      paydayDay: 25,
      alertThresholdDays: 3,
      connections: { bank: false, email: false, social: false },
      autosaveMissed: false,
      signals: [],
    },
    coachEvents: [],
  };
}

export function useSaver() {
  const raw = useSyncExternalStore<string | null | undefined>(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (raw !== null) return;
    const previous = window.localStorage.getItem(PREVIOUS_KEY);
    if (previous) {
      window.localStorage.setItem(STORAGE_KEY, previous);
      window.localStorage.removeItem(PREVIOUS_KEY);
      window.dispatchEvent(new Event(CHANGE_EVENT));
      return;
    }
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (!legacy) return;
    try {
      const profile = parseProfile(JSON.parse(legacy));
      if (!profile) return;
      saveSaverState(stateFromLegacyProfile(profile));
      window.localStorage.removeItem(LEGACY_KEY);
    } catch {
      window.localStorage.removeItem(LEGACY_KEY);
    }
  }, [raw]);

  const state = useMemo(() => {
    if (!raw) return null;
    try {
      return parseSaverState(JSON.parse(raw));
    } catch {
      return null;
    }
  }, [raw]);

  const save = useCallback((next: SaverState) => saveSaverState(next), []);
  const clear = useCallback(() => clearSaverState(), []);

  return { state, loaded: raw !== undefined, save, clear };
}
