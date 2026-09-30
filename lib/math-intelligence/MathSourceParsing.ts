/**
 * Source-bound parsing helpers used by Phase 2I Coverage Expansion Pass 2.
 *
 * These helpers intentionally inspect learner-visible wording only. They never
 * read correct answers or explanations and therefore cannot reconstruct hidden
 * answers. Their purpose is to recognise safe source relationships before Luna.
 */

export type ParsedVisibleComparison = {
  left_label: string | null;
  right_label: string | null;
  difference: number;
  unit: string | null;
  left_value: number | null;
  left_value_unit: string | null;
  left_is_larger: boolean;
};

export type ParsedVisibleRatio = {
  left_label: string | null;
  right_label: string | null;
  left_units: number;
  right_units: number;
};

export type ParsedVisibleDataPair = {
  label: string;
  value: number;
  unit: string | null;
};

function finite(value: number) {
  return Number.isFinite(value);
}

function numeric(raw: string | undefined) {
  if (!raw) return null;
  const value = Number(raw.replace(/,/g, ""));
  return finite(value) ? value : null;
}

function gcd(a: number, b: number) {
  let left = Math.abs(Math.round(a));
  let right = Math.abs(Math.round(b));
  while (right) {
    const next = left % right;
    left = right;
    right = next;
  }
  return left || 1;
}

function canonicalUnit(raw: string | null | undefined) {
  const clean = String(raw || "").trim().toLocaleLowerCase();
  if (!clean) return null;
  if (["$", "dollar", "dollars", "sgd"].includes(clean)) return "sgd";
  if (["¢", "cent", "cents"].includes(clean)) return "cent";
  if (/^(?:mm|cm|m|km|g|kg|ml|l)$/.test(clean)) return clean;
  if (/^degrees?$/.test(clean) || clean === "°") return "deg";
  return clean;
}

function cleanLabel(value: string | null | undefined) {
  const clean = String(value || "")
    .replace(/[“”"()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:there\s+(?:are|were|is|was)\s+|the\s+number\s+of\s+)/i, "")
    .replace(/\s+(?:in|at|after|before|when|who|that|which)\b.*$/i, "")
    .replace(/\s+(?:has|have|had|is|are|was|were|costs?|measures?)$/i, "")
    .trim();
  if (!clean || /^(?:which|it|they|he|she|there)$/i.test(clean)) return null;
  return clean.slice(0, 48);
}

function nearestSubjectBefore(text: string, endIndex: number) {
  const before = text.slice(Math.max(0, endIndex - 180), endIndex);
  const matches = [...before.matchAll(/\b([A-Za-z][A-Za-z0-9'’ -]{0,44}?)\s+(?:has|have|had|is|are|was|were|costs?|measures?|measured|contains?)\b/gi)];
  if (matches.length === 0) return null;
  const candidate = cleanLabel(matches[matches.length - 1][1]);
  if (candidate && !/^(?:which|that)$/i.test(candidate)) return candidate;

  const first = before.match(/\b([A-Za-z][A-Za-z0-9'’ -]{0,36}?)\s+(?:has|have|had|is|are|was|were)\b/i);
  return cleanLabel(first?.[1]);
}

function nearestKnownValueBefore(text: string, endIndex: number) {
  const before = text.slice(Math.max(0, endIndex - 180), endIndex);
  const matches = [...before.matchAll(/(?:\$\s*)?(\d[\d,]*(?:\.\d+)?)\s*(mm|cm|m|km|kg|g|ml|l|¢|cents?|dollars?)?/gi)];
  if (matches.length === 0) return { value: null, unit: null };
  const match = matches[matches.length - 1];
  return {
    value: numeric(match[1]),
    unit: canonicalUnit(match[2] || (match[0].includes("$") ? "$" : null)),
  };
}

/**
 * Recognises an explicit additive comparison such as:
 * - “String B is 281 cm long and is 68 cm shorter than String C.”
 * - “Edward has $40 more than Faith.”
 * - “Chan has 28 more stamps than Sedap.”
 *
 * The returned difference is always source-visible. The base value is optional.
 */
export function parseVisibleAdditiveComparison(text: string): ParsedVisibleComparison | null {
  const match = text.match(/(?:\$\s*)?(\d[\d,]*(?:\.\d+)?)\s*(mm|cm|m|km|kg|g|ml|l|¢|cents?|dollars?)?\s+(fewer|less|more|greater|shorter|longer)\s+than\s+([A-Za-z][A-Za-z0-9'’ -]{0,48})/i);
  if (!match || match.index == null) return null;

  const difference = numeric(match[1]);
  if (difference == null || difference < 0) return null;

  const comparator = match[3].toLocaleLowerCase();
  const leftIsLarger = ["more", "greater", "longer"].includes(comparator);
  const leftLabel = nearestSubjectBefore(text, match.index);
  const rightLabel = cleanLabel(match[4]);
  const known = nearestKnownValueBefore(text, match.index);

  // The number immediately before “more/less than” is the difference itself.
  // nearestKnownValueBefore may select an earlier source value; if it selected
  // the difference from adjacent wording, discard it.
  const leftValue = known.value != null && Math.abs(known.value - difference) > 1e-9
    ? known.value
    : null;

  return {
    left_label: leftLabel,
    right_label: rightLabel,
    difference,
    unit: canonicalUnit(match[2]) || known.unit,
    left_value: leftValue,
    left_value_unit: known.unit,
    left_is_larger: leftIsLarger,
  };
}

function ratioFromFraction(numerator: number, denominator: number) {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || numerator <= 0 || denominator <= 0) return null;
  const divisor = gcd(numerator, denominator);
  return { left: numerator / divisor, right: denominator / divisor };
}

/** Recognises source-explicit two-quantity multiplicative relationships. */
export function parseVisibleRatioRelation(text: string): ParsedVisibleRatio | null {
  const source = text.replace(/\s+/g, " ").trim();

  // Pass 2 currently supports two-term ratios only. A multi-term source such
  // as 2:6:5 must not be silently collapsed into an arbitrary two-term pair.
  // Leave it unresolved so the caller can route it to review/Luna until a
  // dedicated multi-part ratio representation exists.
  if (/\b\d+\s*:\s*\d+\s*:\s*\d+\b/.test(source)) {
    return null;
  }

  // Explicit “ratio of A to B is 3:5”.
  const explicit = source.match(/ratio\s+of\s+([A-Za-z][A-Za-z0-9'’ -]{0,36}?)\s+to\s+([A-Za-z][A-Za-z0-9'’ -]{0,36}?)\s+(?:is|=)\s*(\d+)\s*:\s*(\d+)/i);
  if (explicit) {
    const pair = ratioFromFraction(Number(explicit[3]), Number(explicit[4]));
    if (pair) return {
      left_label: cleanLabel(explicit[1]),
      right_label: cleanLabel(explicit[2]),
      left_units: pair.left,
      right_units: pair.right,
    };
  }

  // “A and B ... in the ratio 3:5” (labels are optional because extracting
  // compound lists reliably is intentionally conservative).
  const plain = source.match(/\b(?:in\s+the\s+ratio|ratio(?:\s+is)?)\s*(\d+)\s*:\s*(\d+)\b/i);
  if (plain) {
    const pair = ratioFromFraction(Number(plain[1]), Number(plain[2]));
    if (pair) return { left_label: null, right_label: null, left_units: pair.left, right_units: pair.right };
  }

  // “There were 3/4 as many boys as girls.”
  const fractional = source.match(/(?:there\s+(?:are|were)\s+)?(\d+)\s*\/\s*(\d+)\s+as\s+many\s+([A-Za-z][A-Za-z0-9'’ -]{0,30}?)\s+as\s+([A-Za-z][A-Za-z0-9'’ -]{0,40})/i);
  if (fractional) {
    const pair = ratioFromFraction(Number(fractional[1]), Number(fractional[2]));
    if (pair) return {
      left_label: cleanLabel(fractional[3]),
      right_label: cleanLabel(fractional[4]),
      left_units: pair.left,
      right_units: pair.right,
    };
  }

  // “Box B had 7/9 as many beads as Box A.”
  const ownedFractional = source.match(/\b([A-Za-z][A-Za-z0-9'’ -]{0,34}?)\s+(?:has|have|had)\s+(\d+)\s*\/\s*(\d+)\s+as\s+many\s+[A-Za-z][A-Za-z0-9'’ -]{0,20}?\s+as\s+([A-Za-z][A-Za-z0-9'’ -]{0,34})/i);
  if (ownedFractional) {
    const pair = ratioFromFraction(Number(ownedFractional[2]), Number(ownedFractional[3]));
    if (pair) return {
      left_label: cleanLabel(ownedFractional[1]),
      right_label: cleanLabel(ownedFractional[4]),
      left_units: pair.left,
      right_units: pair.right,
    };
  }

  // “Three times as many boys as girls” / “twice as many …”.
  const times = source.match(/\b(twice|thrice|\d+\s+times?|two\s+times|three\s+times|four\s+times)\s+as\s+many\s+([A-Za-z][A-Za-z0-9'’ -]{0,30}?)\s+as\s+([A-Za-z][A-Za-z0-9'’ -]{0,40})/i);
  if (times) {
    const raw = times[1].toLocaleLowerCase();
    const multiplier = raw.startsWith("twice") || raw.startsWith("two")
      ? 2
      : raw.startsWith("thrice") || raw.startsWith("three")
        ? 3
        : raw.startsWith("four")
          ? 4
          : numeric(raw.match(/\d+/)?.[0]);
    if (multiplier && Number.isInteger(multiplier) && multiplier > 0) {
      return {
        left_label: cleanLabel(times[2]),
        right_label: cleanLabel(times[3]),
        left_units: multiplier,
        right_units: 1,
      };
    }
  }

  // “The number of red marbles is 3/4 of the number of blue marbles.”
  const ofRelation = source.match(/(?:the\s+number\s+of\s+)?([A-Za-z][A-Za-z0-9'’ -]{0,30}?)\s+(?:is|was|are|were)\s+(\d+)\s*\/\s*(\d+)\s+of\s+(?:the\s+)?(?:number\s+of\s+)?([A-Za-z][A-Za-z0-9'’ -]{0,38})/i);
  if (ofRelation) {
    const pair = ratioFromFraction(Number(ofRelation[2]), Number(ofRelation[3]));
    if (pair) return {
      left_label: cleanLabel(ofRelation[1]),
      right_label: cleanLabel(ofRelation[4]),
      left_units: pair.left,
      right_units: pair.right,
    };
  }

  return null;
}

function addDataPair(
  result: ParsedVisibleDataPair[],
  label: string | null | undefined,
  rawValue: string | undefined,
  rawUnit: string | null | undefined,
) {
  const cleanLabelValue = cleanLabel(label);
  const value = numeric(rawValue);
  if (!cleanLabelValue || value == null) return;
  if (/^(?:option|answer|level|question|q\d|p\d)$/i.test(cleanLabelValue)) return;
  const key = cleanLabelValue.toLocaleLowerCase();
  if (result.some((item) => item.label.toLocaleLowerCase() === key)) return;
  result.push({ label: cleanLabelValue, value, unit: canonicalUnit(rawUnit) });
}

/**
 * Extracts only explicit source data—not derived totals, differences, means or
 * answers. This lets deterministic charts/tables ignore Luna-added quantities.
 */
export function parseVisibleDataPairs(text: string): ParsedVisibleDataPair[] {
  const result: ParsedVisibleDataPair[] = [];
  const source = text.replace(/\r/g, "");

  // Label: 12 / Label = 12 / Label - 12.
  for (const match of source.matchAll(/\b([A-Za-z][A-Za-z0-9 '&/’-]{0,28}?)\s*(?::|=|-)\s*\$?\s*(-?\d[\d,]*(?:\.\d+)?)\s*(¢|cents?|dollars?|mm|cm|m|km|kg|g|ml|l)?\b/gi)) {
    addDataPair(result, match[1], match[2], match[3] || (match[0].includes("$") ? "$" : null));
  }

  // “Red raised $55”, “Blue received 11”, “Monday sold 42 cakes”.
  for (const match of source.matchAll(/\b([A-Za-z][A-Za-z0-9 '&/’-]{0,24}?)\s+(?:raised|received|saved|sold|scored|earned|has|had|have|was|were|is|are)\s+\$?\s*(-?\d[\d,]*(?:\.\d+)?)\s*(¢|cents?|dollars?|mm|cm|m|km|kg|g|ml|l)?\b/gi)) {
    addDataPair(result, match[1], match[2], match[3] || (match[0].includes("$") ? "$" : null));
  }

  // Matrix-like prose: “September: Allan $80, Bob $100”.
  for (const line of source.split(/\n|;/)) {
    const heading = line.match(/^\s*([A-Za-z][A-Za-z0-9 '’-]{1,24})\s*:\s*(.+)$/);
    if (!heading) continue;
    const group = cleanLabel(heading[1]);
    if (!group) continue;
    for (const match of heading[2].matchAll(/\b([A-Za-z][A-Za-z0-9 '’-]{0,24})\s+\$?\s*(-?\d[\d,]*(?:\.\d+)?)\s*(¢|cents?|dollars?|mm|cm|m|km|kg|g|ml|l)?\b/gi)) {
      addDataPair(
        result,
        `${group} ${cleanLabel(match[1]) || ""}`.trim(),
        match[2],
        match[3] || (match[0].includes("$") ? "$" : null),
      );
    }
  }

  return result.slice(0, 20);
}
