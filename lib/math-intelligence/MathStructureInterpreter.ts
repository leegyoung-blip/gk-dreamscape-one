import type {
  MathDomain,
  MathIntelligenceQuestionInput,
  MathInterpretationResult,
  MathProblemStructure,
  MathQuantity,
  MathStructureInterpretation,
  MathTarget,
} from "./MathIntelligenceTypes";
import {
  buildMathLearnerVisibleEvidence,
  mathClassificationText,
} from "./MathLearnerVisibleEvidence";
import {
  parseVisibleAdditiveComparison,
  parseVisibleDataPairs,
  parseVisibleRatioRelation,
} from "./MathSourceParsing";

function sourceText(input: MathIntelligenceQuestionInput) {
  return mathClassificationText(input);
}

function bodyText(input: MathIntelligenceQuestionInput) {
  return [input.instruction, input.prompt]
    .filter(Boolean)
    .join(" \n ")
    .toLocaleLowerCase();
}

function valuesFromText(text: string) {
  const values: number[] = [];
  const matches = text.matchAll(/(?<![a-z])(-?\d[\d,]*(?:\.\d+)?)(?![a-z])/gi);
  for (const match of matches) {
    const value = Number(match[1].replace(/,/g, ""));
    if (Number.isFinite(value)) values.push(value);
  }
  return values;
}

const SIMPLE_NUMBERS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
};

const FRACTION_DENOMINATORS: Record<string, number> = {
  half: 2,
  halves: 2,
  third: 3,
  thirds: 3,
  quarter: 4,
  quarters: 4,
  fourth: 4,
  fourths: 4,
  fifth: 5,
  fifths: 5,
  sixth: 6,
  sixths: 6,
  seventh: 7,
  sevenths: 7,
  eighth: 8,
  eighths: 8,
  ninth: 9,
  ninths: 9,
  tenth: 10,
  tenths: 10,
  twelfth: 12,
  twelfths: 12,
};

function simpleNumber(value: string) {
  const clean = value.trim().toLocaleLowerCase();
  if (/^\d+$/.test(clean)) return Number(clean);
  return SIMPLE_NUMBERS[clean] ?? null;
}

function pushFraction(
  result: Array<{ numerator: number; denominator: number }>,
  numerator: number,
  denominator: number,
) {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) return;
  if (numerator < 0 || denominator <= 0 || numerator > denominator) return;
  if (result.some((item) => item.numerator === numerator && item.denominator === denominator)) return;
  result.push({ numerator, denominator });
}

function fractionValues(text: string) {
  const result: Array<{ numerator: number; denominator: number }> = [];

  for (const match of text.matchAll(/\b(\d+)\s*\/\s*(\d+)\b/g)) {
    pushFraction(result, Number(match[1]), Number(match[2]));
  }

  const unicodeFractions: Record<string, [number, number]> = {
    "½": [1, 2],
    "⅓": [1, 3],
    "⅔": [2, 3],
    "¼": [1, 4],
    "¾": [3, 4],
    "⅕": [1, 5],
    "⅖": [2, 5],
    "⅗": [3, 5],
    "⅘": [4, 5],
    "⅙": [1, 6],
    "⅚": [5, 6],
    "⅛": [1, 8],
    "⅜": [3, 8],
    "⅝": [5, 8],
    "⅞": [7, 8],
  };
  for (const [glyph, pair] of Object.entries(unicodeFractions)) {
    if (text.includes(glyph)) pushFraction(result, pair[0], pair[1]);
  }

  for (const match of text.matchAll(/\b(\d+|[a-z]+)\s+(?:out of|of)\s+(\d+|[a-z]+)\s+(?:equal\s+)?parts?\b/gi)) {
    const numerator = simpleNumber(match[1]);
    const denominator = simpleNumber(match[2]);
    if (numerator != null && denominator != null) pushFraction(result, numerator, denominator);
  }

  const numeratorToken = "(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|\\d+)";
  const denominatorToken = "(half|halves|third|thirds|quarter|quarters|fourth|fourths|fifth|fifths|sixth|sixths|seventh|sevenths|eighth|eighths|ninth|ninths|tenth|tenths|twelfth|twelfths)";
  const wordPattern = new RegExp(`\\b${numeratorToken}\\s+${denominatorToken}\\b`, "gi");
  for (const match of text.matchAll(wordPattern)) {
    const numerator = simpleNumber(match[1]);
    const denominator = FRACTION_DENOMINATORS[match[2].toLocaleLowerCase()] ?? null;
    if (numerator != null && denominator != null) pushFraction(result, numerator, denominator);
  }

  for (const [word, denominator] of Object.entries(FRACTION_DENOMINATORS)) {
    if (["halves", "thirds", "quarters", "fourths", "fifths", "sixths", "sevenths", "eighths", "ninths", "tenths", "twelfths"].includes(word)) continue;
    const pattern = new RegExp(`\\b(?:a|one)\\s+${word}\\b`, "i");
    if (pattern.test(text)) pushFraction(result, 1, denominator);
  }

  return result;
}

function timeValue(input: MathIntelligenceQuestionInput) {
  const evidence = buildMathLearnerVisibleEvidence({
    ...input,
    options: [],
  });
  return evidence.time_candidates[0] ?? null;
}

function labelledMeasurement(text: string, label: "length" | "width" | "height" | "radius") {
  const unit = "mm|cm|m|km";
  const aliases: Record<typeof label, string[]> = {
    length: ["length", "long"],
    width: ["width", "wide", "breadth"],
    height: ["height", "high", "tall"],
    radius: ["radius"],
  };
  const labelPattern = `(?:${aliases[label].join("|")})`;
  const forward = new RegExp(`${labelPattern}[^\\d]{0,24}(\\d+(?:\\.\\d+)?)\\s*(${unit})?`, "i");
  const backward = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${unit})?[^a-z]{0,14}${labelPattern}`, "i");
  const match = text.match(forward) || text.match(backward);
  if (!match) return null;

  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  return { value, unit: match[2] || null };
}

function rectangleDimensionPair(text: string) {
  const unit = "mm|cm|m|km";
  const match = text.match(
    new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${unit})?\\s*(?:by|×|x)\\s*(\\d+(?:\\.\\d+)?)\\s*(${unit})?`, "i"),
  );
  if (!match) return null;
  const length = Number(match[1]);
  const width = Number(match[3]);
  if (!Number.isFinite(length) || !Number.isFinite(width)) return null;
  return {
    length: { value: length, unit: match[2] || match[4] || null },
    width: { value: width, unit: match[4] || match[2] || null },
  };
}

function quantity(
  id: string,
  role: MathQuantity["role"],
  value: number | null,
  label: string | null = null,
  unit: string | null = null,
): MathQuantity {
  return { id, role, value, label, unit };
}

function target(kind: MathTarget["kind"], label: string | null = null, quantityId: string | null = null): MathTarget {
  return { kind, label, quantity_id: quantityId };
}

function makeInterpretation(
  domain: MathDomain,
  problemStructure: MathProblemStructure,
  quantities: MathQuantity[],
  targetValue: MathTarget,
): MathStructureInterpretation {
  return {
    domain,
    problem_structure: problemStructure,
    quantities,
    relationships: [],
    target: targetValue,
  };
}

function directCalculation(input: MathIntelligenceQuestionInput): MathInterpretationResult | null {
  const prompt = input.prompt.toLocaleLowerCase();
  const compact = prompt.replace(/\s+/g, " ").trim();
  if (!/^[\sa-z]*(?:calculate|find|work out|evaluate|solve)?[\s\d+\-×x*÷/().,%$:=?]+$/i.test(compact)) {
    return null;
  }

  const numbers = valuesFromText(prompt);
  if (numbers.length === 0) return null;

  return {
    resolved: true,
    interpretation: makeInterpretation(
      "arithmetic",
      "direct_calculation",
      numbers.map((value, index) => quantity(`value_${index + 1}`, "known", value)),
      target("value", "answer"),
    ),
    confidence: 0.97,
    reason_codes: ["DIRECT_CALCULATION"],
  };
}

function rectangleInterpretation(input: MathIntelligenceQuestionInput): MathInterpretationResult | null {
  const text = sourceText(input);
  const visible = bodyText(input);
  if (!text.includes("rectangle") && !text.includes("rectangular")) return null;

  let length = labelledMeasurement(visible, "length");
  let width = labelledMeasurement(visible, "width");
  if (!length || !width) {
    const pair = rectangleDimensionPair(visible);
    length ||= pair?.length ?? null;
    width ||= pair?.width ?? null;
  }
  if (!length || !width) return null;

  const structure: MathProblemStructure = text.includes("perimeter") ? "perimeter" : "area";
  return {
    resolved: true,
    interpretation: {
      domain: "geometry",
      problem_structure: structure,
      quantities: [
        quantity("length", "length", length.value, "length", length.unit),
        quantity("width", "width", width.value, "width", width.unit || length.unit),
      ],
      relationships: [],
      target: target(structure === "area" ? "area" : "perimeter", structure),
    },
    confidence: 0.97,
    reason_codes: ["RECTANGLE_DIMENSIONS"],
  };
}

function fractionInterpretation(input: MathIntelligenceQuestionInput): MathInterpretationResult | null {
  const text = sourceText(input);
  // Do not use MCQ option fractions to construct the prompt visual: an answer
  // choice must not become diagram source data.
  const visible = bodyText(input);
  const fractions = fractionValues(visible);
  if (fractions.length === 0) return null;

  const quantities: MathQuantity[] = [];
  fractions.forEach((fraction, index) => {
    quantities.push(quantity(`numerator_${index + 1}`, "part", fraction.numerator, "numerator"));
    quantities.push(quantity(`denominator_${index + 1}`, "total", fraction.denominator, "denominator"));
  });

  const structure: MathProblemStructure = text.includes("equivalent") || text.includes("same fraction")
    ? "fraction_equivalence"
    : text.includes("compare") || text.includes("greater") || text.includes("smaller") || text.includes("larger")
      ? "fraction_comparison"
      : "fraction_of_whole";

  return {
    resolved: true,
    interpretation: makeInterpretation(
      "fractions",
      structure,
      quantities,
      target("fraction", "fraction"),
    ),
    confidence: 0.96,
    reason_codes: structure === "fraction_equivalence" ? ["FRACTION_EQUIVALENCE"] : ["FRACTION_SHADED_WHOLE"],
  };
}

function clockInterpretation(input: MathIntelligenceQuestionInput): MathInterpretationResult | null {
  const text = sourceText(input);
  if (!text.includes("clock") && !text.includes("time")) return null;
  const time = timeValue(input);
  if (!time) return null;

  return {
    resolved: true,
    interpretation: makeInterpretation(
      "time",
      "time_reading",
      [
        quantity("hour", "time", time.hour, "hour"),
        quantity("minute", "time", time.minute, "minute"),
      ],
      target("time", "time"),
    ),
    confidence: 0.97,
    reason_codes: ["CLOCK_REPRESENTATION"],
  };
}

function cuboidInterpretation(input: MathIntelligenceQuestionInput): MathInterpretationResult | null {
  const text = sourceText(input);
  const visible = bodyText(input);
  if (!text.includes("cuboid") && !text.includes("volume")) return null;

  const length = labelledMeasurement(visible, "length");
  const width = labelledMeasurement(visible, "width");
  const height = labelledMeasurement(visible, "height");
  if (!length || !width || !height) return null;

  return {
    resolved: true,
    interpretation: makeInterpretation(
      "solid_geometry",
      "volume",
      [
        quantity("length", "length", length.value, "length", length.unit),
        quantity("width", "width", width.value, "width", width.unit || length.unit),
        quantity("height", "height", height.value, "height", height.unit || length.unit),
      ],
      target("volume", "volume"),
    ),
    confidence: 0.95,
    reason_codes: ["SOLID_REQUIRED"],
  };
}

function cubeInterpretation(input: MathIntelligenceQuestionInput): MathInterpretationResult | null {
  const text = sourceText(input);
  const visible = bodyText(input);
  if (!text.includes("cube") || text.includes("cuboid")) return null;
  const match = visible.match(/(?:edge|side)(?:\s+length)?[^\d]{0,20}(\d+(?:\.\d+)?)\s*(mm|cm|m|km)?/i)
    || visible.match(/(\d+(?:\.\d+)?)\s*(mm|cm|m|km)?[^a-z]{0,12}(?:edge|side)/i);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return {
    resolved: true,
    interpretation: makeInterpretation(
      "solid_geometry",
      text.includes("volume") ? "volume" : "shape_properties",
      [quantity("side", "length", value, "side", match[2] || null)],
      target(text.includes("volume") ? "volume" : "length", text.includes("volume") ? "volume" : "side"),
    ),
    confidence: 0.94,
    reason_codes: ["SOLID_REQUIRED"],
  };
}

function comparisonInterpretation(input: MathIntelligenceQuestionInput): MathInterpretationResult | null {
  const parsed = parseVisibleAdditiveComparison(input.prompt);
  if (parsed) {
    const knownHasValue = parsed.left_value != null && Number.isFinite(parsed.left_value);
    const leftLabel = parsed.left_label || "first quantity";
    const rightLabel = parsed.right_label || "second quantity";

    // The generator expresses relationship.type from the unknown quantity's
    // perspective. When the left source quantity is known, the right side is
    // the unknown; otherwise the left side becomes the unknown and the right
    // side is a source-labelled anchor with an unknown value.
    const known = knownHasValue
      ? quantity("known_quantity", "known", parsed.left_value, leftLabel, parsed.left_value_unit || parsed.unit)
      : quantity("known_quantity", "known", null, rightLabel, parsed.unit);
    const unknown = knownHasValue
      ? quantity("unknown_quantity", "unknown", null, rightLabel, parsed.unit)
      : quantity("unknown_quantity", "unknown", null, leftLabel, parsed.unit);

    const unknownIsLarger = knownHasValue ? !parsed.left_is_larger : parsed.left_is_larger;
    return {
      resolved: true,
      interpretation: {
        domain: parsed.unit === "sgd" || parsed.unit === "cent"
          ? "money"
          : parsed.unit
            ? "measurement"
            : "word_problem",
        problem_structure: "comparison",
        quantities: [
          known,
          quantity("difference", "difference", parsed.difference, "difference", parsed.unit),
          unknown,
        ],
        relationships: [
          {
            type: unknownIsLarger ? "greater_than" : "less_than",
            left_id: "unknown_quantity",
            right_id: "known_quantity",
            value: parsed.difference,
            unit: parsed.unit,
          },
        ],
        target: target("quantity", unknown.label, "unknown_quantity"),
      },
      confidence: knownHasValue ? 0.97 : 0.93,
      reason_codes: ["WORD_PROBLEM_COMPARISON"],
    };
  }

  // Backward-compatible fallback for compact wording where entity labels are
  // difficult to isolate but the difference and one source value are explicit.
  const text = input.prompt;
  const comparison = text.match(/\b(\d+(?:\.\d+)?)\s+(fewer|less|more|greater)(?:\s+[a-z]+){0,4}\s+than\b/i);
  const values = valuesFromText(text);
  if (!comparison || values.length < 2) return null;

  const difference = Number(comparison[1]);
  const baseValue = values.find((value) => value !== difference) ?? null;
  if (baseValue == null) return null;

  return {
    resolved: true,
    interpretation: {
      domain: "word_problem",
      problem_structure: "comparison",
      quantities: [
        quantity("known_quantity", "known", baseValue, "known quantity"),
        quantity("difference", "difference", difference, "difference"),
        quantity("unknown_quantity", "unknown", null, "unknown quantity"),
      ],
      relationships: [
        {
          type: comparison[2].toLocaleLowerCase() === "more" || comparison[2].toLocaleLowerCase() === "greater"
            ? "greater_than"
            : "less_than",
          left_id: "unknown_quantity",
          right_id: "known_quantity",
          value: difference,
          unit: null,
        },
      ],
      target: target("quantity", "unknown quantity", "unknown_quantity"),
    },
    confidence: 0.9,
    reason_codes: ["WORD_PROBLEM_COMPARISON"],
  };
}

function explicitTotalValue(text: string) {
  const before = text.match(/\b(\d[\d,]*(?:\.\d+)?)\b[^.!?]{0,32}\b(?:altogether|in total|total(?: number| of)?)\b/i);
  if (before) return Number(before[1].replace(/,/g, ""));
  const after = text.match(/\b(?:altogether|in total|total(?: number| of)?)\b[^\d]{0,24}(\d[\d,]*(?:\.\d+)?)/i);
  if (after) return Number(after[1].replace(/,/g, ""));
  return null;
}

function partWholeInterpretation(input: MathIntelligenceQuestionInput): MathInterpretationResult | null {
  const text = input.prompt.toLocaleLowerCase();
  if (!/(?:altogether|in total|total number|total of)/i.test(text)) return null;
  const values = valuesFromText(text);
  if (values.length < 2 || values.length > 6) return null;

  const explicitTotal = explicitTotalValue(text);
  if (explicitTotal != null && Number.isFinite(explicitTotal)) {
    const knownParts = values.filter((value, index) => {
      const totalIndex = values.findIndex((candidate) => candidate === explicitTotal);
      return index !== totalIndex;
    });
    if (knownParts.length < 1) return null;
    const quantities = [
      quantity("total", "total", explicitTotal, "total"),
      ...knownParts.slice(0, 4).map((value, index) => quantity(`part_${index + 1}`, "part", value, `part ${index + 1}`)),
      quantity("unknown_part", "unknown", null, "unknown part"),
    ];
    return {
      resolved: true,
      interpretation: {
        domain: "word_problem",
        problem_structure: "part_whole",
        quantities,
        relationships: [{
          type: "part_of",
          left_id: "unknown_part",
          right_id: "total",
          value: null,
          unit: null,
        }],
        target: target("quantity", "unknown part", "unknown_part"),
      },
      confidence: 0.86,
      reason_codes: ["WORD_PROBLEM_PART_WHOLE"],
    };
  }

  // If the question explicitly asks for the total, all visible source numbers
  // are safe known parts and the whole remains unknown.
  if (/(?:how many|how much|what is)[^?]{0,60}(?:altogether|in total|total)/i.test(text) || /(?:altogether|in total)\??\s*$/i.test(text)) {
    return {
      resolved: true,
      interpretation: {
        domain: "word_problem",
        problem_structure: "part_whole",
        quantities: [
          ...values.slice(0, 5).map((value, index) => quantity(`part_${index + 1}`, "part", value, `part ${index + 1}`)),
          quantity("total", "total", null, "total"),
        ],
        relationships: [{
          type: "sum",
          left_id: values.length > 0 ? "part_1" : null,
          right_id: "total",
          value: null,
          unit: null,
        }],
        target: target("quantity", "total", "total"),
      },
      confidence: 0.84,
      reason_codes: ["WORD_PROBLEM_PART_WHOLE"],
    };
  }

  return null;
}

function ratioInterpretation(input: MathIntelligenceQuestionInput): MathInterpretationResult | null {
  const text = bodyText(input);
  const parsed = parseVisibleRatioRelation(text);
  if (!parsed) return null;

  if (
    !Number.isInteger(parsed.left_units) ||
    !Number.isInteger(parsed.right_units) ||
    parsed.left_units <= 0 ||
    parsed.right_units <= 0
  ) return null;

  return {
    resolved: true,
    interpretation: {
      domain: "ratio",
      problem_structure: "ratio_relationship",
      quantities: [
        quantity("ratio_a", "factor", parsed.left_units, parsed.left_label),
        quantity("ratio_b", "factor", parsed.right_units, parsed.right_label),
      ],
      relationships: [{
        type: "ratio",
        left_id: "ratio_a",
        right_id: "ratio_b",
        value: null,
        unit: null,
      }],
      target: target("relationship", "ratio"),
    },
    confidence: 0.97,
    reason_codes: ["WORD_PROBLEM_RATIO"],
  };
}

function numberLineInterpretation(input: MathIntelligenceQuestionInput): MathInterpretationResult | null {
  const text = bodyText(input);
  if (!text.includes("number line")) return null;

  const range = text.match(/\b(?:from|between)\s+(-?\d+(?:\.\d+)?)\s+(?:to|and)\s+(-?\d+(?:\.\d+)?)/i);
  if (!range) return null;
  const min = Number(range[1]);
  const max = Number(range[2]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return null;

  const quantities: MathQuantity[] = [
    quantity("line_min", "known", Math.min(min, max), "minimum"),
    quantity("line_max", "known", Math.max(min, max), "maximum"),
  ];
  const step = text.match(/\b(?:steps?|intervals?)\s+(?:of\s+)?(\d+(?:\.\d+)?)/i);
  if (step) quantities.push(quantity("line_step", "known", Number(step[1]), "interval"));

  const targetMatch = text.match(/\b(?:mark|locate|plot|show)\s+(?:the\s+number\s+)?(-?\d+(?:\.\d+)?)/i);
  let targetValueId: string | null = null;
  if (targetMatch) {
    const value = Number(targetMatch[1]);
    if (Number.isFinite(value) && value >= Math.min(min, max) && value <= Math.max(min, max)) {
      targetValueId = "target_value";
      quantities.push(quantity(targetValueId, "value", value, "target"));
    }
  }

  return {
    resolved: true,
    interpretation: makeInterpretation(
      "whole_numbers",
      "sequence_or_position",
      quantities,
      target("value", targetValueId ? "target" : "number line", targetValueId),
    ),
    confidence: 0.95,
    reason_codes: ["NUMBER_LINE_LANGUAGE"],
  };
}

function dataInterpretation(input: MathIntelligenceQuestionInput): MathInterpretationResult | null {
  const text = bodyText(input);
  const source = sourceText(input);
  const pairs = parseVisibleDataPairs(text);
  if (pairs.length < 2) return null;

  const strategyText = source.includes("bar chart") || source.includes("bar graph")
    ? "bar"
    : source.includes("table") || /\bfollowing amounts\b|\bsaved the following\b/i.test(text)
      ? "table"
      : null;
  if (!strategyText) return null;

  return {
    resolved: true,
    interpretation: makeInterpretation(
      "data",
      "data_reading",
      pairs.slice(0, 12).map((pair, index) =>
        quantity(`datum_${index + 1}`, "count", pair.value, pair.label, pair.unit),
      ),
      target("category_value", strategyText === "bar" ? "bar chart" : "table"),
    ),
    confidence: 0.97,
    reason_codes: [strategyText === "bar" ? "DATA_REQUIRED" : "TABLE_REQUIRED"],
  };
}

function directAngleInterpretation(input: MathIntelligenceQuestionInput): MathInterpretationResult | null {
  const text = bodyText(input);
  const source = sourceText(input);
  if (!containsAny(source, ["angle", "degrees", "°"])) return null;
  if (/\b(find|calculate|work out)\b[^?]{0,30}\b(angle|x)\b/i.test(text) || /\bunknown angle\b/i.test(text)) return null;
  if (!/(?:draw|construct|show|angle measures|angle of)/i.test(text)) return null;
  const match = text.match(/\b(\d+(?:\.\d+)?)\s*(?:°|degrees?)\b/i);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0 || value > 180) return null;
  return {
    resolved: true,
    interpretation: makeInterpretation(
      "geometry",
      "angle",
      [quantity("angle", "angle", value, "angle", "deg")],
      target("angle", "angle", "angle"),
    ),
    confidence: 0.95,
    reason_codes: ["ANGLE_REQUIRED"],
  };
}

function containsAny(source: string, values: string[]) {
  return values.some((value) => source.includes(value));
}

function inferDomain(input: MathIntelligenceQuestionInput): MathDomain {
  const text = sourceText(input);
  if (text.includes("fraction")) return "fractions";
  if (text.includes("percentage") || text.includes("percent")) return "percentage";
  if (text.includes("ratio")) return "ratio";
  if (text.includes("speed")) return "speed";
  if (text.includes("rate")) return "rate";
  if (text.includes("algebra")) return "algebra";
  if (/(triangle|quadrilateral|rectangle|angle|perimeter|area|symmetry)/.test(text)) return "geometry";
  if (/(cube|cuboid|volume|net)/.test(text)) return "solid_geometry";
  if (/(clock|time)/.test(text)) return "time";
  if (/(graph|chart|table|pictogram)/.test(text)) return "data";
  if (/(length|mass|capacity|measurement|unit)/.test(text)) return "measurement";
  if (/(money|dollar|cent|sgd)/.test(text)) return "money";
  if (input.prompt.length > 80) return "word_problem";
  return "unknown";
}

/**
 * Phase 2I coverage expansion pass 2 deterministic structure interpreter.
 *
 * This remains intentionally source-bound: it extracts only mathematics that
 * is explicit in instruction/prompt text. Correct answers and explanations are
 * never used to complete a missing diagram.
 */
export function interpretMathStructureWithRules(
  input: MathIntelligenceQuestionInput,
): MathInterpretationResult {
  const candidates = [
    directCalculation(input),
    rectangleInterpretation(input),
    fractionInterpretation(input),
    clockInterpretation(input),
    cuboidInterpretation(input),
    cubeInterpretation(input),
    comparisonInterpretation(input),
    partWholeInterpretation(input),
    ratioInterpretation(input),
    numberLineInterpretation(input),
    dataInterpretation(input),
    directAngleInterpretation(input),
  ].filter(Boolean) as MathInterpretationResult[];

  if (candidates.length === 1) return candidates[0];

  if (candidates.length > 1) {
    const strongest = [...candidates].sort((a, b) => b.confidence - a.confidence)[0];
    const second = [...candidates].sort((a, b) => b.confidence - a.confidence)[1];
    if (strongest.confidence >= 0.96 && strongest.confidence - second.confidence >= 0.01) {
      return strongest;
    }
    if (strongest.confidence >= 0.97) return strongest;
  }

  return {
    resolved: false,
    interpretation: {
      domain: inferDomain(input),
      problem_structure: "unknown",
      quantities: [],
      relationships: [],
      target: target("unknown"),
    },
    confidence: 0.45,
    reason_codes: ["INSUFFICIENT_STRUCTURED_DATA"],
  };
}
