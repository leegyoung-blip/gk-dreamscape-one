import type {
  MathIntelligenceQuestionInput,
  MathRuleEvaluation,
  MathVisualNeed,
} from "./MathIntelligenceTypes";
import { evaluateMathQuizVisualEligibility } from "./MathQuizVisualEligibility";

/**
 * Phase 3A compatibility adapter.
 *
 * `evaluateMathQuizVisualEligibility` is now the first and authoritative gate.
 * The legacy visual_need/disposition fields remain so the rest of the Phase 2
 * authoring/batch pipeline can keep working while the quiz visual architecture
 * becomes more conservative.
 */
export function evaluateMathVisualNeed(
  input: MathIntelligenceQuestionInput,
): MathRuleEvaluation {
  const eligibility = evaluateMathQuizVisualEligibility(input);

  let visualNeed: MathVisualNeed;
  let disposition: MathRuleEvaluation["disposition"];

  switch (eligibility.requirement) {
    case "existing_media":
      visualNeed = input.existing_media.has_math_visual_v2 ? "required" : "prohibited";
      disposition = input.existing_media.has_math_visual_v2
        ? "preserve_existing"
        : "preserve_media";
      break;

    case "required":
      visualNeed = "required";
      disposition = eligibility.auto_generate_v2 ? "generate" : "needs_review";
      break;

    case "missing_required_media":
      visualNeed = "required";
      disposition = "needs_review";
      break;

    case "optional_enrichment":
      visualNeed = "useful";
      disposition = "skip";
      break;

    case "not_needed":
    default:
      visualNeed = "unnecessary";
      disposition = "skip";
      break;
  }

  return {
    resolved: true,
    quiz_visual_requirement: eligibility.requirement,
    auto_generate_v2: eligibility.auto_generate_v2,
    visual_need: visualNeed,
    disposition,
    candidate_strategies: eligibility.candidate_strategies,
    confidence: eligibility.confidence,
    reason_codes: eligibility.reason_codes,
  };
}
