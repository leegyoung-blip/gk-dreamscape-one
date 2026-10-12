import type { Phase4BMethodFamilyId } from "../taxonomy/types";
import type { TeachingMethodValidationIssue } from "../schema/types";
import type { Phase4B1CohortKind } from "./types";

export const PHASE4B7_QA_SCHEMA_VERSION = "4B-7-QA.1" as const;

export type Phase4B7IssueCode =
  | "PHASE4B_CONSUMER_NOT_READY"
  | "TAXONOMY_NOT_COVERED"
  | "NO_PRODUCTION_CANDIDATE"
  | "NO_PRIMARY_FAMILY_CANDIDATE"
  | "CANDIDATE_LOOKUP_NONDETERMINISTIC"
  | "CANDIDATE_APPLICABILITY_MISMATCH"
  | "BLOCKED_QUESTION_CROSSED_BOUNDARY";

export type Phase4B7QuestionResult = {
  questionId: string | null;
  questionCode: string | null;
  learnerLevel: number | null;
  sourceReadyForMethodSelection: boolean;
  contractStatus: "ready" | "blocked";
  phase4BConsumerStatus: "ready" | "blocked";
  taxonomyCoverageStatus: "covered" | "uncovered" | "not_applicable";
  primaryFamilies: Phase4BMethodFamilyId[];
  supportingFamilies: Phase4BMethodFamilyId[];
  candidateMethodIds: string[];
  primaryCandidateMethodIds: string[];
  issueCodes: Phase4B7IssueCode[];
};

export type Phase4B7Summary = {
  totalSampleItems: number;
  readyForPedagogy: number;
  blockedBeforePhase4B: number;
  phase4BConsumerFailures: number;
  taxonomyUncoveredReady: number;
  readyWithCandidateMethods: number;
  readyWithoutCandidateMethods: number;
  readyWithPrimaryFamilyCandidate: number;
  readyWithoutPrimaryFamilyCandidate: number;
  candidateLookupDeterminismFailures: number;
  candidateApplicabilityFailures: number;
  totalProductionMethods: number;
  activeProductionMethods: number;
  taxonomyFamilies: number;
  familiesWithProductionMethods: number;
  invalidProductionMethods: number;
  duplicateMethodIds: number;
  minCandidatesPerReadyQuestion: number;
  maxCandidatesPerReadyQuestion: number;
  averageCandidatesPerReadyQuestion: number;
  byLevel: Record<string, number>;
  byPrimaryFamily: Record<string, number>;
  byCandidateMethod: Record<string, number>;
  issueCounts: Record<string, number>;
};

export type Phase4B7ClosureRun = {
  schemaVersion: typeof PHASE4B7_QA_SCHEMA_VERSION;
  taxonomySchemaVersion: "4B-1.1";
  methodSchemaVersion: "4B.1";
  contractSchemaVersion: "4A-3.1";
  consumerSchemaVersion: "4A-3-CONSUMER.1";
  generatedAt: string;
  sourceRunId: string | null;
  sourceSeed: string | null;
  cohortKind: Phase4B1CohortKind;
  summary: Phase4B7Summary;
  missingTaxonomyFamilies: Phase4BMethodFamilyId[];
  invalidMethods: Array<{
    methodId: string;
    blockers: TeachingMethodValidationIssue[];
  }>;
  duplicateMethodIds: string[];
  priorPhaseChecks: {
    phase4B1: boolean;
    phase4B2: boolean;
    phase4B3: boolean;
    phase4B4: boolean;
    phase4B5: boolean;
    phase4B6: boolean;
  };
  checks: {
    phase4B1CohortCoverageStillPasses: boolean;
    phase4B2SchemaGovernanceStillPasses: boolean;
    phase4B3LibraryStillPasses: boolean;
    phase4B4LibraryStillPasses: boolean;
    phase4B5LibraryStillPasses: boolean;
    phase4B6LibraryStillPasses: boolean;
    everyTaxonomyFamilyHasProductionMethod: boolean;
    allProductionMethodsValidate: boolean;
    allProductionMethodIdsUnique: boolean;
    phase4BConsumerBoundaryPasses: boolean;
    everyReadyQuestionHasCandidateMethod: boolean;
    everyReadyQuestionHasPrimaryFamilyCandidate: boolean;
    candidateLookupDeterministic: boolean;
    allCandidateMethodsSatisfyApplicability: boolean;
    blockedQuestionsRemainBlocked: boolean;
    knownCohortReadyCountMatches: boolean;
    noGenericFallbackFamily: boolean;
    noLunaOrPersistenceEscapeHatch: boolean;
  };
  passed: boolean;
  results: Phase4B7QuestionResult[];
};

export type Phase4B7CompactExport = {
  schema_version: typeof PHASE4B7_QA_SCHEMA_VERSION;
  taxonomy_schema_version: "4B-1.1";
  method_schema_version: "4B.1";
  contract_schema_version: "4A-3.1";
  consumer_schema_version: "4A-3-CONSUMER.1";
  generated_at: string;
  source_run_id: string | null;
  source_seed: string | null;
  cohort_kind: Phase4B1CohortKind;
  summary: Phase4B7Summary;
  missing_taxonomy_families: Phase4BMethodFamilyId[];
  invalid_methods: Phase4B7ClosureRun["invalidMethods"];
  duplicate_method_ids: string[];
  prior_phase_checks: Phase4B7ClosureRun["priorPhaseChecks"];
  checks: Phase4B7ClosureRun["checks"];
  passed: boolean;
  results: Array<{
    question_id: string | null;
    question_code: string | null;
    learner_level: number | null;
    source_ready_for_method_selection: boolean;
    contract_status: "ready" | "blocked";
    phase_4b_consumer_status: "ready" | "blocked";
    taxonomy_coverage_status: "covered" | "uncovered" | "not_applicable";
    primary_families: Phase4BMethodFamilyId[];
    supporting_families: Phase4BMethodFamilyId[];
    candidate_method_ids: string[];
    primary_candidate_method_ids: string[];
    issue_codes: Phase4B7IssueCode[];
  }>;
};
