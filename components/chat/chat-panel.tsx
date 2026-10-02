"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircleIcon, RotateCcwIcon, SendIcon, SquareIcon } from "lucide-react";
import { FourPointStar } from "@/components/four-point-star";
import { BrandStar } from "@/components/shell/brand-mark";
import { useCoach } from "@/components/shell/coach-provider";
import { repayableDebts } from "@/lib/finance/debt";
import { gbp } from "@/lib/format";
import type { Profile } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "cn";
import { useAssistant } from "./assistant-provider";
import { Markdown } from "./markdown";
import { ToolPart, isToolPart } from "./tool-cards";

const SAVER_SUGGESTIONS = [
  "How am I doing",
  "What if I spend £46 tonight",
  "Where is my spare money sitting",
  "Help me plan a new goal",
];

function suggestions(profile: Profile): string[] {
  const list = ["How am I doing?", "What spending could I cut?", `What should I do with my next ${gbp(profile.nextAmount)}?`];
  if (repayableDebts(profile.debts).length > 0) list.push("Avalanche or snowball for my debts?");
  if (profile.mortgage && profile.mortgage.fixEndsInMonths <= 6) list.push("My mortgage deal ends soon. What are my options?");
  if (profile.buyingHome) list.push("Is a Lifetime ISA right for my house deposit?");
  return list.slice(0, 4);
}

function errorMessage(error: Error): string {
  try {
    return (JSON.parse(error.message) as { error?: string }).error ?? error.message;
  } catch {
    return error.message || "Something went wrong.";
  }
}

function AssistantChatPanel({
  profile,
  variant = "sidebar",
  className,
}: {
  profile?: Profile | null;
  variant?: "sidebar" | "dock";
  className?: string;
}) {
  const assistant = useAssistant();
  const active = profile ?? assistant.profile;
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = assistant.status === "submitted" || assistant.status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [assistant.messages, assistant.status]);

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    assistant.send(text);
    setInput("");
  };

  return (
    <Card
      className={cn(
        "flex min-h-0 flex-col gap-0 py-0",
        variant === "sidebar" ? "h-[70vh] bg-nuture-paper lg:h-full" : "h-full rounded-none border-0 bg-nuture-paper shadow-none ring-0",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3 pr-12">
        <div className="flex items-center gap-2">
          <span className="flex size-11 items-center justify-center rounded-full border border-white bg-white/70 text-nuture-ink backdrop-blur-md">
            <FourPointStar className="text-lg" />
          </span>
          <div>
            <p className="text-[15px] font-medium">Coach</p>
            <p className="text-[13px] text-nuture-ink/60">
              {assistant.scripted
                ? "Scripted replies. Numbers still come from the calculators."
                : "Powered by Grok. Numbers come from the calculators."}
            </p>
          </div>
        </div>
        {assistant.messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon-sm"
            className={variant === "dock" ? "mr-8" : undefined}
            aria-label="Clear conversation"
            onClick={() => assistant.clear()}
          >
            <RotateCcwIcon />
          </Button>
        )}
      </div>

      {assistant.scripted && (
        <p className="border-b bg-secondary px-4 py-2 text-xs text-secondary-foreground">
          Replies are scripted without an xAI key. The figures still come from the calculators, and nothing is sent to Grok.
        </p>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {!active && (
          <p className="text-sm text-muted-foreground">
            Add your numbers, or load a demo household, and Coach can talk about that plan.
          </p>
        )}

        {active && assistant.messages.length === 0 && (
          <div className="grid gap-3">
            <p className="text-[15px] text-nuture-ink/60">
              Hey {active.name.trim() || "there"}, what can I help with today
            </p>
            <div className="grid gap-2">
              {suggestions(active).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  className="min-h-11 rounded-full border border-nuture-ink/10 bg-white px-4 py-2 text-left text-[15px] transition-colors hover:bg-nuture-cream"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {assistant.messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-nuture-lime px-3 py-2 text-sm text-white">
                {message.parts.map((part, index) => (part.type === "text" ? <span key={index}>{part.text}</span> : null))}
              </div>
            </div>
          ) : (
            <div key={message.id} className="grid gap-2 text-sm">
              {message.parts.map((part, index) => {
                if (part.type === "text") {
                  return part.text ? <Markdown key={index}>{part.text}</Markdown> : null;
                }
                if (isToolPart(part)) return <ToolPart key={index} part={part} />;
                return null;
              })}
            </div>
          ),
        )}

        {active && assistant.messages.length > 0 && !busy && (
          <div className="flex flex-wrap gap-2">
            {["How am I doing?", "What spending could I cut?"].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => send(prompt)}
                className="min-h-11 rounded-full border border-nuture-ink/10 bg-white px-4 text-[13px] hover:bg-nuture-cream"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {assistant.status === "submitted" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <LoaderCircleIcon className="size-3.5 animate-spin" /> Thinking...
          </div>
        )}

        {assistant.error && (
          <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {errorMessage(assistant.error)}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
      >
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send(input);
            }
          }}
          rows={2}
          disabled={!active}
          placeholder={active ? "e.g. What if I put £200 a month extra on my debts?" : "Add your numbers to start"}
          aria-label="Message Coach"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
        />
        {busy ? (
          <Button type="button" size="icon-lg" variant="outline" aria-label="Stop" onClick={() => assistant.stop()}>
            <SquareIcon />
          </Button>
        ) : (
          <Button type="submit" size="icon-lg" aria-label="Send" disabled={!input.trim() || !active}>
            <SendIcon />
          </Button>
        )}
      </form>
      <p className="px-3 pb-2 text-[11px] text-muted-foreground">
        Guidance, not regulated advice.
        {assistant.scripted
          ? " Scripted demo: your numbers stay in this browser."
          : " Your numbers are sent to Grok only when you chat."}
      </p>
    </Card>
  );
}

function SaverChatPanel({ prefill }: { prefill?: string }) {
  const { messages, send, status, error, stop, clear, state } = useCoach();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";
  const sentPrefill = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  useEffect(() => {
    if (!prefill || sentPrefill.current || !state) return;
    sentPrefill.current = true;
    send(prefill);
  }, [prefill, send, state]);

  const submit = (text: string) => {
    send(text);
    setInput("");
  };

  return (
    <div className="flex min-h-[70vh] flex-col text-white">
      <div className="flex items-center justify-between px-1 py-2">
        <div className="flex items-center gap-2 text-sm">
          <BrandStar className="size-4" />
          <span>Coach</span>
        </div>
        {messages.length > 0 && (
          <button type="button" aria-label="Clear conversation" onClick={clear} className="frosted rounded-full p-2">
            <RotateCcwIcon className="size-4" />
          </button>
        )}
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto py-4">
        {messages.length === 0 && (
          <div className="grid gap-2">
            {SAVER_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => submit(suggestion)}
                className="frosted rounded-full px-4 py-2 text-left text-[15px]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl bg-white/20 px-3 py-2 text-sm">
                {message.parts.map((part, index) => (part.type === "text" ? <span key={index}>{part.text}</span> : null))}
              </div>
            </div>
          ) : (
            <div key={message.id} className="grid gap-2 text-sm">
              {message.parts.map((part, index) => {
                if (part.type === "text") return part.text ? <Markdown key={index}>{part.text}</Markdown> : null;
                if (isToolPart(part)) return <ToolPart key={index} part={part} />;
                return null;
              })}
            </div>
          ),
        )}
        {status === "submitted" && (
          <div className="flex items-center gap-2 text-xs text-white/80">
            <LoaderCircleIcon className="size-3.5 animate-spin" /> Thinking
          </div>
        )}
        {error && (
          <div role="alert" className="rounded-2xl bg-white/15 px-3 py-2 text-sm">
            {errorMessage(error)}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit(input);
        }}
      >
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit(input);
            }
          }}
          rows={2}
          placeholder="Ask about a plan"
          aria-label="Message Nurture"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-white/40 bg-white/15 px-3 py-2 text-sm text-white outline-none placeholder:text-white/70"
        />
        {busy ? (
          <button type="button" aria-label="Stop" onClick={() => stop()} className="frosted rounded-full p-3">
            <SquareIcon className="size-4" />
          </button>
        ) : (
          <button type="submit" aria-label="Send" disabled={!input.trim()} className="frosted rounded-full p-3 disabled:opacity-40">
            <SendIcon className="size-4" />
          </button>
        )}
      </form>
      <p className="px-1 pt-2 text-[11px] text-white/70">Guidance, not regulated advice. Your numbers are sent to Grok only when you chat.</p>
    </div>
  );
}

export function ChatPanel({
  prefill,
  profile,
  variant,
  className,
}: {
  prefill?: string;
  profile?: Profile | null;
  variant?: "sidebar" | "dock" | string;
  className?: string;
}) {
  if (variant === "dock" || variant === "sidebar" || profile) {
    return (
      <AssistantChatPanel
        profile={profile}
        variant={variant === "dock" ? "dock" : "sidebar"}
        className={className}
      />
    );
  }
  return <SaverChatPanel prefill={prefill} />;
}
