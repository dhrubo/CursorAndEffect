"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import type { AppUIMessage } from "@/lib/ai/tools";
import { useSaver } from "@/lib/saver/use-saver-state";
import type { SaverState } from "@/lib/saver/schema";

type CoachContextValue = {
  messages: AppUIMessage[];
  send: (text: string) => void;
  status: string;
  error: Error | undefined;
  stop: () => void;
  clear: () => void;
  openCoach: (prefill?: string) => void;
  state: SaverState | null;
};

const CoachContext = createContext<CoachContextValue | null>(null);

export function CoachProvider({ children }: { children: ReactNode }) {
  const { state } = useSaver();
  const router = useRouter();
  const transport = useMemo(() => new DefaultChatTransport<AppUIMessage>({ api: "/api/chat" }), []);
  const chat = useChat<AppUIMessage>({ transport });

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !state) return;
    if (chat.status === "submitted" || chat.status === "streaming") return;
    chat.clearError();
    chat.sendMessage({ text: trimmed }, { body: { state } });
  };

  const openCoach = (prefill?: string) => {
    router.push(prefill ? `/coach?q=${encodeURIComponent(prefill)}` : "/coach");
  };

  return (
    <CoachContext.Provider
      value={{
        messages: chat.messages,
        send,
        status: chat.status,
        error: chat.error,
        stop: chat.stop,
        clear: () => chat.setMessages([]),
        openCoach,
        state,
      }}
    >
      {children}
    </CoachContext.Provider>
  );
}

export function useCoach() {
  const value = useContext(CoachContext);
  if (!value) throw new Error("useCoach must be used inside CoachProvider");
  return value;
}
