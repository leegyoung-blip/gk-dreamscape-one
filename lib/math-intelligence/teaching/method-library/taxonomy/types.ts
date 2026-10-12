import type {
  TeachingContractDomain,
  TeachingContractProblemStructure,
  TeachingContractReasoning,
} from "../../contract/types";

export const PHASE4B1_TAXONOMY_SCHEMA_VERSION = "4B-1.1" as const;
export type Phase4B1TaxonomySchemaVersion =
  typeof PHASE4B1_TAXONOMY_SCHEMA_VERSION;

export type Phase4BPlannedSubphase = "4B-3" | "4B-4" | "4B-5" | "4B-6";

export type MethodProvenanceClass =
  | "official_curriculum"
  | "common_singapore_pedagogy"
  | "dreamscape_method";

export type Phase4BMethodFamilyId =
  | "number.place_value"
  | "number.add_sub"
  | "number.mult_div"
  | "number.factors_multiples"
  | "arithmetic.direct"
  | "arithmetic.operation_chain"
  | "algebra.equation_unknown"
  | "algebra.symbol_rule"
  | "patterns.sequence_rule"
  | "model.part_whole"
  | "model.comparison"
  | "model.change"
  | "model.equal_groups"
  | "heuristic.unitary"
  | "heuristic.transfer_difference"
  | "heuristic.working_backwards"
  | "heuristic.age_relationship"
  | "heuristic.systematic_enumeration"
  | "heuristic.logic_strategy"
  | "heuristic.multi_step"
  | "fraction.representation"
  | "fraction.of_quantity"
  | "fraction.compare_equivalence"
  | "fraction.operations"
  | "fraction.multi_step"
  | "percentage.of_whole"
  | "ratio.relationship"
  | "ratio.partition"
  | "rate.scaling"
  | "measurement.compare_change_total"
  | "measurement.unit_conversion"
  | "money.transaction"
  | "geometry.properties"
  | "geometry.angle"
  | "geometry.area_perimeter"
  | "time.read_interval"
  | "data.read_compare_classify"
  | "average.mean"
  | "speed.distance_time";

export type Phase4BMethodFamily = {
  familyId: Phase4BMethodFamilyId;
  title: string;
  category:
    | "number_arithmetic"
    | "word_problem_heuristics"
    | "rational_number"
    | "measurement_geometry_data";
  plannedSubphase: Phase4BPlannedSubphase;
  description: string;
  provenance: MethodProvenanceClass[];
  requiredVariantThemes: string[];
  genericFallback: false;
};

export type Phase4BStructureCoverageRule = {
  structure: TeachingContractProblemStructure;
  primaryFamilies: Phase4BMethodFamilyId[];
  supportingFamilies: Phase4BMethodFamilyId[];
  notes: string;
};

export type Phase4BReasoningCoverageRule = {
  reasoning: TeachingContractReasoning;
  supportingFamilies: Phase4BMethodFamilyId[];
};

export type Phase4BQuestionCoverageRequirement = {
  schemaVersion: Phase4B1TaxonomySchemaVersion;
  learnerLevel: number;
  domain: TeachingContractDomain;
  problemStructure: TeachingContractProblemStructure;
  requiredReasoning: TeachingContractReasoning[];
  primaryFamilies: Phase4BMethodFamilyId[];
  supportingFamilies: Phase4BMethodFamilyId[];
  allCandidateFamilies: Phase4BMethodFamilyId[];
};

export type Phase4B1CoverageIssueCode =
  | "UNMAPPED_STRUCTURE"
  | "UNMAPPED_REASONING"
  | "UNKNOWN_FAMILY_ID"
  | "GENERIC_FALLBACK_FAMILY"
  | "PHASE4B_CONSUMER_NOT_READY";

export type Phase4B1CoverageIssue = {
  code: Phase4B1CoverageIssueCode;
  message: string;
  path: string | null;
};
