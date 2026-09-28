import { createBudgetRandom, pickBudgetSeeded } from "./budget-simulator-scenarios";
import type {
  BudgetAllocation,
  BudgetAllocationKey,
  BudgetCondition,
  BudgetConditionLevel,
  BudgetDifficulty,
  BudgetFinancialProfile,
  BudgetGoal,
  BudgetPlanningItem,
  BudgetRadarValues,
  BudgetScenarioKey,
} from "./budget-simulator-types";

const ALLOCATION_KEYS: Exclude<BudgetAllocationKey, "unallocated">[] = [
  "essentials",
  "savings",
  "emergency",
  "investing",
  "goals",
  "lifestyle",
];

const commitmentTemplates = [
  {
    title: "Transport pass",
    category: "Transport",
    base: 420,
    day: 4,
    description: "Your regular transport cost for the month.",
  },
  {
    title: "Device & data plan",
    category: "Utilities",
    base: 110,
    day: 8,
    description: "Your monthly device and data commitment.",
  },
  {
    title: "Rover maintenance",
    category: "Rover",
    base: 600,
    day: 12,
    description: "Scheduled maintenance that keeps your Rover ready for missions.",
  },
  {
    title: "Activity fees",
    category: "Learning",
    base: 260,
    day: 19,
    description: "A planned activity and learning commitment.",
  },
  {
    title: "Business Builder repayment",
    category: "Business",
    base: 680,
    day: 24,
    description: "A fixed repayment linked to an earlier Business Builder purchase.",
  },
  {
    title: "Creator tools subscription",
    category: "Tools",
    base: 240,
    day: 16,
    description: "Tools you currently use for a Dreamscape project.",
  },
  {
    title: "Learning materials",
    category: "Learning",
    base: 330,
    day: 21,
    description: "Resources already committed for this month.",
  },
  {
    title: "Workshop booking",
    category: "Development",
    base: 390,
    day: 27,
    description: "A workshop place you booked earlier and still need to fund.",
  },
];

const goalTemplates: Omit<BudgetGoal, "id">[] = [
  {
    title: "Rover upgrade",
    targetAmount: 2500,
    currentAmount: 1100,
    desiredMonths: 2,
    description: "Build towards the next Rover performance upgrade.",
  },
  {
    title: "Emergency reserve",
    targetAmount: 1800,
    currentAmount: 420,
    desiredMonths: 3,
    description: "Create a buffer for costs you cannot predict in advance.",
  },
  {
    title: "Exchange investment fund",
    targetAmount: 1800,
    currentAmount: 650,
    desiredMonths: 2,
    description: "Prepare capital for a future Milo's Exchange opportunity.",
  },
  {
    title: "Business Builder equipment",
    targetAmount: 3200,
    currentAmount: 1250,
    desiredMonths: 4,
    description: "Set aside funds for equipment that could expand a business.",
  },
  {
    title: "Property deposit fund",
    targetAmount: 4200,
    currentAmount: 1500,
    desiredMonths: 5,
    description: "Build a longer-term fund for a future property opportunity.",
  },
];

function round10(value: number) {
  return Math.max(0, Math.round(value / 10) * 10);
}

function bounded(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function jitter(base: number, random: () => number, spread = 0.1) {
  return round10(base * (1 + (random() * 2 - 1) * spread));
}

function difficultyCounts(difficulty: BudgetDifficulty) {
  if (difficulty === "strategic") return { commitments: 7, goals: 3 };
  if (difficulty === "complex") return { commitments: 6, goals: 3 };
  return { commitments: 5, goals: 2 };
}

function scenarioBase(scenario: BudgetScenarioKey) {
  switch (scenario) {
    case "tight_month":
      return { income: 4400, available: 900, savings: 520, commitmentScale: 1.18 };
    case "goal_conflict":
      return { income: 5000, available: 1450, savings: 760, commitmentScale: 1.0 };
    case "opportunity_month":
      return { income: 5200, available: 1700, savings: 880, commitmentScale: 1.02 };
    case "uncertain_income":
      return { income: 4600, available: 1250, savings: 1000, commitmentScale: 1.03 };
    case "high_commitments":
      return { income: 5250, available: 1050, savings: 680, commitmentScale: 1.34 };
    case "random_month":
      return { income: 4850, available: 1300, savings: 740, commitmentScale: 1.08 };
    case "starter":
    default:
      return { income: 4800, available: 1200, savings: 700, commitmentScale: 1.0 };
  }
}

function pickUnique<T>(items: readonly T[], count: number, random: () => number) {
  const pool = [...items];
  const result: T[] = [];
  while (pool.length > 0 && result.length < count) {
    const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
    result.push(pool.splice(index, 1)[0]);
  }
  return result;
}

export function generateBudgetFinancialProfile(input: {
  scenarioKey: BudgetScenarioKey;
  difficulty: BudgetDifficulty;
  scenarioSeed: number;
}): BudgetFinancialProfile {
  const random = createBudgetRandom(input.scenarioSeed);
  const counts = difficultyCounts(input.difficulty);
  const base = scenarioBase(input.scenarioKey);

  const difficultyScale =
    input.difficulty === "strategic" ? 1.08 : input.difficulty === "complex" ? 1.04 : 1;

  const monthlyIncome = jitter(base.income * difficultyScale, random, 0.045);
  const availableNow = jitter(base.available, random, 0.09);
  const currentSavings = jitter(base.savings, random, 0.11);

  const commitments = pickUnique(commitmentTemplates, counts.commitments, random)
    .map((template, index) => ({
      id: `commitment-${index + 1}-${template.category.toLowerCase().replace(/\s+/g, "-")}`,
      title: template.title,
      amount: jitter(template.base * base.commitmentScale, random, 0.08),
      dueDay: bounded(template.day + Math.round((random() * 4 - 2)), 2, 28),
      category: template.category,
      description: template.description,
    }))
    .sort((a, b) => a.dueDay - b.dueDay);

  let goalCount = counts.goals;
  if (input.scenarioKey === "goal_conflict") goalCount = 3;
  const goals = pickUnique(goalTemplates, goalCount, random).map((goal, index) => {
    const targetAmount = jitter(goal.targetAmount, random, 0.06);
    const currentAmount = Math.min(
      targetAmount - 100,
      jitter(goal.currentAmount, random, 0.08),
    );
    return {
      ...goal,
      id: `goal-${index + 1}-${goal.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      targetAmount,
      currentAmount,
      desiredMonths:
        input.scenarioKey === "goal_conflict"
          ? bounded(goal.desiredMonths - 1, 1, 6)
          : goal.desiredMonths,
    };
  });

  const optionalSpending = [
    {
      id: "optional-social",
      title: "Milo World event",
      amount: jitter(280, random, 0.1),
      description: "A social activity you would enjoy, but it is not committed yet.",
    },
    {
      id: "optional-customisation",
      title: "Rover customisation",
      amount: jitter(360, random, 0.1),
      description: "A cosmetic upgrade that can be delayed without affecting performance.",
    },
    {
      id: "optional-experience",
      title: "Weekend experience",
      amount: jitter(220, random, 0.12),
      description: "Optional spending that competes with other priorities this month.",
    },
  ];

  const signalPool = [
    {
      id: "signal-rover",
      title: "Rover condition",
      detail: "The next diagnostic could uncover additional maintenance, but nothing is confirmed.",
    },
    {
      id: "signal-exchange",
      title: "Exchange window",
      detail: "A possible Milo's Exchange opportunity may open next month. The required capital is not yet confirmed.",
    },
    {
      id: "signal-business",
      title: "Business Builder offer",
      detail: "A supplier may offer discounted equipment later this month. Waiting for the exact terms could preserve flexibility.",
    },
    {
      id: "signal-costs",
      title: "Costs may move",
      detail: "Several everyday costs have been less predictable recently, so a perfectly tight plan could be harder to maintain.",
    },
  ];

  const signals = pickUnique(signalPool, input.difficulty === "standard" ? 2 : 3, random);

  const nextIncomeDay = input.scenarioKey === "uncertain_income" ? 29 : 30;
  const nextIncomeWindow =
    input.scenarioKey === "uncertain_income" ? "Expected between Day 27 and Day 30" : undefined;

  return {
    monthlyIncome,
    availableNow,
    nextIncomeDay,
    nextIncomeWindow,
    currentSavings,
    commitments,
    goals,
    optionalSpending,
    signals,
  };
}

export function totalKnownCommitments(profile: BudgetFinancialProfile) {
  return profile.commitments.reduce((sum, item) => sum + item.amount, 0);
}

export function totalGoalGap(profile: BudgetFinancialProfile) {
  return profile.goals.reduce(
    (sum, goal) => sum + Math.max(0, goal.targetAmount - goal.currentAmount),
    0,
  );
}

export function budgetPool(profile: BudgetFinancialProfile) {
  return profile.availableNow + profile.monthlyIncome;
}

export function getBudgetPlanningItems(profile: BudgetFinancialProfile): BudgetPlanningItem[] {
  const result: BudgetPlanningItem[] = [
    {
      id: "income-monthly",
      title: "Monthly income",
      detail: `${profile.monthlyIncome.toLocaleString()} DT expected this month`,
      amount: profile.monthlyIncome,
      group: "income",
    },
    {
      id: "income-available",
      title: "Available now",
      detail: `${profile.availableNow.toLocaleString()} DT carried into the month`,
      amount: profile.availableNow,
      group: "income",
    },
    {
      id: "savings-current",
      title: "Current savings",
      detail: `${profile.currentSavings.toLocaleString()} DT already protected outside this month's spending plan`,
      amount: profile.currentSavings,
      group: "savings",
    },
  ];

  profile.commitments.forEach((item) =>
    result.push({
      id: item.id,
      title: item.title,
      detail: `Day ${item.dueDay} · ${item.category}`,
      amount: item.amount,
      group: "commitment",
    }),
  );

  profile.goals.forEach((goal) =>
    result.push({
      id: goal.id,
      title: goal.title,
      detail: `${Math.max(0, goal.targetAmount - goal.currentAmount).toLocaleString()} DT remaining · ${goal.desiredMonths} month${goal.desiredMonths === 1 ? "" : "s"}`,
      amount: Math.max(0, goal.targetAmount - goal.currentAmount),
      group: "goal",
    }),
  );

  profile.optionalSpending.forEach((item) =>
    result.push({
      id: item.id,
      title: item.title,
      detail: item.description,
      amount: item.amount,
      group: "optional",
    }),
  );

  profile.signals.forEach((signal) =>
    result.push({
      id: signal.id,
      title: signal.title,
      detail: signal.detail,
      group: "signal",
    }),
  );

  return result;
}

export function createInitialBudgetAllocation(profile: BudgetFinancialProfile): BudgetAllocation {
  const pool = budgetPool(profile);
  const commitments = totalKnownCommitments(profile);

  const essentials = Math.min(pool, round10(commitments));
  let remaining = Math.max(0, pool - essentials);

  const target = (fraction: number) => Math.min(remaining, round10(pool * fraction));

  const savings = target(0.1);
  remaining -= savings;
  const emergency = Math.min(remaining, round10(pool * 0.08));
  remaining -= emergency;
  const investing = Math.min(remaining, round10(pool * 0.05));
  remaining -= investing;
  const goals = Math.min(remaining, round10(pool * 0.1));
  remaining -= goals;
  const lifestyle = Math.min(remaining, round10(pool * 0.07));
  remaining -= lifestyle;

  return {
    essentials,
    savings,
    emergency,
    investing,
    goals,
    lifestyle,
    unallocated: round10(remaining),
  };
}

export function normaliseBudgetAllocation(
  allocation: Partial<BudgetAllocation> | undefined,
  profile: BudgetFinancialProfile,
): BudgetAllocation {
  const pool = budgetPool(profile);
  const initial = createInitialBudgetAllocation(profile);
  const result: BudgetAllocation = { ...initial };

  if (allocation) {
    ALLOCATION_KEYS.forEach((key) => {
      const raw = Number(allocation[key]);
      if (Number.isFinite(raw)) result[key] = Math.max(0, round10(raw));
    });
  }

  let used = ALLOCATION_KEYS.reduce((sum, key) => sum + result[key], 0);
  if (used > pool) {
    const scale = pool / used;
    ALLOCATION_KEYS.forEach((key) => {
      result[key] = round10(result[key] * scale);
    });
    used = ALLOCATION_KEYS.reduce((sum, key) => sum + result[key], 0);
  }

  result.unallocated = Math.max(0, round10(pool - used));
  return result;
}

export function setBudgetAllocationValue(
  allocation: BudgetAllocation,
  key: Exclude<BudgetAllocationKey, "unallocated">,
  requestedValue: number,
  profile: BudgetFinancialProfile,
): BudgetAllocation {
  const pool = budgetPool(profile);
  const otherTotal = ALLOCATION_KEYS.filter((item) => item !== key).reduce(
    (sum, item) => sum + allocation[item],
    0,
  );
  const maximum = Math.max(0, pool - otherTotal);
  const nextValue = bounded(round10(requestedValue), 0, maximum);
  const next = { ...allocation, [key]: nextValue };
  const used = ALLOCATION_KEYS.reduce((sum, item) => sum + next[item], 0);
  next.unallocated = Math.max(0, round10(pool - used));
  return next;
}

function levelFor(value: number): BudgetConditionLevel {
  if (value >= 78) return "strong";
  if (value >= 52) return "steady";
  if (value >= 28) return "limited";
  return "exposed";
}

export function buildBudgetAnalysis(
  profile: BudgetFinancialProfile,
  allocation: BudgetAllocation,
): {
  conditions: BudgetCondition[];
  radar: BudgetRadarValues;
} {
  const pool = budgetPool(profile);
  const commitments = totalKnownCommitments(profile);
  const next14 = profile.commitments
    .filter((item) => item.dueDay <= 14)
    .reduce((sum, item) => sum + item.amount, 0);
  const goalGap = totalGoalGap(profile);

  const commitmentCoverage = commitments > 0 ? (allocation.essentials / commitments) * 100 : 100;
  const liquidity = next14 > 0 ? (allocation.unallocated / Math.max(1, next14 * 0.6)) * 100 : 100;
  const emergencyReserve = profile.currentSavings + allocation.emergency;
  const emergencyBuffer = commitments > 0 ? (emergencyReserve / Math.max(1, commitments * 0.65)) * 100 : 100;
  const monthlyGoalTarget = Math.min(goalGap, Math.max(400, pool * 0.18));
  const goalProgress = monthlyGoalTarget > 0 ? (allocation.goals / monthlyGoalTarget) * 100 : 100;
  const flexibility = pool > 0 ? (allocation.unallocated / (pool * 0.14)) * 100 : 0;
  const longTermGrowth =
    pool > 0
      ? ((allocation.savings + allocation.investing + allocation.goals) / (pool * 0.34)) * 100
      : 0;

  const values = {
    liquidity: bounded(liquidity, 0, 100),
    commitmentCoverage: bounded(commitmentCoverage, 0, 100),
    emergencyBuffer: bounded(emergencyBuffer, 0, 100),
    goalProgress: bounded(goalProgress, 0, 100),
    flexibility: bounded(flexibility, 0, 100),
    longTermGrowth: bounded(longTermGrowth, 0, 100),
  };

  const conditions: BudgetCondition[] = [
    {
      id: "liquidity",
      label: "Liquidity",
      level: levelFor(values.liquidity),
      value: values.liquidity,
      detail:
        allocation.unallocated > 0
          ? `${allocation.unallocated.toLocaleString()} DT remains immediately unallocated against ${next14.toLocaleString()} DT due by Day 14.`
          : `Nothing remains unallocated while ${next14.toLocaleString()} DT is due by Day 14.`,
    },
    {
      id: "commitment_coverage",
      label: "Commitment coverage",
      level: levelFor(values.commitmentCoverage),
      value: values.commitmentCoverage,
      detail:
        allocation.essentials >= commitments
          ? `All ${commitments.toLocaleString()} DT of known commitments are covered by the Essentials allocation.`
          : `${Math.max(0, commitments - allocation.essentials).toLocaleString()} DT of known commitments is not yet covered.`,
    },
    {
      id: "emergency_buffer",
      label: "Emergency buffer",
      level: levelFor(values.emergencyBuffer),
      value: values.emergencyBuffer,
      detail: `${emergencyReserve.toLocaleString()} DT would be protected after adding this month's emergency allocation.`,
    },
    {
      id: "goal_progress",
      label: "Goal progress",
      level: levelFor(values.goalProgress),
      value: values.goalProgress,
      detail: `${allocation.goals.toLocaleString()} DT is directed towards ${profile.goals.length} active goal${profile.goals.length === 1 ? "" : "s"} this month.`,
    },
    {
      id: "flexibility",
      label: "Flexibility",
      level: levelFor(values.flexibility),
      value: values.flexibility,
      detail:
        allocation.unallocated > 0
          ? `${allocation.unallocated.toLocaleString()} DT can still be redirected if the month changes.`
          : "Every DT has already been assigned, leaving little room to respond without changing the plan.",
    },
  ];

  return {
    conditions,
    radar: {
      liquidity: values.liquidity,
      resilience: bounded((values.emergencyBuffer + values.commitmentCoverage) / 2, 0, 100),
      goalProgress: values.goalProgress,
      flexibility: values.flexibility,
      longTermGrowth: values.longTermGrowth,
    },
  };
}

export function budgetAllocationKeys() {
  return [...ALLOCATION_KEYS];
}

export function formatBudgetAllocationLabel(key: BudgetAllocationKey) {
  switch (key) {
    case "essentials":
      return "Essentials";
    case "savings":
      return "Savings";
    case "emergency":
      return "Emergency reserve";
    case "investing":
      return "Investing";
    case "goals":
      return "Goals";
    case "lifestyle":
      return "Lifestyle";
    case "unallocated":
      return "Unallocated";
  }
}

export function randomBudgetCoachPrompt(profile: BudgetFinancialProfile, seed: number) {
  const random = createBudgetRandom(seed + 911);
  return pickBudgetSeeded(
    [
      `You have ${totalKnownCommitments(profile).toLocaleString()} DT of known commitments before the next income cycle.`,
      `${profile.goals.length} goals are competing with this month's commitments for the same pool of DT.`,
      `You already have ${profile.currentSavings.toLocaleString()} DT protected outside this month's spending plan.`,
    ],
    random,
  );
}
