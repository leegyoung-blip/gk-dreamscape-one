import type {
  EvidenceRelationship,
  MathematicalDomain,
  ProblemStructure,
} from "../types";

import {
  normalizeMathDomain,
  normalizeProblemStructure,
} from "./normalizeDomain";

function pairKey(
  a: string,
  b: string,
): string {
  return [a, b].sort().join("|");
}

const DOMAIN_COMPATIBLE =
  new Set([
    pairKey("algebra", "arithmetic"),
    pairKey("ratio", "speed_rate"),
    // Fractional quantities of time can legitimately be taught through
    // both fraction and time lenses. This is compatible, not identical.
    pairKey("fractions", "time"),
    pairKey("fractions", "measurement"),
  ]);

const DOMAIN_REFINEMENTS =
  new Set([
    pairKey("measurement", "money"),
    pairKey("whole_numbers", "arithmetic"),
  ]);

const STRUCTURE_COMPATIBLE =
  new Set([
    pairKey(
      "shape_properties",
      "systematic_counting",
    ),
    pairKey(
      "shape_properties",
      "property_matching",
    ),
    pairKey(
      "data_reading",
      "data_comparison",
    ),
    pairKey(
      "part_whole",
      "addition_change",
    ),
    pairKey(
      "part_whole",
      "subtraction_change",
    ),
    pairKey(
      "comparison_difference",
      "money_difference",
    ),
    pairKey(
      "comparison_difference",
      "transfer_difference",
    ),
    pairKey(
      "comparison_difference",
      "measure_compare",
    ),
    pairKey(
      "direct_calculation",
      "money_total",
    ),
    pairKey(
      "direct_calculation",
      "operation_chain",
    ),
    pairKey(
      "equation_unknown",
      "missing_number_equation",
    ),
    pairKey(
      "fraction_of_whole",
      "time_interval",
    ),
  ]);

export function compareDomains(args: {
  resolved: MathematicalDomain;
  existingRaw: string | null;
  curriculum: MathematicalDomain;
}): {
  existing: MathematicalDomain;
  relationship: EvidenceRelationship | null;
} {
  const existing =
    normalizeMathDomain(
      args.existingRaw,
    );

  if (
    existing === "unknown"
  ) {
    return {
      existing,
      relationship: null,
    };
  }

  if (
    existing === args.resolved
  ) {
    return {
      existing,
      relationship: "match",
    };
  }

  const key = pairKey(
    existing,
    args.resolved,
  );

  if (
    DOMAIN_REFINEMENTS.has(key)
  ) {
    return {
      existing,
      relationship: "refinement",
    };
  }

  if (
    DOMAIN_COMPATIBLE.has(key)
  ) {
    return {
      existing,
      relationship: "compatible",
    };
  }

  return {
    existing,
    relationship: "conflict",
  };
}

export function compareStructures(args: {
  resolved: ProblemStructure;
  existingRaw: string | null;
}): {
  existing: ProblemStructure;
  relationship: EvidenceRelationship | null;
} {
  const existing =
    normalizeProblemStructure(
      args.existingRaw,
    );

  if (
    existing === "unknown"
  ) {
    return {
      existing,
      relationship: null,
    };
  }

  if (
    existing === args.resolved
  ) {
    return {
      existing,
      relationship: "match",
    };
  }

  const key = pairKey(
    existing,
    args.resolved,
  );

  if (
    STRUCTURE_COMPATIBLE.has(key)
  ) {
    return {
      existing,
      relationship:
        existing ===
          "shape_properties" ||
        existing ===
          "direct_calculation"
          ? "refinement"
          : "compatible",
    };
  }

  // The older visual pipeline often stores coarse families.
  // Treat a fine-grained teaching structure as a refinement when
  // both are reasonable members of the same broad family.
  const arithmeticFamily =
    new Set<ProblemStructure>([
      "direct_calculation",
      "addition_change",
      "subtraction_change",
      "part_whole",
      "missing_part",
      "comparison_difference",
      "equal_groups",
      "sharing",
      "grouping",
      "repeated_addition",
      "repeated_subtraction",
      "place_value",
      "number_composition",
      "number_decomposition",
      "missing_number_equation",
      "operation_chain",
      "working_backwards",
      "unitary",
      "transfer_difference",
      "multi_step",
    ]);

  if (
    arithmeticFamily.has(existing) &&
    arithmeticFamily.has(
      args.resolved,
    )
  ) {
    return {
      existing,
      relationship: "refinement",
    };
  }

  return {
    existing,
    relationship: "conflict",
  };
}
