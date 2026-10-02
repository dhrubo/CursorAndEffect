"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/shell/wordmark";
import { GOAL_TEMPLATES } from "@/data/goal-templates";
import { SOCIAL_WEIGHTS, seededTransactions } from "@/data/mock-transactions";
import { DEMO_TODAY } from "@/data/saver-personas";
import { categoryLabel, categoryTotals, classifyTypology } from "@/lib/coach/typology";
import { gbp } from "@/lib/format";
import { addDays } from "@/lib/saver/dates";
import { EMPTY_PROFILE } from "@/lib/profile";
import type { Goal, SaverState } from "@/lib/saver/schema";
import { useSaver } from "@/lib/saver/use-saver-state";

const STEPS = ["You", "Plans", "Money", "Spending", "Signals", "Save"];

export function GoalWizard() {
  const router = useRouter();
  const { save } = useSaver();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [age, setAge] = useState(24);
  const [lifeStage, setLifeStage] = useState<SaverState["preferences"]["lifeStage"]>("early_career");
  const [paydayDay, setPaydayDay] = useState(25);
  const [picked, setPicked] = useState<string[]>(["trip", "emergency"]);
  const [bank, setBank] = useState(false);
  const [email, setEmail] = useState(false);
  const [social, setSocial] = useState(false);
  const [primary, setPrimary] = useState("trip");
  const [weekly, setWeekly] = useState(45);

  const previewTxns = useMemo(
    () =>
      seededTransactions({
        accountId: "current",
        seed: age,
        today: DEMO_TODAY,
        salary: 2100,
        paydayDay,
        weights: SOCIAL_WEIGHTS,
        days: 60,
      }),
    [age, paydayDay],
  );
  const typology = classifyTypology(previewTxns);

  const toggle = (id: string) => {
    setPicked((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 3) return current;
      return [...current, id];
    });
  };

  const finish = () => {
    const chosen = GOAL_TEMPLATES.filter((template) => picked.includes(template.id)).slice(0, 3);
    const primaryId = chosen.some((template) => template.id === primary) ? primary : chosen[0]?.id;
    const accounts: SaverState["accounts"] = [
      { id: "current", provider: "Hearth", name: "Current account", balance: bank ? 820 : 200, kind: "current", connected: bank },
    ];
    const goals: Goal[] = chosen.map((template) => {
      const potId = `pot-${template.id}`;
      const saved = template.id === "trip" ? 200 : 0;
      accounts.push({
        id: potId,
        provider: "Northwind",
        name: template.name,
        balance: saved,
        aer: 4.1,
        kind: template.category === "home" ? "lisa" : "easy_access",
        connected: bank,
      });
      const months = template.monthsAway;
      return {
        id: template.id,
        name: template.name,
        category: template.category,
        horizon: template.horizon,
        targetAmount: template.targetAmount,
        targetDate: addDays(DEMO_TODAY, months * 30),
        savedSoFar: saved,
        potAccountId: potId,
        isPrimary: template.id === primaryId,
        whyItMatters: template.whyItMatters,
        autoSave: {
          amount: template.id === primaryId ? weekly : Math.max(10, Math.round(weekly / 2)),
          cadence: "weekly",
          enabled: true,
        },
        roundUps: false,
        checkpointsCelebrated: [],
      };
    });
    const state: SaverState = {
      version: 2,
      today: DEMO_TODAY,
      profile: {
        ...EMPTY_PROFILE,
        name: name || "You",
        age,
        firstTimeBuyer: goals.some((goal) => goal.category === "home"),
        buyingHome: goals.some((goal) => goal.category === "home"),
        targetHomePrice: goals.some((goal) => goal.category === "home") ? 250000 : 0,
      },
      goals,
      accounts,
      transactions: bank ? previewTxns : [],
      preferences: {
        interests: social ? ["travel", "friends"] : [],
        lifeStage,
        paydayDay,
        alertThresholdDays: 3,
        connections: { bank, email, social },
        autosaveMissed: false,
        signals: email ? ["A flight price is sitting in your inbox."] : [],
      },
      coachEvents: [],
    };
    save(state);
    router.push("/home");
  };

  return (
    <main className="mx-auto grid max-w-xl gap-6 px-4 py-10">
      <Wordmark variant="gradient" />
      <p className="text-[13px] text-[#1a1a1a]/60">
        {step + 1} of {STEPS.length} · {STEPS[step]}
      </p>
      {step === 0 && (
        <section className="grid gap-4">
          <h1 className="font-display text-[32px] font-normal">About you</h1>
          <label className="grid gap-1 text-sm">Name
            <input className="rounded-2xl bg-[#ede8e0] px-4 py-3" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">Age
            <input className="rounded-2xl bg-[#ede8e0] px-4 py-3" type="number" value={age} onChange={(event) => setAge(Number(event.target.value))} />
          </label>
          <div className="flex flex-wrap gap-2">
            {(["studying", "early_career", "settling", "family"] as const).map((stage) => (
              <button key={stage} type="button" onClick={() => setLifeStage(stage)} className={`rounded-full px-3 py-2 text-sm ${lifeStage === stage ? "bg-[#1a1a1a] text-white" : "bg-[#ede8e0]"}`}>
                {stage.replace("_", " ")}
              </button>
            ))}
          </div>
          <label className="grid gap-1 text-sm">Payday (day of the month)
            <input className="rounded-2xl bg-[#ede8e0] px-4 py-3" type="number" min={1} max={28} value={paydayDay} onChange={(event) => setPaydayDay(Number(event.target.value))} />
          </label>
        </section>
      )}
      {step === 1 && (
        <section className="grid gap-4">
          <h1 className="font-display text-[32px] font-normal">Your next few years</h1>
          <p className="text-[15px] text-[#1a1a1a]/60">Pick up to three. One of them can be close.</p>
          {(["soon", "life"] as const).map((group) => (
            <div key={group} className="grid gap-2">
              <p className="text-sm">{group === "soon" ? "Soon" : "Further out"}</p>
              {GOAL_TEMPLATES.filter((template) => template.group === group).map((template) => (
                <button key={template.id} type="button" onClick={() => toggle(template.id)} className={`rounded-[20px] p-4 text-left ${picked.includes(template.id) ? "goal-card-active" : "bg-[#ede8e0]"}`}>
                  <p className="text-[22px] font-medium">{template.name}</p>
                  <p className={`text-[15px] ${picked.includes(template.id) ? "text-white/80" : "text-[#1a1a1a]/60"}`}>{gbp(template.targetAmount)} · {template.whyItMatters}</p>
                </button>
              ))}
            </div>
          ))}
        </section>
      )}
      {step === 2 && (
        <section className="grid gap-4">
          <h1 className="font-display text-[32px] font-normal">Bring your money together</h1>
          <p className="text-[15px] text-[#1a1a1a]/60">This is a simulated connection. Nothing leaves this browser.</p>
          <button type="button" onClick={() => setBank(true)} className="rounded-[20px] bg-[#ede8e0] p-6 text-left">
            <p className="text-[22px] font-medium">{bank ? "Hearth connected" : "Connect Hearth"}</p>
            <p className="text-[15px] text-[#1a1a1a]/60">{bank ? "Current account, savings and a Lifetime ISA." : "A fictional bank, for the demo."}</p>
          </button>
        </section>
      )}
      {step === 3 && (
        <section className="grid gap-3">
          <h1 className="font-display text-[32px] font-normal">Your spending</h1>
          <p className="text-[17px]">You&apos;re a {typology.name}. {typology.line}</p>
          {categoryTotals(previewTxns).slice(0, 4).map((row) => (
            <p key={row.category} className="text-[15px] text-[#1a1a1a]/70">{categoryLabel(row.category)} · about {gbp(row.amount)}</p>
          ))}
        </section>
      )}
      {step === 4 && (
        <section className="grid gap-3">
          <h1 className="font-display text-[32px] font-normal">Lifestyle signals</h1>
          <p className="text-[15px] text-[#1a1a1a]/60">Optional, and simulated. You can skip this.</p>
          <button type="button" onClick={() => setEmail((value) => !value)} className="rounded-[20px] bg-[#ede8e0] p-4 text-left">
            {email ? "Inbox connected. A flight price is waiting." : "Connect inbox"}
          </button>
          <button type="button" onClick={() => setSocial((value) => !value)} className="rounded-[20px] bg-[#ede8e0] p-4 text-left">
            {social ? "Interests noted: travel and friends." : "Connect social"}
          </button>
        </section>
      )}
      {step === 5 && (
        <section className="grid gap-4">
          <h1 className="font-display text-[32px] font-normal">Your plan</h1>
          <p className="text-[15px] text-[#1a1a1a]/60">The Friday save is on unless you turn it off later.</p>
          {GOAL_TEMPLATES.filter((template) => picked.includes(template.id)).map((template) => (
            <button key={template.id} type="button" onClick={() => setPrimary(template.id)} className={`rounded-[20px] p-4 text-left ${primary === template.id ? "goal-card-active" : "bg-[#ede8e0]"}`}>
              {template.name} {primary === template.id ? "· the one on your home screen" : ""}
            </button>
          ))}
          <label className="grid gap-1 text-sm">Weekly save
            <input className="rounded-2xl bg-[#ede8e0] px-4 py-3" type="number" min={5} value={weekly} onChange={(event) => setWeekly(Number(event.target.value))} />
          </label>
          <p className="text-sm">{gbp(weekly)} this Friday gets you to the first step.</p>
        </section>
      )}
      <div className="flex gap-2">
        {step > 0 && (
          <button type="button" className="rounded-full bg-[#ede8e0] px-4 py-3" onClick={() => setStep((value) => value - 1)}>Back</button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" className="rounded-full bg-[#5cd719] px-4 py-3 text-white" onClick={() => setStep((value) => value + 1)} disabled={step === 1 && picked.length === 0}>
            Continue
          </button>
        ) : (
          <button type="button" className="rounded-full bg-[#5cd719] px-4 py-3 text-white" onClick={finish} disabled={picked.length === 0}>
            See it come together
          </button>
        )}
      </div>
    </main>
  );
}
