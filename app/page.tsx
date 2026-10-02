import { CreditCardIcon, HouseIcon, LandmarkIcon, PiggyBankIcon } from "lucide-react";
import { OwnNumbers, PersonaPicker } from "@/components/onboarding";

const AREAS = [
  { icon: CreditCardIcon, title: "Debt", text: "Which debt to clear first, and avalanche vs snowball." },
  { icon: PiggyBankIcon, title: "Savings and ISAs", text: "Emergency fund, Cash ISA, Lifetime ISA, tax on interest." },
  { icon: HouseIcon, title: "Mortgages", text: "Overpay or save, and what to do when your deal ends." },
  { icon: LandmarkIcon, title: "Current accounts", text: "Fees, overdraft costs and switching bonuses." },
];

export default function Home() {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-14 px-4 py-10 md:py-16">
      <section className="grid gap-6 md:max-w-3xl">
        <p className="text-sm font-medium text-primary">UK money guidance, in one plan</p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">
          What should I do with my next £?
        </h1>
        <p className="text-lg text-muted-foreground text-pretty">
          Most comparison sites look at one product at a time. NextPound looks at your whole picture,
          including debts, savings, ISAs, your pension match and your mortgage, and shows where your next pound
          does the most good. The numbers come from transparent calculators, and a Grok-powered guide explains
          the trade-offs.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {AREAS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-3 rounded-xl border bg-background p-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Try a demo</h2>
          <p className="text-muted-foreground">Load an example household to see how the plan works.</p>
        </div>
        <PersonaPicker />
      </section>

      <section id="profile" className="grid scroll-mt-20 gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Or use your own numbers</h2>
          <p className="text-muted-foreground">
            Rough figures are fine. Everything stays in this browser; nothing is sent anywhere until you chat
            with the guide.
          </p>
        </div>
        <OwnNumbers />
      </section>
    </div>
  );
}
