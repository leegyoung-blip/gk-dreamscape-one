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
  domainConfidence: number;
  structureConfidence: number;
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
    domainConfidence,
    structureConfidence,
  } = args;

  const hasBlocking =
    issues.some(
      (issue) =>
        issue.severity ===
        "blocking",
    );

  const reasoningResolved =
    requiredReasoning.length > 0 &&
    !requiredReasoning.every(
      (item) =>
        item === "unknown",
    );

  /*
   * Phase 4A-2C: each core signal must stand on its own.
   * A high domain score must not average away a weak/generic
   * problem-structure classification.
   */
  const confidenceReady =
    domainConfidence >= 0.75 &&
    structureConfidence >= 0.78 &&
    confidence >= 0.76;

  const strictReady =
    canonicalReady &&
    domain !== "unknown" &&
    problemStructure !== "unknown" &&
    target !== null &&
    target.kind !== "unknown" &&
    reasoningResolved &&
    answerValidation.status !==
      "mismatched" &&
    confidenceReady &&
    !hasBlocking;

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
