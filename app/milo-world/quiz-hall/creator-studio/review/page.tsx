"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import CreatorQuestionRenderer, {
  type CreatorEngineAnswerValue,
  type CreatorEngineQuestion,
} from "@/components/milo/creator-engine/CreatorQuestionRenderer";

type QueueRow = {
  quiz_id: string;
  title: string;
  status: string;
  submitted_at: string | null;
  question_count: number;
};

type ReviewQuestion = CreatorEngineQuestion & {
  answer_config: Record<string, unknown>;
  migrated_from_legacy: boolean;
  options: (CreatorEngineQuestion["options"][number] & {
    is_correct: boolean;
  })[];
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function CreatorEngineV2AdminReviewPage() {
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [reviewNote, setReviewNote] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedQuiz = useMemo(
    () => queue.find((quiz) => quiz.quiz_id === selectedQuizId) || null,
    [queue, selectedQuizId],
  );

  useEffect(() => {
    void loadQueue();
  }, []);

  useEffect(() => {
    if (!selectedQuizId) {
      setQuestions([]);
      return;
    }

    void loadQuestions(selectedQuizId);
  }, [selectedQuizId]);

  async function loadQueue() {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "admin_creator_engine_review_queue_v2",
    );

    if (error) {
      setQueue([]);
      setSelectedQuizId("");
      setErrorMessage(
        error.message || "Creator Engine review queue could not be loaded.",
      );
      setIsLoading(false);
      return;
    }

    const rows = ((data || []) as QueueRow[]).map((row) => ({
      ...row,
      quiz_id: String(row.quiz_id),
      title: String(row.title || "Creator Challenge"),
      status: String(row.status || "submitted"),
      submitted_at: row.submitted_at ? String(row.submitted_at) : null,
      question_count: Number(row.question_count || 0),
    }));

    setQueue(rows);
    setSelectedQuizId((current) =>
      current && rows.some((row) => row.quiz_id === current)
        ? current
        : rows[0]?.quiz_id || "",
    );
    setIsLoading(false);
  }

  async function loadQuestions(quizId: string) {
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "admin_creator_engine_get_quiz_questions_v2",
      { p_quiz_id: quizId },
    );

    if (error) {
      setQuestions([]);
      setErrorMessage(
        error.message || "Creator Engine questions could not be loaded.",
      );
      return;
    }

    setQuestions(
      ((data || []) as ReviewQuestion[]).map((question) => ({
        ...question,
        id: String(question.id),
        quiz_id: String(question.quiz_id || ""),
        question_order: Number(question.question_order || 0),
        difficulty: Number(question.difficulty || 2),
        config: question.config || {},
        answer_config: question.answer_config || {},
        migrated_from_legacy: Boolean(question.migrated_from_legacy),
        options: (question.options || []).map((option) => ({
          ...option,
          option_key: String(option.option_key),
          label: String(option.label || ""),
          image_url: option.image_url ? String(option.image_url) : null,
          sort_order: Number(option.sort_order || 0),
          is_correct: Boolean(option.is_correct),
        })),
      })),
    );
  }

  async function decide(decision: "published" | "rejected") {
    if (!selectedQuiz) return;

    if (
      !window.confirm(
        decision === "published"
          ? `Publish "${selectedQuiz.title}"?`
          : `Return "${selectedQuiz.title}" to the creator for changes?`,
      )
    ) {
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "admin_creator_engine_review_quiz_v2",
      {
        p_quiz_id: selectedQuiz.quiz_id,
        p_decision: decision,
        p_review_note: reviewNote.trim() || null,
      },
    );

    if (error) {
      setErrorMessage(
        error.message || "Review decision could not be saved.",
      );
      setIsSaving(false);
      return;
    }

    setMessage(
      decision === "published"
        ? `"${selectedQuiz.title}" is now published.`
        : `"${selectedQuiz.title}" was returned for changes.`,
    );
    setReviewNote("");
    await loadQueue();
    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-[#020711] text-sm text-white/48">
        Loading Creator Engine Review...
      </main>
    );
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#020711] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.12),transparent_32%),linear-gradient(180deg,#041124_0%,#020711_100%)]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-white/8 bg-[#020711]/76 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/milo-world/quiz-hall/communities"
                className="rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-[8px] font-black uppercase tracking-[0.09em] text-white/46 no-underline"
              >
                ← Creator Clubs
              </Link>
              <div className="min-w-0">
                <p className="truncate text-[7px] font-black uppercase tracking-[0.14em] text-violet-100/54">
                  Admin · Creator Engine V2
                </p>
                <h1 className="truncate text-xl font-black">
                  Challenge Review
                </h1>
              </div>
            </div>

            <span className="rounded-full border border-violet-200/14 bg-violet-300/[0.05] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] text-violet-100">
              {queue.length} waiting
            </span>
          </div>
        </header>

        <section className="mx-auto grid min-h-0 w-full max-w-[1500px] flex-1 gap-4 overflow-hidden px-4 py-4 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-y-auto rounded-[24px] border border-white/9 bg-white/[0.03] p-3">
            <p className="px-2 text-[8px] font-black uppercase tracking-[0.12em] text-white/28">
              Submitted Challenges
            </p>

            {queue.length === 0 ? (
              <p className="mt-4 rounded-xl border border-white/8 bg-black/14 p-4 text-[10px] leading-5 text-white/34">
                Nothing is waiting for Engine V2 review.
              </p>
            ) : (
              <div className="mt-3 grid gap-2">
                {queue.map((quiz) => (
                  <button
                    key={quiz.quiz_id}
                    type="button"
                    onClick={() => {
                      setSelectedQuizId(quiz.quiz_id);
                      setReviewNote("");
                      setMessage("");
                      setErrorMessage("");
                    }}
                    className={`rounded-[16px] border p-3 text-left ${
                      selectedQuizId === quiz.quiz_id
                        ? "border-violet-200/22 bg-violet-300/[0.06]"
                        : "border-white/8 bg-black/12"
                    }`}
                  >
                    <strong className="block line-clamp-2 text-[11px] leading-5">
                      {quiz.title}
                    </strong>
                    <span className="mt-2 block text-[8px] text-white/28">
                      {quiz.question_count}/10 questions ·{" "}
                      {formatDate(quiz.submitted_at)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <section className="min-h-0 overflow-y-auto rounded-[24px] border border-white/9 bg-white/[0.03] p-4 sm:p-5">
            {(message || errorMessage) && (
              <div className="mb-4">
                {message && (
                  <p className="rounded-xl border border-emerald-200/14 bg-emerald-400/[0.06] px-3 py-2 text-[10px] text-emerald-100">
                    {message}
                  </p>
                )}
                {errorMessage && (
                  <p className="rounded-xl border border-red-200/14 bg-red-400/[0.06] px-3 py-2 text-[10px] text-red-100">
                    {errorMessage}
                  </p>
                )}
              </div>
            )}

            {!selectedQuiz ? (
              <div className="flex min-h-[440px] items-center justify-center text-center">
                <div>
                  <h2 className="text-2xl font-black">
                    No challenge selected.
                  </h2>
                  <p className="mt-2 text-xs text-white/34">
                    Choose a submitted Creator challenge from the review queue.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.13em] text-violet-100/56">
                      Engine V2 Review
                    </p>
                    <h2 className="mt-1 text-3xl font-black">
                      {selectedQuiz.title}
                    </h2>
                    <p className="mt-2 text-[9px] text-white/28">
                      Submitted {formatDate(selectedQuiz.submitted_at)}
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] ${
                      questions.length === 10
                        ? "border-emerald-200/14 bg-emerald-400/[0.05] text-emerald-100"
                        : "border-red-200/14 bg-red-400/[0.05] text-red-100"
                    }`}
                  >
                    {questions.length}/10 questions
                  </span>
                </div>

                <div className="mt-5 grid gap-4">
                  {questions.map((question) => (
                    <article
                      key={question.id}
                      className="rounded-[22px] border border-white/8 bg-black/14 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-[8px] font-black uppercase tracking-[0.11em] text-white/30">
                          Question {question.question_order} · Difficulty{" "}
                          {question.difficulty}
                        </span>
                        {question.migrated_from_legacy && (
                          <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.07em] text-white/28">
                            Legacy migrated
                          </span>
                        )}
                      </div>

                      <CreatorQuestionRenderer
                        question={question}
                        value={previewValue(question)}
                        onChange={() => {}}
                        disabled
                        compact
                      />

                      <AnswerKey question={question} />

                      {question.explanation && (
                        <p className="mt-3 rounded-xl border border-white/7 bg-white/[0.02] px-3 py-3 text-[9px] leading-4 text-white/36">
                          <strong className="text-white/58">
                            Explanation:
                          </strong>{" "}
                          {question.explanation}
                        </p>
                      )}
                    </article>
                  ))}
                </div>

                <div className="sticky bottom-0 mt-5 rounded-[22px] border border-violet-200/14 bg-[#071327]/95 p-4 backdrop-blur-xl">
                  <label>
                    <span className="mb-1.5 block text-[7px] font-black uppercase tracking-[0.1em] text-white/28">
                      Review note · optional when publishing
                    </span>
                    <textarea
                      value={reviewNote}
                      onChange={(event) => setReviewNote(event.target.value)}
                      rows={3}
                      maxLength={1200}
                      placeholder="What should the creator change, or any internal review note..."
                      className="w-full resize-none rounded-xl border border-white/10 bg-[#06152d] px-3 py-3 text-[10px] leading-5 text-white outline-none placeholder:text-white/22 focus:border-violet-200/28"
                    />
                  </label>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isSaving || questions.length !== 10}
                      onClick={() => void decide("published")}
                      className="min-h-10 rounded-full border border-emerald-200/20 bg-emerald-400/[0.07] px-5 text-[8px] font-black uppercase tracking-[0.09em] text-emerald-100 disabled:opacity-35"
                    >
                      {isSaving ? "Saving..." : "Approve & Publish"}
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void decide("rejected")}
                      className="min-h-10 rounded-full border border-red-200/16 bg-red-400/[0.055] px-5 text-[8px] font-black uppercase tracking-[0.09em] text-red-100 disabled:opacity-35"
                    >
                      Return for Changes
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function previewValue(
  question: ReviewQuestion,
): CreatorEngineAnswerValue {
  if (question.question_type === "bar_estimate") {
    const min = Number(question.config?.min ?? 0);
    const max = Number(question.config?.max ?? 100);
    return { selectedKeys: [], numericValue: min + (max - min) / 2 };
  }

  if (question.question_type === "pie_estimate") {
    return { selectedKeys: [], numericValue: 50 };
  }

  return { selectedKeys: [], numericValue: null };
}

function AnswerKey({ question }: { question: ReviewQuestion }) {
  if (
    question.question_type === "classic_choice" ||
    question.question_type === "choice_grid"
  ) {
    const correct = question.options.filter((option) => option.is_correct);

    return (
      <div className="mt-3 rounded-xl border border-emerald-200/10 bg-emerald-400/[0.03] px-3 py-3">
        <span className="text-[7px] font-black uppercase tracking-[0.09em] text-emerald-100/52">
          Creator answer key
        </span>
        <p className="mt-1 text-[10px] leading-5 text-white/50">
          {correct.length > 0
            ? correct
                .map(
                  (option) =>
                    `${option.option_key} · ${
                      option.label || "Image option"
                    }`,
                )
                .join(" · ")
            : "No correct option set"}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-amber-200/10 bg-amber-300/[0.03] px-3 py-3">
      <span className="text-[7px] font-black uppercase tracking-[0.09em] text-amber-100/52">
        Creator scoring target
      </span>
      <p className="mt-1 text-[10px] leading-5 text-white/50">
        Target {Number(question.answer_config?.target ?? 0)} · full credit ±
        {Number(question.answer_config?.full_tolerance ?? 0)} · partial credit ±
        {Number(question.answer_config?.acceptable_tolerance ?? 0)}
      </p>
    </div>
  );
}
