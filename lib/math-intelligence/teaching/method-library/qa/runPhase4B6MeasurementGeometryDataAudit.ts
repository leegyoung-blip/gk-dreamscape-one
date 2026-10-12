import { PHASE4B1_TAXONOMY_SCHEMA_VERSION } from "../taxonomy/types";
import { PHASE4B_METHOD_FAMILIES } from "../taxonomy/methodFamilyTaxonomy";
import { PHASE4B_METHOD_SCHEMA_VERSION, validateTeachingMethod } from "../schema";
import { validatePhase4BSourceManifest } from "../sources";
import {
  PHASE4B3_NUMBER_ARITHMETIC_METHODS,
  PHASE4B4_WORD_PROBLEM_HEURISTIC_METHODS,
  PHASE4B5_RATIONAL_NUMBER_METHODS,
  PHASE4B6_FAMILY_IDS,
  PHASE4B6_MEASUREMENT_GEOMETRY_DATA_METHODS,
  PHASE4B6_METHOD_THEME_COVERAGE,
  listPhase4B6CandidateMethods,
  type Phase4B6CandidateQuery,
} from "../methods";
import type { Phase4B6CandidateProbeResult, Phase4B6LibraryRun } from "./types4B6";

type Probe = {
  probeId: string;
  expectedMethodId: string;
  query: Phase4B6CandidateQuery;
};

const PROBES: Probe[] = [
  { probeId: "p2_measure_compare", expectedMethodId: "measurement.compare_change_total.compare_same_unit", query: { learnerLevel: 2, domain: "measurement", problemStructure: "measure_compare", requiredReasoning: ["comparison", "subtraction"], candidateFamilies: ["measurement.compare_change_total"] } },
  { probeId: "p3_measure_change", expectedMethodId: "measurement.compare_change_total.track_change", query: { learnerLevel: 3, domain: "measurement", problemStructure: "measure_change", requiredReasoning: ["addition", "subtraction"], candidateFamilies: ["measurement.compare_change_total"] } },
  { probeId: "p2_measure_total", expectedMethodId: "measurement.compare_change_total.combine_total", query: { learnerLevel: 2, domain: "measurement", problemStructure: "measure_total", requiredReasoning: ["addition"], candidateFamilies: ["measurement.compare_change_total"] } },

  { probeId: "p3_unit_equivalence", expectedMethodId: "measurement.unit_conversion.equivalence_bridge", query: { learnerLevel: 3, domain: "measurement", problemStructure: "unit_conversion", requiredReasoning: ["unit_conversion", "multiplication"], candidateFamilies: ["measurement.unit_conversion"] } },
  { probeId: "p4_convert_before_compare", expectedMethodId: "measurement.unit_conversion.convert_before_operating", query: { learnerLevel: 4, domain: "measurement", problemStructure: "unit_conversion", requiredReasoning: ["unit_conversion", "comparison"], candidateFamilies: ["measurement.unit_conversion"] } },
  { probeId: "p6_compound_unit", expectedMethodId: "measurement.unit_conversion.compound_unit_bridge", query: { learnerLevel: 6, domain: "speed_rate", problemStructure: "speed_distance_time", requiredReasoning: ["unit_conversion", "rate_scaling"], candidateFamilies: ["measurement.unit_conversion"] } },

  { probeId: "p2_money_total", expectedMethodId: "money.transaction.total_cost", query: { learnerLevel: 2, domain: "money", problemStructure: "money_total", requiredReasoning: ["money_calculation", "addition"], candidateFamilies: ["money.transaction"] } },
  { probeId: "p2_money_change", expectedMethodId: "money.transaction.change_from_payment", query: { learnerLevel: 2, domain: "money", problemStructure: "money_change", requiredReasoning: ["money_calculation", "subtraction"], candidateFamilies: ["money.transaction"] } },
  { probeId: "p3_money_difference", expectedMethodId: "money.transaction.price_difference", query: { learnerLevel: 3, domain: "money", problemStructure: "money_difference", requiredReasoning: ["money_calculation", "comparison"], candidateFamilies: ["money.transaction"] } },
  { probeId: "p4_money_combination", expectedMethodId: "money.transaction.combination_purchase", query: { learnerLevel: 4, domain: "money", problemStructure: "money_combination", requiredReasoning: ["money_calculation", "multiplication", "addition"], candidateFamilies: ["money.transaction"] } },

  { probeId: "p2_geometry_properties", expectedMethodId: "geometry.properties.defining_properties", query: { learnerLevel: 2, domain: "geometry", problemStructure: "shape_properties", requiredReasoning: ["property_matching", "classification"], candidateFamilies: ["geometry.properties"] } },
  { probeId: "p3_geometry_match", expectedMethodId: "geometry.properties.classify_match", query: { learnerLevel: 3, domain: "geometry", problemStructure: "property_matching", requiredReasoning: ["classification", "logical_elimination"], candidateFamilies: ["geometry.properties"] } },
  { probeId: "p2_geometry_compose", expectedMethodId: "geometry.properties.compose_decompose", query: { learnerLevel: 2, domain: "geometry", problemStructure: "shape_composition", requiredReasoning: ["spatial_reasoning", "counting"], candidateFamilies: ["geometry.properties"] } },
  { probeId: "p4_spatial_visualise", expectedMethodId: "geometry.properties.spatial_visualisation", query: { learnerLevel: 4, domain: "geometry", problemStructure: "shape_composition", requiredReasoning: ["spatial_reasoning"], candidateFamilies: ["geometry.properties"] } },

  { probeId: "p3_identify_angle", expectedMethodId: "geometry.angle.identify_angle", query: { learnerLevel: 3, domain: "geometry", problemStructure: "angle", requiredReasoning: ["spatial_reasoning", "classification"], candidateFamilies: ["geometry.angle"] } },
  { probeId: "p5_angle_relationship", expectedMethodId: "geometry.angle.known_relationships", query: { learnerLevel: 5, domain: "geometry", problemStructure: "angle", requiredReasoning: ["addition", "subtraction", "spatial_reasoning"], candidateFamilies: ["geometry.angle"] } },
  { probeId: "p6_unknown_angle", expectedMethodId: "geometry.angle.find_unknown", query: { learnerLevel: 6, domain: "geometry", problemStructure: "angle", requiredReasoning: ["equation_solving", "subtraction"], candidateFamilies: ["geometry.angle"] } },

  { probeId: "p3_area_perim_meaning", expectedMethodId: "geometry.area_perimeter.distinguish_boundary_surface", query: { learnerLevel: 3, domain: "geometry", problemStructure: "area", requiredReasoning: ["area_calculation", "classification"], candidateFamilies: ["geometry.area_perimeter"] } },
  { probeId: "p4_rectangle_formula", expectedMethodId: "geometry.area_perimeter.rectangle_formula_meaning", query: { learnerLevel: 4, domain: "geometry", problemStructure: "perimeter", requiredReasoning: ["perimeter_calculation", "addition"], candidateFamilies: ["geometry.area_perimeter"] } },
  { probeId: "p5_composite_area", expectedMethodId: "geometry.area_perimeter.composite_decomposition", query: { learnerLevel: 5, domain: "geometry", problemStructure: "area", requiredReasoning: ["area_calculation", "spatial_reasoning"], candidateFamilies: ["geometry.area_perimeter"] } },
  { probeId: "p6_missing_dimension", expectedMethodId: "geometry.area_perimeter.missing_dimension", query: { learnerLevel: 6, domain: "geometry", problemStructure: "area", requiredReasoning: ["area_calculation", "division", "equation_solving"], candidateFamilies: ["geometry.area_perimeter"] } },

  { probeId: "p1_clock_read", expectedMethodId: "time.read_interval.read_clock_face", query: { learnerLevel: 1, domain: "time", problemStructure: "time_reading", requiredReasoning: ["time_calculation", "counting"], candidateFamilies: ["time.read_interval"] } },
  { probeId: "p3_elapsed_timeline", expectedMethodId: "time.read_interval.elapsed_timeline", query: { learnerLevel: 3, domain: "time", problemStructure: "time_interval", requiredReasoning: ["time_calculation", "addition"], candidateFamilies: ["time.read_interval"] } },
  { probeId: "p4_hour_min_conversion", expectedMethodId: "time.read_interval.hour_minute_conversion", query: { learnerLevel: 4, domain: "time", problemStructure: "time_interval", requiredReasoning: ["unit_conversion", "time_calculation"], candidateFamilies: ["time.read_interval"] } },
  { probeId: "p5_timetable", expectedMethodId: "time.read_interval.timetable_interval", query: { learnerLevel: 5, domain: "time", problemStructure: "time_interval", requiredReasoning: ["time_calculation", "data_interpretation"], candidateFamilies: ["time.read_interval"] } },

  { probeId: "p1_data_table", expectedMethodId: "data.read_compare_classify.read_table", query: { learnerLevel: 1, domain: "data", problemStructure: "data_reading", requiredReasoning: ["data_interpretation", "counting"], candidateFamilies: ["data.read_compare_classify"] } },
  { probeId: "p2_picture_graph", expectedMethodId: "data.read_compare_classify.picture_graph_scale", query: { learnerLevel: 2, domain: "data", problemStructure: "data_reading", requiredReasoning: ["data_interpretation", "multiplication"], candidateFamilies: ["data.read_compare_classify"] } },
  { probeId: "p3_bar_graph", expectedMethodId: "data.read_compare_classify.bar_graph_read", query: { learnerLevel: 3, domain: "data", problemStructure: "data_reading", requiredReasoning: ["data_interpretation", "comparison"], candidateFamilies: ["data.read_compare_classify"] } },
  { probeId: "p4_data_classify", expectedMethodId: "data.read_compare_classify.compare_classify", query: { learnerLevel: 4, domain: "data", problemStructure: "data_classification", requiredReasoning: ["classification", "data_interpretation"], candidateFamilies: ["data.read_compare_classify"] } },

  { probeId: "p4_average_equal_share", expectedMethodId: "average.mean.equal_share", query: { learnerLevel: 4, domain: "average", problemStructure: "average", requiredReasoning: ["average_calculation", "division"], candidateFamilies: ["average.mean"] } },
  { probeId: "p5_average_calculate", expectedMethodId: "average.mean.total_divide_count", query: { learnerLevel: 5, domain: "average", problemStructure: "average", requiredReasoning: ["average_calculation", "addition", "division"], candidateFamilies: ["average.mean"] } },
  { probeId: "p5_average_total", expectedMethodId: "average.mean.find_total", query: { learnerLevel: 5, domain: "average", problemStructure: "average", requiredReasoning: ["average_calculation", "multiplication"], candidateFamilies: ["average.mean"] } },
  { probeId: "p6_average_count", expectedMethodId: "average.mean.find_count", query: { learnerLevel: 6, domain: "average", problemStructure: "average", requiredReasoning: ["average_calculation", "division", "equation_solving"], candidateFamilies: ["average.mean"] } },

  { probeId: "p5_speed_unit_rate", expectedMethodId: "speed.distance_time.speed_as_unit_rate", query: { learnerLevel: 5, domain: "speed_rate", problemStructure: "speed_distance_time", requiredReasoning: ["speed_calculation", "rate_scaling", "division"], candidateFamilies: ["speed.distance_time"] } },
  { probeId: "p5_find_speed", expectedMethodId: "speed.distance_time.find_speed", query: { learnerLevel: 5, domain: "speed_rate", problemStructure: "speed_distance_time", requiredReasoning: ["speed_calculation", "division", "unit_conversion"], candidateFamilies: ["speed.distance_time"] } },
  { probeId: "p6_find_distance", expectedMethodId: "speed.distance_time.find_distance", query: { learnerLevel: 6, domain: "speed_rate", problemStructure: "speed_distance_time", requiredReasoning: ["speed_calculation", "multiplication", "rate_scaling"], candidateFamilies: ["speed.distance_time"] } },
  { probeId: "p6_find_time", expectedMethodId: "speed.distance_time.find_time", query: { learnerLevel: 6, domain: "speed_rate", problemStructure: "speed_distance_time", requiredReasoning: ["speed_calculation", "division", "rate_scaling"], candidateFamilies: ["speed.distance_time"] } },
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

export function runPhase4B6MeasurementGeometryDataAudit(): Phase4B6LibraryRun {
  const sourceIssues = validatePhase4BSourceManifest();

  const invalidMethods = PHASE4B6_MEASUREMENT_GEOMETRY_DATA_METHODS
    .map((method) => ({ method, validation: validateTeachingMethod(method as any) }))
    .filter(({ validation }) => !validation.valid)
    .map(({ method, validation }) => ({
      methodId: method.methodId,
      blockerCodes: validation.blockers.map((blocker) => blocker.code),
    }));

  const methodIds = PHASE4B6_MEASUREMENT_GEOMETRY_DATA_METHODS.map((method) => method.methodId);
  const duplicateMethodIds = duplicates(methodIds);
  const previousIds = new Set([
    ...PHASE4B3_NUMBER_ARITHMETIC_METHODS.map((method) => method.methodId),
    ...PHASE4B4_WORD_PROBLEM_HEURISTIC_METHODS.map((method) => method.methodId),
    ...PHASE4B5_RATIONAL_NUMBER_METHODS.map((method) => method.methodId),
  ]);
  const crossLibraryDuplicates = methodIds.filter((id) => previousIds.has(id));
  const duplicateVariants = duplicates(
    PHASE4B6_MEASUREMENT_GEOMETRY_DATA_METHODS.map((method) => `${method.familyId}::${method.variantId}`),
  );

  const byFamily: Phase4B6LibraryRun["byFamily"] = {};
  const themeGaps: Phase4B6LibraryRun["themeGaps"] = [];
  let requiredThemeCount = 0;
  let coveredThemeCount = 0;

  for (const familyId of PHASE4B6_FAMILY_IDS) {
    const family = PHASE4B_METHOD_FAMILIES.find((item) => item.familyId === familyId)!;
    const methods = PHASE4B6_MEASUREMENT_GEOMETRY_DATA_METHODS.filter((method) => method.familyId === familyId);
    const coveredThemes = [...new Set(
      PHASE4B6_METHOD_THEME_COVERAGE
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

  const candidateProbes: Phase4B6CandidateProbeResult[] = PROBES.map((probe) => {
    const candidates = listPhase4B6CandidateMethods(probe.query).map((method) => method.methodId);
    return {
      probeId: probe.probeId,
      expectedMethodId: probe.expectedMethodId,
      candidateMethodIds: candidates,
      passed: candidates.includes(probe.expectedMethodId),
    };
  });

  const methodsAllFrozen = PHASE4B6_MEASUREMENT_GEOMETRY_DATA_METHODS.every((method) => isDeepFrozen(method));
  const governanceSafe = PHASE4B6_MEASUREMENT_GEOMETRY_DATA_METHODS.every((method) =>
    method.governance.deterministicOnly === true &&
    method.governance.lunaAllowed === false &&
    method.governance.persistence === "version_controlled_source"
  );
  const noGenericFallback = PHASE4B_METHOD_FAMILIES
    .filter((family) => PHASE4B6_FAMILY_IDS.includes(family.familyId))
    .every((family) => family.genericFallback === false);
  const essentialVisualsValid = PHASE4B6_MEASUREMENT_GEOMETRY_DATA_METHODS
    .filter((method) => method.visualGuidance.visualUse === "essential")
    .every((method) => method.visualGuidance.preferredVisualTypes.length > 0 && method.visualGuidance.generatedVisualAllowed === true);

  const checks: Phase4B6LibraryRun["checks"] = {
    every4B6FamilyHasProductionMethod: PHASE4B6_FAMILY_IDS.every((familyId) => (byFamily[familyId]?.methodCount ?? 0) > 0),
    every4B6RequiredThemeCovered: themeGaps.length === 0,
    allMethodsValidate: invalidMethods.length === 0,
    allMethodIdsUniqueWithin4B6: duplicateMethodIds.length === 0,
    noMethodIdCollisionWithEarlierLibraries: crossLibraryDuplicates.length === 0,
    variantsUniqueWithinFamily: duplicateVariants.length === 0,
    allMethodsDeepFrozen: methodsAllFrozen,
    sourceManifestValid: sourceIssues.length === 0,
    allCandidateProbesPass: candidateProbes.every((probe) => probe.passed),
    noGenericFallbackFamily: noGenericFallback,
    noLunaOrPersistenceEscapeHatch: governanceSafe,
    allVisualEssentialMethodsDeclareVisuals: essentialVisualsValid,
  };

  const passed = Object.values(checks).every(Boolean);

  return {
    schemaVersion: "4B-6-QA.1",
    methodSchemaVersion: PHASE4B_METHOD_SCHEMA_VERSION,
    taxonomySchemaVersion: PHASE4B1_TAXONOMY_SCHEMA_VERSION,
    summary: {
      methods: PHASE4B6_MEASUREMENT_GEOMETRY_DATA_METHODS.length,
      activeMethods: PHASE4B6_MEASUREMENT_GEOMETRY_DATA_METHODS.filter((method) => method.status === "active").length,
      familiesRequired: PHASE4B6_FAMILY_IDS.length,
      familiesRepresented: PHASE4B6_FAMILY_IDS.filter((familyId) => (byFamily[familyId]?.methodCount ?? 0) > 0).length,
      requiredThemes: requiredThemeCount,
      coveredThemes: coveredThemeCount,
      invalidMethods: invalidMethods.length,
      duplicateMethodIdsWithin4B6: duplicateMethodIds.length,
      duplicateMethodIdsAcross4B3To4B6: crossLibraryDuplicates.length,
      duplicateVariantsWithinFamily: duplicateVariants.length,
      sourceManifestIssues: sourceIssues.length,
      candidateProbesPassed: candidateProbes.filter((probe) => probe.passed).length,
      candidateProbesTotal: candidateProbes.length,
    },
    byFamily,
    invalidMethods,
    themeGaps,
    duplicateMethodIdsAcrossLibraries: crossLibraryDuplicates,
    candidateProbes,
    checks,
    passed,
  };
}
