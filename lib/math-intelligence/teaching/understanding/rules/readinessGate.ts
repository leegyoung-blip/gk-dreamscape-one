import type {
  AnswerValidation,
  ConfidenceBreakdown,
  GateDiagnostic,
  GateDiagnostics,
  MathematicalDomain,
  ProblemStructure,
  RequiredReasoning,
  ResolutionMetadata,
  TeachingTarget,
  TeachingUnderstandingStatus,
  UnderstandingIssue,
} from "../types";

export type ReadinessResult = {
  status: TeachingUnderstandingStatus;
  readyForMethodSelection: boolean;
  gateDiagnostics: GateDiagnostics;
};

function diagnostic(
  code: GateDiagnostic["code"],
  message: string,
  path: string | null,
): GateDiagnostic {
  return { code, message, path };
}

export function determineTeachingReadiness(args: {
  canonicalReady: boolean;
  domain: MathematicalDomain;
  problemStructure: ProblemStructure;
  target: TeachingTarget | null;
  requiredReasoning: RequiredReasoning[];
  answerValidation: AnswerValidation;
  issues: UnderstandingIssue[];
  confidenceBreakdown: ConfidenceBreakdown;
  resolution: ResolutionMetadata;
}): ReadinessResult {
  const blockers: GateDiagnostic[] = [];
  const warnings: GateDiagnostic[] = [];

  const hasBlockingConflict =
    args.issues.some(
      (issue) =>
        issue.code === "UNDERSTANDING_CONFLICT" &&
        issue.severity === "blocking",
    );

  const hasOtherBlockingIssue =
    args.issues.some(
      (issue) =>
        issue.severity === "blocking" &&
        issue.code !== "UNDERSTANDING_CONFLICT" &&
        issue.code !== "ANSWER_VALIDATION_MISMATCH" &&
        issue.code !== "CANONICAL_INPUT_NOT_READY",
    );

  const reasoningResolved =
    args.requiredReasoning.length > 0 &&
    !args.requiredReasoning.every(
      (item) => item === "unknown",
    );

  if (!args.canonicalReady) {
    blockers.push(
      diagnostic(
        "GATE_CANONICAL_NOT_READY",
        "Phase 4A-1 canonical input is not ready for deterministic understanding.",
        "source.canonical.diagnostics",
      ),
    );
  }

  if (
    args.domain === "unknown" ||
    args.resolution.domain === "unresolved"
  ) {
    blockers.push(
      diagnostic(
        "GATE_DOMAIN_UNRESOLVED",
        "The mathematical domain is unresolved.",
        "domain",
      ),
    );
  } else if (args.resolution.domain === "generic_fallback") {
    blockers.push(
      diagnostic(
        "GATE_DOMAIN_GENERIC_FALLBACK",
        "The domain is supported only by generic fallback evidence and is not safe for Phase 4C.",
        "resolution.domain",
      ),
    );
  }

  if (args.confidenceBreakdown.domain < 0.75) {
    blockers.push(
      diagnostic(
        "GATE_DOMAIN_LOW_CONFIDENCE",
        "Domain confidence is below the Phase 4C threshold.",
        "confidenceBreakdown.domain",
      ),
    );
  }

  if (
    args.problemStructure === "unknown" ||
    args.resolution.structure === "unresolved"
  ) {
    blockers.push(
      diagnostic(
        "GATE_STRUCTURE_UNRESOLVED",
        "The mathematical problem structure is unresolved.",
        "problemStructure",
      ),
    );
  } else if (args.resolution.structure === "generic_fallback") {
    blockers.push(
      diagnostic(
        "GATE_STRUCTURE_GENERIC_FALLBACK",
        "The problem structure is a generic fallback and cannot proceed to Phase 4C without a specific semantic interpretation.",
        "resolution.structure",
      ),
    );
  }

  if (args.confidenceBreakdown.structure < 0.78) {
    blockers.push(
      diagnostic(
        "GATE_STRUCTURE_LOW_CONFIDENCE",
        "Problem-structure confidence is below the Phase 4C threshold.",
        "confidenceBreakdown.structure",
      ),
    );
  }

  if (!args.target || args.target.kind === "unknown") {
    blockers.push(
      diagnostic(
        "GATE_TARGET_UNRESOLVED",
        "The learner-facing mathematical target is unresolved.",
        "target",
      ),
    );
  }

  if (!reasoningResolved || args.resolution.reasoning === "unresolved") {
    blockers.push(
      diagnostic(
        "GATE_REASONING_UNRESOLVED",
        "Required mathematical reasoning is unresolved.",
        "requiredReasoning",
      ),
    );
  } else if (args.resolution.reasoning === "generic_fallback") {
    blockers.push(
      diagnostic(
        "GATE_REASONING_GENERIC_FALLBACK",
        "Required reasoning inherits a generic structure fallback and is not safe for method selection.",
        "resolution.reasoning",
      ),
    );
  }

  if (args.answerValidation.status === "mismatched") {
    blockers.push(
      diagnostic(
        "GATE_ANSWER_MISMATCH",
        "Deterministic answer validation does not match the stored answer.",
        "answerValidation",
      ),
    );
  }

  if (hasBlockingConflict) {
    blockers.push(
      diagnostic(
        "GATE_BLOCKING_CONFLICT",
        "A genuine unresolved conflict remains between current deterministic understanding and existing Math Intelligence evidence.",
        "evidence",
      ),
    );
  }

  if (hasOtherBlockingIssue) {
    blockers.push(
      diagnostic(
        "GATE_BLOCKING_ISSUE",
        "A blocking understanding issue remains unresolved.",
        "issues",
      ),
    );
  }

  if (args.confidenceBreakdown.overall < 0.76) {
    blockers.push(
      diagnostic(
        "GATE_OVERALL_LOW_CONFIDENCE",
        "Overall understanding confidence is below the Phase 4C threshold.",
        "confidenceBreakdown.overall",
      ),
    );
  }

  if (args.answerValidation.status === "not_checked") {
    warnings.push(
      diagnostic(
        "GATE_ANSWER_NOT_CHECKED",
        "No safe deterministic answer check was available; this is informational and does not block Phase 4C by itself.",
        "answerValidation",
      ),
    );
  }

  const readyForMethodSelection = blockers.length === 0;

  let status: TeachingUnderstandingStatus;

  if (readyForMethodSelection) {
    status = "ready";
  } else {
    const unresolved = blockers.some((item) =>
      [
        "GATE_DOMAIN_UNRESOLVED",
        "GATE_STRUCTURE_UNRESOLVED",
        "GATE_TARGET_UNRESOLVED",
        "GATE_REASONING_UNRESOLVED",
      ].includes(item.code),
    );

    const requiresReview =
      !args.canonicalReady ||
      args.answerValidation.status === "mismatched" ||
      hasBlockingConflict ||
      hasOtherBlockingIssue ||
      unresolved;

    status = requiresReview
      ? "needs_review"
      : "partial";
  }

  return {
    status,
    readyForMethodSelection,
    gateDiagnostics: {
      readyFor4C: readyForMethodSelection,
      blockers,
      warnings,
    },
  };
}
