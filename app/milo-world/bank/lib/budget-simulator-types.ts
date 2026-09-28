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

export type BudgetSimulationState = {
  schemaVersion: 1;
  stage: BudgetStageKey;
  currentDay: number;
  completedStages: BudgetStageKey[];
  scenarioKey: BudgetScenarioKey;
  difficulty: BudgetDifficulty;
  scenarioSeed: number;
  data: Record<string, unknown>;
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
