
import {
  PHASE4B_METHOD_FAMILIES,
} from "../taxonomy/methodFamilyTaxonomy";
import { PHASE4B1_TAXONOMY_SCHEMA_VERSION } from "../taxonomy/types";
import {
  PHASE4B_METHOD_SCHEMA_VERSION,
  validateTeachingMethod,
} from "../schema";
import { validatePhase4BSourceManifest } from "../sources";
import {
  PHASE4B3_METHOD_THEME_COVERAGE,
  PHASE4B3_NUMBER_ARITHMETIC_METHODS,
  listPhase4B3CandidateMethods,
  type Phase4B3CandidateQuery,
} from "../methods";
import type {
  Phase4B3CandidateProbeResult,
  Phase4B3LibraryRun,
} from "./types4B3";

const PHASE4B3_FAMILY_IDS = PHASE4B_METHOD_FAMILIES
  .filter((family) => family.plannedSubphase === "4B-3")
  .map((family) => family.familyId);

type Probe = {
  probeId: string;
  expectedMethodId: string;
  query: Phase4B3CandidateQuery;
};

const PROBES: Probe[] = [
  {
    probeId: "p1_place_value",
    expectedMethodId: "number.place_value.place_value_chart",
    query: { learnerLevel: 1, domain: "whole_numbers", problemStructure: "place_value", requiredReasoning: ["place_value_reasoning"], candidateFamilies: ["number.place_value"] },
  },
  {
    probeId: "p2_number_bonds",
    expectedMethodId: "number.add_sub.number_bonds",
    query: { learnerLevel: 2, domain: "whole_numbers", problemStructure: "part_whole", requiredReasoning: ["addition"], candidateFamilies: ["number.add_sub"] },
  },
  {
    probeId: "p2_bridge_ten",
    expectedMethodId: "number.add_sub.bridge_ten",
    query: { learnerLevel: 2, domain: "whole_numbers", problemStructure: "addition_change", requiredReasoning: ["addition"], candidateFamilies: ["number.add_sub"] },
  },
  {
    probeId: "p4_column_algorithm",
    expectedMethodId: "number.add_sub.column_algorithm",
    query: { learnerLevel: 4, domain: "whole_numbers", problemStructure: "direct_calculation", requiredReasoning: ["addition"], candidateFamilies: ["number.add_sub", "arithmetic.direct"] },
  },
  {
    probeId: "p3_equal_groups",
    expectedMethodId: "number.mult_div.equal_groups_array",
    query: { learnerLevel: 3, domain: "whole_numbers", problemStructure: "equal_groups", requiredReasoning: ["multiplication"], candidateFamilies: ["number.mult_div"] },
  },
  {
    probeId: "p3_sharing",
    expectedMethodId: "number.mult_div.sharing_grouping",
    query: { learnerLevel: 3, domain: "whole_numbers", problemStructure: "sharing", requiredReasoning: ["division"], candidateFamilies: ["number.mult_div"] },
  },
  {
    probeId: "p5_written_mult",
    expectedMethodId: "number.mult_div.written_algorithm",
    query: { learnerLevel: 5, domain: "whole_numbers", problemStructure: "direct_calculation", requiredReasoning: ["multiplication"], candidateFamilies: ["number.mult_div", "arithmetic.direct"] },
  },
  {
    probeId: "p5_common_multiple",
    expectedMethodId: "number.factors_multiples.common_multiples_list",
    query: { learnerLevel: 5, domain: "whole_numbers", problemStructure: "common_multiple_cycle", requiredReasoning: ["common_multiple"], candidateFamilies: ["number.factors_multiples"] },
  },
  {
    probeId: "p4_direct_estimate",
    expectedMethodId: "arithmetic.direct.estimation_check",
    query: { learnerLevel: 4, domain: "whole_numbers", problemStructure: "direct_calculation", requiredReasoning: ["estimation"], candidateFamilies: ["arithmetic.direct"] },
  },
  {
    probeId: "p5_operation_chain",
    expectedMethodId: "arithmetic.operation_chain.order_and_brackets",
    query: { learnerLevel: 5, domain: "arithmetic", problemStructure: "operation_chain", requiredReasoning: ["multiplication", "addition"], candidateFamilies: ["arithmetic.operation_chain"] },
  },
  {
    probeId: "p2_missing_number",
    expectedMethodId: "algebra.equation_unknown.inverse_missing_number",
    query: { learnerLevel: 2, domain: "whole_numbers", problemStructure: "missing_number_equation", requiredReasoning: ["equation_solving"], candidateFamilies: ["algebra.equation_unknown"] },
  },
  {
    probeId: "p5_equation_balance",
    expectedMethodId: "algebra.equation_unknown.balance_equation",
    query: { learnerLevel: 5, domain: "algebra", problemStructure: "equation_unknown", requiredReasoning: ["algebraic_simplification"], candidateFamilies: ["algebra.equation_unknown"] },
  },
  {
    probeId: "p3_symbol_mapping",
    expectedMethodId: "algebra.symbol_rule.map_symbol_values",
    query: { learnerLevel: 3, domain: "algebra", problemStructure: "symbol_mapping", requiredReasoning: ["symbol_mapping"], candidateFamilies: ["algebra.symbol_rule"] },
  },
  {
    probeId: "p3_pattern_rule",
    expectedMethodId: "patterns.sequence_rule.growing_difference",
    query: { learnerLevel: 3, domain: "patterns", problemStructure: "pattern_rule", requiredReasoning: ["pattern_extension"], candidateFamilies: ["patterns.sequence_rule"] },
  },
  {
    probeId: "p5_recursive_rule",
    expectedMethodId: "patterns.sequence_rule.recursive_rule",
    query: { learnerLevel: 5, domain: "patterns", problemStructure: "recursive_pattern", requiredReasoning: ["rule_inference"], candidateFamilies: ["patterns.sequence_rule"] },
  },
];

function isDeepFrozen(value: unknown): boolean {
  if (!value || typeof value !== "object") return true;
  if (!Object.isFrozen(value)) return false;
  const children = Array.isArray(value)
    ? value
    : Object.values(value as Record<string, unknown>);
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

export function runPhase4B3NumberArithmeticLibraryAudit(): Phase4B3LibraryRun {
  const sourceIssues = validatePhase4BSourceManifest();
  const invalidMethods = PHASE4B3_NUMBER_ARITHMETIC_METHODS
    .map((method) => ({ method, validation: validateTeachingMethod(method as any) }))
    .filter(({ validation }) => !validation.valid)
    .map(({ method, validation }) => ({
      methodId: method.methodId,
      blockerCodes: validation.blockers.map((blocker) => blocker.code),
    }));

  const methodIds = PHASE4B3_NUMBER_ARITHMETIC_METHODS.map((method) => method.methodId);
  const duplicateMethodIds = duplicates(methodIds);

  const familyVariantKeys = PHASE4B3_NUMBER_ARITHMETIC_METHODS.map((method) => `${method.familyId}::${method.variantId}`);
  const duplicateVariants = duplicates(familyVariantKeys);

  const byFamily: Phase4B3LibraryRun["byFamily"] = {};
  const themeGaps: Phase4B3LibraryRun["themeGaps"] = [];

  let requiredThemeCount = 0;
  let coveredThemeCount = 0;

  for (const familyId of PHASE4B3_FAMILY_IDS) {
    const family = PHASE4B_METHOD_FAMILIES.find((item) => item.familyId === familyId)!;
    const methods = PHASE4B3_NUMBER_ARITHMETIC_METHODS.filter((method) => method.familyId === familyId);
    const coveredThemes = [...new Set(
      PHASE4B3_METHOD_THEME_COVERAGE
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

  const candidateProbes: Phase4B3CandidateProbeResult[] = PROBES.map((probe) => {
    const candidates = listPhase4B3CandidateMethods(probe.query).map((method) => method.methodId);
    return {
      probeId: probe.probeId,
      expectedMethodId: probe.expectedMethodId,
      candidateMethodIds: candidates,
      passed: candidates.includes(probe.expectedMethodId),
    };
  });

  const methodsAllFrozen = PHASE4B3_NUMBER_ARITHMETIC_METHODS.every((method) => isDeepFrozen(method));
  const governanceSafe = PHASE4B3_NUMBER_ARITHMETIC_METHODS.every((method) =>
    method.governance.deterministicOnly === true &&
    method.governance.lunaAllowed === false &&
    method.governance.persistence === "version_controlled_source"
  );
  const noGenericFallback = PHASE4B_METHOD_FAMILIES
    .filter((family) => PHASE4B3_FAMILY_IDS.includes(family.familyId))
    .every((family) => family.genericFallback === false);

  const checks: Phase4B3LibraryRun["checks"] = {
    every4B3FamilyHasProductionMethod: PHASE4B3_FAMILY_IDS.every((familyId) => (byFamily[familyId]?.methodCount ?? 0) > 0),
    every4B3RequiredThemeCovered: themeGaps.length === 0,
    allMethodsValidate: invalidMethods.length === 0,
    allMethodIdsUnique: duplicateMethodIds.length === 0,
    variantsUniqueWithinFamily: duplicateVariants.length === 0,
    allMethodsDeepFrozen: methodsAllFrozen,
    sourceManifestValid: sourceIssues.length === 0,
    allCandidateProbesPass: candidateProbes.every((probe) => probe.passed),
    noGenericFallbackFamily: noGenericFallback,
    noLunaOrPersistenceEscapeHatch: governanceSafe,
  };

  return {
    schemaVersion: "4B-3-QA.1",
    methodSchemaVersion: PHASE4B_METHOD_SCHEMA_VERSION,
    taxonomySchemaVersion: PHASE4B1_TAXONOMY_SCHEMA_VERSION,
    summary: {
      methods: PHASE4B3_NUMBER_ARITHMETIC_METHODS.length,
      activeMethods: PHASE4B3_NUMBER_ARITHMETIC_METHODS.filter((method) => method.status === "active").length,
      familiesRequired: PHASE4B3_FAMILY_IDS.length,
      familiesRepresented: PHASE4B3_FAMILY_IDS.filter((familyId) => (byFamily[familyId]?.methodCount ?? 0) > 0).length,
      requiredThemes: requiredThemeCount,
      coveredThemes: coveredThemeCount,
      invalidMethods: invalidMethods.length,
      duplicateMethodIds: duplicateMethodIds.length,
      duplicateVariantsWithinFamily: duplicateVariants.length,
      sourceManifestIssues: sourceIssues.length,
      candidateProbesPassed: candidateProbes.filter((probe) => probe.passed).length,
      candidateProbesTotal: candidateProbes.length,
    },
    byFamily,
    invalidMethods,
    themeGaps,
    candidateProbes,
    checks,
    passed: Object.values(checks).every(Boolean),
  };
}
