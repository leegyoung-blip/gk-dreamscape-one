import type {
  CurriculumContext,
  MathematicalDomain,
  MathematicalRelationship,
  ProblemStructure,
  RequiredReasoning,
} from "../types";

import {
  lower,
  unique,
} from "./text";

export type StructureAnalysis = {
  problemStructure: ProblemStructure;
  requiredReasoning: RequiredReasoning[];
  relationships: MathematicalRelationship[];
  computedAnswer: string | null;
  confidence: number;
  reasonCode: string;
};

const NUMBER_WORDS: Record<string, number> = {
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
};

function relationship(
  type: MathematicalRelationship["type"],
  sourceText: string,
  confidence: number,
  expression: string | null = null,
): MathematicalRelationship {
  return {
    id: "r1",
    type,
    left: null,
    right: null,
    expression,
    sourceText,
    confidence,
  };
}

function parseNumeric(
  raw: string,
): number | null {
  const value = Number(
    raw.replace(/,/g, "").trim(),
  );

  return Number.isFinite(value)
    ? value
    : null;
}

function formatNumber(
  value: number,
): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return String(
    Number(value.toFixed(10)),
  );
}

function simpleExpression(
  text: string,
):
  | {
      left: number;
      right: number;
      operator: "+" | "-" | "×" | "÷";
      answer: number | null;
      reasoning: RequiredReasoning;
      relation:
        | "sum"
        | "difference"
        | "product"
        | "quotient";
      expression: string;
    }
  | null {
  const normalized = text
    .replace(/\bx\b/gi, "×")
    .replace(/\*/g, "×");

  const match = normalized.match(
    /(-?\d[\d,]*(?:\.\d+)?)\s*([+\-×÷])\s*(-?\d[\d,]*(?:\.\d+)?)(?:\s*=\s*)?(?:\?|$|[.!])/,
  );

  if (!match) return null;

  const left = parseNumeric(match[1]);
  const right = parseNumeric(match[3]);

  if (
    left === null ||
    right === null
  ) {
    return null;
  }

  const operator =
    match[2] as "+" | "-" | "×" | "÷";

  if (operator === "+") {
    return {
      left,
      right,
      operator,
      answer: left + right,
      reasoning: "addition",
      relation: "sum",
      expression: `${left} + ${right}`,
    };
  }

  if (operator === "-") {
    return {
      left,
      right,
      operator,
      answer: left - right,
      reasoning: "subtraction",
      relation: "difference",
      expression: `${left} - ${right}`,
    };
  }

  if (operator === "×") {
    return {
      left,
      right,
      operator,
      answer: left * right,
      reasoning: "multiplication",
      relation: "product",
      expression: `${left} × ${right}`,
    };
  }

  return {
    left,
    right,
    operator,
    answer:
      right === 0
        ? null
        : left / right,
    reasoning: "division",
    relation: "quotient",
    expression: `${left} ÷ ${right}`,
  };
}

function numericTokens(
  text: string,
): number[] {
  return Array.from(
    text.matchAll(
      /\b\d[\d,]*(?:\.\d+)?\b/g,
    ),
  )
    .map((match) =>
      parseNumeric(match[0]),
    )
    .filter(
      (value): value is number =>
        value !== null,
    );
}

function parseMoneyCents(
  text: string,
): number[] {
  const cents: number[] = [];

  for (
    const match of text.matchAll(
      /\$\s*(\d[\d,]*(?:\.\d+)?)/g,
    )
  ) {
    const value = parseNumeric(match[1]);
    if (value !== null) {
      cents.push(
        Math.round(value * 100),
      );
    }
  }

  for (
    const match of text.matchAll(
      /\b(\d[\d,]*(?:\.\d+)?)\s*¢/g,
    )
  ) {
    const value = parseNumeric(match[1]);
    if (value !== null) {
      cents.push(Math.round(value));
    }
  }

  return cents;
}

function wordMultiplierBefore(
  text: string,
  index: number,
): number {
  const before = text
    .slice(
      Math.max(0, index - 25),
      index,
    )
    .toLowerCase();

  const match = before.match(
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)\s*$/,
  );

  if (!match) return 1;

  const raw = match[1];

  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }

  return NUMBER_WORDS[raw] ?? 1;
}

function moneyInventoryTotal(
  text: string,
): number | null {
  let total = 0;
  let found = false;

  for (
    const match of text.matchAll(
      /\$\s*(\d[\d,]*(?:\.\d+)?)/g,
    )
  ) {
    const value = parseNumeric(match[1]);
    if (value === null) continue;

    const multiplier =
      wordMultiplierBefore(
        text,
        match.index ?? 0,
      );

    total +=
      Math.round(value * 100) *
      multiplier;
    found = true;
  }

  for (
    const match of text.matchAll(
      /\b(\d[\d,]*(?:\.\d+)?)\s*¢/g,
    )
  ) {
    const value = parseNumeric(match[1]);
    if (value === null) continue;

    const multiplier =
      wordMultiplierBefore(
        text,
        match.index ?? 0,
      );

    total +=
      Math.round(value) *
      multiplier;
    found = true;
  }

  return found ? total : null;
}

function formatCents(
  cents: number,
): string {
  if (cents % 100 === 0) {
    return `$${cents / 100}`;
  }

  if (cents < 100) {
    return `${cents}¢`;
  }

  return `$${(cents / 100).toFixed(2)}`;
}

function patternAnswer(
  text: string,
): number | null {
  const sequenceMatch = text.match(
    /(?:next|sequence|pattern).*?((?:-?\d[\d,]*(?:\.\d+)?\s*,\s*){2,}-?\d[\d,]*(?:\.\d+)?)/i,
  );

  const listRaw =
    sequenceMatch?.[1] ??
    text.match(
      /((?:-?\d[\d,]*(?:\.\d+)?\s*,\s*){2,}-?\d[\d,]*(?:\.\d+)?)(?:\s*,?\s*__|\s*,?\s*\?)/,
    )?.[1];

  if (!listRaw) return null;

  const values = listRaw
    .split(",")
    .map((part) =>
      parseNumeric(part),
    )
    .filter(
      (value): value is number =>
        value !== null,
    );

  if (values.length < 3) {
    return null;
  }

  const diffs = values
    .slice(1)
    .map(
      (value, index) =>
        value - values[index],
    );

  if (
    diffs.every(
      (diff) => diff === diffs[0],
    )
  ) {
    return (
      values[values.length - 1] +
      diffs[0]
    );
  }

  const secondDiffs = diffs
    .slice(1)
    .map(
      (value, index) =>
        value - diffs[index],
    );

  if (
    secondDiffs.length > 0 &&
    secondDiffs.every(
      (diff) =>
        diff === secondDiffs[0],
    )
  ) {
    const nextDiff =
      diffs[diffs.length - 1] +
      secondDiffs[0];

    return (
      values[values.length - 1] +
      nextDiff
    );
  }

  return null;
}

function equationAnalysis(
  text: string,
): StructureAnalysis | null {
  const t = lower(text);

  const hasUnknownSymbol =
    /[□★△○◇]|(?:\bmissing number\b)|(?:\bunknown\b)|(?:\b[A-Z]\b\s*[+\-×÷=])/i.test(
      text,
    );

  const hasEquation =
    /=/.test(text);

  if (
    !hasEquation ||
    !hasUnknownSymbol
  ) {
    return null;
  }

  let computedAnswer: string | null =
    null;

  const normalized = text
    .replace(/[★△○◇]/g, "□")
    .replace(/\bx\b/gi, "×");

  const simple = normalized.match(
    /(\d+(?:\.\d+)?)\s*×\s*□\s*\+\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  );

  if (simple) {
    const a = Number(simple[1]);
    const b = Number(simple[2]);
    const c = Number(simple[3]);

    if (a !== 0) {
      computedAnswer = formatNumber(
        (c - b) / a,
      );
    }
  }

  const simpleAdd = normalized.match(
    /□\s*\+\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/,
  );

  if (
    !computedAnswer &&
    simpleAdd
  ) {
    computedAnswer = formatNumber(
      Number(simpleAdd[2]) -
        Number(simpleAdd[1]),
    );
  }

  return {
    problemStructure:
      "missing_number_equation",
    requiredReasoning: [
      "equation_solving",
      "working_backwards",
    ],
    relationships: [
      relationship(
        "equals",
        text,
        0.97,
        normalized.match(
          /[^.!?]*=[^.!?]*/,
        )?.[0] ?? null,
      ),
    ],
    computedAnswer,
    confidence: 0.97,
    reasonCode:
      "STRUCTURE_MISSING_NUMBER_EQUATION",
  };
}

function variableExpressionAnalysis(
  text: string,
): StructureAnalysis | null {
  const t = lower(text);

  if (
    /\bsimplify\b/.test(t) &&
    /[a-z]/i.test(
      text.replace(
        /choose|correct|answer|simplify/gi,
        "",
      ),
    )
  ) {
    return {
      problemStructure: "operation_chain",
      requiredReasoning: [
        "algebraic_simplification",
        "multiplication",
        "addition",
        "subtraction",
      ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.95,
      reasonCode:
        "STRUCTURE_ALGEBRAIC_SIMPLIFICATION",
    };
  }

  return null;
}

function moneyAnalysis(
  text: string,
): StructureAnalysis {
  const t = lower(text);

  if (
    /\bhow many\b.*\bcoins?\b/.test(t) &&
    /\bworth\b|\bvalue\b|\baltogether\b|\btotal\b/.test(t)
  ) {
    return {
      problemStructure:
        "money_combination",
      requiredReasoning: [
        "money_calculation",
        "equation_solving",
        "multiplication",
        "addition",
      ],
      relationships: [
        relationship(
          "sum",
          text,
          0.94,
        ),
      ],
      computedAnswer: null,
      confidence: 0.94,
      reasonCode:
        "STRUCTURE_MONEY_UNKNOWN_COIN_COUNT",
    };
  }

  if (
    /\bchange\b/.test(t) &&
    /\bpaid\b|\bgave\b|\btendered\b/.test(
      t,
    )
  ) {
    return {
      problemStructure: "money_change",
      requiredReasoning: [
        "money_calculation",
        "subtraction",
      ],
      relationships: [
        relationship(
          "difference",
          text,
          0.93,
        ),
      ],
      computedAnswer: null,
      confidence: 0.93,
      reasonCode: "STRUCTURE_MONEY_CHANGE",
    };
  }

  if (
    /\bhow much more\b|\bhow much .* need\b|\bshort of\b/.test(
      t,
    )
  ) {
    const values = parseMoneyCents(text);

    let computedAnswer: string | null =
      null;

    // If the first explicit money value is the target cost,
    // subtract the inventory total that follows.
    const cost = values[0] ?? null;
    const inventory =
      moneyInventoryTotal(
        text.replace(
          /\b(?:costs?|price is)\b[^.?!]*/i,
          "",
        ),
      );

    if (
      cost !== null &&
      inventory !== null
    ) {
      computedAnswer = formatCents(
        Math.max(0, cost - inventory),
      );
    }

    return {
      problemStructure:
        "money_difference",
      requiredReasoning: [
        "money_calculation",
        "comparison",
        "subtraction",
      ],
      relationships: [
        relationship(
          "difference",
          text,
          0.94,
        ),
      ],
      computedAnswer,
      confidence: 0.94,
      reasonCode:
        "STRUCTURE_MONEY_DIFFERENCE",
    };
  }

  if (
    /\bbuys?\b|\bpurchase\b|\bcosts?\b/.test(
      t,
    ) &&
    /\bhow much\b|\bspend\b|\bspent\b/.test(
      t,
    )
  ) {
    return {
      problemStructure: "money_purchase",
      requiredReasoning: [
        "money_calculation",
        "addition",
      ],
      relationships: [
        relationship(
          "sum",
          text,
          0.9,
        ),
      ],
      computedAnswer: null,
      confidence: 0.9,
      reasonCode:
        "STRUCTURE_MONEY_PURCHASE",
    };
  }

  if (
    /\bcoins?\b|\bnotes?\b/.test(t)
  ) {
    const total =
      moneyInventoryTotal(text);

    return {
      problemStructure:
        "money_combination",
      requiredReasoning: [
        "money_calculation",
        "multiplication",
        "addition",
      ],
      relationships: [
        relationship(
          "sum",
          text,
          0.94,
        ),
      ],
      computedAnswer:
        total !== null
          ? formatCents(total)
          : null,
      confidence: 0.94,
      reasonCode:
        "STRUCTURE_MONEY_COMBINATION",
    };
  }

  if (
    /¢|\$/.test(text) &&
    /\+/.test(text)
  ) {
    const values = parseMoneyCents(text);
    const total = values.reduce(
      (sum, value) => sum + value,
      0,
    );

    return {
      problemStructure: "money_total",
      requiredReasoning: [
        "money_calculation",
        "addition",
      ],
      relationships: [
        relationship(
          "sum",
          text,
          0.97,
        ),
      ],
      computedAnswer:
        values.length >= 2
          ? formatCents(total)
          : null,
      confidence: 0.97,
      reasonCode:
        "STRUCTURE_MONEY_TOTAL",
    };
  }

  return {
    problemStructure:
      "money_purchase",
    requiredReasoning: [
      "money_calculation",
    ],
    relationships: [],
    computedAnswer: null,
    confidence: 0.7,
    reasonCode:
      "STRUCTURE_MONEY_GENERIC",
  };
}

function measurementAnalysis(
  text: string,
): StructureAnalysis {
  const t = lower(text);
  const values = numericTokens(text);

  if (
    /\bconvert\b|\bexpress\b.*\b(?:cm|m|km|g|kg|ml|l)\b/.test(
      t,
    )
  ) {
    return {
      problemStructure:
        "unit_conversion",
      requiredReasoning: [
        "unit_conversion",
      ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.94,
      reasonCode:
        "STRUCTURE_UNIT_CONVERSION",
    };
  }

  if (
    /\bheavier\b|\blighter\b|\blonger\b|\bshorter\b|\btaller\b|\bcompare\b/.test(
      t,
    )
  ) {
    return {
      problemStructure:
        "measure_compare",
      requiredReasoning: [
        "comparison",
      ],
      relationships: [
        relationship(
          "difference",
          text,
          0.9,
        ),
      ],
      computedAnswer: null,
      confidence: 0.9,
      reasonCode:
        "STRUCTURE_MEASURE_COMPARE",
    };
  }

  if (
    /\bgrew\b|\bincreased\b|\bdecreased\b|\blost\b|\bshortened\b/.test(
      t,
    )
  ) {
    const isDecrease =
      /\bdecreased\b|\blost\b|\bshortened\b/.test(
        t,
      );

    const computedAnswer =
      values.length >= 2
        ? formatNumber(
            isDecrease
              ? values[0] - values[1]
              : values[0] + values[1],
          )
        : null;

    return {
      problemStructure:
        "measure_change",
      requiredReasoning: [
        isDecrease
          ? "subtraction"
          : "addition",
      ],
      relationships: [
        relationship(
          isDecrease
            ? "change_decrease"
            : "change_increase",
          text,
          0.93,
        ),
      ],
      computedAnswer,
      confidence: 0.93,
      reasonCode:
        "STRUCTURE_MEASURE_CHANGE",
    };
  }

  if (
    /\btotal\b|\baltogether\b|\bin all\b/.test(
      t,
    )
  ) {
    return {
      problemStructure:
        "measure_total",
      requiredReasoning: ["addition"],
      relationships: [
        relationship(
          "sum",
          text,
          0.88,
        ),
      ],
      computedAnswer: null,
      confidence: 0.88,
      reasonCode:
        "STRUCTURE_MEASURE_TOTAL",
    };
  }

  return {
    problemStructure:
      "measure_compare",
    requiredReasoning: [
      "comparison",
    ],
    relationships: [],
    computedAnswer: null,
    confidence: 0.68,
    reasonCode:
      "STRUCTURE_MEASUREMENT_GENERIC",
  };
}

function geometryAnalysis(
  text: string,
): StructureAnalysis {
  const t = lower(text);

  if (/\barea\b/.test(t)) {
    const values = numericTokens(text);

    return {
      problemStructure: "area",
      requiredReasoning: [
        "area_calculation",
        "spatial_reasoning",
      ],
      relationships: [
        relationship(
          "area",
          text,
          0.96,
        ),
      ],
      computedAnswer: null,
      confidence: 0.96,
      reasonCode: "STRUCTURE_AREA",
    };
  }

  if (/\bperimeter\b/.test(t)) {
    return {
      problemStructure: "perimeter",
      requiredReasoning: [
        "perimeter_calculation",
        "spatial_reasoning",
      ],
      relationships: [
        relationship(
          "perimeter",
          text,
          0.96,
        ),
      ],
      computedAnswer: null,
      confidence: 0.96,
      reasonCode: "STRUCTURE_PERIMETER",
    };
  }

  if (
    /\bangle\b|∠/.test(text)
  ) {
    return {
      problemStructure: "angle",
      requiredReasoning: [
        "spatial_reasoning",
      ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.94,
      reasonCode: "STRUCTURE_ANGLE",
    };
  }

  if (
    /\bhow many\b.*\b(?:squares?|rectangles?|triangles?|shapes?)\b/.test(
      t,
    ) ||
    /\bgrid\b.*\bhow many\b/.test(
      t,
    )
  ) {
    return {
      problemStructure:
        "systematic_counting",
      requiredReasoning: [
        "counting",
        "systematic_enumeration",
        "spatial_reasoning",
      ],
      relationships: [
        relationship(
          "count_valid_positions",
          text,
          0.95,
        ),
      ],
      computedAnswer: null,
      confidence: 0.95,
      reasonCode:
        "STRUCTURE_SYSTEMATIC_COUNTING",
    };
  }

  if (
    /\bwhich solid\b|\bwhich shape\b|\bwhich object\b|\bwhich statement\b/.test(
      t,
    ) &&
    /\bfaces?\b|\bedges?\b|\bvertices?\b|\bcurved\b|\brolls?\b|\bstacks?\b|\bsquare\b|\brectangle\b|\btriangle\b|\bparallel\b|\bperpendicular\b|\bsymmetr/.test(
      t,
    )
  ) {
    return {
      problemStructure:
        "property_matching",
      requiredReasoning: [
        "property_matching",
        "classification",
        "spatial_reasoning",
      ],
      relationships: [
        relationship(
          "property_match",
          text,
          0.95,
        ),
      ],
      computedAnswer: null,
      confidence: 0.95,
      reasonCode:
        "STRUCTURE_PROPERTY_MATCHING",
    };
  }

  if (
    /\bpattern\b|\bsequence\b|\bmissing shape\b/.test(
      t,
    )
  ) {
    return {
      problemStructure:
        "pattern_rule",
      requiredReasoning: [
        "pattern_extension",
        "spatial_reasoning",
      ],
      relationships: [
        relationship(
          "sequence_rule",
          text,
          0.9,
        ),
      ],
      computedAnswer: null,
      confidence: 0.9,
      reasonCode:
        "STRUCTURE_GEOMETRY_PATTERN",
    };
  }

  return {
    problemStructure:
      "shape_properties",
    requiredReasoning: [
      "property_matching",
      "spatial_reasoning",
    ],
    relationships: [],
    computedAnswer: null,
    confidence: 0.72,
    reasonCode:
      "STRUCTURE_SHAPE_PROPERTIES",
  };
}

function dataAnalysis(
  text: string,
): StructureAnalysis {
  const t = lower(text);

  if (
    /\bclassify\b|\bsort\b|\bgroup\b.*\b(?:red|round|shape|colour|color)\b/.test(
      t,
    ) ||
    /\bbelongs in the group\b/.test(t)
  ) {
    return {
      problemStructure:
        "data_classification",
      requiredReasoning: [
        "classification",
        "logical_elimination",
      ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.93,
      reasonCode:
        "STRUCTURE_DATA_CLASSIFICATION",
    };
  }

  if (
    /\bchanges? from\b|\bcompare\b|\bmore than\b|\bfewer than\b|\bsame number\b/.test(
      t,
    )
  ) {
    return {
      problemStructure:
        "data_comparison",
      requiredReasoning: [
        "data_interpretation",
        "comparison",
      ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.9,
      reasonCode:
        "STRUCTURE_DATA_COMPARISON",
    };
  }

  return {
    problemStructure:
      "data_reading",
    requiredReasoning: [
      "data_interpretation",
      "counting",
    ],
    relationships: [],
    computedAnswer: null,
    confidence: 0.87,
    reasonCode:
      "STRUCTURE_DATA_READING",
  };
}

function fractionAnalysis(
  text: string,
): StructureAnalysis {
  const t = lower(text);

  const ofMatch = t.match(
    /(\d+)\s*\/\s*(\d+)\s+of\s+(\d[\d,]*(?:\.\d+)?)/,
  );

  if (ofMatch) {
    const numerator = Number(ofMatch[1]);
    const denominator = Number(ofMatch[2]);
    const whole = parseNumeric(
      ofMatch[3],
    );

    return {
      problemStructure:
        "fraction_of_whole",
      requiredReasoning: [
        "fraction_multiplication",
      ],
      relationships: [
        relationship(
          "fraction_of",
          text,
          0.98,
          `${numerator}/${denominator} of ${whole ?? "?"}`,
        ),
      ],
      computedAnswer:
        whole !== null &&
        denominator !== 0
          ? formatNumber(
              (numerator /
                denominator) *
                whole,
            )
          : null,
      confidence: 0.98,
      reasonCode:
        "STRUCTURE_FRACTION_OF_WHOLE",
    };
  }

  if (
    /\bequivalent\b|\bsame value\b/.test(
      t,
    )
  ) {
    return {
      problemStructure:
        "fraction_equivalence",
      requiredReasoning: [
        "fraction_equivalence",
      ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.94,
      reasonCode:
        "STRUCTURE_FRACTION_EQUIVALENCE",
    };
  }

  if (
    /\bcompare\b|\border\b|\bgreater\b|\bless\b|\blargest\b|\bsmallest\b/.test(
      t,
    )
  ) {
    return {
      problemStructure:
        "fraction_comparison",
      requiredReasoning: [
        "fraction_comparison",
        "ordering",
      ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.94,
      reasonCode:
        "STRUCTURE_FRACTION_COMPARISON",
    };
  }

  const direct = simpleExpression(text);

  if (direct) {
    return {
      problemStructure:
        "direct_calculation",
      requiredReasoning: [
        direct.reasoning,
      ],
      relationships: [
        relationship(
          direct.relation,
          text,
          0.96,
          direct.expression,
        ),
      ],
      computedAnswer:
        direct.answer === null
          ? null
          : formatNumber(
              direct.answer,
            ),
      confidence: 0.96,
      reasonCode:
        "STRUCTURE_FRACTION_DIRECT",
    };
  }

  return {
    problemStructure:
      "fraction_comparison",
    requiredReasoning: [
      "fraction_comparison",
    ],
    relationships: [],
    computedAnswer: null,
    confidence: 0.68,
    reasonCode:
      "STRUCTURE_FRACTION_GENERIC",
  };
}

function decimalAnalysis(
  text: string,
): StructureAnalysis {
  const t = lower(text);

  if (
    /\bround\b|\bnearest\b|\btenths?\b|\bhundredths?\b|\bthousandths?\b|\bplace value\b/.test(
      t,
    )
  ) {
    return {
      problemStructure:
        /\bround\b|\bnearest\b/.test(t)
          ? "operation_chain"
          : "place_value",
      requiredReasoning: [
        "place_value_reasoning",
        /\bround\b|\bnearest\b/.test(t)
          ? "estimation"
          : "comparison",
      ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.93,
      reasonCode:
        "STRUCTURE_DECIMAL_PLACE_VALUE",
    };
  }

  const direct =
    simpleExpression(text);

  if (direct) {
    return {
      problemStructure:
        "direct_calculation",
      requiredReasoning: [
        direct.reasoning,
      ],
      relationships: [
        relationship(
          direct.relation,
          text,
          0.96,
          direct.expression,
        ),
      ],
      computedAnswer:
        direct.answer === null
          ? null
          : formatNumber(
              direct.answer,
            ),
      confidence: 0.96,
      reasonCode:
        "STRUCTURE_DECIMAL_DIRECT",
    };
  }

  return {
    problemStructure:
      "operation_chain",
    requiredReasoning: [
      "place_value_reasoning",
    ],
    relationships: [],
    computedAnswer: null,
    confidence: 0.72,
    reasonCode:
      "STRUCTURE_DECIMAL_GENERIC",
  };
}

function ratioAnalysis(
  text: string,
): StructureAnalysis {
  const t = lower(text);

  if (
    /\bunitary\b|\bfor every\b|\bper\b/.test(
      t,
    )
  ) {
    return {
      problemStructure: "unitary",
      requiredReasoning: [
        "ratio_scaling",
        "division",
        "multiplication",
      ],
      relationships: [
        relationship(
          "ratio",
          text,
          0.9,
        ),
      ],
      computedAnswer: null,
      confidence: 0.9,
      reasonCode:
        "STRUCTURE_RATIO_UNITARY",
    };
  }

  if (
    /\btotal\b|\baltogether\b|\bsum\b/.test(
      t,
    ) &&
    /\bratio\b|:\s*\d/.test(t)
  ) {
    return {
      problemStructure:
        "ratio_partition",
      requiredReasoning: [
        "ratio_scaling",
        "division",
        "multiplication",
      ],
      relationships: [
        relationship(
          "ratio",
          text,
          0.92,
        ),
      ],
      computedAnswer: null,
      confidence: 0.92,
      reasonCode:
        "STRUCTURE_RATIO_PARTITION",
    };
  }

  return {
    problemStructure:
      "ratio_relationship",
    requiredReasoning: [
      "ratio_scaling",
      "comparison",
    ],
    relationships: [
      relationship(
        "ratio",
        text,
        0.9,
      ),
    ],
    computedAnswer: null,
    confidence: 0.9,
    reasonCode:
      "STRUCTURE_RATIO_RELATIONSHIP",
  };
}

function percentageAnalysis(
  text: string,
): StructureAnalysis {
  const t = lower(text);

  const match = t.match(
    /(\d+(?:\.\d+)?)\s*%\s+of\s+(\d[\d,]*(?:\.\d+)?)/,
  );

  if (match) {
    const percent = Number(match[1]);
    const whole = parseNumeric(
      match[2],
    );

    return {
      problemStructure:
        "percentage_of_whole",
      requiredReasoning: [
        "percentage",
        "multiplication",
      ],
      relationships: [
        relationship(
          "percentage_of",
          text,
          0.98,
          `${percent}% of ${whole ?? "?"}`,
        ),
      ],
      computedAnswer:
        whole !== null
          ? formatNumber(
              (percent / 100) *
                whole,
            )
          : null,
      confidence: 0.98,
      reasonCode:
        "STRUCTURE_PERCENTAGE_OF_WHOLE",
    };
  }

  return {
    problemStructure:
      "direct_calculation",
    requiredReasoning: [
      "percentage",
    ],
    relationships: [],
    computedAnswer: null,
    confidence: 0.84,
    reasonCode:
      "STRUCTURE_PERCENTAGE_GENERIC",
  };
}

function timeAnalysis(
  text: string,
): StructureAnalysis {
  const t = lower(text);

  if (
    /\bwhat time\b|\bread the clock\b|\bclock shows\b/.test(
      t,
    )
  ) {
    return {
      problemStructure: "time_reading",
      requiredReasoning: [
        "time_calculation",
      ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.92,
      reasonCode:
        "STRUCTURE_TIME_READING",
    };
  }

  return {
    problemStructure:
      "time_interval",
    requiredReasoning: [
      "time_calculation",
      /\bearlier\b|\bago\b|\bbefore\b/.test(
        t,
      )
        ? "subtraction"
        : "addition",
    ],
    relationships: [],
    computedAnswer: null,
    confidence: 0.88,
    reasonCode:
      "STRUCTURE_TIME_INTERVAL",
  };
}

function averageAnalysis(
  text: string,
): StructureAnalysis {
  return {
    problemStructure: "average",
    requiredReasoning: [
      "average_calculation",
      "addition",
      "division",
    ],
    relationships: [],
    computedAnswer: null,
    confidence: 0.95,
    reasonCode:
      "STRUCTURE_AVERAGE",
  };
}

function speedAnalysis(
  text: string,
): StructureAnalysis {
  return {
    problemStructure:
      "speed_distance_time",
    requiredReasoning: [
      "speed_calculation",
      "division",
      "unit_conversion",
    ],
    relationships: [],
    computedAnswer: null,
    confidence: 0.95,
    reasonCode:
      "STRUCTURE_SPEED_DISTANCE_TIME",
  };
}

function patternAnalysis(
  text: string,
): StructureAnalysis {
  const next = patternAnswer(text);

  return {
    problemStructure: "pattern_rule",
    requiredReasoning: [
      "pattern_extension",
      "comparison",
    ],
    relationships: [
      relationship(
        "sequence_rule",
        text,
        0.92,
      ),
    ],
    computedAnswer:
      next !== null
        ? formatNumber(next)
        : null,
    confidence: 0.92,
    reasonCode:
      "STRUCTURE_PATTERN_RULE",
  };
}

function placeValueAnalysis(
  text: string,
): StructureAnalysis {
  return {
    problemStructure: "place_value",
    requiredReasoning: [
      "place_value_reasoning",
      "comparison",
    ],
    relationships: [],
    computedAnswer: null,
    confidence: 0.9,
    reasonCode:
      "STRUCTURE_PLACE_VALUE",
  };
}

function genericWordProblem(
  text: string,
): StructureAnalysis | null {
  const t = lower(text);
  const values = numericTokens(text);

  if (
    /\bqueue\b|\bin front of\b|\bbehind\b/.test(t)
  ) {
    return {
      problemStructure:
        "logic_strategy",
      requiredReasoning: [
        "counting",
        "subtraction",
        "logical_elimination",
      ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.88,
      reasonCode:
        "STRUCTURE_POSITION_QUEUE",
    };
  }

  if (
    /\bfactor of\b|\bmultiple of\b|\bcommon multiple\b|\bnumber conditions?\b/.test(
      t,
    )
  ) {
    return {
      problemStructure:
        "logic_strategy",
      requiredReasoning: [
        "logical_elimination",
        "multiplication",
      ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.9,
      reasonCode:
        "STRUCTURE_NUMBER_CONDITIONS",
    };
  }

  if (
    /\bspeak both\b|\bneither\b|\bboth\b.*\band\b/.test(
      t,
    )
  ) {
    return {
      problemStructure:
        "logic_strategy",
      requiredReasoning: [
        "addition",
        "subtraction",
        "logical_elimination",
      ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.88,
      reasonCode:
        "STRUCTURE_SET_REASONING",
    };
  }

  if (
    /\bdefinitely\b|\bmust .* hit\b|\bmust .* choose\b/.test(
      t,
    )
  ) {
    return {
      problemStructure:
        "logic_strategy",
      requiredReasoning: [
        "logical_elimination",
        "addition",
      ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.9,
      reasonCode:
        "STRUCTURE_EXACT_SUM_LOGIC",
    };
  }

  if (
    /\bthen\b/.test(t) &&
    (
      /\bmore than\b|\bless than\b|\bfewer than\b|\bgives?\b|\breceived\b|\bdecreased\b|\bincreased\b/.test(
        t,
      )
    )
  ) {
    return {
      problemStructure:
        "multi_step",
      requiredReasoning: unique([
        "comparison",
        /\bmore than\b|\bless than\b|\bfewer than\b/.test(t)
          ? "subtraction"
          : "addition",
        /\bgives?\b|\breceived\b|\bincreased\b/.test(t)
          ? "addition"
          : "subtraction",
      ]),
      relationships: [],
      computedAnswer: null,
      confidence: 0.9,
      reasonCode:
        "STRUCTURE_MULTI_STEP_CHANGE",
    };
  }

  if (
    /\beach\b/.test(t) &&
    /\bat first\b/.test(t) &&
    /\bleft\b|\bremaining\b/.test(t)
  ) {
    return {
      problemStructure:
        "working_backwards",
      requiredReasoning: [
        "working_backwards",
        "multiplication",
        "addition",
      ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.94,
      reasonCode:
        "STRUCTURE_EQUAL_GROUPS_WORK_BACK",
    };
  }

  if (
    /\bgives?\b.*\b(?:coins?|items?|cards?|pencils?|money)\b/.test(t) &&
    /\bstill\b.*\bmore\b/.test(t)
  ) {
    return {
      problemStructure:
        "multi_step",
      requiredReasoning: [
        "working_backwards",
        "addition",
        "multiplication",
        "comparison",
      ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.94,
      reasonCode:
        "STRUCTURE_TRANSFER_EFFECT_ON_DIFFERENCE",
    };
  }

  if (
    /\bhow old\b/.test(t) &&
    /\bwhen\b/.test(t) &&
    /\byears? old\b/.test(t)
  ) {
    return {
      problemStructure:
        "working_backwards",
      requiredReasoning: [
        "working_backwards",
        "subtraction",
        "addition",
      ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.92,
      reasonCode:
        "STRUCTURE_AGE_RELATIONSHIP",
    };
  }

  if (
    /\bfirst\b.*\bmultiples?\b|\bcommon multiples?\b/.test(
      t,
    )
  ) {
    return {
      problemStructure:
        "operation_chain",
      requiredReasoning: [
        "multiplication",
        "addition",
        "pattern_extension",
      ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.92,
      reasonCode:
        "STRUCTURE_MULTIPLES_SEQUENCE",
    };
  }

  if (
    /\bhow many more\b|\bhow many fewer\b|\bdifference\b|\bmore than\b|\bfewer than\b|\bless than\b/.test(
      t,
    )
  ) {
    let computedAnswer: string | null =
      null;

    if (
      values.length === 2 &&
      /\bhow many more\b|\bhow many fewer\b/.test(
        t,
      ) &&
      !/\btimes as many\b|\beach\b|\bthen\b/.test(t)
    ) {
      computedAnswer = formatNumber(
        Math.abs(
          values[0] - values[1],
        ),
      );
    }

    return {
      problemStructure:
        "comparison_difference",
      requiredReasoning: [
        "comparison",
        "subtraction",
      ],
      relationships: [
        relationship(
          /\bmore than\b/.test(t)
            ? "more_than"
            : /\bfewer than\b|\bless than\b/.test(
                  t,
                )
              ? "less_than"
              : "difference",
          text,
          0.92,
        ),
      ],
      computedAnswer,
      confidence: 0.92,
      reasonCode:
        "STRUCTURE_COMPARISON_DIFFERENCE",
    };
  }

  if (
    /\bleft\b|\bremaining\b|\bremain\b|\bsells?\b|\bsold\b|\bgives? away\b|\bfly away\b|\bflies away\b|\bpop\b|\bpopped\b|\bused\b|\blost\b|\bremoved\b|\bspent\b/.test(
      t,
    )
  ) {
    return {
      problemStructure:
        "subtraction_change",
      requiredReasoning: [
        "subtraction",
      ],
      relationships: [
        relationship(
          "change_decrease",
          text,
          0.93,
        ),
      ],
      computedAnswer:
        values.length === 2 &&
        !/\beach\b|\btimes\b|\bthen\b|\bat first\b|\bwheel\b|\bequal\b/.test(t)
          ? formatNumber(
              values[0] - values[1],
            )
          : null,
      confidence: 0.93,
      reasonCode:
        "STRUCTURE_SUBTRACTION_CHANGE",
    };
  }

  if (
    /\bgrew\b|\bincreased by\b|\breceived\b|\bgets?\b|\bjoined\b|\bmore came\b|\badded\b/.test(
      t,
    )
  ) {
    return {
      problemStructure:
        "addition_change",
      requiredReasoning: [
        "addition",
      ],
      relationships: [
        relationship(
          "change_increase",
          text,
          0.9,
        ),
      ],
      computedAnswer:
        values.length === 2 &&
        !/\beach\b|\btimes\b|\bthen\b|\bat first\b|\bwheel\b|\bequal\b/.test(t)
          ? formatNumber(
              values[0] + values[1],
            )
          : null,
      confidence: 0.9,
      reasonCode:
        "STRUCTURE_ADDITION_CHANGE",
    };
  }

  if (
    /\baltogether\b|\bin all\b|\btotal\b|\bsum\b/.test(
      t,
    )
  ) {
    return {
      problemStructure:
        "part_whole",
      requiredReasoning: ["addition"],
      relationships: [
        relationship(
          "sum",
          text,
          0.88,
        ),
      ],
      computedAnswer:
        values.length === 2 &&
        !/\btimes as many\b|\beach\b|\bwheels?\b|\bequals?\b|\bshared\b|\bper\b|\bmultiples?\b|\bfirst\b/.test(t)
          ? formatNumber(
              values[0] + values[1],
            )
          : null,
      confidence: 0.88,
      reasonCode:
        "STRUCTURE_PART_WHOLE",
    };
  }

  if (
    /\bshared equally\b|\bequally among\b|\beach gets\b/.test(
      t,
    )
  ) {
    return {
      problemStructure: "sharing",
      requiredReasoning: ["division"],
      relationships: [
        relationship(
          "shared_equally",
          text,
          0.92,
        ),
      ],
      computedAnswer: null,
      confidence: 0.92,
      reasonCode:
        "STRUCTURE_SHARING",
    };
  }

  if (
    /\bgroups? of\b|\bhow many groups\b/.test(
      t,
    )
  ) {
    return {
      problemStructure: "grouping",
      requiredReasoning: ["division"],
      relationships: [
        relationship(
          "same_value_each",
          text,
          0.9,
        ),
      ],
      computedAnswer: null,
      confidence: 0.9,
      reasonCode:
        "STRUCTURE_GROUPING",
    };
  }

  if (
    /\beach\b|\bevery\b|\bsame number in each\b|\bequal groups\b/.test(
      t,
    )
  ) {
    return {
      problemStructure:
        "equal_groups",
      requiredReasoning: [
        "multiplication",
        "division",
      ],
      relationships: [
        relationship(
          "same_value_each",
          text,
          0.86,
        ),
      ],
      computedAnswer: null,
      confidence: 0.86,
      reasonCode:
        "STRUCTURE_EQUAL_GROUPS",
    };
  }

  if (
    /\bwill be\b.*\bin\b.*\byears?\b|\byears? ago\b|\bworking backwards\b/.test(
      t,
    )
  ) {
    return {
      problemStructure:
        "working_backwards",
      requiredReasoning: [
        "working_backwards",
        "subtraction",
      ],
      relationships: [],
      computedAnswer:
        values.length >= 3
          ? formatNumber(
              values[0] -
                values[1] -
                values[2],
            )
          : null,
      confidence: 0.9,
      reasonCode:
        "STRUCTURE_WORKING_BACKWARDS",
    };
  }

  return null;
}

function skillStructure(
  curriculum: CurriculumContext,
): StructureAnalysis | null {
  const skill = lower(
    [
      curriculum.primarySkill,
      curriculum.legacySkill,
      ...curriculum.secondarySkills,
      ...curriculum.skillTags,
    ]
      .filter(Boolean)
      .join(" "),
  );

  if (!skill) return null;

  if (
    /\bplace value\b|\bnumber words\b|\bnumerals\b|\bnumber relationships\b/.test(
      skill,
    )
  ) {
    return placeValueAnalysis(skill);
  }

  if (
    /\bsubtraction\b.*\btake away\b|\bone-step word problems\b|\bmixed word problems\b/.test(
      skill,
    )
  ) {
    return {
      problemStructure:
        "subtraction_change",
      requiredReasoning: [
        "subtraction",
      ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.82,
      reasonCode:
        "STRUCTURE_SKILL_SUBTRACTION",
    };
  }

  if (
    /\bparts? and whole\b|\bnumber bonds?\b/.test(
      skill,
    )
  ) {
    return {
      problemStructure:
        "part_whole",
      requiredReasoning: ["addition"],
      relationships: [],
      computedAnswer: null,
      confidence: 0.86,
      reasonCode:
        "STRUCTURE_SKILL_PART_WHOLE",
    };
  }

  if (
    /\bdivision with remainder\b/.test(
      skill,
    )
  ) {
    return {
      problemStructure: "grouping",
      requiredReasoning: ["division"],
      relationships: [],
      computedAnswer: null,
      confidence: 0.9,
      reasonCode:
        "STRUCTURE_SKILL_DIVISION",
    };
  }

  if (
    /\bcompare|comparing|order|ordering\b/.test(
      skill,
    )
  ) {
    return {
      problemStructure:
        "comparison_difference",
      requiredReasoning: [
        "comparison",
      ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.78,
      reasonCode:
        "STRUCTURE_SKILL_COMPARISON",
    };
  }

  if (
    /\bmystery numbers?\b|\bequation clues?\b|\bequations?, symbols? and unknowns?\b/.test(
      skill,
    )
  ) {
    return {
      problemStructure:
        "equation_unknown",
      requiredReasoning: [
        "equation_solving",
        "logical_elimination",
      ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.86,
      reasonCode:
        "STRUCTURE_SKILL_EQUATION_UNKNOWN",
    };
  }

  if (
    /\bclassify\b|\bsort objects?\b/.test(
      skill,
    )
  ) {
    return {
      problemStructure:
        "data_classification",
      requiredReasoning: [
        "classification",
      ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.86,
      reasonCode:
        "STRUCTURE_SKILL_CLASSIFICATION",
    };
  }

  if (
    /\bzero factor\b|\brecognising a zero factor\b/.test(
      skill,
    )
  ) {
    return {
      problemStructure:
        "operation_chain",
      requiredReasoning: [
        "multiplication",
        "logical_elimination",
      ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.92,
      reasonCode:
        "STRUCTURE_SKILL_ZERO_FACTOR",
    };
  }

  if (
    /\b3d shape properties\b|\b2d shape properties\b|\bidentify triangles\b|\bdistinguish a cube\b|\bparallel and perpendicular\b|\bsymmetry\b/.test(
      skill,
    )
  ) {
    return {
      problemStructure:
        "property_matching",
      requiredReasoning: [
        "property_matching",
        "spatial_reasoning",
      ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.86,
      reasonCode:
        "STRUCTURE_SKILL_GEOMETRY_PROPERTIES",
    };
  }

  return null;
}

export function analyzeProblemStructure(args: {
  text: string;
  domain: MathematicalDomain;
  curriculum: CurriculumContext;
}): StructureAnalysis {
  const {
    text,
    domain,
    curriculum,
  } = args;

  const equation =
    equationAnalysis(text);

  if (equation) return equation;

  const variable =
    variableExpressionAnalysis(text);

  if (variable) return variable;

  const t = lower(text);

  if (
    /\bpattern\b|\bsequence\b|\bcomes next\b|\bmissing shape\b/.test(
      t,
    ) ||
    curriculum.inferredDomain === "patterns"
  ) {
    return patternAnalysis(text);
  }

  if (
    domain === "money"
  ) {
    return moneyAnalysis(text);
  }

  if (
    domain === "measurement"
  ) {
    return measurementAnalysis(text);
  }

  if (
    domain === "geometry"
  ) {
    return geometryAnalysis(text);
  }

  if (
    domain === "data"
  ) {
    return dataAnalysis(text);
  }

  if (
    domain === "fractions"
  ) {
    return fractionAnalysis(text);
  }

  if (
    domain === "decimals"
  ) {
    return decimalAnalysis(text);
  }

  if (
    domain === "ratio"
  ) {
    return ratioAnalysis(text);
  }

  if (
    domain === "percentage"
  ) {
    return percentageAnalysis(text);
  }

  if (
    domain === "time"
  ) {
    return timeAnalysis(text);
  }

  if (
    domain === "average"
  ) {
    return averageAnalysis(text);
  }

  if (
    domain === "speed_rate"
  ) {
    return speedAnalysis(text);
  }

  if (
    domain === "algebra"
  ) {
    return {
      problemStructure:
        /=/.test(text)
          ? "equation_unknown"
          : "operation_chain",
      requiredReasoning:
        /=/.test(text)
          ? ["equation_solving"]
          : [
              "algebraic_simplification",
            ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.86,
      reasonCode:
        "STRUCTURE_ALGEBRA_GENERIC",
    };
  }

  if (
    domain === "logic"
  ) {
    return {
      problemStructure:
        "logic_strategy",
      requiredReasoning: [
        "logical_elimination",
      ],
      relationships: [],
      computedAnswer: null,
      confidence: 0.82,
      reasonCode:
        "STRUCTURE_LOGIC_STRATEGY",
    };
  }

  const generic =
    genericWordProblem(text);

  if (generic) return generic;

  const direct =
    simpleExpression(text);

  if (direct) {
    return {
      problemStructure:
        "direct_calculation",
      requiredReasoning: [
        direct.reasoning,
      ],
      relationships: [
        relationship(
          direct.relation,
          text,
          0.99,
          direct.expression,
        ),
      ],
      computedAnswer:
        direct.answer === null
          ? null
          : formatNumber(
              direct.answer,
            ),
      confidence: 0.99,
      reasonCode:
        "STRUCTURE_DIRECT_CALCULATION",
    };
  }

  if (
    /\bplace value\b|\btens?\b|\bones?\b|\bhundreds?\b|\bthousands?\b|\bdigit\b|\bnumber word\b|\bnumeral\b/.test(
      t,
    )
  ) {
    return placeValueAnalysis(text);
  }

  const fromSkill =
    skillStructure(curriculum);

  if (fromSkill) return fromSkill;

  return {
    problemStructure: "unknown",
    requiredReasoning: ["unknown"],
    relationships: [],
    computedAnswer: null,
    confidence: 0.3,
    reasonCode:
      "STRUCTURE_UNKNOWN",
  };
}

export function mergeReasoning(
  primary: RequiredReasoning[],
  text: string,
): RequiredReasoning[] {
  const t = lower(text);
  const extras: RequiredReasoning[] = [];

  if (/\+/.test(text)) {
    extras.push("addition");
  }

  if (/[−-]/.test(text)) {
    extras.push("subtraction");
  }

  if (/×|\*/.test(text)) {
    extras.push("multiplication");
  }

  if (/÷/.test(text)) {
    extras.push("division");
  }

  if (
    /\bcompare\b|\bmore than\b|\bfewer than\b|\bless than\b|\bdifference\b/.test(
      t,
    )
  ) {
    extras.push("comparison");
  }

  return unique([
    ...primary,
    ...extras,
  ]);
}
