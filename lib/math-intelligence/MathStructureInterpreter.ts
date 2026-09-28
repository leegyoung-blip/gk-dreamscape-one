import type {
  MathDomain,
  MathIntelligenceQuestionInput,
  MathInterpretationResult,
  MathProblemStructure,
  MathQuantity,
  MathStructureInterpretation,
  MathTarget,
} from "./MathIntelligenceTypes";

function sourceText(input: MathIntelligenceQuestionInput) {
  return `${input.topic} ${input.skill} ${input.instruction} ${input.prompt} ${input.explanation}`.toLocaleLowerCase();
}

function valuesFromText(text: string) {
  const values: number[] = [];
  const matches = text.matchAll(/(?<![a-z])(-?\d+(?:\.\d+)?)(?![a-z])/gi);
  for (const match of matches) {
    const value = Number(match[1]);
    if (Number.isFinite(value)) values.push(value);
  }
  return values;
}

function fractionValues(text: string) {
  const result: Array<{ numerator: number; denominator: number }> = [];
  for (const match of text.matchAll(/\b(\d+)\s*\/\s*(\d+)\b/g)) {
    const numerator = Number(match[1]);
    const denominator = Number(match[2]);
    if (Number.isInteger(numerator) && Number.isInteger(denominator) && denominator > 0) {
      result.push({ numerator, denominator });
    }
  }
  return result;
}

function timeValue(text: string) {
  const match = text.match(/\b([01]?\d|2[0-3])\s*:\s*([0-5]\d)\b/);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
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
  const forward = new RegExp(`${labelPattern}[^\\d]{0,20}(\\d+(?:\\.\\d+)?)\\s*(${unit})?`, "i");
  const backward = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${unit})?[^a-z]{0,12}${labelPattern}`, "i");
  const match = text.match(forward) || text.match(backward);
  if (!match) return null;

  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  return { value, unit: match[2] || null };
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
  if (!text.includes("rectangle") && !text.includes("rectangular")) return null;

  const length = labelledMeasurement(text, "length");
  const width = labelledMeasurement(text, "width");
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
    confidence: 0.96,
    reason_codes: ["RECTANGLE_DIMENSIONS"],
  };
}

function fractionInterpretation(input: MathIntelligenceQuestionInput): MathInterpretationResult | null {
  const text = sourceText(input);
  const fractions = fractionValues(text);
  if (fractions.length === 0) return null;

  const quantities: MathQuantity[] = [];
  fractions.forEach((fraction, index) => {
    quantities.push(quantity(`numerator_${index + 1}`, "part", fraction.numerator, "numerator"));
    quantities.push(quantity(`denominator_${index + 1}`, "total", fraction.denominator, "denominator"));
  });

  const structure: MathProblemStructure = text.includes("equivalent")
    ? "fraction_equivalence"
    : text.includes("compare") || text.includes("greater") || text.includes("smaller")
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
    confidence: 0.95,
    reason_codes: text.includes("equivalent") ? ["FRACTION_EQUIVALENCE"] : ["FRACTION_SHADED_WHOLE"],
  };
}

function clockInterpretation(input: MathIntelligenceQuestionInput): MathInterpretationResult | null {
  const text = sourceText(input);
  if (!text.includes("clock")) return null;
  const time = timeValue(text);
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
  if (!text.includes("cuboid") && !text.includes("volume")) return null;

  const length = labelledMeasurement(text, "length");
  const width = labelledMeasurement(text, "width");
  const height = labelledMeasurement(text, "height");
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

function comparisonInterpretation(input: MathIntelligenceQuestionInput): MathInterpretationResult | null {
  const text = input.prompt;
  const comparison = text.match(/\b(\d+(?:\.\d+)?)\s+(fewer|less|more|greater)\s+than\b/i);
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
    confidence: 0.88,
    reason_codes: ["WORD_PROBLEM_COMPARISON"],
  };
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
 * Phase 2B deterministic structure interpreter.
 *
 * It deliberately handles only structures we can extract with high confidence.
 * Anything else is returned unresolved so the two-level pipeline routes the
 * complete question to Luna once.
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
    comparisonInterpretation(input),
  ].filter(Boolean) as MathInterpretationResult[];

  if (candidates.length === 1) return candidates[0];

  if (candidates.length > 1) {
    const strongest = [...candidates].sort((a, b) => b.confidence - a.confidence)[0];
    if (strongest.confidence >= 0.96) return strongest;
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
