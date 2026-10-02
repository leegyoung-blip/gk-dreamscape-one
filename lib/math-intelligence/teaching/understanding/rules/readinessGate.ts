import type {
  AnswerValidation,
  MathematicalDomain,
  ProblemStructure,
  RequiredReasoning,
  TeachingTarget,
  TeachingUnderstandingStatus,
  UnderstandingIssue,
} from "../types";

export type ReadinessResult = {
  status: TeachingUnderstandingStatus;
  readyForMethodSelection: boolean;
};

export function determineTeachingReadiness(args: {
  canonicalReady: boolean;
  domain: MathematicalDomain;
  problemStructure: ProblemStructure;
  target: TeachingTarget | null;
  requiredReasoning: RequiredReasoning[];
  answerValidation: AnswerValidation;
  issues: UnderstandingIssue[];
  confidence: number;
}): ReadinessResult {
  const {
    canonicalReady,
    domain,
    problemStructure,
    target,
    requiredReasoning,
    answerValidation,
    issues,
    confidence,
  } = args;

  const hasBlocking =
    issues.some(
      (issue) =>
        issue.severity ===
        "blocking",
    );

  const hasTrueConflict =
    issues.some(
      (issue) =>
        issue.code ===
          "UNDERSTANDING_CONFLICT" &&
        issue.severity ===
          "blocking",
    );

  const reasoningResolved =
    requiredReasoning.length > 0 &&
    !requiredReasoning.every(
      (item) =>
        item === "unknown",
    );

  const strictReady =
    canonicalReady &&
    domain !== "unknown" &&
    problemStructure !== "unknown" &&
    target !== null &&
    target.kind !== "unknown" &&
    reasoningResolved &&
    answerValidation.status !==
      "mismatched" &&
    !hasBlocking &&
    !hasTrueConflict;

  if (strictReady) {
    return {
      status: "ready",
      readyForMethodSelection: true,
    };
  }

  if (
    !canonicalReady ||
    answerValidation.status ===
      "mismatched" ||
    hasBlocking ||
    hasTrueConflict ||
    (
      domain === "unknown" &&
      problemStructure ===
        "unknown"
    ) ||
    confidence < 0.45
  ) {
    return {
      status: "needs_review",
      readyForMethodSelection: false,
    };
  }

  return {
    status: "partial",
    readyForMethodSelection: false,
  };
}
