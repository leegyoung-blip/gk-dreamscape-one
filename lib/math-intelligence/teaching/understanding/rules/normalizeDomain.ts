import type {
  MathematicalDomain,
  ProblemStructure,
} from "../types";

export function normalizeMathDomain(
  value: string | null | undefined,
): MathematicalDomain {
  if (!value) return "unknown";

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const map: Record<string, MathematicalDomain> = {
    arithmetic: "arithmetic",
    operations: "arithmetic",
    calculation: "arithmetic",

    whole_number: "whole_numbers",
    whole_numbers: "whole_numbers",
    number: "whole_numbers",
    numbers: "whole_numbers",

    fraction: "fractions",
    fractions: "fractions",

    decimal: "decimals",
    decimals: "decimals",

    percent: "percentage",
    percentage: "percentage",
    percentages: "percentage",

    ratio: "ratio",
    ratios: "ratio",
    proportion: "ratio",
    ratio_and_rate: "ratio",

    algebra: "algebra",

    geometry: "geometry",
    solid_geometry: "geometry",
    plane_geometry: "geometry",
    "2d_geometry": "geometry",
    "3d_geometry": "geometry",
    circles: "geometry",

    measurement: "measurement",
    measures: "measurement",

    time: "time",

    money: "money",

    data: "data",
    graph: "data",
    graphs: "data",
    data_handling: "data",

    speed: "speed_rate",
    rate: "speed_rate",
    speed_rate: "speed_rate",

    average: "average",
    averages: "average",

    pattern: "patterns",
    patterns: "patterns",
    sequence: "patterns",
    sequences: "patterns",

    logic: "logic",
    reasoning: "logic",

    // Word problem describes form, not mathematical domain.
    word_problem: "unknown",
  };

  return map[normalized] ?? "unknown";
}

export function normalizeProblemStructure(
  value: string | null | undefined,
): ProblemStructure {
  if (!value) return "unknown";

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const map: Record<string, ProblemStructure> = {
    direct_calculation: "direct_calculation",
    calculation: "direct_calculation",

    comparison: "comparison_difference",
    comparison_difference: "comparison_difference",

    part_whole: "part_whole",
    partwhole: "part_whole",

    equal_groups: "equal_groups",
    sharing: "sharing",
    grouping: "grouping",

    fraction_of_whole: "fraction_of_whole",
    percentage_of_whole: "percentage_of_whole",

    ratio_relationship: "ratio_relationship",
    unitary: "unitary",
    rate_scaling: "unitary",

    transfer_difference: "transfer_difference",
    changing_difference: "transfer_difference",

    symbol_mapping: "symbol_mapping",
    code_rule: "symbol_mapping",

    place_value: "place_value",

    area: "area",
    perimeter: "perimeter",
    angle: "angle",

    shape_properties: "shape_properties",
    systematic_counting: "systematic_counting",
    pattern_rule: "pattern_rule",

    time_reading: "time_reading",
    time_interval: "time_interval",

    money_transaction: "money_purchase",

    data_reading: "data_reading",

    speed_distance_time: "speed_distance_time",

    equation_unknown: "equation_unknown",
    multi_step: "multi_step",
  };

  return map[normalized] ?? "unknown";
}
