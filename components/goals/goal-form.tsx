"use client";

import { useState, type FormEvent } from "react";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { spokenDate } from "@/lib/dates";
import { gbp } from "@/lib/format";
import { GOAL_KIND_LABELS, GOAL_KINDS, GoalSchema, type Goal, type GoalKind } from "@/lib/goals/model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMPTY: Omit<Goal, "id"> = {
  name: "",
  target: 1000,
  targetDate: "",
  saved: 0,
  kind: "savings",
};

const fieldClass = "min-h-11 rounded-xl bg-white/70";

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `goal-${Date.now()}`;
}

export function GoalForm({ goals, onChange }: { goals: Goal[]; onChange: (goals: Goal[]) => void }) {
  const [draft, setDraft] = useState<Omit<Goal, "id">>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setDraft(EMPTY);
    setEditingId(null);
    setError(null);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const candidate: Goal = { ...draft, id: editingId ?? newId(), targetDate: draft.targetDate || defaultDate() };
    const parsed = GoalSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the goal and try again.");
      return;
    }
    const next = editingId
      ? goals.map((goal) => (goal.id === editingId ? parsed.data : goal))
      : [...goals, parsed.data];
    onChange(next);
    reset();
  };

  return (
    <div className="grid gap-4 rounded-[20px] bg-nuture-cream p-6 text-nuture-ink">
      <h2 className="text-[22px] font-medium">{editingId ? "Edit this goal" : "Plan a new goal"}</h2>
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="goal-name">Goal name</Label>
          <Input
            id="goal-name"
            value={draft.name}
            placeholder="e.g. Cornwall week"
            className={fieldClass}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          />
        </div>
        <MoneyField
          id="goal-target"
          label="Target"
          value={draft.target}
          onChange={(target) => setDraft((current) => ({ ...current, target }))}
        />
        <MoneyField
          id="goal-saved"
          label="Already saved"
          value={draft.saved}
          onChange={(saved) => setDraft((current) => ({ ...current, saved }))}
        />
        <div className="grid gap-1.5">
          <Label htmlFor="goal-date" className="text-[15px] font-normal text-nuture-ink/60">
            Date
          </Label>
          <Input
            id="goal-date"
            type="date"
            value={draft.targetDate}
            className={fieldClass}
            onChange={(event) => setDraft((current) => ({ ...current, targetDate: event.target.value }))}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="goal-kind">Kind</Label>
          <select
            id="goal-kind"
            value={draft.kind}
            onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value as GoalKind }))}
            className="min-h-11 w-full rounded-xl border border-input bg-white/70 px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {GOAL_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {GOAL_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            className="min-h-11 rounded-full bg-nuture-ink px-5 text-[17px] text-white hover:bg-nuture-ink/90"
          >
            {editingId ? "Save goal" : "Plan a new goal"}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" className="min-h-11 rounded-full px-5" onClick={reset}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      {goals.length === 0 ? (
        <p className="text-[15px] text-nuture-ink/60">
          No named goals yet. Plan a holiday, a purchase or an extra buffer and it sits with the others.
        </p>
      ) : (
        <ul className="grid gap-3">
          {goals.map((goal) => (
            <li key={goal.id} className="flex items-center justify-between gap-2 rounded-[20px] bg-white/50 px-4 py-3">
              <div>
                <p className="text-[15px] font-medium">{goal.name}</p>
                <p className="text-[15px] text-nuture-ink/60">
                  {GOAL_KIND_LABELS[goal.kind]} · {gbp(goal.saved)} of {gbp(goal.target)}
                </p>
                <p className="text-[13px] text-nuture-ink/45">{spokenDate(goal.targetDate)}</p>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="min-h-11 min-w-11"
                  aria-label={`Edit ${goal.name}`}
                  onClick={() => {
                    setEditingId(goal.id);
                    setDraft({
                      name: goal.name,
                      target: goal.target,
                      targetDate: goal.targetDate,
                      saved: goal.saved,
                      kind: goal.kind,
                    });
                    setError(null);
                  }}
                >
                  <PencilIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="min-h-11 min-w-11"
                  aria-label={`Delete ${goal.name}`}
                  onClick={() => onChange(goals.filter((item) => item.id !== goal.id))}
                >
                  <Trash2Icon />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MoneyField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-nuture-ink/60">£</span>
        <Input
          id={id}
          type="number"
          min={0}
          step={50}
          value={Number.isFinite(value) ? value : 0}
          className={`${fieldClass} pl-7`}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(Number.isFinite(next) ? next : 0);
          }}
        />
      </div>
    </div>
  );
}

function defaultDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
