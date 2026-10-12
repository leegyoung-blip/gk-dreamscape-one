import { PHASE4B_METHOD_FAMILIES } from "../taxonomy/methodFamilyTaxonomy";
import { PHASE4B1_TAXONOMY_SCHEMA_VERSION } from "../taxonomy/types";
import {
  PHASE4B_METHOD_SCHEMA_VERSION,
  validateTeachingMethod,
} from "../schema";
import { validatePhase4BSourceManifest } from "../sources/validateSourceGovernance";
import {
  PHASE4B3_NUMBER_ARITHMETIC_METHODS,
  PHASE4B4_WORD_PROBLEM_HEURISTIC_METHODS,
  PHASE4B5_DECIMAL_METHOD_IDS,
  PHASE4B5_FAMILY_IDS,
  PHASE4B5_METHOD_THEME_COVERAGE,
  PHASE4B5_RATIONAL_NUMBER_METHODS,
  listPhase4B5CandidateMethods,
  type Phase4B5CandidateQuery,
} from "../methods";
import type {
  Phase4B5CandidateProbeResult,
  Phase4B5LibraryRun,
} from "./types4B5";

type Probe = {
  probeId: string;
  expectedMethodId: string;
  query: Phase4B5CandidateQuery;
};

const DECIMAL_REQUIRED_THEMES = [
  "decimal place value",
  "decimal compare/order",
  "decimal add/subtract",
  "decimal multiply/divide",
  "decimal estimation/check",
] as const;

const DECIMAL_THEME_BY_METHOD: Record<string, string[]> = {
  "number.place_value.decimal_place_value_chart": ["decimal place value"],
  "number.place_value.decimal_compare_order": ["decimal compare/order"],
  "arithmetic.direct.decimal_add_sub": ["decimal add/subtract"],
  "arithmetic.direct.decimal_mult_div": ["decimal multiply/divide"],
  "arithmetic.direct.decimal_estimation_check": ["decimal estimation/check"],
};

const PROBES: Probe[] = [
  {
    probeId: "p2_fraction_equal_parts",
    expectedMethodId: "fraction.representation.equal_parts_whole",
    query: { learnerLevel: 2, domain: "fractions", problemStructure: "fraction_representation", requiredReasoning: ["fraction_representation"], candidateFamilies: ["fraction.representation"] },
  },
  {
    probeId: "p2_fraction_set",
    expectedMethodId: "fraction.representation.part_of_set",
    query: { learnerLevel: 2, domain: "fractions", problemStructure: "fraction_representation", requiredReasoning: ["fraction_representation", "counting"], candidateFamilies: ["fraction.representation"] },
  },
  {
    probeId: "p3_fraction_number_line",
    expectedMethodId: "fraction.representation.bar_to_number_line",
    query: { learnerLevel: 3, domain: "fractions", problemStructure: "fraction_comparison", requiredReasoning: ["fraction_representation", "fraction_comparison", "ordering"], candidateFamilies: ["fraction.representation"] },
  },
  {
    probeId: "p3_fraction_quantity",
    expectedMethodId: "fraction.of_quantity.unit_fraction_then_scale",
    query: { learnerLevel: 3, domain: "fractions", problemStructure: "fraction_of_quantity", requiredReasoning: ["fraction_of_quantity", "division", "multiplication"], candidateFamilies: ["fraction.of_quantity"] },
  },
  {
    probeId: "p2_fraction_set_grouping",
    expectedMethodId: "fraction.of_quantity.set_grouping",
    query: { learnerLevel: 2, domain: "fractions", problemStructure: "fraction_of_quantity", requiredReasoning: ["fraction_of_quantity", "counting", "division"], candidateFamilies: ["fraction.of_quantity"] },
  },
  {
    probeId: "p5_fraction_equiv_grouping",
    expectedMethodId: "fraction.of_quantity.equivalent_grouping",
    query: { learnerLevel: 5, domain: "fractions", problemStructure: "fraction_equivalence", requiredReasoning: ["fraction_of_quantity", "fraction_equivalence", "multiplication"], candidateFamilies: ["fraction.of_quantity"] },
  },
  {
    probeId: "p3_same_denominator",
    expectedMethodId: "fraction.compare_equivalence.same_denominator",
    query: { learnerLevel: 3, domain: "fractions", problemStructure: "fraction_comparison", requiredReasoning: ["fraction_comparison", "ordering"], candidateFamilies: ["fraction.compare_equivalence"] },
  },
  {
    probeId: "p4_same_numerator",
    expectedMethodId: "fraction.compare_equivalence.same_numerator",
    query: { learnerLevel: 4, domain: "fractions", problemStructure: "fraction_comparison", requiredReasoning: ["fraction_comparison", "ordering"], candidateFamilies: ["fraction.compare_equivalence"] },
  },
  {
    probeId: "p4_equivalent_scale",
    expectedMethodId: "fraction.compare_equivalence.scale_equivalent",
    query: { learnerLevel: 4, domain: "fractions", problemStructure: "fraction_equivalence", requiredReasoning: ["fraction_equivalence", "multiplication"], candidateFamilies: ["fraction.compare_equivalence"] },
  },
  {
    probeId: "p5_common_denominator",
    expectedMethodId: "fraction.compare_equivalence.common_denominator",
    query: { learnerLevel: 5, domain: "fractions", problemStructure: "fraction_comparison", requiredReasoning: ["fraction_comparison", "fraction_equivalence", "common_multiple"], candidateFamilies: ["fraction.compare_equivalence"] },
  },
  {
    probeId: "p3_fraction_add_same_denom",
    expectedMethodId: "fraction.operations.add_sub_same_denominator",
    query: { learnerLevel: 3, domain: "fractions", problemStructure: "fraction_addition", requiredReasoning: ["fraction_addition", "addition"], candidateFamilies: ["fraction.operations"] },
  },
  {
    probeId: "p5_fraction_add_unlike",
    expectedMethodId: "fraction.operations.add_sub_unlike_denominator",
    query: { learnerLevel: 5, domain: "fractions", problemStructure: "fraction_addition", requiredReasoning: ["fraction_addition", "fraction_equivalence", "common_multiple"], candidateFamilies: ["fraction.operations"] },
  },
  {
    probeId: "p5_fraction_multiply",
    expectedMethodId: "fraction.operations.multiply_fraction",
    query: { learnerLevel: 5, domain: "fractions", problemStructure: "fraction_multiplication", requiredReasoning: ["fraction_multiplication", "fraction_of_quantity", "multiplication"], candidateFamilies: ["fraction.operations"] },
  },
  {
    probeId: "p6_fraction_divide",
    expectedMethodId: "fraction.operations.divide_fraction",
    query: { learnerLevel: 6, domain: "fractions", problemStructure: "fraction_division", requiredReasoning: ["fraction_division", "division", "fraction_equivalence"], candidateFamilies: ["fraction.operations"] },
  },
  {
    probeId: "p5_mixed_numbers",
    expectedMethodId: "fraction.operations.mixed_numbers",
    query: { learnerLevel: 5, domain: "fractions", problemStructure: "fraction_subtraction", requiredReasoning: ["fraction_subtraction"], candidateFamilies: ["fraction.operations"] },
  },
  {
    probeId: "p4_fraction_simplify",
    expectedMethodId: "fraction.operations.simplify_and_check",
    query: { learnerLevel: 4, domain: "fractions", problemStructure: "fraction_addition", requiredReasoning: ["fraction_equivalence", "fraction_comparison"], candidateFamilies: ["fraction.operations"] },
  },
  {
    probeId: "p4_remaining_fraction",
    expectedMethodId: "fraction.multi_step.remaining_fraction",
    query: { learnerLevel: 4, domain: "fractions", problemStructure: "fraction_multi_step", requiredReasoning: ["fraction_multi_step", "fraction_subtraction", "fraction_of_quantity"], candidateFamilies: ["fraction.multi_step"] },
  },
  {
    probeId: "p5_changing_whole",
    expectedMethodId: "fraction.multi_step.changing_whole",
    query: { learnerLevel: 5, domain: "fractions", problemStructure: "fraction_multi_step", requiredReasoning: ["fraction_multi_step", "fraction_of_quantity", "multiplication"], candidateFamilies: ["fraction.multi_step"] },
  },
  {
    probeId: "p5_fraction_of_fraction",
    expectedMethodId: "fraction.multi_step.fraction_of_fraction",
    query: { learnerLevel: 5, domain: "fractions", problemStructure: "fraction_multi_step", requiredReasoning: ["fraction_multi_step", "fraction_multiplication", "fraction_of_quantity"], candidateFamilies: ["fraction.multi_step"] },
  },
  {
    probeId: "p6_fraction_dependency",
    expectedMethodId: "fraction.multi_step.dependency_model",
    query: { learnerLevel: 6, domain: "fractions", problemStructure: "fraction_multi_step", requiredReasoning: ["fraction_multi_step", "addition", "subtraction"], candidateFamilies: ["fraction.multi_step"] },
  },
  {
    probeId: "p5_percent_hundred",
    expectedMethodId: "percentage.of_whole.per_hundred_model",
    query: { learnerLevel: 5, domain: "percentage", problemStructure: "percentage_of_whole", requiredReasoning: ["percentage"], candidateFamilies: ["percentage.of_whole"] },
  },
  {
    probeId: "p5_fdp_connection",
    expectedMethodId: "percentage.of_whole.fraction_decimal_percent",
    query: { learnerLevel: 5, domain: "percentage", problemStructure: "percentage_of_whole", requiredReasoning: ["percentage", "fraction_equivalence"], candidateFamilies: ["percentage.of_whole"] },
  },
  {
    probeId: "p6_percentage_quantity",
    expectedMethodId: "percentage.of_whole.percentage_of_quantity",
    query: { learnerLevel: 6, domain: "percentage", problemStructure: "percentage_of_whole", requiredReasoning: ["percentage", "rate_scaling", "multiplication"], candidateFamilies: ["percentage.of_whole"] },
  },
  {
    probeId: "p5_ratio_units",
    expectedMethodId: "ratio.relationship.ratio_units",
    query: { learnerLevel: 5, domain: "ratio", problemStructure: "ratio_relationship", requiredReasoning: ["ratio_scaling", "comparison"], candidateFamilies: ["ratio.relationship"] },
  },
  {
    probeId: "p5_equivalent_ratio",
    expectedMethodId: "ratio.relationship.equivalent_ratio_scale",
    query: { learnerLevel: 5, domain: "ratio", problemStructure: "ratio_relationship", requiredReasoning: ["ratio_scaling", "multiplication"], candidateFamilies: ["ratio.relationship"] },
  },
  {
    probeId: "p6_ratio_part_whole",
    expectedMethodId: "ratio.relationship.part_whole_connection",
    query: { learnerLevel: 6, domain: "ratio", problemStructure: "ratio_relationship", requiredReasoning: ["ratio_scaling", "addition", "comparison"], candidateFamilies: ["ratio.relationship"] },
  },
  {
    probeId: "p6_ratio_table",
    expectedMethodId: "ratio.relationship.scale_table",
    query: { learnerLevel: 6, domain: "ratio", problemStructure: "ratio_relationship", requiredReasoning: ["ratio_scaling", "division"], candidateFamilies: ["ratio.relationship"] },
  },
  {
    probeId: "p5_ratio_partition",
    expectedMethodId: "ratio.partition.total_units",
    query: { learnerLevel: 5, domain: "ratio", problemStructure: "ratio_partition", requiredReasoning: ["ratio_scaling", "addition", "division"], candidateFamilies: ["ratio.partition"] },
  },
  {
    probeId: "p6_ratio_difference",
    expectedMethodId: "ratio.partition.difference_units",
    query: { learnerLevel: 6, domain: "ratio", problemStructure: "ratio_partition", requiredReasoning: ["ratio_scaling", "comparison", "subtraction"], candidateFamilies: ["ratio.partition"] },
  },
  {
    probeId: "p5_ratio_known_part",
    expectedMethodId: "ratio.partition.known_part_to_whole",
    query: { learnerLevel: 5, domain: "ratio", problemStructure: "ratio_relationship", requiredReasoning: ["ratio_scaling", "division", "multiplication"], candidateFamilies: ["ratio.partition"] },
  },
  {
    probeId: "p5_rate_one_unit",
    expectedMethodId: "rate.scaling.one_unit_rate",
    query: { learnerLevel: 5, domain: "ratio", problemStructure: "unitary", requiredReasoning: ["rate_scaling", "division", "multiplication"], candidateFamilies: ["rate.scaling"] },
  },
  {
    probeId: "p6_rate_scale_factor",
    expectedMethodId: "rate.scaling.scale_factor",
    query: { learnerLevel: 6, domain: "speed_rate", problemStructure: "speed_distance_time", requiredReasoning: ["rate_scaling", "multiplication", "division"], candidateFamilies: ["rate.scaling"] },
  },
  {
    probeId: "p5_rate_table",
    expectedMethodId: "rate.scaling.proportional_table",
    query: { learnerLevel: 5, domain: "ratio", problemStructure: "ratio_relationship", requiredReasoning: ["rate_scaling", "multiplication"], candidateFamilies: ["rate.scaling"] },
  },
  {
    probeId: "p4_decimal_place_value",
    expectedMethodId: "number.place_value.decimal_place_value_chart",
    query: { learnerLevel: 4, domain: "decimals", problemStructure: "place_value", requiredReasoning: ["place_value_reasoning"], candidateFamilies: ["number.place_value"] },
  },
  {
    probeId: "p4_decimal_compare",
    expectedMethodId: "number.place_value.decimal_compare_order",
    query: { learnerLevel: 4, domain: "decimals", problemStructure: "place_value", requiredReasoning: ["place_value_reasoning", "ordering", "comparison"], candidateFamilies: ["number.place_value"] },
  },
  {
    probeId: "p4_decimal_add_sub",
    expectedMethodId: "arithmetic.direct.decimal_add_sub",
    query: { learnerLevel: 4, domain: "decimals", problemStructure: "direct_calculation", requiredReasoning: ["addition", "subtraction", "place_value_reasoning"], candidateFamilies: ["arithmetic.direct"] },
  },
  {
    probeId: "p5_decimal_mult_div",
    expectedMethodId: "arithmetic.direct.decimal_mult_div",
    query: { learnerLevel: 5, domain: "decimals", problemStructure: "direct_calculation", requiredReasoning: ["multiplication", "division", "place_value_reasoning"], candidateFamilies: ["arithmetic.direct"] },
  },
  {
    probeId: "p4_decimal_estimation",
    expectedMethodId: "arithmetic.direct.decimal_estimation_check",
    query: { learnerLevel: 4, domain: "decimals", problemStructure: "direct_calculation", requiredReasoning: ["estimation", "place_value_reasoning"], candidateFamilies: ["arithmetic.direct"] },
  },
];

function isDeepFrozen(value: unknown): boolean {
  if (!value || typeof value !== "object") return true;
  if (!Object.isFrozen(value)) return false;
  const children = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);
  return children.every((child) => isDeepFrozen(child));
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) dup.add(value);
    seen.add(value);
  }
  return [...dup];
}

export function runPhase4B5RationalNumberAudit(): Phase4B5LibraryRun {
  const sourceIssues = validatePhase4BSourceManifest();

  const invalidMethods = PHASE4B5_RATIONAL_NUMBER_METHODS
    .map((method) => ({ method, validation: validateTeachingMethod(method as any) }))
    .filter(({ validation }) => !validation.valid)
    .map(({ method, validation }) => ({
      methodId: method.methodId,
      blockerCodes: validation.blockers.map((blocker) => blocker.code),
    }));

  const methodIds = PHASE4B5_RATIONAL_NUMBER_METHODS.map((method) => method.methodId);
  const duplicateMethodIds = duplicates(methodIds);
  const previousIds = new Set([
    ...PHASE4B3_NUMBER_ARITHMETIC_METHODS.map((method) => method.methodId),
    ...PHASE4B4_WORD_PROBLEM_HEURISTIC_METHODS.map((method) => method.methodId),
  ]);
  const crossLibraryDuplicates = methodIds.filter((id) => previousIds.has(id));
  const duplicateVariants = duplicates(
    PHASE4B5_RATIONAL_NUMBER_METHODS.map((method) => `${method.familyId}::${method.variantId}`),
  );

  const byFamily: Phase4B5LibraryRun["byFamily"] = {};
  const themeGaps: Phase4B5LibraryRun["themeGaps"] = [];
  let requiredThemeCount = 0;
  let coveredThemeCount = 0;

  for (const familyId of PHASE4B5_FAMILY_IDS) {
    const family = PHASE4B_METHOD_FAMILIES.find((item) => item.familyId === familyId)!;
    const methods = PHASE4B5_RATIONAL_NUMBER_METHODS.filter((method) => method.familyId === familyId);
    const coveredThemes = [...new Set(
      PHASE4B5_METHOD_THEME_COVERAGE
        .filter((item) => item.familyId === familyId)
        .flatMap((item) => item.themes),
    )];
    const missingThemes = family.requiredVariantThemes.filter((theme) => !coveredThemes.includes(theme));

    requiredThemeCount += family.requiredVariantThemes.length;
    coveredThemeCount += family.requiredVariantThemes.length - missingThemes.length;
    missingThemes.forEach((requiredTheme) => themeGaps.push({ familyId, requiredTheme }));

    byFamily[familyId] = {
      methodCount: methods.length,
      methodIds: methods.map((method) => method.methodId),
      requiredThemes: [...family.requiredVariantThemes],
      coveredThemes,
      missingThemes,
    };
  }

  const decimalCoveredThemes = [...new Set(
    PHASE4B5_DECIMAL_METHOD_IDS.flatMap((methodId) => DECIMAL_THEME_BY_METHOD[methodId] ?? []),
  )];
  const decimalMissingThemes = DECIMAL_REQUIRED_THEMES.filter((theme) => !decimalCoveredThemes.includes(theme));

  const candidateProbes: Phase4B5CandidateProbeResult[] = PROBES.map((probe) => {
    const candidates = listPhase4B5CandidateMethods(probe.query).map((method) => method.methodId);
    return {
      probeId: probe.probeId,
      expectedMethodId: probe.expectedMethodId,
      candidateMethodIds: candidates,
      passed: candidates.includes(probe.expectedMethodId),
    };
  });

  const methodsAllFrozen = PHASE4B5_RATIONAL_NUMBER_METHODS.every((method) => isDeepFrozen(method));
  const governanceSafe = PHASE4B5_RATIONAL_NUMBER_METHODS.every((method) =>
    method.governance.deterministicOnly === true &&
    method.governance.lunaAllowed === false &&
    method.governance.persistence === "version_controlled_source"
  );
  const noGenericFallback = PHASE4B_METHOD_FAMILIES
    .filter((family) => PHASE4B5_FAMILY_IDS.includes(family.familyId))
    .every((family) => family.genericFallback === false);
  const essentialVisualsValid = PHASE4B5_RATIONAL_NUMBER_METHODS
    .filter((method) => method.visualGuidance.visualUse === "essential")
    .every((method) => method.visualGuidance.preferredVisualTypes.length > 0 && method.visualGuidance.generatedVisualAllowed === true);

  const checks: Phase4B5LibraryRun["checks"] = {
    every4B5FamilyHasProductionMethod: PHASE4B5_FAMILY_IDS.every((familyId) => (byFamily[familyId]?.methodCount ?? 0) > 0),
    every4B5RequiredThemeCovered: themeGaps.length === 0,
    decimalTeachingCoverageComplete: decimalMissingThemes.length === 0 && PHASE4B5_DECIMAL_METHOD_IDS.length >= 5,
    allMethodsValidate: invalidMethods.length === 0,
    allMethodIdsUniqueWithin4B5: duplicateMethodIds.length === 0,
    noMethodIdCollisionWithEarlierLibraries: crossLibraryDuplicates.length === 0,
    variantsUniqueWithinFamily: duplicateVariants.length === 0,
    allMethodsDeepFrozen: methodsAllFrozen,
    sourceManifestValid: sourceIssues.length === 0,
    allCandidateProbesPass: candidateProbes.every((probe) => probe.passed),
    noGenericFallbackFamily: noGenericFallback,
    noLunaOrPersistenceEscapeHatch: governanceSafe,
    allVisualEssentialMethodsDeclareVisuals: essentialVisualsValid,
  };

  return {
    schemaVersion: "4B-5-QA.1",
    methodSchemaVersion: PHASE4B_METHOD_SCHEMA_VERSION,
    taxonomySchemaVersion: PHASE4B1_TAXONOMY_SCHEMA_VERSION,
    summary: {
      methods: PHASE4B5_RATIONAL_NUMBER_METHODS.length,
      activeMethods: PHASE4B5_RATIONAL_NUMBER_METHODS.filter((method) => method.status === "active").length,
      familiesRequired: PHASE4B5_FAMILY_IDS.length,
      familiesRepresented: PHASE4B5_FAMILY_IDS.filter((familyId) => (byFamily[familyId]?.methodCount ?? 0) > 0).length,
      requiredThemes: requiredThemeCount,
      coveredThemes: coveredThemeCount,
      decimalMethods: PHASE4B5_DECIMAL_METHOD_IDS.length,
      decimalThemesRequired: DECIMAL_REQUIRED_THEMES.length,
      decimalThemesCovered: decimalCoveredThemes.length,
      invalidMethods: invalidMethods.length,
      duplicateMethodIdsWithin4B5: duplicateMethodIds.length,
      duplicateMethodIdsAcross4B3To4B5: crossLibraryDuplicates.length,
      duplicateVariantsWithinFamily: duplicateVariants.length,
      sourceManifestIssues: sourceIssues.length,
      candidateProbesPassed: candidateProbes.filter((probe) => probe.passed).length,
      candidateProbesTotal: candidateProbes.length,
    },
    byFamily,
    decimalCoverage: {
      methodIds: [...PHASE4B5_DECIMAL_METHOD_IDS],
      requiredThemes: [...DECIMAL_REQUIRED_THEMES],
      coveredThemes: decimalCoveredThemes,
      missingThemes: decimalMissingThemes,
    },
    invalidMethods,
    themeGaps,
    duplicateMethodIdsAcrossLibraries: crossLibraryDuplicates,
    candidateProbes,
    checks,
    passed: Object.values(checks).every(Boolean),
  };
}
