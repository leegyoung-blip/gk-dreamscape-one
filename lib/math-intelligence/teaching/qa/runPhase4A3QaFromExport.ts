import {
  runPhase4A2QaFromExport,
} from "../../qa/runPhase4A2QaFromExport";
import type {
  MathIntelligenceQaExportLike,
} from "../../qa/types";

import {
  buildTeachingContract,
} from "../buildTeachingContract";
import {
  stableStringify,
  teachingContractFingerprint,
  validateTeachingContract,
} from "../validateTeachingContract";

import type {
  Phase4A3CompactExport,
  Phase4A3QaCohortKind,
  Phase4A3QaExpectation,
  Phase4A3QaQuestionResult,
  Phase4A3QaRun,
} from "./types";

export const PHASE4A3_FIXED_SEED = "phase-2i-v1";
export const PHASE4A3_HOLDOUT_SEED = "phase-4a2c5-holdout-v1";

export const PHASE4A3_LOCKED_EXPECTATIONS: Record<
  Exclude<Phase4A3QaCohortKind, "custom">,
  Phase4A3QaExpectation
> = {
  fixed: {
    total: 240,
    readyContracts: 179,
    blockedContracts: 61,
    byLevel: {
      P1: 40,
      P2: 40,
      P3: 40,
      P4: 40,
      P5: 40,
      P6: 40,
    },
  },
  holdout: {
    total: 240,
    readyContracts: 141,
    blockedContracts: 99,
    byLevel: {
      P1: 40,
      P2: 40,
      P3: 40,
      P4: 40,
      P5: 40,
      P6: 40,
    },
  },
};

function asLevelLabel(level: number | null): string {
  return level && level >= 1 && level <= 6 ? `P${level}` : "unknown";
}

function increment(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}

function inferCohortKind(seed: string | null): Phase4A3QaCohortKind {
  if (seed === PHASE4A3_FIXED_SEED) return "fixed";
  if (seed === PHASE4A3_HOLDOUT_SEED) return "holdout";
  return "custom";
}

function expectationFor(
  cohortKind: Phase4A3QaCohortKind,
): Phase4A3QaExpectation {
  if (cohortKind === "fixed") return PHASE4A3_LOCKED_EXPECTATIONS.fixed;
  if (cohortKind === "holdout") return PHASE4A3_LOCKED_EXPECTATIONS.holdout;
  return {
    total: null,
    readyContracts: null,
    blockedContracts: null,
    byLevel: null,
  };
}

function matchesExpectedNumber(actual: number, expected: number | null): boolean {
  return expected == null || actual === expected;
}

function matchesExpectedBreakdown(
  actual: Record<string, number>,
  expected: Record<string, number> | null,
): boolean {
  if (!expected) return true;

  return Object.entries(expected).every(
    ([key, value]) => (actual[key] ?? 0) === value,
  );
}

export function runPhase4A3QaFromExport(
  qaExport: MathIntelligenceQaExportLike,
): Phase4A3QaRun {
  const phase4A2Run = runPhase4A2QaFromExport(qaExport);
  const cohortKind = inferCohortKind(phase4A2Run.sourceSeed);
  const expectation = expectationFor(cohortKind);

  const byLevel: Record<string, number> = {};
  const buildBlockerCounts: Record<string, number> = {};
  const validationIssueCounts: Record<string, number> = {};

  let readyContracts = 0;
  let blockedContracts = 0;
  let sourceReadyUnderstandings = 0;
  let sourceBlockedUnderstandings = 0;
  let sourceGateContractMismatches = 0;
  let invalidReadyContracts = 0;
  let determinismFailures = 0;
  let learnerAnswerLeakFailures = 0;
  let prematureMethodFailures = 0;

  const results: Phase4A3QaQuestionResult[] = phase4A2Run.items.map((item) => {
    const understanding = item.understanding;
    const sourceReady =
      understanding.status === "ready" &&
      understanding.readyForMethodSelection === true &&
      understanding.gateDiagnostics.readyFor4C === true &&
      understanding.gateDiagnostics.blockers.length === 0;

    if (sourceReady) sourceReadyUnderstandings += 1;
    else sourceBlockedUnderstandings += 1;

    increment(byLevel, asLevelLabel(understanding.learnerLevel));

    const first = buildTeachingContract(understanding);
    const second = buildTeachingContract(understanding);
    const deterministic = stableStringify(first) === stableStringify(second);

    if (!deterministic) determinismFailures += 1;

    const contractReady = first.status === "ready";
    if (contractReady) readyContracts += 1;
    else blockedContracts += 1;

    if (contractReady !== sourceReady) sourceGateContractMismatches += 1;

    if (first.status === "blocked") {
      first.blockers.forEach((blocker) => increment(buildBlockerCounts, blocker.code));

      return {
        questionId: item.questionId,
        questionCode: item.questionCode,
        learnerLevel: understanding.learnerLevel,
        sourceUnderstandingReadyForMethodSelection: sourceReady,
        contractStatus: "blocked",
        contractFingerprint: null,
        deterministic,
        validationPassed: true,
        contractValidationIssues: [],
        buildBlockers: first.blockers,
      };
    }

    const validation = validateTeachingContract(first.contract);
    validation.issues.forEach((issue) => increment(validationIssueCounts, issue.code));

    if (!validation.valid) invalidReadyContracts += 1;
    if (
      validation.issues.some((issue) => issue.code === "LEARNER_CONTENT_ANSWER_LEAK")
    ) {
      learnerAnswerLeakFailures += 1;
    }
    if (
      validation.issues.some(
        (issue) => issue.code === "TEACHING_METHOD_PREMATURELY_PRESENT",
      )
    ) {
      prematureMethodFailures += 1;
    }

    return {
      questionId: item.questionId,
      questionCode: item.questionCode,
      learnerLevel: understanding.learnerLevel,
      sourceUnderstandingReadyForMethodSelection: sourceReady,
      contractStatus: "ready",
      contractFingerprint: teachingContractFingerprint(first.contract),
      deterministic,
      validationPassed: validation.valid,
      contractValidationIssues: validation.issues,
      buildBlockers: [],
    };
  });

  const total = results.length;

  const checks = {
    totalMatchesExpectation: matchesExpectedNumber(total, expectation.total),
    readyCountMatchesExpectation: matchesExpectedNumber(
      readyContracts,
      expectation.readyContracts,
    ),
    blockedCountMatchesExpectation: matchesExpectedNumber(
      blockedContracts,
      expectation.blockedContracts,
    ),
    levelBalanceMatchesExpectation: matchesExpectedBreakdown(
      byLevel,
      expectation.byLevel,
    ),
    allReadyContractsValidate: invalidReadyContracts === 0,
    allBuildsDeterministic: determinismFailures === 0,
    sourceGateMatchesContractStatus: sourceGateContractMismatches === 0,
    noLearnerAnswerLeak: learnerAnswerLeakFailures === 0,
    noPrematureTeachingMethod: prematureMethodFailures === 0,
  };

  const passed = Object.values(checks).every(Boolean);

  return {
    schemaVersion: "4A-3-QA.1",
    contractSchemaVersion: "4A-3.1",
    generatedAt: new Date().toISOString(),
    sourceRunId: phase4A2Run.sourceRunId,
    sourceSeed: phase4A2Run.sourceSeed,
    cohortKind,
    expectation,
    summary: {
      total,
      readyContracts,
      blockedContracts,
      sourceReadyUnderstandings,
      sourceBlockedUnderstandings,
      sourceGateContractMismatches,
      invalidReadyContracts,
      determinismFailures,
      learnerAnswerLeakFailures,
      prematureMethodFailures,
      byLevel,
      buildBlockerCounts,
      validationIssueCounts,
    },
    checks,
    passed,
    results,
  };
}

export function toPhase4A3CompactExport(
  run: Phase4A3QaRun,
): Phase4A3CompactExport {
  return {
    schema_version: "4A-3-QA.1",
    contract_schema_version: "4A-3.1",
    generated_at: run.generatedAt,
    source_run_id: run.sourceRunId,
    source_seed: run.sourceSeed,
    cohort_kind: run.cohortKind,
    expectation: run.expectation,
    summary: run.summary,
    checks: run.checks,
    passed: run.passed,
    results: run.results.map((result) => ({
      question_id: result.questionId,
      question_code: result.questionCode,
      learner_level: result.learnerLevel,
      source_ready_for_method_selection:
        result.sourceUnderstandingReadyForMethodSelection,
      contract_status: result.contractStatus,
      contract_fingerprint: result.contractFingerprint,
      deterministic: result.deterministic,
      validation_passed: result.validationPassed,
      validation_issues: result.contractValidationIssues,
      build_blockers: result.buildBlockers,
    })),
  };
}
