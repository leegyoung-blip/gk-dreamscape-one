import { runPhase4A2QaFromExport } from "../../qa/runPhase4A2QaFromExport";
import type { MathIntelligenceQaExportLike } from "../../qa/types";
import { buildTeachingContract } from "../../contract/buildTeachingContract";
import {
  createPhase4BMethodLibraryContractView,
  type TeachingContractConsumerEnvelope,
} from "../../contract/consumer";
import {
  PHASE4B_METHOD_FAMILIES,
  buildPhase4BQuestionCoverageRequirement,
  isKnownPhase4BMethodFamilyId,
} from "../taxonomy";
import type {
  Phase4B1CompactExport,
  Phase4B1CoverageAuditRun,
  Phase4B1CoverageSummary,
  Phase4B1QuestionAuditResult,
  Phase4B1CohortKind,
} from "./types";

const FIXED_SEED = "phase-2i-v1";
const HOLDOUT_SEED = "phase-4a2c5-holdout-v1";

function inferCohortKind(seed: string | null): Phase4B1CohortKind {
  if (seed === FIXED_SEED) return "fixed";
  if (seed === HOLDOUT_SEED) return "holdout";
  return "custom";
}

function increment(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}

function asLevel(level: number | null): string {
  return level && level >= 1 && level <= 6 ? `P${level}` : "unknown";
}

export function runPhase4B1CoverageAuditFromExport(
  qaExport: MathIntelligenceQaExportLike,
): Phase4B1CoverageAuditRun {
  const phase4A2Run = runPhase4A2QaFromExport(qaExport);
  const byLevel: Record<string, number> = {};
  const byDomain: Record<string, number> = {};
  const byStructure: Record<string, number> = {};
  const byReasoning: Record<string, number> = {};
  const byMethodFamily: Record<string, number> = {};
  const issueCounts: Record<string, number> = {};

  let readyForPedagogy = 0;
  let blockedBeforePhase4B = 0;
  let phase4BConsumerFailures = 0;
  let coveredReadyQuestions = 0;
  let uncoveredReadyQuestions = 0;

  const observedDomains = new Set<string>();
  const observedStructures = new Set<string>();
  const observedReasoning = new Set<string>();
  const observedMethodFamilies = new Set<string>();

  const results: Phase4B1QuestionAuditResult[] = phase4A2Run.items.map((item) => {
    const understanding = item.understanding;
    const sourceReady =
      understanding.status === "ready" &&
      understanding.readyForMethodSelection === true &&
      understanding.gateDiagnostics.readyFor4C === true &&
      understanding.gateDiagnostics.blockers.length === 0;

    increment(byLevel, asLevel(understanding.learnerLevel));

    const buildResult = buildTeachingContract(understanding);
    if (buildResult.status === "blocked") {
      blockedBeforePhase4B += 1;
      return {
        questionId: item.questionId,
        questionCode: item.questionCode,
        learnerLevel: understanding.learnerLevel,
        sourceReadyForMethodSelection: sourceReady,
        contractStatus: "blocked",
        phase4BConsumerStatus: "blocked",
        coverageStatus: "not_applicable",
        requirement: null,
        coverageIssues: [],
        buildBlockers: buildResult.blockers,
        consumerBlockers: [],
      };
    }

    readyForPedagogy += 1;
    const consumerResult = createPhase4BMethodLibraryContractView(buildResult);
    if (consumerResult.status === "blocked") {
      phase4BConsumerFailures += 1;
      increment(issueCounts, "PHASE4B_CONSUMER_NOT_READY");
      return {
        questionId: item.questionId,
        questionCode: item.questionCode,
        learnerLevel: understanding.learnerLevel,
        sourceReadyForMethodSelection: sourceReady,
        contractStatus: "ready",
        phase4BConsumerStatus: "blocked",
        coverageStatus: "uncovered",
        requirement: null,
        coverageIssues: [
          {
            code: "PHASE4B_CONSUMER_NOT_READY",
            message: "Ready Teaching Contract could not cross the Phase 4B consumer boundary.",
            path: null,
          },
        ],
        buildBlockers: [],
        consumerBlockers: consumerResult.blockers,
      };
    }

    const envelope = consumerResult.envelope as TeachingContractConsumerEnvelope;
    const coverage = buildPhase4BQuestionCoverageRequirement(envelope);

    if (coverage.requirement) {
      const requirement = coverage.requirement;
      observedDomains.add(requirement.domain);
      observedStructures.add(requirement.problemStructure);
      increment(byDomain, requirement.domain);
      increment(byStructure, requirement.problemStructure);

      requirement.requiredReasoning.forEach((reasoning) => {
        observedReasoning.add(reasoning);
        increment(byReasoning, reasoning);
      });

      requirement.allCandidateFamilies.forEach((familyId) => {
        observedMethodFamilies.add(familyId);
        increment(byMethodFamily, familyId);
      });
    }

    coverage.issues.forEach((issue) => increment(issueCounts, issue.code));

    if (coverage.status === "covered") coveredReadyQuestions += 1;
    else uncoveredReadyQuestions += 1;

    return {
      questionId: item.questionId,
      questionCode: item.questionCode,
      learnerLevel: understanding.learnerLevel,
      sourceReadyForMethodSelection: sourceReady,
      contractStatus: "ready",
      phase4BConsumerStatus: "ready",
      coverageStatus: coverage.status,
      requirement: coverage.requirement,
      coverageIssues: coverage.issues,
      buildBlockers: [],
      consumerBlockers: [],
    };
  });

  const totalSampleItems = results.length;
  const coveragePercent =
    readyForPedagogy === 0
      ? 100
      : Number(((coveredReadyQuestions / readyForPedagogy) * 100).toFixed(2));

  const summary: Phase4B1CoverageSummary = {
    totalSampleItems,
    readyForPedagogy,
    blockedBeforePhase4B,
    phase4BConsumerFailures,
    coveredReadyQuestions,
    uncoveredReadyQuestions,
    coveragePercent,
    uniqueDomains: observedDomains.size,
    uniqueStructures: observedStructures.size,
    uniqueReasoningFamilies: observedReasoning.size,
    uniqueMethodFamiliesRequired: observedMethodFamilies.size,
    byLevel,
    byDomain,
    byStructure,
    byReasoning,
    byMethodFamily,
    issueCounts,
  };

  const hasGenericFallback = PHASE4B_METHOD_FAMILIES.some(
    (family) => family.genericFallback !== false,
  );
  const allFamilyIdsKnown = [...observedMethodFamilies].every((familyId) =>
    isKnownPhase4BMethodFamilyId(familyId),
  );

  const checks = {
    phase4BConsumerBoundaryPasses: phase4BConsumerFailures === 0,
    everyReadyQuestionCoveredByTaxonomy: uncoveredReadyQuestions === 0,
    everyObservedStructureMapped: (issueCounts.UNMAPPED_STRUCTURE ?? 0) === 0,
    everyObservedReasoningMapped: (issueCounts.UNMAPPED_REASONING ?? 0) === 0,
    noGenericFallbackFamily: !hasGenericFallback,
    allReferencedFamilyIdsKnown: allFamilyIdsKnown,
  };

  return {
    schemaVersion: "4B-1-QA.1",
    taxonomySchemaVersion: "4B-1.1",
    contractSchemaVersion: "4A-3.1",
    consumerSchemaVersion: "4A-3-CONSUMER.1",
    generatedAt: new Date().toISOString(),
    sourceRunId: phase4A2Run.sourceRunId,
    sourceSeed: phase4A2Run.sourceSeed,
    cohortKind: inferCohortKind(phase4A2Run.sourceSeed),
    summary,
    checks,
    passed: Object.values(checks).every(Boolean),
    results,
  };
}

export function toPhase4B1CompactExport(
  run: Phase4B1CoverageAuditRun,
): Phase4B1CompactExport {
  return {
    schema_version: "4B-1-QA.1",
    taxonomy_schema_version: "4B-1.1",
    contract_schema_version: "4A-3.1",
    consumer_schema_version: "4A-3-CONSUMER.1",
    generated_at: run.generatedAt,
    source_run_id: run.sourceRunId,
    source_seed: run.sourceSeed,
    cohort_kind: run.cohortKind,
    summary: run.summary,
    checks: run.checks,
    passed: run.passed,
    results: run.results.map((item) => ({
      question_id: item.questionId,
      question_code: item.questionCode,
      learner_level: item.learnerLevel,
      source_ready_for_method_selection: item.sourceReadyForMethodSelection,
      contract_status: item.contractStatus,
      phase_4b_consumer_status: item.phase4BConsumerStatus,
      coverage_status: item.coverageStatus,
      primary_families: item.requirement?.primaryFamilies ?? [],
      supporting_families: item.requirement?.supportingFamilies ?? [],
      coverage_issues: item.coverageIssues,
      build_blockers: item.buildBlockers,
      consumer_blockers: item.consumerBlockers,
    })),
  };
}
