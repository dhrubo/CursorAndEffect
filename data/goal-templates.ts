import type { Goal } from "@/lib/saver/schema";

export type GoalTemplate = {
  id: string;
  name: string;
  category: Goal["category"];
  horizon: Goal["horizon"];
  targetAmount: number;
  monthsAway: number;
  whyItMatters: string;
  group: "soon" | "life";
};

export const GOAL_TEMPLATES: GoalTemplate[] = [
  { id: "trip", name: "A trip", category: "trip", horizon: "short", targetAmount: 1800, monthsAway: 4, whyItMatters: "Somewhere warm, with people I like.", group: "soon" },
  { id: "event", name: "A gig or festival", category: "event", horizon: "short", targetAmount: 250, monthsAway: 2, whyItMatters: "A night I will actually remember.", group: "soon" },
  { id: "learning", name: "A course", category: "learning", horizon: "short", targetAmount: 600, monthsAway: 8, whyItMatters: "A skill that makes the next job easier.", group: "soon" },
  { id: "emergency", name: "Emergency fund", category: "emergency", horizon: "medium", targetAmount: 1000, monthsAway: 8, whyItMatters: "A month of rent if work goes quiet.", group: "life" },
  { id: "family", name: "Starting a family", category: "family", horizon: "medium", targetAmount: 6000, monthsAway: 24, whyItMatters: "Time off that does not turn into debt.", group: "life" },
  { id: "car", name: "A car", category: "car", horizon: "medium", targetAmount: 4000, monthsAway: 18, whyItMatters: "Getting around without a monthly shock.", group: "life" },
  { id: "home", name: "A first home", category: "home", horizon: "long", targetAmount: 15000, monthsAway: 48, whyItMatters: "Somewhere that is ours, not soon, but real.", group: "life" },
];
