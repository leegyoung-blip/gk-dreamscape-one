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

export type BudgetForecastPoint = {
  day: number;
  available: number;
  protected: number;
  commitmentOutflow: number;
  commitmentIds: string[];
};

export type BudgetForecast = {
  points: BudgetForecastPoint[];
  openingAvailable: number;
  protectedTotal: number;
  minimumAvailable: number;
  finalAvailable: number;
  totalKnownPayments: number;
  firstShortfallDay: number | null;
};

export type BudgetStressTestKey =
  | "unexpected_250"
  | "unexpected_500"
  | "income_drop_10";

export type BudgetStressTestResult = {
  key: BudgetStressTestKey;
  label: string;
  shortLabel: string;
  description: string;
  shockDay: number;
  impactAmount: number;
  minimumAvailable: number;
  finalAvailable: number;
  liquidityGap: number;
  commitmentsCoveredWithoutRebalance: boolean;
  interpretation: string;
};

export type BudgetLiveEventCategory =
  | "expense"
  | "opportunity"
  | "lifestyle"
  | "income"
  | "goal"
  | "market"
  | "consequence";

export type BudgetLiveEventChoice = {
  id: string;
  label: string;
  description: string;
  cashImpact: number;
  effectSummary: string;
  riskNote?: string;
  schedules?: "rover_follow_up" | "equipment_follow_up" | null;
  allocationMove?: {
    to: BudgetAllocationKey;
    amount: number;
  };
  release?: {
    from: BudgetAllocationKey;
    amount: number;
  };
};

export type BudgetLiveEvent = {
  id: string;
  day: number;
  category: BudgetLiveEventCategory;
  title: string;
  subtitle: string;
  briefing: string;
  analysis: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
  choices: BudgetLiveEventChoice[];
  linkedFrom?: string | null;
  consequenceKind?: "rover_follow_up" | "equipment_follow_up" | null;
};

export type BudgetPaidCommitment = {
  commitmentId: string;
  day: number;
  amount: number;
  title: string;
};

export type BudgetLiveDecision = {
  eventId: string;
  day: number;
  choiceId: string;
  choiceLabel: string;
  cashImpact: number;
  beforeAllocation: BudgetAllocation;
  afterAllocation: BudgetAllocation;
  effectSummary: string;
};

export type BudgetLiveMonthSnapshot = {
  day: number;
  allocation: BudgetAllocation;
  liquidTotal: number;
  protectedTotal: number;
};

export type BudgetLiveMonthState = {
  events: BudgetLiveEvent[];
  allocation: BudgetAllocation;
  paidCommitments: BudgetPaidCommitment[];
  resolvedEventIds: string[];
  decisions: BudgetLiveDecision[];
  snapshots: BudgetLiveMonthSnapshot[];
  lastOutcome?: {
    title: string;
    detail: string;
    tone: "positive" | "neutral" | "warning";
  } | null;
};


export type BudgetDecisionFactorKey =
  | "available_cash"
  | "goal_deadline"
  | "possible_return"
  | "emergency_reserve"
  | "upcoming_commitment";

export type BudgetFinalWeekChoiceId =
  | "protect_position"
  | "balanced_commitment"
  | "full_commitment";

export type BudgetFinalWeekChoice = {
  id: BudgetFinalWeekChoiceId;
  label: string;
  description: string;
  commitmentAmount: number;
  effectSummary: string;
  riskNote: string;
};

export type BudgetFinalWeekChallenge = {
  day: number;
  title: string;
  subtitle: string;
  briefing: string;
  opportunityAmount: number;
  potentialBenefitLow: number;
  potentialBenefitHigh: number;
  finalCommitments: BudgetCommitment[];
  choices: BudgetFinalWeekChoice[];
};

export type BudgetFinalWeekResult = {
  challengeDay: number;
  choiceId: BudgetFinalWeekChoiceId;
  choiceLabel: string;
  selectedFactors: BudgetDecisionFactorKey[];
  confidence: number;
  opportunityCommitted: number;
  openingAllocation: BudgetAllocation;
  decisionAllocation: BudgetAllocation;
  finalAllocation: BudgetAllocation;
  paidCommitments: BudgetPaidCommitment[];
  endingAvailable: number;
  endingProtected: number;
  endingTotal: number;
  finalCommitmentsPaid: number;
  commitmentsMissed: number;
  completedAt: string;
};

export type BudgetEvidenceLevel = "observed" | "applied" | "demonstrated";

export type BudgetSkillEvidenceSummary = {
  skillKey:
    | "money_management"
    | "saving_planning"
    | "budgeting"
    | "financial_decisions";
  title: string;
  level: BudgetEvidenceLevel;
  evidencePoints: 1 | 2 | 3;
  reason: string;
};

export type BudgetDecisionPattern = {
  key:
    | "liquidity_awareness"
    | "planning"
    | "goal_discipline"
    | "adaptability"
    | "opportunity_cost";
  label: string;
  observation: string;
};

export type BudgetResultsSummary = {
  skills: BudgetSkillEvidenceSummary[];
  patterns: BudgetDecisionPattern[];
  miloInsights: string[];
};

export type BudgetSimulationData = {
  inspectedItems?: string[];
  pinnedItems?: string[];
  allocation?: BudgetAllocation;
  firstPlan?: BudgetAllocation;
  forecastViewedDay?: number;
  stressTestsRun?: BudgetStressTestKey[];
  forecastConfirmed?: boolean;
  liveMonth?: BudgetLiveMonthState;
  liveMonthCompleted?: boolean;
  finalWeekOpeningAllocation?: BudgetAllocation;
  finalWeekAllocation?: BudgetAllocation;
  finalWeekChoiceId?: BudgetFinalWeekChoiceId;
  finalWeekDecisionFactors?: BudgetDecisionFactorKey[];
  finalWeekConfidence?: number;
  finalWeekResult?: BudgetFinalWeekResult;
  finalWeekCompleted?: boolean;
  resultsSummary?: BudgetResultsSummary;
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
