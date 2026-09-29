import type {
  MathAngleMarkerObject,
  MathBarChartObject,
  MathClockObject,
  MathCubeObject,
  MathCuboidObject,
  MathDimensionObject,
  MathFractionBarObject,
  MathFractionGridObject,
  MathNumberLineObject,
  MathPieChartObject,
  MathRectangleObject,
  MathTableObject,
  MathTextObject,
  MathVisual,
  MathVisualObject,
  MathVisualSpec,
} from "../../components/core-math/visual-engine/MathVisualTypes";
import {
  buildMathLearnerVisibleEvidence,
  evidenceContainsLabel,
  evidenceContainsNumber,
  evidenceContainsTime,
  evidenceContainsUnit,
  extractNumericLiterals,
  normaliseMathUnit,
} from "./MathLearnerVisibleEvidence";
import type {
  MathIntelligenceAnalysis,
  MathIntelligenceQuestionInput,
  MathQuantity,
  MathVisualStrategy,
} from "./MathIntelligenceTypes";
import type {
  MathVisualSemanticCheckedFact,
  MathVisualSemanticIssue,
  MathVisualSemanticIssueCode,
  MathVisualSemanticValidationResult,
} from "./MathVisualSemanticTypes";

export const MATH_VISUAL_SEMANTIC_VALIDATOR_VERSION = "2e.1";

const GENERIC_LABELS = new Set([
  "answer",
  "fraction",
  "numerator",
  "denominator",
  "length",
  "width",
  "height",
  "radius",
  "hour",
  "minute",
  "time",
  "known quantity",
  "unknown quantity",
  "difference",
  "total",
  "part",
  "value",
  "volume",
  "area",
  "perimeter",
]);

function approx(left: number, right: number) {
  const tolerance = Math.max(1e-9, Math.abs(left) * 1e-9, Math.abs(right) * 1e-9);
  return Math.abs(left - right) <= tolerance;
}

function finite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normaliseLabel(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstNumber(value: string | null | undefined) {
  const values = extractNumericLiterals(String(value || ""));
  return values.length ? values[0] : null;
}

function measurementLabelUnit(value: string) {
  const stripped = value
    .replace(/(?<![a-z])-?\d[\d,]*(?:\.\d+)?(?![a-z])/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normaliseMathUnit(stripped);
}

function objectOfType<T extends MathVisualObject["type"]>(
  visual: MathVisual,
  type: T,
) {
  return visual.objects.find((object) => object.type === type) as Extract<MathVisualObject, { type: T }> | undefined;
}

function objectsOfType<T extends MathVisualObject["type"]>(
  visual: MathVisual,
  type: T,
) {
  return visual.objects.filter((object) => object.type === type) as Array<Extract<MathVisualObject, { type: T }>>;
}

function quantityByRole(
  analysis: MathIntelligenceAnalysis,
  role: MathQuantity["role"],
) {
  return analysis.interpretation.quantities.find(
    (quantity) => quantity.role === role && finite(quantity.value),
  ) ?? null;
}

function quantityById(
  analysis: MathIntelligenceAnalysis,
  id: string | null | undefined,
) {
  if (!id) return null;
  return analysis.interpretation.quantities.find((quantity) => quantity.id === id) ?? null;
}

function visibleFiniteQuantities(analysis: MathIntelligenceAnalysis) {
  return analysis.interpretation.quantities.filter(
    (quantity) => quantity.role !== "unknown" && finite(quantity.value),
  );
}

function validationContextNumbers(input: MathIntelligenceQuestionInput) {
  const values = [...extractNumericLiterals(input.explanation)];

  function collect(value: unknown, key = "") {
    const cleanKey = key.toLocaleLowerCase();
    if (/(?:option|answer)?_?id$|ids$|keys?$|order$|index$/.test(cleanKey)) return;

    if (typeof value === "number" && Number.isFinite(value)) {
      values.push(value);
      return;
    }
    if (typeof value === "string") {
      values.push(...extractNumericLiterals(value));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => collect(item, key));
      return;
    }
    if (value && typeof value === "object") {
      Object.entries(value as Record<string, unknown>).forEach(([childKey, child]) =>
        collect(child, childKey),
      );
    }
  }

  // MCQ answer payloads commonly encode option IDs as numbers. Do not treat
  // those IDs as mathematical answer values.
  if (![/multiple_choice/i, /multiple_select/i, /true_false/i].some((pattern) => pattern.test(input.question_type))) {
    collect(input.correct_answer);
  }

  return values.filter((value, index, list) =>
    list.findIndex((candidate) => approx(candidate, value)) === index,
  );
}

function expectedKind(strategy: MathVisualStrategy): MathVisual["kind"] | null {
  switch (strategy) {
    case "fraction_bar":
    case "fraction_grid":
    case "aligned_fraction_bars":
      return "fraction";
    case "number_line":
      return "number_line";
    case "rectangle_dimensions":
    case "angle_diagram":
    case "polygon_geometry":
    case "symmetry_diagram":
      return "geometry";
    case "cube":
    case "cuboid":
    case "solid_net":
      return "solid";
    case "bar_chart":
    case "line_graph":
    case "pie_chart":
      return "data";
    case "table":
    case "place_value_table":
      return "table";
    case "clock":
      return "clock";
    case "bar_model_comparison":
    case "bar_model_part_whole":
    case "bar_model_ratio":
      return "bar_model";
    case "measurement_diagram":
      return "measurement";
    case "mixed":
      return "mixed";
    default:
      return null;
  }
}

type ValidationContext = {
  input: MathIntelligenceQuestionInput;
  analysis: MathIntelligenceAnalysis;
  spec: MathVisualSpec;
  visual: MathVisual;
  evidence: ReturnType<typeof buildMathLearnerVisibleEvidence>;
  answerNumbers: number[];
  issues: MathVisualSemanticIssue[];
  checked: MathVisualSemanticCheckedFact[];
};

function addIssue(
  context: ValidationContext,
  code: MathVisualSemanticIssueCode,
  message: string,
  extras: Omit<MathVisualSemanticIssue, "code" | "severity" | "message"> = {},
  severity: MathVisualSemanticIssue["severity"] = "error",
) {
  context.issues.push({ code, severity, message, ...extras });
}

function checkFact(
  context: ValidationContext,
  key: string,
  source: string,
  expected: string | number | null,
  actual: string | number | null,
  matched: boolean,
  issueCode: MathVisualSemanticIssueCode = "VALUE_MISMATCH",
  objectId?: string,
) {
  context.checked.push({ key, source, expected, actual, matched });
  if (!matched) {
    addIssue(
      context,
      issueCode,
      `${source} does not match the interpreted learner-visible mathematics.`,
      {
        visual_id: context.visual.id,
        object_id: objectId,
        expected,
        actual,
      },
    );
  }
}

function requireSourceNumber(
  context: ValidationContext,
  value: number,
  source: string,
  objectId?: string,
) {
  if (evidenceContainsNumber(context.evidence, value)) return true;

  const likelyAnswerLeak = context.answerNumbers.some((candidate) => approx(candidate, value));
  addIssue(
    context,
    likelyAnswerLeak ? "ANSWER_LEAK_RISK" : "SOURCE_VALUE_NOT_VISIBLE",
    likelyAnswerLeak
      ? `${source} contains ${value}, which is not learner-visible but appears in answer/explanation context. The visual is rejected to prevent answer leakage.`
      : `${source} contains ${value}, but that value cannot be verified in the learner-visible instruction, prompt, or options.`,
    {
      visual_id: context.visual.id,
      object_id: objectId,
      actual: value,
    },
  );
  return false;
}

function requireSourceUnit(
  context: ValidationContext,
  unit: string | null | undefined,
  source: string,
  objectId?: string,
) {
  if (!unit || evidenceContainsUnit(context.evidence, unit)) return true;
  addIssue(
    context,
    "SOURCE_UNIT_NOT_VISIBLE",
    `${source} uses unit “${unit}”, but that unit cannot be verified in learner-visible question data.`,
    { visual_id: context.visual.id, object_id: objectId, actual: unit },
  );
  return false;
}

function requireSourceLabel(
  context: ValidationContext,
  label: string | null | undefined,
  source: string,
  objectId?: string,
) {
  const clean = normaliseLabel(label);
  if (!clean || GENERIC_LABELS.has(clean) || evidenceContainsLabel(context.evidence, label)) return true;
  addIssue(
    context,
    "SOURCE_LABEL_NOT_VISIBLE",
    `${source} uses label “${label}”, but that label cannot be verified in learner-visible question data.`,
    { visual_id: context.visual.id, object_id: objectId, actual: label || null },
  );
  return false;
}

function checkQuantitySource(
  context: ValidationContext,
  quantity: MathQuantity | null,
  source: string,
  objectId?: string,
) {
  if (!quantity || !finite(quantity.value)) return;
  requireSourceNumber(context, quantity.value, source, objectId);
  requireSourceUnit(context, quantity.unit, source, objectId);
}

function checkMeasurementLabel(
  context: ValidationContext,
  label: string,
  quantity: MathQuantity,
  source: string,
  objectId: string,
) {
  const actualNumber = firstNumber(label);
  checkFact(
    context,
    `${objectId}.value`,
    source,
    quantity.value,
    actualNumber,
    finite(quantity.value) && actualNumber != null && approx(actualNumber, quantity.value),
    "VALUE_MISMATCH",
    objectId,
  );

  if (quantity.unit) {
    const expectedUnit = normaliseMathUnit(quantity.unit);
    const actualUnit = measurementLabelUnit(label);
    checkFact(
      context,
      `${objectId}.unit`,
      source,
      expectedUnit,
      actualUnit,
      expectedUnit === actualUnit,
      "VALUE_MISMATCH",
      objectId,
    );
  }

  checkQuantitySource(context, quantity, source, objectId);
}

type FractionPair = {
  numerator: MathQuantity;
  denominator: MathQuantity;
};

function fractionPairs(analysis: MathIntelligenceAnalysis): FractionPair[] {
  const quantities = analysis.interpretation.quantities;
  const pairs: FractionPair[] = [];
  const used = new Set<string>();

  for (const numerator of quantities) {
    if (!finite(numerator.value) || (numerator.role !== "part" && !/^numerator/i.test(numerator.id))) continue;
    const suffix = numerator.id.match(/(?:numerator|part)[_-]?(\d+)?/i)?.[1] || "";
    const denominator = quantities.find((candidate) => {
      if (used.has(candidate.id) || !finite(candidate.value)) return false;
      if (suffix && new RegExp(`(?:denominator|total)[_-]?${suffix}$`, "i").test(candidate.id)) return true;
      return !suffix && candidate.role === "total";
    }) || quantities.find((candidate) =>
      !used.has(candidate.id) && candidate.role === "total" && finite(candidate.value),
    );

    if (!denominator) continue;
    used.add(numerator.id);
    used.add(denominator.id);
    pairs.push({ numerator, denominator });
  }

  return pairs;
}

function validateFractionBar(context: ValidationContext) {
  const pairs = fractionPairs(context.analysis);
  const bars = objectsOfType(context.visual, "fraction_bar");
  const expectedCount = context.analysis.strategy === "aligned_fraction_bars" ? pairs.length : 1;

  checkFact(
    context,
    "fraction_bar.count",
    "fraction representation",
    expectedCount,
    bars.length,
    pairs.length > 0 && bars.length === expectedCount,
    "MISSING_EXPECTED_OBJECT",
  );

  bars.forEach((bar, index) => {
    const pair = pairs[index] || pairs[0];
    if (!pair || !finite(pair.numerator.value) || !finite(pair.denominator.value)) return;
    checkFact(context, `${bar.id}.numerator`, "fraction numerator", pair.numerator.value, bar.numerator, approx(bar.numerator, pair.numerator.value), "VALUE_MISMATCH", bar.id);
    checkFact(context, `${bar.id}.denominator`, "fraction denominator", pair.denominator.value, bar.denominator, approx(bar.denominator, pair.denominator.value), "VALUE_MISMATCH", bar.id);
    checkQuantitySource(context, pair.numerator, "fraction numerator", bar.id);
    checkQuantitySource(context, pair.denominator, "fraction denominator", bar.id);
  });
}

function validateFractionGrid(context: ValidationContext) {
  const pair = fractionPairs(context.analysis)[0];
  const grid = objectOfType(context.visual, "fraction_grid") as MathFractionGridObject | undefined;
  if (!pair || !grid || !finite(pair.numerator.value) || !finite(pair.denominator.value)) {
    addIssue(context, "MISSING_EXPECTED_OBJECT", "The fraction-grid strategy is missing its expected fraction grid or interpreted fraction.", { visual_id: context.visual.id });
    return;
  }

  const cells = grid.rows * grid.columns;
  const shaded = new Set(grid.shaded_cells || []).size;
  checkFact(context, `${grid.id}.cells`, "fraction denominator", pair.denominator.value, cells, approx(cells, pair.denominator.value), "VALUE_MISMATCH", grid.id);
  checkFact(context, `${grid.id}.shaded`, "fraction numerator", pair.numerator.value, shaded, approx(shaded, pair.numerator.value), "VALUE_MISMATCH", grid.id);
  checkQuantitySource(context, pair.numerator, "fraction numerator", grid.id);
  checkQuantitySource(context, pair.denominator, "fraction denominator", grid.id);
}

function validateNumberLine(context: ValidationContext) {
  const line = objectOfType(context.visual, "number_line") as MathNumberLineObject | undefined;
  const values = visibleFiniteQuantities(context.analysis).map((quantity) => quantity.value as number);
  if (!line || values.length < 2) {
    addIssue(context, "MISSING_EXPECTED_OBJECT", "The number-line strategy is missing a number line or sufficient interpreted values.", { visual_id: context.visual.id });
    return;
  }

  const expectedMin = Math.min(...values);
  const expectedMax = Math.max(...values);
  checkFact(context, `${line.id}.min`, "number-line minimum", expectedMin, line.min, approx(line.min, expectedMin), "VALUE_MISMATCH", line.id);
  checkFact(context, `${line.id}.max`, "number-line maximum", expectedMax, line.max, approx(line.max, expectedMax), "VALUE_MISMATCH", line.id);
  values.forEach((value) => requireSourceNumber(context, value, "number-line source value", line.id));

  const target = quantityById(context.analysis, context.analysis.interpretation.target.quantity_id);
  if (!target || target.role === "unknown" || !finite(target.value)) {
    if ((line.highlighted_values || []).length > 0) {
      addIssue(context, "UNKNOWN_VALUE_REVEALED", "The number line highlights a value even though the interpreted target is unknown.", { visual_id: context.visual.id, object_id: line.id });
    }
  } else {
    const highlighted = line.highlighted_values || [];
    checkFact(
      context,
      `${line.id}.highlight`,
      "known target value",
      target.value,
      highlighted.length === 1 ? highlighted[0] : null,
      highlighted.length === 1 && approx(highlighted[0], target.value),
      "VALUE_MISMATCH",
      line.id,
    );
  }
}

function validateRectangle(context: ValidationContext) {
  const length = quantityByRole(context.analysis, "length");
  const width = quantityByRole(context.analysis, "width");
  const lengthDimension = context.visual.objects.find((object) => object.id === "length_1" && object.type === "dimension") as MathDimensionObject | undefined;
  const widthDimension = context.visual.objects.find((object) => object.id === "width_1" && object.type === "dimension") as MathDimensionObject | undefined;

  if (!length || !width || !lengthDimension || !widthDimension || !finite(length.value) || !finite(width.value)) {
    addIssue(context, "MISSING_EXPECTED_OBJECT", "The rectangle strategy is missing length/width quantities or their dimension objects.", { visual_id: context.visual.id });
    return;
  }

  checkMeasurementLabel(context, lengthDimension.label, length, "rectangle length", lengthDimension.id);
  checkMeasurementLabel(context, widthDimension.label, width, "rectangle width", widthDimension.id);
}

function validateAngle(context: ValidationContext) {
  const angle = quantityByRole(context.analysis, "angle");
  const marker = objectOfType(context.visual, "angle_marker") as MathAngleMarkerObject | undefined;
  if (!angle || !marker || !finite(angle.value)) {
    addIssue(context, "MISSING_EXPECTED_OBJECT", "The angle strategy is missing its interpreted angle or angle marker.", { visual_id: context.visual.id });
    return;
  }

  const actual = firstNumber(marker.label);
  checkFact(context, `${marker.id}.angle`, "angle measure", angle.value, actual, actual != null && approx(actual, angle.value), "VALUE_MISMATCH", marker.id);
  checkQuantitySource(context, angle, "angle measure", marker.id);
}

function validateCube(context: ValidationContext) {
  const cube = objectOfType(context.visual, "cube") as MathCubeObject | undefined;
  if (!cube) {
    addIssue(context, "MISSING_EXPECTED_OBJECT", "The cube strategy is missing a cube object.", { visual_id: context.visual.id });
    return;
  }
  const side = quantityByRole(context.analysis, "length") || quantityByRole(context.analysis, "width") || quantityByRole(context.analysis, "height") || visibleFiniteQuantities(context.analysis)[0] || null;
  if (side && finite(side.value)) {
    checkFact(context, `${cube.id}.size`, "cube side length", side.value, cube.size, approx(cube.size, side.value), "VALUE_MISMATCH", cube.id);
    checkQuantitySource(context, side, "cube side length", cube.id);
  }
}

function validateCuboid(context: ValidationContext) {
  const cuboid = objectOfType(context.visual, "cuboid") as MathCuboidObject | undefined;
  const length = quantityByRole(context.analysis, "length");
  const width = quantityByRole(context.analysis, "width");
  const height = quantityByRole(context.analysis, "height");
  if (!cuboid || !length || !width || !height || !finite(length.value) || !finite(width.value) || !finite(height.value)) {
    addIssue(context, "MISSING_EXPECTED_OBJECT", "The cuboid strategy is missing the cuboid or one of its three interpreted dimensions.", { visual_id: context.visual.id });
    return;
  }

  checkFact(context, `${cuboid.id}.length`, "cuboid length", length.value, cuboid.length, approx(cuboid.length, length.value), "VALUE_MISMATCH", cuboid.id);
  checkFact(context, `${cuboid.id}.width`, "cuboid width", width.value, cuboid.width, approx(cuboid.width, width.value), "VALUE_MISMATCH", cuboid.id);
  checkFact(context, `${cuboid.id}.height`, "cuboid height", height.value, cuboid.height, approx(cuboid.height, height.value), "VALUE_MISMATCH", cuboid.id);
  [length, width, height].forEach((quantity) => checkQuantitySource(context, quantity, `cuboid ${quantity.role}`, cuboid.id));
}

function expectedDataQuantities(context: ValidationContext) {
  return visibleFiniteQuantities(context.analysis)
    .filter((quantity) => Boolean(quantity.label?.trim()))
    .slice(0, 12);
}

function validateBarChart(context: ValidationContext) {
  const chart = objectOfType(context.visual, "bar_chart") as MathBarChartObject | undefined;
  const expected = expectedDataQuantities(context);
  if (!chart || expected.length < 2) {
    addIssue(context, "MISSING_EXPECTED_OBJECT", "The bar-chart strategy is missing a chart or sufficient interpreted data.", { visual_id: context.visual.id });
    return;
  }

  checkFact(context, `${chart.id}.count`, "bar-chart data count", expected.length, chart.data.length, chart.data.length === expected.length, "VALUE_MISMATCH", chart.id);
  expected.forEach((quantity) => {
    const cleanLabel = normaliseLabel(quantity.label);
    const datum = chart.data.find((item) => normaliseLabel(item.label) === cleanLabel);
    if (!datum || !finite(quantity.value)) {
      addIssue(context, "VALUE_MISMATCH", `Bar-chart category “${quantity.label}” is missing from the generated chart.`, { visual_id: context.visual.id, object_id: chart.id });
      return;
    }
    checkFact(context, `${chart.id}.${datum.id}`, `bar-chart value for ${quantity.label}`, quantity.value, datum.value, approx(datum.value, quantity.value), "VALUE_MISMATCH", chart.id);
    requireSourceNumber(context, quantity.value, `bar-chart value for ${quantity.label}`, chart.id);
    requireSourceLabel(context, quantity.label, "bar-chart category", chart.id);
  });
}

function validatePieChart(context: ValidationContext) {
  const chart = objectOfType(context.visual, "pie_chart") as MathPieChartObject | undefined;
  const expected = expectedDataQuantities(context).filter((quantity) => (quantity.value as number) > 0).slice(0, 10);
  if (!chart || expected.length < 2) {
    addIssue(context, "MISSING_EXPECTED_OBJECT", "The pie-chart strategy is missing a chart or sufficient interpreted data.", { visual_id: context.visual.id });
    return;
  }

  checkFact(context, `${chart.id}.count`, "pie-chart slice count", expected.length, chart.slices.length, chart.slices.length === expected.length, "VALUE_MISMATCH", chart.id);
  expected.forEach((quantity) => {
    const slice = chart.slices.find((item) => normaliseLabel(item.label) === normaliseLabel(quantity.label));
    if (!slice || !finite(quantity.value)) {
      addIssue(context, "VALUE_MISMATCH", `Pie-chart category “${quantity.label}” is missing from the generated chart.`, { visual_id: context.visual.id, object_id: chart.id });
      return;
    }
    checkFact(context, `${chart.id}.${slice.id}`, `pie-chart value for ${quantity.label}`, quantity.value, slice.value, approx(slice.value, quantity.value), "VALUE_MISMATCH", chart.id);
    requireSourceNumber(context, quantity.value, `pie-chart value for ${quantity.label}`, chart.id);
    requireSourceLabel(context, quantity.label, "pie-chart category", chart.id);
  });
}

function validateTable(context: ValidationContext) {
  const table = objectOfType(context.visual, "table") as MathTableObject | undefined;
  const expected = expectedDataQuantities(context);
  if (!table || expected.length < 2) {
    addIssue(context, "MISSING_EXPECTED_OBJECT", "The table strategy is missing a table or sufficient interpreted data.", { visual_id: context.visual.id });
    return;
  }

  checkFact(context, `${table.id}.rows`, "table row count", expected.length, table.rows.length, table.rows.length === expected.length, "VALUE_MISMATCH", table.id);
  expected.forEach((quantity) => {
    const row = table.rows.find((candidate) => normaliseLabel(String(candidate[0] ?? "")) === normaliseLabel(quantity.label));
    const value = row ? Number(row[1]) : Number.NaN;
    if (!row || !finite(quantity.value) || !Number.isFinite(value)) {
      addIssue(context, "VALUE_MISMATCH", `Table row “${quantity.label}” is missing or invalid.`, { visual_id: context.visual.id, object_id: table.id });
      return;
    }
    checkFact(context, `${table.id}.${quantity.id}`, `table value for ${quantity.label}`, quantity.value, value, approx(value, quantity.value), "VALUE_MISMATCH", table.id);
    requireSourceNumber(context, quantity.value, `table value for ${quantity.label}`, table.id);
    requireSourceLabel(context, quantity.label, "table row label", table.id);
  });
}

function validateClock(context: ValidationContext) {
  const clock = objectOfType(context.visual, "clock") as MathClockObject | undefined;
  const hour = context.analysis.interpretation.quantities.find((quantity) => quantity.id.toLocaleLowerCase().includes("hour") && finite(quantity.value)) || quantityByRole(context.analysis, "time");
  const minute = context.analysis.interpretation.quantities.find((quantity) => quantity.id.toLocaleLowerCase().includes("minute") && finite(quantity.value));
  if (!clock || !hour || !minute || !finite(hour.value) || !finite(minute.value)) {
    addIssue(context, "MISSING_EXPECTED_OBJECT", "The clock strategy is missing its clock or interpreted hour/minute values.", { visual_id: context.visual.id });
    return;
  }

  const hourValue = hour.value;
  const minuteValue = minute.value;
  checkFact(context, `${clock.id}.hour`, "clock hour", hourValue, clock.hour, approx(clock.hour, hourValue), "VALUE_MISMATCH", clock.id);
  checkFact(context, `${clock.id}.minute`, "clock minute", minuteValue, clock.minute, approx(clock.minute, minuteValue), "VALUE_MISMATCH", clock.id);
  if (!evidenceContainsTime(context.evidence, hourValue, minuteValue)) {
    const leak = context.answerNumbers.some((candidate) => approx(candidate, hourValue) || approx(candidate, minuteValue));
    addIssue(
      context,
      leak ? "ANSWER_LEAK_RISK" : "SOURCE_VALUE_NOT_VISIBLE",
      leak
        ? "The generated clock time cannot be verified from learner-visible text and overlaps answer/explanation context."
        : "The generated clock time cannot be verified from learner-visible text.",
      { visual_id: context.visual.id, object_id: clock.id },
    );
  }
}

function textObject(visual: MathVisual, id: string) {
  const object = visual.objects.find((candidate) => candidate.id === id && candidate.type === "text");
  return object as MathTextObject | undefined;
}

function dimensionObject(visual: MathVisual, id: string) {
  const object = visual.objects.find((candidate) => candidate.id === id && candidate.type === "dimension");
  return object as MathDimensionObject | undefined;
}

function validateComparisonBarModel(context: ValidationContext) {
  const known = quantityByRole(context.analysis, "known");
  const difference = quantityByRole(context.analysis, "difference");
  const unknown = context.analysis.interpretation.quantities.find((quantity) => quantity.role === "unknown") || null;
  const relationship = context.analysis.interpretation.relationships.find((item) => ["greater_than", "less_than", "difference"].includes(item.type));
  const knownText = textObject(context.visual, "known_value");
  const unknownText = textObject(context.visual, "unknown_value");
  const differenceDimension = dimensionObject(context.visual, "difference_1");
  const knownBar = context.visual.objects.find((object) => object.id === "known_bar" && object.type === "rectangle") as MathRectangleObject | undefined;
  const unknownBar = context.visual.objects.find((object) => object.id === "unknown_bar" && object.type === "rectangle") as MathRectangleObject | undefined;

  if (!known || !difference || !unknown || !relationship || !knownText || !unknownText || !differenceDimension || !knownBar || !unknownBar || !finite(known.value) || !finite(difference.value)) {
    addIssue(context, "MISSING_EXPECTED_OBJECT", "The comparison bar model is missing required interpreted quantities, relationship, or visual objects.", { visual_id: context.visual.id });
    return;
  }

  checkMeasurementLabel(context, knownText.text, known, "comparison known quantity", knownText.id);
  checkMeasurementLabel(context, differenceDimension.label, difference, "comparison difference", differenceDimension.id);
  checkFact(context, `${unknownText.id}.unknown`, "unknown comparison quantity", "?", unknownText.text.trim(), unknownText.text.trim() === "?", "UNKNOWN_VALUE_REVEALED", unknownText.id);

  if (relationship.type === "greater_than") {
    checkFact(context, "comparison.direction", "comparison relationship", "unknown larger", unknownBar.width > knownBar.width ? "unknown larger" : "unknown not larger", unknownBar.width > knownBar.width, "RELATIONSHIP_MISMATCH");
  } else if (relationship.type === "less_than") {
    checkFact(context, "comparison.direction", "comparison relationship", "unknown smaller", unknownBar.width < knownBar.width ? "unknown smaller" : "unknown not smaller", unknownBar.width < knownBar.width, "RELATIONSHIP_MISMATCH");
  }
}

function validatePartWholeBarModel(context: ValidationContext) {
  const parts = context.analysis.interpretation.quantities.filter((quantity) => quantity.role === "part" || quantity.role === "unknown").slice(0, 6);
  const total = context.analysis.interpretation.quantities.find((quantity) => quantity.role === "total") || null;
  const partTexts = context.visual.objects
    .filter((object) => object.type === "text" && /^part_value_\d+$/i.test(object.id)) as MathTextObject[];
  const totalDimension = dimensionObject(context.visual, "total_1");

  if (!totalDimension || partTexts.length < 2) {
    addIssue(context, "MISSING_EXPECTED_OBJECT", "The part-whole model is missing its part values or total dimension.", { visual_id: context.visual.id });
    return;
  }

  const expectedParts = parts.length >= 2 ? parts : [
    ...parts,
    { id: "unknown_part", label: "unknown part", value: null, unit: total?.unit || null, role: "unknown" as const },
  ];

  expectedParts.forEach((part, index) => {
    const text = partTexts[index];
    if (!text) {
      addIssue(context, "MISSING_EXPECTED_OBJECT", `Part ${index + 1} is missing from the generated bar model.`, { visual_id: context.visual.id });
      return;
    }
    if (part.role === "unknown" || !finite(part.value)) {
      checkFact(context, `${text.id}.unknown`, "unknown part", "?", text.text.trim(), text.text.trim() === "?", "UNKNOWN_VALUE_REVEALED", text.id);
    } else {
      checkMeasurementLabel(context, text.text, part, `part ${index + 1}`, text.id);
    }
  });

  if (total && finite(total.value)) {
    checkMeasurementLabel(context, totalDimension.label, total, "part-whole total", totalDimension.id);
  } else {
    checkFact(context, `${totalDimension.id}.unknown`, "unknown total", "?", totalDimension.label.trim(), totalDimension.label.trim() === "?", "UNKNOWN_VALUE_REVEALED", totalDimension.id);
  }
}

function validatePlaceValueTable(context: ValidationContext) {
  const table = objectOfType(context.visual, "table") as MathTableObject | undefined;
  const source = visibleFiniteQuantities(context.analysis).find((quantity) => Number.isInteger(quantity.value) && (quantity.value as number) >= 0) || null;
  if (!table || !source || !finite(source.value) || table.rows.length !== 1) {
    addIssue(context, "MISSING_EXPECTED_OBJECT", "The place-value strategy is missing a one-row table or source whole number.", { visual_id: context.visual.id });
    return;
  }

  const expectedDigits = Math.trunc(source.value).toString().split("");
  const actualDigits = table.rows[0].map((cell) => String(cell));
  checkFact(context, `${table.id}.digits`, "place-value digits", expectedDigits.join(""), actualDigits.join(""), expectedDigits.join("") === actualDigits.join(""), "VALUE_MISMATCH", table.id);
  checkQuantitySource(context, source, "place-value source number", table.id);
}

function validateMeasurement(context: ValidationContext) {
  const dimension = objectOfType(context.visual, "dimension") as MathDimensionObject | undefined;
  const measurement = visibleFiniteQuantities(context.analysis).find((quantity) => ["length", "width", "height", "radius", "value"].includes(quantity.role)) || null;
  if (!dimension || !measurement || !finite(measurement.value)) {
    addIssue(context, "MISSING_EXPECTED_OBJECT", "The measurement strategy is missing its measurement dimension or interpreted source quantity.", { visual_id: context.visual.id });
    return;
  }
  checkMeasurementLabel(context, dimension.label, measurement, "measurement value", dimension.id);
}

function runStrategyValidation(context: ValidationContext) {
  switch (context.analysis.strategy) {
    case "fraction_bar":
    case "aligned_fraction_bars":
      validateFractionBar(context);
      break;
    case "fraction_grid":
      validateFractionGrid(context);
      break;
    case "number_line":
      validateNumberLine(context);
      break;
    case "rectangle_dimensions":
      validateRectangle(context);
      break;
    case "angle_diagram":
      validateAngle(context);
      break;
    case "cube":
      validateCube(context);
      break;
    case "cuboid":
      validateCuboid(context);
      break;
    case "bar_chart":
      validateBarChart(context);
      break;
    case "pie_chart":
      validatePieChart(context);
      break;
    case "table":
      validateTable(context);
      break;
    case "clock":
      validateClock(context);
      break;
    case "bar_model_comparison":
      validateComparisonBarModel(context);
      break;
    case "bar_model_part_whole":
      validatePartWholeBarModel(context);
      break;
    case "place_value_table":
      validatePlaceValueTable(context);
      break;
    case "measurement_diagram":
      validateMeasurement(context);
      break;
    default:
      addIssue(
        context,
        "SEMANTIC_CHECK_UNSUPPORTED",
        `Semantic validation is not yet implemented for strategy “${context.analysis.strategy}”.`,
        { visual_id: context.visual.id },
        "warning",
      );
  }
}

/**
 * Phase 2E — deterministic semantic/source validator.
 *
 * Structural validity answers “is this valid V2 JSON?”. This validator answers
 * “does this V2 diagram faithfully represent learner-visible mathematics?”.
 *
 * correct_answer and explanation are NEVER accepted as evidence. They are used
 * only to strengthen ANSWER_LEAK_RISK diagnostics when a non-visible value has
 * appeared in the generated visual.
 */
export function validateMathVisualSemantics(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
  spec: MathVisualSpec,
): MathVisualSemanticValidationResult {
  const issues: MathVisualSemanticIssue[] = [];
  const checked: MathVisualSemanticCheckedFact[] = [];
  const promptVisual = spec.visuals.find((visual) => visual.placement === "prompt") || null;

  if (!promptVisual) {
    return {
      valid: false,
      review_required: false,
      validator_version: MATH_VISUAL_SEMANTIC_VALIDATOR_VERSION,
      strategy: analysis.strategy,
      issues: [
        {
          code: "MISSING_PROMPT_VISUAL",
          severity: "error",
          message: "The generated spec has no prompt visual to validate semantically.",
        },
      ],
      checked_facts: [],
    };
  }

  const context: ValidationContext = {
    input,
    analysis,
    spec,
    visual: promptVisual,
    evidence: buildMathLearnerVisibleEvidence(input),
    answerNumbers: validationContextNumbers(input),
    issues,
    checked,
  };

  const kind = expectedKind(analysis.strategy);
  if (kind && promptVisual.kind !== kind) {
    addIssue(
      context,
      "STRATEGY_KIND_MISMATCH",
      `Strategy “${analysis.strategy}” expects visual kind “${kind}”, but the generated visual uses “${promptVisual.kind}”.`,
      {
        visual_id: promptVisual.id,
        expected: kind,
        actual: promptVisual.kind,
      },
    );
  }

  runStrategyValidation(context);

  const hasErrors = issues.some((issue) => issue.severity === "error");
  const hasWarnings = issues.some((issue) => issue.severity === "warning");
  return {
    valid: !hasErrors,
    review_required: !hasErrors && hasWarnings,
    validator_version: MATH_VISUAL_SEMANTIC_VALIDATOR_VERSION,
    strategy: analysis.strategy,
    issues,
    checked_facts: checked,
  };
}
