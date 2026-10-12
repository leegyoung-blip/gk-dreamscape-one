import type { TeachingMethod } from "../schema/types";
import type { Phase4BMethodFamilyId } from "../taxonomy/types";
import { PHASE4B3_NUMBER_ARITHMETIC_METHODS } from "./phase4B3NumberArithmetic";
import { PHASE4B4_WORD_PROBLEM_HEURISTIC_METHODS } from "./phase4B4WordProblemHeuristics";
import { PHASE4B5_RATIONAL_NUMBER_METHODS } from "./phase4B5RationalNumber";
import { PHASE4B6_MEASUREMENT_GEOMETRY_DATA_METHODS } from "./phase4B6MeasurementGeometryData";
import { PHASE4B7_COVERAGE_HARDENING_METHODS } from "./phase4B7CoverageHardening";

export const PHASE4B_ALL_PRODUCTION_METHODS: readonly TeachingMethod[] = Object.freeze([
  ...PHASE4B3_NUMBER_ARITHMETIC_METHODS,
  ...PHASE4B4_WORD_PROBLEM_HEURISTIC_METHODS,
  ...PHASE4B5_RATIONAL_NUMBER_METHODS,
  ...PHASE4B6_MEASUREMENT_GEOMETRY_DATA_METHODS,
  ...PHASE4B7_COVERAGE_HARDENING_METHODS,
]);

export type Phase4BProductionCandidateQuery = {
  learnerLevel: 1 | 2 | 3 | 4 | 5 | 6;
  domain: TeachingMethod["applicability"]["domains"][number];
  problemStructure: TeachingMethod["applicability"]["structures"][number];
  requiredReasoning: TeachingMethod["applicability"]["reasoning"];
  candidateFamilies: Phase4BMethodFamilyId[];
};

export function getPhase4BProductionMethodsByFamily(
  familyId: Phase4BMethodFamilyId,
): Readonly<TeachingMethod>[] {
  return PHASE4B_ALL_PRODUCTION_METHODS.filter(
    (method) => method.status === "active" && method.familyId === familyId,
  );
}

export function listPhase4BProductionCandidateMethods(
  query: Phase4BProductionCandidateQuery,
): Readonly<TeachingMethod>[] {
  const familySet = new Set(query.candidateFamilies);
  const reasoningSet = new Set(query.requiredReasoning);

  return PHASE4B_ALL_PRODUCTION_METHODS.filter((method) => {
    if (method.status !== "active") return false;
    if (!familySet.has(method.familyId)) return false;
    if (!method.applicability.levels.includes(query.learnerLevel)) return false;
    if (!method.applicability.domains.includes(query.domain)) return false;
    if (!method.applicability.structures.includes(query.problemStructure)) return false;
    return method.applicability.reasoning.some((reasoning) =>
      reasoningSet.has(reasoning),
    );
  });
}
