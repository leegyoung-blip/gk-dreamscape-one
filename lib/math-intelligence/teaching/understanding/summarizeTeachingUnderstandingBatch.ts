import type {
  BatchUnderstandingSummary,
  TeachingQuestionUnderstanding,
} from "./types";

function bump(target: Record<string, number>, key: string | null | undefined): void {
  const resolved = key && key.trim() ? key : "unknown";
  target[resolved] = (target[resolved] ?? 0) + 1;
}

export function summarizeTeachingUnderstandingBatch(
  items: TeachingQuestionUnderstanding[],
): BatchUnderstandingSummary {
  const summary: BatchUnderstandingSummary = {
    schemaVersion: "4A-2.1",
    total: items.length,
    status: { ready: 0, partial: 0, needs_review: 0 },
    readyForMethodSelection: 0,
    byLevel: {},
    byDomain: {},
    byProblemStructure: {},
    byVisualRole: {},
    issueCounts: {},
  };

  for (const item of items) {
    summary.status[item.status] += 1;
    if (item.readyForMethodSelection) summary.readyForMethodSelection += 1;

    bump(summary.byLevel, item.learnerLevel ? `P${item.learnerLevel}` : "unknown");
    bump(summary.byDomain, item.domain);
    bump(summary.byProblemStructure, item.problemStructure);
    bump(summary.byVisualRole, item.visualContext.role);

    for (const issue of item.issues) bump(summary.issueCounts, issue.code);
  }

  return summary;
}
