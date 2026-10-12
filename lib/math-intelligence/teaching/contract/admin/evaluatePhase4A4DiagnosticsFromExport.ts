import { runPhase4A2QaFromExport } from "../../qa/runPhase4A2QaFromExport";
import type { MathIntelligenceQaExportLike, Phase4A2QaItem } from "../../qa/types";

import { buildTeachingContract } from "../buildTeachingContract";
import {
  createPhase4BMethodLibraryContractView,
  createPhase4CStrategySelectorContractView,
} from "../consumer";
import {
  createInternalTeachingContractValidationView,
  INTERNAL_TEACHING_CONTRACT_VALIDATION_PURPOSE,
} from "../consumer/internalValidation";
import { runPhase4A3QaFromExport } from "../qa/runPhase4A3QaFromExport";
import {
  teachingContractFingerprint,
  validateTeachingContract,
} from "../validateTeachingContract";

import {
  PHASE4A4_DIAGNOSTICS_SCHEMA_VERSION,
  type Phase4A4AdminClassification,
  type Phase4A4CompactExport,
  type Phase4A4CohortKind,
  type Phase4A4DiagnosticsRun,
  type Phase4A4QuestionDiagnostic,
  type Phase4A4SourceDataReviewCandidate,
} from "./types";

function increment(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}

function asLevelLabel(level: number | null): string {
  return level && level >= 1 && level <= 6 ? `P${level}` : "unknown";
}

function inferCohortKind(seed: string | null): Phase4A4CohortKind {
  if (seed === "phase-2i-v1") return "fixed";
  if (seed === "phase-4a2c5-holdout-v1") return "holdout";
  return "custom";
}

function itemCode(item: Phase4A2QaItem): string {
  return item.questionCode ?? item.questionId ?? "unknown";
}

function promptDomainSignal(
  item: Phase4A2QaItem,
): { domain: string | null; confidence: number | null } {
  const evidence = item.understanding.evidence.find(
    (entry) =>
      entry.source === "rules" &&
      entry.code.startsWith("PROMPT_DOMAIN_") &&
      (entry.confidence ?? 0) >= 0.9 &&
      !entry.code.endsWith("_UNKNOWN"),
  );

  if (!evidence) return { domain: null, confidence: null };

  const suffix = evidence.code.slice("PROMPT_DOMAIN_".length);
  const map: Record<string, string> = {
    WHOLE_NUMBERS: "whole_numbers",
    WHOLE_NUMBERS_CONTEXT: "whole_numbers",
    AGE_RELATIONSHIP: "whole_numbers",
    SYMBOL_MAPPING: "logic",
    FRACTIONS: "fractions",
    PERCENTAGE: "percentage",
    RATIO: "ratio",
    TIME: "time",
    MONEY: "money",
    MEASUREMENT: "measurement",
    GEOMETRY: "geometry",
    DECIMALS: "decimals",
    DATA: "data",
    SPEED: "speed_rate",
    SPEED_RATE: "speed_rate",
    AVERAGE: "average",
    ALGEBRA: "algebra",
    PATTERNS: "patterns",
    LOGIC: "logic",
  };

  return {
    domain: map[suffix] ?? suffix.toLowerCase(),
    confidence: evidence.confidence ?? null,
  };
}

function probableCurriculumMappingIssue(
  item: Phase4A2QaItem,
): Phase4A4SourceDataReviewCandidate | null {
  const u = item.understanding;
  const hasBlockingConflict =
    u.gateDiagnostics.blockers.some(
      (blocker) => blocker.code === "GATE_BLOCKING_CONFLICT",
    ) ||
    u.issues.some(
      (issue) =>
        issue.severity === "blocking" &&
        issue.code === "UNDERSTANDING_CONFLICT",
    );

  if (!hasBlockingConflict || u.curriculumContext.selectedSource !== "primary_skill") {
    return null;
  }

  const prompt = promptDomainSignal(item);
  if (!prompt.domain || prompt.domain === u.curriculumContext.inferredDomain) {
    return null;
  }

  return {
    questionId: item.questionId,
    questionCode: item.questionCode,
    learnerLevel: u.learnerLevel,
    curriculumSkill: u.curriculumContext.primarySkill,
    curriculumDomain: u.curriculumContext.inferredDomain,
    promptDomainSignal: prompt.domain,
    existingMathIntelligenceDomain: item.existingProposal.domain,
    reason:
      "Primary curriculum mapping conflicts with a high-confidence prompt-domain signal. Review source mapping separately; Phase 4A-4 does not rewrite curriculum data.",
  };
}

const SOURCE_DATA_BUILD_CODES = new Set([
  "MISSING_QUESTION_ID",
  "QUESTION_ID_MISMATCH",
  "MISSING_LEARNER_LEVEL",
  "LEVEL_MISMATCH",
  "CANONICAL_NOT_READY",
]);

function classificationFor(args: {
  contractReady: boolean;
  integrityFailure: boolean;
  sourceDataCandidate: Phase4A4SourceDataReviewCandidate | null;
  buildBlockerCodes: string[];
}): Phase4A4AdminClassification {
  if (args.integrityFailure) return "contract_integrity_failure";
  if (args.contractReady) return "ready_for_pedagogy";
  if (
    args.sourceDataCandidate ||
    args.buildBlockerCodes.some((code) => SOURCE_DATA_BUILD_CODES.has(code))
  ) {
    return "source_data_review";
  }
  return "expected_understanding_block";
}

function compactCandidate(
  candidate: Phase4A4SourceDataReviewCandidate,
): Phase4A4CompactExport["source_data_review_candidates"][number] {
  return {
    question_id: candidate.questionId,
    question_code: candidate.questionCode,
    learner_level: candidate.learnerLevel,
    curriculum_skill: candidate.curriculumSkill,
    curriculum_domain: candidate.curriculumDomain,
    prompt_domain_signal: candidate.promptDomainSignal,
    existing_math_intelligence_domain: candidate.existingMathIntelligenceDomain,
    reason: candidate.reason,
  };
}

export function evaluatePhase4A4DiagnosticsFromExport(
  qaExport: MathIntelligenceQaExportLike,
): Phase4A4DiagnosticsRun {
  const phase4A2 = runPhase4A2QaFromExport(qaExport);
  const phase4A3 = runPhase4A3QaFromExport(qaExport);
  const cohortKind = inferCohortKind(phase4A2.sourceSeed);

  const byLevel: Record<string, number> = {};
  const diagnosticCounts: Record<string, number> = {};
  const sourceDataReviewCandidates: Phase4A4SourceDataReviewCandidate[] = [];

  let readyForPedagogy = 0;
  let expectedUnderstandingBlocked = 0;
  let contractIntegrityFailures = 0;
  let contractValidationFailures = 0;
  let phase4BConsumerFailures = 0;
  let phase4CConsumerFailures = 0;
  let internalValidationFailures = 0;
  let readyAnswerMismatches = 0;
  let answerNotChecked = 0;
  let missingQuestionIds = 0;
  let blockedQuestionsThatEscaped = 0;

  const results: Phase4A4QuestionDiagnostic[] = phase4A2.items.map((item: Phase4A2QaItem) => {
    const u = item.understanding;
    increment(byLevel, asLevelLabel(u.learnerLevel));
    if (!item.questionId) missingQuestionIds += 1;

    const build = buildTeachingContract(u);
    const sourceReady =
      u.status === "ready" &&
      u.readyForMethodSelection === true &&
      u.gateDiagnostics.readyFor4C === true &&
      u.gateDiagnostics.blockers.length === 0;

    if (!sourceReady && build.status === "ready") {
      blockedQuestionsThatEscaped += 1;
    }

    const sourceDataCandidate = probableCurriculumMappingIssue(item);
    if (sourceDataCandidate) sourceDataReviewCandidates.push(sourceDataCandidate);

    const diagnosticCodes: string[] = [];
    const buildBlockers = build.status === "blocked" ? build.blockers : [];
    buildBlockers.forEach((blocker) => diagnosticCodes.push(blocker.code));

    let contractValidationPassed = true;
    let contractValidationIssues: ReturnType<typeof validateTeachingContract>["issues"] = [];
    let phase4BConsumerReady = false;
    let phase4CConsumerReady = false;
    let phase4BConsumerBlockers: Phase4A4QuestionDiagnostic["phase4BConsumerBlockers"] = [];
    let phase4CConsumerBlockers: Phase4A4QuestionDiagnostic["phase4CConsumerBlockers"] = [];
    let internalValidationReady = false;
    let internalValidationReasons: string[] = [];
    let contractFingerprint: string | null = null;
    let integrityFailure = false;

    if (build.status === "ready") {
      contractFingerprint = teachingContractFingerprint(build.contract);
      const validation = validateTeachingContract(build.contract);
      contractValidationPassed = validation.valid;
      contractValidationIssues = validation.issues;
      validation.issues.forEach((issue) => diagnosticCodes.push(issue.code));

      if (!validation.valid) {
        contractValidationFailures += 1;
        integrityFailure = true;
      }

      const phase4B = createPhase4BMethodLibraryContractView(build);
      phase4BConsumerReady = phase4B.status === "ready";
      if (phase4B.status === "blocked") {
        phase4BConsumerFailures += 1;
        integrityFailure = true;
        phase4BConsumerBlockers = phase4B.blockers;
        phase4B.blockers.forEach((blocker) =>
          diagnosticCodes.push(`4B_${blocker.code}`),
        );
      }

      const phase4C = createPhase4CStrategySelectorContractView(build);
      phase4CConsumerReady = phase4C.status === "ready";
      if (phase4C.status === "blocked") {
        phase4CConsumerFailures += 1;
        integrityFailure = true;
        phase4CConsumerBlockers = phase4C.blockers;
        phase4C.blockers.forEach((blocker) =>
          diagnosticCodes.push(`4C_${blocker.code}`),
        );
      }

      const internal = createInternalTeachingContractValidationView(build, {
        purpose: INTERNAL_TEACHING_CONTRACT_VALIDATION_PURPOSE,
      });
      internalValidationReady = internal.status === "ready";
      if (internal.status === "blocked") {
        internalValidationFailures += 1;
        integrityFailure = true;
        internalValidationReasons = internal.reasons;
        diagnosticCodes.push("INTERNAL_VALIDATION_ACCESS_FAILED");
      }

      if (u.answerValidation.status === "mismatched") {
        readyAnswerMismatches += 1;
        integrityFailure = true;
        diagnosticCodes.push("READY_ANSWER_MISMATCH");
      }

      if (u.answerValidation.status === "not_checked") {
        answerNotChecked += 1;
        diagnosticCodes.push("ANSWER_NOT_CHECKED");
      }
    } else {
      if (u.answerValidation.status === "not_checked") answerNotChecked += 1;
      if (sourceDataCandidate) diagnosticCodes.push("SOURCE_DATA_MAPPING_REVIEW");
    }

    const classification = classificationFor({
      contractReady: build.status === "ready",
      integrityFailure,
      sourceDataCandidate,
      buildBlockerCodes: buildBlockers.map((item) => item.code),
    });

    if (classification === "ready_for_pedagogy") readyForPedagogy += 1;
    if (classification === "expected_understanding_block") expectedUnderstandingBlocked += 1;
    if (classification === "contract_integrity_failure") contractIntegrityFailures += 1;

    const attentionSeverity =
      classification === "contract_integrity_failure"
        ? "blocking"
        : classification === "source_data_review"
          ? "review"
          : "none";

    if (classification === "source_data_review") {
      diagnosticCodes.push("SOURCE_DATA_REVIEW");
    }

    diagnosticCodes.forEach((code) => increment(diagnosticCounts, code));

    return {
      questionId: item.questionId,
      questionCode: item.questionCode,
      learnerLevel: u.learnerLevel,
      understandingStatus: u.status,
      readyForMethodSelection: u.readyForMethodSelection,
      contractStatus: build.status,
      contractFingerprint,
      contractValidationPassed,
      phase4BConsumerReady,
      phase4CConsumerReady,
      internalValidationReady,
      answerValidationStatus: u.answerValidation.status,
      classification,
      attentionSeverity,
      diagnosticCodes: [...new Set(diagnosticCodes)],
      buildBlockers,
      contractValidationIssues,
      phase4BConsumerBlockers,
      phase4CConsumerBlockers,
      internalValidationReasons,
      sourceDataReviewCandidate: sourceDataCandidate,
    };
  });

  const sourceDataClassifiedCount = results.filter(
    (item) => item.classification === "source_data_review",
  ).length;

  const sourceDataIssuesSeparatedFromEngineFailures = sourceDataReviewCandidates.every(
    (candidate) =>
      results.some(
        (item) =>
          item.questionId === candidate.questionId &&
          item.classification === "source_data_review" &&
          item.attentionSeverity !== "blocking",
      ),
  );

  const checks = {
    phase4A3CohortQaStillPasses: phase4A3.passed,
    everyReadyContractValidates: contractValidationFailures === 0,
    everyReadyContractReachesPhase4B: phase4BConsumerFailures === 0,
    everyReadyContractReachesPhase4C: phase4CConsumerFailures === 0,
    internalValidationPathAvailableForEveryReadyContract:
      internalValidationFailures === 0,
    noReadyAnswerMismatch: readyAnswerMismatches === 0,
    noMissingQuestionIds: missingQuestionIds === 0,
    blockedQuestionsRemainBlocked: blockedQuestionsThatEscaped === 0,
    sourceDataIssuesSeparatedFromEngineFailures,
  };

  const passed = Object.values(checks).every(Boolean);

  // Keep the summary's source-data count tied to the final admin classification,
  // not just the narrower curriculum-conflict heuristic.
  return {
    schemaVersion: PHASE4A4_DIAGNOSTICS_SCHEMA_VERSION,
    contractSchemaVersion: "4A-3.1",
    consumerSchemaVersion: "4A-3-CONSUMER.1",
    generatedAt: new Date().toISOString(),
    sourceRunId: phase4A2.sourceRunId,
    sourceSeed: phase4A2.sourceSeed,
    cohortKind,
    summary: {
      total: results.length,
      readyForPedagogy,
      expectedUnderstandingBlocked,
      sourceDataReviewCandidates: sourceDataClassifiedCount,
      contractIntegrityFailures,
      contractValidationFailures,
      phase4BConsumerFailures,
      phase4CConsumerFailures,
      internalValidationFailures,
      readyAnswerMismatches,
      answerNotChecked,
      missingQuestionIds,
      byLevel,
      diagnosticCounts,
    },
    checks,
    passed,
    results,
    sourceDataReviewCandidates,
  };
}

export function toPhase4A4CompactExport(
  run: Phase4A4DiagnosticsRun,
): Phase4A4CompactExport {
  return {
    schema_version: PHASE4A4_DIAGNOSTICS_SCHEMA_VERSION,
    contract_schema_version: "4A-3.1",
    consumer_schema_version: "4A-3-CONSUMER.1",
    generated_at: run.generatedAt,
    source_run_id: run.sourceRunId,
    source_seed: run.sourceSeed,
    cohort_kind: run.cohortKind,
    summary: run.summary,
    checks: run.checks,
    passed: run.passed,
    source_data_review_candidates: run.sourceDataReviewCandidates.map(compactCandidate),
    results: run.results.map((item) => ({
      question_id: item.questionId,
      question_code: item.questionCode,
      learner_level: item.learnerLevel,
      understanding_status: item.understandingStatus,
      ready_for_method_selection: item.readyForMethodSelection,
      contract_status: item.contractStatus,
      contract_fingerprint: item.contractFingerprint,
      contract_validation_passed: item.contractValidationPassed,
      phase_4b_consumer_ready: item.phase4BConsumerReady,
      phase_4c_consumer_ready: item.phase4CConsumerReady,
      internal_validation_ready: item.internalValidationReady,
      answer_validation_status: item.answerValidationStatus,
      classification: item.classification,
      attention_severity: item.attentionSeverity,
      diagnostic_codes: item.diagnosticCodes,
      build_blockers: item.buildBlockers,
      contract_validation_issues: item.contractValidationIssues,
      phase_4b_consumer_blockers: item.phase4BConsumerBlockers,
      phase_4c_consumer_blockers: item.phase4CConsumerBlockers,
      internal_validation_reasons: item.internalValidationReasons,
      source_data_review_candidate: item.sourceDataReviewCandidate
        ? compactCandidate(item.sourceDataReviewCandidate)
        : null,
    })),
  };
}
