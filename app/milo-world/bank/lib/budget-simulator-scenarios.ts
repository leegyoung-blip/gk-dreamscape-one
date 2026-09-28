import type {
  BudgetDifficulty,
  BudgetScenarioKey,
  BudgetStageDefinition,
} from "./budget-simulator-types";

export type BudgetScenarioDefinition = {
  id: BudgetScenarioKey;
  title: string;
  shortDescription: string;
  emphasis: string;
};

export type BudgetDifficultyDefinition = {
  id: BudgetDifficulty;
  title: string;
  description: string;
  decisionRange: string;
};

export const BUDGET_STAGES: BudgetStageDefinition[] = [
  { id: "briefing", number: 1, label: "Briefing", shortLabel: "Brief" },
  {
    id: "financial_desk",
    number: 2,
    label: "Financial Desk",
    shortLabel: "Desk",
  },
  {
    id: "build_budget",
    number: 3,
    label: "Build Budget",
    shortLabel: "Budget",
  },
  { id: "forecast", number: 4, label: "Forecast", shortLabel: "Forecast" },
  {
    id: "live_month",
    number: 5,
    label: "Live Month",
    shortLabel: "Month",
  },
  {
    id: "final_week",
    number: 6,
    label: "Final Week",
    shortLabel: "Final",
  },
  { id: "review", number: 7, label: "Review", shortLabel: "Review" },
];

export const BUDGET_DIFFICULTIES: BudgetDifficultyDefinition[] = [
  {
    id: "standard",
    title: "Standard",
    description: "Stable income, fewer overlapping pressures and a clear first planning challenge.",
    decisionRange: "4–5 major decisions",
  },
  {
    id: "complex",
    title: "Complex",
    description: "More commitments, competing goals and uncertainty that forces rebalancing.",
    decisionRange: "6–8 major decisions",
  },
  {
    id: "strategic",
    title: "Strategic",
    description: "Changing conditions, delayed consequences and less complete information.",
    decisionRange: "8–10 major decisions",
  },
];

export const BUDGET_SCENARIOS: BudgetScenarioDefinition[] = [
  {
    id: "starter",
    title: "Starter Month",
    shortDescription: "A balanced month with enough room to plan, save and absorb a few surprises.",
    emphasis: "Core budgeting",
  },
  {
    id: "tight_month",
    title: "Tight Month",
    shortDescription: "Commitments are high and every allocation has a visible opportunity cost.",
    emphasis: "Liquidity",
  },
  {
    id: "goal_conflict",
    title: "Goal Conflict",
    shortDescription: "Several worthwhile goals compete for the same limited pool of DT.",
    emphasis: "Prioritisation",
  },
  {
    id: "opportunity_month",
    title: "Opportunity Month",
    shortDescription: "Attractive offers appear while known commitments still need protection.",
    emphasis: "Opportunity cost",
  },
  {
    id: "uncertain_income",
    title: "Uncertain Income",
    shortDescription: "Income timing becomes less predictable, increasing the value of flexibility.",
    emphasis: "Resilience",
  },
  {
    id: "high_commitments",
    title: "High Commitments",
    shortDescription: "Large fixed obligations leave little room for mistakes or impulsive changes.",
    emphasis: "Cash-flow control",
  },
  {
    id: "random_month",
    title: "Random Month",
    shortDescription: "A seeded mix of goals, pressures and opportunities for a fresh replay.",
    emphasis: "Replay challenge",
  },
];

export function getBudgetScenario(id: BudgetScenarioKey) {
  return BUDGET_SCENARIOS.find((scenario) => scenario.id === id) ?? BUDGET_SCENARIOS[0];
}

export function getBudgetDifficulty(id: BudgetDifficulty) {
  return BUDGET_DIFFICULTIES.find((difficulty) => difficulty.id === id) ?? BUDGET_DIFFICULTIES[0];
}

/**
 * Creates a positive 31-bit seed. The seed is persisted with the run so future
 * phases can regenerate the same month, event ordering and what-if branch.
 */
export function createBudgetScenarioSeed() {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return Math.max(1, values[0] & 0x7fffffff);
  }

  return Math.max(1, Math.floor(Date.now() % 2147483647));
}

/** Deterministic PRNG used by later 4A phases. */
export function createBudgetRandom(seed: number) {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickBudgetSeeded<T>(items: readonly T[], random: () => number): T {
  if (items.length === 0) {
    throw new Error("Cannot choose from an empty Budget Simulator collection.");
  }

  const index = Math.min(items.length - 1, Math.floor(random() * items.length));
  return items[index];
}
