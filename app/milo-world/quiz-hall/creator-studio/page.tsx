"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type CreatorAccess = {
  creator_partner_id: string;
  display_name: string;
  slug: string;
  status: string;
};

type CreatorClub = {
  club_id: string;
  club_name: string;
  club_slug: string;
  topic: string | null;
  status: string;
};

type CreatorQuiz = {
  quiz_id: string;
  club_id: string;
  club_name: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  status: "draft" | "submitted" | "published" | "rejected" | "archived";
  question_count: number;
  review_note: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type QuizQuestion = {
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

type QuizMetaForm = {
  clubId: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string;
};

type QuestionForm = {
  questionOrder: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
  explanation: string;
  topic: string;
  difficulty: number;
};

const EMPTY_META: QuizMetaForm = {
  clubId: "",
  title: "",
  slug: "",
  description: "",
  coverImageUrl: "",
};

function emptyQuestion(order = 1): QuestionForm {
  return {
    questionOrder: order,
    question: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctOption: "A",
    explanation: "",
    topic: "",
    difficulty: 2,
  };
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function quizStatusClass(status: CreatorQuiz["status"]) {
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
    return "border-white/12 bg-white/[0.04] text-white/42";
  }
  return "border-violet-200/22 bg-violet-400/10 text-violet-100";
}

function formFromQuestion(question: QuizQuestion): QuestionForm {
  return {
    questionOrder: Number(question.question_order),
    question: question.question || "",
    optionA: question.option_a || "",
    optionB: question.option_b || "",
    optionC: question.option_c || "",
    optionD: question.option_d || "",
    correctOption: question.correct_option || "A",
    explanation: question.explanation || "",
    topic: question.topic || "",
    difficulty: Number(question.difficulty || 2),
  };
}

export default function CreatorStudioPage() {
  const router = useRouter();

  const [creator, setCreator] = useState<CreatorAccess | null>(null);
  const [clubs, setClubs] = useState<CreatorClub[]>([]);
  const [quizzes, setQuizzes] = useState<CreatorQuiz[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);

  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [selectedQuestionOrder, setSelectedQuestionOrder] = useState(1);

  const [createForm, setCreateForm] = useState<QuizMetaForm>(EMPTY_META);
  const [createSlugTouched, setCreateSlugTouched] = useState(false);
  const [editForm, setEditForm] = useState<QuizMetaForm>(EMPTY_META);
  const [questionForm, setQuestionForm] = useState<QuestionForm>(
    emptyQuestion(1),
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedQuiz = useMemo(
    () => quizzes.find((quiz) => quiz.quiz_id === selectedQuizId) || null,
    [quizzes, selectedQuizId],
  );

  const savedOrders = useMemo(
    () => new Set(questions.map((question) => Number(question.question_order))),
    [questions],
  );

  const canEditSelected =
    selectedQuiz?.status === "draft" || selectedQuiz?.status === "rejected";

  useEffect(() => {
    const oldBody = document.body.style.overflow;
    const oldHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    void loadStudio();

    return () => {
      document.body.style.overflow = oldBody;
      document.documentElement.style.overflow = oldHtml;
    };
  }, []);

  useEffect(() => {
    if (!selectedQuiz) {
      setQuestions([]);
      setEditForm(EMPTY_META);
      return;
    }

    setEditForm({
      clubId: selectedQuiz.club_id,
      title: selectedQuiz.title,
      slug: selectedQuiz.slug,
      description: selectedQuiz.description || "",
      coverImageUrl: selectedQuiz.cover_image_url || "",
    });

    void loadQuestions(selectedQuiz.quiz_id);
  }, [selectedQuizId]);

  useEffect(() => {
    const savedQuestion = questions.find(
      (question) => Number(question.question_order) === selectedQuestionOrder,
    );

    setQuestionForm(
      savedQuestion
        ? formFromQuestion(savedQuestion)
        : emptyQuestion(selectedQuestionOrder),
    );
  }, [selectedQuestionOrder, questions]);

  async function loadStudio(preferredQuizId?: string) {
    setIsLoading(true);
    setErrorMessage("");

    const userResponse = await supabase.auth.getUser();
    if (!userResponse.data.user) {
      router.replace(
        `/login?next=${encodeURIComponent(
          "/milo-world/quiz-hall/creator-studio",
        )}`,
      );
      return;
    }

    const creatorResponse = await supabase.rpc("get_my_creator_partner");

    if (creatorResponse.error) {
      setErrorMessage(
        creatorResponse.error.message || "Creator access could not be loaded.",
      );
      setIsLoading(false);
      return;
    }

    const creatorRow = Array.isArray(creatorResponse.data)
      ? creatorResponse.data[0]
      : creatorResponse.data;

    if (!creatorRow) {
      setCreator(null);
      setIsLoading(false);
      return;
    }

    const nextCreator = creatorRow as CreatorAccess;
    setCreator(nextCreator);

    if (nextCreator.status !== "active") {
      setIsLoading(false);
      return;
    }

    const [clubsResponse, quizzesResponse] = await Promise.all([
      supabase.rpc("creator_get_my_clubs"),
      supabase.rpc("creator_get_my_quizzes"),
    ]);

    if (clubsResponse.error) {
      setErrorMessage(clubsResponse.error.message || "Could not load clubs.");
      setIsLoading(false);
      return;
    }

    if (quizzesResponse.error) {
      setErrorMessage(
        quizzesResponse.error.message || "Could not load creator quizzes.",
      );
      setIsLoading(false);
      return;
    }

    const nextClubs = (clubsResponse.data || []) as CreatorClub[];
    const nextQuizzes = ((quizzesResponse.data || []) as CreatorQuiz[]).map(
      (quiz) => ({
        ...quiz,
        question_count: Number(quiz.question_count || 0),
      }),
    );

    setClubs(nextClubs);
    setQuizzes(nextQuizzes);

    setCreateForm((current) => ({
      ...current,
      clubId:
        current.clubId ||
        nextClubs.find((club) => club.status === "active")?.club_id ||
        nextClubs[0]?.club_id ||
        "",
    }));

    const nextSelected =
      preferredQuizId &&
      nextQuizzes.some((quiz) => quiz.quiz_id === preferredQuizId)
        ? preferredQuizId
        : selectedQuizId &&
            nextQuizzes.some((quiz) => quiz.quiz_id === selectedQuizId)
          ? selectedQuizId
          : nextQuizzes[0]?.quiz_id || "";

    setSelectedQuizId(nextSelected);
    setIsLoading(false);
  }

  async function loadQuestions(quizId: string) {
    setIsLoadingQuestions(true);

    const { data, error } = await supabase.rpc(
      "creator_get_quiz_questions",
      { p_quiz_id: quizId },
    );

    if (error) {
      setQuestions([]);
      setErrorMessage(error.message || "Could not load quiz questions.");
      setIsLoadingQuestions(false);
      return;
    }

    const next = ((data || []) as QuizQuestion[]).map((question) => ({
      ...question,
      question_order: Number(question.question_order || 0),
      difficulty: Number(question.difficulty || 1),
    }));

    setQuestions(next);
    setIsLoadingQuestions(false);
  }

  function updateCreate<K extends keyof QuizMetaForm>(
    key: K,
    value: QuizMetaForm[K],
  ) {
    setCreateForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "title" && !createSlugTouched) {
        next.slug = slugify(String(value));
      }
      return next;
    });
  }

  function updateEdit<K extends keyof QuizMetaForm>(
    key: K,
    value: QuizMetaForm[K],
  ) {
    setEditForm((current) => ({ ...current, [key]: value }));
  }

  function updateQuestion<K extends keyof QuestionForm>(
    key: K,
    value: QuestionForm[K],
  ) {
    setQuestionForm((current) => ({ ...current, [key]: value }));
  }

  function validateMeta(form: QuizMetaForm) {
    if (!form.clubId) return "Choose a Creator Club.";
    if (!form.title.trim()) return "Enter a quiz title.";
    if (!form.slug.trim()) return "Enter a quiz slug.";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
      return "Quiz slug can use lowercase letters, numbers and hyphens only.";
    }
    if (form.description.length > 1500) {
      return "Description must be 1500 characters or fewer.";
    }
    return "";
  }

  function validateQuestion(form: QuestionForm) {
    if (!form.question.trim()) return "Enter the question.";
    if (!form.optionA.trim()) return "Enter option A.";
    if (!form.optionB.trim()) return "Enter option B.";
    if (!form.optionC.trim()) return "Enter option C.";
    if (!form.optionD.trim()) return "Enter option D.";

    const normalized = [
      form.optionA,
      form.optionB,
      form.optionC,
      form.optionD,
    ].map((value) => value.trim().toLowerCase());

    if (new Set(normalized).size !== 4) {
      return "All four answer options must be different.";
    }

    if (form.difficulty < 1 || form.difficulty > 5) {
      return "Difficulty must be from 1 to 5.";
    }

    return "";
  }

  async function createQuiz() {
    const validation = validateMeta(createForm);
    if (validation) {
      setErrorMessage(validation);
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase.rpc("creator_create_quiz", {
      p_club_id: createForm.clubId,
      p_title: createForm.title.trim(),
      p_slug: createForm.slug.trim(),
      p_description: createForm.description.trim() || null,
      p_cover_image_url: createForm.coverImageUrl.trim() || null,
    });

    if (error) {
      setErrorMessage(error.message || "Could not create creator quiz.");
      setIsSaving(false);
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const createdId = String(row?.quiz_id || "");

    setCreateForm({
      ...EMPTY_META,
      clubId: createForm.clubId,
    });
    setCreateSlugTouched(false);
    setMessage("Quiz created. Add all 10 questions before submitting.");
    await loadStudio(createdId || undefined);
    setSelectedQuestionOrder(1);
    setIsSaving(false);
  }

  async function saveQuizMeta() {
    if (!selectedQuiz) return;

    const validation = validateMeta(editForm);
    if (validation) {
      setErrorMessage(validation);
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("creator_update_quiz_metadata", {
      p_quiz_id: selectedQuiz.quiz_id,
      p_club_id: editForm.clubId,
      p_title: editForm.title.trim(),
      p_slug: editForm.slug.trim(),
      p_description: editForm.description.trim() || null,
      p_cover_image_url: editForm.coverImageUrl.trim() || null,
    });

    if (error) {
      setErrorMessage(error.message || "Could not save quiz details.");
      setIsSaving(false);
      return;
    }

    setMessage("Quiz details saved.");
    await loadStudio(selectedQuiz.quiz_id);
    setIsSaving(false);
  }

  async function saveQuestion() {
    if (!selectedQuiz) return;

    const validation = validateQuestion(questionForm);
    if (validation) {
      setErrorMessage(validation);
      return;
    }

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("creator_upsert_quiz_question", {
      p_quiz_id: selectedQuiz.quiz_id,
      p_question_order: questionForm.questionOrder,
      p_question: questionForm.question.trim(),
      p_option_a: questionForm.optionA.trim(),
      p_option_b: questionForm.optionB.trim(),
      p_option_c: questionForm.optionC.trim(),
      p_option_d: questionForm.optionD.trim(),
      p_correct_option: questionForm.correctOption,
      p_explanation: questionForm.explanation.trim() || null,
      p_topic: questionForm.topic.trim() || null,
      p_difficulty: Number(questionForm.difficulty),
    });

    if (error) {
      setErrorMessage(error.message || "Could not save question.");
      setIsSaving(false);
      return;
    }

    setMessage(`Question ${questionForm.questionOrder} saved.`);
    await Promise.all([
      loadQuestions(selectedQuiz.quiz_id),
      loadStudio(selectedQuiz.quiz_id),
    ]);
    setIsSaving(false);
  }

  async function clearQuestion() {
    if (!selectedQuiz) return;

    if (!savedOrders.has(selectedQuestionOrder)) {
      setQuestionForm(emptyQuestion(selectedQuestionOrder));
      return;
    }

    const confirmed = window.confirm(
      `Remove question ${selectedQuestionOrder} from this quiz?`,
    );
    if (!confirmed) return;

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("creator_delete_quiz_question", {
      p_quiz_id: selectedQuiz.quiz_id,
      p_question_order: selectedQuestionOrder,
    });

    if (error) {
      setErrorMessage(error.message || "Could not remove question.");
      setIsSaving(false);
      return;
    }

    setMessage(`Question ${selectedQuestionOrder} removed.`);
    await Promise.all([
      loadQuestions(selectedQuiz.quiz_id),
      loadStudio(selectedQuiz.quiz_id),
    ]);
    setIsSaving(false);
  }

  async function submitQuiz() {
    if (!selectedQuiz) return;

    const confirmed = window.confirm(
      `Submit "${selectedQuiz.title}" for Dreamscape review? You will not be able to edit it while it is under review.`,
    );
    if (!confirmed) return;

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("creator_submit_quiz", {
      p_quiz_id: selectedQuiz.quiz_id,
    });

    if (error) {
      setErrorMessage(error.message || "Could not submit quiz.");
      setIsSaving(false);
      return;
    }

    setMessage("Quiz submitted for Dreamscape review.");
    await loadStudio(selectedQuiz.quiz_id);
    setIsSaving(false);
  }

  async function archiveQuiz() {
    if (!selectedQuiz) return;

    const confirmed = window.confirm(
      `Archive "${selectedQuiz.title}"? It will remain in your records but cannot be edited or submitted.`,
    );
    if (!confirmed) return;

    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("creator_archive_quiz", {
      p_quiz_id: selectedQuiz.quiz_id,
    });

    if (error) {
      setErrorMessage(error.message || "Could not archive quiz.");
      setIsSaving(false);
      return;
    }

    setMessage("Quiz archived.");
    await loadStudio(selectedQuiz.quiz_id);
    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <main className="fixed inset-0 flex items-center justify-center bg-[#020711] text-sm text-white/56">
        Opening Creator Studio...
      </main>
    );
  }

  if (!creator) {
    return (
      <AccessMessage
        title="Creator Studio unavailable"
        description="This Dreamscape account is not linked to a Creator Partner record."
      />
    );
  }

  if (creator.status !== "active") {
    return (
      <AccessMessage
        title="Creator Studio is paused"
        description={`Your Creator Partner status is currently ${creator.status}. Contact Dreamscape if you believe this should be active.`}
      />
    );
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#020711] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.12),transparent_34%),linear-gradient(180deg,#041124_0%,#020711_100%)]" />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-white/8 bg-[#020711]/72 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/milo-world/quiz-hall/communities"
                className="inline-flex min-h-[40px] shrink-0 items-center rounded-full border border-white/12 bg-white/[0.04] px-4 text-[9px] font-black uppercase tracking-[0.1em] text-white/64 no-underline"
              >
                ← Creator Clubs
              </Link>
              <div className="min-w-0">
                <p className="truncate text-[8px] font-black uppercase tracking-[0.17em] text-amber-100/64">
                  Milo’s Quiz Hall
                </p>
                <h1 className="truncate text-xl font-black sm:text-2xl">
                  Creator Studio · {creator.display_name}
                </h1>
              </div>
            </div>

            <span className="hidden rounded-full border border-amber-200/18 bg-amber-300/[0.07] px-4 py-2 text-[8px] font-black uppercase tracking-[0.1em] text-amber-100 sm:inline-flex">
              10-question quizzes
            </span>
          </div>
        </header>

        <section className="mx-auto flex w-full max-w-[1500px] min-h-0 flex-1 flex-col gap-4 overflow-hidden p-3 sm:p-5">
          {message && (
            <p className="shrink-0 rounded-2xl border border-emerald-200/18 bg-emerald-400/[0.07] px-4 py-3 text-xs text-emerald-100">
              {message}
            </p>
          )}

          {errorMessage && (
            <p className="shrink-0 rounded-2xl border border-red-200/18 bg-red-400/[0.07] px-4 py-3 text-xs leading-5 text-red-100">
              {errorMessage}
            </p>
          )}

          {clubs.length === 0 ? (
            <div className="flex min-h-0 flex-1 items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.035] p-8 text-center">
              <div className="max-w-xl">
                <h2 className="text-3xl font-black">
                  You need a Creator Club first.
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/48">
                  Dreamscape Admin must create at least one club under your
                  Creator Partner account before you can build club quizzes.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="dream-studio-scroll min-h-0 overflow-y-auto rounded-[26px] border border-white/10 bg-white/[0.035] p-4">
                <section className="rounded-[20px] border border-amber-200/14 bg-amber-300/[0.045] p-4">
                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/62">
                    New quiz
                  </p>

                  <div className="mt-3 grid gap-3">
                    <select
                      value={createForm.clubId}
                      onChange={(event) =>
                        updateCreate("clubId", event.target.value)
                      }
                      className={inputClass}
                    >
                      {clubs.map((club) => (
                        <option key={club.club_id} value={club.club_id}>
                          {club.club_name} · {club.status}
                        </option>
                      ))}
                    </select>

                    <input
                      value={createForm.title}
                      onChange={(event) =>
                        updateCreate("title", event.target.value)
                      }
                      placeholder="Quiz title"
                      className={inputClass}
                    />

                    <input
                      value={createForm.slug}
                      onChange={(event) => {
                        setCreateSlugTouched(true);
                        updateCreate("slug", slugify(event.target.value));
                      }}
                      placeholder="quiz-slug"
                      className={inputClass}
                    />

                    <textarea
                      value={createForm.description}
                      onChange={(event) =>
                        updateCreate("description", event.target.value)
                      }
                      rows={3}
                      maxLength={1500}
                      placeholder="Short quiz description"
                      className={textareaClass}
                    />

                    <input
                      value={createForm.coverImageUrl}
                      onChange={(event) =>
                        updateCreate("coverImageUrl", event.target.value)
                      }
                      placeholder="Cover image URL (optional)"
                      className={inputClass}
                    />

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void createQuiz()}
                      className={primaryButton}
                    >
                      Create Quiz
                    </button>
                  </div>
                </section>

                <div className="mt-4">
                  <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/32">
                    My quizzes
                  </p>

                  <div className="mt-2 space-y-2">
                    {quizzes.length === 0 ? (
                      <p className="rounded-xl border border-white/8 bg-white/[0.025] p-3 text-xs leading-5 text-white/38">
                        No quizzes yet.
                      </p>
                    ) : (
                      quizzes.map((quiz) => (
                        <button
                          key={quiz.quiz_id}
                          type="button"
                          onClick={() => {
                            setSelectedQuizId(quiz.quiz_id);
                            setSelectedQuestionOrder(1);
                            setMessage("");
                            setErrorMessage("");
                          }}
                          className={`w-full rounded-xl border p-3 text-left transition ${
                            quiz.quiz_id === selectedQuizId
                              ? "border-amber-200/28 bg-amber-300/[0.07]"
                              : "border-white/8 bg-white/[0.025] hover:border-white/16"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="min-w-0 flex-1">
                              <strong className="block line-clamp-2 text-xs leading-5 text-white">
                                {quiz.title}
                              </strong>
                              <small className="mt-1 block truncate text-[9px] text-white/32">
                                {quiz.club_name}
                              </small>
                              <small className="mt-1 block text-[9px] text-amber-100/58">
                                {quiz.question_count}/10 saved
                              </small>
                            </span>

                            <span
                              className={`rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-[0.07em] ${quizStatusClass(
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
                </div>
              </aside>

              <section className="dream-studio-scroll min-h-0 overflow-y-auto rounded-[26px] border border-white/10 bg-white/[0.035] p-4 sm:p-5">
                {!selectedQuiz ? (
                  <div className="flex min-h-[420px] items-center justify-center text-center">
                    <div>
                      <h2 className="text-3xl font-black">
                        Build your first quiz.
                      </h2>
                      <p className="mt-3 text-sm text-white/46">
                        Create a quiz from the panel on the left.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/60">
                          {selectedQuiz.club_name}
                        </p>
                        <h2 className="mt-2 text-3xl font-black text-white">
                          {selectedQuiz.title}
                        </h2>
                        <p className="mt-2 text-xs text-white/38">
                          {selectedQuiz.question_count}/10 questions saved
                        </p>
                      </div>

                      <span
                        className={`w-fit rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.09em] ${quizStatusClass(
                          selectedQuiz.status,
                        )}`}
                      >
                        {selectedQuiz.status}
                      </span>
                    </div>

                    {selectedQuiz.review_note && (
                      <div className="mt-4 rounded-2xl border border-red-200/16 bg-red-400/[0.06] p-4">
                        <p className="text-[8px] font-black uppercase tracking-[0.13em] text-red-100/68">
                          Dreamscape review feedback
                        </p>
                        <p className="mt-2 text-xs leading-5 text-red-50/74">
                          {selectedQuiz.review_note}
                        </p>
                      </div>
                    )}

                    <section className="mt-5 rounded-[22px] border border-white/9 bg-black/14 p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <select
                          value={editForm.clubId}
                          onChange={(event) =>
                            updateEdit("clubId", event.target.value)
                          }
                          disabled={!canEditSelected}
                          className={inputClass}
                        >
                          {clubs.map((club) => (
                            <option key={club.club_id} value={club.club_id}>
                              {club.club_name} · {club.status}
                            </option>
                          ))}
                        </select>

                        <input
                          value={editForm.title}
                          onChange={(event) =>
                            updateEdit("title", event.target.value)
                          }
                          disabled={!canEditSelected}
                          placeholder="Quiz title"
                          className={inputClass}
                        />

                        <input
                          value={editForm.slug}
                          onChange={(event) =>
                            updateEdit("slug", slugify(event.target.value))
                          }
                          disabled={!canEditSelected}
                          placeholder="quiz-slug"
                          className={inputClass}
                        />

                        <input
                          value={editForm.coverImageUrl}
                          onChange={(event) =>
                            updateEdit("coverImageUrl", event.target.value)
                          }
                          disabled={!canEditSelected}
                          placeholder="Cover image URL"
                          className={inputClass}
                        />
                      </div>

                      <textarea
                        value={editForm.description}
                        onChange={(event) =>
                          updateEdit("description", event.target.value)
                        }
                        disabled={!canEditSelected}
                        rows={3}
                        maxLength={1500}
                        placeholder="Quiz description"
                        className={`${textareaClass} mt-3`}
                      />

                      {canEditSelected && (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => void saveQuizMeta()}
                          className={`${secondaryButton} mt-3`}
                        >
                          Save Quiz Details
                        </button>
                      )}
                    </section>

                    <section className="mt-5">
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: 10 }, (_, index) => index + 1).map(
                          (order) => (
                            <button
                              key={order}
                              type="button"
                              onClick={() => setSelectedQuestionOrder(order)}
                              className={`h-10 w-10 rounded-xl border text-[10px] font-black transition ${
                                selectedQuestionOrder === order
                                  ? "border-amber-200/38 bg-amber-300/12 text-amber-100"
                                  : savedOrders.has(order)
                                    ? "border-emerald-200/20 bg-emerald-400/[0.07] text-emerald-100"
                                    : "border-white/9 bg-white/[0.025] text-white/34"
                              }`}
                            >
                              {order}
                            </button>
                          ),
                        )}
                      </div>

                      <div className="mt-4 rounded-[22px] border border-white/9 bg-black/14 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-[0.13em] text-amber-100/58">
                              Question {selectedQuestionOrder}
                            </p>
                            <h3 className="mt-1 text-lg font-black">
                              {savedOrders.has(selectedQuestionOrder)
                                ? "Saved question"
                                : "New question"}
                            </h3>
                          </div>

                          {savedOrders.has(selectedQuestionOrder) && (
                            <span className="rounded-full border border-emerald-200/18 bg-emerald-400/[0.07] px-3 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-emerald-100">
                              Saved
                            </span>
                          )}
                        </div>

                        <textarea
                          value={questionForm.question}
                          onChange={(event) =>
                            updateQuestion("question", event.target.value)
                          }
                          disabled={!canEditSelected}
                          rows={3}
                          maxLength={800}
                          placeholder="Write the question..."
                          className={`${textareaClass} mt-4`}
                        />

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <OptionInput
                            label="A"
                            value={questionForm.optionA}
                            disabled={!canEditSelected}
                            onChange={(value) =>
                              updateQuestion("optionA", value)
                            }
                          />
                          <OptionInput
                            label="B"
                            value={questionForm.optionB}
                            disabled={!canEditSelected}
                            onChange={(value) =>
                              updateQuestion("optionB", value)
                            }
                          />
                          <OptionInput
                            label="C"
                            value={questionForm.optionC}
                            disabled={!canEditSelected}
                            onChange={(value) =>
                              updateQuestion("optionC", value)
                            }
                          />
                          <OptionInput
                            label="D"
                            value={questionForm.optionD}
                            disabled={!canEditSelected}
                            onChange={(value) =>
                              updateQuestion("optionD", value)
                            }
                          />
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                          <label>
                            <span className={fieldLabel}>Correct answer</span>
                            <select
                              value={questionForm.correctOption}
                              onChange={(event) =>
                                updateQuestion(
                                  "correctOption",
                                  event.target.value as "A" | "B" | "C" | "D",
                                )
                              }
                              disabled={!canEditSelected}
                              className={inputClass}
                            >
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                              <option value="D">D</option>
                            </select>
                          </label>

                          <label>
                            <span className={fieldLabel}>Topic</span>
                            <input
                              value={questionForm.topic}
                              onChange={(event) =>
                                updateQuestion("topic", event.target.value)
                              }
                              disabled={!canEditSelected}
                              placeholder="Optional topic"
                              className={inputClass}
                            />
                          </label>

                          <label>
                            <span className={fieldLabel}>Difficulty</span>
                            <select
                              value={questionForm.difficulty}
                              onChange={(event) =>
                                updateQuestion(
                                  "difficulty",
                                  Number(event.target.value),
                                )
                              }
                              disabled={!canEditSelected}
                              className={inputClass}
                            >
                              <option value={1}>1 · Easy</option>
                              <option value={2}>2</option>
                              <option value={3}>3 · Medium</option>
                              <option value={4}>4</option>
                              <option value={5}>5 · Hard</option>
                            </select>
                          </label>
                        </div>

                        <label className="mt-3 block">
                          <span className={fieldLabel}>Explanation</span>
                          <textarea
                            value={questionForm.explanation}
                            onChange={(event) =>
                              updateQuestion(
                                "explanation",
                                event.target.value,
                              )
                            }
                            disabled={!canEditSelected}
                            rows={2}
                            maxLength={1000}
                            placeholder="Explain why the answer is correct."
                            className={textareaClass}
                          />
                        </label>

                        {canEditSelected && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => void saveQuestion()}
                              className={primaryButton}
                            >
                              Save Question {selectedQuestionOrder}
                            </button>

                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => void clearQuestion()}
                              className={secondaryButton}
                            >
                              Clear Question
                            </button>
                          </div>
                        )}
                      </div>
                    </section>

                    <section className="mt-5 rounded-[22px] border border-cyan-200/12 bg-cyan-300/[0.035] p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-[0.13em] text-cyan-100/58">
                            Review workflow
                          </p>
                          <p className="mt-2 text-xs leading-5 text-white/48">
                            All 10 questions must be complete before you can
                            submit. Submitted quizzes are locked while
                            Dreamscape reviews them.
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          {canEditSelected &&
                            selectedQuiz.status !== "archived" && (
                              <>
                                <button
                                  type="button"
                                  disabled={
                                    isSaving ||
                                    selectedQuiz.question_count !== 10
                                  }
                                  onClick={() => void submitQuiz()}
                                  className="min-h-11 rounded-full border border-cyan-200/22 bg-cyan-400/10 px-5 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100 disabled:cursor-not-allowed disabled:opacity-36"
                                >
                                  Submit for Review
                                </button>

                                <button
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() => void archiveQuiz()}
                                  className="min-h-11 rounded-full border border-white/10 bg-white/[0.035] px-4 text-[9px] font-black uppercase tracking-[0.1em] text-white/42 disabled:opacity-36"
                                >
                                  Archive
                                </button>
                              </>
                            )}
                        </div>
                      </div>
                    </section>
                  </div>
                )}
              </section>
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        .dream-studio-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(251, 191, 36, 0.26)
            rgba(255, 255, 255, 0.04);
        }

        .dream-studio-scroll::-webkit-scrollbar {
          width: 7px;
        }

        .dream-studio-scroll::-webkit-scrollbar-thumb {
          background: rgba(251, 191, 36, 0.26);
          border-radius: 999px;
        }
      `}</style>
    </main>
  );
}

function OptionInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className={fieldLabel}>Option {label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        maxLength={500}
        placeholder={`Answer ${label}`}
        className={inputClass}
      />
    </label>
  );
}

function AccessMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="fixed inset-0 flex items-center justify-center bg-[#020711] px-5 text-white">
      <section className="w-full max-w-xl rounded-[28px] border border-white/10 bg-white/[0.045] p-8 text-center">
        <h1 className="text-3xl font-black">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-white/48">{description}</p>
        <Link
          href="/milo-world/quiz-hall/communities"
          className="mt-6 inline-flex min-h-[44px] items-center rounded-full border border-amber-200/22 bg-amber-300/[0.08] px-5 text-[10px] font-black uppercase tracking-[0.1em] text-amber-100 no-underline"
        >
          Back to Creator Clubs
        </Link>
      </section>
    </main>
  );
}

const fieldLabel =
  "mb-2 block text-[8px] font-black uppercase tracking-[0.11em] text-white/34";

const inputClass =
  "h-11 w-full min-w-0 rounded-2xl border border-white/10 bg-[#061632]/80 px-4 text-xs text-white outline-none transition placeholder:text-white/26 focus:border-amber-200/30 disabled:cursor-not-allowed disabled:opacity-46";

const textareaClass =
  "w-full resize-none rounded-2xl border border-white/10 bg-[#061632]/80 px-4 py-3 text-xs leading-5 text-white outline-none transition placeholder:text-white/26 focus:border-amber-200/30 disabled:cursor-not-allowed disabled:opacity-46";

const primaryButton =
  "min-h-11 rounded-full border border-amber-200/22 bg-amber-300/10 px-5 text-[9px] font-black uppercase tracking-[0.1em] text-amber-100 transition hover:bg-amber-300/16 disabled:cursor-not-allowed disabled:opacity-38";

const secondaryButton =
  "min-h-11 rounded-full border border-white/10 bg-white/[0.035] px-5 text-[9px] font-black uppercase tracking-[0.1em] text-white/52 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-38";
