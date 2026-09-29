import type {
  MathVisualObjectType,
  MathVisualSpec,
} from "../../components/core-math/visual-engine/MathVisualTypes";
import type {
  MathIntelligenceAnalysis,
  MathVisualStrategy,
} from "./MathIntelligenceTypes";

/**
 * Phase 2F-A: semantic bridge between a validated Math Visual V2 spec and
 * Dreamscape's visual teaching system.
 *
 * These roles describe what an already-existing V2 object means pedagogically.
 * They do NOT create new objects and they never mutate the stored visual spec.
 */
export type MathTeachingVisualRole =
  | "main_shape"
  | "length_dimension"
  | "width_dimension"
  | "height_dimension"
  | "radius_dimension"
  | "measurement_dimension"
  | "angle_ray"
  | "angle_region"
  | "fraction_model"
  | "fraction_primary"
  | "fraction_comparison_reference"
  | "number_line"
  | "solid"
  | "data_chart"
  | "data_table"
  | "place_value_table"
  | "clock"
  | "bar_model"
  | "known_bar"
  | "unknown_bar"
  | "known_value"
  | "unknown_value"
  | "difference_dimension"
  | "total_dimension"
  | "part_segment"
  | "part_value"
  | "label"
  | "value"
  | "annotation"
  | "auxiliary";

export type MathTeachingRoleSource =
  | "metadata"
  | "stable_id"
  | "strategy"
  | "object_type";

export type MathTeachingTargetability =
  | "rich"
  | "partial"
  | "single_object"
  | "none";

export type MathTeachingRoleTarget = {
  visual_id: string;
  object_id: string;
  object_type: MathVisualObjectType;
  roles: MathTeachingVisualRole[];
  source: MathTeachingRoleSource;
};

export type MathTeachingRoleResolutionIssueCode =
  | "NO_VISUALS"
  | "NO_PROMPT_VISUAL"
  | "MULTIPLE_PROMPT_VISUALS"
  | "NO_TARGETABLE_OBJECTS"
  | "SEMANTIC_SUBPARTS_NOT_DIRECTLY_TARGETABLE";

export type MathTeachingRoleResolutionIssue = {
  code: MathTeachingRoleResolutionIssueCode;
  message: string;
  visual_id?: string;
  object_id?: string;
};

export type MathTeachingRoleIndex = Partial<
  Record<MathTeachingVisualRole, string[]>
>;

export type MathVisualTeachingRoleResolution = {
  strategy: MathVisualStrategy;
  preferred_visual_id: string | null;
  targets: MathTeachingRoleTarget[];
  by_role: MathTeachingRoleIndex;
  targetability: MathTeachingTargetability;
  issues: MathTeachingRoleResolutionIssue[];
  /**
   * True when a semantic object contains useful internal mathematical parts
   * (for example clock hands or individual chart bars) that are not separate
   * V2 object IDs yet. 2F-B can still generate conservative whole-object
   * teaching, but should not pretend those internal parts are independently
   * targetable.
   */
  has_limited_semantic_granularity: boolean;
};

export type MathVisualTeachingNeed =
  | "none"
  | "helpful"
  | "strongly_recommended";

export type MathVisualTeachingDecision =
  | "skip"
  | "generate_with_rules"
  | "route_to_luna"
  | "needs_review";

export type MathVisualTeachingNeedReasonCode =
  | "NO_VALID_VISUAL"
  | "NO_VISUAL_TEACHING_VALUE"
  | "FRACTION_PEDAGOGY"
  | "FRACTION_EQUIVALENCE_PEDAGOGY"
  | "NUMBER_LINE_PEDAGOGY"
  | "AREA_PEDAGOGY"
  | "PERIMETER_PEDAGOGY"
  | "ANGLE_PEDAGOGY"
  | "SOLID_PEDAGOGY"
  | "DATA_PEDAGOGY"
  | "CLOCK_PEDAGOGY"
  | "BAR_MODEL_PEDAGOGY"
  | "PLACE_VALUE_PEDAGOGY"
  | "MEASUREMENT_PEDAGOGY"
  | "LIMITED_TARGET_GRANULARITY"
  | "AMBIGUOUS_TEACHING_PATTERN"
  | "UNSUPPORTED_TEACHING_STRATEGY";

export type MathVisualTeachingNeedResult = {
  need: MathVisualTeachingNeed;
  decision: MathVisualTeachingDecision;
  confidence: number;
  reason_codes: MathVisualTeachingNeedReasonCode[];
  /** True when 2F-B has enough deterministic structure to build a safe plan. */
  can_generate_deterministically: boolean;
  /** True only when a meaningful visual exists but the teaching order is ambiguous. */
  requires_luna: boolean;
  targetability: MathTeachingTargetability;
};

export type MathVisualTeachingFoundationResult = {
  analysis: MathIntelligenceAnalysis;
  spec: MathVisualSpec;
  roles: MathVisualTeachingRoleResolution;
  need: MathVisualTeachingNeedResult;
};


export type MathTeachingVisualDraftStatus =
  | "generated"
  | "not_needed"
  | "deferred_to_luna"
  | "needs_review";

export type MathTeachingVisualDraftIssueCode =
  | "NO_TEACHING_REQUIRED"
  | "RULES_DEFER_TO_LUNA"
  | "ROLE_RESOLUTION_INCOMPLETE"
  | "NO_DETERMINISTIC_TEMPLATE"
  | "MISSING_PREFERRED_VISUAL";

export type MathTeachingVisualDraftIssue = {
  code: MathTeachingVisualDraftIssueCode;
  message: string;
};

export type MathTeachingVisualDraftResult = {
  status: MathTeachingVisualDraftStatus;
  source: "rules";
  generator_version: string;
  strategy: MathVisualStrategy;
  visual_id: string | null;
  template_id: string | null;
  lesson_steps: import("../../components/core-math/visual-engine/MathVisualState").MathVisualTeachingStep[];
  teach_me_steps: import("../../components/core-math/visual-engine/MathVisualState").MathVisualTeachingStep[];
  roles: MathVisualTeachingRoleResolution;
  need: MathVisualTeachingNeedResult;
  issues: MathTeachingVisualDraftIssue[];
};
