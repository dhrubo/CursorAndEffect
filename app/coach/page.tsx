"use client";

import { CoachScreen } from "@/components/coach/coach-screen";
import { useProfile } from "@/lib/use-profile";

export default function CoachPage() {
  const { profile, loaded } = useProfile();
  const savedName = loaded ? profile?.name.trim() : "";
  return <CoachScreen name={savedName || "Alex"} />;
}
