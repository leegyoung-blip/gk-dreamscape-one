import type {
  TeachingQuestionUnderstanding,
  UnderstandingIssue,
} from "./types";

export function validateTeachingQuestionUnderstanding(
  understanding: TeachingQuestionUnderstanding,
): UnderstandingIssue[] {
  const issues: UnderstandingIssue[] = [];

  if (understanding.domain === "unknown") {
    issues.push({
      severity: "warning",
      code: "DOMAIN_UNRESOLVED",
      message: "The understanding has no resolved mathematical domain.",
      path: "domain",
    });
  }

  if (understanding.problemStructure === "unknown") {
    issues.push({
      severity: "warning",
      code: "PROBLEM_STRUCTURE_UNRESOLVED",
      message: "The understanding has no resolved problem structure.",
      path: "problemStructure",
    });
  }

  if (!understanding.target) {
    issues.push({
      severity: "warning",
      code: "TARGET_UNRESOLVED",
      message: "The understanding has no resolved learner target.",
      path: "target",
    });
  }

  if (
    understanding.requiredOperations.length === 0 ||
    understanding.requiredOperations.every((operation) => operation === "unknown")
  ) {
    issues.push({
      severity: "warning",
      code: "OPERATIONS_UNRESOLVED",
      message: "The understanding has no resolved mathematical operation or reasoning family.",
      path: "requiredOperations",
    });
  }

  if (
    understanding.status === "needs_review" &&
    understanding.readyForMethodSelection
  ) {
    issues.push({
      severity: "blocking",
      code: "UNDERSTANDING_CONFLICT",
      message: "A needs_review understanding cannot be marked ready for method selection.",
      path: "readyForMethodSelection",
    });
  }

  return issues;
}
