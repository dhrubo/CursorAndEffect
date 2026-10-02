"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircleIcon, MicIcon, RotateCcwIcon, SendIcon, SquareIcon, Volume2Icon, VolumeXIcon } from "lucide-react";
import { FourPointStar } from "@/components/four-point-star";
import { BrandStar } from "@/components/shell/brand-mark";
import { useCoach } from "@/components/shell/coach-provider";
import { repayableDebts } from "@/lib/finance/debt";
import { gbp } from "@/lib/format";
import { canListen, listenOnce, speak } from "@/lib/plan/voice";
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
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceInputError, setVoiceInputError] = useState("");
  const [audioError, setAudioError] = useState("");
  const busy = status === "submitted" || status === "streaming";
  const sentPrefill = useRef(false);
  const spokenMessageId = useRef<string | null>(null);
  const audioReady = useRef(false);
  const speaker = useRef<{ cancel: () => void } | null>(null);
  const listener = useRef<{ stop: () => void } | null>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const followTranscript = useRef(true);

  useEffect(() => {
    if (!followTranscript.current) return;
    const pane = transcript.current;
    if (pane) pane.scrollTop = pane.scrollHeight;
  }, [messages, status]);

  const playReply = useCallback((text: string) => {
    speaker.current?.cancel();
    setAudioError("");
    const useBrowserFallback = (reason?: string) => {
      const fallback = speak(text, {
        onEnd: () => {
          speaker.current = null;
          setSpeaking(false);
        },
      });
      speaker.current = fallback;
      setSpeaking(fallback !== null);
      setAudioError(
        reason
          ? `ElevenLabs is unavailable (${reason}). Using your browser voice instead.`
          : "ElevenLabs did not start, so the browser voice is being used instead.",
      );
      if (!fallback) setAudioError("Sound could not start. Check your browser's sound permissions.");
    };
    void playNaturalVoice(text, () => {
      speaker.current = null;
      setSpeaking(false);
    })
      .then((active) => {
        if (active) {
          speaker.current = active;
          setSpeaking(true);
          return;
        }
        useBrowserFallback();
      })
      .catch((error: unknown) => useBrowserFallback(error instanceof Error ? error.message : "request failed"));
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    const latest = [...messages].reverse().find((message) => message.role === "assistant");
    if (!audioReady.current) {
      audioReady.current = true;
      spokenMessageId.current = latest?.id ?? null;
      return;
    }
    if (!latest || latest.id === spokenMessageId.current) return;
    const text = latest.parts
      .filter((part) => part.type === "text")
      .map((part) => (part.type === "text" ? part.text : ""))
      .join(" ")
      .trim();
    if (!text) return;

    spokenMessageId.current = latest.id;
    playReply(text);
  }, [messages, playReply, status]);

  useEffect(
    () => () => {
      speaker.current?.cancel();
      listener.current?.stop();
    },
    [],
  );

  useEffect(() => {
    if (!prefill || sentPrefill.current) return;
    sentPrefill.current = true;
    send(prefill);
  }, [prefill, send]);

  const submit = (text: string) => {
    followTranscript.current = true;
    send(text);
    setInput("");
  };

  const toggleVoiceInput = () => {
    if (listening) {
      listener.current?.stop();
      listener.current = null;
      setListening(false);
      return;
    }
    if (!canListen()) {
      setVoiceInputError("Voice input is not available in this browser. You can still type your question.");
      return;
    }
    setVoiceInputError("");
    setListening(true);
    listener.current = listenOnce({
      onPartial: setInput,
      onFinal: (heard) => {
        listener.current = null;
        setListening(false);
        submit(heard);
      },
      onEnd: () => {
        listener.current = null;
        setListening(false);
      },
      onError: () => {
        listener.current = null;
        setListening(false);
        setVoiceInputError("I couldn't hear that. Try again, or type your question.");
      },
    });
    if (!listener.current) {
      setListening(false);
      setVoiceInputError("Voice input is not available in this browser. You can still type your question.");
    }
  };

  const stopAudio = () => {
    speaker.current?.cancel();
    speaker.current = null;
    setSpeaking(false);
  };

  return (
    <div className="flex h-[min(38rem,48dvh)] min-h-[20rem] flex-col text-[#1a1a1a]">
      <div className="flex items-center justify-between gap-3 px-1 py-2">
        <div className="flex items-center gap-2 text-sm">
          <BrandStar className="size-4" />
          <span>Coach</span>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <>
              {speaking && (
                <button type="button" aria-label="Stop audio" onClick={stopAudio} className="rounded-full border border-[#1a1a1a] p-2">
                  <VolumeXIcon className="size-4" />
                </button>
              )}
              <button
                type="button"
                aria-label="Clear conversation"
                onClick={() => {
                  stopAudio();
                  clear();
                }}
                className="rounded-full border border-[#1a1a1a] p-2"
              >
                <RotateCcwIcon className="size-4" />
              </button>
            </>
          )}
        </div>
      </div>
      <div
        ref={transcript}
        onScroll={(event) => {
          const pane = event.currentTarget;
          followTranscript.current = pane.scrollHeight - pane.scrollTop - pane.clientHeight < 48;
        }}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4 pr-1"
      >
        {messages.length === 0 && (
          <div className="grid gap-2">
            {SAVER_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => submit(suggestion)}
                className="rounded-full border border-[#1a1a1a] px-4 py-2 text-left text-[15px]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl bg-[#1a1a1a] px-3 py-2 text-sm text-white">
                {message.parts.map((part, index) => (part.type === "text" ? <span key={index}>{part.text}</span> : null))}
              </div>
            </div>
          ) : (
            <div key={message.id} className="grid gap-2 text-sm">
              {assistantText(message) && (
                <div>
                  <button
                    type="button"
                    onClick={() => playReply(assistantText(message))}
                    className="inline-flex items-center gap-1 rounded-full border border-[#1a1a1a]/30 px-2.5 py-1 text-xs"
                  >
                    <Volume2Icon className="size-3.5" /> Play reply
                  </button>
                </div>
              )}
              {message.parts.map((part, index) => {
                if (part.type === "text") return part.text ? <Markdown key={index}>{part.text}</Markdown> : null;
                if (isToolPart(part)) return <ToolPart key={index} part={part} />;
                return null;
              })}
            </div>
          ),
        )}
        {status === "submitted" && (
          <div className="flex items-center gap-2 text-xs text-[#1a1a1a]/70">
            <LoaderCircleIcon className="size-3.5 animate-spin" /> Thinking
          </div>
        )}
        {error && (
          <div role="alert" className="rounded-2xl bg-white/15 px-3 py-2 text-sm">
            {errorMessage(error)}
          </div>
        )}
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
          className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-[#1a1a1a]/30 bg-white px-3 py-2 text-sm text-[#1a1a1a] outline-none placeholder:text-[#1a1a1a]/50"
        />
        <button
          type="button"
          aria-label={listening ? "Stop listening" : "Speak your question"}
          aria-pressed={listening}
          onClick={toggleVoiceInput}
          disabled={busy}
          className={`rounded-full border border-[#1a1a1a] p-3 disabled:opacity-40 ${listening ? "bg-[#1a1a1a] text-white" : ""}`}
        >
          <MicIcon className="size-4" />
        </button>
        {busy ? (
          <button type="button" aria-label="Stop" onClick={() => stop()} className="rounded-full bg-[#1a1a1a] p-3 text-white">
            <SquareIcon className="size-4" />
          </button>
        ) : (
          <button type="submit" aria-label="Send" disabled={!input.trim()} className="rounded-full bg-[#1a1a1a] p-3 text-white disabled:opacity-40">
            <SendIcon className="size-4" />
          </button>
        )}
      </form>
      <p className="flex items-center gap-1 px-1 pt-2 text-[11px] text-[#1a1a1a]/60">
        <Volume2Icon className="size-3" /> Replies are read aloud when your browser supports it. Guidance, not regulated advice.
        {state && " Your numbers are sent to Claude only when you chat."}
      </p>
      {(listening || voiceInputError) && (
        <p className="px-1 pt-1 text-[11px] text-[#1a1a1a]/70" aria-live="polite">
          {voiceInputError || "Listening…"}
        </p>
      )}
      {audioError && <p className="px-1 pt-1 text-[11px] text-[#1a1a1a]/70" role="status">{audioError}</p>}
    </div>
  );
}

function assistantText(message: { parts: { type: string; text?: string }[] }): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join(" ")
    .trim();
}

async function playNaturalVoice(text: string, onEnd: () => void): Promise<{ cancel: () => void } | null> {
  const response = await fetch("/api/voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
    throw new Error(typeof body?.error === "string" ? body.error : `request failed (${response.status})`);
  }

  const url = URL.createObjectURL(await response.blob());
  const audio = new Audio(url);
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    URL.revokeObjectURL(url);
    onEnd();
  };
  audio.onended = finish;
  audio.onerror = finish;
  try {
    await audio.play();
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
  return {
    cancel: () => {
      if (ended) return;
      ended = true;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      URL.revokeObjectURL(url);
    },
  };
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
