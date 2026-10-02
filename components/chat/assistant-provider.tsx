"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { transactionsForProfile } from "@/data/transactions";
import type { AppUIMessage } from "@/lib/ai/tools";
import { buildNudges, type Nudge } from "@/lib/checkin/nudges";
import { buildPlan } from "@/lib/finance/ladder";
import { ensureHistory, readHistory } from "@/lib/history";
import type { Profile } from "@/lib/profile";
import { reviewSpending, suggestSpendingChanges } from "@/lib/spending/insights";
import { useGoals } from "@/lib/use-goals";
import { useProfile } from "@/lib/use-profile";

const CHAT_KEY = "nextpound.chat.v1";
const CHAT_EVENT = "nextpound-chat-change";

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

type AssistantContextValue = {
  profile: Profile | null;
  messages: AppUIMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
  error: Error | undefined;
  scripted: boolean;
  nudges: Nudge[];
  open: boolean;
  setOpen: (open: boolean) => void;
  send: (text: string) => void;
  openWith: (text: string) => void;
  stop: () => void;
  clear: () => void;
  setProfileOverride: (profile: Profile | null) => void;
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
  const [override, setOverrideState] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  const [scripted, setScripted] = useState(true);
  const [booted, setBooted] = useState(false);
  const storedChat = useSyncExternalStore(subscribeChat, readChatSnapshot, readChatServerSnapshot);
  const active = override ?? profile;

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

  const nudges = useMemo(() => {
    if (!profile) return [];
    const plan = buildPlan(profile);
    const transactions = transactionsForProfile(profile);
    return buildNudges({
      plan,
      review: reviewSpending(transactions),
      suggestions: suggestSpendingChanges(profile, transactions),
    });
  }, [profile]);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      if (!active) return;
      clearError();
      const stored = readHistory();
      const history = stored.profileName === active.name ? stored.snapshots : [];
      sendMessage({ text: trimmed }, { body: { profile: active, goals, history } });
    },
    [active, busy, clearError, goals, sendMessage],
  );

  const openWith = useCallback(
    (text: string) => {
      setOpen(true);
      send(text);
    },
    [send],
  );

  const clear = useCallback(() => setMessages([]), [setMessages]);
  const setProfileOverride = useCallback((next: Profile | null) => setOverrideState(next), []);

  const value = useMemo<AssistantContextValue>(
    () => ({
      profile: active,
      messages,
      status,
      error,
      scripted,
      nudges,
      open,
      setOpen,
      send,
      openWith,
      stop,
      clear,
      setProfileOverride,
    }),
    [active, messages, status, error, scripted, nudges, open, send, openWith, stop, clear, setProfileOverride],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}
