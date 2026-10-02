"use client";

import type { CheckIn } from "@/lib/checkin/build";
import { gbp } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAssistant } from "@/components/chat/assistant-provider";

const STANDING: Record<CheckIn["standing"], string> = {
  comfortable: "Solid spot",
  steady: "Steady",
  stretched: "Tight month",
};

export function CheckInCard({ checkin }: { checkin: CheckIn }) {
  const { openWith } = useAssistant();
  const win = checkin.wins[0];
  const risk = checkin.risks[0];

  return (
    <Card className="ring-primary/20">
      <CardHeader>
        <CardDescription>{STANDING[checkin.standing]}</CardDescription>
        <CardTitle className="text-lg">{checkin.headline}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-sm text-muted-foreground">{checkin.summary}</p>
        {win && (
          <p className="text-sm">
            <span className="font-medium">Going well. </span>
            {win.title}. {win.detail}
          </p>
        )}
        {risk && (
          <p className="text-sm">
            <span className="font-medium">Worth a look. </span>
            {risk.title}
          </p>
        )}
        <p className="text-sm">
          Next: {checkin.nextAction.title}. Spare cash is {gbp(checkin.figures.monthlySurplus)} a month.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => openWith("How am I doing?")}>
            How am I doing?
          </Button>
          <Button type="button" variant="outline" onClick={() => openWith("What spending could I cut?")}>
            Spending idea
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
