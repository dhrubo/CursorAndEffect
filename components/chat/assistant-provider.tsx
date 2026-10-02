"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { transactionsForProfile } from "@/data/transactions";
import type { AppUIMessage } from "@/lib/ai/tools";
import type { CheckIn } from "@/lib/checkin/build";
import type { Nudge } from "@/lib/checkin/nudges";
import { buildCoachProgress } from "@/lib/coach/progress";
import { buildPlan } from "@/lib/finance/ladder";
import type { Milestone } from "@/lib/goals/milestones";
import { ensureHistory, readHistory } from "@/lib/history";
import type { Profile } from "@/lib/profile";
import { useGoals } from "@/lib/use-goals";
import { useHistory } from "@/lib/use-history";
import { useProfile } from "@/lib/use-profile";

const CHAT_KEY = "nextpound.chat.v1";
const CHAT_EVENT = "nextpound-chat-change";
const VIEW_KEY = "nurture.coach.view";
const SEEN_KEY = "nurture.coach.seen";
const SEEN_EVENT = "nurture-coach-seen";

export type CoachView = "foryou" | "chat";

function subscribeChat(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHAT_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHAT_EVENT, onChange);
  };
}

const readChatSnapshot = () => window.sessionStorage.getItem(CHAT_KEY);
const readChatServerSnapshot = () => undefined;

function parseStoredMessages(raw: string | null | undefined): AppUIMessage[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as AppUIMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readStoredView(): CoachView {
  const raw = window.sessionStorage.getItem(VIEW_KEY);
  return raw === "foryou" || raw === "chat" ? raw : "chat";
}

function subscribeSeen(onChange: () => void) {
  window.addEventListener(SEEN_EVENT, onChange);
  return () => window.removeEventListener(SEEN_EVENT, onChange);
}

const readSeenSnapshot = () => window.sessionStorage.getItem(SEEN_KEY) ?? "";
const readSeenServerSnapshot = () => "";

function parseSeen(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

type AssistantContextValue = {
  profile: Profile | null;
  messages: AppUIMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
  error: Error | undefined;
  scripted: boolean;
  checkin: CheckIn | null;
  milestones: Milestone[];
  nudges: Nudge[];
  unreadCount: number;
  view: CoachView;
  setView: (view: CoachView) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  openCoach: () => void;
  send: (text: string) => void;
  openWith: (text: string) => void;
  stop: () => void;
  clear: () => void;
};

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function useAssistant() {
  const value = useContext(AssistantContext);
  if (!value) throw new Error("useAssistant must be used within AssistantProvider");
  return value;
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const { profile } = useProfile();
  const { goals } = useGoals(profile?.name ?? "");
  const { snapshots: history } = useHistory(profile?.name ?? "");
  const [open, setOpen] = useState(false);
  const [view, setViewState] = useState<CoachView>("chat");
  const seenRaw = useSyncExternalStore(subscribeSeen, readSeenSnapshot, readSeenServerSnapshot);
  const seenIds = useMemo(() => parseSeen(seenRaw), [seenRaw]);
  const [scripted, setScripted] = useState(true);
  const [booted, setBooted] = useState(false);
  const storedChat = useSyncExternalStore(subscribeChat, readChatSnapshot, readChatServerSnapshot);

  const transport = useMemo(() => new DefaultChatTransport<AppUIMessage>({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, error, stop, setMessages, clearError } = useChat<AppUIMessage>({
    transport,
    id: "nextpound-guide",
  });
  const busy = status === "submitted" || status === "streaming";

  if (!booted && storedChat !== undefined) {
    const restored = parseStoredMessages(storedChat);
    setBooted(true);
    if (restored.length > 0) setMessages(restored);
  }

  useEffect(() => {
    if (!booted) return;
    window.sessionStorage.setItem(CHAT_KEY, JSON.stringify(messages));
  }, [booted, messages]);

  useEffect(() => {
    if (!profile) return;
    ensureHistory(profile, buildPlan(profile));
  }, [profile]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/chat")
      .then((response) => response.json())
      .then((body: { scripted?: boolean }) => {
        if (!cancelled && typeof body.scripted === "boolean") setScripted(body.scripted);
      })
      .catch(() => {
        if (!cancelled) setScripted(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const progress = useMemo(() => {
    if (!profile) return null;
    return buildCoachProgress({
      profile,
      goals,
      history,
      transactions: transactionsForProfile(profile),
    });
  }, [profile, goals, history]);

  const nudges = useMemo(() => progress?.nudges ?? [], [progress]);
  const unreadCount = nudges.filter((nudge) => !seenIds.includes(nudge.id)).length;

  const rememberView = useCallback((next: CoachView) => {
    setViewState(next);
    window.sessionStorage.setItem(VIEW_KEY, next);
  }, []);

  const acknowledge = useCallback(
    (ids: string[]) => {
      const next = Array.from(new Set([...seenIds, ...ids]));
      window.sessionStorage.setItem(SEEN_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(SEEN_EVENT));
    },
    [seenIds],
  );

  const setView = useCallback(
    (next: CoachView) => {
      rememberView(next);
      if (next === "foryou") acknowledge(nudges.map((nudge) => nudge.id));
    },
    [acknowledge, nudges, rememberView],
  );

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy || !profile) return;
      clearError();
      const stored = readHistory();
      const storedHistory = stored.profileName === profile.name ? stored.snapshots : [];
      sendMessage({ text: trimmed }, { body: { profile, goals, history: storedHistory } });
    },
    [profile, busy, clearError, goals, sendMessage],
  );

  const openCoach = useCallback(() => {
    const unread = nudges.filter((nudge) => !seenIds.includes(nudge.id)).length;
    const next = unread > 0 ? "foryou" : readStoredView();
    rememberView(next);
    if (next === "foryou") acknowledge(nudges.map((nudge) => nudge.id));
    setOpen(true);
  }, [acknowledge, nudges, rememberView, seenIds]);

  const openWith = useCallback(
    (text: string) => {
      rememberView("chat");
      setOpen(true);
      send(text);
    },
    [rememberView, send],
  );

  const clear = useCallback(() => setMessages([]), [setMessages]);

  const value = useMemo<AssistantContextValue>(
    () => ({
      profile,
      messages,
      status,
      error,
      scripted,
      checkin: progress?.checkin ?? null,
      milestones: progress?.milestones ?? [],
      nudges,
      unreadCount,
      view,
      setView,
      open,
      setOpen,
      openCoach,
      send,
      openWith,
      stop,
      clear,
    }),
    [
      profile,
      messages,
      status,
      error,
      scripted,
      progress,
      nudges,
      unreadCount,
      view,
      setView,
      open,
      openCoach,
      send,
      openWith,
      stop,
      clear,
    ],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}
