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

import { identifyRingArrivalIncrementPattern } from "./constantIncrementPattern";

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

function symbolMappingAnalysis(
  text: string,
): StructureAnalysis | null {
  const t = lower(text);
  const assignments = Array.from(
    text.matchAll(/\b([A-Z])\b\s*=\s*(-?\d+(?:\.\d+)?)/g),
  );

  if (
    assignments.length < 2 ||
    !/\b(?:code|spells?|encode|decode|letter|letters|mapping)\b/.test(t)
  ) {
    return null;
  }

  return {
    problemStructure: "symbol_mapping",
    requiredReasoning: [
      "symbol_mapping",
      "rule_inference",
      "logical_elimination",
    ],
    relationships: assignments.map((match, index) => ({
      id: `r${index + 1}`,
      type: "equals",
      left: match[1] ?? null,
      right: match[2] ?? null,
      expression: match[0],
      sourceText: text,
      confidence: 0.98,
    })),
    computedAnswer: null,
    confidence: 0.98,
    reasonCode: "STRUCTURE_SYMBOL_MAPPING",
  };
}

function transferDifferenceAnalysis(
  text: string,
): StructureAnalysis | null {
  const t = lower(text);

  if (
    !/\b(?:gave|gives|give|transferred|transfers|transfer)\b/.test(t) ||
    !/\b(?:after|then)\b/.test(t) ||
    !/\b(?:at first|initially|before)\b/.test(t) ||
    !/\b(?:more than|less than|difference)\b/.test(t)
  ) {
    return null;
  }

  let computedAnswer: string | null = null;

  const transferMatch = text.match(
    /\b([A-Z][A-Za-z'-]*)\s+(?:gave|gives|give|transferred|transfers|transfer)\s+(?:\$\s*)?(\d[\d,]*(?:\.\d+)?)\s*(?:dollars?|\$)?\s+to\s+([A-Z][A-Za-z'-]*)/i,
  );

  const afterMoreMatch = text.match(
    /\b(?:after|then)[^.!?]*?([A-Z][A-Za-z'-]*)\s+had\s+(?:\$\s*)?(\d[\d,]*(?:\.\d+)?)\s*(?:dollars?|\$)?\s+more\s+than\s+([A-Z][A-Za-z'-]*)/i,
  );

  if (transferMatch && afterMoreMatch) {
    const giver = lower(transferMatch[1]);
    const recipient = lower(transferMatch[3]);
    const transfer = parseNumeric(transferMatch[2]);
    const moreHolder = lower(afterMoreMatch[1]);
    const comparedWith = lower(afterMoreMatch[3]);
    const finalDifference = parseNumeric(afterMoreMatch[2]);

    if (
      transfer !== null &&
      finalDifference !== null &&
      giver && recipient
    ) {
      // Giving g from A to B changes A-B by 2g.
      // If B is d ahead afterwards, initial A-B = 2g-d.
      // If A is still d ahead afterwards, initial A-B = 2g+d.
      if (
        moreHolder === recipient &&
        comparedWith === giver
      ) {
        const initialDifference =
          2 * transfer - finalDifference;
        computedAnswer = /\$|dollars?/i.test(text)
          ? formatCents(Math.round(initialDifference * 100))
          : formatNumber(initialDifference);
      } else if (
        moreHolder === giver &&
        comparedWith === recipient
      ) {
        const initialDifference =
          2 * transfer + finalDifference;
        computedAnswer = /\$|dollars?/i.test(text)
          ? formatCents(Math.round(initialDifference * 100))
          : formatNumber(initialDifference);
      }
    }
  }

  return {
    problemStructure: "transfer_difference",
    requiredReasoning: [
      "transfer_reasoning",
      "comparison",
      "addition",
      "subtraction",
    ],
    relationships: [
      relationship(
        "difference",
        text,
        0.97,
      ),
    ],
    computedAnswer,
    confidence: 0.97,
    reasonCode: "STRUCTURE_TRANSFER_DIFFERENCE",
  };
}

function recursivePatternAnalysis(
  text: string,
): StructureAnalysis | null {
  const t = lower(text);

  if (
    !/\bnumber pyramid\b|\beach box is the sum of the two boxes directly below\b|\beach number is the sum of the two.*below\b/.test(t)
  ) {
    return null;
  }

  let computedAnswer: string | null = null;

  const bottomRow = text.match(
    /\bbottom row is\s+([0-9,\s]+?)(?:\.|\?|$)/i,
  );

  if (bottomRow) {
    let values = bottomRow[1]
      .split(/\s*,\s*/g)
      .map((value) => parseNumeric(value))
      .filter((value): value is number => value !== null);

    if (values.length >= 2) {
      while (values.length > 1) {
        values = values
          .slice(0, -1)
          .map((value, index) => value + values[index + 1]);
      }
      computedAnswer = formatNumber(values[0]);
    }
  }

  return {
    problemStructure: "recursive_pattern",
    requiredReasoning: [
      "pattern_application",
      "addition",
    ],
    relationships: [
      relationship(
        "recurrence",
        text,
        0.97,
      ),
    ],
    computedAnswer,
    confidence: 0.97,
    reasonCode: "STRUCTURE_RECURSIVE_PATTERN",
  };
}

function digitFrequencyAnalysis(
  text: string,
): StructureAnalysis | null {
  const t = lower(text);

  if (
    !/\bdigit\b/.test(t) ||
    !/\bappears?\b|\boccurs?\b|\bfrequency\b/.test(t)
  ) {
    return null;
  }

  let computedAnswer: string | null = null;

  const range = t.match(
    /\bfrom\s+(\d+)\s+to\s+(\d+)\b/,
  );

  if (range) {
    const start = Number(range[1]);
    const end = Number(range[2]);

    if (
      Number.isInteger(start) &&
      Number.isInteger(end) &&
      start >= 0 &&
      end >= start &&
      end - start <= 10000
    ) {
      const counts = Array(10).fill(0) as number[];

      for (let value = start; value <= end; value += 1) {
        for (const digit of String(value)) {
          counts[Number(digit)] += 1;
        }
      }

      if (/\bfewest\b|\bleast\b/.test(t)) {
        const min = Math.min(...counts);
        const digit = counts.findIndex((count) => count === min);
        if (digit >= 0) computedAnswer = String(digit);
      } else if (/\bmost\b|\bgreatest\b/.test(t)) {
        const max = Math.max(...counts);
        const digit = counts.findIndex((count) => count === max);
        if (digit >= 0) computedAnswer = String(digit);
      }
    }
  }

  return {
    problemStructure: "digit_frequency",
    requiredReasoning: [
      "frequency_counting",
      "systematic_enumeration",
      "counting",
    ],
    relationships: [
      relationship(
        "frequency",
        text,
        0.96,
      ),
    ],
    computedAnswer,
    confidence: 0.96,
    reasonCode: "STRUCTURE_DIGIT_FREQUENCY",
  };
}

function ageRelationshipAnalysis(
  text: string,
): StructureAnalysis | null {
  const t = lower(text);

  const hasAgeLanguage =
    /\bhow old\b|\byears? old\b|\byears? younger\b|\byears? older\b|\btimes as old\b|\b(?:his|her|their) age\b/.test(t);

  const hasAcrossTimeLanguage =
    /\byears? ago\b|\byears? from now\b|\bin \d+ years?\b|\bnow\b/.test(t);

  if (!hasAgeLanguage || !hasAcrossTimeLanguage) {
    return null;
  }

  return {
    problemStructure: "age_relationship",
    requiredReasoning: unique([
      "age_reasoning",
      /\btimes\b/.test(t) ? "multiplication" : "comparison",
      /\byounger\b|\bolder\b|\bago\b/.test(t) ? "subtraction" : "addition",
    ]),
    relationships: [
      relationship(
        "age_relation",
        text,
        0.96,
      ),
    ],
    computedAnswer: null,
    confidence: 0.96,
    reasonCode: "STRUCTURE_AGE_RELATIONSHIP",
  };
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const tmp = x % y;
    x = y;
    y = tmp;
  }
  return x;
}

function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

function durationToSeconds(value: number, unit: string): number {
  const normalized = unit.toLowerCase();
  if (normalized.startsWith("minute")) return value * 60;
  if (normalized.startsWith("hour")) return value * 3600;
  return value;
}

function commonMultipleCycleAnalysis(
  text: string,
): StructureAnalysis | null {
  const t = lower(text);

  const intervalMatches = Array.from(
    t.matchAll(/\b(?:once\s+)?(?:in\s+)?every\s+(\d+(?:\.\d+)?)\s*(seconds?|minutes?|hours?)\b/g),
  );

  const hasTogether =
    /\bboth\b.*\btogether\b|\btogether\b.*\bboth\b|\bat the same time\b/.test(t);

  if (intervalMatches.length < 2 || !hasTogether) {
    return null;
  }

  const intervals = intervalMatches
    .map((match) => durationToSeconds(Number(match[1]), match[2]))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (intervals.length < 2) return null;

  const cycle = intervals.reduce((acc, value) => lcm(acc, value));
  let computedAnswer: string | null = null;

  const horizon = t.match(
    /\bin\s+(\d+(?:\.\d+)?)\s*(seconds?|minutes?|hours?)\b/,
  );

  if (horizon && cycle > 0) {
    const horizonSeconds = durationToSeconds(Number(horizon[1]), horizon[2]);
    computedAnswer = formatNumber(Math.floor(horizonSeconds / cycle));
  }

  return {
    problemStructure: "common_multiple_cycle",
    requiredReasoning: [
      "common_multiple",
      "counting",
      "unit_conversion",
    ],
    relationships: [
      relationship(
        "repeating_cycle",
        text,
        0.97,
      ),
    ],
    computedAnswer,
    confidence: 0.97,
    reasonCode: "STRUCTURE_COMMON_MULTIPLE_CYCLE",
  };
}

function unitaryScalingAnalysis(
  text: string,
): StructureAnalysis | null {
  const t = lower(text);

  const hasExplicitScalingCue =
    /\b(?:at the same rate|same rate|same number (?:in|per) each|for every|per (?:box|group|item|unit|person))\b/.test(t);

  const hasGroupedBaseline =
    /\bequally\s+(?:into|among)\b/.test(t) ||
    /\b(?:boxes?|groups?|items?|people)\b/.test(t);

  // Guardrail: words such as "each" or "equally" alone do not define
  // a unitary/rate-scaling problem. There must be an explicit invariant
  // scaling cue and a grouped baseline. This prevents recursive pattern
  // language such as "each box is the sum..." from being misclassified.
  const hasRateLanguage =
    hasExplicitScalingCue && hasGroupedBaseline;

  if (!hasRateLanguage) {
    return null;
  }

  const values = numericTokens(text);
  if (values.length < 3) {
    return null;
  }

  let computedAnswer: string | null = null;

  if (
    /\bequally\s+into\b/.test(t) &&
    /\b(?:same rate|same number)\b/.test(t) &&
    values.length >= 3
  ) {
    const [firstTotal, firstGroups, secondTotal] = values;

    if (firstGroups !== 0) {
      const perGroup = firstTotal / firstGroups;
      if (perGroup !== 0) {
        computedAnswer = formatNumber(secondTotal / perGroup);
      }
    }
  }

  return {
    problemStructure: "unitary",
    requiredReasoning: [
      "rate_scaling",
      "division",
    ],
    relationships: [
      relationship(
        "same_value_each",
        text,
        0.95,
      ),
    ],
    computedAnswer,
    confidence: 0.95,
    reasonCode: "STRUCTURE_UNITARY_RATE_SCALING",
  };
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

type FractionValue = {
  numerator: number;
  denominator: number;
};

const FRACTION_WORD_DENOMINATORS: Record<string, number> = {
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
  eleventh: 11,
  elevenths: 11,
  twelfth: 12,
  twelfths: 12,
};

const VULGAR_FRACTIONS: Record<string, string> = {
  "½": "1/2",
  "⅓": "1/3",
  "⅔": "2/3",
  "¼": "1/4",
  "¾": "3/4",
  "⅕": "1/5",
  "⅖": "2/5",
  "⅗": "3/5",
  "⅘": "4/5",
  "⅙": "1/6",
  "⅚": "5/6",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
};

function normalizeFractionText(
  text: string,
): string {
  let normalized = text;

  for (const [symbol, replacement] of Object.entries(VULGAR_FRACTIONS)) {
    normalized = normalized.split(symbol).join(replacement);
  }

  return normalized
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\bone-quarter\b/gi, "one quarter")
    .replace(/\bone-half\b/gi, "one half")
    .replace(/\bthree-quarters\b/gi, "three quarters");
}

function reduceFraction(
  value: FractionValue,
): FractionValue {
  if (value.denominator === 0) return value;

  const sign = value.denominator < 0 ? -1 : 1;
  const n = value.numerator * sign;
  const d = Math.abs(value.denominator);
  const divisor = gcd(n, d) || 1;

  return {
    numerator: n / divisor,
    denominator: d / divisor,
  };
}

function fractionToNumber(
  value: FractionValue,
): number | null {
  if (value.denominator === 0) return null;
  return value.numerator / value.denominator;
}

function formatFraction(
  value: FractionValue,
): string {
  const reduced = reduceFraction(value);

  if (reduced.denominator === 1) {
    return String(reduced.numerator);
  }

  return `${reduced.numerator}/${reduced.denominator}`;
}

function parseFractionToken(
  raw: string,
): FractionValue | null {
  const text = normalizeFractionText(raw).trim().toLowerCase();

  const mixed = text.match(
    /^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/,
  );

  if (mixed) {
    const whole = Number(mixed[1]);
    const numerator = Number(mixed[2]);
    const denominator = Number(mixed[3]);

    if (denominator === 0) return null;

    const sign = whole < 0 ? -1 : 1;
    return reduceFraction({
      numerator: whole * denominator + sign * numerator,
      denominator,
    });
  }

  const slash = text.match(
    /^(-?\d+)\s*\/\s*(-?\d+)$/,
  );

  if (slash) {
    const numerator = Number(slash[1]);
    const denominator = Number(slash[2]);
    if (denominator === 0) return null;
    return reduceFraction({ numerator, denominator });
  }

  const word = text.match(
    /^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(half|halves|third|thirds|quarter|quarters|fourth|fourths|fifth|fifths|sixth|sixths|seventh|sevenths|eighth|eighths|ninth|ninths|tenth|tenths|eleventh|elevenths|twelfth|twelfths)$/,
  );

  if (word) {
    const numerator = NUMBER_WORDS[word[1]];
    const denominator = FRACTION_WORD_DENOMINATORS[word[2]];

    if (numerator && denominator) {
      return reduceFraction({ numerator, denominator });
    }
  }

  return null;
}

function fractionTokens(
  text: string,
): Array<{
  raw: string;
  value: FractionValue;
}> {
  const normalized = normalizeFractionText(text);
  const matches: Array<{
    raw: string;
    value: FractionValue;
  }> = [];
  const occupied: Array<[number, number]> = [];

  const add = (raw: string, index: number) => {
    const value = parseFractionToken(raw);
    if (!value) return;

    const end = index + raw.length;
    if (occupied.some(([a, b]) => index < b && end > a)) return;

    occupied.push([index, end]);
    matches.push({ raw, value });
  };

  for (const match of normalized.matchAll(/\b-?\d+\s+\d+\s*\/\s*\d+\b/g)) {
    add(match[0], match.index ?? 0);
  }

  for (const match of normalized.matchAll(/\b-?\d+\s*\/\s*\d+\b/g)) {
    add(match[0], match.index ?? 0);
  }

  for (
    const match of normalized.matchAll(
      /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(half|halves|third|thirds|quarter|quarters|fourth|fourths|fifth|fifths|sixth|sixths|seventh|sevenths|eighth|eighths|ninth|ninths|tenth|tenths|eleventh|elevenths|twelfth|twelfths)\b/gi,
    )
  ) {
    add(match[0], match.index ?? 0);
  }

  return matches.sort((a, b) => normalized.indexOf(a.raw) - normalized.indexOf(b.raw));
}

function hasFractionSignal(
  text: string,
): boolean {
  const t = lower(normalizeFractionText(text));
  return (
    fractionTokens(text).length > 0 ||
    /\bfraction\b|\bfractions\b|\bequal parts?\b|\bshaded\b|\bunshaded\b/.test(t)
  );
}

function curriculumSkillText(
  curriculum: CurriculumContext,
): string {
  return lower(
    `${curriculum.primarySkill ?? ""} ${curriculum.legacySkill ?? ""}`,
  );
}

function fractionOperationAnalysis(
  text: string,
): StructureAnalysis | null {
  const normalized = normalizeFractionText(text);
  const t = lower(normalized);

  const subtractFrom = normalized.match(
    /subtract\s+(-?\d+\s+\d+\/\d+|-?\d+\/\d+)\s+from\s+(-?\d+\s+\d+\/\d+|-?\d+\/\d+)/i,
  );

  if (subtractFrom) {
    const a = parseFractionToken(subtractFrom[1]);
    const b = parseFractionToken(subtractFrom[2]);

    let computedAnswer: string | null = null;
    if (a && b) {
      computedAnswer = formatFraction({
        numerator:
          b.numerator * a.denominator -
          a.numerator * b.denominator,
        denominator:
          b.denominator * a.denominator,
      });
    }

    return {
      problemStructure: "fraction_subtraction",
      requiredReasoning: [
        "fraction_subtraction",
        "subtraction",
      ],
      relationships: [
        relationship(
          "difference",
          text,
          0.99,
          `${subtractFrom[2]} - ${subtractFrom[1]}`,
        ),
      ],
      computedAnswer,
      confidence: 0.99,
      reasonCode: "STRUCTURE_FRACTION_SUBTRACTION",
    };
  }

  const binary = normalized.match(
    /(-?\d+\s+\d+\/\d+|-?\d+\/\d+)\s*([+\-×÷])\s*(-?\d+\s+\d+\/\d+|-?\d+\/\d+)/,
  );

  if (!binary) return null;

  const left = parseFractionToken(binary[1]);
  const right = parseFractionToken(binary[3]);
  if (!left || !right) return null;

  const operator = binary[2];
  let result: FractionValue | null = null;
  let structure: ProblemStructure = "fraction_addition";
  let reasoning: RequiredReasoning = "fraction_addition";
  let relation: MathematicalRelationship["type"] = "sum";

  if (operator === "+") {
    result = {
      numerator:
        left.numerator * right.denominator +
        right.numerator * left.denominator,
      denominator:
        left.denominator * right.denominator,
    };
  } else if (operator === "-") {
    structure = "fraction_subtraction";
    reasoning = "fraction_subtraction";
    relation = "difference";
    result = {
      numerator:
        left.numerator * right.denominator -
        right.numerator * left.denominator,
      denominator:
        left.denominator * right.denominator,
    };
  } else if (operator === "×") {
    structure = "fraction_multiplication";
    reasoning = "fraction_multiplication";
    relation = "product";
    result = {
      numerator: left.numerator * right.numerator,
      denominator: left.denominator * right.denominator,
    };
  } else {
    structure = "fraction_division";
    reasoning = "fraction_division";
    relation = "quotient";
    if (right.numerator !== 0) {
      result = {
        numerator: left.numerator * right.denominator,
        denominator: left.denominator * right.numerator,
      };
    }
  }

  return {
    problemStructure: structure,
    requiredReasoning: [
      reasoning,
      operator === "+"
        ? "addition"
        : operator === "-"
          ? "subtraction"
          : operator === "×"
            ? "multiplication"
            : "division",
    ],
    relationships: [
      relationship(
        relation,
        text,
        0.98,
        `${binary[1]} ${operator} ${binary[3]}`,
      ),
    ],
    computedAnswer: result ? formatFraction(result) : null,
    confidence: 0.98,
    reasonCode:
      structure === "fraction_addition"
        ? "STRUCTURE_FRACTION_ADDITION"
        : structure === "fraction_subtraction"
          ? "STRUCTURE_FRACTION_SUBTRACTION"
          : structure === "fraction_multiplication"
            ? "STRUCTURE_FRACTION_MULTIPLICATION"
            : "STRUCTURE_FRACTION_DIVISION",
  };
}

function fractionRepresentationAnalysis(
  text: string,
  curriculum: CurriculumContext,
): StructureAnalysis | null {
  const normalized = normalizeFractionText(text);
  const t = lower(normalized);
  const skill = curriculumSkillText(curriculum);

  const representationSkill =
    /recognise and name fractions|equal parts|express one quantity as a fraction/.test(skill);

  const representationPrompt =
    /\bshaded\b|\bunshaded\b|\bwhat fraction\b|\bwhich fraction\b|\bshaded count\b|\bhow many more parts?\b|\bhow many parts?\b.*\b(?:shaded|unshaded)\b/.test(t);

  if (!representationPrompt) {
    return null;
  }

  const numbers = numericTokens(normalized);
  const fractions = fractionTokens(normalized);
  let computedAnswer: string | null = null;

  const equalParts = t.match(/(?:split|divided|cut|has)\s+(?:into\s+)?(\d+)\s+equal\s+(?:parts?|pieces?|sectors?)/);
  const totalParts = equalParts ? Number(equalParts[1]) : null;

  const unshadedCount = t.match(/\b(\d+)\s+(?:(?:parts?|pieces?|sectors?)\s+)?(?:are|is)\s+unshaded\b/);
  const shadedCount = t.match(/\b(\d+)\s+(?:(?:parts?|pieces?|sectors?)\s+)?(?:are|is)\s+shaded\b/);

  if (totalParts && /\bwhat fraction\b|\bwhich fraction\b/.test(t)) {
    if (shadedCount) {
      computedAnswer = `${Number(shadedCount[1])}/${totalParts}`;
    } else if (unshadedCount) {
      computedAnswer = `${totalParts - Number(unshadedCount[1])}/${totalParts}`;
    }
  }

  if (
    totalParts &&
    /\bshaded count\b|\bhow many parts?\b/.test(t) &&
    fractions.length >= 1
  ) {
    const targetFraction = fractions[fractions.length - 1].value;
    const targetValue = fractionToNumber(targetFraction);

    if (targetValue !== null) {
      const targetParts = targetValue * totalParts;

      if (/\bhow many more parts?\b/.test(t)) {
        const already =
          t.match(/\b(\d+)\s+parts?\s+(?:is|are)\s+already\s+shaded\b/) ??
          t.match(/\b(\d+)\s+part\s+is\s+already\s+shaded\b/);
        const current = already ? Number(already[1]) : 0;
        computedAnswer = formatNumber(targetParts - current);
      } else {
        computedAnswer = formatNumber(targetParts);
      }
    }
  }

  if (
    totalParts &&
    /\bunshaded\b/.test(t) &&
    /\bhow many parts?\b/.test(t) &&
    fractions.length >= 1 &&
    !computedAnswer
  ) {
    const value = fractionToNumber(fractions[0].value);
    if (value !== null) {
      computedAnswer = formatNumber(value * totalParts);
    }
  }

  // "Which shaded count represents three eighths?" does not always contain
  // the phrase "how many parts" but is still a representation/count task.
  if (
    totalParts &&
    /\bshaded count\b.*\brepresents?\b/.test(t) &&
    fractions.length >= 1 &&
    !computedAnswer
  ) {
    const value = fractionToNumber(fractions[0].value);
    if (value !== null) {
      computedAnswer = formatNumber(value * totalParts);
    }
  }

  // "What fraction of 2 kilograms is 235 grams?"
  if (/\bwhat fraction of\b/.test(t) && numbers.length >= 2 && !computedAnswer) {
    const unitsNeedKgToG = /kilograms?|\bkg\b/.test(t) && /grams?|\bg\b/.test(t);
    let whole = numbers[0];
    let part = numbers[1];

    if (unitsNeedKgToG) {
      whole *= 1000;
    }

    if (whole !== 0) {
      computedAnswer = formatFraction({
        numerator: Math.round(part),
        denominator: Math.round(whole),
      });
    }
  }

  return {
    problemStructure: "fraction_representation",
    requiredReasoning: unique([
      "fraction_representation",
      /\bwhat fraction of\b/.test(t) ? "fraction_division" : "fraction_of_quantity",
      /kilograms?|\bkg\b|grams?|\bg\b/.test(t) ? "unit_conversion" : "fraction_representation",
    ]),
    relationships: [
      relationship(
        "part_of",
        text,
        0.96,
      ),
    ],
    computedAnswer,
    confidence: 0.96,
    reasonCode: "STRUCTURE_FRACTION_REPRESENTATION",
  };
}

function fractionComparisonAnalysis(
  text: string,
  curriculum: CurriculumContext,
): StructureAnalysis | null {
  const t = lower(normalizeFractionText(text));
  const primarySkill = lower(curriculum.primarySkill ?? "");

  if (
    !/compare and order fractions|\bcompare\b|\border\b|\bincreasing order\b|\bdecreasing order\b|\bgreater\b|\bless\b|\blargest\b|\bsmallest\b/.test(
      `${primarySkill} ${t}`,
    )
  ) {
    return null;
  }

  return {
    problemStructure: "fraction_comparison",
    requiredReasoning: [
      "fraction_comparison",
      "ordering",
    ],
    relationships: [],
    computedAnswer: null,
    confidence: 0.96,
    reasonCode: "STRUCTURE_FRACTION_COMPARISON",
  };
}

function fractionEquivalenceAnalysis(
  text: string,
  curriculum: CurriculumContext,
): StructureAnalysis | null {
  const t = lower(normalizeFractionText(text));
  const primarySkill = lower(curriculum.primarySkill ?? "");

  if (!/equivalent|same value|equivalence/.test(`${primarySkill} ${t}`)) {
    return null;
  }

  return {
    problemStructure: "fraction_equivalence",
    requiredReasoning: [
      "fraction_equivalence",
    ],
    relationships: [
      relationship(
        "equals",
        text,
        0.96,
      ),
    ],
    computedAnswer: null,
    confidence: 0.96,
    reasonCode: "STRUCTURE_FRACTION_EQUIVALENCE",
  };
}

function fractionOfQuantityAnalysis(
  text: string,
  curriculum: CurriculumContext,
): StructureAnalysis | null {
  const normalized = normalizeFractionText(text);
  const t = lower(normalized);
  const skill = curriculumSkillText(curriculum);
  const fractions = fractionTokens(normalized);

  const skillSaysOfQuantity =
    /find a fraction of a quantity|fractions? of sets?|fraction of a quantity/.test(skill);

  const directOf = normalized.match(
    /(-?\d+\s+\d+\/\d+|-?\d+\/\d+)\s+of\s+(\d[\d,]*(?:\.\d+)?)/i,
  );

  const wordOf = normalized.match(
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(half|halves|third|thirds|quarter|quarters|fourth|fourths|fifth|fifths|sixth|sixths|seventh|sevenths|eighth|eighths|ninth|ninths|tenth|tenths|eleventh|elevenths|twelfth|twelfths)\s+(?:of\s+)?(?:the\s+)?(?:\w+\s+){0,3}?(?:are|is)?\s*(?:\w+)?/i,
  );

  if (!skillSaysOfQuantity && !directOf && !wordOf) {
    return null;
  }

  let fraction: FractionValue | null = null;
  let whole: number | null = null;

  if (directOf) {
    fraction = parseFractionToken(directOf[1]);
    whole = parseNumeric(directOf[2]);
  } else if (fractions.length >= 1) {
    fraction = fractions[0].value;
    const values = numericTokens(normalized).filter((value) => value > 1);
    whole = values.length > 0 ? Math.max(...values) : null;
  }

  let computedAnswer: string | null = null;

  if (fraction && whole !== null) {
    const value = fractionToNumber(fraction);
    if (value !== null) {
      computedAnswer = formatNumber(value * whole);
    }
  }

  return {
    problemStructure: "fraction_of_quantity",
    requiredReasoning: [
      "fraction_of_quantity",
      "fraction_multiplication",
      "division",
      "multiplication",
    ],
    relationships: [
      relationship(
        "fraction_of",
        text,
        0.97,
        fraction && whole !== null
          ? `${formatFraction(fraction)} of ${whole}`
          : null,
      ),
    ],
    computedAnswer,
    confidence: 0.97,
    reasonCode: "STRUCTURE_FRACTION_OF_QUANTITY",
  };
}

function fractionMultiStepAnalysis(
  text: string,
  curriculum: CurriculumContext,
): StructureAnalysis | null {
  const normalized = normalizeFractionText(text);
  const t = lower(normalized);
  const skill = curriculumSkillText(curriculum);
  const fractions = fractionTokens(normalized);

  const skillIsMultiStep =
    /multi-step fraction|solve fraction problems|fraction relationship|overlapping-set|advanced fraction/.test(skill);

  const narrativeMultiStep =
    fractions.length >= 1 &&
    (
      /\bthen\b|\bafter that\b|\bremaining\b|\brest\b|\bleft\b|\btransferred?\b|\bgave\b.*\bthen\b|\baltogether\b/.test(t)
    ) &&
    numericTokens(normalized).length >= 2;

  const relationalFractions =
    fractions.length >= 2 &&
    /\bequal to\b|\bas many\b|\bas much\b|\bremaining\b|\brest\b|\bof the number\b/.test(t);

  const identicalPiecesReasoning =
    /identical\s+(?:pies?|cakes?|objects?)/.test(t) &&
    /equal pieces?/.test(t) &&
    /heavier|lighter|difference/.test(t);

  if (
    !skillIsMultiStep &&
    !narrativeMultiStep &&
    !relationalFractions &&
    !identicalPiecesReasoning
  ) {
    return null;
  }

  let computedAnswer: string | null = null;

  // Equal-mass pies cut into a and b equal pieces; piece-mass difference d.
  const pieDifference = t.match(
    /cut into\s+(\d+)\s+equal pieces?.*?cut into\s+(\d+)\s+equal pieces?.*?(\d+(?:\.\d+)?)\s*g\s+(?:heavier|lighter)/,
  );

  if (pieDifference) {
    const a = Number(pieDifference[1]);
    const b = Number(pieDifference[2]);
    const difference = Number(pieDifference[3]);
    const denominator = Math.abs(b - a);
    if (a > 0 && b > 0 && denominator > 0) {
      computedAnswer = formatNumber((difference * a * b) / denominator);
    }
  }

  // Pizza/pieces pattern: total pieces, one given away, a fraction left.
  if (!computedAnswer && /pizza/.test(t) && /equal pieces?/.test(t) && /was left/.test(t)) {
    const totalMatch = t.match(/into\s+(\d+)\s+equal pieces?/);
    const gaveMatch = t.match(/gave\s+(\d+)\s+piece/);
    const leftFraction = fractions[0]?.value ?? null;

    if (totalMatch && gaveMatch && leftFraction) {
      const total = Number(totalMatch[1]);
      const gave = Number(gaveMatch[1]);
      const leftValue = fractionToNumber(leftFraction);
      if (leftValue !== null) {
        computedAnswer = formatNumber(total - gave - total * leftValue);
      }
    }
  }

  // Money reverse-fraction pattern: gives f of money, then fixed amount, then has remainder.
  if (!computedAnswer && /money/.test(t) && /gave/.test(t) && fractions.length >= 1) {
    const fixedAmounts = Array.from(
      normalized.matchAll(/\$\s*(\d+(?:\.\d+)?)/g),
    ).map((match) => Number(match[1]));

    const fraction = fractions[0].value;
    const fractionValue = fractionToNumber(fraction);

    if (
      fixedAmounts.length >= 2 &&
      fractionValue !== null &&
      fractionValue < 1
    ) {
      const remainderAfterFraction =
        fixedAmounts[0] + fixedAmounts[1];
      computedAnswer = formatNumber(
        remainderAfterFraction / (1 - fractionValue),
      );
    }
  }

  return {
    problemStructure: "fraction_multi_step",
    requiredReasoning: unique([
      "fraction_multi_step",
      fractions.length > 0 ? "fraction_of_quantity" : "fraction_multi_step",
      /\btransferred?\b|\bgave\b|\bleft\b|\bremaining\b|\brest\b/.test(t)
        ? "subtraction"
        : "comparison",
      /\bequal to\b|\bas many\b|\bas much\b/.test(t)
        ? "comparison"
        : "multiplication",
    ]),
    relationships: [
      relationship(
        "depends_on",
        text,
        0.94,
      ),
    ],
    computedAnswer,
    confidence: 0.94,
    reasonCode: "STRUCTURE_FRACTION_MULTI_STEP",
  };
}

function fractionAnalysis(
  text: string,
  curriculum: CurriculumContext,
): StructureAnalysis {
  const operation = fractionOperationAnalysis(text);
  if (operation) return operation;

  const equivalence = fractionEquivalenceAnalysis(text, curriculum);
  if (equivalence) return equivalence;

  const comparison = fractionComparisonAnalysis(text, curriculum);
  if (comparison) return comparison;

  const multiStep = fractionMultiStepAnalysis(text, curriculum);
  if (multiStep) return multiStep;

  const representation = fractionRepresentationAnalysis(text, curriculum);
  if (representation) return representation;

  const ofQuantity = fractionOfQuantityAnalysis(text, curriculum);
  if (ofQuantity) return ofQuantity;

  return {
    problemStructure: "fraction_multi_step",
    requiredReasoning: [
      "fraction_multi_step",
    ],
    relationships: [],
    computedAnswer: null,
    confidence: 0.72,
    reasonCode: "STRUCTURE_FRACTION_GENERIC_FALLBACK",
  };
}

export function inferFractionSupplementalReasoning(
  text: string,
): RequiredReasoning[] {
  if (!hasFractionSignal(text)) return [];

  const normalized = normalizeFractionText(text);
  const t = lower(normalized);
  const fractions = fractionTokens(normalized);
  const reasoning: RequiredReasoning[] = [];

  if (/\bwhat fraction of\b/.test(t)) {
    reasoning.push("fraction_representation", "fraction_division");
  }

  if (/\bsubtract\b|\bminus\b/.test(t) || /\d+\/\d+\s*-\s*\d+\/\d+/.test(t)) {
    reasoning.push("fraction_subtraction");
  }

  if (/\badd\b|\bplus\b/.test(t) || /\d+\/\d+\s*\+\s*\d+\/\d+/.test(t)) {
    reasoning.push("fraction_addition");
  }

  const explicitFractionOf =
    /(?:\d+\s+)?\d+\s*\/\s*\d+\s+of\b/.test(normalized) ||
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(half|halves|third|thirds|quarter|quarters|fourth|fourths|fifth|fifths|sixth|sixths|seventh|sevenths|eighth|eighths|ninth|ninths|tenth|tenths|eleventh|elevenths|twelfth|twelfths)\s+of\b/.test(t) ||
    /\b(?:as many|as much)\b/.test(t);

  if (explicitFractionOf && !/\bwhat fraction of\b/.test(t)) {
    reasoning.push("fraction_of_quantity", "fraction_multiplication");
  }

  if (
    /(?:×|\*)\s*(?:\d+\s+)?\d+\s*\/\s*\d+|(?:\d+\s+)?\d+\s*\/\s*\d+\s*(?:×|\*)/.test(normalized)
  ) {
    reasoning.push("fraction_multiplication");
  }

  if (/\bequivalent\b|\bsame value\b/.test(t)) {
    reasoning.push("fraction_equivalence");
  }

  if (/\bcompare\b|\border\b|\bgreater\b|\bless\b|\blargest\b|\bsmallest\b/.test(t)) {
    reasoning.push("fraction_comparison");
  }

  if (
    fractions.length >= 2 &&
    /\bthen\b|\bremaining\b|\brest\b|\bleft\b|\btransferred?\b|\bequal to\b/.test(t)
  ) {
    reasoning.push("fraction_multi_step");
  }

  if (
    reasoning.length === 0 &&
    /\bfraction\b|\bfractions\b|\bequal parts?\b|\bshaded\b|\bunshaded\b/.test(t)
  ) {
    reasoning.push("fraction_representation");
  }

  return unique(reasoning);
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

  // Semantic special cases must run before generic equation/domain rules.
  const symbolMapping =
    symbolMappingAnalysis(text);

  if (symbolMapping) return symbolMapping;

  const ringSequence = identifyRingArrivalIncrementPattern(text);
  if (ringSequence) {
    // The target has TWO values (a named term and the total). Do not assert a
    // single scalar computed answer or falsely mark a valid MCQ as mismatched.
    return {
      problemStructure: "pattern_rule",
      requiredReasoning: ["pattern_application", "addition", "multiplication"],
      relationships: [relationship("sequence_rule", text, 0.96)],
      computedAnswer: null,
      confidence: 0.96,
      reasonCode: "STRUCTURE_RING_ARRIVAL_CONSTANT_INCREMENT",
    };
  }

  const transferDifference =
    transferDifferenceAnalysis(text);

  if (transferDifference) return transferDifference;

  const recursivePattern =
    recursivePatternAnalysis(text);

  if (recursivePattern) return recursivePattern;

  const digitFrequency =
    digitFrequencyAnalysis(text);

  if (digitFrequency) return digitFrequency;

  const ageRelationship =
    ageRelationshipAnalysis(text);

  if (ageRelationship) return ageRelationship;

  const commonMultipleCycle =
    commonMultipleCycleAnalysis(text);

  if (commonMultipleCycle) return commonMultipleCycle;

  const unitaryScaling =
    unitaryScalingAnalysis(text);

  if (unitaryScaling) return unitaryScaling;

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
    return fractionAnalysis(text, curriculum);
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
