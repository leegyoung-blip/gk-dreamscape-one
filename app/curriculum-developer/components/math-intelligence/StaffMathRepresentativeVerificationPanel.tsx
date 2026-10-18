'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { supabase } from '@/lib/supabase';
import {
  chooseVerificationQuestion,
  chooseVerificationQuizzes,
  summarizeSafeStaffPreview,
  summarizeSafeCandidateDiagnostics,
  type SafeCandidateDiagnostic,
  type VerificationQuestion,
  type VerificationQuiz,
} from '@/lib/math/teaching/qa/phase4E2B7SamplePlan';
import styles from './StaffMathRepresentativeVerificationPanel.module.css';

const endpoint = '/api/curriculum-developer/math-intelligence/method-preview';
const levels = [1, 2, 3, 4, 5, 6] as const;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type VerificationStatus = 'selected' | 'ambiguous' | 'blocked' | 'skipped' | 'error';
type VerificationRow = SafeCandidateDiagnostic & {
  level: number;
  quiz: string;
  question: string;
  questionType: string;
  status: VerificationStatus;
  method: string;
  confidence: string;
  stage: string;
  reason: string;
};
type QuizzesResponse = { ok: true; mode: 'quizzes'; level: number; quizzes: VerificationQuiz[] };
type QuestionsResponse = { ok: true; mode: 'questions'; quizId: string; questions: VerificationQuestion[] };
type PreviewResponse = { ok: true; preview: {
  status: 'selected' | 'ambiguous' | 'blocked';
  previewOnly: true;
  teachingApproved: false;
  studentReleased: false;
  methodId?: string;
  confidence?: string;
  stage?: string;
  reasonCodes?: string[];
  candidateMethodCount?: number;
  scoreComparison?: unknown;
} };

const errorDescriptions: Record<string, string> = {
  AUTH_REQUIRED: 'Staff session expired or missing',
  ACCESS_DENIED: 'Staff access denied',
  QUIZ_LIST_UNAVAILABLE: 'Quiz list unavailable',
  QUESTION_LIST_UNAVAILABLE: 'Question list unavailable',
  QUIZ_NOT_AVAILABLE: 'Quiz unavailable',
  PREVIEW_UNAVAILABLE: 'Preview service unavailable',
  INVALID_SELECTION: 'Invalid question selection',
};

class VerificationRequestError extends Error {
  constructor(message: string, readonly fatal: boolean = false) { super(message); }
}

function isRecord(item: unknown): item is Record<string, unknown> {
  return item !== null && typeof item === 'object' && !Array.isArray(item);
}

async function staffRequest<T>(
  path: string,
  token: string,
  signal: AbortSignal,
  body?: Readonly<{ quizId: string; questionId: string }>,
): Promise<T> {
  const response = await fetch(path, {
    method: body ? 'POST' : 'GET',
    cache: 'no-store',
    signal,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok || !isRecord(result) || result.ok !== true) {
    const code = isRecord(result) && isRecord(result.error) &&
      typeof result.error.code === 'string' ? result.error.code : 'PREVIEW_UNAVAILABLE';
    throw new VerificationRequestError(
      errorDescriptions[code] || `Preview request failed (${response.status})`,
      response.status === 401 || response.status === 403,
    );
  }
  return result as T;
}

function previewRow(
  level: number, quiz: VerificationQuiz, question: VerificationQuestion,
  result: PreviewResponse['preview'],
): VerificationRow {
  const summary = summarizeSafeStaffPreview(result);
  if (!summary) throw new VerificationRequestError('Unexpected preview safety contract', true);
  return {
    level,
    quiz: quiz.title.slice(0, 160),
    question: question.label.slice(0, 100),
    questionType: question.type.slice(0, 32),
    ...summary,
    ...summarizeSafeCandidateDiagnostics(result),
  };
}
function fallbackRow(level: number, reason: string, status: 'skipped' | 'error',
  quiz = '', question = ''): VerificationRow {
  return { level, quiz, question, questionType: '', status, method: '',
    confidence: '', stage: '', reason,
    ...summarizeSafeCandidateDiagnostics(null) };
}
function message(error: unknown): string {
  if (error instanceof VerificationRequestError) return error.message;
  return 'The preview request could not be completed';
}
function safeCsvCell(value: string | number): string {
  const text = String(value);
  // Do not allow spreadsheet formula interpretation when staff open the CSV.
  const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
function exportCsv(rows: readonly VerificationRow[]) {
  const columns = ['Primary level', 'Quiz', 'Question code', 'Question type', 'Outcome',
    'Method ID', 'Confidence', 'Blocked stage', 'Reason codes / error',
    'Top candidate', 'Top score / 100', 'Second candidate', 'Second score / 100',
    'Top-two score gap (not policy margin)', 'Largest missing-score dimension',
    'Points missing in that dimension', '4C selector issue codes', 'Eligible scored candidates'];
  const data = [columns, ...rows.map((item) => [item.level, item.quiz, item.question,
    item.questionType, item.status, item.method, item.confidence, item.stage, item.reason,
    item.topMethod, item.topScore, item.runnerUpMethod, item.runnerUpScore,
    item.topTwoGap, item.weakestDimension, item.missingPoints,
    item.selectorIssues, item.eligibleCandidates])];
  const csv = data.map((record) => record.map(safeCsvCell).join(',')).join('\r\n') + '\r\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'DREAMSCAPE_4E2B8C_CANDIDATE_SCORE_COVERAGE.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function StaffMathRepresentativeVerificationPanel() {
  const [perLevel, setPerLevel] = useState<1 | 2>(2);
  const [rows, setRows] = useState<VerificationRow[]>([]);
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'cancelled'>('idle');
  const [currentLevel, setCurrentLevel] = useState<number | null>(null);
  const [error, setError] = useState('');
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => { controllerRef.current?.abort(); }, []);

  async function run() {
    if (controllerRef.current) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setRows([]);
    setState('running');
    setCurrentLevel(null);
    setError('');
    const append = (row: VerificationRow) => {
      if (!controller.signal.aborted) setRows((prev) => [...prev, row]);
    };
    let cancelled = false;
    try {
      const session = await supabase.auth.getSession();
      if (session.error || !session.data.session?.access_token) {
        throw new VerificationRequestError('Sign in as an administrator or curriculum lead', true);
      }
      const token = session.data.session.access_token;
      for (const level of levels) {
        if (controller.signal.aborted) break;
        setCurrentLevel(level);
        try {
          const quizzes = await staffRequest<QuizzesResponse>(
            `${endpoint}?mode=quizzes&level=${level}`, token, controller.signal,
          );
          if (quizzes.mode !== 'quizzes' || !Array.isArray(quizzes.quizzes)) {
            throw new VerificationRequestError('Invalid quiz list response');
          }
          const samples = chooseVerificationQuizzes(quizzes.quizzes, perLevel)
            .filter((item) => uuid.test(item.id));
          if (!samples.length) {
            append(fallbackRow(level, 'No accessible published quiz in the first 100', 'skipped'));
            continue;
          }
          const seenTypes: string[] = [];
          for (const quiz of samples) {
            if (controller.signal.aborted) break;
            try {
              const questions = await staffRequest<QuestionsResponse>(
                `${endpoint}?mode=questions&quizId=${encodeURIComponent(quiz.id)}`,
                token, controller.signal,
              );
              if (questions.mode !== 'questions' || !Array.isArray(questions.questions)) {
                throw new VerificationRequestError('Invalid question list response');
              }
              const question = chooseVerificationQuestion(
                questions.questions.filter((item) => uuid.test(item.id)), seenTypes,
              );
              if (!question) {
                append(fallbackRow(level, 'No accessible question in the first 40', 'skipped', quiz.title));
                continue;
              }
              seenTypes.push(question.type.toLowerCase());
              const preview = await staffRequest<PreviewResponse>(endpoint, token,
                controller.signal, { quizId: quiz.id, questionId: question.id });
              if (!preview.preview || !isRecord(preview.preview)) {
                throw new VerificationRequestError('Invalid preview response');
              }
              append(previewRow(level, quiz, question, preview.preview));
            } catch (cause) {
              if (controller.signal.aborted) break;
              if (cause instanceof VerificationRequestError && cause.fatal) throw cause;
              append(fallbackRow(level, message(cause), 'error', quiz.title));
            }
          }
        } catch (cause) {
          if (controller.signal.aborted) break;
          if (cause instanceof VerificationRequestError && cause.fatal) throw cause;
          append(fallbackRow(level, message(cause), 'error'));
        }
      }
      cancelled = controller.signal.aborted;
    } catch (cause) {
      cancelled = controller.signal.aborted;
      if (!cancelled) setError(message(cause));
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      setCurrentLevel(null);
      setState(cancelled ? 'cancelled' : 'done');
    }
  }

  const counts = {
    selected: rows.filter((item) => item.status === 'selected').length,
    ambiguous: rows.filter((item) => item.status === 'ambiguous').length,
    blocked: rows.filter((item) => item.status === 'blocked').length,
    errors: rows.filter((item) => item.status === 'error').length,
    skipped: rows.filter((item) => item.status === 'skipped').length,
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.navigation} aria-label="Staff teaching tools">
          <a href="/curriculum-developer/math-intelligence/method-preview">← Single-question method preview</a>
          <a href="/curriculum-developer">Curriculum Developer</a>
        </nav>
        <div className={styles.eyebrow}>DREAMSCAPE ONE · PHASE 4E-2B-7</div>
        <h1>Representative Method Verification</h1>
        <p className={styles.intro}>
          Review a small deterministic sample from Primary 1–6 using the existing staff-only
          teaching-method preview. Results indicate selection coverage, not mathematical
          correctness or teaching approval.
        </p>
        <div className={styles.notice} role="note">
          <strong>Staff diagnostic only.</strong> Selected does not mean Gold-approved.
          No answer keys, worked solutions or learner records are loaded. B4 approval and
          student release remain disabled.
        </div>
        <section className={styles.panel} aria-label="Verification controls">
          <h2>Run P1–P6 coverage check</h2>
          <p className={styles.muted}>
            Samples one question from each of up to two distinct published quizzes per level.
            The selection spans titles and prefers different question types when available.
            It only sees the first 100 quizzes per level and first 40 questions per quiz,
            so it is a smoke sample—not an audit of the entire question bank.
          </p>
          <label className={styles.setting}>
            <span>Quizzes sampled per level</span>
            <select value={perLevel} disabled={state === 'running'}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => setPerLevel(event.target.value === '1' ? 1 : 2)}>
              <option value={1}>1 (up to 6 questions total)</option>
              <option value={2}>2 (up to 12 questions total)</option>
            </select>
          </label>
          <div className={styles.actions}>
            <button type="button" onClick={() => { void run(); }}
              disabled={state === 'running'} className={styles.primaryButton}>
              {state === 'running' ? 'Checking methods…' : 'Run representative check'}
            </button>
            {state === 'running' &&
              <button type="button" className={styles.secondaryButton}
                onClick={() => controllerRef.current?.abort()}>Stop check</button>}
            <button type="button" className={styles.secondaryButton}
              disabled={state === 'running' || rows.length === 0}
              onClick={() => exportCsv(rows)}>Export results CSV</button>
          </div>
          <p className={styles.progress} role="status" aria-live="polite">
            {state === 'running'
              ? `Checking Primary ${currentLevel ?? '…'} · ${rows.length} rows recorded`
              : state === 'done' ? `Check finished · ${rows.length} rows recorded`
                : state === 'cancelled' ? 'Check stopped; partial results shown'
                  : 'Ready to verify.'}
          </p>
          {error && <p className={styles.error} role="alert">{error}</p>}
        </section>

        {rows.length > 0 && (
          <section className={styles.panel} aria-label="Coverage sample results">
            <h2>Sample outcomes</h2>
            <div className={styles.statGrid}>
              <div><span>Selected</span><strong>{counts.selected}</strong></div>
              <div><span>Ambiguous</span><strong>{counts.ambiguous}</strong></div>
              <div><span>Blocked</span><strong>{counts.blocked}</strong></div>
              <div><span>Request errors</span><strong>{counts.errors}</strong></div>
              <div><span>Skipped</span><strong>{counts.skipped}</strong></div>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead><tr>
                  <th>Level</th><th>Quiz / question</th><th>Outcome</th><th>Method or diagnostic</th>
                </tr></thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={`${row.level}-${row.quiz}-${index}`}>
                      <td>P{row.level}</td>
                      <td><strong>{row.quiz || '—'}</strong>
                        <small>{row.question || '—'}{row.questionType ? ` · ${row.questionType}` : ''}</small></td>
                      <td><span className={styles.outcome}>{row.status.toUpperCase()}</span></td>
                      <td className={styles.details}>
                        {row.status === 'selected' ? <>{row.method} <small>{row.confidence} confidence</small></>
                          : <>
                            {row.stage ? `${row.stage} · ` : ''}{row.reason || 'No details returned'}
                            {row.status === 'ambiguous' && row.topMethod && (
                              <small>
                                Top: {row.topMethod} ({row.topScore}/100)
                                {row.runnerUpMethod && ` · Next: ${row.runnerUpMethod} (${row.runnerUpScore}/100)`}
                                {row.selectorIssues && ` · Issues: ${row.selectorIssues}`}
                                {row.weakestDimension && ` · Largest point shortfall: ${row.weakestDimension} (−${row.missingPoints})`}
                              </small>
                            )}
                          </>}

                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.muted}>
              Ambiguous and Blocked are valid fail-closed selection outcomes, not automatically
              software failures. Review the reason codes before changing evidence rules.
              The exported CSV includes sanitized candidate scores and dimension gaps already
              available to staff. The top-two score gap is descriptive and may differ from
              the selector's authoritative policy margin. No answers or teaching content are exported.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
