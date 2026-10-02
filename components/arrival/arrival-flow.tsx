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

type Step = "loading" | "welcome" | "talk" | "confirm" | "connect" | "review";
type Line = { role: "coach" | "user"; text: string };

const OPENING =
  "What are you hoping the next few years look like? A home, a wedding, time away, paying something down — start wherever feels true.";

const SOURCES: { id: keyof Connections; title: string; items: string[] }[] = [
  { id: "banking", title: "Banking", items: ["Current account", "Savings account", "Credit card"] },
  { id: "investments", title: "Investments", items: ["ISA", "Investment account", "Pension"] },
  { id: "other", title: "Other sources", items: ["Email", "Calendar"] },
];

const EMPTY_CONNECTIONS: Connections = { banking: false, investments: false, other: false };

const WELCOME = [
  {
    title: "Build your goals",
    body: "Tell Nurture what you're saving for. A trip, a home, a safety net. Give it a name, a date, and a photo. That's your plan.",
    icon: "target" as const,
  },
  {
    title: "Connect your accounts",
    body: "Link your bank in seconds. Nurture reads your income and spending to work out exactly how fast you're moving toward each goal.",
    icon: "accounts" as const,
  },
  {
    title: "Stay on track",
    body: "Nurture watches your spending and tells you what it means for your goals — coaching you to get you back on track.",
    icon: "track" as const,
  },
];

export function ArrivalFlow() {
  const router = useRouter();
  const { save } = useSaver();
  const [step, setStep] = useState<Step>("loading");
  const [welcomeIndex, setWelcomeIndex] = useState(0);
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
    const timer = window.setTimeout(() => setStep("welcome"), 2600);
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
        onClick={() => setStep("welcome")}
        aria-label="Loading Nurture. Continue"
      >
        <span className="grid justify-items-center gap-6">
          <BrandStar className="nurture-star size-12 text-[#1a1a1a]" />
          <span className="font-display text-[56px] leading-none text-[#1a1a1a]">Nurture</span>
        </span>
      </button>
    );
  }

  if (step === "welcome") {
    const slide = WELCOME[welcomeIndex];
    const last = welcomeIndex === WELCOME.length - 1;
    const join = () => {
      if (last) setStep("talk");
      else setWelcomeIndex((current) => current + 1);
    };
    return (
      <main className="fixed inset-0 z-40 flex flex-col bg-[url('/brand/image-mesh-gradient.jpg')] bg-cover bg-center px-8 pb-12 pt-16 text-[#1a1a1a]">
        <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
          <WelcomeIcon name={slide.icon} />
          <div className="grid max-w-xs gap-3">
            <h1 className="font-display text-[28px] leading-tight font-normal">{slide.title}</h1>
            <p className="text-[15px] leading-relaxed">{slide.body}</p>
          </div>
        </div>
        <div className="mx-auto mb-10 flex w-36 gap-2" aria-hidden="true">
          {WELCOME.map((item, index) => (
            <span
              key={item.title}
              className={`h-[3px] flex-1 rounded-full ${index === welcomeIndex ? "bg-[#1a1a1a]" : "bg-[#1a1a1a]/30"}`}
            />
          ))}
        </div>
        <button
          type="button"
          className={`mx-auto w-full max-w-xs rounded-full px-6 py-3 text-[17px] ${
            last ? "bg-[#1a1a1a] text-white" : "border border-[#1a1a1a] bg-transparent text-[#1a1a1a]"
          }`}
          onClick={join}
        >
          Join
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
    const accounts = SOURCES.flatMap((source) =>
      (connections[source.id] ? sourceFindings(transcript, source.id) : source.items).map((name) => ({
        source: source.id,
        name,
      })),
    );
    return (
      <main className="mx-auto grid min-h-[78vh] max-w-xl content-start gap-6 px-5 py-12 text-[#1a1a1a]">
        <h1 className="text-center text-[13px] tracking-[0.22em] uppercase">Connect your accounts</h1>
        <ul className="grid gap-3">
          {accounts.map((account) => {
            const added = connections[account.source];
            return (
              <li
                key={`${account.source}-${account.name}`}
                className="flex items-center justify-between gap-4 rounded-[18px] border border-[#1a1a1a] px-4 py-3"
              >
                <p className="max-w-[9rem] text-[17px] leading-tight">{account.name}</p>
                <button
                  type="button"
                  className="rounded-full bg-[#1a1a1a] px-7 py-2 text-[16px] text-white disabled:opacity-70"
                  disabled={added || pending !== null}
                  aria-pressed={added}
                  onClick={() => connect(account.source)}
                >
                  {pending === account.source ? "Adding" : added ? "Added" : "Add"}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button type="button" className="rounded-full px-5 py-3 text-[17px]" onClick={() => setStep("confirm")}>
            Go back
          </button>
          <button
            type="button"
            className="rounded-full bg-[#1a1a1a] px-5 py-3 text-[17px] text-white disabled:opacity-40"
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

function WelcomeIcon({ name }: { name: "target" | "accounts" | "track" }) {
  if (name === "target") {
    return (
      <svg viewBox="0 0 48 48" className="size-16" aria-hidden="true">
        <circle cx="24" cy="24" r="16" fill="none" stroke="#1a1a1a" strokeWidth="2" />
        <circle cx="24" cy="24" r="8" fill="none" stroke="#1a1a1a" strokeWidth="2" />
        <circle cx="24" cy="24" r="2.5" fill="#1a1a1a" />
      </svg>
    );
  }
  if (name === "accounts") {
    return (
      <svg viewBox="0 0 48 48" className="size-16" aria-hidden="true">
        <circle cx="24" cy="12" r="3.2" fill="#1a1a1a" />
        <circle cx="14" cy="30" r="3.2" fill="#1a1a1a" />
        <circle cx="34" cy="30" r="3.2" fill="#1a1a1a" />
        <circle cx="20" cy="20" r="1.4" fill="#1a1a1a" />
        <circle cx="28" cy="20" r="1.4" fill="#1a1a1a" />
        <circle cx="24" cy="28" r="1.4" fill="#1a1a1a" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className="size-16" aria-hidden="true">
      <path
        d="M14 34c8 0 8-14 16-14"
        fill="none"
        stroke="#1a1a1a"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="14" cy="34" r="3" fill="#1a1a1a" />
      <path d="M30 16l6 4-6 4" fill="none" stroke="#1a1a1a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
