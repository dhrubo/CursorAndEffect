"use client";

import { useState, type FormEvent } from "react";
import { PencilIcon, Trash2Icon } from "lucide-react";
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
    <div className="grid gap-4">
      <form onSubmit={submit} className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="goal-name">Goal name</Label>
          <Input
            id="goal-name"
            value={draft.name}
            placeholder="e.g. Cornwall week"
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
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
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="goal-date">Target date</Label>
            <Input
              id="goal-date"
              type="date"
              value={draft.targetDate}
              onChange={(event) => setDraft((current) => ({ ...current, targetDate: event.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="goal-kind">Kind</Label>
            <select
              id="goal-kind"
              value={draft.kind}
              onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value as GoalKind }))}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {GOAL_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {GOAL_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit">{editingId ? "Save goal" : "Add goal"}</Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={reset}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      {goals.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No named goals yet. Add a holiday, a purchase or an extra buffer and it joins the milestone track.
        </p>
      ) : (
        <ul className="grid gap-2">
          {goals.map((goal) => (
            <li key={goal.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
              <div>
                <p className="text-sm font-medium">{goal.name}</p>
                <p className="text-xs text-muted-foreground">
                  {GOAL_KIND_LABELS[goal.kind]} · £{goal.saved.toLocaleString("en-GB")} of £
                  {goal.target.toLocaleString("en-GB")} · {goal.targetDate}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
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
                  size="icon-sm"
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
        <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">£</span>
        <Input
          id={id}
          type="number"
          min={0}
          step={50}
          value={Number.isFinite(value) ? value : 0}
          className="pl-6"
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
