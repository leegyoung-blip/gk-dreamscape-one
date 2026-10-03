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
      /\s*(?:cm|mm|m|km|g|kg|ml|l|degrees?|°|years?|months?|weeks?|days?|hours?|hrs?|minutes?|mins?|seconds?|secs?)$/i,
      "",
    )
    // Count answers are commonly stored as text such as "54 boxes".
    // Strip a trailing alphabetic count/unit phrase only when the value
    // begins with a numeric token; non-numeric text answers are untouched.
    .replace(
      /^(-?\d+(?:\.\d+)?)\s+[a-z][a-z -]*$/i,
      "$1",
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
