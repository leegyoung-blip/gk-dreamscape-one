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

export type FinancialBlockBase = {
  id: string;
  eyebrow?: string;
  title?: string;
  advisorMessage?: FinancialAdvisorMessage;
  skills?: FinancialSkillKey[];
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
  | PredictionBlock;

export type FinancialLessonDefinition = {
  schemaVersion: 1;
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
