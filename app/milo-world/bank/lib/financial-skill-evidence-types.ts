import type { FinancialSkillKey } from "./financial-learning-engine-types";

export type MiloFinanceEvidenceLevel = "observed" | "applied" | "demonstrated";

export type MiloFinanceSkillSummary = {
  skillKey: FinancialSkillKey;
  title: string;
  description: string;
  evidenceCount: number;
  evidencePoints: number;
  observedCount: number;
  appliedCount: number;
  demonstratedCount: number;
  lastEvidenceAt: string | null;
};

export type MiloFinanceSkillEvidenceRecord = {
  id: string;
  skillKey: FinancialSkillKey;
  evidenceLevel: MiloFinanceEvidenceLevel;
  evidencePoints: number;
  sourceType: string;
  sourceKey: string;
  label: string;
  createdAt: string;
};
