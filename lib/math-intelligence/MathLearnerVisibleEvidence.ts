import type { MathIntelligenceQuestionInput } from "./MathIntelligenceTypes";

const SMALL_NUMBER_WORDS: Record<string, number> = {
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
};

const TENS_NUMBER_WORDS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const FRACTION_DENOMINATOR_WORDS: Record<string, number> = {
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
  hundredth: 100,
  hundredths: 100,
};

const UNIT_ALIASES: Array<[RegExp, string]> = [
  [/\bmillimet(?:re|er)s?\b|\bmm\b/gi, "mm"],
  [/\bcentimet(?:re|er)s?\b|\bcm\b/gi, "cm"],
  [/\bkilomet(?:re|er)s?\b|\bkm\b/gi, "km"],
  [/\bmet(?:re|er)s?\b|\bm\b/gi, "m"],
  [/\bkilograms?\b|\bkg\b/gi, "kg"],
  [/\bgrams?\b|\bg\b/gi, "g"],
  [/\bmillilit(?:re|er)s?\b|\bml\b/gi, "ml"],
  [/\blit(?:re|er)s?\b|\bl\b/gi, "l"],
  [/\bhours?\b|\bhrs?\b/gi, "h"],
  [/\bminutes?\b|\bmins?\b/gi, "min"],
  [/\bseconds?\b|\bsecs?\b/gi, "s"],
  [/\bdegrees?\b|°/gi, "deg"],
  [/\bsgd\b|\bdollars?\b|\$/gi, "sgd"],
  [/\bcents?\b|¢/gi, "cent"],
  [/%|\bpercent(?:age)?\b/gi, "%"],
];

export type MathVisibleTimeCandidate = {
  hour: number;
  minute: number;
};

export type MathLearnerVisibleEvidence = {
  learner_text: string;
  classification_text: string;
  normalised_text: string;
  numeric_values: number[];
  units: string[];
  time_candidates: MathVisibleTimeCandidate[];
};

function uniqueNumbers(values: number[]) {
  const result: number[] = [];
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    if (!result.some((existing) => Math.abs(existing - value) <= 1e-9)) {
      result.push(value);
    }
  }
  return result;
}

function normaliseText(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[–—−]/g, "-")
    .replace(/[^a-z0-9%$¢°./:+\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function learnerVisibleQuestionText(input: MathIntelligenceQuestionInput) {
  return [
    input.instruction,
    input.prompt,
    ...input.options.map((option) => option.text),
  ]
    .filter(Boolean)
    .join(" \n ")
    .trim();
}

/**
 * Classification context may use curriculum metadata, but deliberately excludes
 * explanation/correct-answer fields because they are not learner-visible facts.
 */
export function mathClassificationText(input: MathIntelligenceQuestionInput) {
  return [
    input.topic,
    input.skill,
    learnerVisibleQuestionText(input),
  ]
    .filter(Boolean)
    .join(" \n ")
    .toLocaleLowerCase();
}

export function extractNumericLiterals(text: string) {
  const values: number[] = [];
  for (const match of text.matchAll(/(?<![a-z])(-?\d[\d,]*(?:\.\d+)?)(?![a-z])/gi)) {
    const value = Number(match[1].replace(/,/g, ""));
    if (Number.isFinite(value)) values.push(value);
  }
  return values;
}

function extractNumberWords(text: string) {
  const tokens = text
    .toLocaleLowerCase()
    .replace(/-/g, " ")
    .match(/[a-z]+/g) || [];

  const values: number[] = [];
  let current = 0;
  let total = 0;
  let active = false;

  function flush() {
    if (active) values.push(total + current);
    current = 0;
    total = 0;
    active = false;
  }

  for (const token of tokens) {
    if (token in SMALL_NUMBER_WORDS) {
      current += SMALL_NUMBER_WORDS[token];
      active = true;
      continue;
    }
    if (token in TENS_NUMBER_WORDS) {
      current += TENS_NUMBER_WORDS[token];
      active = true;
      continue;
    }
    if (token === "hundred" && active) {
      current = Math.max(1, current) * 100;
      continue;
    }
    if ((token === "thousand" || token === "million") && active) {
      const scale = token === "thousand" ? 1_000 : 1_000_000;
      total += Math.max(1, current) * scale;
      current = 0;
      continue;
    }
    if (token === "and" && active) continue;

    flush();

    const denominator = FRACTION_DENOMINATOR_WORDS[token];
    if (denominator) {
      values.push(denominator);
      if (["half", "third", "quarter", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "twelfth", "hundredth"].includes(token)) {
        values.push(1);
      }
    }
  }

  flush();
  return values;
}

function numberWordValue(value: string) {
  const extracted = extractNumberWords(value);
  return extracted.length === 1 ? extracted[0] : null;
}

function extractTimeCandidates(text: string): MathVisibleTimeCandidate[] {
  const source = text.toLocaleLowerCase();
  const result: MathVisibleTimeCandidate[] = [];

  for (const match of source.matchAll(/\b([01]?\d|2[0-3])\s*:\s*([0-5]\d)\b/g)) {
    result.push({ hour: Number(match[1]), minute: Number(match[2]) });
  }

  const wordOrDigit = "([a-z-]+|\\d{1,2})";
  const patterns: Array<[RegExp, (hour: number) => MathVisibleTimeCandidate]> = [
    [new RegExp(`\\bhalf\\s+past\\s+${wordOrDigit}\\b`, "gi"), (hour) => ({ hour, minute: 30 })],
    [new RegExp(`\\bquarter\\s+past\\s+${wordOrDigit}\\b`, "gi"), (hour) => ({ hour, minute: 15 })],
    [new RegExp(`\\bquarter\\s+to\\s+${wordOrDigit}\\b`, "gi"), (hour) => ({ hour: (hour + 11) % 12 || 12, minute: 45 })],
    [new RegExp(`\\b${wordOrDigit}\\s+o['’]?clock\\b`, "gi"), (hour) => ({ hour, minute: 0 })],
  ];

  for (const [pattern, make] of patterns) {
    for (const match of source.matchAll(pattern)) {
      const token = match[1];
      const parsed = /^\d+$/.test(token) ? Number(token) : numberWordValue(token);
      if (parsed != null && parsed >= 0 && parsed <= 23) result.push(make(parsed));
    }
  }

  return result.filter(
    (candidate, index, list) =>
      list.findIndex(
        (other) => other.hour === candidate.hour && other.minute === candidate.minute,
      ) === index,
  );
}

export function normaliseMathUnit(value: string | null | undefined) {
  const source = String(value || "").trim().toLocaleLowerCase();
  if (!source) return null;

  for (const [pattern, canonical] of UNIT_ALIASES) {
    pattern.lastIndex = 0;
    if (pattern.test(source)) return canonical;
  }

  return source.replace(/\s+/g, "_");
}

function extractUnits(text: string) {
  const units: string[] = [];
  for (const [pattern, canonical] of UNIT_ALIASES) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) units.push(canonical);
  }
  return [...new Set(units)];
}

export function buildMathLearnerVisibleEvidence(
  input: MathIntelligenceQuestionInput,
): MathLearnerVisibleEvidence {
  const learnerText = learnerVisibleQuestionText(input);
  return {
    learner_text: learnerText,
    classification_text: mathClassificationText(input),
    normalised_text: normaliseText(learnerText),
    numeric_values: uniqueNumbers([
      ...extractNumericLiterals(learnerText),
      ...extractNumberWords(learnerText),
    ]),
    units: extractUnits(learnerText),
    time_candidates: extractTimeCandidates(learnerText),
  };
}

export function evidenceContainsNumber(
  evidence: MathLearnerVisibleEvidence,
  value: number,
) {
  const tolerance = Math.max(1e-9, Math.abs(value) * 1e-9);
  return evidence.numeric_values.some(
    (candidate) => Math.abs(candidate - value) <= tolerance,
  );
}

export function evidenceContainsUnit(
  evidence: MathLearnerVisibleEvidence,
  unit: string | null | undefined,
) {
  const raw = String(unit || "").trim();
  const canonical = normaliseMathUnit(raw);
  if (!canonical) return true;
  if (evidence.units.includes(canonical)) return true;

  // Luna may preserve contextual count units such as “stickers” or “books”.
  // Those are valid only when the same learner-visible noun is present.
  const literal = raw
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return Boolean(literal) && evidence.normalised_text.includes(literal);
}

export function evidenceContainsLabel(
  evidence: MathLearnerVisibleEvidence,
  label: string | null | undefined,
) {
  const clean = normaliseText(String(label || ""));
  if (!clean) return true;
  return evidence.normalised_text.includes(clean);
}

export function evidenceContainsTime(
  evidence: MathLearnerVisibleEvidence,
  hour: number,
  minute: number,
) {
  return evidence.time_candidates.some((candidate) => {
    const exact = candidate.hour === hour && candidate.minute === minute;
    const analogueEquivalent =
      candidate.minute === minute &&
      ((candidate.hour % 12) || 12) === ((hour % 12) || 12);
    return exact || analogueEquivalent;
  });
}
