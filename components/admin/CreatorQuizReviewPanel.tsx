"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type QuizStatus =
  | "draft"
  | "submitted"
  | "published"
  | "rejected"
  | "archived";

type ReviewQuiz = {
  quiz_id: string;
  creator_partner_id: string;
  creator_display_name: string;
  club_id: string;
  club_name: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  status: QuizStatus;
  question_count: number;
  review_note: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type ReviewQuestion = {
  id: string;
  quiz_id: string;
  question_order: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  explanation: string | null;
  topic: string | null;
  difficulty: number;
};

type ReviewFilter = "submitted" | "all";

function statusClass(status: QuizStatus) {
  if (status === "published") {
    return "border-emerald-200/22 bg-emerald-400/10 text-emerald-100";
  }
  if (status === "submitted") {
    return "border-cyan-200/22 bg-cyan-400/10 text-cyan-100";
  }
  if (status === "rejected") {
    return "border-red-200/22 bg-red-400/10 text-red-100";
  }
  if (status === "archived") {
    return "border-white/12 bg-white/[0.04] text-white/44";
  }
  return "border-violet-200/22 bg-violet-400/10 text-violet-100";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CreatorQuizReviewPanel({
  creatorPartnerId,
  creatorDisplayName,
}: {
  creatorPartnerId: string;
  creatorDisplayName: string;
}) {
  const [quizzes, setQuizzes] = useState<ReviewQuiz[]>([]);
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [filter, setFilter] = useState<ReviewFilter>("submitted");
  const [reviewNote, setReviewNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedQuiz = useMemo(
    () => quizzes.find((quiz) => quiz.quiz_id === selectedQuizId) || null,
    [quizzes, selectedQuizId],
  );

  const filteredQuizzes = useMemo(() => {
    if (filter === "all") return quizzes;
    return quizzes.filter((quiz) => quiz.status === "submitted");
  }, [quizzes, filter]);

  const submittedCount = quizzes.filter(
    (quiz) => quiz.status === "submitted",
  ).length;
  const publishedCount = quizzes.filter(
    (quiz) => quiz.status === "published",
  ).length;

  useEffect(() => {
    setSelectedQuizId("");
    setQuestions([]);
    setReviewNote("");
    setMessage("");
    setErrorMessage("");
    void loadQuizzes();
  }, [creatorPartnerId]);

  useEffect(() => {
    if (!selectedQuizId) {
      setQuestions([]);
      return;
    }

    void loadQuestions(selectedQuizId);
  }, [selectedQuizId]);

  async function loadQuizzes(preferredQuizId?: string) {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "admin_get_creator_quiz_review_queue",
      { p_creator_partner_id: creatorPartnerId },
    );

    if (error) {
      setQuizzes([]);
      setErrorMessage(
        error.message || "Could not load creator quiz review queue.",
      );
      setIsLoading(false);
      return;
    }

    const next = ((data || []) as ReviewQuiz[]).map((quiz) => ({
      ...quiz,
      question_count: Number(quiz.question_count || 0),
    }));

    setQuizzes(next);

    const nextSelected =
      preferredQuizId && next.some((quiz) => quiz.quiz_id === preferredQuizId)
        ? preferredQuizId
        : selectedQuizId &&
            next.some((quiz) => quiz.quiz_id === selectedQuizId)
          ? selectedQuizId
          : next.find((quiz) => quiz.status === "submitted")?.quiz_id ||
            next[0]?.quiz_id ||
            "";

    setSelectedQuizId(nextSelected);

    const selected = next.find((quiz) => quiz.quiz_id === nextSelected);
    setReviewNote(selected?.review_note || "");
    setIsLoading(false);
  }

  async function loadQuestions(quizId: string) {
    setIsLoadingQuestions(true);

    const { data, error } = await supabase.rpc(
      "admin_get_creator_quiz_questions",
      { p_quiz_id: quizId },
    );

    if (error) {
      setQuestions([]);
      setErrorMessage(
        error.message || "Could not load creator quiz questions.",
      );
      setIsLoadingQuestions(false);
      return;
    }

    setQuestions(
      ((data || []) as ReviewQuestion[]).map((question) => ({
        ...question,
        difficulty: Number(question.difficulty || 1),
        question_order: Number(question.question_order || 0),
      })),
    );
    setIsLoadingQuestions(false);
  }

  function selectQuiz(quiz: ReviewQuiz) {
    setSelectedQuizId(quiz.quiz_id);
    setReviewNote(quiz.review_note || "");
    setMessage("");
    setErrorMessage("");
  }

  async function reviewQuiz(
    decision: "publish" | "reject" | "return_to_draft",
  ) {
    if (!selectedQuiz) return;

    if (decision === "reject" && !reviewNote.trim()) {
      setErrorMessage("Enter a review note before rejecting a quiz.");
      return;
    }

    const action =
      decision === "publish"
        ? "publish"
        : decision === "reject"
          ? "reject"
          : "return to draft";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${selectedQuiz.title}"?`,
    );
    if (!confirmed) return;

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("admin_review_creator_quiz", {
      p_quiz_id: selectedQuiz.quiz_id,
      p_decision: decision,
      p_review_note: reviewNote.trim() || null,
    });

    if (error) {
      setErrorMessage(error.message || "Could not review creator quiz.");
      setIsSaving(false);
      return;
    }

    setMessage(
      decision === "publish"
        ? `"${selectedQuiz.title}" is now published.`
        : decision === "reject"
          ? `"${selectedQuiz.title}" was returned to the creator with feedback.`
          : `"${selectedQuiz.title}" is back in draft.`,
    );

    await loadQuizzes(selectedQuiz.quiz_id);
    setIsSaving(false);
  }

  return (
    <article className="rounded-[32px] border border-violet-200/16 bg-[linear-gradient(180deg,rgba(72,42,110,0.16),rgba(4,20,48,0.80))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="m-0 text-xs font-bold uppercase tracking-[0.2em] text-violet-200">
            Phase 3 · Content Review
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-white">
            {creatorDisplayName}’s quiz review
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/52">
            Creator quizzes remain private while they are drafted. Submitted
            quizzes must be reviewed here before they can become published
            content.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <MiniMetric label="Total" value={isLoading ? "…" : quizzes.length} />
          <MiniMetric
            label="Submitted"
            value={isLoading ? "…" : submittedCount}
          />
          <MiniMetric
            label="Published"
            value={isLoading ? "…" : publishedCount}
          />
        </div>
      </div>

      {message && (
        <p className="mt-5 rounded-2xl border border-emerald-200/18 bg-emerald-400/[0.07] px-5 py-4 text-sm text-emerald-100">
          {message}
        </p>
      )}

      {errorMessage && (
        <p className="mt-5 rounded-2xl border border-red-200/18 bg-red-400/[0.07] px-5 py-4 text-sm text-red-100">
          {errorMessage}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <FilterButton
          active={filter === "submitted"}
          onClick={() => setFilter("submitted")}
        >
          Awaiting Review
        </FilterButton>
        <FilterButton
          active={filter === "all"}
          onClick={() => setFilter("all")}
        >
          All Creator Quizzes
        </FilterButton>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[310px_minmax(0,1fr)]">
        <aside className="rounded-[24px] border border-white/10 bg-black/14 p-4">
          <div className="dream-admin-scroll max-h-[650px] space-y-2 overflow-y-auto pr-1">
            {isLoading ? (
              <p className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-xs text-white/42">
                Loading quizzes...
              </p>
            ) : filteredQuizzes.length === 0 ? (
              <p className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-xs leading-5 text-white/42">
                {filter === "submitted"
                  ? "No quizzes are waiting for review."
                  : "This creator has not built any quizzes yet."}
              </p>
            ) : (
              filteredQuizzes.map((quiz) => (
                <button
                  key={quiz.quiz_id}
                  type="button"
                  onClick={() => selectQuiz(quiz)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    quiz.quiz_id === selectedQuizId
                      ? "border-violet-200/30 bg-violet-300/[0.08]"
                      : "border-white/8 bg-white/[0.025] hover:border-white/16"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 flex-1">
                      <strong className="block line-clamp-2 text-xs leading-5 text-white">
                        {quiz.title}
                      </strong>
                      <small className="mt-1 block truncate text-[9px] text-white/34">
                        {quiz.club_name}
                      </small>
                      <small className="mt-2 block text-[9px] text-violet-100/62">
                        {quiz.question_count}/10 questions
                      </small>
                    </span>

                    <span
                      className={`rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-[0.07em] ${statusClass(
                        quiz.status,
                      )}`}
                    >
                      {quiz.status}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="min-w-0">
          {!selectedQuiz ? (
            <div className="flex min-h-[300px] items-center justify-center rounded-[24px] border border-white/10 bg-black/14 p-6 text-center text-sm text-white/42">
              Select a creator quiz to review it.
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-black/14 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-100/60">
                    {selectedQuiz.club_name}
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-white">
                    {selectedQuiz.title}
                  </h3>
                  <p className="mt-2 text-xs text-white/40">
                    {selectedQuiz.question_count}/10 questions · Submitted{" "}
                    {formatDate(selectedQuiz.submitted_at)}
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.09em] ${statusClass(
                    selectedQuiz.status,
                  )}`}
                >
                  {selectedQuiz.status}
                </span>
              </div>

              {selectedQuiz.description && (
                <p className="mt-4 text-xs leading-5 text-white/50">
                  {selectedQuiz.description}
                </p>
              )}

              <div className="dream-admin-scroll mt-5 max-h-[560px] space-y-3 overflow-y-auto pr-1">
                {isLoadingQuestions ? (
                  <p className="text-xs text-white/40">Loading questions...</p>
                ) : questions.length === 0 ? (
                  <p className="rounded-2xl border border-white/8 bg-white/[0.025] p-4 text-xs text-white/42">
                    No saved questions.
                  </p>
                ) : (
                  questions.map((question) => (
                    <article
                      key={question.id}
                      className="rounded-2xl border border-white/9 bg-white/[0.025] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[8px] font-black uppercase tracking-[0.12em] text-violet-100/56">
                            Question {question.question_order} · Difficulty{" "}
                            {question.difficulty}
                            {question.topic ? ` · ${question.topic}` : ""}
                          </p>
                          <h4 className="mt-2 text-sm font-black leading-5 text-white">
                            {question.question}
                          </h4>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {[
                          ["A", question.option_a],
                          ["B", question.option_b],
                          ["C", question.option_c],
                          ["D", question.option_d],
                        ].map(([letter, answer]) => (
                          <div
                            key={letter}
                            className={`rounded-xl border px-3 py-2 text-[10px] leading-4 ${
                              question.correct_option === letter
                                ? "border-emerald-200/18 bg-emerald-400/[0.07] text-emerald-100"
                                : "border-white/8 bg-white/[0.025] text-white/52"
                            }`}
                          >
                            <strong>{letter}.</strong> {answer}
                          </div>
                        ))}
                      </div>

                      {question.explanation && (
                        <p className="mt-3 rounded-xl border border-cyan-200/8 bg-cyan-300/[0.025] px-3 py-2 text-[10px] leading-4 text-white/46">
                          <strong className="text-cyan-100/70">
                            Explanation:
                          </strong>{" "}
                          {question.explanation}
                        </p>
                      )}
                    </article>
                  ))
                )}
              </div>

              <label className="mt-5 block">
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.12em] text-white/38">
                  Review note
                </span>
                <textarea
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Required when rejecting. Keep feedback clear and specific."
                  className="w-full resize-none rounded-2xl border border-violet-200/14 bg-[#061632]/78 px-4 py-3 text-xs leading-5 text-white outline-none placeholder:text-white/26 focus:border-violet-200/36"
                />
              </label>

              <div className="mt-4 flex flex-wrap gap-2">
                {selectedQuiz.status === "submitted" && (
                  <>
                    <button
                      type="button"
                      disabled={
                        isSaving ||
                        selectedQuiz.question_count !== 10 ||
                        questions.length !== 10
                      }
                      onClick={() => void reviewQuiz("publish")}
                      className="min-h-11 rounded-full border border-emerald-200/22 bg-emerald-400/10 px-5 text-[9px] font-black uppercase tracking-[0.1em] text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Publish Quiz
                    </button>

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void reviewQuiz("reject")}
                      className="min-h-11 rounded-full border border-red-200/22 bg-red-400/10 px-5 text-[9px] font-black uppercase tracking-[0.1em] text-red-100 disabled:opacity-40"
                    >
                      Reject with Feedback
                    </button>
                  </>
                )}

                {(selectedQuiz.status === "published" ||
                  selectedQuiz.status === "rejected") && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void reviewQuiz("return_to_draft")}
                    className="min-h-11 rounded-full border border-violet-200/22 bg-violet-400/10 px-5 text-[9px] font-black uppercase tracking-[0.1em] text-violet-100 disabled:opacity-40"
                  >
                    Return to Draft
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </article>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-full border px-4 text-[9px] font-black uppercase tracking-[0.09em] ${
        active
          ? "border-violet-200/28 bg-violet-400/10 text-violet-100"
          : "border-white/10 bg-white/[0.03] text-white/42"
      }`}
    >
      {children}
    </button>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-[78px] rounded-2xl border border-violet-200/12 bg-violet-300/[0.05] px-3 py-2">
      <strong className="block text-lg text-violet-100">{value}</strong>
      <span className="text-[8px] font-black uppercase tracking-[0.09em] text-white/32">
        {label}
      </span>
    </div>
  );
}
