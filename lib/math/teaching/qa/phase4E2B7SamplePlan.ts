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
