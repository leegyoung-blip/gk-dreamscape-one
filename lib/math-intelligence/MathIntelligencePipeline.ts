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
import type { MathTeachingAIProvider } from "./ai/TeachingAIProvider";
import { generateMathTeachingVisualWithFallback } from "./MathTeachingVisualPipeline";
import type { MathTeachingVisualPipelineResult } from "./MathTeachingVisualPipeline";

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


function enforceQuizVisualGateAfterLuna(
  analysis: MathIntelligenceAnalysis,
  ruleEvaluation: ReturnType<typeof evaluateMathVisualNeed>,
): MathIntelligenceAnalysis {
  // Phase 3A: Luna is not allowed to broaden quiz visual eligibility. It is
  // only a second-level interpreter for questions that the deterministic gate
  // already classified as intrinsically visual and safe for V2 generation.
  if (
    ruleEvaluation.quiz_visual_requirement !== "required" ||
    !ruleEvaluation.auto_generate_v2
  ) {
    return {
      ...analysis,
      visual_need:
        ruleEvaluation.quiz_visual_requirement === "optional_enrichment"
          ? "useful"
          : ruleEvaluation.quiz_visual_requirement === "not_needed"
            ? "unnecessary"
            : "required",
      disposition:
        ruleEvaluation.quiz_visual_requirement === "optional_enrichment" ||
        ruleEvaluation.quiz_visual_requirement === "not_needed"
          ? "skip"
          : "needs_review",
      strategy: "none",
      confidence: Math.min(analysis.confidence, ruleEvaluation.confidence),
      reason_codes: uniqueReasonCodes([
        ...ruleEvaluation.reason_codes,
        ...analysis.reason_codes,
      ]),
    };
  }

  const allowed = ruleEvaluation.candidate_strategies.filter(
    (strategy) => strategy !== "none" && strategy !== "preserve_media",
  );

  if (allowed.length > 0 && !allowed.some((strategy) => strategy === analysis.strategy)) {
    return {
      ...analysis,
      visual_need: "required",
      disposition: "needs_review",
      strategy: "none",
      confidence: Math.min(analysis.confidence, ruleEvaluation.confidence),
      reason_codes: uniqueReasonCodes([
        ...ruleEvaluation.reason_codes,
        ...analysis.reason_codes,
        "INSUFFICIENT_STRUCTURED_DATA",
      ]),
    };
  }

  if (analysis.disposition !== "generate" || analysis.visual_need !== "required") {
    return {
      ...analysis,
      visual_need: "required",
      disposition: "needs_review",
      strategy: allowed.length === 1 ? allowed[0] : analysis.strategy,
      confidence: Math.min(analysis.confidence, ruleEvaluation.confidence),
      reason_codes: uniqueReasonCodes([
        ...ruleEvaluation.reason_codes,
        ...analysis.reason_codes,
      ]),
    };
  }

  return {
    ...analysis,
    visual_need: "required",
    disposition: "generate",
    confidence: Math.min(analysis.confidence, ruleEvaluation.confidence),
    reason_codes: uniqueReasonCodes([
      ...ruleEvaluation.reason_codes,
      ...analysis.reason_codes,
    ]),
  };
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

  // Preserve/skip/review decisions do not require AI interpretation. We
  // deliberately avoid spending a Luna call when Dreamscape already knows
  // that generation should not occur or the current V2 schema cannot safely
  // represent the source.
  if (
    ruleEvaluation.resolved &&
    ruleEvaluation.visual_need &&
    ruleEvaluation.disposition &&
    ["skip", "preserve_existing", "preserve_media", "needs_review"].includes(ruleEvaluation.disposition)
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
  const lunaAnalysis = await aiProvider.analyse(input);
  const analysis = enforceQuizVisualGateAfterLuna(lunaAnalysis, ruleEvaluation);

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


export type MathVisualAndTeachingPipelineOptions = MathIntelligencePipelineOptions & {
  teachingAIProvider?: MathTeachingAIProvider;
  minLunaTeachingConfidence?: number;
};

export type MathVisualAndTeachingPipelineResult =
  MathVisualGenerationPipelineResult & {
    teaching: MathTeachingVisualPipelineResult | null;
  };

/**
 * Phase 2F-D end-to-end authoring/import helper.
 *
 * It generates + validates the V2 visual first. Only a successfully generated
 * spec proceeds into visual teaching. Teaching then uses Dreamscape rules and,
 * only when explicitly deferred by those rules, one constrained Luna call.
 * This helper does not save or merge content; Phase 2F-C remains the safe
 * ownership-aware merge boundary.
 */
export async function generateMathVisualAndTeachingForQuestion(
  question: unknown,
  options: MathVisualAndTeachingPipelineOptions = {},
): Promise<MathVisualAndTeachingPipelineResult> {
  const visual = await generateMathVisualForQuestion(question, options);

  if (visual.generation.status !== "generated" || !visual.generation.spec) {
    return { ...visual, teaching: null };
  }

  const teaching = await generateMathTeachingVisualWithFallback(
    visual.input,
    visual.analysis,
    visual.generation.spec,
    {
      aiProvider: options.teachingAIProvider,
      minLunaConfidence: options.minLunaTeachingConfidence,
    },
  );

  return { ...visual, teaching };
}
