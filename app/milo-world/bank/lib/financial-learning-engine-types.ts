import type { MoneyLabLessonKey } from "./money-lab-types";

export type FinancialAdvisorId = "nova" | "milo";

export type FinancialAdvisorMessage =
  | string
  | Partial<Record<FinancialAdvisorId, string>>;

export type FinancialLessonAccessTier = "free" | "milo_finance";

export type FinancialSkillKey =
  | "money_management"
  | "saving_planning"
  | "budgeting"
  | "risk_return"
  | "markets"
  | "financial_decisions"
  | "business";

export type FinancialConditionOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "exists";

export type FinancialCondition =
  | {
      source: "variable";
      key: string;
      operator: FinancialConditionOperator;
      value?: string | number | boolean | Array<string | number | boolean>;
    }
  | {
      source: "response";
      blockId: string;
      /** Dot path inside a structured response, e.g. `reserve` for an allocation. */
      path?: string;
      operator: FinancialConditionOperator;
      value?: string | number | boolean | Array<string | number | boolean>;
    };

export type FinancialBranchRule = {
  id: string;
  match?: "all" | "any";
  conditions: FinancialCondition[];
  nextBlockId: string;
};

export type FinancialVariableEffect = {
  key: string;
  operation: "set" | "add" | "subtract" | "multiply";
  value: number;
};

export type FinancialLessonVariableDefinition = {
  key: string;
  label: string;
  initialValue: number;
  unit?: string;
  prefix?: string;
  visible?: boolean;
  decimals?: number;
};

export type FinancialLessonVariableMap = Record<string, number>;

export type FinancialBlockBase = {
  id: string;
  eyebrow?: string;
  title?: string;
  advisorMessage?: FinancialAdvisorMessage;
  skills?: FinancialSkillKey[];
  /** Effects are committed only when the learner continues past this block. */
  effects?: FinancialVariableEffect[];
  /** Explicit route used when no branch rule matches. */
  nextBlockId?: string;
  /** Evaluated after this block's effects have been applied. First match wins. */
  branchRules?: FinancialBranchRule[];
};

export type ExplainBlock = FinancialBlockBase & {
  type: "explain";
  body: string;
  example?: string;
  keyIdea?: string;
};

export type QuestionOption = {
  id: string;
  label: string;
};

export type QuestionBlock = FinancialBlockBase & {
  type: "question";
  prompt: string;
  options: QuestionOption[];
  correctOptionId: string;
  explanation: string;
  incorrectExplanation?: string;
};

export type ScenarioFact = {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "warning";
};

export type ScenarioBlock = FinancialBlockBase & {
  type: "scenario";
  body: string;
  facts?: ScenarioFact[];
  questionToConsider?: string;
};

export type DecisionChoice = {
  id: string;
  label: string;
  summary?: string;
  strengths?: string[];
  tradeoffs?: string[];
  advisorFeedback?: FinancialAdvisorMessage;
  /** Choice-specific state changes. */
  effects?: FinancialVariableEffect[];
  /** Choice-specific route. Takes priority over block-level routing. */
  nextBlockId?: string;
};

export type DecisionBlock = FinancialBlockBase & {
  type: "decision";
  prompt: string;
  context?: string;
  choices: DecisionChoice[];
  reflectionPrompt?: string;
};

export type ComparisonColumn = {
  id: string;
  title: string;
  subtitle?: string;
  points: string[];
  accent?: "cyan" | "gold" | "green" | "purple";
};

export type ComparisonBlock = FinancialBlockBase & {
  type: "comparison";
  intro?: string;
  columns: ComparisonColumn[];
  takeaway?: string;
};

export type SliderFeedbackRange = {
  min: number;
  max: number;
  label: string;
  explanation: string;
  tone?: "neutral" | "positive" | "warning";
};

export type SliderBlock = FinancialBlockBase & {
  type: "slider";
  prompt: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
  prefix?: string;
  feedbackRanges?: SliderFeedbackRange[];
};

export type AllocationBucket = {
  id: string;
  label: string;
  description?: string;
  min?: number;
  max?: number;
  defaultValue?: number;
};

export type AllocationBlock = FinancialBlockBase & {
  type: "allocation";
  prompt: string;
  total: number;
  unit?: string;
  buckets: AllocationBucket[];
  allowUnallocated?: boolean;
  completionMessage?: string;
};

export type SortGroup = {
  id: string;
  label: string;
  description?: string;
};

export type SortItem = {
  id: string;
  label: string;
  correctGroupId?: string;
};

export type SortBlock = FinancialBlockBase & {
  type: "sort";
  prompt: string;
  groups: SortGroup[];
  items: SortItem[];
  explanation?: string;
};

export type NumberInputBlock = FinancialBlockBase & {
  type: "number_input";
  prompt: string;
  unit?: string;
  prefix?: string;
  min?: number;
  max?: number;
  step?: number;
  expectedValue?: number;
  acceptableMin?: number;
  acceptableMax?: number;
  explanation?: string;
};

export type PredictionChoice = {
  id: string;
  label: string;
};

export type PredictionBlock = FinancialBlockBase & {
  type: "prediction";
  prompt: string;
  choices: PredictionChoice[];
  revealTitle: string;
  revealBody: string;
  bestChoiceId?: string;
};


export type GrowthSimulatorControl = {
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
  prefix?: string;
  editable?: boolean;
};

export type GrowthSimulatorBlock = FinancialBlockBase & {
  type: "growth_simulator";
  prompt: string;
  principal: GrowthSimulatorControl;
  rate: GrowthSimulatorControl;
  periods: GrowthSimulatorControl;
  contribution?: GrowthSimulatorControl;
  periodLabel?: string;
  showSimple?: boolean;
  showCompound?: boolean;
  contextNote?: string;
  takeaway?: string;
};



export type BusinessModelControl = {
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
  prefix?: string;
  editable?: boolean;
};

export type BusinessModelBlock = FinancialBlockBase & {
  type: "business_model";
  prompt: string;
  price: BusinessModelControl;
  units: BusinessModelControl;
  variableCostPerUnit: BusinessModelControl;
  fixedCosts: BusinessModelControl;
  contextNote?: string;
  showMargin?: boolean;
  takeaway?: string;
};

export type PricingDemandPoint = {
  price: number;
  demand: number;
};

export type PricingSimulatorBlock = FinancialBlockBase & {
  type: "pricing_simulator";
  prompt: string;
  price: BusinessModelControl;
  unitCost: number;
  fixedCosts: number;
  capacity: number;
  demandPoints: PricingDemandPoint[];
  competitorPrice?: number;
  contextNote?: string;
  takeaway?: string;
};


export type CashflowTimelinePeriod = {
  id: string;
  label: string;
  subtitle?: string;
};

export type CashflowTimelineEvent = {
  id: string;
  label: string;
  amount: number;
  kind: "inflow" | "outflow";
  description?: string;
  correctPeriodId?: string;
};

export type CashflowTimelineBlock = FinancialBlockBase & {
  type: "cashflow_timeline";
  prompt: string;
  openingCash: number;
  periods: CashflowTimelinePeriod[];
  events: CashflowTimelineEvent[];
  contextNote?: string;
  warningBelow?: number;
  takeaway?: string;
};

export type InventoryDemandScenario = {
  id: string;
  label: string;
  demand: number;
  description?: string;
};

export type InventorySimulatorBlock = FinancialBlockBase & {
  type: "inventory_simulator";
  prompt: string;
  openingCash: number;
  openingInventory?: number;
  unitCost: number;
  salePrice: number;
  orderQuantity: BusinessModelControl;
  demandScenarios: InventoryDemandScenario[];
  revealScenarioId?: string;
  holdingCostPerUnit?: number;
  contextNote?: string;
  takeaway?: string;
};


export type CapacityOption = {
  id: string;
  label: string;
  description?: string;
  capacityChange: number;
  monthlyCost: number;
  oneOffCost?: number;
  qualityNote?: string;
  flexibilityNote?: string;
};

export type CapacitySimulatorBlock = FinancialBlockBase & {
  type: "capacity_simulator";
  prompt: string;
  currentCapacity: number;
  currentDemand: number;
  stressDemand?: number;
  options: CapacityOption[];
  contextNote?: string;
  takeaway?: string;
};

export type BusinessRiskItem = {
  id: string;
  label: string;
  category: string;
  exposure: number;
  description?: string;
};

export type BusinessRiskMitigation = {
  id: string;
  label: string;
  cost: number;
  description?: string;
  reductions: Record<string, number>;
};

export type BusinessRiskMapBlock = FinancialBlockBase & {
  type: "business_risk_map";
  prompt: string;
  budget: number;
  risks: BusinessRiskItem[];
  mitigations: BusinessRiskMitigation[];
  eventRiskId?: string;
  contextNote?: string;
  takeaway?: string;
};

export type FinancialLearningBlock =
  | ExplainBlock
  | QuestionBlock
  | ScenarioBlock
  | DecisionBlock
  | ComparisonBlock
  | SliderBlock
  | AllocationBlock
  | SortBlock
  | NumberInputBlock
  | PredictionBlock
  | GrowthSimulatorBlock
  | BusinessModelBlock
  | PricingSimulatorBlock
  | CashflowTimelineBlock
  | InventorySimulatorBlock
  | CapacitySimulatorBlock
  | BusinessRiskMapBlock;

export type FinancialLessonDefinition = {
  schemaVersion: 1 | 2;
  id: string;
  legacyLessonKey?: MoneyLabLessonKey;
  courseId: string;
  moduleId?: string;
  order: number;
  title: string;
  shortTitle: string;
  description: string;
  duration: string;
  rewardDt: number;
  accessTier: FinancialLessonAccessTier;
  concepts: string[];
  blocks: FinancialLearningBlock[];
  /** Defaults to the first block for older Phase 2A/2B lessons. */
  startBlockId?: string;
  /** Optional state values used by branching/consequence lessons. */
  variables?: FinancialLessonVariableDefinition[];
};

export type FinancialBlockResponseValue =
  | string
  | number
  | Record<string, number>
  | Record<string, string>;

export type FinancialBlockResponse = {
  blockId: string;
  blockType: FinancialLearningBlock["type"];
  value: FinancialBlockResponseValue;
  isCorrect?: boolean;
  answeredAt: string;
};

export type FinancialLessonResponseMap = Record<string, FinancialBlockResponse>;

export type FinancialLessonRuntime = {
  currentBlockId: string;
  /** Ordered route taken through the lesson, including the current block. */
  path: string[];
  variables: FinancialLessonVariableMap;
};
