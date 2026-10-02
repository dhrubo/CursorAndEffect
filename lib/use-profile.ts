"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { parseProfile, type Profile } from "./profile";

const STORAGE_KEY = "nextpound.profile.v1";
const CHANGE_EVENT = "nextpound-profile-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

const getSnapshot = () => window.localStorage.getItem(STORAGE_KEY);
// undefined on the server distinguishes "not loaded yet" from "no saved profile" (null).
const getServerSnapshot = () => undefined;

export function saveProfile(profile: Profile) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearProfile() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useProfile() {
  const raw = useSyncExternalStore<string | null | undefined>(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const profile = useMemo(() => {
    if (!raw) return null;
    try {
      return parseProfile(JSON.parse(raw));
    } catch {
      return null;
    }
  }, [raw]);

  const save = useCallback((p: Profile) => saveProfile(p), []);
  const clear = useCallback(() => clearProfile(), []);

  return { profile, loaded: raw !== undefined, save, clear };
}
