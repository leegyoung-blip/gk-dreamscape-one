import type {
  FinancialLearningBlock,
  FinancialLessonAccessTier,
  FinancialLessonDefinition,
  FinancialLessonVariableDefinition,
  FinancialSkillKey,
} from "./financial-learning-engine-types";

export type MiloFinanceContentStatus = "draft" | "published" | "archived";

export type MiloFinanceCourse = {
  id: string;
  title: string;
  description: string;
  accessTier: FinancialLessonAccessTier;
  sortOrder: number;
  status: MiloFinanceContentStatus;
  metadata: Record<string, unknown>;
};

export type MiloFinanceModule = {
  id: string;
  courseId: string;
  moduleKey: string;
  title: string;
  description: string;
  accessTier: FinancialLessonAccessTier;
  sortOrder: number;
  status: MiloFinanceContentStatus;
};

export type MiloFinanceLessonSummary = {
  id: string;
  lessonKey: string;
  courseId: string;
  moduleId: string | null;
  legacyLessonKey: string | null;
  title: string;
  shortTitle: string;
  description: string;
  durationMinutes: number;
  rewardDt: number;
  accessTier: FinancialLessonAccessTier;
  sortOrder: number;
  concepts: string[];
  skillKeys: FinancialSkillKey[];
  schemaVersion: 1 | 2;
  startBlockId: string | null;
  variableDefinitions: FinancialLessonVariableDefinition[];
  status: MiloFinanceContentStatus;
  version: number;
  contentSource: "database" | "legacy";
};

export type MiloFinanceLessonBlockRow = {
  blockKey: string;
  blockType: FinancialLearningBlock["type"];
  sortOrder: number;
  blockData: FinancialLearningBlock;
};

export type MiloFinanceLoadedLesson = {
  summary: MiloFinanceLessonSummary;
  definition: FinancialLessonDefinition;
};

export type MiloFinanceLessonProgress = {
  lessonId: string;
  status: "in_progress" | "completed";
  selectedAdvisor: "nova" | "milo";
  lastBlockKey: string | null;
  attemptNo: number;
  rewardIssued: number;
  startedAt: string;
  lastSeenAt: string;
  completedAt: string | null;
};

export type MiloFinanceLessonCompletion = {
  lessonKey: string;
  completedAt: string;
  rewardAmount: number;
  newlyCompleted: boolean;
};
