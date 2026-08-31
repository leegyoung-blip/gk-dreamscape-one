"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CoreMissionPageShell from "@/components/core-missions/CoreMissionPageShell";
import CoreMissionTopBar from "@/components/core-missions/CoreMissionTopBar";
import {
  CORE_QUIZ_TYPE_DESCRIPTIONS,
  CORE_QUIZ_TYPE_LABELS,
  CORE_SUBJECT_THEMES,
  CORE_TABLES,
  type CoreQuizType,
  type CoreSubject,
  type PrimaryLevel,
} from "@/lib/core-missions/catalogue";
import { useCoreMissionAccess } from "@/hooks/useCoreMissionAccess";
import { supabase } from "@/lib/supabase";

type TopicReviewStatus = "locked" | "reviewing" | "satisfied";
type QuizStudentVisibility = "locked" | "shown";

type CoreTopic = {
  id: string;
  slug: string;
  title: string;
  short_title: string;
  description: string | null;
  icon: string | null;
  quiz_target: number;
  review_status: TopicReviewStatus;
};

type CoreQuiz = {
  id: string;
  topic_id: string;
  title: string;
  description: string | null;
  quiz_type: CoreQuizType;
  difficulty: number;
  question_count: number;
  estimated_minutes: number;
  reward_tokens: number;
  reward_gems: number;
  quiz_order: number;
  student_visibility: QuizStudentVisibility;
};

type AttemptRow = {
  quiz_id: string;
  percentage: number;
  correct_count: number;
  total_questions: number;
};

const QUIZ_TYPES: CoreQuizType[] = [
  "quick",
  "standard",
  "challenge",
  "assessment",
];

function normalizeRole(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
}

export default function CoreTopicClient({
  subject,
  level,
  topicSlug,
}: {
  subject: CoreSubject;
  level: PrimaryLevel;
  topicSlug: string;
}) {
  const router = useRouter();
  const { status, userId } = useCoreMissionAccess();
  const theme = CORE_SUBJECT_THEMES[subject];
  const tables = CORE_TABLES[subject];

  const [topic, setTopic] = useState<CoreTopic | null>(null);
  const [quizzes, setQuizzes] = useState<CoreQuiz[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);
  const [topicLocked, setTopicLocked] = useState(false);

  const [savingQuizId, setSavingQuizId] = useState<string | null>(null);
  const [quizVisibilityError, setQuizVisibilityError] = useState("");

  useEffect(() => {
    if (status !== "allowed") return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage("");
      setQuizVisibilityError("");
      setTopic(null);
      setQuizzes([]);
      setAttempts([]);
      setTopicLocked(false);

      // ================================================================
      // LOAD TOPIC
      // ================================================================

      const topicResult = await supabase
        .from(tables.topics)
        .select(
          "id,slug,title,short_title,description,icon,quiz_target,review_status",
        )
        .eq("subject", subject)
        .eq("primary_level", level)
        .eq("slug", topicSlug)
        .eq("is_active", true)
        .maybeSingle();

      if (cancelled) return;

      if (topicResult.error || !topicResult.data) {
        setMessage(
          topicResult.error?.message || "This Core topic could not be found.",
        );
        setLoading(false);
        return;
      }

      const loadedTopic = topicResult.data as CoreTopic;
      setTopic(loadedTopic);

      // ================================================================
      // CHECK CURRENT ROLE
      // Topic RED remains admin-only.
      // Quiz RED remains available to curriculum staff through DB policies,
      // while the Red/Blue toggle itself is shown only to admins.
      // ================================================================

      let currentUserIsAdmin = false;

      if (userId) {
        const profileResult = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();

        if (cancelled) return;

        if (profileResult.error) {
          console.warn(
            "Could not determine Core Mission admin status:",
            profileResult.error.message,
          );
        } else {
          currentUserIsAdmin =
            normalizeRole(profileResult.data?.role) === "admin";
        }
      }

      setIsAdmin(currentUserIsAdmin);

      // ================================================================
      // TOPIC-LEVEL RED LOCK
      // ================================================================

      if (loadedTopic.review_status === "locked" && !currentUserIsAdmin) {
        setTopicLocked(true);
        setLoading(false);
        return;
      }

      // ================================================================
      // LOAD PUBLISHED QUIZZES
      //
      // RLS now hides quiz-level RED rows from ordinary students.
      // Admin/curriculum_lead can still read them through the existing
      // curriculum-editor policy, so staff can inspect locked quizzes.
      // ================================================================

      const quizResult = await supabase
        .from(tables.quizzes)
        .select(
          "id,topic_id,title,description,quiz_type,difficulty,question_count,estimated_minutes,reward_tokens,reward_gems,quiz_order,student_visibility",
        )
        .eq("topic_id", loadedTopic.id)
        .eq("is_published", true)
        .eq("status", "published")
        .order("quiz_order", { ascending: true });

      if (cancelled) return;

      if (quizResult.error) {
        setMessage(quizResult.error.message);
        setLoading(false);
        return;
      }

      const loadedQuizzes = (quizResult.data || []) as CoreQuiz[];
      setQuizzes(loadedQuizzes);

      // ================================================================
      // LOAD ATTEMPTS
      // ================================================================

      const quizIds = loadedQuizzes.map((quiz) => quiz.id);

      const attemptResult =
        userId && quizIds.length
          ? await supabase
              .from(tables.attempts)
              .select("quiz_id,percentage,correct_count,total_questions")
              .eq("user_id", userId)
              .eq("status", "marked")
              .in("quiz_id", quizIds)
          : { data: [], error: null };

      if (cancelled) return;

      if (attemptResult.error) {
        console.warn(
          "Could not load Core quiz scores:",
          attemptResult.error.message,
        );
      }

      setAttempts((attemptResult.data || []) as AttemptRow[]);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    status,
    userId,
    subject,
    level,
    topicSlug,
    tables.topics,
    tables.quizzes,
    tables.attempts,
  ]);

  // ====================================================================
  // ADMIN-ONLY QUIZ RED / BLUE CONTROL
  // ====================================================================

  async function setQuizStudentVisibility(
    quizId: string,
    nextVisibility: QuizStudentVisibility,
  ) {
    if (!isAdmin) return;
    if (savingQuizId) return;

    const previousQuiz = quizzes.find((quiz) => quiz.id === quizId);
    if (!previousQuiz) return;

    if (previousQuiz.student_visibility === nextVisibility) return;

    setSavingQuizId(quizId);
    setQuizVisibilityError("");

    // Optimistic update so Red/Blue changes immediately.
    setQuizzes((current) =>
      current.map((quiz) =>
        quiz.id === quizId
          ? {
              ...quiz,
              student_visibility: nextVisibility,
            }
          : quiz,
      ),
    );

    const { error } = await supabase.rpc(
      "set_core_quiz_student_visibility",
      {
        p_subject: subject,
        p_quiz_id: quizId,
        p_visibility: nextVisibility,
      },
    );

    if (error) {
      setQuizzes((current) =>
        current.map((quiz) =>
          quiz.id === quizId
            ? {
                ...quiz,
                student_visibility: previousQuiz.student_visibility,
              }
            : quiz,
        ),
      );

      setQuizVisibilityError(
        `Could not update quiz visibility: ${error.message}`,
      );
    }

    setSavingQuizId(null);
  }

  const bestAttemptByQuiz = useMemo(() => {
    const map = new Map<string, AttemptRow>();

    for (const attempt of attempts) {
      const current = map.get(attempt.quiz_id);

      if (
        !current ||
        Number(attempt.percentage || 0) > Number(current.percentage || 0)
      ) {
        map.set(attempt.quiz_id, attempt);
      }
    }

    return map;
  }, [attempts]);

  const groupedQuizzes = useMemo(
    () =>
      new Map(
        QUIZ_TYPES.map((type) => [
          type,
          quizzes.filter((quiz) => quiz.quiz_type === type),
        ]),
      ),
    [quizzes],
  );

  const completedCount = quizzes.filter((quiz) =>
    bestAttemptByQuiz.has(quiz.id),
  ).length;

  const progress =
    quizzes.length > 0
      ? Math.round((completedCount / quizzes.length) * 100)
      : 0;

  if (status === "checking") {
    return (
      <CoreMissionPageShell>
        <CoreMissionTopBar
          backHref={`/learning-missions/core/${subject}/p${level}`}
          backLabel={`P${level} Topics`}
        />
        <StatusPanel text="Checking Core Missions access…" />
      </CoreMissionPageShell>
    );
  }

  if (status === "signed_out") {
    return (
      <CoreMissionPageShell>
        <CoreMissionTopBar
          backHref={`/learning-missions/core/${subject}/p${level}`}
          backLabel={`P${level} Topics`}
        />
        <MessagePanel text="Log in with the learner account connected to Dreamscape access." />
      </CoreMissionPageShell>
    );
  }

  if (status === "profile_required") {
    return (
      <CoreMissionPageShell>
        <CoreMissionTopBar
          backHref={`/learning-missions/core/${subject}/p${level}`}
          backLabel={`P${level} Topics`}
        />
        <MessagePanel text="Complete the learner profile before using Core Missions." />
      </CoreMissionPageShell>
    );
  }

  if (status === "locked") {
    return (
      <CoreMissionPageShell>
        <CoreMissionTopBar
          backHref={`/learning-missions/core/${subject}/p${level}`}
          backLabel={`P${level} Topics`}
        />
        <MessagePanel text="This account does not currently have Core Missions access." />
      </CoreMissionPageShell>
    );
  }

  if (loading) {
    return (
      <CoreMissionPageShell>
        <CoreMissionTopBar
          backHref={`/learning-missions/core/${subject}/p${level}`}
          backLabel={`P${level} Topics`}
        />
        <StatusPanel text="Loading topic…" />
      </CoreMissionPageShell>
    );
  }

  // ====================================================================
  // TOPIC-LEVEL ADMIN LOCK
  // ====================================================================

  if (topicLocked) {
    return (
      <CoreMissionPageShell>
        <CoreMissionTopBar
          backHref={`/learning-missions/core/${subject}/p${level}`}
          backLabel={`P${level} Topics`}
        />

        <section className="mt-7 rounded-[2.2rem] border border-red-400/60 bg-[linear-gradient(145deg,rgba(60,10,18,0.34),rgba(8,12,23,0.96))] p-7 text-center shadow-[0_25px_80px_rgba(239,68,68,0.10)] sm:p-10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-red-300/40 bg-red-400/10 text-3xl">
            🔒
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-red-300">
            Topic Locked
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-red-50 sm:text-5xl">
            {topic?.title || "Core Mission Topic"}
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-red-50/60 sm:text-base">
            This topic is currently locked while its curriculum is being
            prepared.
          </p>

          <p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-red-300/75">
            Admin access only
          </p>
        </section>
      </CoreMissionPageShell>
    );
  }

  return (
    <CoreMissionPageShell>
      <CoreMissionTopBar
        backHref={`/learning-missions/core/${subject}/p${level}`}
        backLabel={`P${level} Topics`}
      />

      <section className="mt-7 rounded-[2.2rem] border border-white/10 bg-white/[0.055] p-6 shadow-[0_28px_84px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-8 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <div
              className={[
                "grid h-16 w-16 place-items-center rounded-3xl border text-3xl",
                theme.borderClass,
                theme.softClass,
              ].join(" ")}
            >
              {topic?.icon || theme.icon}
            </div>

            <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
              Primary {level} {theme.name} Topic
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
              {topic?.title || `${theme.name} Topic`}
            </h1>

            <p className="mt-4 max-w-3xl text-base leading-7 text-white/60">
              {topic?.description || "Loading topic details…"}
            </p>

            {isAdmin && topic?.review_status === "locked" ? (
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-red-300/35 bg-red-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-red-200">
                🔒 Admin preview · Topic locked
              </div>
            ) : null}
          </div>

          <div className="grid min-w-[230px] grid-cols-2 gap-3 lg:grid-cols-1">
            <Metric label="Published quizzes" value={String(quizzes.length)} />
            <Metric label="Completed" value={String(completedCount)} />
            <Metric label="Planned" value={String(topic?.quiz_target || 0)} />
          </div>
        </div>

        <div className="mt-7 flex flex-wrap gap-2">
          <span
            className={[
              "rounded-full border px-3 py-1.5 text-xs font-bold",
              theme.borderClass,
              theme.softClass,
              theme.textClass,
            ].join(" ")}
          >
            {theme.name}
          </span>

          <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-100">
            Primary {level}
          </span>

          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-bold text-white/60">
            {progress}% completed
          </span>
        </div>
      </section>

      {isAdmin ? (
        <section className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="m-0 text-xs font-black uppercase tracking-[0.12em] text-white/65">
                Admin quiz visibility
              </p>
              <p className="mt-1 text-xs text-white/40">
                This is separate from Archive. Red keeps a published quiz for
                staff review but hides and blocks it from students.
              </p>
            </div>

            <div className="flex items-center gap-4 text-[11px] font-black uppercase tracking-[0.1em]">
              <span className="text-red-300">● Red = Locked</span>
              <span className="text-cyan-200">● Blue = Shown</span>
            </div>
          </div>

          {quizVisibilityError ? (
            <p className="mt-2 text-xs font-bold text-red-300">
              {quizVisibilityError}
            </p>
          ) : null}
        </section>
      ) : null}

      {message ? (
        <MessagePanel text={message} />
      ) : quizzes.length === 0 ? (
        <StatusPanel text="No published quizzes are available in this topic yet." />
      ) : (
        <section className="mt-8 grid gap-5">
          {QUIZ_TYPES.map((type) => {
            const typeQuizzes = groupedQuizzes.get(type) || [];

            if (typeQuizzes.length === 0) return null;

            return (
              <article
                key={type}
                className="rounded-[1.9rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_22px_64px_rgba(0,0,0,0.22)] sm:p-7"
              >
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p
                      className={[
                        "m-0 text-xs font-black uppercase tracking-[0.18em]",
                        theme.eyebrowClass,
                      ].join(" ")}
                    >
                      {CORE_QUIZ_TYPE_LABELS[type]}
                    </p>

                    <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] sm:text-3xl">
                      {CORE_QUIZ_TYPE_LABELS[type]} Missions
                    </h2>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
                      {CORE_QUIZ_TYPE_DESCRIPTIONS[type]}
                    </p>
                  </div>

                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/50">
                    {typeQuizzes.length} published
                  </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {typeQuizzes.map((quiz) => {
                    const attempt = bestAttemptByQuiz.get(quiz.id);
                    const completed = Boolean(attempt);
                    const quizLocked = quiz.student_visibility === "locked";
                    const saving = savingQuizId === quiz.id;

                    return (
                      <article
                        key={quiz.id}
                        className={[
                          "overflow-hidden rounded-[1.55rem] border text-white shadow-[0_18px_50px_rgba(0,0,0,0.2)] transition",
                          quizLocked
                            ? "border-red-400/65 bg-[linear-gradient(145deg,rgba(62,15,24,0.34),rgba(4,19,34,0.94))] shadow-[0_18px_50px_rgba(239,68,68,0.08)]"
                            : completed
                              ? "border-emerald-200/25 bg-[linear-gradient(145deg,rgba(8,54,49,0.68),rgba(4,19,34,0.92))]"
                              : `border-cyan-200/20 ${theme.cardBackground}`,
                        ].join(" ")}
                      >
                        {isAdmin ? (
                          <div
                            className={[
                              "flex items-center justify-between gap-3 border-b px-4 py-3",
                              quizLocked
                                ? "border-red-300/20 bg-red-950/25"
                                : "border-cyan-200/15 bg-slate-950/25",
                            ].join(" ")}
                          >
                            <div>
                              <p className="m-0 text-[9px] font-black uppercase tracking-[0.16em] text-white/35">
                                Student visibility
                              </p>
                              <p
                                className={[
                                  "mt-0.5 text-xs font-black",
                                  quizLocked ? "text-red-300" : "text-cyan-200",
                                ].join(" ")}
                              >
                                {saving
                                  ? "Saving…"
                                  : quizLocked
                                    ? "Locked"
                                    : "Shown"}
                              </p>
                            </div>

                            <div className="flex rounded-xl border border-white/10 bg-black/25 p-1">
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() =>
                                  void setQuizStudentVisibility(
                                    quiz.id,
                                    "locked",
                                  )
                                }
                                className={[
                                  "rounded-lg px-3 py-2 text-[9px] font-black uppercase tracking-[0.06em] transition",
                                  "disabled:cursor-wait disabled:opacity-50",
                                  quizLocked
                                    ? "bg-red-400/20 text-red-200 shadow-[0_0_16px_rgba(239,68,68,0.12)]"
                                    : "text-white/35 hover:bg-white/[0.06] hover:text-white/70",
                                ].join(" ")}
                              >
                                Red
                              </button>

                              <button
                                type="button"
                                disabled={saving}
                                onClick={() =>
                                  void setQuizStudentVisibility(quiz.id, "shown")
                                }
                                className={[
                                  "rounded-lg px-3 py-2 text-[9px] font-black uppercase tracking-[0.06em] transition",
                                  "disabled:cursor-wait disabled:opacity-50",
                                  !quizLocked
                                    ? "bg-cyan-300/20 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.12)]"
                                    : "text-white/35 hover:bg-white/[0.06] hover:text-white/70",
                                ].join(" ")}
                              >
                                Blue
                              </button>
                            </div>
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/learning-missions/core/${subject}/p${level}/quiz/${quiz.id}`,
                            )
                          }
                          className="group flex min-h-[270px] w-full flex-col p-5 text-left text-white transition hover:-translate-y-1"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span
                              className={[
                                "rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.11em]",
                                quizLocked
                                  ? "border-red-300/30 bg-red-400/10 text-red-200"
                                  : [
                                      theme.borderClass,
                                      theme.softClass,
                                      theme.textClass,
                                    ].join(" "),
                              ].join(" ")}
                            >
                              {CORE_QUIZ_TYPE_LABELS[type]}
                            </span>

                            <span
                              className={[
                                "rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.08em]",
                                quizLocked
                                  ? "border-red-300/35 bg-red-400/10 text-red-200"
                                  : completed
                                    ? "border-emerald-200/25 bg-emerald-300/10 text-emerald-100"
                                    : "border-white/10 bg-white/[0.04] text-white/50",
                              ].join(" ")}
                            >
                              {quizLocked
                                ? "🔒 Locked from students"
                                : completed
                                  ? "✓ Completed"
                                  : `Level ${quiz.difficulty}`}
                            </span>
                          </div>

                          <h3
                            className={[
                              "mt-5 text-xl font-black tracking-[-0.025em]",
                              quizLocked ? "text-red-50" : "",
                            ].join(" ")}
                          >
                            {quiz.title}
                          </h3>

                          <p
                            className={[
                              "mt-2 line-clamp-3 text-sm leading-6",
                              quizLocked ? "text-red-50/55" : "text-white/55",
                            ].join(" ")}
                          >
                            {quiz.description ||
                              "Complete this curriculum mission and review your answers."}
                          </p>

                          <div
                            className={[
                              "mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold",
                              quizLocked ? "text-red-100/45" : "text-white/50",
                            ].join(" ")}
                          >
                            <span>{quiz.question_count} questions</span>
                            <span>{quiz.estimated_minutes} min</span>
                            <span>
                              {quiz.reward_tokens} DT · {quiz.reward_gems} DG
                            </span>
                          </div>

                          <div className="mt-auto pt-5">
                            {attempt ? (
                              <p className="mb-3 text-xs font-extrabold text-emerald-200">
                                Best score: {Math.round(
                                  Number(attempt.percentage || 0),
                                )}% · {attempt.correct_count}/
                                {attempt.total_questions}
                              </p>
                            ) : null}

                            <div
                              className={[
                                "flex min-h-11 items-center justify-center rounded-xl text-sm font-black",
                                quizLocked
                                  ? "border border-red-300/30 bg-red-400/10 text-red-200"
                                  : completed
                                    ? "bg-gradient-to-r from-emerald-400 to-teal-400 text-emerald-950"
                                    : theme.barClass,
                              ].join(" ")}
                            >
                              {quizLocked
                                ? "Staff Preview →"
                                : completed
                                  ? "Replay Mission →"
                                  : "Start Mission →"}
                            </div>
                          </div>
                        </button>
                      </article>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </CoreMissionPageShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <strong className="block text-2xl font-black">{value}</strong>
      <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.13em] text-white/40">
        {label}
      </span>
    </div>
  );
}

function StatusPanel({ text }: { text: string }) {
  return (
    <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/55">
      {text}
    </div>
  );
}

function MessagePanel({ text }: { text: string }) {
  return (
    <div className="mt-7 rounded-3xl border border-amber-200/25 bg-amber-300/10 p-6 text-amber-100">
      {text}
    </div>
  );
}
