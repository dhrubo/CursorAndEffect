import type { Goal } from "@/lib/saver/schema";

export const GOAL_ART: Record<Goal["category"], string> = {
  trip: "/goals/trip.svg",
  emergency: "/goals/emergency.svg",
  family: "/goals/family.svg",
  home: "/goals/home.svg",
  car: "/goals/car.svg",
  event: "/goals/event.svg",
  learning: "/goals/learning.svg",
  other: "/goals/other.svg",
};

export function goalImage(goal: Pick<Goal, "category" | "image">): string {
  return goal.image || GOAL_ART[goal.category];
}
