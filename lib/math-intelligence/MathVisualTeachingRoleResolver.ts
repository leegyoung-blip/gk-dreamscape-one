import type {
  MathVisual,
  MathVisualObject,
  MathVisualSpec,
} from "../../components/core-math/visual-engine/MathVisualTypes";
import type {
  MathIntelligenceAnalysis,
  MathVisualStrategy,
} from "./MathIntelligenceTypes";
import type {
  MathTeachingRoleIndex,
  MathTeachingRoleSource,
  MathTeachingRoleTarget,
  MathTeachingTargetability,
  MathTeachingVisualRole,
  MathVisualTeachingRoleResolution,
} from "./MathTeachingVisualTypes";

const TEACHING_ROLES = new Set<MathTeachingVisualRole>([
  "main_shape",
  "length_dimension",
  "width_dimension",
  "height_dimension",
  "radius_dimension",
  "measurement_dimension",
  "angle_ray",
  "angle_region",
  "fraction_model",
  "fraction_primary",
  "fraction_comparison_reference",
  "number_line",
  "solid",
  "data_chart",
  "data_table",
  "place_value_table",
  "clock",
  "bar_model",
  "known_bar",
  "unknown_bar",
  "known_value",
  "unknown_value",
  "difference_dimension",
  "total_dimension",
  "part_segment",
  "part_value",
  "label",
  "value",
  "annotation",
  "auxiliary",
]);

const CONCEPTUAL_ROLES = new Set<MathTeachingVisualRole>([
  "main_shape",
  "length_dimension",
  "width_dimension",
  "height_dimension",
  "radius_dimension",
  "measurement_dimension",
  "angle_ray",
  "angle_region",
  "fraction_model",
  "fraction_primary",
  "fraction_comparison_reference",
  "number_line",
  "solid",
  "data_chart",
  "data_table",
  "place_value_table",
  "clock",
  "bar_model",
  "known_bar",
  "unknown_bar",
  "difference_dimension",
  "total_dimension",
  "part_segment",
]);

const LIMITED_SEMANTIC_TYPES = new Set([
  "fraction_bar",
  "fraction_grid",
  "number_line",
  "cube",
  "cuboid",
  "bar_chart",
  "line_graph",
  "pie_chart",
  "table",
  "clock",
  "bar_model",
]);

function uniqueRoles(values: MathTeachingVisualRole[]) {
  return [...new Set(values)];
}

function explicitRoles(object: MathVisualObject): MathTeachingVisualRole[] {
  const metadata = object.metadata;
  if (!metadata || typeof metadata !== "object") return [];

  const rawSingle = (metadata as Record<string, unknown>).teaching_role;
  const rawMany = (metadata as Record<string, unknown>).teaching_roles;
  const rawValues = [
    ...(typeof rawSingle === "string" ? [rawSingle] : []),
    ...(Array.isArray(rawMany) ? rawMany.filter((value): value is string => typeof value === "string") : []),
  ];

  return uniqueRoles(
    rawValues.filter((value): value is MathTeachingVisualRole =>
      TEACHING_ROLES.has(value as MathTeachingVisualRole),
    ),
  );
}

function stableIdRoles(object: MathVisualObject): MathTeachingVisualRole[] {
  const id = object.id.toLocaleLowerCase();
  const roles: MathTeachingVisualRole[] = [];

  if (id === "rectangle_1" || id === "main_shape") roles.push("main_shape");
  if (/^length(?:_|$)/.test(id)) roles.push("length_dimension");
  if (/^width(?:_|$)/.test(id)) roles.push("width_dimension");
  if (/^height(?:_|$)/.test(id)) roles.push("height_dimension");
  if (/^radius(?:_|$)/.test(id)) roles.push("radius_dimension");
  if (/^measurement(?:_|$)/.test(id)) roles.push("measurement_dimension");
  if (/^ray(?:_|$)/.test(id)) roles.push("angle_ray");
  if (/^angle(?:_|$)/.test(id)) roles.push("angle_region");

  if (/^fraction_grid(?:_|$)/.test(id) || /^fraction(?:_|$)/.test(id)) {
    roles.push("fraction_model");
    if (id === "fraction_1" || id === "fraction_grid_1") roles.push("fraction_primary");
    else roles.push("fraction_comparison_reference");
  }

  if (/^number_line(?:_|$)/.test(id)) roles.push("number_line");
  if (/^(cube|cuboid)(?:_|$)/.test(id)) roles.push("solid");
  if (/^(bar_chart|line_graph|pie_chart)(?:_|$)/.test(id)) roles.push("data_chart");
  if (id === "table_1") roles.push("data_table");
  if (/^place_value_table(?:_|$)/.test(id)) roles.push("data_table", "place_value_table");
  if (/^clock(?:_|$)/.test(id)) roles.push("clock");

  if (id === "known_bar") roles.push("known_bar", "bar_model");
  if (id === "unknown_bar") roles.push("unknown_bar", "bar_model");
  if (id === "known_value") roles.push("known_value", "value");
  if (id === "unknown_value") roles.push("unknown_value", "value");
  if (/^difference(?:_|$)/.test(id)) roles.push("difference_dimension");
  if (/^total(?:_|$)/.test(id)) roles.push("total_dimension");
  if (/^part_\d+$/.test(id)) roles.push("part_segment", "bar_model");
  if (/^part_value_\d+$/.test(id)) roles.push("part_value", "value");
  if (/^ratio_a_segment_\d+$/.test(id)) roles.push("ratio_group_a", "ratio_unit", "bar_model");
  if (/^ratio_b_segment_\d+$/.test(id)) roles.push("ratio_group_b", "ratio_unit", "bar_model");
  if (/^ratio_[ab]_count$/.test(id)) roles.push("ratio_count", "value");
  if (id === "not_to_scale" || id === "ratio_equal_units_note") roles.push("annotation");
  if (/_label$/.test(id)) roles.push("label");

  return uniqueRoles(roles);
}

function strategyRoles(
  strategy: MathVisualStrategy,
  object: MathVisualObject,
): MathTeachingVisualRole[] {
  const roles: MathTeachingVisualRole[] = [];

  if (strategy === "rectangle_dimensions" && object.type === "rectangle") {
    roles.push("main_shape");
  }
  if (
    (strategy === "bar_model_comparison" ||
      strategy === "bar_model_part_whole" ||
      strategy === "bar_model_ratio") &&
    object.type === "bar_model"
  ) {
    roles.push("bar_model");
  }
  if (
    (strategy === "bar_model_comparison" || strategy === "bar_model_part_whole" || strategy === "bar_model_ratio") &&
    object.type === "rectangle"
  ) {
    roles.push("bar_model");
  }
  if (strategy === "place_value_table" && object.type === "table") {
    roles.push("data_table", "place_value_table");
  }
  if (strategy === "measurement_diagram" && object.type === "dimension") {
    roles.push("measurement_dimension");
  }

  return uniqueRoles(roles);
}

function objectTypeRoles(object: MathVisualObject): MathTeachingVisualRole[] {
  switch (object.type) {
    case "fraction_bar":
    case "fraction_grid":
      return ["fraction_model"];
    case "number_line":
      return ["number_line"];
    case "cube":
    case "cuboid":
    case "net":
      return ["solid"];
    case "bar_chart":
    case "line_graph":
    case "pie_chart":
      return ["data_chart"];
    case "table":
      return ["data_table"];
    case "clock":
      return ["clock"];
    case "bar_model":
      return ["bar_model"];
    case "angle_marker":
    case "right_angle_marker":
      return ["angle_region"];
    case "text":
      if (object.role === "label") return ["label"];
      if (object.role === "value") return ["value"];
      if (object.role === "annotation") return ["annotation"];
      return ["auxiliary"];
    default:
      return [];
  }
}

function resolveObjectTarget(
  visual: MathVisual,
  object: MathVisualObject,
  strategy: MathVisualStrategy,
): MathTeachingRoleTarget {
  const fromMetadata = explicitRoles(object);
  if (fromMetadata.length > 0) {
    return {
      visual_id: visual.id,
      object_id: object.id,
      object_type: object.type,
      roles: fromMetadata,
      source: "metadata",
    };
  }

  const fromStableId = stableIdRoles(object);
  if (fromStableId.length > 0) {
    return {
      visual_id: visual.id,
      object_id: object.id,
      object_type: object.type,
      roles: fromStableId,
      source: "stable_id",
    };
  }

  const fromStrategy = strategyRoles(strategy, object);
  if (fromStrategy.length > 0) {
    return {
      visual_id: visual.id,
      object_id: object.id,
      object_type: object.type,
      roles: fromStrategy,
      source: "strategy",
    };
  }

  return {
    visual_id: visual.id,
    object_id: object.id,
    object_type: object.type,
    roles: objectTypeRoles(object),
    source: "object_type",
  };
}

function preferredVisual(spec: MathVisualSpec) {
  return (
    spec.visuals.find((visual) => visual.placement === "prompt") ??
    spec.visuals.find((visual) => visual.placement === "teaching") ??
    spec.visuals[0] ??
    null
  );
}

function roleIndex(targets: MathTeachingRoleTarget[]): MathTeachingRoleIndex {
  const result: MathTeachingRoleIndex = {};

  for (const target of targets) {
    for (const role of target.roles) {
      const current = result[role] ?? [];
      if (!current.includes(target.object_id)) current.push(target.object_id);
      result[role] = current;
    }
  }

  return result;
}

function targetability(targets: MathTeachingRoleTarget[]): MathTeachingTargetability {
  const conceptual = new Set<MathTeachingVisualRole>();
  for (const target of targets) {
    for (const role of target.roles) {
      if (CONCEPTUAL_ROLES.has(role)) conceptual.add(role);
    }
  }

  if (conceptual.size >= 3) return "rich";
  if (conceptual.size === 2) return "partial";
  if (conceptual.size === 1) return "single_object";
  return "none";
}

/**
 * Resolve stable, directly targetable teaching roles for a validated V2 spec.
 *
 * Important: the resolver never invents child IDs for semantic objects. If a
 * clock is one V2 object, the hour/minute hands are not exposed as fake targets.
 */
export function resolveMathVisualTeachingRoles(
  spec: MathVisualSpec,
  analysis: Pick<MathIntelligenceAnalysis, "strategy">,
): MathVisualTeachingRoleResolution {
  const issues: MathVisualTeachingRoleResolution["issues"] = [];

  if (!Array.isArray(spec.visuals) || spec.visuals.length === 0) {
    return {
      strategy: analysis.strategy,
      preferred_visual_id: null,
      targets: [],
      by_role: {},
      targetability: "none",
      issues: [{ code: "NO_VISUALS", message: "The Math Visual spec contains no visuals." }],
      has_limited_semantic_granularity: false,
    };
  }

  const promptVisuals = spec.visuals.filter((visual) => visual.placement === "prompt");
  if (promptVisuals.length === 0) {
    issues.push({
      code: "NO_PROMPT_VISUAL",
      message: "No prompt visual exists; Dreamscape selected the best available visual for teaching-role analysis.",
    });
  } else if (promptVisuals.length > 1) {
    issues.push({
      code: "MULTIPLE_PROMPT_VISUALS",
      message: "Multiple prompt visuals exist. 2F-B should explicitly choose which visual a teaching plan uses.",
    });
  }

  const preferred = preferredVisual(spec);
  const targets = spec.visuals.flatMap((visual) =>
    visual.objects.map((object) => resolveObjectTarget(visual, object, analysis.strategy)),
  );
  const mappedTargets = targets.filter((target) => target.roles.length > 0);

  if (mappedTargets.length === 0) {
    issues.push({
      code: "NO_TARGETABLE_OBJECTS",
      message: "No V2 objects could be assigned a safe teaching role.",
    });
  }

  const limitedObjects = spec.visuals.flatMap((visual) =>
    visual.objects.filter((object) => LIMITED_SEMANTIC_TYPES.has(object.type)),
  );
  if (limitedObjects.length > 0) {
    issues.push({
      code: "SEMANTIC_SUBPARTS_NOT_DIRECTLY_TARGETABLE",
      message:
        "Some semantic visuals contain internal mathematical parts that are not separate V2 object IDs. Teaching may target the whole semantic object, but must not invent child IDs.",
    });
  }

  return {
    strategy: analysis.strategy,
    preferred_visual_id: preferred?.id ?? null,
    targets: mappedTargets,
    by_role: roleIndex(mappedTargets),
    targetability: targetability(mappedTargets),
    issues,
    has_limited_semantic_granularity: limitedObjects.length > 0,
  };
}
