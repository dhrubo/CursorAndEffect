"use client";

import { useState } from "react";
import { gbp } from "@/lib/format";
import type { Goal } from "@/lib/saver/schema";
import { divertImpact } from "@/lib/timeline/eta";
import { moveToGoal } from "@/lib/saver/actions";
import { useSaver } from "@/lib/saver/use-saver-state";

const CHIPS = [
  { label: "Coffee £3.40", amount: 3.4 },
  { label: "Takeaway £18", amount: 18 },
  { label: "Night out £46", amount: 46 },
];

export function DivertSimulator({ goal, today }: { goal: Goal; today: string }) {
  const { state, save } = useSaver();
  const [amount, setAmount] = useState(46);
  const impact = divertImpact(goal, amount, { today });

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => setAmount(chip.amount)}
            className={`rounded-full px-3 py-2 text-sm ${amount === chip.amount ? "bg-[#1a1a1a] text-white" : "bg-[#ede8e0]"}`}
          >
            {chip.label}
          </button>
        ))}
      </div>
      <p className="text-[22px] font-medium">
        {impact.deltaDays === 0 ? "That spend stays off the plan." : `+${impact.deltaDays} days`}
      </p>
      <button
        type="button"
        className="w-fit rounded-full bg-[#5cd719] px-4 py-2 text-[17px] text-white"
        onClick={() => state && save(moveToGoal(state, goal, 20))}
      >
        Put {gbp(20)} toward {goal.name}
      </button>
    </div>
  );
}
