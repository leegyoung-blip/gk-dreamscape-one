/**
 * Phase 4E-2B-7 — deterministic, bounded staff diagnostic sample planner.
 * This is a convenience coverage sample, NOT a statistically representative audit.
 * No answers, learning evidence, method scores, approvals, or learner data are used.
 */
export type VerificationQuiz = Readonly<{
  id: string;
  title: string;
  status: string;
}>;
export type VerificationQuestion = Readonly<{
  id: string;
  label: string;
  type: string;
  order: number;
}>;

const compareText = (left: string, right: string): number => {
  const a = left.trim().toLowerCase();
  const b = right.trim().toLowerCase();
  return a < b ? -1 : a > b ? 1 : 0;
};
const topicHint = (title: string) => title.trim().toLowerCase().split(/[\s:–—-]+/)[0] || '';

/** Select at most two distinct published quizzes, spread across the title list. */
export function chooseVerificationQuizzes(
  quizzes: readonly VerificationQuiz[],
  limit: 1 | 2 = 2,
): VerificationQuiz[] {
  const ids = new Set<string>();
  const published = quizzes
    .filter((item) => item && typeof item.id === 'string' && !!item.id &&
      typeof item.title === 'string' &&
      typeof item.status === 'string' && item.status.toLowerCase() === 'published')
    .sort((a, b) => compareText(a.title, b.title) || compareText(a.id, b.id))
    .filter((item) => {
      if (ids.has(item.id)) return false;
      ids.add(item.id);
      return true;
    });
  if (!published.length) return [];
  if (limit === 1 || published.length === 1) return [published[0]];
  const first = published[0];
  const alternate = [...published].reverse().find((item) =>
    item.id !== first.id && topicHint(item.title) !== topicHint(first.title),
  ) ?? published[published.length - 1];
  return [first, alternate];
}

/** Prefer another answer type where it is available; otherwise choose the middle question. */
export function chooseVerificationQuestion(
  questions: readonly VerificationQuestion[],
  previouslySampledTypes: readonly string[] = [],
): VerificationQuestion | null {
  const ids = new Set<string>();
  const available = questions
    .filter((item) => item && typeof item.id === 'string' && !!item.id &&
      typeof item.type === 'string' && typeof item.label === 'string')
    .sort((a, b) => (Number.isInteger(a.order) ? a.order : 100000) -
      (Number.isInteger(b.order) ? b.order : 100000) || compareText(a.id, b.id))
    .filter((item) => {
      if (ids.has(item.id)) return false;
      ids.add(item.id);
      return true;
    });
  if (!available.length) return null;
  const differentTypes = available.filter((item) =>
    !previouslySampledTypes.includes(item.type.toLowerCase()),
  );
  const pool = differentTypes.length ? differentTypes : available;
  return pool[Math.floor((pool.length - 1) / 2)];
}

export type SafeVerificationPreview = Readonly<{
  status: 'selected' | 'ambiguous' | 'blocked';
  method: string;
  confidence: string;
  stage: string;
  reason: string;
}>;

/** Flatten only allow-listed preview metadata; never echo source or answers. */
export function summarizeSafeStaffPreview(value: unknown): SafeVerificationPreview | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entry = value as Record<string, unknown>;
  if (entry.previewOnly !== true || entry.studentReleased !== false ||
      entry.teachingApproved !== false ||
      !['selected', 'ambiguous', 'blocked'].includes(String(entry.status))) return null;
  if (entry.status === 'selected') {
    if (typeof entry.methodId !== 'string' ||
        !/^[A-Za-z0-9_.:-]{1,120}$/.test(entry.methodId) ||
        !['low', 'medium', 'high', 'none'].includes(String(entry.confidence))) return null;
    return { status: 'selected', method: entry.methodId, confidence: String(entry.confidence),
      stage: '', reason: '' };
  }
  const stage = typeof entry.stage === 'string' &&
    ['access', 'canonical', 'understanding', 'contract', 'consumer', 'selector'].includes(entry.stage)
    ? entry.stage : '';
  const reason = Array.isArray(entry.reasonCodes)
    ? [...new Set(entry.reasonCodes.filter((code): code is string =>
      typeof code === 'string' && /^[A-Z][A-Z0-9_]{1,80}$/.test(code)))].slice(0, 8).join(' · ')
    : '';
  return { status: entry.status as 'ambiguous' | 'blocked', method: '', confidence: '',
    stage, reason };
}


/**
 * Phase 4E-2B-8C — sanitize existing 4C candidate scoring metadata for a
 * staff-only diagnostic CSV. Scores are diagnostics, never teaching approvals.
 * The top-two displayed gap is not the selector's authoritative winner margin.
 * Never copy raw selector results or answer-bearing question data into the UI.
 */
export type SafeCandidateDiagnostic = Readonly<{
  topMethod: string;
  topScore: string;
  runnerUpMethod: string;
  runnerUpScore: string;
  topTwoGap: string;
  weakestDimension: string;
  missingPoints: string;
  selectorIssues: string;
  eligibleCandidates: number;
}>;

const emptyCandidateDiagnostic = (): SafeCandidateDiagnostic => ({
  topMethod: '', topScore: '', runnerUpMethod: '', runnerUpScore: '',
  topTwoGap: '', weakestDimension: '', missingPoints: '',
  selectorIssues: '', eligibleCandidates: 0,
});
const safeMethodIdentifier = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,120}$/.test(value);
const safeSelectorIssue = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Z][A-Z0-9_]{1,80}$/.test(value);
const safeNumericScore = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const validDimensions = new Set([
  'problem_structure', 'required_reasoning', 'curriculum_skill',
  'learner_level', 'math_domain', 'representation_fit', 'prerequisites',
]);

export function summarizeSafeCandidateDiagnostics(value: unknown): SafeCandidateDiagnostic {
  const empty = emptyCandidateDiagnostic();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return empty;
  const entry = value as Record<string, unknown>;
  if (entry.status !== 'ambiguous' || entry.stage !== 'selector' ||
      entry.previewOnly !== true || entry.teachingApproved !== false ||
      entry.studentReleased !== false) return empty;
  const comparison = entry.scoreComparison;
  if (!comparison || typeof comparison !== 'object' || Array.isArray(comparison)) return empty;
  const data = comparison as Record<string, unknown>;
  const issues = Array.isArray(data.selectionIssueCodes)
    ? [...new Set(data.selectionIssueCodes.filter(safeSelectorIssue))]
        .slice(0, 8).join(' · ')
    : '';
  if (!Array.isArray(data.candidates)) return { ...empty, selectorIssues: issues };
  const scores: Array<{
    methodId: string;
    score: number;
    dimensions: Array<{ dimension: string; missing: number }>;
  }> = [];
  for (const candidate of data.candidates.slice(0, 12)) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
    const item = candidate as Record<string, unknown>;
    if (item.eligible !== true || !safeMethodIdentifier(item.methodId) ||
        !safeNumericScore(item.score)) continue;
    const dimensions: Array<{ dimension: string; missing: number }> = [];
    if (Array.isArray(item.dimensions)) {
      for (const dimension of item.dimensions.slice(0, 7)) {
        if (!dimension || typeof dimension !== 'object' || Array.isArray(dimension)) continue;
        const d = dimension as Record<string, unknown>;
        if (typeof d.dimension !== 'string' || !validDimensions.has(d.dimension) ||
            !safeNumericScore(d.points) || !safeNumericScore(d.maximum) ||
            d.points > d.maximum) continue;
        dimensions.push({ dimension: d.dimension, missing: d.maximum - d.points });
      }
    }
    scores.push({ methodId: item.methodId, score: item.score, dimensions });
  }
  scores.sort((a, b) => b.score - a.score || a.methodId.localeCompare(b.methodId, 'en'));
  const top = scores[0];
  const runner = scores[1];
  const gap = top?.dimensions.length
    ? [...top.dimensions].sort((a, b) => b.missing - a.missing ||
        a.dimension.localeCompare(b.dimension, 'en'))[0] : null;
  return {
    topMethod: top?.methodId ?? '',
    topScore: top ? top.score.toFixed(2) : '',
    runnerUpMethod: runner?.methodId ?? '',
    runnerUpScore: runner ? runner.score.toFixed(2) : '',
    topTwoGap: top && runner ? (top.score - runner.score).toFixed(2) : '',
    weakestDimension: gap?.missing && gap.missing > 0 ? gap.dimension : '',
    missingPoints: gap?.missing && gap.missing > 0 ? gap.missing.toFixed(2) : '',
    selectorIssues: issues,
    eligibleCandidates: scores.length,
  };
}
