import {
  PHASE4B3_NUMBER_ARITHMETIC_METHODS,
  PHASE4B4_METHOD_THEME_COVERAGE,
  PHASE4B4_WORD_PROBLEM_HEURISTIC_METHODS,
  listPhase4B4CandidateMethods,
  type Phase4B4CandidateQuery,
} from "../methods";
import { PHASE4B_METHOD_SCHEMA_VERSION, validateTeachingMethod } from "../schema";
import { validatePhase4BSourceManifest } from "../sources/validateSourceGovernance";
import { PHASE4B_METHOD_FAMILIES } from "../taxonomy/methodFamilyTaxonomy";
import { PHASE4B1_TAXONOMY_SCHEMA_VERSION, type Phase4BMethodFamilyId } from "../taxonomy/types";
import type {
  Phase4B4CandidateProbeResult,
  Phase4B4LibraryRun,
} from "./types4B4";

const PHASE4B4_FAMILY_IDS: Phase4BMethodFamilyId[] = [
  "model.part_whole",
  "model.comparison",
  "model.change",
  "model.equal_groups",
  "heuristic.unitary",
  "heuristic.transfer_difference",
  "heuristic.working_backwards",
  "heuristic.age_relationship",
  "heuristic.systematic_enumeration",
  "heuristic.logic_strategy",
  "heuristic.multi_step",
];

type Probe = {
  probeId: string;
  expectedMethodId: string;
  query: Phase4B4CandidateQuery;
};

const PROBES: Probe[] = [
  {
    probeId: "p2_part_whole_missing_part",
    expectedMethodId: "model.part_whole.known_whole_find_part",
    query: { learnerLevel: 2, domain: "whole_numbers", problemStructure: "part_whole", requiredReasoning: ["subtraction"], candidateFamilies: ["model.part_whole"] },
  },
  {
    probeId: "p3_parts_find_whole",
    expectedMethodId: "model.part_whole.parts_find_whole",
    query: { learnerLevel: 3, domain: "whole_numbers", problemStructure: "part_whole", requiredReasoning: ["addition"], candidateFamilies: ["model.part_whole"] },
  },
  {
    probeId: "p2_comparison_difference",
    expectedMethodId: "model.comparison.aligned_bars_difference",
    query: { learnerLevel: 2, domain: "whole_numbers", problemStructure: "comparison_difference", requiredReasoning: ["comparison", "subtraction"], candidateFamilies: ["model.comparison"] },
  },
  {
    probeId: "p5_unit_comparison_ratio",
    expectedMethodId: "model.comparison.unit_comparison",
    query: { learnerLevel: 5, domain: "ratio", problemStructure: "ratio_relationship", requiredReasoning: ["ratio_scaling", "comparison"], candidateFamilies: ["model.comparison"] },
  },
  {
    probeId: "p1_forward_change",
    expectedMethodId: "model.change.forward_change",
    query: { learnerLevel: 1, domain: "whole_numbers", problemStructure: "addition_change", requiredReasoning: ["addition"], candidateFamilies: ["model.change"] },
  },
  {
    probeId: "p4_find_change",
    expectedMethodId: "model.change.find_change",
    query: { learnerLevel: 4, domain: "whole_numbers", problemStructure: "subtraction_change", requiredReasoning: ["subtraction", "comparison"], candidateFamilies: ["model.change"] },
  },
  {
    probeId: "p3_equal_groups_total",
    expectedMethodId: "model.equal_groups.groups_to_total",
    query: { learnerLevel: 3, domain: "whole_numbers", problemStructure: "equal_groups", requiredReasoning: ["multiplication"], candidateFamilies: ["model.equal_groups"] },
  },
  {
    probeId: "p3_sharing_grouping_distinction",
    expectedMethodId: "model.equal_groups.sharing_grouping_distinction",
    query: { learnerLevel: 3, domain: "whole_numbers", problemStructure: "grouping", requiredReasoning: ["division"], candidateFamilies: ["model.equal_groups"] },
  },
  {
    probeId: "p5_unitary_one_then_many",
    expectedMethodId: "heuristic.unitary.one_then_many",
    query: { learnerLevel: 5, domain: "whole_numbers", problemStructure: "unitary", requiredReasoning: ["rate_scaling", "division", "multiplication"], candidateFamilies: ["heuristic.unitary"] },
  },
  {
    probeId: "p6_unitary_ratio",
    expectedMethodId: "heuristic.unitary.scale_down_then_up",
    query: { learnerLevel: 6, domain: "ratio", problemStructure: "ratio_relationship", requiredReasoning: ["ratio_scaling", "multiplication"], candidateFamilies: ["heuristic.unitary"] },
  },
  {
    probeId: "p5_transfer_double_effect",
    expectedMethodId: "heuristic.transfer_difference.double_effect",
    query: { learnerLevel: 5, domain: "money", problemStructure: "transfer_difference", requiredReasoning: ["transfer_reasoning", "comparison", "addition", "subtraction"], candidateFamilies: ["heuristic.transfer_difference"] },
  },
  {
    probeId: "p2_working_backwards",
    expectedMethodId: "heuristic.working_backwards.reverse_operations",
    query: { learnerLevel: 2, domain: "algebra", problemStructure: "missing_number_equation", requiredReasoning: ["working_backwards", "equation_solving"], candidateFamilies: ["heuristic.working_backwards"] },
  },
  {
    probeId: "p4_reverse_events",
    expectedMethodId: "heuristic.working_backwards.reverse_event_sequence",
    query: { learnerLevel: 4, domain: "whole_numbers", problemStructure: "working_backwards", requiredReasoning: ["working_backwards", "addition", "subtraction"], candidateFamilies: ["heuristic.working_backwards"] },
  },
  {
    probeId: "p5_age_difference",
    expectedMethodId: "heuristic.age_relationship.constant_difference",
    query: { learnerLevel: 5, domain: "whole_numbers", problemStructure: "age_relationship", requiredReasoning: ["age_reasoning", "comparison", "addition"], candidateFamilies: ["heuristic.age_relationship"] },
  },
  {
    probeId: "p6_age_ratio",
    expectedMethodId: "heuristic.age_relationship.ratio_at_time",
    query: { learnerLevel: 6, domain: "ratio", problemStructure: "age_relationship", requiredReasoning: ["age_reasoning", "ratio_scaling", "comparison"], candidateFamilies: ["heuristic.age_relationship"] },
  },
  {
    probeId: "p1_systematic_spatial_sweep",
    expectedMethodId: "heuristic.systematic_enumeration.spatial_sweep",
    query: { learnerLevel: 1, domain: "geometry", problemStructure: "systematic_counting", requiredReasoning: ["systematic_enumeration", "counting", "spatial_reasoning"], candidateFamilies: ["heuristic.systematic_enumeration"] },
  },
  {
    probeId: "p4_digit_frequency",
    expectedMethodId: "heuristic.systematic_enumeration.digit_frequency",
    query: { learnerLevel: 4, domain: "whole_numbers", problemStructure: "digit_frequency", requiredReasoning: ["frequency_counting"], candidateFamilies: ["heuristic.systematic_enumeration"] },
  },
  {
    probeId: "p4_constraint_logic",
    expectedMethodId: "heuristic.logic_strategy.constraint_table",
    query: { learnerLevel: 4, domain: "logic", problemStructure: "logic_strategy", requiredReasoning: ["logical_elimination"], candidateFamilies: ["heuristic.logic_strategy"] },
  },
  {
    probeId: "p5_logic_special_case",
    expectedMethodId: "heuristic.logic_strategy.special_cases",
    query: { learnerLevel: 5, domain: "whole_numbers", problemStructure: "logic_strategy", requiredReasoning: ["logical_elimination", "comparison"], candidateFamilies: ["heuristic.logic_strategy"] },
  },
  {
    probeId: "p3_multistep_subgoals",
    expectedMethodId: "heuristic.multi_step.identify_subgoals",
    query: { learnerLevel: 3, domain: "fractions", problemStructure: "fraction_multi_step", requiredReasoning: ["fraction_multi_step", "subtraction", "multiplication"], candidateFamilies: ["heuristic.multi_step"] },
  },
  {
    probeId: "p6_multistep_dependency",
    expectedMethodId: "heuristic.multi_step.dependency_order",
    query: { learnerLevel: 6, domain: "fractions", problemStructure: "fraction_multi_step", requiredReasoning: ["fraction_multi_step", "comparison", "multiplication"], candidateFamilies: ["heuristic.multi_step"] },
  },
  {
    probeId: "p5_multistep_synthesis",
    expectedMethodId: "heuristic.multi_step.final_synthesis",
    query: { learnerLevel: 5, domain: "whole_numbers", problemStructure: "multi_step", requiredReasoning: ["addition", "subtraction", "comparison"], candidateFamilies: ["heuristic.multi_step"] },
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

export function runPhase4B4WordProblemHeuristicsAudit(): Phase4B4LibraryRun {
  const sourceIssues = validatePhase4BSourceManifest();
  const invalidMethods = PHASE4B4_WORD_PROBLEM_HEURISTIC_METHODS
    .map((method) => ({ method, validation: validateTeachingMethod(method as any) }))
    .filter(({ validation }) => !validation.valid)
    .map(({ method, validation }) => ({
      methodId: method.methodId,
      blockerCodes: validation.blockers.map((blocker) => blocker.code),
    }));

  const methodIds = PHASE4B4_WORD_PROBLEM_HEURISTIC_METHODS.map((method) => method.methodId);
  const duplicateMethodIds = duplicates(methodIds);
  const previousIds = new Set(PHASE4B3_NUMBER_ARITHMETIC_METHODS.map((method) => method.methodId));
  const crossLibraryDuplicates = methodIds.filter((id) => previousIds.has(id));
  const familyVariantKeys = PHASE4B4_WORD_PROBLEM_HEURISTIC_METHODS.map((method) => `${method.familyId}::${method.variantId}`);
  const duplicateVariants = duplicates(familyVariantKeys);

  const byFamily: Phase4B4LibraryRun["byFamily"] = {};
  const themeGaps: Phase4B4LibraryRun["themeGaps"] = [];
  let requiredThemeCount = 0;
  let coveredThemeCount = 0;

  for (const familyId of PHASE4B4_FAMILY_IDS) {
    const family = PHASE4B_METHOD_FAMILIES.find((item) => item.familyId === familyId)!;
    const methods = PHASE4B4_WORD_PROBLEM_HEURISTIC_METHODS.filter((method) => method.familyId === familyId);
    const coveredThemes = [...new Set(
      PHASE4B4_METHOD_THEME_COVERAGE
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

  const candidateProbes: Phase4B4CandidateProbeResult[] = PROBES.map((probe) => {
    const candidates = listPhase4B4CandidateMethods(probe.query).map((method) => method.methodId);
    return {
      probeId: probe.probeId,
      expectedMethodId: probe.expectedMethodId,
      candidateMethodIds: candidates,
      passed: candidates.includes(probe.expectedMethodId),
    };
  });

  const methodsAllFrozen = PHASE4B4_WORD_PROBLEM_HEURISTIC_METHODS.every((method) => isDeepFrozen(method));
  const governanceSafe = PHASE4B4_WORD_PROBLEM_HEURISTIC_METHODS.every((method) =>
    method.governance.deterministicOnly === true &&
    method.governance.lunaAllowed === false &&
    method.governance.persistence === "version_controlled_source"
  );
  const noGenericFallback = PHASE4B_METHOD_FAMILIES
    .filter((family) => PHASE4B4_FAMILY_IDS.includes(family.familyId))
    .every((family) => family.genericFallback === false);
  const essentialVisualsValid = PHASE4B4_WORD_PROBLEM_HEURISTIC_METHODS
    .filter((method) => method.visualGuidance.visualUse === "essential")
    .every((method) => method.visualGuidance.preferredVisualTypes.length > 0 && method.visualGuidance.generatedVisualAllowed === true);

  const checks: Phase4B4LibraryRun["checks"] = {
    every4B4FamilyHasProductionMethod: PHASE4B4_FAMILY_IDS.every((familyId) => (byFamily[familyId]?.methodCount ?? 0) > 0),
    every4B4RequiredThemeCovered: themeGaps.length === 0,
    allMethodsValidate: invalidMethods.length === 0,
    allMethodIdsUniqueWithin4B4: duplicateMethodIds.length === 0,
    noMethodIdCollisionWith4B3: crossLibraryDuplicates.length === 0,
    variantsUniqueWithinFamily: duplicateVariants.length === 0,
    allMethodsDeepFrozen: methodsAllFrozen,
    sourceManifestValid: sourceIssues.length === 0,
    allCandidateProbesPass: candidateProbes.every((probe) => probe.passed),
    noGenericFallbackFamily: noGenericFallback,
    noLunaOrPersistenceEscapeHatch: governanceSafe,
    allVisualEssentialMethodsDeclareVisuals: essentialVisualsValid,
  };

  return {
    schemaVersion: "4B-4-QA.1",
    methodSchemaVersion: PHASE4B_METHOD_SCHEMA_VERSION,
    taxonomySchemaVersion: PHASE4B1_TAXONOMY_SCHEMA_VERSION,
    summary: {
      methods: PHASE4B4_WORD_PROBLEM_HEURISTIC_METHODS.length,
      activeMethods: PHASE4B4_WORD_PROBLEM_HEURISTIC_METHODS.filter((method) => method.status === "active").length,
      familiesRequired: PHASE4B4_FAMILY_IDS.length,
      familiesRepresented: PHASE4B4_FAMILY_IDS.filter((familyId) => (byFamily[familyId]?.methodCount ?? 0) > 0).length,
      requiredThemes: requiredThemeCount,
      coveredThemes: coveredThemeCount,
      invalidMethods: invalidMethods.length,
      duplicateMethodIdsWithin4B4: duplicateMethodIds.length,
      duplicateMethodIdsAcross4B3And4B4: crossLibraryDuplicates.length,
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
    passed: Object.values(checks).every(Boolean),
  };
}
