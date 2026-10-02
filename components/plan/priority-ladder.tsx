import { BanIcon, CircleCheckIcon, CircleDashedIcon, CircleMinusIcon, ZapIcon } from "lucide-react";
import type { LadderStep, StepStatus } from "@/lib/finance/ladder";
import { gbp } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "cn";

const STATUS: Record<StepStatus, { label: string; icon: typeof CircleCheckIcon; className: string }> = {
  done: { label: "Done", icon: CircleCheckIcon, className: "text-primary" },
  todo: { label: "To do", icon: CircleDashedIcon, className: "text-muted-foreground" },
  action: { label: "Action needed", icon: ZapIcon, className: "text-amber-600" },
  skipped: { label: "Not needed", icon: CircleMinusIcon, className: "text-muted-foreground/60" },
  blocked: { label: "On hold", icon: BanIcon, className: "text-destructive" },
};

export function PriorityLadder({ steps }: { steps: LadderStep[] }) {
  return (
    <ol className="grid gap-1">
      {steps.map((step) => {
        const s = STATUS[step.status];
        const Icon = s.icon;
        return (
          <li
            key={step.ruleId}
            className={cn(
              "grid grid-cols-[auto_1fr] gap-3 rounded-lg p-2",
              step.allocated > 0 && "bg-primary/5",
              step.status === "skipped" && "opacity-70",
            )}
          >
            <Icon className={cn("mt-0.5 size-5", s.className)} />
            <div className="grid gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">
                  {step.order}. {step.title}
                </p>
                {step.status !== "todo" && (
                  <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                    {s.label}
                  </Badge>
                )}
                {step.allocated > 0 && (
                  <Badge className="h-4 px-1.5 text-[10px]">+{gbp(step.allocated)} now</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{step.detail}</p>
              {step.progressPct !== undefined && step.status === "todo" && (
                <Progress value={step.progressPct} className="mt-1 h-1.5" />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
