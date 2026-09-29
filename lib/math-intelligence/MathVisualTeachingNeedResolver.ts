import type { MathIntelligenceAnalysis } from "./MathIntelligenceTypes";
import type {
  MathTeachingVisualRole,
  MathVisualTeachingNeedReasonCode,
  MathVisualTeachingNeedResult,
  MathVisualTeachingRoleResolution,
} from "./MathTeachingVisualTypes";

function hasRole(
  roles: MathVisualTeachingRoleResolution,
  role: MathTeachingVisualRole,
  minimum = 1,
) {
  return (roles.by_role[role]?.length ?? 0) >= minimum;
}

function result(
  roles: MathVisualTeachingRoleResolution,
  overrides: Omit<MathVisualTeachingNeedResult, "targetability">,
): MathVisualTeachingNeedResult {
  return {
    ...overrides,
    targetability: roles.targetability,
  };
}

function withGranularityReason(
  roles: MathVisualTeachingRoleResolution,
  reasons: MathVisualTeachingNeedReasonCode[],
) {
  return roles.has_limited_semantic_granularity
    ? [...new Set([...reasons, "LIMITED_TARGET_GRANULARITY" as const])]
    : reasons;
}

/**
 * Phase 2F-A deterministic visual-teaching need classifier.
 *
 * It decides whether progressive visual teaching would add value. It does not
 * generate steps and it does not call Luna. When the mathematical teaching
 * order is genuinely ambiguous, it returns route_to_luna for Phase 2F-D.
 */
export function resolveMathVisualTeachingNeed(
  analysis: MathIntelligenceAnalysis,
  roles: MathVisualTeachingRoleResolution,
): MathVisualTeachingNeedResult {
  if (!roles.preferred_visual_id || roles.targetability === "none") {
    return result(roles, {
      need: "none",
      decision: "skip",
      confidence: 0.99,
      reason_codes: ["NO_VALID_VISUAL"],
      can_generate_deterministically: false,
      requires_luna: false,
    });
  }

  if (analysis.strategy === "none" || analysis.strategy === "preserve_media") {
    return result(roles, {
      need: "none",
      decision: "skip",
      confidence: 0.99,
      reason_codes: ["NO_VISUAL_TEACHING_VALUE"],
      can_generate_deterministically: false,
      requires_luna: false,
    });
  }

  switch (analysis.strategy) {
    case "fraction_bar":
    case "fraction_grid": {
      const strong =
        analysis.interpretation.problem_structure === "fraction_comparison" ||
        analysis.interpretation.problem_structure === "fraction_equivalence";
      return result(roles, {
        need: strong ? "strongly_recommended" : "helpful",
        decision: "generate_with_rules",
        confidence: strong ? 0.95 : 0.9,
        reason_codes: withGranularityReason(roles, ["FRACTION_PEDAGOGY"]),
        can_generate_deterministically: hasRole(roles, "fraction_model"),
        requires_luna: false,
      });
    }

    case "aligned_fraction_bars":
      return result(roles, {
        need: "strongly_recommended",
        decision: hasRole(roles, "fraction_model", 2) ? "generate_with_rules" : "needs_review",
        confidence: 0.97,
        reason_codes: withGranularityReason(roles, ["FRACTION_EQUIVALENCE_PEDAGOGY"]),
        can_generate_deterministically: hasRole(roles, "fraction_model", 2),
        requires_luna: false,
      });

    case "number_line":
      return result(roles, {
        need:
          analysis.interpretation.problem_structure === "sequence_or_position"
            ? "strongly_recommended"
            : "helpful",
        decision: "generate_with_rules",
        confidence: 0.92,
        reason_codes: withGranularityReason(roles, ["NUMBER_LINE_PEDAGOGY"]),
        can_generate_deterministically: hasRole(roles, "number_line"),
        requires_luna: false,
      });

    case "rectangle_dimensions": {
      const target = analysis.interpretation.target.kind;
      const completeRectangle =
        hasRole(roles, "main_shape") &&
        hasRole(roles, "length_dimension") &&
        hasRole(roles, "width_dimension");

      if (target === "area") {
        return result(roles, {
          need: "strongly_recommended",
          decision: completeRectangle ? "generate_with_rules" : "needs_review",
          confidence: 0.99,
          reason_codes: ["AREA_PEDAGOGY"],
          can_generate_deterministically: completeRectangle,
          requires_luna: false,
        });
      }

      if (target === "perimeter") {
        return result(roles, {
          need: "strongly_recommended",
          decision: completeRectangle ? "generate_with_rules" : "needs_review",
          confidence: 0.99,
          reason_codes: ["PERIMETER_PEDAGOGY"],
          can_generate_deterministically: completeRectangle,
          requires_luna: false,
        });
      }

      return result(roles, {
        need: "helpful",
        decision: "route_to_luna",
        confidence: 0.72,
        reason_codes: ["AMBIGUOUS_TEACHING_PATTERN"],
        can_generate_deterministically: false,
        requires_luna: true,
      });
    }

    case "angle_diagram": {
      const complete = hasRole(roles, "angle_ray", 2) && hasRole(roles, "angle_region");
      return result(roles, {
        need: "strongly_recommended",
        decision: complete ? "generate_with_rules" : "needs_review",
        confidence: 0.98,
        reason_codes: ["ANGLE_PEDAGOGY"],
        can_generate_deterministically: complete,
        requires_luna: false,
      });
    }

    case "cube":
    case "cuboid":
      return result(roles, {
        need: analysis.interpretation.target.kind === "volume" ? "strongly_recommended" : "helpful",
        decision: hasRole(roles, "solid") ? "generate_with_rules" : "needs_review",
        confidence: 0.9,
        reason_codes: withGranularityReason(roles, ["SOLID_PEDAGOGY"]),
        can_generate_deterministically: hasRole(roles, "solid"),
        requires_luna: false,
      });

    case "bar_chart":
    case "line_graph":
    case "pie_chart":
      return result(roles, {
        need: "helpful",
        decision: hasRole(roles, "data_chart") ? "generate_with_rules" : "needs_review",
        confidence: 0.88,
        reason_codes: withGranularityReason(roles, ["DATA_PEDAGOGY"]),
        can_generate_deterministically: hasRole(roles, "data_chart"),
        requires_luna: false,
      });

    case "table":
      return result(roles, {
        need: "helpful",
        decision: hasRole(roles, "data_table") ? "generate_with_rules" : "needs_review",
        confidence: 0.88,
        reason_codes: withGranularityReason(roles, ["DATA_PEDAGOGY"]),
        can_generate_deterministically: hasRole(roles, "data_table"),
        requires_luna: false,
      });

    case "clock":
      return result(roles, {
        need: "helpful",
        decision: hasRole(roles, "clock") ? "generate_with_rules" : "needs_review",
        confidence: 0.86,
        reason_codes: withGranularityReason(roles, ["CLOCK_PEDAGOGY"]),
        can_generate_deterministically: hasRole(roles, "clock"),
        requires_luna: false,
      });

    case "bar_model_comparison": {
      const complete =
        hasRole(roles, "known_bar") &&
        hasRole(roles, "unknown_bar") &&
        hasRole(roles, "difference_dimension");
      return result(roles, {
        need: "strongly_recommended",
        decision: complete ? "generate_with_rules" : "needs_review",
        confidence: 0.99,
        reason_codes: ["BAR_MODEL_PEDAGOGY"],
        can_generate_deterministically: complete,
        requires_luna: false,
      });
    }

    case "bar_model_part_whole": {
      const complete = hasRole(roles, "part_segment", 2) && hasRole(roles, "total_dimension");
      return result(roles, {
        need: "strongly_recommended",
        decision: complete ? "generate_with_rules" : "needs_review",
        confidence: 0.98,
        reason_codes: ["BAR_MODEL_PEDAGOGY"],
        can_generate_deterministically: complete,
        requires_luna: false,
      });
    }

    case "place_value_table":
      return result(roles, {
        need: "helpful",
        decision: hasRole(roles, "place_value_table") ? "generate_with_rules" : "needs_review",
        confidence: 0.92,
        reason_codes: withGranularityReason(roles, ["PLACE_VALUE_PEDAGOGY"]),
        can_generate_deterministically: hasRole(roles, "place_value_table"),
        requires_luna: false,
      });

    case "measurement_diagram":
      return result(roles, {
        need: "helpful",
        decision: hasRole(roles, "measurement_dimension") ? "generate_with_rules" : "needs_review",
        confidence: 0.9,
        reason_codes: ["MEASUREMENT_PEDAGOGY"],
        can_generate_deterministically: hasRole(roles, "measurement_dimension"),
        requires_luna: false,
      });

    case "bar_model_ratio": {
      const complete =
        hasRole(roles, "ratio_group_a") &&
        hasRole(roles, "ratio_group_b") &&
        (roles.by_role.ratio_unit?.length || 0) >= 2;
      return result(roles, {
        need: "strongly_recommended",
        decision: complete ? "generate_with_rules" : "needs_review",
        confidence: 0.96,
        reason_codes: ["BAR_MODEL_PEDAGOGY"],
        can_generate_deterministically: complete,
        requires_luna: false,
      });
    }

    case "polygon_geometry":
    case "symmetry_diagram":
    case "solid_net":
    case "mixed":
      return result(roles, {
        need: "strongly_recommended",
        decision: "route_to_luna",
        confidence: 0.7,
        reason_codes: ["AMBIGUOUS_TEACHING_PATTERN"],
        can_generate_deterministically: false,
        requires_luna: true,
      });

    default:
      return result(roles, {
        need: "none",
        decision: "skip",
        confidence: 0.95,
        reason_codes: ["UNSUPPORTED_TEACHING_STRATEGY"],
        can_generate_deterministically: false,
        requires_luna: false,
      });
  }
}
