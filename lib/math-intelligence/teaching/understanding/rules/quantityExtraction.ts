import type {
  MathematicalQuantity,
} from "../types";

import {
  lower,
  unique,
} from "./text";

function parseNumber(
  value: string,
): number | null {
  const cleaned = value
    .replace(/,/g, "")
    .trim();

  if (!cleaned) return null;

  const numeric = Number(cleaned);

  return Number.isFinite(numeric)
    ? numeric
    : null;
}

export function extractQuantities(
  text: string,
): MathematicalQuantity[] {
  const results: MathematicalQuantity[] = [];
  const occupied = new Set<string>();

  const push = (
    raw: string,
    index: number,
    data: Partial<MathematicalQuantity>,
  ) => {
    const key = `${index}:${raw}`;

    if (occupied.has(key)) return;
    occupied.add(key);

    results.push({
      id: `q${results.length + 1}`,
      label: null,
      raw,
      value: null,
      numerator: null,
      denominator: null,
      unit: null,
      role: "given",
      sourceText: text,
      ...data,
    });
  };

  const rules: Array<{
    regex: RegExp;
    map: (
      match: RegExpMatchArray,
    ) => Partial<MathematicalQuantity>;
  }> = [
    {
      regex: /\$\s*\d[\d,]*(?:\.\d+)?/g,
      map: (match) => ({
        value: parseNumber(
          match[0].replace("$", ""),
        ),
        unit: "$",
      }),
    },
    {
      regex: /\b\d[\d,]*(?:\.\d+)?\s*¢/g,
      map: (match) => ({
        value: parseNumber(
          match[0].replace("¢", ""),
        ),
        unit: "¢",
      }),
    },
    {
      regex: /\b\d+\s*\/\s*\d+\b/g,
      map: (match) => {
        const [a, b] = match[0]
          .split("/")
          .map((part) => Number(part.trim()));

        return {
          numerator: Number.isFinite(a) ? a : null,
          denominator:
            Number.isFinite(b) ? b : null,
          value:
            Number.isFinite(a) &&
            Number.isFinite(b) &&
            b !== 0
              ? a / b
              : null,
          unit: "fraction",
        };
      },
    },
    {
      regex: /\b\d+(?:\.\d+)?\s*%/g,
      map: (match) => ({
        value: parseNumber(
          match[0].replace("%", ""),
        ),
        unit: "%",
      }),
    },
    {
      regex:
        /\b\d[\d,]*(?:\.\d+)?\s*(?:mm|cm|km|m|mg|g|kg|ml|l|°|degrees?|seconds?|secs?|minutes?|mins?|hours?|hrs?|days?|weeks?|months?|years?)\b/gi,
      map: (match) => {
        const parts = match[0]
          .trim()
          .split(/\s*/);

        const numberMatch =
          match[0].match(
            /^(\d[\d,]*(?:\.\d+)?)/,
          );

        const unit =
          numberMatch
            ? match[0]
                .slice(numberMatch[0].length)
                .trim()
            : null;

        return {
          value: numberMatch
            ? parseNumber(numberMatch[1])
            : null,
          unit,
        };
      },
    },
    {
      regex:
        /\b\d[\d,]*(?:\.\d+)?\s*(?:tens?|hundreds?|thousands?)\b/gi,
      map: (match) => {
        const numberMatch =
          match[0].match(
            /^(\d[\d,]*(?:\.\d+)?)/,
          );
        const unit = numberMatch
          ? match[0]
              .slice(numberMatch[0].length)
              .trim()
          : null;

        return {
          value: numberMatch
            ? parseNumber(numberMatch[1])
            : null,
          unit,
        };
      },
    },
  ];

  for (const rule of rules) {
    for (const match of text.matchAll(rule.regex)) {
      push(
        match[0],
        match.index ?? 0,
        rule.map(match),
      );
    }
  }

  // Plain numbers, skipping spans already represented by richer matches.
  for (
    const match of text.matchAll(
      /\b\d[\d,]*(?:\.\d+)?\b/g,
    )
  ) {
    const index = match.index ?? 0;

    const overlaps = results.some((item) => {
      const start =
        text.indexOf(item.raw);
      // Exact offset tracking is intentionally light-weight.
      // Richer unit/currency tokens are inserted first.
      return (
        item.raw.includes(match[0]) &&
        Math.abs(start - index) <
          Math.max(item.raw.length, 4)
      );
    });

    if (!overlaps) {
      push(match[0], index, {
        value: parseNumber(match[0]),
      });
    }
  }

  return results;
}

export function detectUnits(
  quantities: MathematicalQuantity[],
): string[] {
  return unique(
    quantities
      .map((quantity) => quantity.unit)
      .filter(
        (unit): unit is string =>
          Boolean(unit && unit !== "fraction"),
      ),
  );
}

export function numericValues(
  quantities: MathematicalQuantity[],
): number[] {
  return quantities
    .map((quantity) => quantity.value)
    .filter(
      (value): value is number =>
        typeof value === "number" &&
        Number.isFinite(value),
    );
}

export function moneyValueInCents(
  quantity: MathematicalQuantity,
): number | null {
  if (quantity.value === null) {
    return null;
  }

  if (quantity.unit === "$") {
    return Math.round(quantity.value * 100);
  }

  if (quantity.unit === "¢") {
    return Math.round(quantity.value);
  }

  return null;
}
