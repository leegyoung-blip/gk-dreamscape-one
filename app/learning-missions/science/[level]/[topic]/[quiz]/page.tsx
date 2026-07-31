"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import SciencePageShell from "@/components/science-missions/SciencePageShell";
import {
  canAttemptScienceQuiz,
  canEditScience,
  normaliseRole,
  SCIENCE_MISSION_META,
} from "@/lib/science/helpers";
import { supabase } from "@/lib/supabase";
import type {
  ScienceLevelRow,
  ScienceMissionType,
  ScienceQuizRow,
  ScienceQuestionType,
  ScienceTopicRow,
} from "@/lib/science/types";

type PageProps = {
  params: Promise<{ level: string; topic: string; quiz: string }>;
};

type QuizScreen = "loading" | "intro" | "quiz" | "results" | "blocked";

type ScienceOption = {
  id: string;
  question_id: string;
  option_key: string;
  option_text: string | null;
  asset_path: string | null;
  sort_order: number;
};

type ScienceQuestion = {
  id: string;
  prompt: string;
  instruction: string | null;
  question_type: ScienceQuestionType;
  question_image: string | null;
  default_marks: number;
  difficulty: number;
  content_tags: string[];
  process_skills: string[];
  status: string;
  question_order: number;
  marks_override: number | null;
  options: ScienceOption[];
};

type ScienceAnswerResult = {
  question_id: string;
  question_order: number;
  question_type: ScienceQuestionType;
  is_correct: boolean;
  awarded_marks: number;
  maximum_marks: number;
  submitted_keys: string[];
  correct_answer_data: {
    correct_option_keys?: string[];
    correct_order?: string[];
  };
  explanation: string;
  incorrect_feedback: Record<string, string>;
};

type SaveScienceAttemptResult = {
  attempt_id: string;
  attempt_number: number;
  score: number;
  maximum_score: number;
  percentage: number;
  correct_count: number;
  total_questions: number;
  tokens_earned: number;
  gems_earned: number;
  first_completion: boolean;
  token_balance: number;
  gem_balance: number;
  answer_results: ScienceAnswerResult[];
};

type AnswerMap = Record<string, string[]>;

function shuffle<T>(items: T[]) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }

  return next;
}

function safeNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roleLabel(role: string | null) {
  switch (normaliseRole(role)) {
    case "admin":
      return "Admin";
    case "curriculum-lead":
      return "Curriculum Lead";
    case "teacher":
      return "Teacher";
    case "student":
      return "Student";
    default:
      return "Account";
  }
}

export default function ScienceQuizPage({ params }: PageProps) {
  const {
    level: levelSlug,
    topic: topicSlug,
    quiz: quizSlug,
  } = use(params);

  const [screen, setScreen] = useState<QuizScreen>("loading");
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const [level, setLevel] = useState<ScienceLevelRow | null>(null);
  const [topic, setTopic] = useState<ScienceTopicRow | null>(null);
  const [quiz, setQuiz] = useState<ScienceQuizRow | null>(null);
  const [questions, setQuestions] = useState<ScienceQuestion[]>([]);

  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [sortingOptions, setSortingOptions] = useState<
    Record<string, ScienceOption[]>
  >({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SaveScienceAttemptResult | null>(null);
  const [previouslyRewarded, setPreviouslyRewarded] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [gemBalance, setGemBalance] = useState(0);

  const currentQuestion = questions[questionIndex] ?? null;
  const missionMeta = quiz
    ? SCIENCE_MISSION_META[quiz.mission_type as ScienceMissionType]
    : null;
  const roleCanEdit = canEditScience(role);

  const answeredCount = useMemo(
    () => questions.filter((question) => isQuestionComplete(question, answers)).length,
    [answers, questions],
  );

  const progressPercentage = questions.length
    ? Math.round(((questionIndex + 1) / questions.length) * 100)
    : 0;

  useEffect(() => {
    let cancelled = false;

    async function loadQuiz() {
      setScreen("loading");
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError) {
        setMessage(userError.message);
        setScreen("blocked");
        return;
      }

      if (!user) {
        setMessage("Log in to start this Science Mission.");
        setScreen("blocked");
        return;
      }

      setUserId(user.id);

      const [profileResult, tokenResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("role,dream_gem_balance")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("dream_token_transactions")
          .select("amount")
          .eq("user_id", user.id)
          .eq("token_kind", "virtual"),
      ]);

      if (cancelled) return;

      if (profileResult.error || !profileResult.data) {
        setMessage(profileResult.error?.message || "Dreamscape profile not found.");
        setScreen("blocked");
        return;
      }

      const loadedRole = profileResult.data.role || null;
      setRole(loadedRole);
      setGemBalance(
        Math.max(0, safeNumber(profileResult.data.dream_gem_balance)),
      );

      if (tokenResult.error) {
        console.warn("Could not load DT balance:", tokenResult.error.message);
      } else {
        setTokenBalance(
          (tokenResult.data ?? []).reduce(
            (sum, transaction) => sum + safeNumber(transaction.amount),
            0,
          ),
        );
      }

      if (!canAttemptScienceQuiz(loadedRole)) {
        setMessage(
          "Science quizzes are available to student, teacher, Curriculum Lead and admin accounts.",
        );
        setScreen("blocked");
        return;
      }

      const levelResult = await supabase
        .from("science_levels")
        .select("*")
        .eq("slug", levelSlug)
        .eq("is_active", true)
        .maybeSingle();

      if (cancelled) return;

      if (levelResult.error || !levelResult.data) {
        setMessage(levelResult.error?.message || "Science level not found.");
        setScreen("blocked");
        return;
      }

      const loadedLevel = levelResult.data as ScienceLevelRow;
      setLevel(loadedLevel);

      const topicResult = await supabase
        .from("science_topics")
        .select("*")
        .eq("level_id", loadedLevel.id)
        .eq("slug", topicSlug)
        .eq("status", "active")
        .maybeSingle();

      if (cancelled) return;

      if (topicResult.error || !topicResult.data) {
        setMessage(topicResult.error?.message || "Science topic not found.");
        setScreen("blocked");
        return;
      }

      const loadedTopic = topicResult.data as ScienceTopicRow;
      setTopic(loadedTopic);

      const quizResult = await supabase
        .from("science_quizzes")
        .select("*")
        .eq("topic_id", loadedTopic.id)
        .eq("slug", quizSlug)
        .eq("status", "published")
        .maybeSingle();

      if (cancelled) return;

      if (quizResult.error || !quizResult.data) {
        setMessage(quizResult.error?.message || "Published Science quiz not found.");
        setScreen("blocked");
        return;
      }

      const loadedQuiz = quizResult.data as ScienceQuizRow;
      setQuiz(loadedQuiz);

      const linksResult = await supabase
        .from("science_quiz_questions")
        .select("question_id,sort_order,marks_override")
        .eq("quiz_id", loadedQuiz.id)
        .order("sort_order", { ascending: true });

      if (cancelled) return;

      if (linksResult.error || !linksResult.data?.length) {
        setMessage(
          linksResult.error?.message || "This quiz has no published questions yet.",
        );
        setScreen("blocked");
        return;
      }

      const questionIds = linksResult.data.map((link) => String(link.question_id));

      const [questionsResult, optionsResult, claimResult] = await Promise.all([
        supabase
          .from("science_questions")
          .select(
            "id,prompt,instruction,question_type,question_image,default_marks,difficulty,content_tags,process_skills,status",
          )
          .in("id", questionIds)
          .eq("status", "published"),
        supabase
          .from("science_question_options")
          .select(
            "id,question_id,option_key,option_text,asset_path,sort_order",
          )
          .in("question_id", questionIds)
          .order("sort_order", { ascending: true }),
        supabase
          .from("science_quiz_reward_claims")
          .select("claimed_at")
          .eq("user_id", user.id)
          .eq("quiz_id", loadedQuiz.id)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      if (questionsResult.error) {
        setMessage(questionsResult.error.message);
        setScreen("blocked");
        return;
      }

      if (optionsResult.error) {
        setMessage(optionsResult.error.message);
        setScreen("blocked");
        return;
      }

      if (claimResult.error) {
        console.info(
          "Science reward claim status is unavailable until the runner migration is installed:",
          claimResult.error.message,
        );
      }

      setPreviouslyRewarded(Boolean(claimResult.data));

      const questionMap = new Map(
        (questionsResult.data ?? []).map((question) => [String(question.id), question]),
      );
      const optionMap = new Map<string, ScienceOption[]>();

      for (const option of optionsResult.data ?? []) {
        const questionId = String(option.question_id);
        const current = optionMap.get(questionId) ?? [];
        current.push({
          id: String(option.id),
          question_id: questionId,
          option_key: String(option.option_key),
          option_text: option.option_text ? String(option.option_text) : null,
          asset_path: option.asset_path ? String(option.asset_path) : null,
          sort_order: safeNumber(option.sort_order),
        });
        optionMap.set(questionId, current);
      }

      const loadedQuestions: ScienceQuestion[] = [];

      for (const link of linksResult.data) {
        const question = questionMap.get(String(link.question_id));
        if (!question) continue;

        loadedQuestions.push({
          id: String(question.id),
          prompt: String(question.prompt),
          instruction: question.instruction ? String(question.instruction) : null,
          question_type: question.question_type as ScienceQuestionType,
          question_image: question.question_image
            ? String(question.question_image)
            : null,
          default_marks: safeNumber(question.default_marks),
          difficulty: safeNumber(question.difficulty),
          content_tags: Array.isArray(question.content_tags)
            ? question.content_tags.map(String)
            : [],
          process_skills: Array.isArray(question.process_skills)
            ? question.process_skills.map(String)
            : [],
          status: String(question.status),
          question_order: safeNumber(link.sort_order),
          marks_override:
            link.marks_override === null
              ? null
              : safeNumber(link.marks_override),
          options: (optionMap.get(String(question.id)) ?? []).sort(
            (first, second) => first.sort_order - second.sort_order,
          ),
        });
      }

      if (loadedQuestions.length !== linksResult.data.length) {
        setMessage(
          "One or more quiz questions are not published. Check the Science curriculum editor.",
        );
        setScreen("blocked");
        return;
      }

      const unsupportedQuestion = loadedQuestions.find(
        (question) =>
          !["mcq", "true_false", "image_choice", "sorting"].includes(
            question.question_type,
          ),
      );

      if (unsupportedQuestion) {
        setMessage(
          `The current runner does not yet support ${unsupportedQuestion.question_type} questions.`,
        );
        setScreen("blocked");
        return;
      }

      setQuestions(loadedQuestions);
      setScreen("intro");
    }

    void loadQuiz();

    return () => {
      cancelled = true;
    };
  }, [levelSlug, quizSlug, topicSlug]);

  function startQuiz() {
    const nextSortingOptions: Record<string, ScienceOption[]> = {};

    for (const question of questions) {
      if (question.question_type === "sorting") {
        nextSortingOptions[question.id] = shuffle(question.options);
      }
    }

    setSortingOptions(nextSortingOptions);
    setAnswers({});
    setQuestionIndex(0);
    setResult(null);
    setMessage("");
    setStartedAt(Date.now());
    setScreen("quiz");
  }

  function selectOption(questionId: string, optionKey: string) {
    if (submitting) return;

    setAnswers((current) => ({
      ...current,
      [questionId]: [optionKey],
    }));
  }

  function addSortingOption(questionId: string, optionKey: string) {
    if (submitting) return;

    setAnswers((current) => {
      const selected = current[questionId] ?? [];
      if (selected.includes(optionKey)) return current;

      return {
        ...current,
        [questionId]: [...selected, optionKey],
      };
    });
  }

  function removeSortingOption(questionId: string, optionKey: string) {
    if (submitting) return;

    setAnswers((current) => ({
      ...current,
      [questionId]: (current[questionId] ?? []).filter(
        (key) => key !== optionKey,
      ),
    }));
  }

  function resetSorting(questionId: string) {
    if (submitting) return;

    setAnswers((current) => ({
      ...current,
      [questionId]: [],
    }));
  }

  async function continueQuiz() {
    if (!currentQuestion || !isQuestionComplete(currentQuestion, answers)) {
      setMessage("Complete this question before continuing.");
      return;
    }

    setMessage("");

    if (questionIndex < questions.length - 1) {
      setQuestionIndex((current) => current + 1);
      return;
    }

    await submitQuiz();
  }

  async function submitQuiz() {
    if (!quiz || !userId || submitting) return;

    const incomplete = questions.find(
      (question) => !isQuestionComplete(question, answers),
    );

    if (incomplete) {
      setMessage("One or more questions are incomplete.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    const payload = questions.map((question) => ({
      question_id: question.id,
      response:
        question.question_type === "sorting"
          ? { ordered_option_keys: answers[question.id] }
          : { selected_option_keys: answers[question.id] },
    }));

    const elapsedSeconds = startedAt
      ? Math.max(0, Math.round((Date.now() - startedAt) / 1000))
      : null;

    const { data, error } = await supabase.rpc(
      "save_science_mission_attempt",
      {
        p_quiz_id: quiz.id,
        p_answers: payload,
        p_time_seconds: elapsedSeconds,
      },
    );

    setSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    const saved = data as SaveScienceAttemptResult | null;

    if (!saved) {
      setMessage("The Science attempt was not returned by Supabase.");
      return;
    }

    setResult({
      ...saved,
      score: safeNumber(saved.score),
      maximum_score: safeNumber(saved.maximum_score),
      percentage: safeNumber(saved.percentage),
      correct_count: safeNumber(saved.correct_count),
      total_questions: safeNumber(saved.total_questions),
      tokens_earned: safeNumber(saved.tokens_earned),
      gems_earned: safeNumber(saved.gems_earned),
      token_balance: safeNumber(saved.token_balance),
      gem_balance: safeNumber(saved.gem_balance),
      answer_results: Array.isArray(saved.answer_results)
        ? saved.answer_results
        : [],
    });
    setTokenBalance(safeNumber(saved.token_balance));
    setGemBalance(safeNumber(saved.gem_balance));
    setPreviouslyRewarded(true);
    setScreen("results");

    window.dispatchEvent(new Event("dream-tokens-updated"));
    window.dispatchEvent(new Event("dream-gems-updated"));
  }

  function goToQuestion(index: number) {
    if (submitting || index < 0 || index >= questions.length) return;
    setMessage("");
    setQuestionIndex(index);
  }

  const backHref = `/learning-missions/science/${levelSlug}/${topicSlug}`;

  return (
    <SciencePageShell>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center rounded-full border border-cyan-200/25 bg-white/[0.055] px-4 text-sm font-extrabold text-white no-underline transition hover:bg-white/[0.09]"
        >
          ← {topic?.title || "Science topic"}
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {role && (
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/55">
              {roleLabel(role)} access
            </span>
          )}
          <span className="rounded-full border border-amber-200/20 bg-amber-300/10 px-3 py-2 text-xs font-black text-amber-100">
            {tokenBalance.toLocaleString("en-SG")} DT
          </span>
          <span className="rounded-full border border-fuchsia-200/20 bg-fuchsia-300/10 px-3 py-2 text-xs font-black text-fuchsia-100">
            {gemBalance.toLocaleString("en-SG")} DG
          </span>
          {roleCanEdit && quiz && (
            <Link
              href={`/learning-missions/science/manage/quizzes/${quiz.id}`}
              className="rounded-full border border-violet-200/25 bg-violet-300/12 px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-violet-100 no-underline"
            >
              Edit quiz
            </Link>
          )}
        </div>
      </header>

      {screen === "loading" && (
        <StatusPanel title="Loading Science Mission…" text="Preparing the published questions." />
      )}

      {screen === "blocked" && (
        <section className="mx-auto mt-8 max-w-3xl rounded-[2.25rem] border border-amber-200/20 bg-amber-300/[0.07] p-7 text-center shadow-2xl backdrop-blur-xl sm:p-10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-amber-200/20 bg-amber-300/10 text-3xl">
            🔒
          </div>
          <h1 className="mt-5 text-3xl font-black sm:text-5xl">Science Mission unavailable</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/60">
            {message || "This Science Mission cannot be opened."}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {!userId && (
              <Link
                href="/login"
                className="rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 no-underline"
              >
                Log in
              </Link>
            )}
            <Link
              href={backHref}
              className="rounded-full border border-white/15 bg-white/[0.06] px-6 py-3 text-sm font-black text-white no-underline"
            >
              Back to topic
            </Link>
          </div>
        </section>
      )}

      {screen === "intro" && quiz && topic && level && (
        <section className="mx-auto mt-8 max-w-5xl overflow-hidden rounded-[2.4rem] border border-white/10 bg-white/[0.055] shadow-[0_30px_90px_rgba(0,0,0,0.34)] backdrop-blur-xl">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="p-7 sm:p-10">
              <div className="grid h-16 w-16 place-items-center rounded-3xl border border-cyan-200/20 bg-cyan-300/10 text-3xl">
                {missionMeta?.icon || "🔬"}
              </div>
              <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
                {level.school_level} · {missionMeta?.label || "Science Mission"}
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
                {quiz.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/60">
                {quiz.description || topic.summary || "Complete this Science Mission."}
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <Metric label="Questions" value={String(questions.length)} />
                <Metric label="Estimated time" value={`${quiz.estimated_minutes} min`} />
                <Metric label="Mastery target" value={`${safeNumber(quiz.mastery_percentage)}%`} />
              </div>

              <button
                type="button"
                onClick={startQuiz}
                className="mt-8 min-h-14 w-full rounded-2xl bg-[linear-gradient(135deg,#7ee8ff,#60f0d0)] px-6 text-sm font-black uppercase tracking-[0.13em] text-slate-950 transition hover:scale-[1.01]"
              >
                {previouslyRewarded ? "Replay Quiz" : "Start Quiz"}
              </button>
            </div>

            <aside className="border-t border-white/10 bg-black/20 p-7 sm:p-9 lg:border-l lg:border-t-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
                First completion reward
              </p>
              <div className="mt-5 space-y-3 text-sm leading-6 text-white/65">
                <RewardRow label="100%" reward="5 DT" />
                <RewardRow label="90%–99%" reward="4 DT" />
                <RewardRow label="80%–89%" reward="3 DT" />
                <RewardRow label="70%–79%" reward="2 DT" />
                <RewardRow label="60%–69%" reward="1 DT" />
                <RewardRow label="Every completion" reward="1 DG" />
              </div>

              <div
                className={`mt-6 rounded-2xl border p-4 text-sm leading-6 ${
                  previouslyRewarded
                    ? "border-amber-200/20 bg-amber-300/[0.07] text-amber-100"
                    : "border-emerald-200/20 bg-emerald-300/[0.07] text-emerald-100"
                }`}
              >
                {previouslyRewarded
                  ? "This quiz has already paid its one-time reward. Replays still save your score and answers."
                  : "Your first submitted completion earns 1 Dream Gem, even when the DT score threshold is not reached."}
              </div>
            </aside>
          </div>
        </section>
      )}

      {screen === "quiz" && currentQuestion && quiz && (
        <section className="mx-auto mt-7 max-w-5xl">
          <div className="rounded-[2.25rem] border border-white/10 bg-white/[0.055] p-5 shadow-2xl backdrop-blur-xl sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.17em] text-cyan-200">
                  Question {questionIndex + 1} of {questions.length}
                </p>
                <p className="mt-1 text-xs text-white/40">
                  {quiz.title} · {answeredCount}/{questions.length} answered
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {questions.map((question, index) => {
                  const complete = isQuestionComplete(question, answers);
                  const active = index === questionIndex;

                  return (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => goToQuestion(index)}
                      aria-label={`Open question ${index + 1}`}
                      className={`grid h-9 w-9 place-items-center rounded-full border text-xs font-black transition ${
                        active
                          ? "border-cyan-200/60 bg-cyan-200 text-slate-950"
                          : complete
                            ? "border-emerald-200/30 bg-emerald-300/12 text-emerald-100"
                            : "border-white/10 bg-white/[0.04] text-white/45"
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#53d7ff,#60f0d0)] transition-all"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            <article className="mt-6 rounded-[1.9rem] border border-cyan-200/12 bg-[#041124]/80 p-5 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/50">
                  {formatQuestionType(currentQuestion.question_type)}
                </span>
                {currentQuestion.process_skills.length > 0 && (
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100/55">
                    {currentQuestion.process_skills.join(" · ")}
                  </span>
                )}
              </div>

              <h2 className="mt-5 text-2xl font-black leading-tight sm:text-4xl">
                {currentQuestion.prompt}
              </h2>
              {currentQuestion.instruction && (
                <p className="mt-3 text-sm leading-6 text-white/52">
                  {currentQuestion.instruction}
                </p>
              )}

              {currentQuestion.question_image && (
                <div className="mt-6 overflow-hidden rounded-2xl bg-white p-3">
                  <img
                    src={currentQuestion.question_image}
                    alt="Science question"
                    className="mx-auto max-h-[360px] w-full object-contain"
                  />
                </div>
              )}

              {currentQuestion.question_type === "sorting" ? (
                <SortingQuestion
                  question={currentQuestion}
                  shuffledOptions={
                    sortingOptions[currentQuestion.id] ?? currentQuestion.options
                  }
                  selectedKeys={answers[currentQuestion.id] ?? []}
                  onAdd={(optionKey) =>
                    addSortingOption(currentQuestion.id, optionKey)
                  }
                  onRemove={(optionKey) =>
                    removeSortingOption(currentQuestion.id, optionKey)
                  }
                  onReset={() => resetSorting(currentQuestion.id)}
                />
              ) : (
                <ChoiceQuestion
                  question={currentQuestion}
                  selectedKey={answers[currentQuestion.id]?.[0] ?? null}
                  onSelect={(optionKey) =>
                    selectOption(currentQuestion.id, optionKey)
                  }
                />
              )}
            </article>

            {message && (
              <p className="mt-4 rounded-2xl border border-amber-200/20 bg-amber-300/[0.07] px-4 py-3 text-sm text-amber-100">
                {message}
              </p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => goToQuestion(questionIndex - 1)}
                disabled={questionIndex === 0 || submitting}
                className="min-h-12 rounded-2xl border border-white/12 bg-white/[0.05] px-6 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-35"
              >
                ← Previous
              </button>

              <button
                type="button"
                onClick={() => void continueQuiz()}
                disabled={
                  submitting || !isQuestionComplete(currentQuestion, answers)
                }
                className="min-h-12 rounded-2xl bg-white px-7 text-sm font-black text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-35"
              >
                {submitting
                  ? "Saving attempt…"
                  : questionIndex === questions.length - 1
                    ? "Submit Quiz"
                    : "Next Question →"}
              </button>
            </div>
          </div>
        </section>
      )}

      {screen === "results" && result && quiz && (
        <section className="mx-auto mt-7 max-w-6xl">
          <div className="overflow-hidden rounded-[2.4rem] border border-white/10 bg-white/[0.055] shadow-2xl backdrop-blur-xl">
            <div className="grid gap-0 lg:grid-cols-[1fr_0.82fr]">
              <div className="p-7 text-center sm:p-10">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-[1.7rem] border border-emerald-200/25 bg-emerald-300/10 text-4xl">
                  {result.percentage >= 80 ? "🏆" : "🔬"}
                </div>
                <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-emerald-200">
                  Science Mission complete
                </p>
                <h1 className="mt-3 text-5xl font-black tracking-[-0.06em] sm:text-7xl">
                  {Math.round(result.percentage)}%
                </h1>
                <p className="mt-3 text-base text-white/55">
                  {result.correct_count} of {result.total_questions} questions correct
                </p>

                <div className="mt-7 grid grid-cols-2 gap-3">
                  <Metric label="DT earned" value={String(result.tokens_earned)} />
                  <Metric label="DG earned" value={String(result.gems_earned)} />
                  <Metric label="DT balance" value={String(result.token_balance)} />
                  <Metric label="DG balance" value={String(result.gem_balance)} />
                </div>

                <div
                  className={`mt-6 rounded-2xl border p-4 text-sm leading-6 ${
                    result.first_completion
                      ? "border-emerald-200/20 bg-emerald-300/[0.07] text-emerald-100"
                      : "border-amber-200/20 bg-amber-300/[0.07] text-amber-100"
                  }`}
                >
                  {result.first_completion
                    ? `First completion reward saved: ${result.tokens_earned} DT and 1 DG.`
                    : "Replay saved. This quiz already paid its one-time DT and DG reward."}
                </div>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={startQuiz}
                    className="min-h-12 rounded-2xl border border-white/12 bg-white/[0.06] px-5 text-sm font-black text-white"
                  >
                    Replay Quiz
                  </button>
                  <Link
                    href={backHref}
                    className="flex min-h-12 items-center justify-center rounded-2xl bg-white px-5 text-sm font-black text-slate-950 no-underline"
                  >
                    Back to Topic
                  </Link>
                </div>
              </div>

              <aside className="border-t border-white/10 bg-black/20 p-7 sm:p-9 lg:border-l lg:border-t-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                  Reward scale
                </p>
                <div className="mt-5 space-y-3">
                  <RewardRow label="100%" reward="5 DT" />
                  <RewardRow label="90%–99%" reward="4 DT" />
                  <RewardRow label="80%–89%" reward="3 DT" />
                  <RewardRow label="70%–79%" reward="2 DT" />
                  <RewardRow label="60%–69%" reward="1 DT" />
                  <RewardRow label="First completion" reward="1 DG" />
                </div>
              </aside>
            </div>
          </div>

          <section className="mt-6 rounded-[2.25rem] border border-white/10 bg-white/[0.045] p-5 shadow-xl backdrop-blur-xl sm:p-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                Answer review
              </p>
              <h2 className="mt-2 text-3xl font-black">Review every question</h2>
            </div>

            <div className="mt-6 grid gap-4">
              {questions.map((question, index) => {
                const review = result.answer_results.find(
                  (item) => item.question_id === question.id,
                );

                if (!review) return null;

                const correctKeys =
                  question.question_type === "sorting"
                    ? review.correct_answer_data.correct_order ?? []
                    : review.correct_answer_data.correct_option_keys ?? [];

                return (
                  <article
                    key={question.id}
                    className={`rounded-3xl border p-5 sm:p-6 ${
                      review.is_correct
                        ? "border-emerald-200/18 bg-emerald-300/[0.04]"
                        : "border-rose-200/18 bg-rose-300/[0.04]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
                        Question {index + 1}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${
                          review.is_correct
                            ? "bg-emerald-300/12 text-emerald-100"
                            : "bg-rose-300/12 text-rose-100"
                        }`}
                      >
                        {review.is_correct ? "Correct" : "Review this"}
                      </span>
                    </div>

                    <h3 className="mt-3 text-lg font-black leading-7">
                      {question.prompt}
                    </h3>

                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <AnswerSummary
                        label="Your answer"
                        value={answerText(question, review.submitted_keys)}
                        correct={review.is_correct}
                      />
                      <AnswerSummary
                        label="Correct answer"
                        value={answerText(question, correctKeys)}
                        correct
                      />
                    </div>

                    <p className="mt-4 text-sm leading-6 text-white/58">
                      {review.is_correct
                        ? review.explanation
                        : review.incorrect_feedback?.default || review.explanation}
                    </p>
                    {!review.is_correct && review.explanation && (
                      <p className="mt-2 text-sm leading-6 text-cyan-100/70">
                        {review.explanation}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </section>
      )}
    </SciencePageShell>
  );
}

function isQuestionComplete(question: ScienceQuestion, answers: AnswerMap) {
  const selected = answers[question.id] ?? [];

  if (question.question_type === "sorting") {
    return selected.length === question.options.length && question.options.length > 0;
  }

  return selected.length > 0;
}

function formatQuestionType(type: ScienceQuestionType) {
  switch (type) {
    case "true_false":
      return "True or False";
    case "image_choice":
      return "Image Choice";
    case "sorting":
      return "Put in Order";
    default:
      return "Multiple Choice";
  }
}

function answerText(question: ScienceQuestion, keys: string[]) {
  const text = keys.map((key) => {
    const option = question.options.find(
      (item) => item.option_key.toUpperCase() === String(key).toUpperCase(),
    );
    return option?.option_text || key;
  });

  return text.join(question.question_type === "sorting" ? " → " : ", ");
}

function ChoiceQuestion({
  question,
  selectedKey,
  onSelect,
}: {
  question: ScienceQuestion;
  selectedKey: string | null;
  onSelect: (optionKey: string) => void;
}) {
  return (
    <div
      className={`mt-7 grid gap-3 ${
        question.question_type === "image_choice"
          ? "sm:grid-cols-2"
          : "sm:grid-cols-2"
      }`}
    >
      {question.options.map((option) => {
        const selected = selectedKey === option.option_key;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.option_key)}
            className={`overflow-hidden rounded-2xl border text-left transition ${
              selected
                ? "border-cyan-200/65 bg-cyan-300/13 shadow-[0_0_24px_rgba(126,232,255,0.12)]"
                : "border-white/10 bg-white/[0.035] hover:border-cyan-200/28 hover:bg-white/[0.06]"
            }`}
          >
            {option.asset_path && (
              <OptionImage src={option.asset_path} alt={option.option_text || option.option_key} />
            )}
            <span className="flex min-h-16 items-center gap-3 p-4">
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-xs font-black ${
                  selected
                    ? "border-cyan-100/50 bg-cyan-100 text-slate-950"
                    : "border-white/12 bg-black/20 text-cyan-100"
                }`}
              >
                {option.option_key}
              </span>
              <span className="text-sm font-bold leading-6 text-white/82">
                {option.option_text || `Option ${option.option_key}`}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SortingQuestion({
  question,
  shuffledOptions,
  selectedKeys,
  onAdd,
  onRemove,
  onReset,
}: {
  question: ScienceQuestion;
  shuffledOptions: ScienceOption[];
  selectedKeys: string[];
  onAdd: (optionKey: string) => void;
  onRemove: (optionKey: string) => void;
  onReset: () => void;
}) {
  const selectedOptions = selectedKeys
    .map((key) => question.options.find((option) => option.option_key === key))
    .filter((option): option is ScienceOption => Boolean(option));
  const remainingOptions = shuffledOptions.filter(
    (option) => !selectedKeys.includes(option.option_key),
  );

  return (
    <div className="mt-7 grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
            Available steps
          </p>
          <span className="text-xs text-white/35">Tap to add</span>
        </div>
        <div className="mt-3 grid gap-2">
          {remainingOptions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/40">
              All steps have been placed.
            </p>
          ) : (
            remainingOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onAdd(option.option_key)}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left text-sm font-bold leading-6 text-white/78 transition hover:border-cyan-200/30"
              >
                {option.option_text || option.option_key}
              </button>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-cyan-200/14 bg-cyan-300/[0.035] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/65">
            Your order
          </p>
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-black text-white/45 hover:text-white"
          >
            Reset
          </button>
        </div>
        <div className="mt-3 grid gap-2">
          {selectedOptions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-cyan-200/15 p-4 text-sm text-white/40">
              Add the first step here.
            </p>
          ) : (
            selectedOptions.map((option, index) => (
              <button
                key={`${option.id}-${index}`}
                type="button"
                onClick={() => onRemove(option.option_key)}
                className="flex items-center gap-3 rounded-xl border border-cyan-200/16 bg-cyan-300/[0.055] p-3 text-left transition hover:border-rose-200/30"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cyan-100 text-xs font-black text-slate-950">
                  {index + 1}
                </span>
                <span className="text-sm font-bold leading-6 text-white/82">
                  {option.option_text || option.option_key}
                </span>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function OptionImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="grid min-h-32 place-items-center border-b border-white/8 bg-white px-4 text-center text-xs font-black uppercase tracking-[0.12em] text-slate-400">
        Image placeholder
      </div>
    );
  }

  return (
    <div className="border-b border-white/8 bg-white p-3">
      <img
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        className="mx-auto h-32 w-full object-contain"
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <strong className="block text-2xl font-black">{value}</strong>
      <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.12em] text-white/40">
        {label}
      </span>
    </div>
  );
}

function RewardRow({ label, reward }: { label: string; reward: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-white/[0.035] px-4 py-3">
      <span className="text-white/55">{label}</span>
      <strong className="text-white">{reward}</strong>
    </div>
  );
}

function StatusPanel({ title, text }: { title: string; text: string }) {
  return (
    <section className="mx-auto mt-10 max-w-3xl rounded-[2.25rem] border border-white/10 bg-white/[0.055] p-8 text-center shadow-2xl backdrop-blur-xl">
      <div className="mx-auto h-12 w-12 animate-pulse rounded-2xl border border-cyan-200/25 bg-cyan-300/10" />
      <h1 className="mt-5 text-3xl font-black">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-white/50">{text}</p>
    </section>
  );
}

function AnswerSummary({
  label,
  value,
  correct,
}: {
  label: string;
  value: string;
  correct: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        correct
          ? "border-emerald-200/15 bg-emerald-300/[0.04]"
          : "border-rose-200/15 bg-rose-300/[0.04]"
      }`}
    >
      <p className="text-[9px] font-black uppercase tracking-[0.13em] text-white/40">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold leading-6 text-white/80">
        {value || "No answer recorded"}
      </p>
    </div>
  );
}
