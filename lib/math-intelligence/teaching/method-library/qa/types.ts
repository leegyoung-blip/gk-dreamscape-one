import type { TeachingContractBuildDiagnostic } from "../../contract/types";
import type { TeachingContractConsumerBlocker } from "../../contract/consumer";
import type {
  Phase4B1CoverageIssue,
  Phase4BMethodFamilyId,
  Phase4BQuestionCoverageRequirement,
} from "../taxonomy";

export type Phase4B1CohortKind = "fixed" | "holdout" | "custom";

export type Phase4B1QuestionAuditResult = {
  questionId: string | null;
  questionCode: string | null;
  learnerLevel: number | null;
  sourceReadyForMethodSelection: boolean;
  contractStatus: "ready" | "blocked";
  phase4BConsumerStatus: "ready" | "blocked";
  coverageStatus: "covered" | "uncovered" | "not_applicable";
  requirement: Phase4BQuestionCoverageRequirement | null;
  coverageIssues: Phase4B1CoverageIssue[];
  buildBlockers: TeachingContractBuildDiagnostic[];
  consumerBlockers: TeachingContractConsumerBlocker[];
};

export type Phase4B1CoverageSummary = {
  totalSampleItems: number;
  readyForPedagogy: number;
  blockedBeforePhase4B: number;
  phase4BConsumerFailures: number;
  coveredReadyQuestions: number;
  uncoveredReadyQuestions: number;
  coveragePercent: number;
  uniqueDomains: number;
  uniqueStructures: number;
  uniqueReasoningFamilies: number;
  uniqueMethodFamiliesRequired: number;
  byLevel: Record<string, number>;
  byDomain: Record<string, number>;
  byStructure: Record<string, number>;
  byReasoning: Record<string, number>;
  byMethodFamily: Record<string, number>;
  issueCounts: Record<string, number>;
};

export type Phase4B1CoverageChecks = {
  phase4BConsumerBoundaryPasses: boolean;
  everyReadyQuestionCoveredByTaxonomy: boolean;
  everyObservedStructureMapped: boolean;
  everyObservedReasoningMapped: boolean;
  noGenericFallbackFamily: boolean;
  allReferencedFamilyIdsKnown: boolean;
};

export type Phase4B1CoverageAuditRun = {
  schemaVersion: "4B-1-QA.1";
  taxonomySchemaVersion: "4B-1.1";
  contractSchemaVersion: "4A-3.1";
  consumerSchemaVersion: "4A-3-CONSUMER.1";
  generatedAt: string;
  sourceRunId: string | null;
  sourceSeed: string | null;
  cohortKind: Phase4B1CohortKind;
  summary: Phase4B1CoverageSummary;
  checks: Phase4B1CoverageChecks;
  passed: boolean;
  results: Phase4B1QuestionAuditResult[];
};

export type Phase4B1CompactExport = {
  schema_version: "4B-1-QA.1";
  taxonomy_schema_version: "4B-1.1";
  contract_schema_version: "4A-3.1";
  consumer_schema_version: "4A-3-CONSUMER.1";
  generated_at: string;
  source_run_id: string | null;
  source_seed: string | null;
  cohort_kind: Phase4B1CohortKind;
  summary: Phase4B1CoverageSummary;
  checks: Phase4B1CoverageChecks;
  passed: boolean;
  results: Array<{
    question_id: string | null;
    question_code: string | null;
    learner_level: number | null;
    source_ready_for_method_selection: boolean;
    contract_status: "ready" | "blocked";
    phase_4b_consumer_status: "ready" | "blocked";
    coverage_status: "covered" | "uncovered" | "not_applicable";
    primary_families: Phase4BMethodFamilyId[];
    supporting_families: Phase4BMethodFamilyId[];
    coverage_issues: Phase4B1CoverageIssue[];
    build_blockers: TeachingContractBuildDiagnostic[];
    consumer_blockers: TeachingContractConsumerBlocker[];
  }>;
};
