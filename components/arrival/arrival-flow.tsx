"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MicIcon, SendIcon } from "lucide-react";
import { BrandStar } from "@/components/shell/brand-mark";
import { Wordmark } from "@/components/shell/wordmark";
import { gbp, pct } from "@/lib/format";
import { buildPlanState, sourceFindings, type Connections } from "@/lib/plan/build-state";
import { coachFollowUp, extractGoals } from "@/lib/plan/extract-goals";
import { parseSaverState } from "@/lib/saver/schema";
import { useSaver } from "@/lib/saver/use-saver-state";

type Step = "loading" | "intro" | "talk" | "confirm" | "connect" | "review";
type Line = { role: "coach" | "user"; text: string };

const OPENING =
  "What are you hoping the next few years look like? A home, a wedding, time away, paying something down — start wherever feels true.";

const SOURCES: { id: keyof Connections; title: string; items: string[] }[] = [
  { id: "banking", title: "Banking", items: ["Current account", "Savings account", "Credit card"] },
  { id: "investments", title: "Investments", items: ["ISA", "Investment account", "Pension"] },
  { id: "other", title: "Other sources", items: ["Email", "Calendar"] },
];

const EMPTY_CONNECTIONS: Connections = { banking: false, investments: false, other: false };

export function ArrivalFlow() {
  const router = useRouter();
  const { save } = useSaver();
  const [step, setStep] = useState<Step>("loading");
  const [lines, setLines] = useState<Line[]>([{ role: "coach", text: OPENING }]);
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState("");
  const [connections, setConnections] = useState<Connections>(EMPTY_CONNECTIONS);
  const [pending, setPending] = useState<keyof Connections | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const recognition = useRef<SpeechRecognitionLike | null>(null);

  const transcript = lines
    .filter((line) => line.role === "user")
    .map((line) => line.text)
    .join("\n");
  const extraction = extractGoals(transcript);
  const heardUser = lines.some((line) => line.role === "user");

  useEffect(() => {
    if (step !== "loading") return;
    const timer = window.setTimeout(() => setStep("intro"), 2600);
    return () => window.clearTimeout(timer);
  }, [step]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const nextTranscript = transcript ? `${transcript}\n${trimmed}` : trimmed;
    setLines((current) => [
      ...current,
      { role: "user", text: trimmed },
      { role: "coach", text: coachFollowUp(nextTranscript) },
    ]);
    setDraft("");
  };

  const toggleVoice = () => {
    if (listening) {
      recognition.current?.stop();
      setListening(false);
      return;
    }
    const Speech = speechRecognition();
    if (!Speech) {
      setVoiceNote("Voice isn't available in this browser. You can type instead.");
      return;
    }
    setVoiceNote("");
    const session = new Speech();
    session.lang = "en-GB";
    session.interimResults = false;
    session.onresult = (event) => {
      const heard = event.results[0]?.[0]?.transcript ?? "";
      if (heard) send(heard);
    };
    session.onend = () => setListening(false);
    recognition.current = session;
    setListening(true);
    session.start();
  };

  const connect = (id: keyof Connections) => {
    if (connections[id] || pending) return;
    setPending(id);
    window.setTimeout(() => {
      setConnections((current) => ({ ...current, [id]: true }));
      setPending(null);
    }, 700);
  };

  const generate = () => {
    setGenerating(true);
    setError("");
    window.setTimeout(() => {
      const next = parseSaverState(buildPlanState({ transcript, connections }));
      if (!next) {
        setGenerating(false);
        setError("The plan could not be saved. Try the conversation once more.");
        return;
      }
      save(next);
      router.push("/home");
    }, 700);
  };

  if (step === "loading") {
    return (
      <button
        type="button"
        className="fixed inset-0 z-40 grid place-items-center bg-[url('/brand/image-mesh-gradient.jpg')] bg-cover bg-center"
        onClick={() => setStep("intro")}
        aria-label="Loading Nurture. Continue"
      >
        <span className="grid justify-items-center gap-6">
          <BrandStar className="nurture-star size-12 text-[#1a1a1a]" />
          <span className="font-display text-[56px] leading-none text-[#1a1a1a]">Nurture</span>
        </span>
      </button>
    );
  }

  if (step === "intro") {
    return (
      <main className="mx-auto grid min-h-[78vh] max-w-xl content-center gap-8 px-6 py-16 text-center text-white">
        <Wordmark variant="white" className="mx-auto" />
        <div className="grid gap-3">
          <h1 className="font-display text-[40px] leading-[1.15] font-normal">See your plans come together</h1>
          <p className="text-[17px] text-white/80">A quiet way to look at your money and the life you want next.</p>
        </div>
        <ul className="grid gap-3 text-left text-[17px]">
          <li className="frosted rounded-2xl px-4 py-3">Understand where your money sits today.</li>
          <li className="frosted rounded-2xl px-4 py-3">Talk through the life you want, and what it costs.</li>
          <li className="frosted rounded-2xl px-4 py-3">Connect the accounts and dates that matter.</li>
          <li className="frosted rounded-2xl px-4 py-3">Leave with a plan you can actually look at.</li>
        </ul>
        <button type="button" className="frosted mx-auto rounded-full px-6 py-3 text-[17px]" onClick={() => setStep("talk")}>
          Start planning
        </button>
      </main>
    );
  }

  if (step === "talk") {
    return (
      <main className="mx-auto flex min-h-[78vh] max-w-xl flex-col gap-4 px-4 py-8 text-white">
        <Wordmark variant="white" className="h-8" />
        <h1 className="font-display text-[32px] leading-tight font-normal">Your plans</h1>
        <div className="grid flex-1 content-start gap-3">
          {lines.map((line, index) => (
            <p
              key={`${line.role}-${index}`}
              className={
                line.role === "coach"
                  ? "max-w-[90%] rounded-2xl bg-white/15 px-4 py-3 text-[16px] leading-relaxed"
                  : "ml-auto max-w-[90%] rounded-2xl bg-white px-4 py-3 text-[16px] leading-relaxed text-[#1a1a1a]"
              }
            >
              {line.text}
            </p>
          ))}
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            send(draft);
          }}
        >
          <label className="sr-only" htmlFor="goal-talk">
            Tell us about a goal
          </label>
          <input
            id="goal-talk"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type, or speak"
            className="min-w-0 flex-1 rounded-full border border-white/70 bg-white/15 px-4 py-3 text-[16px] outline-none placeholder:text-white/60"
          />
          <button
            type="button"
            className="frosted flex size-12 items-center justify-center rounded-full"
            aria-label={listening ? "Stop listening" : "Speak"}
            aria-pressed={listening}
            onClick={toggleVoice}
          >
            <MicIcon className="size-5" />
          </button>
          <button type="submit" className="frosted flex size-12 items-center justify-center rounded-full" aria-label="Send">
            <SendIcon className="size-5" />
          </button>
        </form>
        {voiceNote && <p className="text-[14px] text-white/80">{voiceNote}</p>}
        {heardUser && (
          <button type="button" className="frosted rounded-full px-5 py-3 text-[17px]" onClick={() => setStep("confirm")}>
            See what I heard
          </button>
        )}
      </main>
    );
  }

  if (step === "confirm") {
    return (
      <main className="mx-auto grid max-w-xl gap-6 px-4 py-8 text-white">
        <Wordmark variant="white" className="h-8" />
        <div className="grid gap-2">
          <h1 className="font-display text-[32px] leading-tight font-normal">Does this sound right, {extraction.name}?</h1>
          {extraction.thin && (
            <p className="text-[15px] text-white/80">
              That was a light conversation, so this uses a complete example household. Go back if you want to name your own plans.
            </p>
          )}
        </div>
        <section className="grid gap-3">
          {extraction.goals.map((goal) => (
            <article key={goal.id} className="frosted rounded-2xl px-4 py-4">
              <p className="text-[18px]">{goal.name}</p>
              <p className="text-[15px] text-white/80">
                {gbp(goal.savedSoFar)} saved of {gbp(goal.targetAmount)}
              </p>
              <p className="text-[15px] text-white/80">Target: {monthYear(goal.targetDate)}</p>
            </article>
          ))}
        </section>
        <section className="grid gap-2">
          <h2 className="text-[15px] text-white/70">Coming up</h2>
          {extraction.events.map((event) => (
            <p key={event.id} className="text-[15px]">
              {event.name} · {monthYear(event.date)} · {gbp(event.cost)}
            </p>
          ))}
        </section>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="rounded-full px-5 py-3 text-[17px] text-white/80" onClick={() => setStep("talk")}>
            Go back
          </button>
          <button type="button" className="frosted rounded-full px-5 py-3 text-[17px]" onClick={() => setStep("connect")}>
            Connect my money
          </button>
        </div>
      </main>
    );
  }

  if (step === "connect") {
    return (
      <main className="mx-auto grid max-w-xl gap-6 px-4 py-8 text-white">
        <Wordmark variant="white" className="h-8" />
        <div className="grid gap-2">
          <h1 className="font-display text-[32px] leading-tight font-normal">Connect what you already have</h1>
          <p className="text-[15px] text-white/80">These are sample connections for the demo. Nothing leaves this browser.</p>
        </div>
        {SOURCES.map((source) => (
          <section key={source.id} className="frosted grid gap-3 rounded-2xl px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[18px]">{source.title}</h2>
              {connections[source.id] ? (
                <span className="text-[14px] text-white/80">Connected</span>
              ) : (
                <button
                  type="button"
                  className="rounded-full bg-white px-4 py-2 text-[15px] text-[#1a1a1a] disabled:opacity-60"
                  disabled={pending !== null}
                  onClick={() => connect(source.id)}
                >
                  {pending === source.id ? "Discovering…" : "Connect"}
                </button>
              )}
            </div>
            <ul className="grid gap-1 text-[15px] text-white/80">
              {(connections[source.id] ? sourceFindings(transcript, source.id) : source.items).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
        <div className="flex flex-wrap gap-3">
          <button type="button" className="rounded-full px-5 py-3 text-[17px] text-white/80" onClick={() => setStep("confirm")}>
            Go back
          </button>
          <button
            type="button"
            className="frosted rounded-full px-5 py-3 text-[17px] disabled:opacity-50"
            disabled={!Object.values(connections).some(Boolean)}
            onClick={() => setStep("review")}
          >
            Review what we found
          </button>
        </div>
      </main>
    );
  }

  const preview = buildPlanState({ transcript, connections });
  return (
    <main className="mx-auto grid max-w-xl gap-6 px-4 py-8 text-white">
      <Wordmark variant="white" className="h-8" />
      <h1 className="font-display text-[32px] leading-tight font-normal">Here is the picture</h1>
      <section className="grid gap-2">
        <h2 className="text-[15px] text-white/70">Accounts</h2>
        {preview.accounts.map((account) => (
          <p key={account.id} className="flex justify-between gap-4 text-[16px]">
            <span>{account.name}</span>
            <span>{gbp(account.balance)}</span>
          </p>
        ))}
        {preview.profile.debts.map((debt) => (
          <p key={debt.id} className="flex justify-between gap-4 text-[16px]">
            <span>
              {debt.name} · {pct(debt.apr)} APR
            </span>
            <span>{gbp(debt.balance)}</span>
          </p>
        ))}
      </section>
      <section className="grid gap-1 text-[16px]">
        <p>Income {gbp(preview.profile.netMonthlyIncome)} a month</p>
        <p>Spending about {gbp(preview.profile.essentialMonthlySpend)} a month</p>
      </section>
      {preview.preferences.signals.length > 0 && (
        <section className="grid gap-1">
          <h2 className="text-[15px] text-white/70">Also noticed</h2>
          {preview.preferences.signals.map((signal) => (
            <p key={signal} className="text-[16px]">
              {signal}
            </p>
          ))}
        </section>
      )}
      {error && <p className="text-[15px]">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="button" className="rounded-full px-5 py-3 text-[17px] text-white/80" onClick={() => setStep("connect")} disabled={generating}>
          Go back
        </button>
        <button type="button" className="frosted rounded-full px-5 py-3 text-[17px] disabled:opacity-60" onClick={generate} disabled={generating}>
          {generating ? "Putting your plan together…" : "Generate plan"}
        </button>
      </div>
    </main>
  );
}

function monthYear(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

type SpeechResult = { results: Array<Array<{ transcript: string }>> };

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: SpeechResult) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function speechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const host = window as Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}
