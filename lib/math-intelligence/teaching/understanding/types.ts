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
  | "word_problem"
  | "patterns"
  | "logic"
  | "unknown";

export type ProblemStructure =
  | "direct_calculation"
  | "comparison_difference"
  | "part_whole"
  | "equal_groups"
  | "sharing"
  | "fraction_of_whole"
  | "percentage_of_whole"
  | "ratio_relationship"
  | "unitary"
  | "area"
  | "perimeter"
  | "angle"
  | "shape_properties"
  | "systematic_counting"
  | "pattern_rule"
  | "time_interval"
  | "money_transaction"
  | "data_reading"
  | "speed_distance_time"
  | "equation_unknown"
  | "multi_step"
  | "unknown";

export type RequiredOperation =
  | "addition"
  | "subtraction"
  | "multiplication"
  | "division"
  | "fraction_multiplication"
  | "percentage"
  | "ratio_scaling"
  | "comparison"
  | "counting"
  | "pattern_extension"
  | "area_calculation"
  | "perimeter_calculation"
  | "time_calculation"
  | "money_calculation"
  | "speed_calculation"
  | "equation_solving"
  | "spatial_reasoning"
  | "data_interpretation"
  | "logical_reasoning"
  | "unknown";

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
  | "part_of"
  | "fraction_of"
  | "percentage_of"
  | "ratio"
  | "area"
  | "perimeter"
  | "count_valid_positions"
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

export type TeachingTarget = {
  kind: string;
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
  | "rules"
  | "math_intelligence"
  | "answer_validation";

export type UnderstandingEvidence = {
  source: UnderstandingEvidenceSource;
  code: string;
  message: string;
  confidence: number | null;
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
  | "OPERATIONS_UNRESOLVED"
  | "UNDERSTANDING_CONFLICT"
  | "ANSWER_VALIDATION_MISMATCH"
  | "VISUAL_ROLE_UNRESOLVED"
  | "VISUAL_DEPENDENCY_UNRESOLVED"
  | "MULTIPART_DEPENDENCY_UNRESOLVED";

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

export type TeachingPartUnderstanding = {
  key: string;
  label: string | null;
  prompt: string;
  domain: MathematicalDomain;
  problemStructure: ProblemStructure;
  quantities: MathematicalQuantity[];
  relationships: MathematicalRelationship[];
  requiredOperations: RequiredOperation[];
  target: TeachingTarget | null;
  dependsOnPartKeys: string[];
  confidence: number;
  status: TeachingUnderstandingStatus;
  issues: UnderstandingIssue[];
  evidence: UnderstandingEvidence[];
};

export type TeachingQuestionUnderstanding = {
  schemaVersion: "4A-2.1";
  questionId: string | null;
  learnerLevel: PrimaryLevel | null;
  domain: MathematicalDomain;
  problemStructure: ProblemStructure;
  quantities: MathematicalQuantity[];
  relationships: MathematicalRelationship[];
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
  schemaVersion: "4A-2.1";
  total: number;
  status: {
    ready: number;
    partial: number;
    needs_review: number;
  };
  readyForMethodSelection: number;
  byLevel: Record<string, number>;
  byDomain: Record<string, number>;
  byProblemStructure: Record<string, number>;
  byVisualRole: Record<string, number>;
  issueCounts: Record<string, number>;
};
