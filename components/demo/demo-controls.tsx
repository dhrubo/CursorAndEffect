"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { applyDemoAction, type DemoAction } from "@/lib/saver/actions";
import { useSaver } from "@/lib/saver/use-saver-state";

const ACTIONS: { id: DemoAction; label: string; href?: string }[] = [
  { id: "night-out", label: "Big night out £46" },
  { id: "coffee", label: "Coffee £3.40" },
  { id: "payday", label: "Payday" },
  { id: "skip-save", label: "Skip a save" },
  { id: "forward-week", label: "Forward a week" },
  { id: "jump-75", label: "Jump to 75%", href: "/goals/bali/wrapped" },
  { id: "idle-cash", label: "Idle £600 lands" },
];

export function DemoControls() {
  const { state, save } = useSaver();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  if (!state) return null;

  return (
    <div className="fixed bottom-24 right-3 z-40">
      {open && (
        <div className="mb-2 grid w-56 gap-1 rounded-2xl bg-white p-2 text-[#1a1a1a] shadow-lg">
          <p className="px-2 py-1 text-[13px] text-[#1a1a1a]/60">Moments</p>
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              className="rounded-full px-3 py-2 text-left text-sm hover:bg-[#ede8e0]"
              onClick={() => {
                const next = applyDemoAction(state, action.id);
                save(next);
                const goalId = next.goals.find((goal) => goal.isPrimary)?.id;
                if (action.id === "jump-75" && goalId) router.push(`/goals/${goalId}/wrapped`);
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-full bg-white px-4 py-2 text-[13px] text-[#1a1a1a] shadow"
      >
        Moments
      </button>
    </div>
  );
}
