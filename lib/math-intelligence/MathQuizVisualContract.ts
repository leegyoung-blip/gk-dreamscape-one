import type {
  MathIntelligenceQuestionInput,
  MathStructureInterpretation,
  MathVisualStrategy,
} from "./MathIntelligenceTypes";
import { parseVisibleDataPairs } from "./MathSourceParsing";

export const MATH_QUIZ_VISUAL_CONTRACT_VERSION = "3B.1" as const;

export type MathQuizVisualColourTone =
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "brown"
  | "purple"
  | "orange"
  | null;

export type MathQuizFractionRegionContract = {
  version: typeof MATH_QUIZ_VISUAL_CONTRACT_VERSION;
  kind: "fraction_region";
  strategy: "fraction_bar" | "fraction_grid";
  total_parts: number;
  shaded_parts: number;
  unshaded_parts: number;
  target_state: "shaded" | "unshaded";
  representation: "bar" | "grid";
};

export type MathQuizDataContract = {
  version: typeof MATH_QUIZ_VISUAL_CONTRACT_VERSION;
  kind: "data_series";
  strategy: "bar_chart" | "table";
  data: Array<{
    id: string;
    label: string;
    value: number;
    unit: string | null;
    tone: MathQuizVisualColourTone;
  }>;
  unit: string | null;
};

export type MathQuizSquareGridContract = {
  version: typeof MATH_QUIZ_VISUAL_CONTRACT_VERSION;
  kind: "square_grid";
  strategy: "polygon_geometry";
  rows: number;
  columns: number;
  target_square_rows: number | null;
  target_square_columns: number | null;
};

export type MathQuizVisualContract =
  | MathQuizFractionRegionContract
  | MathQuizDataContract
  | MathQuizSquareGridContract;

function promptText(input: MathIntelligenceQuestionInput) {
  // Contracts are deliberately built only from learner-visible question wording.
  // Correct answers and explanations are never consulted.
  return [input.instruction, input.prompt]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanInteger(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function cleanCategoryLabel(label: string) {
  return label
    .replace(/^\s*(?:and|or)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function colourTone(label: string): MathQuizVisualColourTone {
  const clean = label.toLocaleLowerCase().trim();
  const firstWord = clean.split(/\s+/)[0];
  if (["red", "blue", "green", "yellow", "brown", "purple", "orange"].includes(firstWord)) {
    return firstWord as Exclude<MathQuizVisualColourTone, null>;
  }
  return null;
}

function parseFractionRegionContract(
  input: MathIntelligenceQuestionInput,
): MathQuizFractionRegionContract | null {
  const source = promptText(input);
  const totalMatch = source.match(/\b(\d+)\s+equal\s+parts?\b/i);
  const total = cleanInteger(totalMatch?.[1]);
  if (!total || total > 100) return null;

  const shadedMatch = source.match(/\b(\d+)\s+(?:of\s+them\s+)?(?:are\s+)?shaded\b/i);
  const unshadedMatch = source.match(/\b(\d+)\s+(?:of\s+them\s+)?(?:are\s+)?unshaded\b/i);
  const statedShaded = cleanInteger(shadedMatch?.[1]);
  const statedUnshaded = cleanInteger(unshadedMatch?.[1]);

  if (statedShaded == null && statedUnshaded == null) return null;
  if (statedShaded != null && statedShaded > total) return null;
  if (statedUnshaded != null && statedUnshaded > total) return null;
  if (statedShaded != null && statedUnshaded != null && statedShaded + statedUnshaded !== total) {
    return null;
  }

  const shaded = statedShaded ?? total - (statedUnshaded as number);
  const unshaded = statedUnshaded ?? total - (statedShaded as number);
  if (shaded < 0 || unshaded < 0 || shaded + unshaded !== total) return null;

  const asksShaded = /\bwhat\s+fraction\b[^.!?]{0,60}\bshaded\b/i.test(source) ||
    /\bfraction\s+(?:is|are)\s+shaded\b/i.test(source);
  const asksUnshaded = /\bwhat\s+fraction\b[^.!?]{0,60}\bunshaded\b/i.test(source) ||
    /\bfraction\s+(?:is|are)\s+unshaded\b/i.test(source);
  if (!asksShaded && !asksUnshaded) return null;

  const representation = /\b(?:grid|cells?|squares?)\b/i.test(source) ? "grid" : "bar";

  return {
    version: MATH_QUIZ_VISUAL_CONTRACT_VERSION,
    kind: "fraction_region",
    strategy: representation === "grid" ? "fraction_grid" : "fraction_bar",
    total_parts: total,
    shaded_parts: shaded,
    unshaded_parts: unshaded,
    target_state: asksUnshaded ? "unshaded" : "shaded",
    representation,
  };
}

function parseDataContract(
  input: MathIntelligenceQuestionInput,
): MathQuizDataContract | null {
  const source = promptText(input);
  const chartMatch = /\bbar\s+(?:graph|chart)\b/i.test(source);
  const tableMatch = /\btable\b/i.test(source);
  if (!chartMatch && !tableMatch) return null;

  const pairs = parseVisibleDataPairs(source);
  if (pairs.length < 2 || pairs.length > 12) return null;

  const units = [...new Set(pairs.map((pair) => pair.unit).filter(Boolean))];
  if (units.length > 1) return null;

  const data = pairs.map((pair, index) => {
    const label = cleanCategoryLabel(pair.label);
    return {
      id: `datum_${index + 1}`,
      label,
      value: pair.value,
      unit: pair.unit,
      tone: colourTone(label),
    };
  });

  return {
    version: MATH_QUIZ_VISUAL_CONTRACT_VERSION,
    kind: "data_series",
    strategy: chartMatch ? "bar_chart" : "table",
    data,
    unit: units[0] || null,
  };
}

function parseSquareGridContract(
  input: MathIntelligenceQuestionInput,
): MathQuizSquareGridContract | null {
  const source = promptText(input);
  if (!/\b(?:grid|unit squares?|square grid)\b/i.test(source)) return null;
  if (!/\b(?:how many|count|different|including the large|including larger)\b/i.test(source)) return null;

  let rows: number | null = null;
  let columns: number | null = null;

  const columnsRows = source.match(/\b(?:grid\s+)?with\s+(\d+)\s+columns?\s+and\s+(\d+)\s+rows?\b/i) ||
    source.match(/\b(\d+)\s+columns?\s+and\s+(\d+)\s+rows?\s+of\s+unit\s+squares?\b/i);
  if (columnsRows) {
    columns = cleanInteger(columnsRows[1]);
    rows = cleanInteger(columnsRows[2]);
  }

  if (rows == null || columns == null) {
    const byGrid = source.match(/\b(?:a\s+)?(\d+)\s*(?:by|×|x)\s*(\d+)\s+(?:square\s+)?grid\b/i);
    if (byGrid) {
      rows = cleanInteger(byGrid[1]);
      columns = cleanInteger(byGrid[2]);
    }
  }

  if (!rows || !columns || rows > 12 || columns > 12) return null;

  const target = source.match(/\b(\d+)\s*(?:by|×|x)\s*(\d+)\s+squares?\b/i);
  const targetRows = cleanInteger(target?.[1]);
  const targetColumns = cleanInteger(target?.[2]);

  return {
    version: MATH_QUIZ_VISUAL_CONTRACT_VERSION,
    kind: "square_grid",
    strategy: "polygon_geometry",
    rows,
    columns,
    target_square_rows: targetRows && targetRows <= rows ? targetRows : null,
    target_square_columns: targetColumns && targetColumns <= columns ? targetColumns : null,
  };
}

/**
 * Phase 3B source contract.
 *
 * Automatic quiz generation is intentionally limited to three tightly
 * specified visual tasks approved for DREAMSCAPE:
 * 1. shaded/unshaded fraction interpretation;
 * 2. explicit bar-chart/table reading with all data written in the prompt;
 * 3. constructible rectangular square-grid counting.
 *
 * If the learner-visible source does not fully determine one of these
 * contracts, the automatic quiz generator must not draw anything.
 */
export function buildMathQuizVisualContract(
  input: MathIntelligenceQuestionInput,
): MathQuizVisualContract | null {
  return (
    parseFractionRegionContract(input) ||
    parseDataContract(input) ||
    parseSquareGridContract(input)
  );
}

export function interpretationFromMathQuizVisualContract(
  contract: MathQuizVisualContract,
): MathStructureInterpretation {
  if (contract.kind === "fraction_region") {
    return {
      domain: "fractions",
      problem_structure: "fraction_of_whole",
      quantities: [
        { id: "total", label: "equal parts", value: contract.total_parts, unit: null, role: "total" },
        { id: "shaded", label: "shaded parts", value: contract.shaded_parts, unit: null, role: "part" },
        { id: "unshaded", label: "unshaded parts", value: contract.unshaded_parts, unit: null, role: "part" },
      ],
      relationships: [
        { type: "sum", left_id: "shaded", right_id: "unshaded", value: contract.total_parts, unit: null },
      ],
      target: {
        kind: "fraction",
        label: `${contract.target_state} fraction`,
        quantity_id: contract.target_state,
      },
    };
  }

  if (contract.kind === "data_series") {
    return {
      domain: "data",
      problem_structure: "data_reading",
      quantities: contract.data.map((datum) => ({
        id: datum.id,
        label: datum.label,
        value: datum.value,
        unit: datum.unit,
        role: "value" as const,
      })),
      relationships: [],
      target: { kind: "category_value", label: null, quantity_id: null },
    };
  }

  return {
    domain: "geometry",
    problem_structure: "shape_properties",
    quantities: [
      { id: "grid_rows", label: "rows", value: contract.rows, unit: null, role: "count" },
      { id: "grid_columns", label: "columns", value: contract.columns, unit: null, role: "count" },
    ],
    relationships: [],
    target: { kind: "quantity", label: "square count", quantity_id: null },
  };
}

export function strategyFromMathQuizVisualContract(
  contract: MathQuizVisualContract,
): MathVisualStrategy {
  return contract.strategy;
}
