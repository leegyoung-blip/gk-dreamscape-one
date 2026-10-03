import type {
  CanonicalAnswerContext,
  CanonicalTeachingMedia,
  CanonicalTeachingQuestion,
  PrimaryLevel,
} from "../canonical";

export type TeachingUnderstandingStatus =
  | "ready"
  | "partial"
  | "needs_review";

export type MathematicalDomain =
  | "arithmetic"
  | "whole_numbers"
  | "fractions"
  | "decimals"
  | "percentage"
  | "ratio"
  | "algebra"
  | "geometry"
  | "measurement"
  | "time"
  | "money"
  | "data"
  | "speed_rate"
  | "average"
  | "patterns"
  | "logic"
  | "unknown";

export type ProblemStructure =
  | "direct_calculation"
  | "addition_change"
  | "subtraction_change"
  | "part_whole"
  | "missing_part"
  | "comparison_difference"
  | "equal_groups"
  | "sharing"
  | "grouping"
  | "repeated_addition"
  | "repeated_subtraction"
  | "place_value"
  | "number_composition"
  | "number_decomposition"
  | "fraction_of_whole"
  | "fraction_comparison"
  | "fraction_equivalence"
  | "percentage_of_whole"
  | "ratio_relationship"
  | "ratio_partition"
  | "unitary"
  | "transfer_difference"
  | "symbol_mapping"
  | "missing_number_equation"
  | "operation_chain"
  | "working_backwards"
  | "measure_compare"
  | "measure_change"
  | "measure_total"
  | "unit_conversion"
  | "money_total"
  | "money_change"
  | "money_difference"
  | "money_combination"
  | "money_purchase"
  | "area"
  | "perimeter"
  | "angle"
  | "shape_properties"
  | "property_matching"
  | "shape_composition"
  | "systematic_counting"
  | "pattern_rule"
  | "time_reading"
  | "time_interval"
  | "data_reading"
  | "data_comparison"
  | "data_classification"
  | "average"
  | "speed_distance_time"
  | "equation_unknown"
  | "multi_step"
  | "logic_strategy"
  | "unknown";

export type RequiredReasoning =
  | "addition"
  | "subtraction"
  | "multiplication"
  | "division"
  | "fraction_multiplication"
  | "fraction_comparison"
  | "fraction_equivalence"
  | "percentage"
  | "ratio_scaling"
  | "rate_scaling"
  | "transfer_reasoning"
  | "symbol_mapping"
  | "rule_inference"
  | "comparison"
  | "counting"
  | "systematic_enumeration"
  | "pattern_extension"
  | "place_value_reasoning"
  | "area_calculation"
  | "perimeter_calculation"
  | "time_calculation"
  | "money_calculation"
  | "unit_conversion"
  | "speed_calculation"
  | "average_calculation"
  | "equation_solving"
  | "algebraic_simplification"
  | "spatial_reasoning"
  | "data_interpretation"
  | "classification"
  | "property_matching"
  | "ordering"
  | "estimation"
  | "logical_elimination"
  | "working_backwards"
  | "unknown";

/**
 * Compatibility alias retained during the Phase 4A transition.
 * New code should prefer `requiredReasoning`.
 */
export type RequiredOperation = RequiredReasoning;

export type QuantityRole =
  | "given"
  | "target"
  | "intermediate"
  | "constraint"
  | "unknown";

export type MathematicalQuantity = {
  id: string;
  label: string | null;
  raw: string;
  value: number | null;
  numerator: number | null;
  denominator: number | null;
  unit: string | null;
  role: QuantityRole;
  sourceText: string;
};

export type MathematicalRelationshipType =
  | "equals"
  | "sum"
  | "difference"
  | "product"
  | "quotient"
  | "more_than"
  | "less_than"
  | "change_increase"
  | "change_decrease"
  | "part_of"
  | "fraction_of"
  | "percentage_of"
  | "ratio"
  | "area"
  | "perimeter"
  | "count_valid_positions"
  | "same_value_each"
  | "shared_equally"
  | "sequence_rule"
  | "property_match"
  | "depends_on"
  | "unknown";

export type MathematicalRelationship = {
  id: string;
  type: MathematicalRelationshipType;
  left: string | null;
  right: string | null;
  expression: string | null;
  sourceText: string;
  confidence: number;
};

export type TeachingTargetKind =
  | "value"
  | "count"
  | "unknown_value"
  | "money"
  | "measurement"
  | "fraction"
  | "percentage"
  | "ratio"
  | "area"
  | "perimeter"
  | "angle"
  | "time"
  | "shape"
  | "solid"
  | "statement"
  | "category"
  | "property"
  | "data_value"
  | "speed"
  | "average"
  | "expression"
  | "unknown";

export type TeachingTarget = {
  kind: TeachingTargetKind;
  label: string | null;
  quantityId: string | null;
  sourceText: string | null;
};

export type VisualRole =
  | "mathematical_diagram"
  | "reference_image"
  | "decorative_or_irrelevant"
  | "unknown";

export type VisualDependency =
  | "required"
  | "useful"
  | "not_required"
  | "unknown";

export type Manipulability = true | false | "unknown";

export type TeachingVisualContext = {
  hasVisual: boolean;
  role: VisualRole;
  mathematicalDependency: VisualDependency;
  potentiallyManipulable: Manipulability;
  sourceMedia: CanonicalTeachingMedia[];
  generatedV2: {
    exists: boolean;
    status: string | null;
    strategy: string | null;
    generatorVersion: string | null;
    hasSpec: boolean;
  } | null;
  reasonCodes: string[];
};

export type UnderstandingEvidenceSource =
  | "canonical"
  | "curriculum"
  | "rules"
  | "math_intelligence"
  | "answer_validation";

export type EvidenceRelationship =
  | "match"
  | "compatible"
  | "refinement"
  | "conflict";

export type UnderstandingEvidence = {
  source: UnderstandingEvidenceSource;
  code: string;
  message: string;
  confidence: number | null;
  relationship?: EvidenceRelationship | null;
};

export type UnderstandingIssueSeverity =
  | "blocking"
  | "warning"
  | "info";

export type UnderstandingIssueCode =
  | "CANONICAL_INPUT_NOT_READY"
  | "DOMAIN_UNRESOLVED"
  | "PROBLEM_STRUCTURE_UNRESOLVED"
  | "TARGET_UNRESOLVED"
  | "REASONING_UNRESOLVED"
  | "OPERATIONS_UNRESOLVED"
  | "UNDERSTANDING_CONFLICT"
  | "ANSWER_VALIDATION_MISMATCH"
  | "VISUAL_ROLE_UNRESOLVED"
  | "VISUAL_DEPENDENCY_UNRESOLVED"
  | "MULTIPART_DEPENDENCY_UNRESOLVED"
  | "LOW_DOMAIN_CONFIDENCE"
  | "LOW_STRUCTURE_CONFIDENCE"
  | "GRANULAR_SKILL_MAPPING_ABSENT";

export type UnderstandingIssue = {
  severity: UnderstandingIssueSeverity;
  code: UnderstandingIssueCode;
  message: string;
  path: string | null;
};

export type AnswerValidationStatus =
  | "matched"
  | "mismatched"
  | "not_checked";

export type AnswerValidation = {
  status: AnswerValidationStatus;
  expected: string | null;
  computed: string | null;
  reason: string | null;
};

export type CurriculumContext = {
  topic: string | null;
  primarySkill: string | null;
  secondarySkills: string[];
  legacySkill: string | null;
  skillTags: string[];
  inferredDomain: MathematicalDomain;
  confidence: number;
  reasonCodes: string[];
  selectedSource:
    | "primary_skill"
    | "legacy_skill"
    | "topic"
    | "secondary_skill"
    | "skill_tag"
    | "unknown";
};

export type TeachingPartUnderstanding = {
  key: string;
  label: string | null;
  prompt: string;
  domain: MathematicalDomain;
  problemStructure: ProblemStructure;
  quantities: MathematicalQuantity[];
  relationships: MathematicalRelationship[];

  requiredReasoning: RequiredReasoning[];

  /**
   * Compatibility alias. Mirrors `requiredReasoning`.
   */
  requiredOperations: RequiredOperation[];

  target: TeachingTarget | null;
  dependsOnPartKeys: string[];
  confidence: number;
  status: TeachingUnderstandingStatus;
  readyForMethodSelection: boolean;
  issues: UnderstandingIssue[];
  evidence: UnderstandingEvidence[];
};

export type TeachingQuestionUnderstanding = {
  schemaVersion: "4A-2.3";
  questionId: string | null;
  learnerLevel: PrimaryLevel | null;

  curriculumContext: CurriculumContext;

  domain: MathematicalDomain;
  problemStructure: ProblemStructure;

  quantities: MathematicalQuantity[];
  relationships: MathematicalRelationship[];

  requiredReasoning: RequiredReasoning[];

  /**
   * Compatibility alias. Mirrors `requiredReasoning`.
   */
  requiredOperations: RequiredOperation[];

  constraints: string[];
  units: string[];

  target: TeachingTarget | null;

  visualContext: TeachingVisualContext;

  multipart: {
    hasParts: boolean;
    parts: TeachingPartUnderstanding[];
    dependencies: Array<{
      fromPartKey: string;
      dependsOnPartKey: string;
      reason: string;
    }>;
  };

  answerValidation: AnswerValidation;

  confidence: number;
  status: TeachingUnderstandingStatus;

  /**
   * Strict Phase 4C gate.
   * Only `ready` understandings may proceed.
   */
  readyForMethodSelection: boolean;

  issues: UnderstandingIssue[];
  evidence: UnderstandingEvidence[];

  source: {
    canonical: CanonicalTeachingQuestion;
  };
};

export type UnderstandTeachingQuestionInput = {
  question: CanonicalTeachingQuestion;
};

export type BatchUnderstandingSummary = {
  schemaVersion: "4A-2.3";
  total: number;

  status: {
    ready: number;
    partial: number;
    needs_review: number;
  };

  strictlyReadyFor4C: number;
  blockedFrom4C: number;

  /**
   * Compatibility field; same value as `strictlyReadyFor4C`.
   */
  readyForMethodSelection: number;

  byLevel: Record<string, number>;
  byDomain: Record<string, number>;
  byProblemStructure: Record<string, number>;
  byVisualRole: Record<string, number>;
  byCurriculumSource: Record<string, number>;

  issueCounts: Record<string, number>;
  evidenceRelationshipCounts: Record<string, number>;
};
