import type { TeachingContractBuildDiagnostic } from "../types";
import type { TeachingContractValidationIssue } from "../validateTeachingContract";
import type { TeachingContractConsumerBlocker } from "../consumer/types";

export const PHASE4A4_DIAGNOSTICS_SCHEMA_VERSION = "4A-4-DIAGNOSTICS.1" as const;

export type Phase4A4CohortKind = "fixed" | "holdout" | "custom";

export type Phase4A4AdminClassification =
  | "ready_for_pedagogy"
  | "expected_understanding_block"
  | "source_data_review"
  | "contract_integrity_failure";

export type Phase4A4AttentionSeverity = "none" | "review" | "blocking";

export type Phase4A4SourceDataReviewCandidate = {
  questionId: string | null;
  questionCode: string | null;
  learnerLevel: number | null;
  curriculumSkill: string | null;
  curriculumDomain: string | null;
  promptDomainSignal: string | null;
  existingMathIntelligenceDomain: string | null;
  reason: string;
};

export type Phase4A4QuestionDiagnostic = {
  questionId: string | null;
  questionCode: string | null;
  learnerLevel: number | null;
  understandingStatus: "ready" | "partial" | "needs_review";
  readyForMethodSelection: boolean;
  contractStatus: "ready" | "blocked";
  contractFingerprint: string | null;
  contractValidationPassed: boolean;
  phase4BConsumerReady: boolean;
  phase4CConsumerReady: boolean;
  internalValidationReady: boolean;
  answerValidationStatus: "matched" | "mismatched" | "not_checked";
  classification: Phase4A4AdminClassification;
  attentionSeverity: Phase4A4AttentionSeverity;
  diagnosticCodes: string[];
  buildBlockers: TeachingContractBuildDiagnostic[];
  contractValidationIssues: TeachingContractValidationIssue[];
  phase4BConsumerBlockers: TeachingContractConsumerBlocker[];
  phase4CConsumerBlockers: TeachingContractConsumerBlocker[];
  internalValidationReasons: string[];
  sourceDataReviewCandidate: Phase4A4SourceDataReviewCandidate | null;
};

export type Phase4A4DiagnosticsRun = {
  schemaVersion: typeof PHASE4A4_DIAGNOSTICS_SCHEMA_VERSION;
  contractSchemaVersion: "4A-3.1";
  consumerSchemaVersion: "4A-3-CONSUMER.1";
  generatedAt: string;
  sourceRunId: string | null;
  sourceSeed: string | null;
  cohortKind: Phase4A4CohortKind;
  summary: {
    total: number;
    readyForPedagogy: number;
    expectedUnderstandingBlocked: number;
    sourceDataReviewCandidates: number;
    contractIntegrityFailures: number;
    contractValidationFailures: number;
    phase4BConsumerFailures: number;
    phase4CConsumerFailures: number;
    internalValidationFailures: number;
    readyAnswerMismatches: number;
    answerNotChecked: number;
    missingQuestionIds: number;
    byLevel: Record<string, number>;
    diagnosticCounts: Record<string, number>;
  };
  checks: {
    phase4A3CohortQaStillPasses: boolean;
    everyReadyContractValidates: boolean;
    everyReadyContractReachesPhase4B: boolean;
    everyReadyContractReachesPhase4C: boolean;
    internalValidationPathAvailableForEveryReadyContract: boolean;
    noReadyAnswerMismatch: boolean;
    noMissingQuestionIds: boolean;
    blockedQuestionsRemainBlocked: boolean;
    sourceDataIssuesSeparatedFromEngineFailures: boolean;
  };
  passed: boolean;
  results: Phase4A4QuestionDiagnostic[];
  sourceDataReviewCandidates: Phase4A4SourceDataReviewCandidate[];
};

export type Phase4A4CompactExport = {
  schema_version: typeof PHASE4A4_DIAGNOSTICS_SCHEMA_VERSION;
  contract_schema_version: "4A-3.1";
  consumer_schema_version: "4A-3-CONSUMER.1";
  generated_at: string;
  source_run_id: string | null;
  source_seed: string | null;
  cohort_kind: Phase4A4CohortKind;
  summary: Phase4A4DiagnosticsRun["summary"];
  checks: Phase4A4DiagnosticsRun["checks"];
  passed: boolean;
  source_data_review_candidates: Array<{
    question_id: string | null;
    question_code: string | null;
    learner_level: number | null;
    curriculum_skill: string | null;
    curriculum_domain: string | null;
    prompt_domain_signal: string | null;
    existing_math_intelligence_domain: string | null;
    reason: string;
  }>;
  results: Array<{
    question_id: string | null;
    question_code: string | null;
    learner_level: number | null;
    understanding_status: "ready" | "partial" | "needs_review";
    ready_for_method_selection: boolean;
    contract_status: "ready" | "blocked";
    contract_fingerprint: string | null;
    contract_validation_passed: boolean;
    phase_4b_consumer_ready: boolean;
    phase_4c_consumer_ready: boolean;
    internal_validation_ready: boolean;
    answer_validation_status: "matched" | "mismatched" | "not_checked";
    classification: Phase4A4AdminClassification;
    attention_severity: Phase4A4AttentionSeverity;
    diagnostic_codes: string[];
    build_blockers: TeachingContractBuildDiagnostic[];
    contract_validation_issues: TeachingContractValidationIssue[];
    phase_4b_consumer_blockers: TeachingContractConsumerBlocker[];
    phase_4c_consumer_blockers: TeachingContractConsumerBlocker[];
    internal_validation_reasons: string[];
    source_data_review_candidate: Phase4A4CompactExport["source_data_review_candidates"][number] | null;
  }>;
};
