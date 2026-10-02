"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircleIcon, RotateCcwIcon, SendIcon, SquareIcon } from "lucide-react";
import { BrandStar } from "@/components/shell/brand-mark";
import { useCoach } from "@/components/shell/coach-provider";
import { Markdown } from "./markdown";
import { ToolPart, isToolPart } from "./tool-cards";

const SUGGESTIONS = [
  "How am I doing",
  "What if I spend £46 tonight",
  "Where is my spare money sitting",
  "Help me plan a new goal",
];

function errorMessage(error: Error): string {
  try {
    return (JSON.parse(error.message) as { error?: string }).error ?? error.message;
  } catch {
    return error.message || "Something went wrong.";
  }
}

export function ChatPanel({
  prefill,
}: {
  prefill?: string;
  profile?: unknown;
  variant?: string;
  className?: string;
}) {
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
            {SUGGESTIONS.map((suggestion) => (
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
