"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { BotIcon, LoaderCircleIcon, RotateCcwIcon, SendIcon, SquareIcon } from "lucide-react";
import type { AppUIMessage } from "@/lib/ai/tools";
import { repayableDebts } from "@/lib/finance/debt";
import { gbp } from "@/lib/format";
import type { Profile } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Markdown } from "./markdown";
import { ToolPart, isToolPart } from "./tool-cards";

function suggestions(profile: Profile): string[] {
  const list = [`What should I do with my next ${gbp(profile.nextAmount)}?`];
  if (repayableDebts(profile.debts).length > 0) list.push("Avalanche or snowball for my debts?");
  if (profile.mortgage) {
    list.push(`Should I overpay my mortgage with ${gbp(profile.nextAmount)} or save it?`);
    if (profile.mortgage.fixEndsInMonths <= 6) list.push("My mortgage deal ends soon. What are my options?");
  }
  if (profile.buyingHome) list.push("Is a Lifetime ISA right for my house deposit?");
  list.push("Where should I keep my emergency fund?");
  return list.slice(0, 4);
}

function errorMessage(error: Error): string {
  try {
    return (JSON.parse(error.message) as { error?: string }).error ?? error.message;
  } catch {
    return error.message || "Something went wrong.";
  }
}

export function ChatPanel({ profile }: { profile: Profile }) {
  const [input, setInput] = useState("");
  const transport = useMemo(() => new DefaultChatTransport<AppUIMessage>({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, error, stop, setMessages, clearError } = useChat<AppUIMessage>({
    transport,
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    clearError();
    sendMessage({ text: trimmed }, { body: { profile } });
    setInput("");
  };

  return (
    <Card className="flex h-[70vh] flex-col gap-0 py-0 lg:h-full">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BotIcon className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium">Money guide</p>
            <p className="text-xs text-muted-foreground">Powered by Grok. Numbers come from the calculators.</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="icon-sm" aria-label="Clear conversation" onClick={() => setMessages([])}>
            <RotateCcwIcon />
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
              Ask about your plan, or try a what-if. I can see the numbers you entered, and I&apos;ll run every
              figure through the same calculators as the dashboard.
            </p>
            <div className="grid gap-2">
              {suggestions(profile).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-lg border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                {message.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
              </div>
            </div>
          ) : (
            <div key={message.id} className="grid gap-2 text-sm">
              {message.parts.map((part, i) => {
                if (part.type === "text") {
                  return part.text ? <Markdown key={i}>{part.text}</Markdown> : null;
                }
                if (isToolPart(part)) return <ToolPart key={i} part={part} />;
                return null;
              })}
            </div>
          ),
        )}

        {status === "submitted" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <LoaderCircleIcon className="size-3.5 animate-spin" /> Thinking...
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {errorMessage(error)}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={2}
          placeholder="e.g. What if I put £200 a month extra on my debts?"
          aria-label="Message the money guide"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {busy ? (
          <Button type="button" size="icon-lg" variant="outline" aria-label="Stop" onClick={() => stop()}>
            <SquareIcon />
          </Button>
        ) : (
          <Button type="submit" size="icon-lg" aria-label="Send" disabled={!input.trim()}>
            <SendIcon />
          </Button>
        )}
      </form>
      <p className="px-3 pb-2 text-[11px] text-muted-foreground">
        Guidance, not regulated advice. Your numbers are sent to Grok only when you chat.
      </p>
    </Card>
  );
}
