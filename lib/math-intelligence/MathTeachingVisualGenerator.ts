import type { MathVisualSpec } from "../../components/core-math/visual-engine/MathVisualTypes";
import type { MathIntelligenceAnalysis } from "./MathIntelligenceTypes";
import { getMathTeachingTemplate } from "./MathTeachingTemplateLibrary";
import type {
  MathTeachingVisualDraftIssue,
  MathTeachingVisualDraftResult,
} from "./MathTeachingVisualTypes";
import { resolveMathVisualTeachingNeed } from "./MathVisualTeachingNeedResolver";
import { resolveMathVisualTeachingRoles } from "./MathVisualTeachingRoleResolver";

export const MATH_TEACHING_VISUAL_GENERATOR_VERSION = "2F-B.1";

function issue(
  code: MathTeachingVisualDraftIssue["code"],
  message: string,
): MathTeachingVisualDraftIssue {
  return { code, message };
}

/**
 * Phase 2F-B — deterministic visual teaching-step generator.
 *
 * This function is deliberately pure Dreamscape code. It does not call Luna,
 * mutate the V2 spec, merge into content.teaching, or perform Phase 2F-C's
 * semantic validation. It produces a deterministic draft from already-existing
 * V2 object IDs and the 2F-A role/need foundation.
 */
export function generateMathTeachingVisualDraft(
  analysis: MathIntelligenceAnalysis,
  spec: MathVisualSpec,
): MathTeachingVisualDraftResult {
  const roles = resolveMathVisualTeachingRoles(spec, analysis);
  const need = resolveMathVisualTeachingNeed(analysis, roles);
  const visualId = roles.preferred_visual_id;

  const base = {
    source: "rules" as const,
    generator_version: MATH_TEACHING_VISUAL_GENERATOR_VERSION,
    model: null,
    confidence: need.confidence,
    strategy: analysis.strategy,
    visual_id: visualId,
    roles,
    need,
  };

  if (need.decision === "skip" || need.need === "none") {
    return {
      ...base,
      status: "not_needed",
      template_id: null,
      lesson_steps: [],
      teach_me_steps: [],
      issues: [
        issue(
          "NO_TEACHING_REQUIRED",
          "Dreamscape determined that progressive visual teaching is not needed for this visual.",
        ),
      ],
    };
  }

  if (need.decision === "route_to_luna") {
    return {
      ...base,
      status: "deferred_to_luna",
      template_id: null,
      lesson_steps: [],
      teach_me_steps: [],
      issues: [
        issue(
          "RULES_DEFER_TO_LUNA",
          "The V2 visual is valid, but Dreamscape rules cannot choose a sufficiently safe teaching sequence. Phase 2F-D may route it to Luna.",
        ),
      ],
    };
  }

  if (need.decision === "needs_review" || !need.can_generate_deterministically) {
    return {
      ...base,
      status: "needs_review",
      template_id: null,
      lesson_steps: [],
      teach_me_steps: [],
      issues: [
        issue(
          "ROLE_RESOLUTION_INCOMPLETE",
          "The visual does not expose enough stable teaching targets for the deterministic template library.",
        ),
      ],
    };
  }

  if (!visualId) {
    return {
      ...base,
      status: "needs_review",
      template_id: null,
      lesson_steps: [],
      teach_me_steps: [],
      issues: [
        issue(
          "MISSING_PREFERRED_VISUAL",
          "Dreamscape could not select a stable V2 visual for the teaching sequence.",
        ),
      ],
    };
  }

  const plan = getMathTeachingTemplate({
    analysis,
    spec,
    roles,
    visual_id: visualId,
  });

  if (!plan || plan.lesson_steps.length === 0 || plan.teach_me_steps.length === 0) {
    return {
      ...base,
      status: "needs_review",
      template_id: null,
      lesson_steps: [],
      teach_me_steps: [],
      issues: [
        issue(
          "NO_DETERMINISTIC_TEMPLATE",
          `No deterministic visual-teaching template is currently available for strategy “${analysis.strategy}” and this teaching target.`,
        ),
      ],
    };
  }

  return {
    ...base,
    status: "generated",
    template_id: plan.template_id,
    lesson_steps: plan.lesson_steps,
    teach_me_steps: plan.teach_me_steps,
    issues: [],
  };
}
