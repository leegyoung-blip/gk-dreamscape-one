export type BudgetDifficulty = "standard" | "complex" | "strategic";

export type BudgetScenarioKey =
  | "starter"
  | "tight_month"
  | "goal_conflict"
  | "opportunity_month"
  | "uncertain_income"
  | "high_commitments"
  | "random_month";

export type BudgetStageKey =
  | "briefing"
  | "financial_desk"
  | "build_budget"
  | "forecast"
  | "live_month"
  | "final_week"
  | "review";

export type BudgetRunStatus = "active" | "completed" | "abandoned";

export type BudgetAllocationKey =
  | "essentials"
  | "savings"
  | "emergency"
  | "investing"
  | "goals"
  | "lifestyle"
  | "unallocated";

export type BudgetAllocation = Record<BudgetAllocationKey, number>;

export type BudgetCommitment = {
  id: string;
  title: string;
  amount: number;
  dueDay: number;
  category: string;
  description: string;
};

export type BudgetGoal = {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  desiredMonths: number;
  description: string;
};

export type BudgetSignal = {
  id: string;
  title: string;
  detail: string;
};

export type BudgetOptionalSpend = {
  id: string;
  title: string;
  amount: number;
  description: string;
};

export type BudgetFinancialProfile = {
  monthlyIncome: number;
  availableNow: number;
  nextIncomeDay: number;
  nextIncomeWindow?: string;
  currentSavings: number;
  commitments: BudgetCommitment[];
  goals: BudgetGoal[];
  optionalSpending: BudgetOptionalSpend[];
  signals: BudgetSignal[];
};

export type BudgetPlanningItem = {
  id: string;
  title: string;
  detail: string;
  amount?: number;
  group: "income" | "commitment" | "goal" | "savings" | "optional" | "signal";
};

export type BudgetConditionLevel = "strong" | "steady" | "limited" | "exposed";

export type BudgetCondition = {
  id:
    | "liquidity"
    | "commitment_coverage"
    | "emergency_buffer"
    | "goal_progress"
    | "flexibility";
  label: string;
  level: BudgetConditionLevel;
  detail: string;
  value: number;
};

export type BudgetRadarValues = {
  liquidity: number;
  resilience: number;
  goalProgress: number;
  flexibility: number;
  longTermGrowth: number;
};

export type BudgetSimulationData = {
  inspectedItems?: string[];
  pinnedItems?: string[];
  allocation?: BudgetAllocation;
  firstPlan?: BudgetAllocation;
};

export type BudgetSimulationState = {
  schemaVersion: 1;
  stage: BudgetStageKey;
  currentDay: number;
  completedStages: BudgetStageKey[];
  scenarioKey: BudgetScenarioKey;
  difficulty: BudgetDifficulty;
  scenarioSeed: number;
  data: BudgetSimulationData;
};

export type BudgetSimulationRun = {
  id: string;
  scenarioKey: BudgetScenarioKey;
  difficulty: BudgetDifficulty;
  scenarioSeed: number;
  status: BudgetRunStatus;
  currentStage: BudgetStageKey;
  currentDay: number;
  state: BudgetSimulationState;
  checkpointVersion: number;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type BudgetStageDefinition = {
  id: BudgetStageKey;
  number: number;
  label: string;
  shortLabel: string;
};
