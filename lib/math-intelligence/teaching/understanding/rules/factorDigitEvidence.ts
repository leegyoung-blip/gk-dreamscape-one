/**
 * Phase 4E-2B-8C-2A: prompt-grounded evidence for three Mathematics structures.
 * Never uses question IDs, stored answers, option keys or topic names as proof.
 * A non-matching or internally inconsistent problem remains on existing rules.
 */
export type VerifiedFactorDigitEvidence =
  | { kind: 'bounded_common_multiple'; available: number; divisors: [number, number]; greatestRemaining: number }
  | { kind: 'common_factor_partition'; lengths: number[]; unit: 'm'; greatestPieceLength: number; totalPieces: number }
  | { kind: 'constrained_digit_formation'; digits: number[]; places: number; count: number };

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}
function valid(n: number): boolean {
  return Number.isSafeInteger(n) && n > 0;
}

export function identifyVerifiedFactorDigitEvidence(prompt: string): VerifiedFactorDigitEvidence | null {
  const t = prompt.toLowerCase().replace(/\s+/g, ' ').trim()
    .replace(/^(?:choose the correct answer|enter the answer)\.\s*/, '');

  // The count remaining must be positive, divisible by BOTH divisors, and
  // strictly smaller than the initial count because at least one went out.
  const candles = t.match(/^there are (\d{1,6}) candles\. some go out\. the number still lit can be divided equally by both (\d{1,5}) and (\d{1,5})\. how many could remain if at least one candle went out and the greatest possible number remained\??$/);
  if (candles) {
    const [available, a, b] = candles.slice(1).map(Number);
    if (![available, a, b].every(valid) || a === b || a > 10000 || b > 10000) return null;
    const common = (a / gcd(a, b)) * b;
    if (!valid(common)) return null;
    const greatestRemaining = Math.floor((available - 1) / common) * common;
    return greatestRemaining > 0
      ? { kind: 'bounded_common_multiple', available, divisors: [a, b], greatestRemaining }
      : null;
  }

  // Physical equal-length cutting, explicitly no waste and TWO requested
  // quantities. Do not treat ordinary division or part-whole questions as HCF.
  const cloth = t.match(/^bales of cloth are (.+?) long\. they are cut into equal-length pieces with no waste\. what is the greatest possible length of each piece, and how many pieces are obtained altogether\??$/);
  if (cloth) {
    const chunks = cloth[1].split(/\s*,\s*|\s+and\s+/);
    if (chunks.length < 2 || chunks.length > 8 || !chunks.every(s => /^\d{1,7}\s*m$/.test(s))) return null;
    const lengths = chunks.map(s => Number(s.match(/^\d+/)![0]));
    if (!lengths.every(valid)) return null;
    const greatestPieceLength = lengths.reduce((acc, n) => gcd(acc, n));
    const totalPieces = lengths.reduce((acc, n) => acc + n / greatestPieceLength, 0);
    if (!valid(greatestPieceLength) || !valid(totalPieces)) return null;
    return { kind: 'common_factor_partition', lengths, unit: 'm', greatestPieceLength, totalPieces };
  }

  // Exhaustive position-by-position enumeration with even units, no leading
  // zero and no repeated digits. A different target or missing condition fails.
  const arrangement = t.match(/^how many different (\d)-digit even numbers can be formed using the digits (.+?) without repeating a digit\??$/);
  if (arrangement) {
    const places = Number(arrangement[1]);
    const parts = arrangement[2].split(/\s*,\s*|\s+and\s+/);
    if (places < 2 || places > 6 || parts.length < places || parts.length > 7 ||
        !parts.every(d => /^\d$/.test(d))) return null;
    const digits = parts.map(Number);
    if (new Set(digits).size !== digits.length) return null;
    let count = 0;
    const visit = (depth: number, used: Set<number>, last: number): void => {
      if (depth === places) { if (last % 2 === 0) count += 1; return; }
      for (const d of digits) {
        if (used.has(d) || (depth === 0 && d === 0)) continue;
        used.add(d); visit(depth + 1, used, d); used.delete(d);
      }
    };
    visit(0, new Set<number>(), 0);
    return count > 0 && valid(count)
      ? { kind: 'constrained_digit_formation', digits, places, count }
      : null;
  }
  return null;
}
