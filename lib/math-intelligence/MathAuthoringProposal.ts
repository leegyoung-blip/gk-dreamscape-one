import { randomUUID } from "node:crypto";

import type { MathVisualAndTeachingPipelineResult } from "./MathIntelligencePipeline";
import {
  MATH_AUTHORING_PROPOSAL_SCHEMA_VERSION,
  type MathAuthoringProposal,
  type MathAuthoringProposalIssue,
  type MathAuthoringProposalIssueSeverity,
  type MathAuthoringProposalStatus,
} from "./MathAuthoringProposalTypes";

function clamp(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function severityFromStructural(value: "error" | "warning"): MathAuthoringProposalIssueSeverity {
  return value === "error" ? "error" : "warning";
}

function statusForPipeline(
  result: MathVisualAndTeachingPipelineResult,
): MathAuthoringProposalStatus {
  const generation = result.generation;

  if (generation.status === "invalid") return "invalid";
  if (generation.status === "needs_review") return "needs_review";
  if (generation.status === "preserved") return "preserved";

  if (generation.status === "skipped") {
    return result.analysis.visual_need === "unnecessary" || result.analysis.disposition === "skip"
      ? "not_needed"
      : "needs_review";
  }

  const teaching = result.teaching;
  if (!teaching || teaching.status === "not_needed" || teaching.status === "generated") {
    return "generated";
  }
  if (teaching.status === "invalid") return "invalid";
  return "needs_review";
}

function collectIssues(result: MathVisualAndTeachingPipelineResult) {
  const issues: MathAuthoringProposalIssue[] = [];

  for (const code of result.analysis.reason_codes) {
    issues.push({
      source: "analysis",
      severity: "info",
      code,
      message: code.replaceAll("_", " ").toLowerCase(),
    });
  }

  for (const item of result.generation.issues) {
    issues.push({
      source: "visual_generation",
      severity:
        result.generation.status === "invalid"
          ? "error"
          : result.generation.status === "needs_review"
            ? "warning"
            : "info",
      code: item.code,
      message: item.message,
    });
  }

  for (const item of result.generation.structural_validation?.issues ?? []) {
    issues.push({
      source: "visual_structure",
      severity: severityFromStructural(item.severity),
      code: item.code,
      message: item.message,
    });
  }

  for (const item of result.generation.semantic_validation?.issues ?? []) {
    issues.push({
      source: "visual_semantic",
      severity: item.severity === "error" ? "error" : "warning",
      code: item.code,
      message: item.message,
    });
  }

  if (result.teaching) {
    for (const item of result.teaching.draft.issues) {
      issues.push({
        source: "teaching_generation",
        severity:
          result.teaching.status === "invalid"
            ? "error"
            : result.teaching.status === "needs_review"
              ? "warning"
              : "info",
        code: item.code,
        message: item.message,
      });
    }

    for (const item of result.teaching.validation?.issues ?? []) {
      issues.push({
        source: "teaching_validation",
        severity: item.severity === "error" ? "error" : "warning",
        code: item.code,
        message: item.message,
      });
    }
  }

  return issues;
}

function visualAcceptable(result: MathVisualAndTeachingPipelineResult) {
  const visual = result.generation;
  return Boolean(
    visual.status === "generated" &&
      visual.spec &&
      visual.structural_validation?.valid &&
      visual.semantic_validation?.valid &&
      !visual.semantic_validation.review_required,
  );
}

function teachingAcceptable(result: MathVisualAndTeachingPipelineResult) {
  if (result.generation.status !== "generated" || !result.generation.spec) return false;
  if (!result.teaching) return true;
  if (result.teaching.status === "not_needed") return true;

  return Boolean(
    result.teaching.status === "generated" &&
      result.teaching.validation?.valid &&
      !result.teaching.validation.review_required,
  );
}

/**
 * Convert the internal Phase 2 result into the stable 2G authoring contract.
 *
 * This deliberately exposes only authoring-relevant facts: decision, source,
 * generated V2 content, validation outcomes and operational issues. It does not
 * expose prompts, model reasoning or any private chain-of-thought.
 */
export function buildMathAuthoringProposal(
  result: MathVisualAndTeachingPipelineResult,
  options: { proposalId?: string; createdAt?: string } = {},
): MathAuthoringProposal {
  const visualOk = visualAcceptable(result);
  const teachingOk = teachingAcceptable(result);
  const teaching = result.teaching;

  return {
    schema_version: MATH_AUTHORING_PROPOSAL_SCHEMA_VERSION,
    proposal_id: options.proposalId || randomUUID(),
    created_at: options.createdAt || new Date().toISOString(),
    question_id: result.input.id,
    status: statusForPipeline(result),
    can_accept: {
      visual: visualOk,
      teaching: teachingOk,
      combined: visualOk && teachingOk,
    },
    decision: {
      visual_need: result.analysis.visual_need,
      disposition: result.analysis.disposition,
      strategy: result.analysis.strategy,
      domain: result.analysis.interpretation.domain,
      problem_structure: result.analysis.interpretation.problem_structure,
      target: result.analysis.interpretation.target,
      confidence: clamp(result.analysis.confidence),
      reason_codes: [...result.analysis.reason_codes],
    },
    sources: {
      interpretation: {
        source: result.analysis.source,
        model: result.analysis.model,
      },
      teaching: teaching
        ? {
            source: teaching.draft.source,
            model: teaching.draft.model,
          }
        : {
            source: "none",
            model: null,
          },
    },
    visual: {
      status: result.generation.status,
      strategy: result.generation.strategy,
      generator_version: result.generation.generator_version,
      spec: result.generation.spec,
      structural_validation: result.generation.structural_validation,
      semantic_validation: result.generation.semantic_validation,
    },
    teaching: teaching
      ? {
          status: teaching.status,
          source: teaching.draft.source,
          model: teaching.draft.model,
          generator_version: teaching.draft.generator_version,
          template_id: teaching.draft.template_id,
          confidence: clamp(teaching.draft.confidence),
          lesson_steps: teaching.draft.lesson_steps,
          teach_me_steps: teaching.draft.teach_me_steps,
          validation: teaching.validation,
          luna: teaching.luna,
        }
      : null,
    issues: collectIssues(result),
  };
}
