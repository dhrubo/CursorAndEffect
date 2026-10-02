"use client";

import { useId, useState, type ReactNode } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DEBT_TYPES,
  DEBT_TYPE_LABELS,
  ProfileSchema,
  type Debt,
  type DebtType,
  type Mortgage,
  type Profile,
} from "@/lib/profile";

const DEFAULT_MORTGAGE: Mortgage = {
  balance: 200000,
  ratePct: 4.5,
  remainingYears: 25,
  propertyValue: 300000,
  fixEndsInMonths: 24,
  overpaymentAllowancePct: 10,
  overpaidThisYear: 0,
};

export function ProfileForm({
  initial,
  onSubmit,
  submitLabel = "See my plan",
}: {
  initial: Profile;
  onSubmit: (profile: Profile) => void;
  submitLabel?: string;
}) {
  const [p, setP] = useState<Profile>(initial);
  const [errors, setErrors] = useState<string[]>([]);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setP((prev) => ({ ...prev, [key]: value }));
  const setMortgage = <K extends keyof Mortgage>(key: K, value: Mortgage[K]) =>
    setP((prev) => (prev.mortgage ? { ...prev, mortgage: { ...prev.mortgage, [key]: value } } : prev));
  const setDebt = (id: string, patch: Partial<Debt>) =>
    setP((prev) => ({
      ...prev,
      debts: prev.debts.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = ProfileSchema.safeParse(p);
    if (!result.success) {
      setErrors(result.error.issues.map((i) => `${i.path.join(" > ") || "Profile"}: ${i.message}`));
      return;
    }
    setErrors([]);
    onSubmit(result.data);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="About you" description="Used for tax bands and Lifetime ISA eligibility.">
          <TextField label="First name (optional)" value={p.name} onChange={(v) => set("name", v)} />
          <NumberField label="Age" prefix="" value={p.age} onChange={(v) => set("age", v)} />
          <NumberField
            label="Gross annual income"
            hint="Before tax, including bonuses."
            value={p.grossAnnualIncome}
            onChange={(v) => set("grossAnnualIncome", v)}
          />
          <NumberField
            label="Monthly take-home pay"
            value={p.netMonthlyIncome}
            onChange={(v) => set("netMonthlyIncome", v)}
          />
        </Section>

        <Section title="Monthly spending" description="What has to go out every month.">
          <NumberField
            label="Essential spending"
            hint="Rent or mortgage, bills, food, travel. Leave out debt repayments; add those below."
            value={p.essentialMonthlySpend}
            onChange={(v) => set("essentialMonthlySpend", v)}
          />
          <ToggleField
            label="I've missed a bill or repayment recently"
            checked={p.missedPayments}
            onChange={(v) => set("missedPayments", v)}
          />
          <NumberField
            label="Current account monthly fee"
            value={p.currentAccountMonthlyFee}
            onChange={(v) => set("currentAccountMonthlyFee", v)}
          />
          <NumberField
            label="Amount to plan for"
            hint="The 'next £X' you want to decide about, e.g. a bonus or this month's spare cash."
            value={p.nextAmount}
            onChange={(v) => set("nextAmount", v)}
          />
        </Section>

        <Section title="Savings" description="Cash you can get at quickly.">
          <NumberField
            label="Easy-access cash savings"
            hint="Outside ISAs."
            value={p.cashSavings}
            onChange={(v) => set("cashSavings", v)}
          />
          <NumberField
            label="Spare cash sitting in your current account"
            value={p.idleCurrentAccountCash}
            onChange={(v) => set("idleCurrentAccountCash", v)}
          />
          <NumberField
            label="Paid into ISAs this tax year"
            hint="Cash or Stocks & Shares, excluding Lifetime ISA."
            value={p.isaContributedThisYear}
            onChange={(v) => set("isaContributedThisYear", v)}
          />
          <NumberField
            label="Paid into a Lifetime ISA this tax year"
            value={p.lisaContributedThisYear}
            onChange={(v) => set("lisaContributedThisYear", v)}
          />
          <NumberField
            label="Emergency fund target (months)"
            hint="3 is typical; 6 if self-employed or the only earner."
            prefix=""
            value={p.emergencyFundMonths}
            onChange={(v) => set("emergencyFundMonths", v)}
          />
        </Section>

        <Section title="Pension and home" description="Free money and big goals.">
          <ToggleField
            label="My employer matches pension contributions"
            checked={p.employerMatchAvailable}
            onChange={(v) => set("employerMatchAvailable", v)}
          />
          {p.employerMatchAvailable && (
            <ToggleField
              label="I already pay enough to get the full match"
              checked={p.gettingFullEmployerMatch}
              onChange={(v) => set("gettingFullEmployerMatch", v)}
            />
          )}
          <ToggleField
            label="I'm a first-time buyer"
            checked={p.firstTimeBuyer}
            onChange={(v) => set("firstTimeBuyer", v)}
          />
          <ToggleField
            label="I'm saving to buy a home"
            checked={p.buyingHome}
            onChange={(v) => set("buyingHome", v)}
          />
          {p.buyingHome && (
            <NumberField
              label="Target home price"
              value={p.targetHomePrice}
              onChange={(v) => set("targetHomePrice", v)}
            />
          )}
        </Section>
      </div>

      <Section
        title="Mortgage"
        description="Used for overpay-vs-save and remortgage comparisons."
        action={
          <Switch
            aria-label="I have a mortgage"
            checked={!!p.mortgage}
            onCheckedChange={(v) => set("mortgage", v ? DEFAULT_MORTGAGE : undefined)}
          />
        }
      >
        {p.mortgage ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField label="Balance outstanding" value={p.mortgage.balance} onChange={(v) => setMortgage("balance", v)} />
            <NumberField label="Property value" value={p.mortgage.propertyValue} onChange={(v) => setMortgage("propertyValue", v)} />
            <NumberField label="Current rate" prefix="" suffix="%" step="0.01" value={p.mortgage.ratePct} onChange={(v) => setMortgage("ratePct", v)} />
            <NumberField label="Years remaining" prefix="" value={p.mortgage.remainingYears} onChange={(v) => setMortgage("remainingYears", v)} />
            <NumberField
              label="Months until deal ends"
              hint="0 if already on the standard variable rate."
              prefix=""
              value={p.mortgage.fixEndsInMonths}
              onChange={(v) => setMortgage("fixEndsInMonths", v)}
            />
            <NumberField
              label="Yearly overpayment allowance"
              prefix=""
              suffix="%"
              value={p.mortgage.overpaymentAllowancePct}
              onChange={(v) => setMortgage("overpaymentAllowancePct", v)}
            />
            <NumberField label="Overpaid this year" value={p.mortgage.overpaidThisYear} onChange={(v) => setMortgage("overpaidThisYear", v)} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Turn on if you have a mortgage.</p>
        )}
      </Section>

      <Section
        title="Debts"
        description="Credit cards, overdrafts, loans, car finance, buy now pay later and student loans."
        action={
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              set("debts", [
                ...p.debts,
                {
                  id: `debt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
                  name: `Debt ${p.debts.length + 1}`,
                  type: "credit_card",
                  balance: 1000,
                  apr: 24.9,
                  minPayment: 30,
                },
              ])
            }
          >
            <PlusIcon /> Add debt
          </Button>
        }
      >
        {p.debts.length === 0 && <p className="text-sm text-muted-foreground">No debts added.</p>}
        <div className="grid gap-3">
          {p.debts.map((d) => (
            <div key={d.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_0.8fr_1fr_0.9fr_0.9fr_auto] lg:items-end">
              <TextField label="Name" value={d.name} onChange={(v) => setDebt(d.id, { name: v })} />
              <SelectField
                label="Type"
                value={d.type}
                options={DEBT_TYPES.map((t) => ({ value: t, label: DEBT_TYPE_LABELS[t] }))}
                onChange={(v) => setDebt(d.id, { type: v as DebtType })}
              />
              <NumberField label="Balance" value={d.balance} onChange={(v) => setDebt(d.id, { balance: v })} />
              <NumberField label="APR" prefix="" suffix="%" step="0.1" value={d.apr} onChange={(v) => setDebt(d.id, { apr: v })} />
              <NumberField label="Min. payment" value={d.minPayment} onChange={(v) => setDebt(d.id, { minPayment: v })} />
              <NumberField
                label="0% months left"
                prefix=""
                value={d.promoMonthsLeft ?? 0}
                onChange={(v) =>
                  setDebt(d.id, v > 0 ? { promoMonthsLeft: v, revertApr: d.revertApr ?? 24.9 } : { promoMonthsLeft: undefined, revertApr: undefined })
                }
              />
              {d.promoMonthsLeft ? (
                <NumberField
                  label="APR after promo"
                  prefix=""
                  suffix="%"
                  step="0.1"
                  value={d.revertApr ?? 0}
                  onChange={(v) => setDebt(d.id, { revertApr: v })}
                />
              ) : (
                <div className="hidden lg:block" />
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${d.name}`}
                onClick={() => set("debts", p.debts.filter((x) => x.id !== d.id))}
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
        </div>
      </Section>

      {errors.length > 0 && (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          <p className="font-medium">Please check these fields:</p>
          <ul className="mt-1 list-disc pl-5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="lg" className="px-6">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="grid gap-1">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="grid gap-3">{children}</CardContent>
    </Card>
  );
}

function NumberField({
  label,
  hint,
  value,
  onChange,
  prefix = "£",
  suffix,
  step = "1",
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: string;
}) {
  const id = useId();
  const [text, setText] = useState(String(value));
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={text}
          className={`${prefix ? "pl-6" : ""} ${suffix ? "pr-7" : ""}`}
          onChange={(e) => {
            setText(e.target.value);
            const n = Number(e.target.value);
            onChange(Number.isFinite(n) ? n : 0);
          }}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2">
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
