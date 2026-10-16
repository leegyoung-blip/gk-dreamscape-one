/**
 * Deterministic reading of a narrowly evidenced constant-increment story.
 * Only a well-specified ring-by-ring arrival pattern is supported in 4E-2B-4.
 * It is intentionally NOT a generic Algebra classifier or answer-key checker.
 */
type IncrementPatternEvidence = Readonly<{
  first: number;
  second: number;
  increment: number;
  requestedRing: number;
  totalRings: number;
  requestedValue: number;
  totalValue: number;
}>;

const firstNumbers: Readonly<Record<string, number>> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};
const ordinalNumbers: Readonly<Record<string, number>> = {
  third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7,
  eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12,
};
function positiveInteger(raw: string): number | null {
  const number = Number(raw);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

/** Null means insufficient/inconsistent evidence; never guess the pattern. */
export function identifyRingArrivalIncrementPattern(text: string): IncrementPatternEvidence | null {
  const t = text.replace(/\s+/g, ' ').trim().toLowerCase();
  // The two anchoring observations, increment, total number of rings and
  // requested ordinal must ALL appear. Unrelated 'more than' stories do not match.
  const first = t.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+guests?\s+arrived\s+at\s+the\s+first\s+ring\b/);
  const second = t.match(/\b(\d+)\s+(?:guests?\s+arrived\s+)?at\s+the\s+second\s+ring\b/);
  const step = t.match(/\beach\s+later\s+ring\s+brought\s+(\d+)\s+more\s+guests?\s+than\s+the\s+previous\s+ring\b/);
  const total = t.match(/\bdoorbell\s+rang\s+(\d+)\s+times\b/);
  const requested = t.match(/\b(?:at\s+the\s+)(\d+(?:st|nd|rd|th)|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\s+ring\b/);
  if (!first || !second || !step || !total || !requested ||
      !/\bhow\s+many\s+guests\s+arrived\b/.test(t) ||
      !/\baltogether\b/.test(t)) return null;
  const a = firstNumbers[first[1]] ?? positiveInteger(first[1]);
  const b = positiveInteger(second[1]);
  const d = positiveInteger(step[1]);
  const n = positiveInteger(total[1]);
  const ordinal = requested[1];
  const k = ordinalNumbers[ordinal] ?? positiveInteger(ordinal.replace(/(st|nd|rd|th)$/, ''));
  if (a === null || b === null || d === null || n === null || k === null ||
      b - a !== d || n < 2 || n > 10000 || k > n) return null;
  const requestedValue = a + (k - 1) * d;
  const totalValue = (n * (2 * a + (n - 1) * d)) / 2;
  if (!Number.isSafeInteger(requestedValue) || !Number.isSafeInteger(totalValue)) return null;
  return {
    first:a, second:b, increment:d, requestedRing:k, totalRings:n,
    requestedValue, totalValue,
  };
}
