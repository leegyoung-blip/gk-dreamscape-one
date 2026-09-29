import "server-only";

import type { MathVisualSpec } from "../../components/core-math/visual-engine/MathVisualTypes";
import type {
  MathTeachingAIProvider,
  MathTeachingAIResponse,
} from "./ai/TeachingAIProvider";
import { OpenAILunaProvider } from "./ai/OpenAILunaProvider";
import type {
  MathIntelligenceAnalysis,
  MathIntelligenceQuestionInput,
} from "./MathIntelligenceTypes";
import { validateMathTeachingVisualDraft } from "./MathTeachingSemanticValidator";
import type { MathTeachingSemanticValidationResult } from "./MathTeachingSemanticTypes";
import { generateMathTeachingVisualDraft } from "./MathTeachingVisualGenerator";
import type {
  MathTeachingVisualDraftIssue,
  MathTeachingVisualDraftResult,
} from "./MathTeachingVisualTypes";

export const MATH_TEACHING_LUNA_FALLBACK_VERSION = "2F-D.1";
export const DEFAULT_LUNA_TEACHING_MIN_CONFIDENCE = 0.72;

export type MathTeachingVisualPipelineStatus =
  | "generated"
  | "not_needed"
  | "needs_review"
  | "invalid";

export type MathTeachingVisualLunaTrace = {
  attempted: boolean;
  used: boolean;
  model: string | null;
  error: string | null;
};

export type MathTeachingVisualPipelineResult = {
  status: MathTeachingVisualPipelineStatus;
  draft: MathTeachingVisualDraftResult;
  validation: MathTeachingSemanticValidationResult | null;
  luna: MathTeachingVisualLunaTrace;
};

export type MathTeachingVisualPipelineOptions = {
  aiProvider?: MathTeachingAIProvider;
  minLunaConfidence?: number;
};

function issue(
  code: MathTeachingVisualDraftIssue["code"],
  message: string,
): MathTeachingVisualDraftIssue {
  return { code, message };
}

function clampConfidence(value: number) {
  return Math.max(0, Math.min(1, value));
}

function unresolvedFromRules(
  draft: MathTeachingVisualDraftResult,
  code: MathTeachingVisualDraftIssue["code"],
  message: string,
): MathTeachingVisualDraftResult {
  return {
    ...draft,
    status: "needs_review",
    lesson_steps: [],
    teach_me_steps: [],
    issues: [...draft.issues, issue(code, message)],
  };
}

function lunaDraft(
  base: MathTeachingVisualDraftResult,
  response: MathTeachingAIResponse,
): MathTeachingVisualDraftResult {
  if (response.status === "needs_review") {
    return {
      ...base,
      status: "needs_review",
      source: "luna",
      generator_version: MATH_TEACHING_LUNA_FALLBACK_VERSION,
      model: response.model,
      confidence: clampConfidence(response.confidence),
      template_id: null,
      lesson_steps: [],
      teach_me_steps: [],
      issues: [
        issue(
          "LUNA_NEEDS_REVIEW",
          response.review_reason ||
            "Luna could not produce a sufficiently safe visual-teaching sequence from the allowed V2 targets.",
        ),
      ],
    };
  }

  return {
    ...base,
    status: "generated",
    source: "luna",
    generator_version: MATH_TEACHING_LUNA_FALLBACK_VERSION,
    model: response.model,
    confidence: clampConfidence(response.confidence),
    template_id: "luna_guided",
    lesson_steps: response.lesson_steps,
    teach_me_steps: response.teach_me_steps,
    issues: [],
  };
}

/**
 * Phase 2F-D orchestration.
 *
 * 1. Always run Dreamscape's deterministic 2F-A/B path first.
 * 2. Call Luna only when that path explicitly returns deferred_to_luna.
 * 3. Make at most ONE teaching-planning Luna call per invocation.
 * 4. Validate the returned plan with Dreamscape cross-reference + semantic
 *    validators. There is no AI repair loop; invalid output becomes review.
 */
export async function generateMathTeachingVisualWithFallback(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
  spec: MathVisualSpec,
  options: MathTeachingVisualPipelineOptions = {},
): Promise<MathTeachingVisualPipelineResult> {
  const rulesDraft = generateMathTeachingVisualDraft(analysis, spec);

  if (rulesDraft.status === "not_needed") {
    return {
      status: "not_needed",
      draft: rulesDraft,
      validation: null,
      luna: { attempted: false, used: false, model: null, error: null },
    };
  }

  if (rulesDraft.status === "generated") {
    const validation = validateMathTeachingVisualDraft(analysis, spec, rulesDraft);
    return {
      status: validation.valid ? "generated" : "invalid",
      draft: validation.valid
        ? rulesDraft
        : {
            ...rulesDraft,
            issues: [
              ...rulesDraft.issues,
              issue(
                "TEACHING_VALIDATION_FAILED",
                "The deterministic visual-teaching draft failed final Dreamscape validation.",
              ),
            ],
          },
      validation,
      luna: { attempted: false, used: false, model: null, error: null },
    };
  }

  if (rulesDraft.status !== "deferred_to_luna" || !rulesDraft.need.requires_luna) {
    return {
      status: "needs_review",
      draft: rulesDraft,
      validation: null,
      luna: { attempted: false, used: false, model: null, error: null },
    };
  }

  if (!rulesDraft.visual_id || rulesDraft.roles.targets.length === 0) {
    return {
      status: "needs_review",
      draft: unresolvedFromRules(
        rulesDraft,
        "LUNA_NOT_AVAILABLE",
        "Luna teaching fallback was requested, but the V2 visual does not expose a stable visual ID and target allow-list.",
      ),
      validation: null,
      luna: { attempted: false, used: false, model: null, error: null },
    };
  }

  let provider: MathTeachingAIProvider;
  try {
    provider = options.aiProvider ?? new OpenAILunaProvider();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "needs_review",
      draft: unresolvedFromRules(
        rulesDraft,
        "LUNA_NOT_AVAILABLE",
        message,
      ),
      validation: null,
      luna: { attempted: false, used: false, model: null, error: message },
    };
  }

  let response: MathTeachingAIResponse;
  try {
    response = await provider.planVisualTeaching({
      input,
      analysis,
      visual_id: rulesDraft.visual_id,
      roles: rulesDraft.roles,
      need: rulesDraft.need,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "needs_review",
      draft: unresolvedFromRules(
        rulesDraft,
        "LUNA_REQUEST_FAILED",
        `Luna visual-teaching fallback failed: ${message}`,
      ),
      validation: null,
      luna: {
        attempted: true,
        used: false,
        model: provider.model,
        error: message,
      },
    };
  }

  const drafted = lunaDraft(rulesDraft, response);
  const minConfidence = clampConfidence(
    options.minLunaConfidence ?? DEFAULT_LUNA_TEACHING_MIN_CONFIDENCE,
  );

  if (drafted.status !== "generated") {
    return {
      status: "needs_review",
      draft: drafted,
      validation: null,
      luna: {
        attempted: true,
        used: true,
        model: response.model,
        error: null,
      },
    };
  }

  if (drafted.confidence < minConfidence) {
    return {
      status: "needs_review",
      draft: {
        ...drafted,
        status: "needs_review",
        template_id: null,
        lesson_steps: [],
        teach_me_steps: [],
        issues: [
          issue(
            "LUNA_NEEDS_REVIEW",
            `Luna teaching confidence ${drafted.confidence.toFixed(2)} is below the Dreamscape threshold ${minConfidence.toFixed(2)}.`,
          ),
        ],
      },
      validation: null,
      luna: {
        attempted: true,
        used: true,
        model: response.model,
        error: null,
      },
    };
  }

  const validation = validateMathTeachingVisualDraft(analysis, spec, drafted);
  if (!validation.valid) {
    return {
      status: "invalid",
      draft: {
        ...drafted,
        issues: [
          ...drafted.issues,
          issue(
            "LUNA_SEMANTIC_VALIDATION_FAILED",
            "Luna returned a schema-constrained plan, but Dreamscape semantic/cross-reference validation rejected it.",
          ),
        ],
      },
      validation,
      luna: {
        attempted: true,
        used: true,
        model: response.model,
        error: null,
      },
    };
  }

  return {
    status: validation.review_required ? "needs_review" : "generated",
    draft: drafted,
    validation,
    luna: {
      attempted: true,
      used: true,
      model: response.model,
      error: null,
    },
  };
}
