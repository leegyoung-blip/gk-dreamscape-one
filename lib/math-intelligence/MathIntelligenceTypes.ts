/**
 * DREAMSCAPE Math Intelligence — Phase 2A–2C shared types.
 *
 * Two-level architecture only:
 * 1. Dreamscape deterministic rules.
 * 2. OpenAI Luna for questions the deterministic layer cannot resolve safely.
 *
 * This layer decides WHETHER a visual is useful and WHAT representation should
 * be used. It does not generate Math Visual V2 objects yet (Phase 2D).
 */

export type MathIntelligenceSource = "rules" | "luna";

export type MathVisualNeed =
  | "required"
  | "useful"
  | "unnecessary"
  | "prohibited";

export type MathGenerationDisposition =
  | "generate"
  | "skip"
  | "preserve_existing"
  | "preserve_media"
  | "needs_review";

export type MathDomain =
  | "arithmetic"
  | "whole_numbers"
  | "fractions"
  | "decimals"
  | "percentage"
  | "ratio"
  | "rate"
  | "speed"
  | "algebra"
  | "geometry"
  | "measurement"
  | "time"
  | "money"
  | "data"
  | "solid_geometry"
  | "word_problem"
  | "mixed"
  | "unknown";

export type MathProblemStructure =
  | "direct_calculation"
  | "comparison"
  | "part_whole"
  | "equal_groups"
  | "multiplicative_comparison"
  | "ratio_relationship"
  | "rate_relationship"
  | "change"
  | "sequence_or_position"
  | "fraction_of_whole"
  | "fraction_equivalence"
  | "fraction_comparison"
  | "shape_properties"
  | "perimeter"
  | "area"
  | "angle"
  | "symmetry"
  | "volume"
  | "solid_net"
  | "unit_conversion"
  | "time_reading"
  | "data_reading"
  | "data_comparison"
  | "trend"
  | "place_value"
  | "rounding"
  | "unknown";

export type MathVisualStrategy =
  | "none"
  | "preserve_media"
  | "fraction_bar"
  | "fraction_grid"
  | "aligned_fraction_bars"
  | "number_line"
  | "rectangle_dimensions"
  | "polygon_geometry"
  | "angle_diagram"
  | "symmetry_diagram"
  | "cube"
  | "cuboid"
  | "solid_net"
  | "bar_chart"
  | "line_graph"
  | "pie_chart"
  | "table"
  | "clock"
  | "bar_model_part_whole"
  | "bar_model_comparison"
  | "bar_model_ratio"
  | "place_value_table"
  | "measurement_diagram"
  | "mixed";

export type MathQuantityRole =
  | "known"
  | "unknown"
  | "total"
  | "part"
  | "difference"
  | "factor"
  | "rate"
  | "length"
  | "width"
  | "height"
  | "radius"
  | "angle"
  | "time"
  | "count"
  | "value"
  | "other";

export type MathRelationshipType =
  | "equals"
  | "difference"
  | "sum"
  | "product"
  | "quotient"
  | "ratio"
  | "rate"
  | "part_of"
  | "greater_than"
  | "less_than"
  | "equivalent_to"
  | "change_by"
  | "other";

export type MathTargetKind =
  | "value"
  | "quantity"
  | "fraction"
  | "length"
  | "width"
  | "height"
  | "perimeter"
  | "area"
  | "angle"
  | "volume"
  | "time"
  | "category_value"
  | "relationship"
  | "unknown";

export type MathQuantity = {
  id: string;
  label: string | null;
  value: number | null;
  unit: string | null;
  role: MathQuantityRole;
};

export type MathRelationship = {
  type: MathRelationshipType;
  left_id: string | null;
  right_id: string | null;
  value: number | null;
  unit: string | null;
};

export type MathTarget = {
  kind: MathTargetKind;
  label: string | null;
  quantity_id: string | null;
};

export type MathStructureInterpretation = {
  domain: MathDomain;
  problem_structure: MathProblemStructure;
  quantities: MathQuantity[];
  relationships: MathRelationship[];
  target: MathTarget;
};

export type MathIntelligenceReasonCode =
  | "EXISTING_V2_PRESERVED"
  | "REAL_IMAGE_DEPENDENCY"
  | "LEGACY_MEDIA_DEPENDENCY"
  | "DIRECT_CALCULATION"
  | "ROUNDING_TEXT_ONLY"
  | "PLACE_VALUE_TEXT_ONLY"
  | "CLOCK_REPRESENTATION"
  | "FRACTION_SHADED_WHOLE"
  | "FRACTION_EQUIVALENCE"
  | "NUMBER_LINE_LANGUAGE"
  | "GEOMETRY_REQUIRED"
  | "RECTANGLE_DIMENSIONS"
  | "ANGLE_REQUIRED"
  | "SYMMETRY_REQUIRED"
  | "SOLID_REQUIRED"
  | "NET_REQUIRED"
  | "DATA_REQUIRED"
  | "TABLE_REQUIRED"
  | "WORD_PROBLEM_COMPARISON"
  | "WORD_PROBLEM_PART_WHOLE"
  | "WORD_PROBLEM_RATIO"
  | "MEASUREMENT_USEFUL"
  | "MULTIPLE_STRATEGIES_PLAUSIBLE"
  | "INSUFFICIENT_STRUCTURED_DATA"
  | "AMBIGUOUS_LANGUAGE"
  | "LUNA_CLASSIFIED";

export type MathExistingMediaSummary = {
  has_math_visual_v2: boolean;
  has_real_image: boolean;
  has_legacy_svg: boolean;
  has_option_images: boolean;
  stimulus_type: string | null;
};

export type MathQuestionOptionInput = {
  id: string;
  text: string;
};

export type MathIntelligenceQuestionInput = {
  id: string | null;
  primary_level: number | null;
  topic: string;
  skill: string;
  difficulty: number | null;
  question_type: string;
  instruction: string;
  prompt: string;
  options: MathQuestionOptionInput[];
  correct_answer: unknown;
  explanation: string;
  existing_media: MathExistingMediaSummary;
};

export type MathRuleEvaluation = {
  resolved: boolean;
  visual_need: MathVisualNeed | null;
  disposition: MathGenerationDisposition | null;
  candidate_strategies: MathVisualStrategy[];
  confidence: number;
  reason_codes: MathIntelligenceReasonCode[];
};

export type MathInterpretationResult = {
  resolved: boolean;
  interpretation: MathStructureInterpretation | null;
  confidence: number;
  reason_codes: MathIntelligenceReasonCode[];
};

export type MathStrategyResult = {
  resolved: boolean;
  strategy: MathVisualStrategy | null;
  confidence: number;
  reason_codes: MathIntelligenceReasonCode[];
};

export type MathIntelligenceAnalysis = {
  source: MathIntelligenceSource;
  visual_need: MathVisualNeed;
  disposition: MathGenerationDisposition;
  interpretation: MathStructureInterpretation;
  strategy: MathVisualStrategy;
  confidence: number;
  reason_codes: MathIntelligenceReasonCode[];
  model: string | null;
};

export type MathIntelligencePipelineResult = {
  input: MathIntelligenceQuestionInput;
  analysis: MathIntelligenceAnalysis;
  rule_evaluation: MathRuleEvaluation;
};
