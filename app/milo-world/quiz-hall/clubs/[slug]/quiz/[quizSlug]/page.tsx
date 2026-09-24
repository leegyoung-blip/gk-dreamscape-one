"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import CreatorQuestionRenderer, {
  type CreatorEngineAnswerValue,
  type CreatorEngineQuestion,
} from "@/components/milo/creator-engine/CreatorQuestionRenderer";

type QuizPayload = {
  club_id: string;
  club_slug: string;
  club_name: string;
  quiz_id: string;
  quiz_slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  challenge_id: string | null;
  challenge_ends_at: string | null;
  is_current_challenge: boolean;
  questions: CreatorEngineQuestion[];
};

type SubmittedAnswer = {
  question_id: string;
  selected_keys: string[];
  numeric_value: number | null;
  response_time_ms: number;
};

type AttemptAnswerResult = {
  question_id: string;
  question_order: number;
  question_type: string;
  selected_keys: string[];
  numeric_value: number | string | null;
  credit: number;
  points: number;
  explanation: string | null;
};

type AttemptResult = {
  attempt_id: string;
  attempt_number: number;
  correct_count: number;
  partial_count: number;
  total_questions: number;
  score_percent: number;
  total_points: number;
  total_response_time_ms: number;
  answers: AttemptAnswerResult[];
};

function initialValue(question: CreatorEngineQuestion): CreatorEngineAnswerValue {
  if (question.question_type === "bar_estimate") {
    const min = Number(question.config?.min ?? 0);
    const max = Number(question.config?.max ?? 100);
    return {
      selectedKeys: [],
      numericValue: min + (max - min) / 2,
    };
  }

  if (question.question_type === "pie_estimate") {
    return { selectedKeys: [], numericValue: 50 };
  }

  return { selectedKeys: [], numericValue: null };
}

function canSubmitAnswer(
  question: CreatorEngineQuestion,
  value: CreatorEngineAnswerValue,
) {
  if (
    question.question_type === "classic_choice" ||
    question.question_type === "choice_grid"
  ) {
    return value.selectedKeys.length > 0;
  }

  return value.numericValue !== null && Number.isFinite(value.numericValue);
}

function formatTime(ms: number) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export default function CreatorQuizEngineV2PlayPage() {
  const params = useParams<{ slug: string; quizSlug: string }>();
  const router = useRouter();

  const clubSlug = decodeURIComponent(String(params?.slug || ""));
  const quizSlug = decodeURIComponent(String(params?.quizSlug || ""));

  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentValue, setCurrentValue] =
    useState<CreatorEngineAnswerValue>({
      selectedKeys: [],
      numericValue: null,
    });
  const [answers, setAnswers] = useState<SubmittedAnswer[]>([]);
  const [result, setResult] = useState<AttemptResult | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const questionStartedAt = useRef(Date.now());

  const currentQuestion =
    quiz?.questions?.[questionIndex] || null;

  const progress = quiz?.questions?.length
    ? ((questionIndex + (result ? 1 : 0)) / quiz.questions.length) * 100
    : 0;

  const questionResultMap = useMemo(
    () =>
      new Map(
        (result?.answers || []).map((answer) => [
          answer.question_id,
          answer,
        ]),
      ),
    [result],
  );

  useEffect(() => {
    void load();
  }, [clubSlug, quizSlug]);

  useEffect(() => {
    if (!currentQuestion || result) return;
    setCurrentValue(initialValue(currentQuestion));
    questionStartedAt.current = Date.now();
  }, [currentQuestion?.id, result]);

  async function load() {
    setIsLoading(true);
    setErrorMessage("");

    const userResponse = await supabase.auth.getUser();

    if (!userResponse.data.user) {
      router.replace(
        `/login?next=${encodeURIComponent(
          `/milo-world/quiz-hall/clubs/${clubSlug}/quiz/${quizSlug}`,
        )}`,
      );
      return;
    }

    const { data, error } = await supabase.rpc(
      "get_creator_engine_quiz_for_play_v2",
      {
        p_club_slug: clubSlug,
        p_quiz_slug: quizSlug,
      },
    );

    if (error) {
      setErrorMessage(error.message || "Challenge could not be opened.");
      setQuiz(null);
      setIsLoading(false);
      return;
    }

    if (!data) {
      setQuiz(null);
      setErrorMessage("Challenge could not be found.");
      setIsLoading(false);
      return;
    }

    const row = data as unknown as QuizPayload;
    const normalized: QuizPayload = {
      ...row,
      club_id: String(row.club_id || ""),
      club_slug: String(row.club_slug || clubSlug),
      club_name: String(row.club_name || "Creator Club"),
      quiz_id: String(row.quiz_id || ""),
      quiz_slug: String(row.quiz_slug || quizSlug),
      title: String(row.title || "Creator Challenge"),
      description: row.description ? String(row.description) : null,
      cover_image_url: row.cover_image_url
        ? String(row.cover_image_url)
        : null,
      challenge_id: row.challenge_id
        ? String(row.challenge_id)
        : null,
      challenge_ends_at: row.challenge_ends_at
        ? String(row.challenge_ends_at)
        : null,
      is_current_challenge: Boolean(row.is_current_challenge),
      questions: ((row.questions || []) as CreatorEngineQuestion[]).map(
        (question) => ({
          ...question,
          id: String(question.id),
          question_order: Number(question.question_order || 0),
          difficulty: Number(question.difficulty || 2),
          config: question.config || {},
          options: (question.options || []).map((option) => ({
            ...option,
            option_key: String(option.option_key),
            label: String(option.label || ""),
            image_url: option.image_url ? String(option.image_url) : null,
            sort_order: Number(option.sort_order || 0),
          })),
        }),
      ),
    };

    if (normalized.questions.length === 0) {
      setErrorMessage("This challenge does not contain playable questions.");
      setQuiz(null);
      setIsLoading(false);
      return;
    }

    setQuiz(normalized);
    setQuestionIndex(0);
    setAnswers([]);
    setResult(null);
    setCurrentValue(initialValue(normalized.questions[0]));
    questionStartedAt.current = Date.now();
    setIsLoading(false);
  }

  async function lockAnswer() {
    if (!quiz || !currentQuestion) return;
    if (!canSubmitAnswer(currentQuestion, currentValue)) return;

    const responseTime = Math.max(
      0,
      Date.now() - questionStartedAt.current,
    );

    const answer: SubmittedAnswer = {
      question_id: currentQuestion.id,
      selected_keys: currentValue.selectedKeys,
      numeric_value: currentValue.numericValue,
      response_time_ms: responseTime,
    };

    const nextAnswers = [
      ...answers.filter(
        (item) => item.question_id !== currentQuestion.id,
      ),
      answer,
    ];

    setAnswers(nextAnswers);

    const isLast = questionIndex >= quiz.questions.length - 1;

    if (!isLast) {
      setQuestionIndex((index) => index + 1);
      return;
    }

    await submitAttempt(nextAnswers);
  }

  async function submitAttempt(nextAnswers: SubmittedAnswer[]) {
    if (!quiz) return;

    setIsSubmitting(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "creator_engine_submit_attempt_v2",
      {
        p_club_slug: quiz.club_slug,
        p_quiz_slug: quiz.quiz_slug,
        p_answers: nextAnswers,
      },
    );

    if (error) {
      setErrorMessage(
        error.message || "Your challenge result could not be saved.",
      );
      setIsSubmitting(false);
      return;
    }

    const raw = data as unknown as AttemptResult;
    setResult({
      ...raw,
      attempt_id: String(raw.attempt_id || ""),
      attempt_number: Number(raw.attempt_number || 1),
      correct_count: Number(raw.correct_count || 0),
      partial_count: Number(raw.partial_count || 0),
      total_questions: Number(raw.total_questions || quiz.questions.length),
      score_percent: Number(raw.score_percent || 0),
      total_points: Number(raw.total_points || 0),
      total_response_time_ms: Number(raw.total_response_time_ms || 0),
      answers: ((raw.answers || []) as AttemptAnswerResult[]).map(
        (answer) => ({
          ...answer,
          question_order: Number(answer.question_order || 0),
          credit: Number(answer.credit || 0),
          points: Number(answer.points || 0),
          selected_keys: answer.selected_keys || [],
        }),
      ),
    });

    setIsSubmitting(false);
    window.dispatchEvent(new Event("creator-engine-attempt-completed"));
  }

  if (isLoading) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-[#020711] text-sm text-white/52">
        Loading Creator Challenge...
      </main>
    );
  }

  if (!quiz) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-[#020711] px-5 text-white">
        <section className="w-full max-w-lg rounded-[28px] border border-white/10 bg-white/[0.045] p-7 text-center">
          <h1 className="text-3xl font-black">Challenge unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-white/44">
            {errorMessage ||
              "This Creator Club challenge cannot be played right now."}
          </p>
          <Link
            href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
              clubSlug,
            )}`}
            className="mt-6 inline-flex min-h-11 items-center rounded-full border border-cyan-200/18 bg-cyan-300/[0.06] px-5 text-[9px] font-black uppercase tracking-[0.09em] text-cyan-100 no-underline"
          >
            Back to Club
          </Link>
        </section>
      </main>
    );
  }

  if (result) {
    return (
      <main className="fixed inset-0 overflow-y-auto bg-[#020711] px-4 py-5 text-white sm:px-6">
        <div className="mx-auto max-w-[1100px]">
          <header className="flex items-center justify-between gap-3">
            <Link
              href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
                quiz.club_slug,
              )}`}
              className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-[8px] font-black uppercase tracking-[0.09em] text-white/48 no-underline"
            >
              ← {quiz.club_name}
            </Link>
            <span className="text-[8px] font-black uppercase tracking-[0.12em] text-cyan-100/44">
              Attempt {result.attempt_number}
            </span>
          </header>

          <section className="mt-5 rounded-[32px] border border-cyan-200/13 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_35%),linear-gradient(145deg,rgba(5,26,48,0.94),rgba(2,7,17,0.98))] p-6 text-center sm:p-8">
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/58">
              Creator Engine V2 · Challenge Complete
            </p>
            <h1 className="mt-3 font-serif text-4xl font-normal sm:text-6xl">
              {quiz.title}
            </h1>

            <div className="mx-auto mt-7 grid max-w-3xl gap-3 sm:grid-cols-4">
              <ResultMetric
                label="Score"
                value={`${result.score_percent}%`}
              />
              <ResultMetric
                label="Points"
                value={result.total_points.toLocaleString()}
              />
              <ResultMetric
                label="Full Credit"
                value={`${result.correct_count}/${result.total_questions}`}
              />
              <ResultMetric
                label="Time"
                value={formatTime(result.total_response_time_ms)}
              />
            </div>

            {result.partial_count > 0 && (
              <p className="mt-4 text-[10px] text-amber-100/58">
                {result.partial_count} estimation question
                {result.partial_count === 1 ? "" : "s"} received partial
                credit.
              </p>
            )}

            <div className="mt-7 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => void load()}
                className="min-h-11 rounded-full border border-cyan-200/22 bg-cyan-300/[0.08] px-5 text-[9px] font-black uppercase tracking-[0.09em] text-cyan-100"
              >
                Play Again
              </button>
              <Link
                href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
                  quiz.club_slug,
                )}`}
                className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/[0.035] px-5 text-[9px] font-black uppercase tracking-[0.09em] text-white/44 no-underline"
              >
                Back to Club
              </Link>
            </div>
          </section>

          <section className="mt-5 rounded-[28px] border border-white/9 bg-white/[0.03] p-5 sm:p-6">
            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/34">
              Answer Review
            </p>

            <div className="mt-4 grid gap-3">
              {quiz.questions.map((question) => {
                const answer = questionResultMap.get(question.id);
                const credit = Number(answer?.credit || 0);

                return (
                  <article
                    key={question.id}
                    className={`rounded-[20px] border p-4 ${
                      credit >= 1
                        ? "border-emerald-200/12 bg-emerald-400/[0.035]"
                        : credit > 0
                          ? "border-amber-200/12 bg-amber-300/[0.035]"
                          : "border-red-200/10 bg-red-400/[0.025]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <small className="text-[7px] font-black uppercase tracking-[0.1em] text-white/28">
                          Question {question.question_order}
                        </small>
                        <strong className="mt-1 block text-sm leading-5">
                          {question.prompt}
                        </strong>
                      </span>

                      <span
                        className={`shrink-0 rounded-full border px-3 py-1 text-[7px] font-black uppercase tracking-[0.07em] ${
                          credit >= 1
                            ? "border-emerald-200/16 text-emerald-100"
                            : credit > 0
                              ? "border-amber-200/16 text-amber-100"
                              : "border-red-200/14 text-red-100"
                        }`}
                      >
                        {credit >= 1
                          ? "Full Credit"
                          : credit > 0
                            ? "Partial Credit"
                            : "No Credit"}
                      </span>
                    </div>

                    {answer?.explanation && (
                      <p className="mt-3 border-t border-white/7 pt-3 text-[10px] leading-5 text-white/40">
                        {answer.explanation}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#020711] text-white">
      {quiz.cover_image_url && (
        <img
          src={quiz.cover_image_url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-[0.10]"
        />
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.10),transparent_30%),linear-gradient(180deg,rgba(2,7,17,0.95),rgba(2,7,17,0.99))]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-white/8 bg-[#020711]/72 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3">
            <Link
              href={`/milo-world/quiz-hall/clubs/${encodeURIComponent(
                quiz.club_slug,
              )}`}
              className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-[8px] font-black uppercase tracking-[0.09em] text-white/48 no-underline"
            >
              ← Exit
            </Link>

            <div className="min-w-0 text-center">
              <p className="truncate text-[7px] font-black uppercase tracking-[0.13em] text-cyan-100/48">
                {quiz.club_name}
              </p>
              <strong className="mt-1 block truncate text-sm">
                {quiz.title}
              </strong>
            </div>

            <span className="shrink-0 text-[9px] font-black text-white/42">
              {questionIndex + 1}/{quiz.questions.length}
            </span>
          </div>

          <div className="mx-auto mt-3 h-1.5 max-w-[1180px] overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className="h-full rounded-full bg-cyan-200/70 transition-all"
              style={{
                width: `${Math.max(
                  4,
                  ((questionIndex + 1) / quiz.questions.length) * 100,
                )}%`,
              }}
            />
          </div>
        </header>

        <section className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="mx-auto max-w-[980px]">
            {errorMessage && (
              <p className="mb-4 rounded-xl border border-red-200/14 bg-red-400/[0.06] px-4 py-3 text-[10px] text-red-100">
                {errorMessage}
              </p>
            )}

            <CreatorQuestionRenderer
              question={currentQuestion}
              value={currentValue}
              onChange={setCurrentValue}
              disabled={isSubmitting}
            />

            <div className="mt-4 flex items-center justify-between gap-3 rounded-[20px] border border-white/8 bg-white/[0.025] p-3">
              <span className="text-[9px] text-white/28">
                {currentQuestion.question_type === "choice_grid" &&
                String(
                  currentQuestion.config?.selection_mode || "single",
                ) === "multi"
                  ? "Choose every correct tile, then lock your answer."
                  : "Make your choice, then lock your answer."}
              </span>

              <button
                type="button"
                disabled={
                  isSubmitting ||
                  !canSubmitAnswer(currentQuestion, currentValue)
                }
                onClick={() => void lockAnswer()}
                className="min-h-11 shrink-0 rounded-full border border-cyan-200/22 bg-cyan-300/[0.08] px-6 text-[9px] font-black uppercase tracking-[0.09em] text-cyan-100 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {isSubmitting
                  ? "Saving..."
                  : questionIndex === quiz.questions.length - 1
                    ? "Finish Challenge"
                    : "Lock Answer →"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ResultMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/9 bg-black/16 px-4 py-4">
      <strong className="block text-2xl text-cyan-100">{value}</strong>
      <span className="mt-1 block text-[7px] font-black uppercase tracking-[0.09em] text-white/26">
        {label}
      </span>
    </div>
  );
}
