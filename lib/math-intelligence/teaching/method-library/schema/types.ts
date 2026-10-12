import type {
  TeachingContractDomain,
  TeachingContractProblemStructure,
  TeachingContractReasoning,
} from "../../contract/types";
import type {
  MethodProvenanceClass,
  Phase4BMethodFamilyId,
} from "../taxonomy/types";
import type { Phase4BSourceClaimTag } from "../sources/types";

export const PHASE4B_METHOD_SCHEMA_VERSION = "4B.1" as const;
export type Phase4BMethodSchemaVersion = typeof PHASE4B_METHOD_SCHEMA_VERSION;

export type Phase4BPrimaryLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type TeachingMethodStatus = "draft" | "active" | "deprecated";

export type TeachingMethodCpaPolicy =
  | "not_required"
  | "optional"
  | "recommended"
  | "required_progression";

export type TeachingRepresentationType =
  | "concrete_materials"
  | "manipulatives"
  | "place_value_chart"
  | "number_bond"
  | "number_line"
  | "bar_model"
  | "strip_diagram"
  | "array"
  | "equal_groups_diagram"
  | "fraction_bar"
  | "area_model"
  | "set_model"
  | "table"
  | "graph"
  | "diagram"
  | "geometric_construction"
  | "timeline"
  | "clock_face"
  | "measurement_scale"
  | "ratio_table"
  | "double_number_line"
  | "unit_rate_table"
  | "money_model"
  | "symbolic_working"
  | "equation"
  | "written_algorithm"
  | "mental_strategy"
  | "verbal_reasoning"
  | "other";

export type TeachingMethodStageRole =
  | "activate_prior_knowledge"
  | "establish_meaning"
  | "represent"
  | "notice_relationship"
  | "reason"
  | "calculate"
  | "check"
  | "generalise";

export type TeachingMethodStage = {
  stageId: string;
  role: TeachingMethodStageRole;
  instructionPattern: string;
  learnerFocus: string;
  representationHints: TeachingRepresentationType[];
  optional: boolean;
};

export type TeachingRepresentationPolicy = {
  preferred: TeachingRepresentationType[];
  allowed: TeachingRepresentationType[];
  discouraged: TeachingRepresentationType[];
};

export type TeachingMethodMisconception = {
  misconceptionId: string;
  misconception: string;
  diagnosticSignals: string[];
  correctionApproach: string;
};

export type TeachingMethodProvenanceClaim = {
  claimId: string;
  classification: MethodProvenanceClass;
  sourceId: string | null;
  sourceClaimTag: Phase4BSourceClaimTag | null;
  statement: string;
  evidenceNote: string;
};

export type TeachingMethod = {
  schemaVersion: Phase4BMethodSchemaVersion;
  methodId: string;
  familyId: Phase4BMethodFamilyId;
  variantId: string;
  title: string;
  summary: string;
  status: TeachingMethodStatus;

  applicability: {
    levels: Phase4BPrimaryLevel[];
    domains: TeachingContractDomain[];
    structures: TeachingContractProblemStructure[];
    reasoning: TeachingContractReasoning[];
    curriculumSkills: string[];
    exclusions: string[];
  };

  pedagogy: {
    learningObjectivePattern: string;
    conceptualFocus: string[];
    prerequisiteConcepts: string[];
    cpaPolicy: TeachingMethodCpaPolicy;
    teachingSequence: TeachingMethodStage[];
    representations: TeachingRepresentationPolicy;
  };

  workedPattern: {
    notationGuidance: string[];
    generalisationPattern: string;
    checkPattern: string | null;
  };

  misconceptions: TeachingMethodMisconception[];

  visualGuidance: {
    visualUse: "never" | "optional" | "usually" | "essential";
    preferredVisualTypes: TeachingRepresentationType[];
    originalDiagramPolicy: "not_required" | "use_when_present" | "required";
    generatedVisualAllowed: boolean;
  };

  provenance: {
    classifications: MethodProvenanceClass[];
    claims: TeachingMethodProvenanceClaim[];
  };

  governance: {
    deterministicOnly: true;
    questionAgnostic: true;
    answerAgnostic: true;
    runtimeAgnostic: true;
    lunaAllowed: false;
    persistence: "version_controlled_source";
  };
};

export type TeachingMethodValidationSeverity = "blocker" | "warning";

export type TeachingMethodValidationIssueCode =
  | "UNSUPPORTED_SCHEMA_VERSION"
  | "INVALID_METHOD_ID"
  | "INVALID_VARIANT_ID"
  | "UNKNOWN_METHOD_FAMILY"
  | "MISSING_TITLE"
  | "MISSING_SUMMARY"
  | "NO_LEVELS"
  | "INVALID_LEVEL"
  | "NO_DOMAINS"
  | "NO_STRUCTURES"
  | "NO_REASONING"
  | "FAMILY_STRUCTURE_MISMATCH"
  | "FAMILY_REASONING_MISMATCH"
  | "MISSING_LEARNING_OBJECTIVE"
  | "NO_TEACHING_SEQUENCE"
  | "DUPLICATE_STAGE_ID"
  | "REPRESENTATION_POLICY_OVERLAP"
  | "DUPLICATE_MISCONCEPTION_ID"
  | "MISSING_PROVENANCE"
  | "MISSING_PROVENANCE_CLAIM"
  | "UNKNOWN_SOURCE_ID"
  | "SOURCE_CLASS_MISMATCH"
  | "SOURCE_CLAIM_TAG_NOT_ALLOWED"
  | "EXTERNAL_CLASS_WITHOUT_SOURCE"
  | "DREAMSCAPE_CLAIM_HAS_EXTERNAL_SOURCE"
  | "CLASSIFICATION_NOT_EVIDENCED"
  | "FORBIDDEN_ANSWER_OR_RUNTIME_FIELD"
  | "GOVERNANCE_FLAGS_INVALID"
  | "VISUAL_POLICY_INCONSISTENT";

export type TeachingMethodValidationIssue = {
  code: TeachingMethodValidationIssueCode;
  severity: TeachingMethodValidationSeverity;
  path: string | null;
  message: string;
};

export type TeachingMethodValidationResult = {
  valid: boolean;
  blockers: TeachingMethodValidationIssue[];
  warnings: TeachingMethodValidationIssue[];
};
