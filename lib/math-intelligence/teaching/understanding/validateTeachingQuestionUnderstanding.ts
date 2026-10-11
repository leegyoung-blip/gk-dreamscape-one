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
      message:
        "The understanding has no resolved mathematical domain.",
      path: "domain",
    });
  }

  if (
    understanding.problemStructure === "unknown"
  ) {
    issues.push({
      severity: "warning",
      code: "PROBLEM_STRUCTURE_UNRESOLVED",
      message:
        "The understanding has no resolved problem structure.",
      path: "problemStructure",
    });
  }

  if (
    understanding.resolution.domain === "generic_fallback"
  ) {
    issues.push({
      severity: "warning",
      code: "GENERIC_DOMAIN_FALLBACK",
      message:
        "A generic domain fallback cannot proceed to Phase 4C.",
      path: "resolution.domain",
    });
  }

  if (
    understanding.resolution.structure === "generic_fallback"
  ) {
    issues.push({
      severity: "warning",
      code: "GENERIC_STRUCTURE_FALLBACK",
      message:
        "A generic structure fallback cannot proceed to Phase 4C.",
      path: "resolution.structure",
    });
  }

  if (
    !understanding.target ||
    understanding.target.kind === "unknown"
  ) {
    issues.push({
      severity: "warning",
      code: "TARGET_UNRESOLVED",
      message:
        "The understanding has no resolved learner target.",
      path: "target",
    });
  }

  if (
    understanding.requiredReasoning.length === 0 ||
    understanding.requiredReasoning.every(
      (item) => item === "unknown",
    )
  ) {
    issues.push({
      severity: "warning",
      code: "REASONING_UNRESOLVED",
      message:
        "The understanding has no resolved mathematical reasoning family.",
      path: "requiredReasoning",
    });
  }

  if (
    understanding.answerValidation.status === "mismatched" &&
    understanding.readyForMethodSelection
  ) {
    issues.push({
      severity: "blocking",
      code: "ANSWER_VALIDATION_MISMATCH",
      message:
        "An answer-validation mismatch cannot proceed to method selection.",
      path: "readyForMethodSelection",
    });
  }

  if (
    understanding.gateDiagnostics.blockers.length > 0 &&
    understanding.readyForMethodSelection
  ) {
    issues.push({
      severity: "blocking",
      code: "UNDERSTANDING_CONFLICT",
      message:
        "Phase 4C readiness cannot be true while gateDiagnostics contains blockers.",
      path: "gateDiagnostics.blockers",
    });
  }

  if (
    understanding.status !== "ready" &&
    understanding.readyForMethodSelection
  ) {
    issues.push({
      severity: "blocking",
      code: "UNDERSTANDING_CONFLICT",
      message:
        "Only a ready understanding may proceed to Phase 4C.",
      path: "readyForMethodSelection",
    });
  }

  return issues;
}
