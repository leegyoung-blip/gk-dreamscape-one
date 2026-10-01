const VISUAL_NEEDS = ["required", "useful", "unnecessary", "prohibited"] as const;
const DISPOSITIONS = ["generate", "skip", "preserve_existing", "preserve_media", "needs_review"] as const;
const DOMAINS = [
  "arithmetic",
  "whole_numbers",
  "fractions",
  "decimals",
  "percentage",
  "ratio",
  "rate",
  "speed",
  "algebra",
  "geometry",
  "measurement",
  "time",
  "money",
  "data",
  "solid_geometry",
  "word_problem",
  "mixed",
  "unknown",
] as const;
const STRUCTURES = [
  "direct_calculation",
  "comparison",
  "part_whole",
  "equal_groups",
  "multiplicative_comparison",
  "ratio_relationship",
  "rate_relationship",
  "change",
  "sequence_or_position",
  "fraction_of_whole",
  "fraction_equivalence",
  "fraction_comparison",
  "shape_properties",
  "perimeter",
  "area",
  "angle",
  "symmetry",
  "volume",
  "solid_net",
  "unit_conversion",
  "time_reading",
  "data_reading",
  "data_comparison",
  "trend",
  "place_value",
  "rounding",
  "unknown",
] as const;
const STRATEGIES = [
  "none",
  "preserve_media",
  "fraction_bar",
  "fraction_grid",
  "aligned_fraction_bars",
  "number_line",
  "rectangle_dimensions",
  "polygon_geometry",
  "angle_diagram",
  "symmetry_diagram",
  "cube",
  "cuboid",
  "solid_net",
  "bar_chart",
  "line_graph",
  "pie_chart",
  "table",
  "clock",
  "bar_model_part_whole",
  "bar_model_comparison",
  "bar_model_ratio",
  "place_value_table",
  "measurement_diagram",
  "mixed",
] as const;
const QUANTITY_ROLES = [
  "known",
  "unknown",
  "total",
  "part",
  "difference",
  "factor",
  "rate",
  "length",
  "width",
  "height",
  "radius",
  "angle",
  "time",
  "count",
  "value",
  "other",
] as const;
const RELATIONSHIP_TYPES = [
  "equals",
  "difference",
  "sum",
  "product",
  "quotient",
  "ratio",
  "rate",
  "part_of",
  "greater_than",
  "less_than",
  "equivalent_to",
  "change_by",
  "other",
] as const;
const TARGET_KINDS = [
  "value",
  "quantity",
  "fraction",
  "length",
  "width",
  "height",
  "perimeter",
  "area",
  "angle",
  "volume",
  "time",
  "category_value",
  "relationship",
  "unknown",
] as const;
const REASON_CODES = [
  "EXISTING_V2_PRESERVED",
  "REAL_IMAGE_DEPENDENCY",
  "LEGACY_MEDIA_DEPENDENCY",
  "DIRECT_CALCULATION",
  "ROUNDING_TEXT_ONLY",
  "PLACE_VALUE_TEXT_ONLY",
  "CLOCK_REPRESENTATION",
  "FRACTION_SHADED_WHOLE",
  "FRACTION_EQUIVALENCE",
  "NUMBER_LINE_LANGUAGE",
  "GEOMETRY_REQUIRED",
  "RECTANGLE_DIMENSIONS",
  "ANGLE_REQUIRED",
  "SYMMETRY_REQUIRED",
  "SOLID_REQUIRED",
  "NET_REQUIRED",
  "DATA_REQUIRED",
  "TABLE_REQUIRED",
  "WORD_PROBLEM_COMPARISON",
  "WORD_PROBLEM_PART_WHOLE",
  "WORD_PROBLEM_RATIO",
  "MEASUREMENT_USEFUL",
  "MULTIPLE_STRATEGIES_PLAUSIBLE",
  "INSUFFICIENT_STRUCTURED_DATA",
  "AMBIGUOUS_LANGUAGE",
  "LUNA_CLASSIFIED",
] as const;

export const LUNA_MATH_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "visual_need",
    "disposition",
    "domain",
    "problem_structure",
    "quantities",
    "relationships",
    "target",
    "strategy",
    "confidence",
    "reason_codes",
  ],
  properties: {
    visual_need: { type: "string", enum: [...VISUAL_NEEDS] },
    disposition: { type: "string", enum: [...DISPOSITIONS] },
    domain: { type: "string", enum: [...DOMAINS] },
    problem_structure: { type: "string", enum: [...STRUCTURES] },
    quantities: {
      type: "array",
      maxItems: 16,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "value", "unit", "role"],
        properties: {
          id: { type: "string", minLength: 1, maxLength: 64 },
          label: { type: ["string", "null"], maxLength: 120 },
          value: { type: ["number", "null"] },
          unit: { type: ["string", "null"], maxLength: 30 },
          role: { type: "string", enum: [...QUANTITY_ROLES] },
        },
      },
    },
    relationships: {
      type: "array",
      maxItems: 16,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "left_id", "right_id", "value", "unit"],
        properties: {
          type: { type: "string", enum: [...RELATIONSHIP_TYPES] },
          left_id: { type: ["string", "null"], maxLength: 64 },
          right_id: { type: ["string", "null"], maxLength: 64 },
          value: { type: ["number", "null"] },
          unit: { type: ["string", "null"], maxLength: 30 },
        },
      },
    },
    target: {
      type: "object",
      additionalProperties: false,
      required: ["kind", "label", "quantity_id"],
      properties: {
        kind: { type: "string", enum: [...TARGET_KINDS] },
        label: { type: ["string", "null"], maxLength: 120 },
        quantity_id: { type: ["string", "null"], maxLength: 64 },
      },
    },
    strategy: { type: "string", enum: [...STRATEGIES] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    reason_codes: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: { type: "string", enum: [...REASON_CODES] },
    },
  },
} as const;

export const LUNA_MATH_ANALYSIS_SYSTEM_PROMPT = `You are the second and final intelligence level in DREAMSCAPE Math Intelligence.

You receive only Mathematics questions that Dreamscape's deterministic rule engine could not resolve safely.

Your job is NOT to draw a diagram. Do not output SVG, HTML, CSS, coordinates, or teaching prose.

Return only the supplied structured schema. The deterministic Phase 3A eligibility gate has already decided that this quiz item is intrinsically visual and is allowed to attempt Math Visual V2 generation. Determine:
1. the mathematical domain and problem structure;
2. only quantities and relationships explicitly supported by the supplied question data;
3. the single best strategy from the allowed intrinsic-visual family;
4. whether generation can proceed or the item needs human review.

Do not broaden the task into an explanatory diagram for an ordinary word problem.

Rules:
- Never invent numbers, labels, units, graph values, hidden geometry, clock times, or missing diagram information.
- Treat correct_answer and explanation as validation context only. Never use them to supply values, geometry, labels, categories, times, fractions, or relationships that are missing from the learner-visible instruction, prompt, options, or preserved source media.
- A generated prompt visual must never reveal a correct answer or derived unknown. Unknown quantities should remain unknown; if the required source visual cannot be reconstructed from learner-visible data, use disposition=needs_review.
- If the question depends on a photograph or real-world image, preserve that media rather than replacing it.
- If essential information needed to reconstruct a required diagram is absent, use disposition=needs_review and reason code INSUFFICIENT_STRUCTURED_DATA.
- The quiz eligibility gate is authoritative. Do not use bar_model_part_whole, bar_model_comparison, or bar_model_ratio merely to explain a word problem. Those explanatory representations belong in the Teaching Engine unless the learner-facing question explicitly requires interpreting a bar model.
- Use horizontal fraction bars only for genuine learner-facing fraction-representation tasks; do not add them to ordinary fraction calculations.
- If the required visual cannot be reconstructed exactly from learner-visible source data, use disposition=needs_review rather than inventing missing topology or values.
- The confidence value is confidence in this classification, not confidence in the student's answer.
- Include LUNA_CLASSIFIED in reason_codes.
`;
