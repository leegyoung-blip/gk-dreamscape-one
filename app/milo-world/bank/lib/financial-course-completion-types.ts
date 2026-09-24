import type { FinancialAdvisorId, FinancialSkillKey } from "./financial-learning-engine-types";

export type MiloFinanceCourseCompletion = {
  courseId: string;
  completedAt: string | null;
  advisorId: FinancialAdvisorId | null;
  totalLessons: number;
  completedLessons: number;
  isCompleted: boolean;
};

export type MiloFinanceCourseSkillSummary = {
  skillKey: FinancialSkillKey;
  title: string;
  evidenceCount: number;
  evidencePoints: number;
  observedCount: number;
  appliedCount: number;
  demonstratedCount: number;
  lastEvidenceAt: string | null;
};
