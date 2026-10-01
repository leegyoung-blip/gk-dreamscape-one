import {
  MATH_VISUAL_SCHEMA_VERSION,
  type MathAngleMarkerObject,
  type MathBarChartObject,
  type MathCircleObject,
  type MathClockObject,
  type MathCubeObject,
  type MathCuboidObject,
  type MathDimensionObject,
  type MathFractionBarObject,
  type MathFractionGridObject,
  type MathGridObject,
  type MathLineObject,
  type MathNumberLineObject,
  type MathPieChartObject,
  type MathRectangleObject,
  type MathTableObject,
  type MathTextObject,
  type MathVisual,
  type MathVisualObject,
  type MathVisualSpec,
} from "../../components/core-math/visual-engine/MathVisualTypes";
import { validateMathVisualSpec } from "../../components/core-math/visual-engine/MathVisualValidator";
import { validateMathVisualSemantics } from "./MathVisualSemanticValidator";
import {
  buildMathLearnerVisibleEvidence,
  evidenceContainsLabel,
  evidenceContainsNumber,
  evidenceContainsUnit,
} from "./MathLearnerVisibleEvidence";
import type {
  MathIntelligenceAnalysis,
  MathIntelligenceQuestionInput,
  MathQuantity,
  MathRelationship,
  MathVisualStrategy,
} from "./MathIntelligenceTypes";
import { buildMathQuizVisualContract, type MathQuizVisualContract } from "./MathQuizVisualContract";
import type {
  MathVisualGenerationIssue,
  MathVisualSpecGenerationResult,
} from "./MathVisualGenerationTypes";

export const MATH_VISUAL_SPEC_GENERATOR_VERSION = "3B.1";

const PROMPT_VISUAL_ID = "main";

function issue(
  code: MathVisualGenerationIssue["code"],
  message: string,
): MathVisualGenerationIssue {
  return { code, message };
}

function finite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function finiteQuantities(analysis: MathIntelligenceAnalysis) {
  return analysis.interpretation.quantities.filter((quantity) => finite(quantity.value));
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

function safeUnit(...quantities: Array<MathQuantity | null>) {
  return quantities.find((quantity) => quantity?.unit)?.unit ?? null;
}

function formatNumber(value: number) {
  return Number(value.toFixed(6)).toString();
}

function quantityLabel(quantity: MathQuantity) {
  const label = quantity.label?.trim();
  return label || quantity.id.replace(/[_-]+/g, " ");
}

function formatMeasurement(value: number, unit: string | null) {
  return `${formatNumber(value)}${unit ? ` ${unit}` : ""}`;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function makeSpec(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
  visual: MathVisual,
): MathVisualSpec {
  return {
    schema_version: MATH_VISUAL_SCHEMA_VERSION,
    metadata: {
      generated_by: "intelligence",
      generator_version: MATH_VISUAL_SPEC_GENERATOR_VERSION,
      source: analysis.source,
      notes: `strategy=${analysis.strategy}; confidence=${analysis.confidence.toFixed(3)}`,
    },
    visuals: [
      {
        ...visual,
        metadata: {
          ...(visual.metadata || {}),
          strategy: analysis.strategy,
          intelligence_source: analysis.source,
          intelligence_model: analysis.model,
          confidence: analysis.confidence,
          reason_codes: analysis.reason_codes,
          question_id: input.id,
          primary_level: input.primary_level,
        },
      },
    ],
  };
}

function generated(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
  visual: MathVisual,
): MathVisualSpecGenerationResult {
  const spec = makeSpec(input, analysis, visual);
  const structuralValidation = validateMathVisualSpec(spec);

  if (!structuralValidation.valid) {
    return {
      status: "invalid",
      strategy: analysis.strategy,
      generator_version: MATH_VISUAL_SPEC_GENERATOR_VERSION,
      source: analysis.source,
      spec: null,
      issues: [
        issue(
          "INVALID_GENERATED_SPEC",
          "Dreamscape generated a Math Visual V2 specification that failed structural validation. It was not accepted.",
        ),
      ],
      structural_validation: structuralValidation,
      semantic_validation: null,
    };
  }

  const semanticValidation = validateMathVisualSemantics(input, analysis, spec);

  if (!semanticValidation.valid) {
    return {
      status: "invalid",
      strategy: analysis.strategy,
      generator_version: MATH_VISUAL_SPEC_GENERATOR_VERSION,
      source: analysis.source,
      spec: null,
      issues: [
        issue(
          "SEMANTIC_VALIDATION_FAILED",
          "The generated V2 visual was structurally valid but did not faithfully match learner-visible mathematics. It was rejected.",
        ),
      ],
      structural_validation: structuralValidation,
      semantic_validation: semanticValidation,
    };
  }

  if (semanticValidation.review_required) {
    return {
      status: "needs_review",
      strategy: analysis.strategy,
      generator_version: MATH_VISUAL_SPEC_GENERATOR_VERSION,
      source: analysis.source,
      spec,
      issues: [
        issue(
          "SEMANTIC_REVIEW_REQUIRED",
          "The generated V2 visual passed hard semantic checks but includes a semantic warning that requires human review.",
        ),
      ],
      structural_validation: structuralValidation,
      semantic_validation: semanticValidation,
    };
  }

  return {
    status: "generated",
    strategy: analysis.strategy,
    generator_version: MATH_VISUAL_SPEC_GENERATOR_VERSION,
    source: analysis.source,
    spec,
    issues: [],
    structural_validation: structuralValidation,
    semantic_validation: semanticValidation,
  };
}

function noSpec(
  analysis: MathIntelligenceAnalysis,
  status: MathVisualSpecGenerationResult["status"],
  generationIssue: MathVisualGenerationIssue,
): MathVisualSpecGenerationResult {
  return {
    status,
    strategy: analysis.strategy,
    generator_version: MATH_VISUAL_SPEC_GENERATOR_VERSION,
    source: analysis.source,
    spec: null,
    issues: [generationIssue],
    structural_validation: null,
    semantic_validation: null,
  };
}

function visual(
  kind: MathVisual["kind"],
  ariaLabel: string,
  canvas: NonNullable<MathVisual["canvas"]>,
  objects: MathVisualObject[],
): MathVisual {
  return {
    id: PROMPT_VISUAL_ID,
    placement: "prompt",
    kind,
    aria_label: ariaLabel,
    canvas,
    objects,
  };
}

function contractUnitLabel(unit: string | null) {
  if (!unit) return null;
  if (unit === "sgd") return "$";
  if (unit === "cent") return "¢";
  if (unit === "deg") return "°";
  return unit;
}

function generateFractionRegionFromContract(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
  contract: Extract<MathQuizVisualContract, { kind: "fraction_region" }>,
) {
  if (contract.strategy === "fraction_grid") {
    const shape = gridShape(contract.total_parts);
    if (!shape) {
      return noSpec(analysis, "needs_review", issue("UNSUPPORTED_STRATEGY", "The required fraction grid cannot be laid out safely."));
    }
    const object: MathFractionGridObject = {
      id: "fraction_region_1",
      type: "fraction_grid",
      x: 135, y: 70, width: 450, height: 220,
      rows: shape.rows, columns: shape.columns,
      shaded_cells: Array.from({ length: contract.shaded_parts }, (_, index) => index),
      show_fraction_label: false,
      style: { tone: "accent" },
    };
    return generated(input, analysis, visual(
      "fraction",
      `${contract.total_parts} equal parts with ${contract.shaded_parts} shaded and ${contract.unshaded_parts} unshaded`,
      { width: 720, height: 360, padding: 28, background: "paper" },
      [object],
    ));
  }

  const object: MathFractionBarObject = {
    id: "fraction_region_1",
    type: "fraction_bar",
    x: 90, y: 95, width: 540, height: 100,
    numerator: contract.shaded_parts,
    denominator: contract.total_parts,
    orientation: "horizontal",
    show_fraction_label: false,
    style: { tone: "accent" },
  };
  return generated(input, analysis, visual(
    "fraction",
    `${contract.total_parts} equal parts with ${contract.shaded_parts} shaded and ${contract.unshaded_parts} unshaded`,
    { width: 720, height: 290, padding: 28, background: "paper" },
    [object],
  ));
}

function generateDataFromContract(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
  contract: Extract<MathQuizVisualContract, { kind: "data_series" }>,
) {
  if (contract.strategy === "table") {
    const unit = contractUnitLabel(contract.unit);
    const object: MathTableObject = {
      id: "table_1",
      type: "table",
      x: 110, y: 55, width: 500,
      height: clamp(95 + contract.data.length * 44, 180, 430),
      columns: ["Category", unit ? `Value (${unit})` : "Value"],
      rows: contract.data.map((datum) => [datum.label, datum.value]),
    };
    return generated(input, analysis, visual(
      "table", `Data table with ${contract.data.length} source categories`,
      { width: 720, height: clamp(190 + contract.data.length * 44, 320, 650), padding: 28, background: "paper" },
      [object],
    ));
  }

  const values = contract.data.map((datum) => datum.value);
  if (values.some((value) => value < 0)) {
    return noSpec(analysis, "needs_review", issue("UNSUPPORTED_STRATEGY", "Negative bar-chart values are not generated automatically."));
  }
  const yMax = niceMaximum(Math.max(...values));
  const unit = contractUnitLabel(contract.unit);
  const object: MathBarChartObject = {
    id: "bar_chart_1",
    type: "bar_chart",
    x: 70, y: 45, width: 580, height: 335,
    data: contract.data.map((datum) => ({
      id: datum.id,
      label: datum.label,
      value: datum.value,
      ...(datum.tone ? { tone: datum.tone } : {}),
    })),
    y_label: unit ? `Value (${unit})` : "Value",
    y_min: 0, y_max: yMax, y_step: yMax / 5,
    // Reading the scale is part of the graph task; avoid duplicating every
    // value above its bar unless the source explicitly provided a table.
    show_values: false,
  };
  return generated(input, analysis, visual(
    "data", `Bar chart with ${contract.data.length} source categories`,
    { width: 720, height: 440, padding: 28, background: "paper" },
    [object],
  ));
}

function generateSquareGridFromContract(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
  contract: Extract<MathQuizVisualContract, { kind: "square_grid" }>,
) {
  const maxDimension = Math.max(contract.rows, contract.columns);
  const cell = Math.min(82, Math.floor(430 / maxDimension));
  const width = contract.columns * cell;
  const height = contract.rows * cell;
  const object: MathGridObject = {
    id: "square_grid_1",
    type: "grid",
    x: (720 - width) / 2,
    y: 55 + (360 - height) / 2,
    width, height,
    rows: contract.rows,
    columns: contract.columns,
    style: { tone: "default", stroke_width: 4 },
    aria_label: `${contract.rows} by ${contract.columns} grid of equal squares`,
  };
  return generated(input, analysis, visual(
    "geometry", `${contract.rows} by ${contract.columns} grid of equal squares`,
    { width: 720, height: 470, padding: 28, background: "paper" },
    [object],
  ));
}

function generateApprovedQuizContractVisual(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
  contract: MathQuizVisualContract,
) {
  if (contract.strategy !== analysis.strategy) {
    return noSpec(analysis, "needs_review", issue("UNSUPPORTED_STRATEGY", "The selected strategy does not match the Phase 3B learner-visible visual contract."));
  }
  if (contract.kind === "fraction_region") return generateFractionRegionFromContract(input, analysis, contract);
  if (contract.kind === "data_series") return generateDataFromContract(input, analysis, contract);
  return generateSquareGridFromContract(input, analysis, contract);
}

type FractionPair = {
  numerator: number;
  denominator: number;
  numeratorQuantity: MathQuantity;
  denominatorQuantity: MathQuantity;
};

function fractionPairs(analysis: MathIntelligenceAnalysis): FractionPair[] {
  const quantities = analysis.interpretation.quantities;
  const pairs: FractionPair[] = [];
  const used = new Set<string>();

  const numeratorPattern = /^(?:numerator|part)(?:[_-](\d+))?$/i;
  const denominatorPattern = /^(?:denominator|total)(?:[_-](\d+))?$/i;

  for (const numeratorQuantity of quantities) {
    if (!finite(numeratorQuantity.value)) continue;
    const numeratorMatch = numeratorQuantity.id.match(numeratorPattern);
    if (!numeratorMatch && numeratorQuantity.role !== "part") continue;

    const suffix = numeratorMatch?.[1] || "";
    let denominatorQuantity = quantities.find((candidate) => {
      if (!finite(candidate.value) || used.has(candidate.id)) return false;
      if (suffix && candidate.id.match(denominatorPattern)?.[1] === suffix) return true;
      return !suffix && candidate.role === "total";
    });

    if (!denominatorQuantity) {
      denominatorQuantity = quantities.find(
        (candidate) =>
          finite(candidate.value) &&
          candidate.role === "total" &&
          !used.has(candidate.id),
      );
    }

    if (!denominatorQuantity || !finite(denominatorQuantity.value)) continue;

    const numerator = numeratorQuantity.value;
    const denominator = denominatorQuantity.value;
    if (
      !Number.isInteger(numerator) ||
      !Number.isInteger(denominator) ||
      numerator < 0 ||
      denominator <= 0 ||
      numerator > denominator
    ) {
      continue;
    }

    used.add(numeratorQuantity.id);
    used.add(denominatorQuantity.id);
    pairs.push({
      numerator,
      denominator,
      numeratorQuantity,
      denominatorQuantity,
    });
  }

  return pairs;
}

function generateFractionBar(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
) {
  const pairs = fractionPairs(analysis);
  if (pairs.length < 1) {
    return noSpec(
      analysis,
      "needs_review",
      issue(
        "MISSING_REQUIRED_QUANTITY",
        "A fraction bar needs an explicit numerator and denominator. Dreamscape will not infer them from the answer.",
      ),
    );
  }

  const pair = pairs[0];
  const object: MathFractionBarObject = {
    id: "fraction_1",
    type: "fraction_bar",
    x: 90,
    y: 85,
    width: 540,
    height: 90,
    numerator: pair.numerator,
    denominator: pair.denominator,
    orientation: "horizontal",
    show_fraction_label: true,
    style: { tone: "accent" },
  };

  return generated(
    input,
    analysis,
    visual(
      "fraction",
      `Horizontal fraction bar showing ${formatNumber(pair.numerator)} out of ${formatNumber(pair.denominator)} equal parts`,
      { width: 720, height: 260, padding: 28, background: "paper" },
      [object],
    ),
  );
}

function gridShape(denominator: number) {
  if (!Number.isInteger(denominator) || denominator < 1 || denominator > 100) return null;
  let rows = Math.floor(Math.sqrt(denominator));
  while (rows > 1 && denominator % rows !== 0) rows -= 1;
  const columns = denominator / rows;
  if (!Number.isInteger(columns) || rows * columns !== denominator) return null;
  if (columns > 20) return null;
  return { rows, columns };
}

function generateFractionGrid(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
) {
  const pairs = fractionPairs(analysis);
  if (pairs.length < 1) {
    return noSpec(
      analysis,
      "needs_review",
      issue("MISSING_REQUIRED_QUANTITY", "A fraction grid needs an explicit numerator and denominator."),
    );
  }

  const pair = pairs[0];
  const shape = gridShape(pair.denominator);
  if (!shape) {
    return noSpec(
      analysis,
      "needs_review",
      issue(
        "TOO_MANY_CELLS",
        "The denominator cannot be represented cleanly by the deterministic fraction-grid layout.",
      ),
    );
  }

  const object: MathFractionGridObject = {
    id: "fraction_grid_1",
    type: "fraction_grid",
    x: 130,
    y: 55,
    width: 460,
    height: 260,
    rows: shape.rows,
    columns: shape.columns,
    shaded_cells: Array.from({ length: pair.numerator }, (_, index) => index),
    show_fraction_label: true,
    style: { tone: "accent" },
  };

  return generated(
    input,
    analysis,
    visual(
      "fraction",
      `Fraction grid with ${pair.numerator} of ${pair.denominator} equal cells shaded`,
      { width: 720, height: 370, padding: 28, background: "paper" },
      [object],
    ),
  );
}

function generateAlignedFractionBars(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
) {
  const pairs = fractionPairs(analysis).slice(0, 4);
  if (pairs.length < 2) {
    return noSpec(
      analysis,
      "needs_review",
      issue(
        "MISSING_REQUIRED_QUANTITY",
        "Aligned fraction bars need at least two explicit fractions.",
      ),
    );
  }

  const height = 62;
  const gap = 42;
  const objects: MathFractionBarObject[] = pairs.map((pair, index) => ({
    id: `fraction_${index + 1}`,
    type: "fraction_bar",
    x: 105,
    y: 60 + index * (height + gap),
    width: 510,
    height,
    numerator: pair.numerator,
    denominator: pair.denominator,
    orientation: "horizontal",
    show_fraction_label: true,
    style: { tone: index === 0 ? "accent" : "muted" },
  }));

  return generated(
    input,
    analysis,
    visual(
      "fraction",
      `Aligned fraction bars showing ${pairs.map((pair) => `${pair.numerator}/${pair.denominator}`).join(" and ")}`,
      {
        width: 720,
        height: Math.max(280, 120 + pairs.length * (height + gap)),
        padding: 28,
        background: "paper",
      },
      objects,
    ),
  );
}

function decimalPlaces(value: number) {
  const text = value.toString();
  if (!text.includes(".")) return 0;
  return Math.min(3, text.split(".")[1]?.length || 0);
}

function gcd(a: number, b: number): number {
  let left = Math.abs(Math.round(a));
  let right = Math.abs(Math.round(b));
  while (right) {
    const next = left % right;
    left = right;
    right = next;
  }
  return left || 1;
}

function numberLineStep(values: number[]) {
  const places = Math.max(...values.map(decimalPlaces), 0);
  const scale = 10 ** places;
  const scaled = [...new Set(values.map((value) => Math.round(value * scale)))].sort((a, b) => a - b);
  if (scaled.length < 2) return null;
  let step = Math.abs(scaled[1] - scaled[0]);
  for (let index = 2; index < scaled.length; index += 1) {
    step = gcd(step, Math.abs(scaled[index] - scaled[index - 1]));
  }
  return step > 0 ? step / scale : null;
}

function generateNumberLine(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
) {
  const values = [...new Set(finiteQuantities(analysis).map((quantity) => quantity.value as number))].sort((a, b) => a - b);
  if (values.length < 2) {
    return noSpec(
      analysis,
      "needs_review",
      issue(
        "INSUFFICIENT_DISTINCT_VALUES",
        "A deterministic number line needs at least two explicit distinct values so its scale is not invented.",
      ),
    );
  }

  const min = values[0];
  const max = values[values.length - 1];
  const step = numberLineStep(values);
  if (!step || max <= min) {
    return noSpec(
      analysis,
      "needs_review",
      issue("INSUFFICIENT_DISTINCT_VALUES", "Dreamscape could not derive a reliable number-line interval."),
    );
  }

  const targetQuantity = quantityById(analysis, analysis.interpretation.target.quantity_id);
  const highlightedValues =
    targetQuantity && finite(targetQuantity.value) && targetQuantity.role !== "unknown"
      ? [targetQuantity.value]
      : [];
  const tickCount = Math.floor((max - min) / step) + 1;
  const labelledValues = tickCount <= 21 ? valuesForRange(min, max, step) : [min, ...highlightedValues, max];

  const object: MathNumberLineObject = {
    id: "number_line_1",
    type: "number_line",
    x: 70,
    y: 115,
    width: 580,
    min,
    max,
    step,
    highlighted_values: [...new Set(highlightedValues)],
    labelled_values: [...new Set(labelledValues)],
    arrows: "both",
  };

  return generated(
    input,
    analysis,
    visual(
      "number_line",
      `Number line from ${formatNumber(min)} to ${formatNumber(max)}`,
      { width: 720, height: 230, padding: 28, background: "paper" },
      [object],
    ),
  );
}

function valuesForRange(min: number, max: number, step: number) {
  const values: number[] = [];
  const maxTicks = 40;
  for (let index = 0; index < maxTicks; index += 1) {
    const value = min + index * step;
    if (value > max + step / 1000) break;
    values.push(Number(value.toFixed(6)));
  }
  return values;
}

function generateRectangleDimensions(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
) {
  const length = quantityByRole(analysis, "length");
  const width = quantityByRole(analysis, "width");
  if (!length || !width || !finite(length.value) || !finite(width.value) || length.value <= 0 || width.value <= 0) {
    return noSpec(
      analysis,
      "needs_review",
      issue("MISSING_REQUIRED_QUANTITY", "A rectangle diagram needs explicit positive length and width values."),
    );
  }

  const maxDrawWidth = 400;
  const maxDrawHeight = 205;
  const scale = Math.min(maxDrawWidth / length.value, maxDrawHeight / width.value);
  const drawWidth = Math.max(28, length.value * scale);
  const drawHeight = Math.max(28, width.value * scale);
  const x = (720 - drawWidth) / 2;
  const y = (350 - drawHeight) / 2 + 5;
  const unit = safeUnit(length, width);

  const rectangle: MathRectangleObject = {
    id: "rectangle_1",
    type: "rectangle",
    x,
    y,
    width: drawWidth,
    height: drawHeight,
    style: { fill: "light", tone: "accent", stroke_width: 4 },
  };
  const lengthDimension: MathDimensionObject = {
    id: "length_1",
    type: "dimension",
    from: { x, y },
    to: { x: x + drawWidth, y },
    label: formatMeasurement(length.value, length.unit || unit),
    offset: -34,
  };
  const widthDimension: MathDimensionObject = {
    id: "width_1",
    type: "dimension",
    from: { x: x + drawWidth, y },
    to: { x: x + drawWidth, y: y + drawHeight },
    label: formatMeasurement(width.value, width.unit || unit),
    offset: 34,
  };

  return generated(
    input,
    analysis,
    visual(
      "geometry",
      `Rectangle measuring ${formatMeasurement(length.value, length.unit || unit)} by ${formatMeasurement(width.value, width.unit || unit)}`,
      { width: 720, height: 360, padding: 28, background: "paper" },
      [rectangle, lengthDimension, widthDimension],
    ),
  );
}

function generateAngleDiagram(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
) {
  const angle = quantityByRole(analysis, "angle");
  if (!angle || !finite(angle.value) || angle.value <= 0 || angle.value > 180) {
    return noSpec(
      analysis,
      "needs_review",
      issue(
        "MISSING_REQUIRED_QUANTITY",
        "The current deterministic angle renderer needs an explicit angle between 0° and 180°.",
      ),
    );
  }

  const vertex = { x: 250, y: 235 };
  const rayLength = 190;
  const radians = (-angle.value * Math.PI) / 180;
  const rayAEnd = { x: vertex.x + rayLength, y: vertex.y };
  const rayBEnd = {
    x: vertex.x + Math.cos(radians) * rayLength,
    y: vertex.y + Math.sin(radians) * rayLength,
  };

  const objects: MathVisualObject[] = [
    {
      id: "ray_a",
      type: "line",
      from: vertex,
      to: rayAEnd,
      style: { stroke_width: 4 },
    } as MathLineObject,
    {
      id: "ray_b",
      type: "line",
      from: vertex,
      to: rayBEnd,
      style: { stroke_width: 4 },
    } as MathLineObject,
    {
      id: "angle_1",
      type: "angle_marker",
      a: rayAEnd,
      vertex,
      b: rayBEnd,
      radius: 54,
      label: `${formatNumber(angle.value)}°`,
      style: { tone: "accent", stroke_width: 4 },
    } as MathAngleMarkerObject,
  ];

  return generated(
    input,
    analysis,
    visual(
      "geometry",
      `Angle measuring ${formatNumber(angle.value)} degrees`,
      { width: 620, height: 390, padding: 28, background: "paper" },
      objects,
    ),
  );
}

function generateCube(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
) {
  const side =
    quantityByRole(analysis, "length") ||
    quantityByRole(analysis, "width") ||
    quantityByRole(analysis, "height") ||
    finiteQuantities(analysis).find((quantity) => quantity.role === "known") ||
    null;

  if (analysis.interpretation.target.kind === "volume" && (!side || !finite(side.value) || side.value <= 0)) {
    return noSpec(
      analysis,
      "needs_review",
      issue("MISSING_REQUIRED_QUANTITY", "A cube volume diagram needs an explicit positive side length."),
    );
  }

  const object: MathCubeObject = {
    id: "cube_1",
    type: "cube",
    x: 220,
    y: 135,
    size: side && finite(side.value) && side.value > 0 ? side.value : 1,
    unit: side?.unit || undefined,
    show_dimensions: Boolean(side && finite(side.value)),
    style: { fill: "light", tone: "accent" },
  };

  return generated(
    input,
    analysis,
    visual(
      "solid",
      side && finite(side.value)
        ? `Cube with side length ${formatMeasurement(side.value, side.unit)}`
        : "Cube",
      { width: 620, height: 390, padding: 28, background: "paper" },
      [object],
    ),
  );
}

function generateCuboid(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
) {
  const length = quantityByRole(analysis, "length");
  const width = quantityByRole(analysis, "width");
  const height = quantityByRole(analysis, "height");
  if (
    !length || !width || !height ||
    !finite(length.value) || !finite(width.value) || !finite(height.value) ||
    length.value <= 0 || width.value <= 0 || height.value <= 0
  ) {
    return noSpec(
      analysis,
      "needs_review",
      issue("MISSING_REQUIRED_QUANTITY", "A cuboid diagram needs explicit positive length, width, and height values."),
    );
  }

  const unit = safeUnit(length, width, height);
  const object: MathCuboidObject = {
    id: "cuboid_1",
    type: "cuboid",
    x: 210,
    y: 105,
    length: length.value,
    width: width.value,
    height: height.value,
    unit: unit || undefined,
    show_dimensions: true,
    style: { fill: "light", tone: "accent" },
  };

  return generated(
    input,
    analysis,
    visual(
      "solid",
      `Cuboid measuring ${formatNumber(length.value)} by ${formatNumber(width.value)} by ${formatNumber(height.value)}${unit ? ` ${unit}` : ""}`,
      { width: 720, height: 410, padding: 28, background: "paper" },
      [object],
    ),
  );
}

function visibleDataQuantities(analysis: MathIntelligenceAnalysis) {
  return finiteQuantities(analysis).filter(
    (quantity) => quantity.role !== "unknown",
  );
}

function sourceBackedDataQuantities(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
) {
  const evidence = buildMathLearnerVisibleEvidence(input);
  return visibleDataQuantities(analysis).filter((quantity) => {
    if (!finite(quantity.value) || !quantity.label?.trim()) return false;
    if (!evidenceContainsNumber(evidence, quantity.value)) return false;
    if (!evidenceContainsLabel(evidence, quantity.label)) return false;
    if (quantity.unit && !evidenceContainsUnit(evidence, quantity.unit)) return false;
    return true;
  });
}

function sourceSafeLabel(
  input: MathIntelligenceQuestionInput,
  label: string | null | undefined,
) {
  if (!label?.trim()) return null;
  return evidenceContainsLabel(buildMathLearnerVisibleEvidence(input), label)
    ? label.trim()
    : null;
}

function sourceSafeUnit(
  input: MathIntelligenceQuestionInput,
  unit: string | null | undefined,
) {
  if (!unit) return null;
  return evidenceContainsUnit(buildMathLearnerVisibleEvidence(input), unit)
    ? unit
    : null;
}

function niceMaximum(maximum: number) {
  if (maximum <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(maximum));
  const normalised = maximum / magnitude;
  const nice = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;
  return nice * magnitude;
}

function generateBarChart(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
) {
  const quantities = sourceBackedDataQuantities(input, analysis);
  if (quantities.length < 2) {
    return noSpec(
      analysis,
      "needs_review",
      issue("MISSING_REQUIRED_QUANTITY", "A bar chart needs at least two explicit labelled data values."),
    );
  }

  const values = quantities.map((quantity) => quantity.value as number);
  if (values.some((value) => value < 0)) {
    return noSpec(
      analysis,
      "needs_review",
      issue("UNSUPPORTED_STRATEGY", "The current deterministic bar chart generator does not render negative bars."),
    );
  }

  const yMax = niceMaximum(Math.max(...values));
  const object: MathBarChartObject = {
    id: "bar_chart_1",
    type: "bar_chart",
    x: 90,
    y: 55,
    width: 540,
    height: 310,
    data: quantities.slice(0, 12).map((quantity, index) => ({
      id: `datum_${index + 1}`,
      label: quantityLabel(quantity),
      value: quantity.value as number,
    })),
    y_min: 0,
    y_max: yMax,
    y_step: yMax / 5,
    show_values: true,
  };

  return generated(
    input,
    analysis,
    visual(
      "data",
      `Bar chart with ${object.data.length} labelled values`,
      { width: 720, height: 430, padding: 28, background: "paper" },
      [object],
    ),
  );
}

function generatePieChart(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
) {
  const quantities = sourceBackedDataQuantities(input, analysis).filter(
    (quantity) => (quantity.value as number) > 0,
  );
  if (quantities.length < 2) {
    return noSpec(
      analysis,
      "needs_review",
      issue("MISSING_REQUIRED_QUANTITY", "A pie chart needs at least two explicit positive labelled values."),
    );
  }

  const object: MathPieChartObject = {
    id: "pie_chart_1",
    type: "pie_chart",
    cx: 300,
    cy: 210,
    radius: 145,
    slices: quantities.slice(0, 10).map((quantity, index) => ({
      id: `slice_${index + 1}`,
      label: quantityLabel(quantity),
      value: quantity.value as number,
    })),
    show_labels: true,
    show_values: true,
  };

  return generated(
    input,
    analysis,
    visual(
      "data",
      `Pie chart with ${object.slices.length} categories`,
      { width: 720, height: 430, padding: 28, background: "paper" },
      [object],
    ),
  );
}

function generateTable(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
) {
  const quantities = sourceBackedDataQuantities(input, analysis);
  if (quantities.length < 2) {
    return noSpec(
      analysis,
      "needs_review",
      issue("MISSING_REQUIRED_QUANTITY", "A generated table needs at least two explicit labelled values."),
    );
  }

  const unit = safeUnit(...quantities);
  const object: MathTableObject = {
    id: "table_1",
    type: "table",
    x: 120,
    y: 55,
    width: 480,
    height: clamp(95 + quantities.length * 44, 180, 330),
    columns: ["Item", unit ? `Value (${unit})` : "Value"],
    rows: quantities.slice(0, 12).map((quantity) => [
      quantityLabel(quantity),
      quantity.value as number,
    ]),
  };

  return generated(
    input,
    analysis,
    visual(
      "table",
      `Data table with ${object.rows.length} rows`,
      { width: 720, height: clamp(190 + object.rows.length * 44, 320, 650), padding: 28, background: "paper" },
      [object],
    ),
  );
}

function generateClock(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
) {
  const hour = analysis.interpretation.quantities.find(
    (quantity) => quantity.id.toLocaleLowerCase().includes("hour") && finite(quantity.value),
  ) || quantityByRole(analysis, "time");
  const minute = analysis.interpretation.quantities.find(
    (quantity) => quantity.id.toLocaleLowerCase().includes("minute") && finite(quantity.value),
  );

  if (!hour || !minute || !finite(hour.value) || !finite(minute.value)) {
    return noSpec(
      analysis,
      "needs_review",
      issue("MISSING_REQUIRED_QUANTITY", "An analogue clock needs explicit hour and minute values."),
    );
  }

  if (hour.value < 0 || hour.value > 23 || minute.value < 0 || minute.value >= 60) {
    return noSpec(
      analysis,
      "needs_review",
      issue("MISSING_REQUIRED_QUANTITY", "The supplied clock time is outside the supported range."),
    );
  }

  const object: MathClockObject = {
    id: "clock_1",
    type: "clock",
    cx: 260,
    cy: 205,
    radius: 145,
    hour: hour.value,
    minute: minute.value,
    show_numbers: true,
  };

  return generated(
    input,
    analysis,
    visual(
      "clock",
      `Analogue clock showing ${formatNumber(hour.value)}:${String(Math.round(minute.value)).padStart(2, "0")}`,
      { width: 520, height: 420, padding: 28, background: "paper" },
      [object],
    ),
  );
}

function comparisonRelationship(analysis: MathIntelligenceAnalysis): MathRelationship | null {
  return analysis.interpretation.relationships.find(
    (relationship) =>
      (relationship.type === "greater_than" || relationship.type === "less_than" || relationship.type === "difference") &&
      finite(relationship.value),
  ) ?? null;
}

function generateComparisonBarModel(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
) {
  const known = analysis.interpretation.quantities.find((quantity) => quantity.role === "known") ?? null;
  const difference = quantityByRole(analysis, "difference");
  const unknown = analysis.interpretation.quantities.find((quantity) => quantity.role === "unknown") ?? null;
  const relationship = comparisonRelationship(analysis);

  if (!known || !difference || !unknown || !finite(difference.value) || !relationship) {
    return noSpec(
      analysis,
      "needs_review",
      issue(
        "MISSING_REQUIRED_RELATIONSHIP",
        "A comparison bar model needs two source quantities, an explicit difference, and the comparison direction.",
      ),
    );
  }

  const knownHasValue = finite(known.value);

  const x = 115;
  const y = 80;
  const longWidth = 450;
  const shortWidth = 320;
  const barHeight = 62;
  const gap = 82;
  const unknownIsLarger = relationship.type === "greater_than";
  const knownWidth = unknownIsLarger ? shortWidth : longWidth;
  const unknownWidth = unknownIsLarger ? longWidth : shortWidth;

  const objects: MathVisualObject[] = [
    {
      id: "known_bar",
      type: "rectangle",
      x,
      y,
      width: knownWidth,
      height: barHeight,
      style: { fill: "light", tone: "accent", stroke_width: 3 },
    } as MathRectangleObject,
    {
      id: "known_value",
      type: "text",
      x: x + knownWidth / 2,
      y: y + 39,
      text: knownHasValue ? formatMeasurement(known.value as number, sourceSafeUnit(input, known.unit)) : "?",
      anchor: "middle",
      role: "value",
    } as MathTextObject,
    {
      id: "unknown_bar",
      type: "rectangle",
      x,
      y: y + gap,
      width: unknownWidth,
      height: barHeight,
      style: { fill: "light", tone: "muted", stroke_width: 3 },
    } as MathRectangleObject,
    {
      id: "unknown_value",
      type: "text",
      x: x + unknownWidth / 2,
      y: y + gap + 39,
      text: "?",
      anchor: "middle",
      role: "value",
    } as MathTextObject,
    {
      id: "difference_1",
      type: "dimension",
      from: { x: x + shortWidth, y: y + gap + barHeight + 20 },
      to: { x: x + longWidth, y: y + gap + barHeight + 20 },
      label: formatMeasurement(difference.value, sourceSafeUnit(input, difference.unit || known.unit)),
      offset: 18,
      extension_lines: false,
      style: { tone: "warning" },
    } as MathDimensionObject,
    {
      id: "not_to_scale",
      type: "text",
      x: 340,
      y: 300,
      text: "Model not drawn to scale",
      anchor: "middle",
      role: "annotation",
      style: { tone: "muted" },
    } as MathTextObject,
  ];

  const knownLabel = sourceSafeLabel(input, known.label);
  const unknownLabel = sourceSafeLabel(input, unknown.label);
  if (knownLabel) {
    objects.push({
      id: "known_label",
      type: "text",
      x: x - 18,
      y: y + 39,
      text: knownLabel,
      anchor: "end",
      role: "label",
    } as MathTextObject);
  }
  if (unknownLabel) {
    objects.push({
      id: "unknown_label",
      type: "text",
      x: x - 18,
      y: y + gap + 39,
      text: unknownLabel,
      anchor: "end",
      role: "label",
    } as MathTextObject);
  }

  return generated(
    input,
    analysis,
    visual(
      "bar_model",
      knownHasValue
        ? `Comparison bar model with known quantity ${formatMeasurement(known.value as number, sourceSafeUnit(input, known.unit))} and difference ${formatMeasurement(difference.value, sourceSafeUnit(input, difference.unit || known.unit))}`
        : `Comparison bar model showing a source-stated difference of ${formatMeasurement(difference.value, sourceSafeUnit(input, difference.unit || known.unit))}`,
      { width: 720, height: 340, padding: 28, background: "paper" },
      objects,
    ),
  );
}

function generatePartWholeBarModel(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
) {
  const quantities = analysis.interpretation.quantities;
  const parts = quantities.filter((quantity) => quantity.role === "part" || quantity.role === "unknown");
  const total = quantities.find((quantity) => quantity.role === "total") ?? null;
  if (parts.length < 2 && !total) {
    return noSpec(
      analysis,
      "needs_review",
      issue("MISSING_REQUIRED_RELATIONSHIP", "A part-whole bar model needs explicit parts and/or a total."),
    );
  }

  const modelParts = parts.length >= 2 ? parts.slice(0, 6) : [
    ...parts,
    { id: "unknown_part", label: "unknown part", value: null, unit: total?.unit || null, role: "unknown" as const },
  ];
  if (modelParts.length < 2) {
    return noSpec(
      analysis,
      "needs_review",
      issue("MISSING_REQUIRED_QUANTITY", "Dreamscape cannot identify enough parts to build a part-whole model."),
    );
  }

  const x = 105;
  const y = 115;
  const totalWidth = 510;
  const segmentWidth = totalWidth / modelParts.length;
  const objects: MathVisualObject[] = [];

  modelParts.forEach((part, index) => {
    objects.push({
      id: `part_${index + 1}`,
      type: "rectangle",
      x: x + index * segmentWidth,
      y,
      width: segmentWidth,
      height: 76,
      style: { fill: "light", tone: index % 2 === 0 ? "accent" : "muted", stroke_width: 3 },
    } as MathRectangleObject);
    objects.push({
      id: `part_value_${index + 1}`,
      type: "text",
      x: x + index * segmentWidth + segmentWidth / 2,
      y: y + 46,
      text: part.role === "unknown" || !finite(part.value)
        ? "?"
        : formatMeasurement(part.value, part.unit),
      anchor: "middle",
      role: "value",
    } as MathTextObject);
  });

  objects.push({
    id: "total_1",
    type: "dimension",
    from: { x, y: y - 12 },
    to: { x: x + totalWidth, y: y - 12 },
    label: total && finite(total.value) ? formatMeasurement(total.value, total.unit) : "?",
    offset: -22,
    style: { tone: "default" },
  } as MathDimensionObject);
  objects.push({
    id: "not_to_scale",
    type: "text",
    x: 360,
    y: 250,
    text: "Model not drawn to scale",
    anchor: "middle",
    role: "annotation",
    style: { tone: "muted" },
  } as MathTextObject);

  return generated(
    input,
    analysis,
    visual(
      "bar_model",
      "Part-whole bar model",
      { width: 720, height: 300, padding: 28, background: "paper" },
      objects,
    ),
  );
}

function generateRatioBarModel(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
) {
  const factors = analysis.interpretation.quantities.filter(
    (quantity) => quantity.role === "factor" && finite(quantity.value),
  );
  const left = analysis.interpretation.quantities.find(
    (quantity) => quantity.id === "ratio_a" && finite(quantity.value),
  ) || factors[0] || null;
  const right = analysis.interpretation.quantities.find(
    (quantity) => quantity.id === "ratio_b" && finite(quantity.value),
  ) || factors[1] || null;

  if (!left || !right || !finite(left.value) || !finite(right.value)) {
    return noSpec(
      analysis,
      "needs_review",
      issue("MISSING_REQUIRED_RELATIONSHIP", "A ratio bar model needs two explicit source-supported ratio terms."),
    );
  }

  if (
    !Number.isInteger(left.value) ||
    !Number.isInteger(right.value) ||
    left.value <= 0 ||
    right.value <= 0 ||
    left.value > 12 ||
    right.value > 12
  ) {
    return noSpec(
      analysis,
      "needs_review",
      issue(
        "UNSUPPORTED_STRATEGY",
        "The deterministic ratio bar currently supports positive whole-number ratios up to 12 units per quantity.",
      ),
    );
  }

  const leftCount = left.value;
  const rightCount = right.value;
  const maxCount = Math.max(leftCount, rightCount);
  const unitWidth = Math.min(66, 480 / maxCount);
  const barHeight = 58;
  const x = 135;
  const firstY = 80;
  const secondY = 190;
  const objects: MathVisualObject[] = [];

  for (let index = 0; index < leftCount; index += 1) {
    objects.push({
      id: `ratio_a_segment_${index + 1}`,
      type: "rectangle",
      x: x + index * unitWidth,
      y: firstY,
      width: unitWidth,
      height: barHeight,
      style: { fill: "light", tone: "accent", stroke_width: 3 },
    } as MathRectangleObject);
  }

  for (let index = 0; index < rightCount; index += 1) {
    objects.push({
      id: `ratio_b_segment_${index + 1}`,
      type: "rectangle",
      x: x + index * unitWidth,
      y: secondY,
      width: unitWidth,
      height: barHeight,
      style: { fill: "light", tone: "muted", stroke_width: 3 },
    } as MathRectangleObject);
  }

  const leftLabel = sourceSafeLabel(input, left.label);
  const rightLabel = sourceSafeLabel(input, right.label);
  if (leftLabel) {
    objects.push({
      id: "ratio_a_label",
      type: "text",
      x: x - 18,
      y: firstY + 37,
      text: leftLabel,
      anchor: "end",
      role: "label",
    } as MathTextObject);
  }

  if (rightLabel) {
    objects.push({
      id: "ratio_b_label",
      type: "text",
      x: x - 18,
      y: secondY + 37,
      text: rightLabel,
      anchor: "end",
      role: "label",
    } as MathTextObject);
  }

  objects.push(
    {
      id: "ratio_a_count",
      type: "text",
      x: x + leftCount * unitWidth + 18,
      y: firstY + 37,
      text: `${formatNumber(leftCount)} parts`,
      anchor: "start",
      role: "value",
      style: { tone: "accent" },
    } as MathTextObject,
    {
      id: "ratio_b_count",
      type: "text",
      x: x + rightCount * unitWidth + 18,
      y: secondY + 37,
      text: `${formatNumber(rightCount)} parts`,
      anchor: "start",
      role: "value",
      style: { tone: "muted" },
    } as MathTextObject,
    {
      id: "ratio_equal_units_note",
      type: "text",
      x: 360,
      y: 310,
      text: "Each block represents one equal ratio unit",
      anchor: "middle",
      role: "annotation",
      style: { tone: "muted" },
    } as MathTextObject,
  );

  return generated(
    input,
    analysis,
    visual(
      "bar_model",
      `Ratio bar model showing ${formatNumber(leftCount)} to ${formatNumber(rightCount)} equal units`,
      { width: 720, height: 350, padding: 28, background: "paper" },
      objects,
    ),
  );
}

function generatePlaceValueTable(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
) {
  const source = finiteQuantities(analysis).find(
    (quantity) => quantity.role !== "unknown" && Number.isInteger(quantity.value) && (quantity.value as number) >= 0,
  );
  if (!source || !finite(source.value)) {
    return noSpec(
      analysis,
      "needs_review",
      issue("MISSING_REQUIRED_QUANTITY", "A place-value table needs an explicit non-negative whole number."),
    );
  }

  const digits = Math.trunc(source.value).toString().split("");
  if (digits.length > 9) {
    return noSpec(
      analysis,
      "needs_review",
      issue("UNSUPPORTED_STRATEGY", "The current place-value table supports whole numbers up to 9 digits."),
    );
  }
  const names = [
    "Hundred millions",
    "Ten millions",
    "Millions",
    "Hundred thousands",
    "Ten thousands",
    "Thousands",
    "Hundreds",
    "Tens",
    "Ones",
  ].slice(9 - digits.length);

  const object: MathTableObject = {
    id: "place_value_table_1",
    type: "table",
    x: 45,
    y: 80,
    width: 630,
    height: 150,
    columns: names,
    rows: [digits],
  };

  return generated(
    input,
    analysis,
    visual(
      "table",
      `Place-value table for ${formatNumber(source.value)}`,
      { width: 720, height: 310, padding: 24, background: "paper" },
      [object],
    ),
  );
}

function generateMeasurementDiagram(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
) {
  const measurement = finiteQuantities(analysis).find(
    (quantity) =>
      ["length", "width", "height", "radius", "value"].includes(quantity.role),
  );
  if (!measurement || !finite(measurement.value) || measurement.value <= 0) {
    return noSpec(
      analysis,
      "needs_review",
      issue("MISSING_REQUIRED_QUANTITY", "A measurement diagram needs an explicit positive measurement."),
    );
  }

  const object: MathDimensionObject = {
    id: "measurement_1",
    type: "dimension",
    from: { x: 145, y: 150 },
    to: { x: 575, y: 150 },
    label: formatMeasurement(measurement.value, measurement.unit),
    offset: 0,
    extension_lines: false,
    style: { tone: "accent", stroke_width: 4 },
  };

  return generated(
    input,
    analysis,
    visual(
      "measurement",
      `Measurement of ${formatMeasurement(measurement.value, measurement.unit)}`,
      { width: 720, height: 270, padding: 28, background: "paper" },
      [object],
    ),
  );
}

function unsupported(
  analysis: MathIntelligenceAnalysis,
  strategy: MathVisualStrategy,
  message: string,
) {
  return noSpec(
    analysis,
    "needs_review",
    issue("UNSUPPORTED_STRATEGY", `${strategy}: ${message}`),
  );
}

/**
 * Phase 2D — deterministic Math Visual V2 specification generator.
 *
 * This function NEVER calls OpenAI. Luna, when needed, has already been used by
 * analyseMathQuestion() to supply a structured interpretation and approved
 * strategy. Phase 2D converts that interpretation into canonical V2 JSON using
 * Dreamscape code only.
 *
 * It is intentionally conservative: when the structured interpretation does
 * not contain enough source-supported mathematics to draw faithfully, it
 * returns needs_review rather than inventing geometry or values.
 */
export function generateMathVisualSpec(
  input: MathIntelligenceQuestionInput,
  analysis: MathIntelligenceAnalysis,
): MathVisualSpecGenerationResult {
  if (analysis.disposition === "preserve_existing") {
    return noSpec(
      analysis,
      "preserved",
      issue("PRESERVE_EXISTING", "An existing Math Visual V2 specification is preserved and is not overwritten."),
    );
  }

  if (analysis.disposition === "preserve_media" || analysis.visual_need === "prohibited" || analysis.strategy === "preserve_media") {
    return noSpec(
      analysis,
      "preserved",
      issue("PRESERVE_MEDIA", "The question depends on existing media that should not be replaced by a generated mathematical diagram."),
    );
  }

  if (analysis.disposition === "needs_review") {
    return noSpec(
      analysis,
      "needs_review",
      issue("ANALYSIS_NEEDS_REVIEW", "The Math Intelligence analysis requires human review before any visual is generated."),
    );
  }

  if (analysis.disposition === "skip" || analysis.visual_need === "unnecessary" || analysis.strategy === "none") {
    return noSpec(
      analysis,
      "skipped",
      issue("NO_GENERATION_REQUIRED", "Dreamscape determined that this question does not require a generated mathematical visual."),
    );
  }

  const quizVisualContract = buildMathQuizVisualContract(input);
  if (quizVisualContract) {
    return generateApprovedQuizContractVisual(input, analysis, quizVisualContract);
  }

  // Phase 3B: an automatically generated quiz visual must have an approved
  // source contract. Legacy strategies remain available for manual authoring
  // and the future Teaching Engine, but are not used as best-effort quiz
  // generators.
  return noSpec(
    analysis,
    "needs_review",
    issue("UNSUPPORTED_STRATEGY", "No approved Phase 3B learner-visible quiz visual contract could be built from the question source."),
  );

  /* Legacy/manual strategy implementations retained below for Teaching/manual
   * tooling. They are intentionally unreachable from automatic quiz generation.
   */
  switch (analysis.strategy) {
    case "fraction_bar":
      return generateFractionBar(input, analysis);
    case "fraction_grid":
      return generateFractionGrid(input, analysis);
    case "aligned_fraction_bars":
      return generateAlignedFractionBars(input, analysis);
    case "number_line":
      return generateNumberLine(input, analysis);
    case "rectangle_dimensions":
      return generateRectangleDimensions(input, analysis);
    case "angle_diagram":
      return generateAngleDiagram(input, analysis);
    case "cube":
      return generateCube(input, analysis);
    case "cuboid":
      return generateCuboid(input, analysis);
    case "bar_chart":
      return generateBarChart(input, analysis);
    case "pie_chart":
      return generatePieChart(input, analysis);
    case "table":
      return generateTable(input, analysis);
    case "clock":
      return generateClock(input, analysis);
    case "bar_model_comparison":
      return generateComparisonBarModel(input, analysis);
    case "bar_model_part_whole":
      return generatePartWholeBarModel(input, analysis);
    case "bar_model_ratio":
      return generateRatioBarModel(input, analysis);
    case "place_value_table":
      return generatePlaceValueTable(input, analysis);
    case "measurement_diagram":
      return generateMeasurementDiagram(input, analysis);

    // These representations need mathematical structure that the current 2B
    // interpretation schema cannot yet express without inventing coordinates,
    // topology, category x-values or ratio-unit structure.
    case "polygon_geometry":
      return unsupported(analysis, analysis.strategy, "explicit vertices/shape structure are required before deterministic generation.");
    case "symmetry_diagram":
      return unsupported(analysis, analysis.strategy, "the source shape and symmetry axis are required before deterministic generation.");
    case "solid_net":
      return unsupported(analysis, analysis.strategy, "the exact face arrangement is required before deterministic generation.");
    case "line_graph":
      return unsupported(analysis, analysis.strategy, "explicit x-values and y-values are required before deterministic generation.");
    case "mixed":
      return unsupported(analysis, analysis.strategy, "mixed visuals require an explicit multi-visual plan rather than guessed composition.");
    default:
      return unsupported(analysis, analysis.strategy, "this strategy is not generated by Phase 2D.");
  }
}
