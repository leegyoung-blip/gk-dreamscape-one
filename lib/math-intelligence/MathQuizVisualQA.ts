import type { MathAuthoringBatchItem } from "./MathBatchGenerationTypes";
import type { MathQAVerdict } from "./MathQATypes";

export const MATH_QUIZ_VISUAL_QA_VERSION = "3C.1" as const;

export type MathQuizVisualQAReview = {
  question_id: string;
  verdict: MathQAVerdict;
};

export type MathQuizVisualQAGateStatus =
  | "no_cohort"
  | "review_incomplete"
  | "blocked"
  | "needs_polish"
  | "ready";

export type MathQuizVisualQASummary = {
  version: typeof MATH_QUIZ_VISUAL_QA_VERSION;
  required_v2: number;
  generated_visuals: number;
  visual_generation_failures: number;
  reviewed: number;
  pass: number;
  minor: number;
  fail: number;
  not_applicable: number;
  unreviewed: number;
  gate_status: MathQuizVisualQAGateStatus;
};

/**
 * Phase 3C reviews only learner-facing quiz diagrams that passed the Phase 3A
 * eligibility gate. Teaching quality is deliberately excluded from this cohort.
 */
export function isMathQuizVisualQAItem(item: MathAuthoringBatchItem) {
  const proposal = item.proposal;
  return Boolean(
    proposal &&
      proposal.decision.quiz_visual_requirement === "required" &&
      proposal.decision.auto_generate_v2 === true,
  );
}

export function hasGeneratedAcceptableQuizVisual(item: MathAuthoringBatchItem) {
  const proposal = item.proposal;
  return Boolean(
    isMathQuizVisualQAItem(item) &&
      proposal?.visual.status === "generated" &&
      proposal.visual.spec &&
      proposal.visual.structural_validation?.valid &&
      proposal.visual.semantic_validation?.valid &&
      !proposal.visual.semantic_validation?.review_required,
  );
}

export function buildMathQuizVisualQASummary(
  results: MathAuthoringBatchItem[],
  reviewByQuestion: Map<string, { verdict: MathQAVerdict }>,
): MathQuizVisualQASummary {
  const cohort = results.filter(isMathQuizVisualQAItem);
  const generated = cohort.filter(hasGeneratedAcceptableQuizVisual);
  const visualGenerationFailures = cohort.length - generated.length;

  let pass = 0;
  let minor = 0;
  let fail = 0;
  let notApplicable = 0;
  let unreviewed = 0;

  for (const item of generated) {
    const verdict = reviewByQuestion.get(item.client_id)?.verdict || "unreviewed";
    if (verdict === "pass") pass += 1;
    else if (verdict === "minor") minor += 1;
    else if (verdict === "fail") fail += 1;
    else if (verdict === "not_applicable") notApplicable += 1;
    else unreviewed += 1;
  }

  const reviewed = generated.length - unreviewed;
  let gateStatus: MathQuizVisualQAGateStatus;
  if (cohort.length === 0) gateStatus = "no_cohort";
  else if (visualGenerationFailures > 0 || fail > 0) gateStatus = "blocked";
  else if (unreviewed > 0) gateStatus = "review_incomplete";
  else if (minor > 0 || notApplicable > 0) gateStatus = "needs_polish";
  else gateStatus = "ready";

  return {
    version: MATH_QUIZ_VISUAL_QA_VERSION,
    required_v2: cohort.length,
    generated_visuals: generated.length,
    visual_generation_failures: visualGenerationFailures,
    reviewed,
    pass,
    minor,
    fail,
    not_applicable: notApplicable,
    unreviewed,
    gate_status: gateStatus,
  };
}

export function mathQuizVisualQAGateLabel(status: MathQuizVisualQAGateStatus) {
  if (status === "ready") return "READY";
  if (status === "needs_polish") return "POLISH REQUIRED";
  if (status === "blocked") return "BLOCKED";
  if (status === "review_incomplete") return "REVIEW INCOMPLETE";
  return "NO REQUIRED-V2 COHORT";
}
