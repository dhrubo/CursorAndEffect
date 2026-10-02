"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrivalFlow } from "@/components/arrival/arrival-flow";
import { useSaver } from "@/lib/saver/use-saver-state";

export default function SplashPage() {
  const { state, loaded } = useSaver();
  const router = useRouter();

  useEffect(() => {
    if (loaded && state) router.replace("/home");
  }, [loaded, state, router]);

  if (!loaded || state) return <div className="h-screen" />;
  return <ArrivalFlow />;
}
