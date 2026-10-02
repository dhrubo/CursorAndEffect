"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PlanDashboard } from "@/components/home/plan-dashboard";
import { useSaver } from "@/lib/saver/use-saver-state";

export default function HomePage() {
  const { state, loaded } = useSaver();
  const router = useRouter();

  useEffect(() => {
    if (loaded && !state) router.replace("/");
  }, [loaded, state, router]);

  if (!loaded || !state) return <div className="h-screen" />;

  return (
    <PlanDashboard state={state} />
  );
}
