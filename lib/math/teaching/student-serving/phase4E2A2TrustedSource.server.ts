/**
 * DREAMSCAPE 4E-2A-2: INTERNAL/SERVER-ONLY provenance-checked DB row adapter.
 *
 * Deliberately NOT a trusted DB resolver, API route, auth mechanism, or learner
 * release decision. The caller must first obtain real rows using a validated
 * server-side Supabase identity and DB authorization. NEVER serialize the result
 * into a browser response: it includes an authoritative answer key.
 *
 * The existence/non-emptiness of answer_data does NOT certify its semantic
 * shape; 4A canonical/understanding/contract gates must still validate it.
 */
import 'server-only';
import type { NormalizeCanonicalTeachingQuestionInput } from '../../../math-intelligence/teaching/canonical/types';

type DbObject = Record<string, unknown>;

type Prepared = Readonly<{
  status: 'ready';
  source: NormalizeCanonicalTeachingQuestionInput;
  sourceIdentity: Readonly<{quizId: string; questionId: string; questionVersion: number | null}>;
}>;
type Blocked = Readonly<{status: 'blocked'; reason: 'INVALID_ROWS' | 'INVALID_IDENTITIES' | 'QUESTION_NOT_LINKED' | 'WRONG_SUBJECT' | 'INVALID_LEVEL' | 'AUTHORITATIVE_ANSWER_MISSING'}>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isObject = (v: unknown): v is DbObject => v !== null && typeof v === 'object' && !Array.isArray(v);
const validUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);
const blocked = (reason: Blocked['reason']): Blocked => Object.freeze({status: 'blocked' as const, reason});

/**
 * Input MUST consist of rows loaded from the DB on a trusted server. The
 * `math_quiz_questions` link is required even in staff-only shadow mode.
 * Authentication, staff role, RLS and version freshness must be checked by
 * the eventual resolver; they cannot be inferred from data objects.
 */
export function prepareMathTeachingSourceFromDbRows(rows: unknown): Prepared | Blocked {
  if (!isObject(rows) || !isObject(rows.quiz) || !isObject(rows.link) || !isObject(rows.question)) {
    return blocked('INVALID_ROWS');
  }
  const {quiz, link, question} = rows;
  if (!validUuid(quiz.id) || !validUuid(question.id) ||
      !validUuid(link.quiz_id) || !validUuid(link.question_id)) {
    return blocked('INVALID_IDENTITIES');
  }
  if (quiz.id !== link.quiz_id || question.id !== link.question_id) {
    return blocked('QUESTION_NOT_LINKED');
  }
  // New callers supply the linked topic row. Old callers without it are
  // supported for compatibility; any supplied but inconsistent row fails shut.
  if ('topic' in rows) {
    if (!isObject(rows.topic) || !validUuid(rows.topic.id) ||
        !validUuid(quiz.topic_id) || rows.topic.id !== quiz.topic_id ||
        rows.topic.subject !== 'math' ||
        rows.topic.primary_level !== question.primary_level ||
        question.topic_id !== rows.topic.id) {
      return blocked('INVALID_IDENTITIES');
    }
  }
  if (question.subject !== 'math') return blocked('WRONG_SUBJECT');
  const level = question.primary_level;
  if (typeof level !== 'number' || !Number.isInteger(level) || level < 1 || level > 6) {
    return blocked('INVALID_LEVEL');
  }
  if (!isObject(question.answer_data) || Object.keys(question.answer_data).length === 0) {
    return blocked('AUTHORITATIVE_ANSWER_MISSING');
  }
  const version = question.version;
  const questionVersion = typeof version === 'number' && Number.isInteger(version) && version > 0 ? version : null;
  // Explicit allowlist: excludes unrelated raw columns such as reviewed_by,
  // staff comments, user IDs, RLS metadata, etc. Answer data is intentionally
  // passed to INTERNAL canonical normalization, never into a public response.
  const sourceQuestion: Record<string, unknown> = {
    id: question.id,
    code: question.code,
    subject: question.subject,
    primary_level: level,
    topic_id: question.topic_id,
    // Curriculum title is server-side context for 4A; it never changes the
    // stored question or allows a topic alone to determine a teaching method.
    topic_title: isObject(rows.topic) && typeof rows.topic.title === 'string'
      ? rows.topic.title.trim() || null
      : null,
    skill: question.skill,
    skill_tags: question.skill_tags,
    difficulty: question.difficulty,
    question_type: question.question_type,
    instruction: question.instruction,
    prompt: question.prompt,
    content: question.content,
    answer_data: question.answer_data,
  };
  return {
    status: 'ready',
    source: {
      question: sourceQuestion,
      sourceType: 'quiz',
      sourceTable: 'math_questions',
      quizId: quiz.id,
    },
    sourceIdentity: Object.freeze({quizId: quiz.id, questionId: question.id, questionVersion}),
  };
}
