import type {
  CanonicalAnswerContext,
} from "../../canonical";

import type {
  AnswerValidation,
} from "../types";

function normalizeText(
  value: string,
): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}


const FRACTION_WORD_NUMERATORS: Record<string, number> = {
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

function normalizeVulgarFractions(value: string): string {
  const map: Record<string, string> = {
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

  let next = value;
  for (const [symbol, replacement] of Object.entries(map)) {
    next = next.split(symbol).join(replacement);
  }
  return next.replace(/[‐‑‒–—]/g, "-");
}

function parseFractionValue(
  value: string,
): number | null {
  const normalized = normalizeText(
    normalizeVulgarFractions(value),
  )
    .replace(/\bone-quarter\b/g, "one quarter")
    .replace(/\bone-half\b/g, "one half")
    .replace(/\bthree-quarters\b/g, "three quarters");

  const mixed = normalized.match(
    /^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/,
  );
  if (mixed) {
    const whole = Number(mixed[1]);
    const numerator = Number(mixed[2]);
    const denominator = Number(mixed[3]);
    if (denominator === 0) return null;
    return whole + (whole < 0 ? -1 : 1) * numerator / denominator;
  }

  const slash = normalized.match(
    /^(-?\d+)\s*\/\s*(-?\d+)$/,
  );
  if (slash) {
    const numerator = Number(slash[1]);
    const denominator = Number(slash[2]);
    if (denominator === 0) return null;
    return numerator / denominator;
  }

  const words = normalized.match(
    /^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(half|halves|third|thirds|quarter|quarters|fourth|fourths|fifth|fifths|sixth|sixths|seventh|sevenths|eighth|eighths|ninth|ninths|tenth|tenths|eleventh|elevenths|twelfth|twelfths)$/,
  );
  if (words) {
    const numerator = FRACTION_WORD_NUMERATORS[words[1]];
    const denominator = FRACTION_WORD_DENOMINATORS[words[2]];
    if (numerator && denominator) return numerator / denominator;
  }

  return null;
}

function stripThousands(
  value: string,
): string {
  return value.replace(/,/g, "");
}

function parseMoneyCents(
  value: string,
): number | null {
  const normalized =
    normalizeText(value);

  const dollars =
    normalized.match(
      /^\$\s*(-?\d[\d,]*(?:\.\d+)?)$/,
    );

  if (dollars) {
    const number = Number(
      stripThousands(dollars[1]),
    );

    return Number.isFinite(number)
      ? Math.round(number * 100)
      : null;
  }

  const cents =
    normalized.match(
      /^(-?\d[\d,]*(?:\.\d+)?)\s*¢$/,
    );

  if (cents) {
    const number = Number(
      stripThousands(cents[1]),
    );

    return Number.isFinite(number)
      ? Math.round(number)
      : null;
  }

  return null;
}

function parseNumber(
  value: string,
): number | null {
  const normalized = value
    .replace(/[$,]/g, "")
    .replace(/%$/, "")
    .replace(
      /\s*(?:cm|mm|m|km|g|kg|ml|l|degrees?|°|years?|months?|weeks?|days?|hours?|hrs?|minutes?|mins?|seconds?|secs?|parts?|pieces?|items?|beads?|boxes?)$/i,
      "",
    )
    .trim();

  if (!normalized) return null;

  const number = Number(normalized);

  return Number.isFinite(number)
    ? number
    : null;
}

function expectedComparable(
  answer: CanonicalAnswerContext,
): string | null {
  const canonical =
    answer.canonicalAnswer;

  if (!canonical) {
    return answer.rawAnswer;
  }

  switch (canonical.type) {
    case "number":
      return `${canonical.value}${
        canonical.unit ?? ""
      }`;

    case "text":
      return canonical.value;

    case "option":
      return (
        canonical.text ??
        answer.rawAnswer ??
        canonical.key
      );

    case "multiple_options":
      return canonical.keys
        .slice()
        .sort()
        .join("|");

    case "multipart":
      return null;
  }
}

export function validateComputedAnswer(args: {
  answer: CanonicalAnswerContext;
  computedAnswer: string | null;
}): AnswerValidation {
  const {
    answer,
    computedAnswer,
  } = args;

  if (!computedAnswer) {
    return {
      status: "not_checked",
      expected:
        answer.rawAnswer ?? null,
      computed: null,
      reason:
        "No safe deterministic result was computed. The stored answer was not used to infer the question structure.",
    };
  }

  const expectedRaw =
    expectedComparable(answer);

  if (!expectedRaw) {
    return {
      status: "not_checked",
      expected: null,
      computed: computedAnswer,
      reason:
        "The stored answer could not be normalized for validation.",
    };
  }

  const expectedMoney =
    parseMoneyCents(expectedRaw);
  const computedMoney =
    parseMoneyCents(computedAnswer);

  if (
    expectedMoney !== null &&
    computedMoney !== null
  ) {
    const matched =
      expectedMoney ===
      computedMoney;

    return {
      status: matched
        ? "matched"
        : "mismatched",
      expected: expectedRaw,
      computed: computedAnswer,
      reason: matched
        ? "Deterministic understanding is consistent with the stored money answer."
        : "Deterministic understanding produced a money result that does not match the stored answer.",
    };
  }

  const expectedFraction =
    parseFractionValue(expectedRaw);
  const computedFraction =
    parseFractionValue(computedAnswer);

  if (
    expectedFraction !== null &&
    computedFraction !== null
  ) {
    const matched =
      Math.abs(expectedFraction - computedFraction) < 1e-9;

    return {
      status: matched
        ? "matched"
        : "mismatched",
      expected: expectedRaw,
      computed: computedAnswer,
      reason: matched
        ? "Deterministic understanding is consistent with the stored fraction answer."
        : "Deterministic understanding produced a fraction result that does not match the stored answer.",
    };
  }

  const expectedNumber =
    parseNumber(expectedRaw);
  const computedNumber =
    parseNumber(computedAnswer);

  if (
    expectedNumber !== null &&
    computedNumber !== null
  ) {
    const matched =
      Math.abs(
        expectedNumber -
          computedNumber,
      ) < 1e-9;

    return {
      status: matched
        ? "matched"
        : "mismatched",
      expected: expectedRaw,
      computed: computedAnswer,
      reason: matched
        ? "Deterministic understanding is consistent with the stored numeric answer."
        : "Deterministic understanding produced a numeric result that does not match the stored answer.",
    };
  }

  const expectedText =
    normalizeText(expectedRaw);
  const computedText =
    normalizeText(computedAnswer);

  const matched =
    expectedText ===
    computedText;

  return {
    status: matched
      ? "matched"
      : "mismatched",
    expected: expectedRaw,
    computed: computedAnswer,
    reason: matched
      ? "Deterministic understanding is consistent with the stored answer."
      : "Deterministic understanding produced a result that does not match the stored answer.",
  };
}
