"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircleIcon, MicIcon, RotateCcwIcon, SendIcon, SquareIcon, Volume2Icon, VolumeXIcon } from "lucide-react";
import { BrandStar } from "@/components/shell/brand-mark";
import { useCoach } from "@/components/shell/coach-provider";
import { canListen, listenOnce, speak } from "@/lib/plan/voice";
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
    <div className="flex h-[min(38rem,48dvh)] min-h-[20rem] flex-col text-white">
      <div className="flex items-center justify-between gap-3 px-1 py-2">
        <div className="flex items-center gap-2 text-sm">
          <BrandStar className="size-4" />
          <span>Coach</span>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <>
              {speaking && (
                <button type="button" aria-label="Stop audio" onClick={stopAudio} className="frosted rounded-full p-2">
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
                className="frosted rounded-full p-2"
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
              {assistantText(message) && (
                <div>
                  <button
                    type="button"
                    onClick={() => playReply(assistantText(message))}
                    className="frosted inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
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
          <div className="flex items-center gap-2 text-xs text-white/80">
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
          className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-white/40 bg-white/15 px-3 py-2 text-sm text-white outline-none placeholder:text-white/70"
        />
        <button
          type="button"
          aria-label={listening ? "Stop listening" : "Speak your question"}
          aria-pressed={listening}
          onClick={toggleVoiceInput}
          disabled={busy}
          className={`frosted rounded-full p-3 disabled:opacity-40 ${listening ? "bg-white text-[#1a1a1a]" : ""}`}
        >
          <MicIcon className="size-4" />
        </button>
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
      <p className="flex items-center gap-1 px-1 pt-2 text-[11px] text-white/70">
        <Volume2Icon className="size-3" /> Replies are read aloud when your browser supports it. Guidance, not regulated advice.
        {state && " Your numbers are sent to Claude only when you chat."}
      </p>
      {(listening || voiceInputError) && (
        <p className="px-1 pt-1 text-[11px] text-white/80" aria-live="polite">
          {voiceInputError || "Listening…"}
        </p>
      )}
      {audioError && <p className="px-1 pt-1 text-[11px] text-white/80" role="status">{audioError}</p>}
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
