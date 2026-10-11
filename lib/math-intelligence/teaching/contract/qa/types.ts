import type { TeachingContractBuildDiagnostic } from "../types";
import type {
  TeachingContractValidationIssue,
} from "../validateTeachingContract";

export type Phase4A3QaCohortKind = "fixed" | "holdout" | "custom";

export type Phase4A3QaExpectation = {
  total: number | null;
  readyContracts: number | null;
  blockedContracts: number | null;
  byLevel: Record<string, number> | null;
};

export type Phase4A3QaQuestionResult = {
  questionId: string | null;
  questionCode: string | null;
  learnerLevel: number | null;
  sourceUnderstandingReadyForMethodSelection: boolean;
  contractStatus: "ready" | "blocked";
  contractFingerprint: string | null;
  deterministic: boolean;
  validationPassed: boolean;
  contractValidationIssues: TeachingContractValidationIssue[];
  buildBlockers: TeachingContractBuildDiagnostic[];
};

export type Phase4A3QaRun = {
  schemaVersion: "4A-3-QA.1";
  contractSchemaVersion: "4A-3.1";
  generatedAt: string;
  sourceRunId: string | null;
  sourceSeed: string | null;
  cohortKind: Phase4A3QaCohortKind;
  expectation: Phase4A3QaExpectation;
  summary: {
    total: number;
    readyContracts: number;
    blockedContracts: number;
    sourceReadyUnderstandings: number;
    sourceBlockedUnderstandings: number;
    sourceGateContractMismatches: number;
    invalidReadyContracts: number;
    determinismFailures: number;
    learnerAnswerLeakFailures: number;
    prematureMethodFailures: number;
    byLevel: Record<string, number>;
    buildBlockerCounts: Record<string, number>;
    validationIssueCounts: Record<string, number>;
  };
  checks: {
    totalMatchesExpectation: boolean;
    readyCountMatchesExpectation: boolean;
    blockedCountMatchesExpectation: boolean;
    levelBalanceMatchesExpectation: boolean;
    allReadyContractsValidate: boolean;
    allBuildsDeterministic: boolean;
    sourceGateMatchesContractStatus: boolean;
    noLearnerAnswerLeak: boolean;
    noPrematureTeachingMethod: boolean;
  };
  passed: boolean;
  results: Phase4A3QaQuestionResult[];
};

export type Phase4A3CompactExport = {
  schema_version: "4A-3-QA.1";
  contract_schema_version: "4A-3.1";
  generated_at: string;
  source_run_id: string | null;
  source_seed: string | null;
  cohort_kind: Phase4A3QaCohortKind;
  expectation: Phase4A3QaExpectation;
  summary: Phase4A3QaRun["summary"];
  checks: Phase4A3QaRun["checks"];
  passed: boolean;
  results: Array<{
    question_id: string | null;
    question_code: string | null;
    learner_level: number | null;
    source_ready_for_method_selection: boolean;
    contract_status: "ready" | "blocked";
    contract_fingerprint: string | null;
    deterministic: boolean;
    validation_passed: boolean;
    validation_issues: TeachingContractValidationIssue[];
    build_blockers: TeachingContractBuildDiagnostic[];
  }>;
};
