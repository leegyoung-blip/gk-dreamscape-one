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
    schemaVersion: "4A-2.3",
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

    bump(
      summary.byDomain,
      item.domain,
    );

    bump(
      summary.byProblemStructure,
      item.problemStructure,
    );

    bump(
      summary.byVisualRole,
      item.visualContext.role,
    );

    bump(
      summary.byCurriculumSource,
      item.curriculumContext.selectedSource,
    );

    for (const issue of item.issues) {
      bump(
        summary.issueCounts,
        issue.code,
      );
    }

    for (const evidence of item.evidence) {
      if (evidence.relationship) {
        bump(
          summary.evidenceRelationshipCounts,
          evidence.relationship,
        );
      }
    }
  }

  return summary;
}
