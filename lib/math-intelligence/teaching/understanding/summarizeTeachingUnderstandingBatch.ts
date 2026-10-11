import type {
  BatchUnderstandingSummary,
  TeachingQuestionUnderstanding,
} from "./types";

function bump(
  target: Record<string, number>,
  key: string | null | undefined,
): void {
  const resolved =
    key && key.trim()
      ? key
      : "unknown";

  target[resolved] =
    (target[resolved] ?? 0) + 1;
}

export function summarizeTeachingUnderstandingBatch(
  items: TeachingQuestionUnderstanding[],
): BatchUnderstandingSummary {
  const summary: BatchUnderstandingSummary = {
    schemaVersion: "4A-2.4",
    total: items.length,

    status: {
      ready: 0,
      partial: 0,
      needs_review: 0,
    },

    strictlyReadyFor4C: 0,
    blockedFrom4C: 0,
    readyForMethodSelection: 0,

    byLevel: {},
    byDomain: {},
    byProblemStructure: {},
    byVisualRole: {},
    byCurriculumSource: {},
    byDomainResolution: {},
    byStructureResolution: {},
    byReasoningResolution: {},
    byAnswerValidation: {},

    gateDiagnosticCounts: {},
    genericFallbackQuestions: 0,
    lowConfidenceQuestions: 0,
    unresolvedQuestions: 0,
    blockingConflictQuestions: 0,
    rawConflictEvidence: 0,
    supersededEvidence: 0,

    issueCounts: {},
    evidenceRelationshipCounts: {},
  };

  for (const item of items) {
    summary.status[item.status] += 1;

    if (item.readyForMethodSelection) {
      summary.strictlyReadyFor4C += 1;
      summary.readyForMethodSelection += 1;
    } else {
      summary.blockedFrom4C += 1;
    }

    bump(
      summary.byLevel,
      item.learnerLevel
        ? `P${item.learnerLevel}`
        : "unknown",
    );

    bump(summary.byDomain, item.domain);
    bump(summary.byProblemStructure, item.problemStructure);
    bump(summary.byVisualRole, item.visualContext.role);
    bump(
      summary.byCurriculumSource,
      item.curriculumContext.selectedSource,
    );
    bump(summary.byDomainResolution, item.resolution.domain);
    bump(summary.byStructureResolution, item.resolution.structure);
    bump(summary.byReasoningResolution, item.resolution.reasoning);
    bump(summary.byAnswerValidation, item.answerValidation.status);

    const gateCodes = [
      ...item.gateDiagnostics.blockers,
      ...item.gateDiagnostics.warnings,
    ];

    for (const diagnostic of gateCodes) {
      bump(summary.gateDiagnosticCounts, diagnostic.code);
    }

    const hasGenericFallback =
      item.resolution.domain === "generic_fallback" ||
      item.resolution.structure === "generic_fallback" ||
      item.resolution.reasoning === "generic_fallback";

    if (hasGenericFallback) {
      summary.genericFallbackQuestions += 1;
    }

    const hasLowConfidence =
      item.gateDiagnostics.blockers.some((diagnostic) =>
        diagnostic.code === "GATE_DOMAIN_LOW_CONFIDENCE" ||
        diagnostic.code === "GATE_STRUCTURE_LOW_CONFIDENCE" ||
        diagnostic.code === "GATE_OVERALL_LOW_CONFIDENCE",
      );

    if (hasLowConfidence) {
      summary.lowConfidenceQuestions += 1;
    }

    const hasUnresolved =
      item.gateDiagnostics.blockers.some((diagnostic) =>
        diagnostic.code === "GATE_DOMAIN_UNRESOLVED" ||
        diagnostic.code === "GATE_STRUCTURE_UNRESOLVED" ||
        diagnostic.code === "GATE_TARGET_UNRESOLVED" ||
        diagnostic.code === "GATE_REASONING_UNRESOLVED",
      );

    if (hasUnresolved) {
      summary.unresolvedQuestions += 1;
    }

    if (
      item.gateDiagnostics.blockers.some(
        (diagnostic) => diagnostic.code === "GATE_BLOCKING_CONFLICT",
      )
    ) {
      summary.blockingConflictQuestions += 1;
    }

    for (const issue of item.issues) {
      bump(summary.issueCounts, issue.code);
    }

    for (const evidence of item.evidence) {
      if (evidence.relationship) {
        bump(
          summary.evidenceRelationshipCounts,
          evidence.relationship,
        );

        if (evidence.relationship === "conflict") {
          summary.rawConflictEvidence += 1;
        }

        if (evidence.relationship === "superseded") {
          summary.supersededEvidence += 1;
        }
      }
    }
  }

  return summary;
}
