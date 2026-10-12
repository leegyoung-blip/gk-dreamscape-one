import { runPhase4A2QaFromExport } from "../../qa/runPhase4A2QaFromExport";
import type { MathIntelligenceQaExportLike } from "../../qa/types";
import { buildTeachingContract } from "../../contract/buildTeachingContract";
import {
  createPhase4BMethodLibraryContractView,
  type TeachingContractConsumerEnvelope,
} from "../../contract/consumer";
import {
  PHASE4B_ALL_PRODUCTION_METHODS,
  listPhase4BProductionCandidateMethods,
} from "../methods";
import { validateTeachingMethod } from "../schema/validateTeachingMethod";
import {
  PHASE4B_METHOD_FAMILIES,
  buildPhase4BQuestionCoverageRequirement,
} from "../taxonomy";
import type { Phase4BMethodFamilyId } from "../taxonomy/types";
import { runPhase4B1CoverageAuditFromExport } from "./runPhase4B1CoverageAuditFromExport";
import { runPhase4B2SchemaGovernanceAudit } from "./runPhase4B2SchemaGovernanceAudit";
import { runPhase4B3NumberArithmeticLibraryAudit } from "./runPhase4B3NumberArithmeticLibraryAudit";
import { runPhase4B4WordProblemHeuristicsAudit } from "./runPhase4B4WordProblemHeuristicsAudit";
import { runPhase4B5RationalNumberAudit } from "./runPhase4B5RationalNumberAudit";
import { runPhase4B6MeasurementGeometryDataAudit } from "./runPhase4B6MeasurementGeometryDataAudit";
import type { Phase4B1CohortKind } from "./types";
import {
  PHASE4B7_QA_SCHEMA_VERSION,
  type Phase4B7ClosureRun,
  type Phase4B7CompactExport,
  type Phase4B7IssueCode,
  type Phase4B7QuestionResult,
} from "./types4B7";

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

function ids(methods: ReadonlyArray<{ methodId: string }>): string[] {
  return methods.map((method) => method.methodId);
}

function sameOrderedStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function duplicateStrings(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  values.forEach((value) => {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  });
  return [...duplicates].sort();
}

function candidateSatisfiesQuery(
  method: (typeof PHASE4B_ALL_PRODUCTION_METHODS)[number],
  requirement: {
    learnerLevel: number;
    domain: string;
    problemStructure: string;
    requiredReasoning: readonly string[];
    allCandidateFamilies: readonly Phase4BMethodFamilyId[];
  },
): boolean {
  if (method.status !== "active") return false;
  if (!requirement.allCandidateFamilies.includes(method.familyId)) return false;
  if (!method.applicability.levels.includes(requirement.learnerLevel as 1 | 2 | 3 | 4 | 5 | 6)) return false;
  if (!method.applicability.domains.includes(requirement.domain as any)) return false;
  if (!method.applicability.structures.includes(requirement.problemStructure as any)) return false;
  return method.applicability.reasoning.some((reasoning) =>
    requirement.requiredReasoning.includes(reasoning),
  );
}

export function runPhase4B7LibraryClosureAuditFromExport(
  qaExport: MathIntelligenceQaExportLike,
): Phase4B7ClosureRun {
  const phase4A2Run = runPhase4A2QaFromExport(qaExport);
  const cohortKind = inferCohortKind(phase4A2Run.sourceSeed);

  const prior4B1 = runPhase4B1CoverageAuditFromExport(qaExport);
  const prior4B2 = runPhase4B2SchemaGovernanceAudit();
  const prior4B3 = runPhase4B3NumberArithmeticLibraryAudit();
  const prior4B4 = runPhase4B4WordProblemHeuristicsAudit();
  const prior4B5 = runPhase4B5RationalNumberAudit();
  const prior4B6 = runPhase4B6MeasurementGeometryDataAudit();

  const methodValidation = PHASE4B_ALL_PRODUCTION_METHODS.map((method) => ({
    method,
    validation: validateTeachingMethod(method),
  }));
  const invalidMethods = methodValidation
    .filter((item) => !item.validation.valid)
    .map((item) => ({
      methodId: item.method.methodId,
      blockers: item.validation.blockers,
    }));

  const duplicateMethodIds = duplicateStrings(
    PHASE4B_ALL_PRODUCTION_METHODS.map((method) => method.methodId),
  );

  const activeMethods = PHASE4B_ALL_PRODUCTION_METHODS.filter(
    (method) => method.status === "active",
  );
  const activeFamilies = new Set(activeMethods.map((method) => method.familyId));
  const missingTaxonomyFamilies = PHASE4B_METHOD_FAMILIES
    .map((family) => family.familyId)
    .filter((familyId) => !activeFamilies.has(familyId));

  const byLevel: Record<string, number> = {};
  const byPrimaryFamily: Record<string, number> = {};
  const byCandidateMethod: Record<string, number> = {};
  const issueCounts: Record<string, number> = {};

  let readyForPedagogy = 0;
  let blockedBeforePhase4B = 0;
  let phase4BConsumerFailures = 0;
  let taxonomyUncoveredReady = 0;
  let readyWithCandidateMethods = 0;
  let readyWithoutCandidateMethods = 0;
  let readyWithPrimaryFamilyCandidate = 0;
  let readyWithoutPrimaryFamilyCandidate = 0;
  let candidateLookupDeterminismFailures = 0;
  let candidateApplicabilityFailures = 0;
  let blockedQuestionBoundaryLeaks = 0;
  const candidateCounts: number[] = [];

  const results: Phase4B7QuestionResult[] = phase4A2Run.items.map((item) => {
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
      if (sourceReady) {
        blockedQuestionBoundaryLeaks += 1;
        increment(issueCounts, "BLOCKED_QUESTION_CROSSED_BOUNDARY");
      }
      return {
        questionId: item.questionId,
        questionCode: item.questionCode,
        learnerLevel: understanding.learnerLevel,
        sourceReadyForMethodSelection: sourceReady,
        contractStatus: "blocked",
        phase4BConsumerStatus: "blocked",
        taxonomyCoverageStatus: "not_applicable",
        primaryFamilies: [],
        supportingFamilies: [],
        candidateMethodIds: [],
        primaryCandidateMethodIds: [],
        issueCodes: sourceReady ? ["BLOCKED_QUESTION_CROSSED_BOUNDARY"] : [],
      };
    }

    readyForPedagogy += 1;
    const issueCodes: Phase4B7IssueCode[] = [];
    const consumerResult = createPhase4BMethodLibraryContractView(buildResult);
    if (consumerResult.status === "blocked") {
      phase4BConsumerFailures += 1;
      issueCodes.push("PHASE4B_CONSUMER_NOT_READY");
      increment(issueCounts, "PHASE4B_CONSUMER_NOT_READY");
      return {
        questionId: item.questionId,
        questionCode: item.questionCode,
        learnerLevel: understanding.learnerLevel,
        sourceReadyForMethodSelection: sourceReady,
        contractStatus: "ready",
        phase4BConsumerStatus: "blocked",
        taxonomyCoverageStatus: "uncovered",
        primaryFamilies: [],
        supportingFamilies: [],
        candidateMethodIds: [],
        primaryCandidateMethodIds: [],
        issueCodes,
      };
    }

    const envelope = consumerResult.envelope as TeachingContractConsumerEnvelope;
    const coverage = buildPhase4BQuestionCoverageRequirement(envelope);
    if (coverage.status !== "covered" || !coverage.requirement) {
      taxonomyUncoveredReady += 1;
      issueCodes.push("TAXONOMY_NOT_COVERED");
      increment(issueCounts, "TAXONOMY_NOT_COVERED");
      return {
        questionId: item.questionId,
        questionCode: item.questionCode,
        learnerLevel: understanding.learnerLevel,
        sourceReadyForMethodSelection: sourceReady,
        contractStatus: "ready",
        phase4BConsumerStatus: "ready",
        taxonomyCoverageStatus: "uncovered",
        primaryFamilies: coverage.requirement?.primaryFamilies ?? [],
        supportingFamilies: coverage.requirement?.supportingFamilies ?? [],
        candidateMethodIds: [],
        primaryCandidateMethodIds: [],
        issueCodes,
      };
    }

    const requirement = coverage.requirement;
    requirement.primaryFamilies.forEach((familyId) => increment(byPrimaryFamily, familyId));

    const query = {
      learnerLevel: requirement.learnerLevel as 1 | 2 | 3 | 4 | 5 | 6,
      domain: requirement.domain,
      problemStructure: requirement.problemStructure,
      requiredReasoning: [...requirement.requiredReasoning],
      candidateFamilies: [...requirement.allCandidateFamilies],
    };

    const firstCandidates = listPhase4BProductionCandidateMethods(query);
    const secondCandidates = listPhase4BProductionCandidateMethods(query);
    const candidateMethodIds = ids(firstCandidates);
    const secondCandidateIds = ids(secondCandidates);
    const primaryFamilySet = new Set(requirement.primaryFamilies);
    const primaryCandidateMethodIds = firstCandidates
      .filter((method) => primaryFamilySet.has(method.familyId))
      .map((method) => method.methodId);

    candidateCounts.push(candidateMethodIds.length);
    candidateMethodIds.forEach((methodId) => increment(byCandidateMethod, methodId));

    if (candidateMethodIds.length === 0) {
      readyWithoutCandidateMethods += 1;
      issueCodes.push("NO_PRODUCTION_CANDIDATE");
      increment(issueCounts, "NO_PRODUCTION_CANDIDATE");
    } else {
      readyWithCandidateMethods += 1;
    }

    if (primaryCandidateMethodIds.length === 0) {
      readyWithoutPrimaryFamilyCandidate += 1;
      issueCodes.push("NO_PRIMARY_FAMILY_CANDIDATE");
      increment(issueCounts, "NO_PRIMARY_FAMILY_CANDIDATE");
    } else {
      readyWithPrimaryFamilyCandidate += 1;
    }

    if (!sameOrderedStrings(candidateMethodIds, secondCandidateIds)) {
      candidateLookupDeterminismFailures += 1;
      issueCodes.push("CANDIDATE_LOOKUP_NONDETERMINISTIC");
      increment(issueCounts, "CANDIDATE_LOOKUP_NONDETERMINISTIC");
    }

    const invalidCandidate = firstCandidates.some(
      (method) => !candidateSatisfiesQuery(method, requirement),
    );
    if (invalidCandidate) {
      candidateApplicabilityFailures += 1;
      issueCodes.push("CANDIDATE_APPLICABILITY_MISMATCH");
      increment(issueCounts, "CANDIDATE_APPLICABILITY_MISMATCH");
    }

    return {
      questionId: item.questionId,
      questionCode: item.questionCode,
      learnerLevel: understanding.learnerLevel,
      sourceReadyForMethodSelection: sourceReady,
      contractStatus: "ready",
      phase4BConsumerStatus: "ready",
      taxonomyCoverageStatus: "covered",
      primaryFamilies: [...requirement.primaryFamilies],
      supportingFamilies: [...requirement.supportingFamilies],
      candidateMethodIds,
      primaryCandidateMethodIds,
      issueCodes,
    };
  });

  const expectedReady =
    cohortKind === "fixed" ? 179 : cohortKind === "holdout" ? 141 : null;
  const averageCandidatesPerReadyQuestion = candidateCounts.length
    ? Number(
        (
          candidateCounts.reduce((sum, count) => sum + count, 0) /
          candidateCounts.length
        ).toFixed(2),
      )
    : 0;

  const summary = {
    totalSampleItems: results.length,
    readyForPedagogy,
    blockedBeforePhase4B,
    phase4BConsumerFailures,
    taxonomyUncoveredReady,
    readyWithCandidateMethods,
    readyWithoutCandidateMethods,
    readyWithPrimaryFamilyCandidate,
    readyWithoutPrimaryFamilyCandidate,
    candidateLookupDeterminismFailures,
    candidateApplicabilityFailures,
    totalProductionMethods: PHASE4B_ALL_PRODUCTION_METHODS.length,
    activeProductionMethods: activeMethods.length,
    taxonomyFamilies: PHASE4B_METHOD_FAMILIES.length,
    familiesWithProductionMethods: activeFamilies.size,
    invalidProductionMethods: invalidMethods.length,
    duplicateMethodIds: duplicateMethodIds.length,
    minCandidatesPerReadyQuestion: candidateCounts.length ? Math.min(...candidateCounts) : 0,
    maxCandidatesPerReadyQuestion: candidateCounts.length ? Math.max(...candidateCounts) : 0,
    averageCandidatesPerReadyQuestion,
    byLevel,
    byPrimaryFamily,
    byCandidateMethod,
    issueCounts,
  };

  const priorPhaseChecks = {
    phase4B1: prior4B1.passed,
    phase4B2: prior4B2.passed,
    phase4B3: prior4B3.passed,
    phase4B4: prior4B4.passed,
    phase4B5: prior4B5.passed,
    phase4B6: prior4B6.passed,
  };

  const noGenericFallback = PHASE4B_METHOD_FAMILIES.every(
    (family) => family.genericFallback === false,
  );
  const noLunaOrPersistenceEscapeHatch = PHASE4B_ALL_PRODUCTION_METHODS.every(
    (method) =>
      method.governance.lunaAllowed === false &&
      method.governance.persistence === "version_controlled_source" &&
      method.governance.deterministicOnly === true,
  );

  const checks = {
    phase4B1CohortCoverageStillPasses: priorPhaseChecks.phase4B1,
    phase4B2SchemaGovernanceStillPasses: priorPhaseChecks.phase4B2,
    phase4B3LibraryStillPasses: priorPhaseChecks.phase4B3,
    phase4B4LibraryStillPasses: priorPhaseChecks.phase4B4,
    phase4B5LibraryStillPasses: priorPhaseChecks.phase4B5,
    phase4B6LibraryStillPasses: priorPhaseChecks.phase4B6,
    everyTaxonomyFamilyHasProductionMethod: missingTaxonomyFamilies.length === 0,
    allProductionMethodsValidate: invalidMethods.length === 0,
    allProductionMethodIdsUnique: duplicateMethodIds.length === 0,
    phase4BConsumerBoundaryPasses: phase4BConsumerFailures === 0,
    everyReadyQuestionHasCandidateMethod: readyWithoutCandidateMethods === 0,
    everyReadyQuestionHasPrimaryFamilyCandidate: readyWithoutPrimaryFamilyCandidate === 0,
    candidateLookupDeterministic: candidateLookupDeterminismFailures === 0,
    allCandidateMethodsSatisfyApplicability: candidateApplicabilityFailures === 0,
    blockedQuestionsRemainBlocked: blockedQuestionBoundaryLeaks === 0,
    knownCohortReadyCountMatches: expectedReady === null || readyForPedagogy === expectedReady,
    noGenericFallbackFamily: noGenericFallback,
    noLunaOrPersistenceEscapeHatch,
  };

  return {
    schemaVersion: PHASE4B7_QA_SCHEMA_VERSION,
    taxonomySchemaVersion: "4B-1.1",
    methodSchemaVersion: "4B.1",
    contractSchemaVersion: "4A-3.1",
    consumerSchemaVersion: "4A-3-CONSUMER.1",
    generatedAt: new Date().toISOString(),
    sourceRunId: phase4A2Run.sourceRunId,
    sourceSeed: phase4A2Run.sourceSeed,
    cohortKind,
    summary,
    missingTaxonomyFamilies,
    invalidMethods,
    duplicateMethodIds,
    priorPhaseChecks,
    checks,
    passed: Object.values(checks).every(Boolean),
    results,
  };
}

export function toPhase4B7CompactExport(
  run: Phase4B7ClosureRun,
): Phase4B7CompactExport {
  return {
    schema_version: PHASE4B7_QA_SCHEMA_VERSION,
    taxonomy_schema_version: "4B-1.1",
    method_schema_version: "4B.1",
    contract_schema_version: "4A-3.1",
    consumer_schema_version: "4A-3-CONSUMER.1",
    generated_at: run.generatedAt,
    source_run_id: run.sourceRunId,
    source_seed: run.sourceSeed,
    cohort_kind: run.cohortKind,
    summary: run.summary,
    missing_taxonomy_families: run.missingTaxonomyFamilies,
    invalid_methods: run.invalidMethods,
    duplicate_method_ids: run.duplicateMethodIds,
    prior_phase_checks: run.priorPhaseChecks,
    checks: run.checks,
    passed: run.passed,
    results: run.results.map((item) => ({
      question_id: item.questionId,
      question_code: item.questionCode,
      learner_level: item.learnerLevel,
      source_ready_for_method_selection: item.sourceReadyForMethodSelection,
      contract_status: item.contractStatus,
      phase_4b_consumer_status: item.phase4BConsumerStatus,
      taxonomy_coverage_status: item.taxonomyCoverageStatus,
      primary_families: item.primaryFamilies,
      supporting_families: item.supportingFamilies,
      candidate_method_ids: item.candidateMethodIds,
      primary_candidate_method_ids: item.primaryCandidateMethodIds,
      issue_codes: item.issueCodes,
    })),
  };
}
