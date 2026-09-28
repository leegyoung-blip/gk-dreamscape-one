import type {
  MathIntelligenceQuestionInput,
  MathRuleEvaluation,
  MathStrategyResult,
  MathStructureInterpretation,
} from "./MathIntelligenceTypes";

function text(input: MathIntelligenceQuestionInput) {
  return `${input.topic} ${input.skill} ${input.instruction} ${input.prompt} ${input.explanation}`.toLocaleLowerCase();
}

/**
 * Phase 2C deterministic representation resolver.
 *
 * Curriculum defaults are intentional, not random:
 * - Fractions default to horizontal bars unless the question explicitly asks
 *   for a grid/set-style representation.
 * - Comparison/part-whole/ratio word problems use bar models.
 * - Geometry uses the narrowest supported representation.
 */
export function resolveMathVisualStrategyWithRules(
  input: MathIntelligenceQuestionInput,
  decision: MathRuleEvaluation,
  interpretation: MathStructureInterpretation,
): MathStrategyResult {
  if (decision.disposition === "preserve_existing") {
    return {
      resolved: true,
      strategy: "none",
      confidence: 1,
      reason_codes: ["EXISTING_V2_PRESERVED"],
    };
  }

  if (decision.disposition === "preserve_media" || decision.visual_need === "prohibited") {
    return {
      resolved: true,
      strategy: "preserve_media",
      confidence: 0.99,
      reason_codes: decision.reason_codes,
    };
  }

  if (decision.visual_need === "unnecessary" || decision.disposition === "skip") {
    return {
      resolved: true,
      strategy: "none",
      confidence: Math.max(0.9, decision.confidence),
      reason_codes: decision.reason_codes,
    };
  }

  const candidates = [...new Set(decision.candidate_strategies)];
  if (candidates.length === 1) {
    return {
      resolved: true,
      strategy: candidates[0],
      confidence: decision.confidence,
      reason_codes: decision.reason_codes,
    };
  }

  const source = text(input);

  if (interpretation.domain === "fractions") {
    if (interpretation.problem_structure === "fraction_equivalence") {
      return {
        resolved: true,
        strategy: "aligned_fraction_bars",
        confidence: 0.96,
        reason_codes: ["FRACTION_EQUIVALENCE"],
      };
    }

    if (source.includes("grid") || source.includes("squares") || source.includes("cells")) {
      return {
        resolved: true,
        strategy: "fraction_grid",
        confidence: 0.94,
        reason_codes: ["FRACTION_SHADED_WHOLE"],
      };
    }

    // DREAMSCAPE curriculum default: fractions are shown horizontally unless
    // the mathematical task specifically requires another representation.
    return {
      resolved: true,
      strategy: "fraction_bar",
      confidence: 0.95,
      reason_codes: ["FRACTION_SHADED_WHOLE"],
    };
  }

  if (interpretation.problem_structure === "comparison") {
    return {
      resolved: true,
      strategy: "bar_model_comparison",
      confidence: 0.94,
      reason_codes: ["WORD_PROBLEM_COMPARISON"],
    };
  }

  if (interpretation.problem_structure === "part_whole") {
    return {
      resolved: true,
      strategy: "bar_model_part_whole",
      confidence: 0.92,
      reason_codes: ["WORD_PROBLEM_PART_WHOLE"],
    };
  }

  if (interpretation.problem_structure === "ratio_relationship") {
    return {
      resolved: true,
      strategy: "bar_model_ratio",
      confidence: 0.92,
      reason_codes: ["WORD_PROBLEM_RATIO"],
    };
  }

  if (
    interpretation.domain === "geometry" &&
    (interpretation.problem_structure === "area" || interpretation.problem_structure === "perimeter") &&
    interpretation.quantities.some((item) => item.role === "length") &&
    interpretation.quantities.some((item) => item.role === "width")
  ) {
    return {
      resolved: true,
      strategy: "rectangle_dimensions",
      confidence: 0.96,
      reason_codes: ["RECTANGLE_DIMENSIONS"],
    };
  }

  if (interpretation.problem_structure === "angle") {
    return {
      resolved: true,
      strategy: "angle_diagram",
      confidence: 0.95,
      reason_codes: ["ANGLE_REQUIRED"],
    };
  }

  if (interpretation.problem_structure === "symmetry") {
    return {
      resolved: true,
      strategy: "symmetry_diagram",
      confidence: 0.95,
      reason_codes: ["SYMMETRY_REQUIRED"],
    };
  }

  if (interpretation.problem_structure === "volume") {
    return {
      resolved: true,
      strategy: source.includes("cuboid") ? "cuboid" : "cube",
      confidence: source.includes("cuboid") ? 0.95 : 0.82,
      reason_codes: ["SOLID_REQUIRED"],
    };
  }

  if (interpretation.problem_structure === "solid_net") {
    return {
      resolved: true,
      strategy: "solid_net",
      confidence: 0.97,
      reason_codes: ["NET_REQUIRED"],
    };
  }

  if (interpretation.problem_structure === "time_reading") {
    return {
      resolved: true,
      strategy: "clock",
      confidence: 0.97,
      reason_codes: ["CLOCK_REPRESENTATION"],
    };
  }

  if (candidates.length > 1) {
    return {
      resolved: false,
      strategy: null,
      confidence: 0.6,
      reason_codes: ["MULTIPLE_STRATEGIES_PLAUSIBLE"],
    };
  }

  return {
    resolved: false,
    strategy: null,
    confidence: 0.45,
    reason_codes: ["INSUFFICIENT_STRUCTURED_DATA"],
  };
}
