'use client';

import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './StaffMathMethodPreviewPanel.module.css';

type QuizChoice = { id: string; title: string; status: string };
type QuestionChoice = { id: string; label: string; type: string; order: number };
type CandidateScore = {
  methodId: string;
  familyId: string;
  eligible: boolean;
  rank: number | null;
  score: number | null;
  exclusionCodes: string[];
  dimensions: Array<{ dimension: string; points: number; maximum: number }>;
};
type ScoreComparison = {
  candidates: CandidateScore[];
  selectionIssueCodes: string[];
};
type Preview =
  | { status: 'selected'; methodId: string; familyId: string; confidence: string; candidateMethodCount: number; previewOnly: true; teachingApproved: false; studentReleased: false }
  | { status: 'ambiguous'; stage: string; reasonCodes: string[]; candidateMethodCount: number; primaryFamilies: string[]; scoreComparison?: ScoreComparison; previewOnly: true; teachingApproved: false; studentReleased: false }
  | { status: 'blocked'; stage: string; reasonCodes: string[]; previewOnly: true; teachingApproved: false; studentReleased: false };

type ListResponse =
  | { ok: true; mode: 'quizzes'; level: number; quizzes: QuizChoice[] }
  | { ok: true; mode: 'questions'; quizId: string; questions: QuestionChoice[] };
type PreviewResponse = { ok: true; preview: Preview };

const endpoint = '/api/curriculum-developer/math-intelligence/method-preview';
const errorText: Record<string, string> = {
  AUTH_REQUIRED: 'Your session has expired. Sign in again.',
  ACCESS_DENIED: 'Access is restricted to administrators and curriculum leads.',
  AUTH_CONFIG_MISSING: 'Staff authentication is not configured.',
  QUIZ_NOT_AVAILABLE: 'This quiz is not available to your account.',
  QUIZ_LIST_UNAVAILABLE: 'Could not load Mathematics quizzes.',
  QUESTION_LIST_UNAVAILABLE: 'Could not load quiz questions.',
  PREVIEW_UNAVAILABLE: 'The server could not complete the preview. Try again later.',
};

async function staffRequest<T>(path: string, options?: { body?: string; signal?: AbortSignal }): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error(errorText.AUTH_REQUIRED);
  const response = await fetch(path, {
    method: options?.body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options?.body,
    signal: options?.signal,
    cache: 'no-store',
  });
  const result: unknown = await response.json().catch(() => null);
  if (!result || typeof result !== 'object') throw new Error('Invalid response from preview server.');
  if (!('ok' in result) || result.ok !== true) {
    const code = 'error' in result && result.error && typeof result.error === 'object' &&
      'code' in result.error && typeof result.error.code === 'string'
      ? result.error.code : 'PREVIEW_UNAVAILABLE';
    throw new Error(errorText[code] || `Preview request failed (${code}).`);
  }
  return result as T;
}

function readableError(value: unknown) {
  return value instanceof Error ? value.message : 'The request could not be completed.';
}

export default function StaffMathMethodPreviewPanel() {
  const [level, setLevel] = useState(6);
  const [quizzes, setQuizzes] = useState<QuizChoice[]>([]);
  const [quizId, setQuizId] = useState('');
  const [questions, setQuestions] = useState<QuestionChoice[]>([]);
  const [questionId, setQuestionId] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingQuizzes(true);
    setQuizzes([]);
    setQuizId('');
    setQuestions([]);
    setQuestionId('');
    setPreview(null);
    setError('');
    staffRequest<ListResponse>(`${endpoint}?mode=quizzes&level=${level}`, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted && data.mode === 'quizzes') {
          setQuizzes(data.quizzes);
          setAccessDenied(false);
        }
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        const message = readableError(cause);
        setError(message);
        setAccessDenied(message.includes('restricted') || message.includes('session') || message.includes('authentication'));
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingQuizzes(false); });
    return () => controller.abort();
  }, [level]);

  useEffect(() => {
    const controller = new AbortController();
    setQuestions([]);
    setQuestionId('');
    setPreview(null);
    setError('');
    if (!quizId) { setLoadingQuestions(false); return () => controller.abort(); }
    setLoadingQuestions(true);
    staffRequest<ListResponse>(`${endpoint}?mode=questions&quizId=${encodeURIComponent(quizId)}`, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted && data.mode === 'questions') setQuestions(data.questions);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(readableError(cause));
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingQuestions(false); });
    return () => controller.abort();
  }, [quizId]);

  async function runPreview() {
    if (!quizId || !questionId || running) return;
    setRunning(true);
    setPreview(null);
    setError('');
    try {
      const response = await staffRequest<PreviewResponse>(endpoint, {
        body: JSON.stringify({ quizId, questionId }),
      });
      if (!response.preview || response.preview.previewOnly !== true ||
          response.preview.teachingApproved !== false || response.preview.studentReleased !== false) {
        throw new Error('The server returned an invalid preview safety contract.');
      }
      setPreview(response.preview);
    } catch (cause) {
      setError(readableError(cause));
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <a className={styles.backLink} href="/curriculum-developer">← Curriculum Developer</a>
        <div className={styles.eyebrow}>DREAMSCAPE ONE · TEACHING INTELLIGENCE</div>
        <h1>Staff Method Preview</h1>
        <p className={styles.intro}>
          Inspect the method proposed by the 4A–4C engine for a real Mathematics question.
          This is a read-only diagnostic, not teaching approval or student release.
        </p>
        <div className={styles.notice} role="note">
          <strong>Staff only · Preview mode.</strong> A selected method is not Gold-verified.
          B4 approval and student-facing release remain disabled.
        </div>

        {accessDenied ? (
          <section className={styles.panel} role="alert">
            <h2>Access unavailable</h2>
            <p>{error}</p>
            <p>Sign in with an admin or curriculum lead account.</p>
          </section>
        ) : (
          <>
            <section className={styles.panel} aria-label="Select Mathematics question">
              <h2>Choose a question</h2>
              <div className={styles.fields}>
                <label>
                  <span>Primary level</span>
                  <select value={level} onChange={(event: ChangeEvent<HTMLSelectElement>) => setLevel(Number(event.target.value))} disabled={running}>
                    {[1, 2, 3, 4, 5, 6].map((p) => <option key={p} value={p}>Primary {p}</option>)}
                  </select>
                </label>
                <label>
                  <span>Mathematics quiz</span>
                  <select value={quizId} onChange={(event: ChangeEvent<HTMLSelectElement>) => setQuizId(event.target.value)}
                    disabled={loadingQuizzes || running}>
                    <option value="">{loadingQuizzes ? 'Loading quizzes…' : 'Select a quiz'}</option>
                    {quizzes.map((quiz) => <option value={quiz.id} key={quiz.id}>
                      {quiz.title} ({quiz.status})
                    </option>)}
                  </select>
                </label>
                <label>
                  <span>Question</span>
                  <select value={questionId} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setQuestionId(event.target.value); setPreview(null); }}
                    disabled={!quizId || loadingQuestions || running}>
                    <option value="">{loadingQuestions ? 'Loading questions…' : 'Select a question'}</option>
                    {questions.map((question, index) => <option value={question.id} key={question.id}>
                      Q{index + 1} · {question.label} · {question.type}
                    </option>)}
                  </select>
                </label>
              </div>
              {!loadingQuizzes && quizzes.length === 0 && !error && (
                <p className={styles.muted}>No accessible Mathematics quizzes found for this level.</p>
              )}
              <button type="button" className={styles.primaryButton}
                disabled={!quizId || !questionId || running || loadingQuestions}
                onClick={() => { void runPreview(); }}>
                {running ? 'Evaluating method…' : 'Preview teaching method'}
              </button>
            </section>

            {error && <p className={styles.error} role="alert">{error}</p>}
            {preview && (
              <section className={styles.panel} aria-live="polite" aria-label="Teaching method result">
                <div className={styles.resultHeader}>
                  <h2>Method selection</h2>
                  <span className={styles.status}>{preview.status.toUpperCase()}</span>
                </div>
                {preview.status === 'selected' ? (
                  <div className={styles.resultGrid}>
                    <div><span className={styles.term}>Method ID</span><strong>{preview.methodId}</strong></div>
                    <div><span className={styles.term}>Family ID</span><strong>{preview.familyId}</strong></div>
                    <div><span className={styles.term}>Confidence</span><strong>{preview.confidence}</strong></div>
                    <div><span className={styles.term}>Candidates considered</span><strong>{preview.candidateMethodCount}</strong></div>
                  </div>
                ) : (
                  <>
                    <p className={styles.muted}>
                      {preview.status === 'ambiguous'
                        ? 'The available evidence did not support a confident method selection.'
                        : 'The preview was blocked by a required safety or readiness check.'}
                    </p>
                    <div className={styles.resultGrid}>
                      <div><span className={styles.term}>Stage</span><strong>{preview.stage}</strong></div>
                      {preview.status === 'ambiguous' &&
                        <div><span className={styles.term}>Candidates</span><strong>{preview.candidateMethodCount}</strong></div>}
                    </div>
                    <div className={styles.codes}>
                      <span className={styles.term}>Diagnostic codes</span>
                      <p>{preview.reasonCodes.length ? preview.reasonCodes.join(' · ') : 'No further diagnostics provided.'}</p>
                    </div>
                    {preview.status === 'ambiguous' && preview.scoreComparison && (
                      <section className={styles.candidateSection} aria-label="Candidate method comparison">
                        <h3>Candidate comparison</h3>
                        <p className={styles.muted}>
                          Staff-only diagnostic scores from the 4C selector. A high score or rank does not mean a method is approved.
                          No missing evidence is inferred.
                        </p>
                        {preview.scoreComparison.selectionIssueCodes.length > 0 && (
                          <p className={styles.codes}>
                            <span className={styles.term}>Selector assessment</span>{' '}
                            {preview.scoreComparison.selectionIssueCodes.join(' · ')}
                          </p>
                        )}
                        {preview.scoreComparison.candidates.length === 0 ? (
                          <p className={styles.muted}>No candidate score details were available.</p>
                        ) : (
                          <div className={styles.candidateTableWrapper}>
                            <table className={styles.candidateTable}>
                              <thead><tr><th>Rank</th><th>Candidate method</th><th>Score</th><th>Assessment</th></tr></thead>
                              <tbody>
                                {preview.scoreComparison.candidates.map((item, index) => (
                                  <tr key={`${item.methodId}-${index}`}>
                                    <td>{item.rank ?? '—'}</td>
                                    <td><strong>{item.methodId}</strong><span className={styles.candidateFamily}>{item.familyId}</span></td>
                                    <td>{item.score === null ? '—' : `${item.score}/100`}</td>
                                    <td>
                                      {item.eligible ? 'Eligible for ranking' : 'Not eligible'}
                                      {item.exclusionCodes.length > 0 && (
                                        <div className={styles.candidateCodes}>{item.exclusionCodes.join(' · ')}</div>
                                      )}
                                      {item.dimensions.length > 0 && (
                                        <details className={styles.dimensionDetails}>
                                          <summary>Score breakdown</summary>
                                          <ul>{item.dimensions.map((dim) => (
                                            <li key={dim.dimension}>{dim.dimension.replace(/_/g, ' ')}: {dim.points}/{dim.maximum}</li>
                                          ))}</ul>
                                        </details>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </section>
                    )}
                  </>
                )}
                <div className={styles.footerNotice}>
                  Method selected ≠ method approved. No student explanation or answer key is shown.
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
