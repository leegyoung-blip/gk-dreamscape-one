import "server-only";

import type {
  MathIntelligenceAIProvider,
} from "./ai/AIProvider";
import { OpenAILunaProvider } from "./ai/OpenAILunaProvider";
import { interpretMathStructureWithRules } from "./MathStructureInterpreter";
import type {
  MathIntelligenceAnalysis,
  MathIntelligencePipelineResult,
  MathIntelligenceReasonCode,
  MathStructureInterpretation,
} from "./MathIntelligenceTypes";
import { normaliseMathIntelligenceQuestion } from "./MathQuestionNormalizer";
import { evaluateMathVisualNeed } from "./MathVisualDecisionEngine";
import { resolveMathVisualStrategyWithRules } from "./MathVisualStrategyResolver";
import { generateMathVisualSpec } from "./MathVisualSpecGenerator";
import type { MathVisualGenerationPipelineResult } from "./MathVisualGenerationTypes";

function uniqueReasonCodes(values: MathIntelligenceReasonCode[]) {
  return [...new Set(values)];
}

function safeInterpretation(
  interpretation: MathStructureInterpretation | null,
): MathStructureInterpretation {
  return (
    interpretation || {
      domain: "unknown",
      problem_structure: "unknown",
      quantities: [],
      relationships: [],
      target: { kind: "unknown", label: null, quantity_id: null },
    }
  );
}

function finalRulesAnalysis(
  visualNeed: NonNullable<ReturnType<typeof evaluateMathVisualNeed>["visual_need"]>,
  disposition: NonNullable<ReturnType<typeof evaluateMathVisualNeed>["disposition"]>,
  interpretation: MathStructureInterpretation,
  strategy: MathIntelligenceAnalysis["strategy"],
  confidence: number,
  reasonCodes: MathIntelligenceReasonCode[],
): MathIntelligenceAnalysis {
  return {
    source: "rules",
    visual_need: visualNeed,
    disposition,
    interpretation,
    strategy,
    confidence: Math.max(0, Math.min(1, confidence)),
    reason_codes: uniqueReasonCodes(reasonCodes),
    model: null,
  };
}

export type MathIntelligencePipelineOptions = {
  aiProvider?: MathIntelligenceAIProvider;
};

/**
 * Main Phase 2A–2C orchestration.
 *
 * Exactly two intelligence levels:
 * 1. deterministic Dreamscape rules;
 * 2. one Luna call when the deterministic path is not safe enough.
 *
 * There is no intermediate model tier and no learner-runtime model call.
 */
export async function analyseMathQuestion(
  question: unknown,
  options: MathIntelligencePipelineOptions = {},
): Promise<MathIntelligencePipelineResult> {
  const input = normaliseMathIntelligenceQuestion(question);
  const ruleEvaluation = evaluateMathVisualNeed(input);
  const interpretationResult = interpretMathStructureWithRules(input);

  // Preserve/skip decisions do not require AI interpretation. We deliberately
  // avoid spending a Luna call when Dreamscape already knows that generation
  // should not occur.
  if (
    ruleEvaluation.resolved &&
    ruleEvaluation.visual_need &&
    ruleEvaluation.disposition &&
    ["skip", "preserve_existing", "preserve_media"].includes(ruleEvaluation.disposition)
  ) {
    const strategyResult = resolveMathVisualStrategyWithRules(
      input,
      ruleEvaluation,
      safeInterpretation(interpretationResult.interpretation),
    );

    return {
      input,
      rule_evaluation: ruleEvaluation,
      analysis: finalRulesAnalysis(
        ruleEvaluation.visual_need,
        ruleEvaluation.disposition,
        safeInterpretation(interpretationResult.interpretation),
        strategyResult.strategy || "none",
        Math.min(ruleEvaluation.confidence, strategyResult.confidence),
        [...ruleEvaluation.reason_codes, ...strategyResult.reason_codes],
      ),
    };
  }

  if (ruleEvaluation.resolved && interpretationResult.resolved) {
    const strategyResult = resolveMathVisualStrategyWithRules(
      input,
      ruleEvaluation,
      safeInterpretation(interpretationResult.interpretation),
    );

    if (
      strategyResult.resolved &&
      strategyResult.strategy &&
      ruleEvaluation.visual_need &&
      ruleEvaluation.disposition
    ) {
      return {
        input,
        rule_evaluation: ruleEvaluation,
        analysis: finalRulesAnalysis(
          ruleEvaluation.visual_need,
          ruleEvaluation.disposition,
          safeInterpretation(interpretationResult.interpretation),
          strategyResult.strategy,
          Math.min(
            ruleEvaluation.confidence,
            interpretationResult.confidence,
            strategyResult.confidence,
          ),
          [
            ...ruleEvaluation.reason_codes,
            ...interpretationResult.reason_codes,
            ...strategyResult.reason_codes,
          ],
        ),
      };
    }
  }

  // Any uncertainty in need, mathematical structure, or representation is
  // escalated once to Luna. Luna returns the complete analysis in one call.
  const aiProvider = options.aiProvider || new OpenAILunaProvider();
  const analysis = await aiProvider.analyse(input);

  return {
    input,
    rule_evaluation: ruleEvaluation,
    analysis,
  };
}


/**
 * Phase 2D–2E convenience orchestration for authoring/import/admin workflows.
 *
 * The intelligence decision remains exactly two levels: Dreamscape rules first,
 * then a single Luna escalation only when ambiguous. Spec generation itself is
 * deterministic Dreamscape code, then passes structural + semantic/source validation. Neither stage makes another model call.
 */
export async function generateMathVisualForQuestion(
  question: unknown,
  options: MathIntelligencePipelineOptions = {},
): Promise<MathVisualGenerationPipelineResult> {
  const analysed = await analyseMathQuestion(question, options);
  const generation = generateMathVisualSpec(analysed.input, analysed.analysis);
  return { ...analysed, generation };
}
