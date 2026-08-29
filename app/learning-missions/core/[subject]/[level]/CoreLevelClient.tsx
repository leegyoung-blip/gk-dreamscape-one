"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CoreMissionPageShell from "@/components/core-missions/CoreMissionPageShell";
import CoreMissionTopBar from "@/components/core-missions/CoreMissionTopBar";
import {
  CORE_LEVEL_COPY,
  CORE_SUBJECT_THEMES,
  CORE_TABLES,
  type CoreSubject,
  type PrimaryLevel,
} from "@/lib/core-missions/catalogue";
import { useCoreMissionAccess } from "@/hooks/useCoreMissionAccess";
import { supabase } from "@/lib/supabase";

type CoreTopic = {
  id: string;
  subject: CoreSubject;
  primary_level: number;
  slug: string;
  title: string;
  short_title: string;
  description: string | null;
  icon: string | null;
  quiz_target: number;
  sort_order: number;
  is_assessment_topic: boolean;
  review_satisfied: boolean;
};

type CoreQuiz = {
  id: string;
  topic_id: string;
};

type AttemptRow = {
  quiz_id: string;
};

type TopicWithCounts = CoreTopic & {
  publishedCount: number;
  completedCount: number;
};

function normalizeRole(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
}

export default function CoreLevelClient({
  subject,
  level,
}: {
  subject: CoreSubject;
  level: PrimaryLevel;
}) {
  const { status, userId } = useCoreMissionAccess();

  const theme = CORE_SUBJECT_THEMES[subject];
  const tables = CORE_TABLES[subject];

  const [topics, setTopics] = useState<CoreTopic[]>([]);
  const [quizzes, setQuizzes] = useState<CoreQuiz[]>([]);

  const [completedQuizIds, setCompletedQuizIds] = useState<Set<string>>(
    new Set(),
  );

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);
  const [savingTopicId, setSavingTopicId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    if (status !== "allowed") return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage("");
      setReviewError("");

      setTopics([]);
      setQuizzes([]);
      setCompletedQuizIds(new Set());

      // ================================================================
      // 1. LOAD TOPICS
      // ================================================================

      const topicResult = await supabase
        .from(tables.topics)
        .select(
          "id,subject,primary_level,slug,title,short_title,description,icon,quiz_target,sort_order,is_assessment_topic,review_satisfied",
        )
        .eq("subject", subject)
        .eq("primary_level", level)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (cancelled) return;

      if (topicResult.error) {
        setMessage(topicResult.error.message);
        setLoading(false);
        return;
      }

      const loadedTopics = (topicResult.data || []) as CoreTopic[];

      setTopics(loadedTopics);

      // ================================================================
      // 2. DETERMINE WHETHER CURRENT USER IS ADMIN
      // ================================================================

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

          setIsAdmin(false);
        } else {
          setIsAdmin(
            normalizeRole(profileResult.data?.role) === "admin",
          );
        }
      } else {
        setIsAdmin(false);
      }

      // ================================================================
      // 3. LOAD PUBLISHED QUIZZES FOR THESE TOPICS
      // ================================================================

      const topicIds = loadedTopics.map((topic) => topic.id);

      const quizResult = topicIds.length
        ? await supabase
            .from(tables.quizzes)
            .select("id,topic_id")
            .in("topic_id", topicIds)
            .eq("is_published", true)
            .eq("status", "published")
            .order("quiz_order", { ascending: true })
        : { data: [], error: null };

      if (cancelled) return;

      if (quizResult.error) {
        setMessage(quizResult.error.message);
        setLoading(false);
        return;
      }

      const loadedQuizzes = (quizResult.data || []) as CoreQuiz[];

      setQuizzes(loadedQuizzes);

      // ================================================================
      // 4. LOAD COMPLETED QUIZZES FOR CURRENT USER
      // ================================================================

      const quizIds = loadedQuizzes.map((quiz) => quiz.id);

      const attemptResult =
        userId && quizIds.length
          ? await supabase
              .from(tables.attempts)
              .select("quiz_id")
              .eq("user_id", userId)
              .eq("status", "marked")
              .in("quiz_id", quizIds)
          : { data: [], error: null };

      if (cancelled) return;

      if (attemptResult.error) {
        console.warn(
          "Could not load Core topic progress:",
          attemptResult.error.message,
        );
      }

      setCompletedQuizIds(
        new Set(
          ((attemptResult.data || []) as AttemptRow[]).map(
            (attempt) => attempt.quiz_id,
          ),
        ),
      );

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
    tables.topics,
    tables.quizzes,
    tables.attempts,
  ]);

  // ====================================================================
  // ADMIN REVIEW STATUS
  // ====================================================================

  async function setTopicReviewStatus(
    topicId: string,
    satisfied: boolean,
  ) {
    if (!isAdmin) return;
    if (savingTopicId) return;

    const previousTopic = topics.find(
      (topic) => topic.id === topicId,
    );

    if (!previousTopic) return;

    if (previousTopic.review_satisfied === satisfied) {
      return;
    }

    setSavingTopicId(topicId);
    setReviewError("");

    // Optimistic UI update.
    setTopics((current) =>
      current.map((topic) =>
        topic.id === topicId
          ? {
              ...topic,
              review_satisfied: satisfied,
            }
          : topic,
      ),
    );

    const { error } = await supabase.rpc(
      "set_core_topic_review_status",
      {
        p_subject: subject,
        p_topic_id: topicId,
        p_satisfied: satisfied,
      },
    );

    if (error) {
      // Roll back if database save fails.
      setTopics((current) =>
        current.map((topic) =>
          topic.id === topicId
            ? {
                ...topic,
                review_satisfied:
                  previousTopic.review_satisfied,
              }
            : topic,
        ),
      );

      setReviewError(
        `Could not update review status: ${error.message}`,
      );
    }

    setSavingTopicId(null);
  }

  // ====================================================================
  // TOPIC COUNTS
  // ====================================================================

  const topicRows = useMemo<TopicWithCounts[]>(
    () =>
      topics.map((topic) => {
        const topicQuizzes = quizzes.filter(
          (quiz) => quiz.topic_id === topic.id,
        );

        return {
          ...topic,

          publishedCount: topicQuizzes.length,

          completedCount: topicQuizzes.filter((quiz) =>
            completedQuizIds.has(quiz.id),
          ).length,
        };
      }),
    [topics, quizzes, completedQuizIds],
  );

  const totalPublished = topicRows.reduce(
    (sum, topic) => sum + topic.publishedCount,
    0,
  );

  const totalCompleted = topicRows.reduce(
    (sum, topic) => sum + topic.completedCount,
    0,
  );

  const totalPlanned = topicRows.reduce(
    (sum, topic) => sum + Number(topic.quiz_target || 0),
    0,
  );

  const progress =
    totalPublished > 0
      ? Math.round(
          (totalCompleted / totalPublished) * 100,
        )
      : 0;

  const levelCopy = CORE_LEVEL_COPY[level];

  // ====================================================================
  // ACCESS STATES
  // ====================================================================

  if (status === "checking") {
    return (
      <CoreMissionPageShell>
        <CoreMissionTopBar
          backHref={`/learning-missions/core?subject=${subject}`}
          backLabel={`${theme.shortName} Levels`}
        />

        <StatusPanel text="Checking Core Missions access…" />
      </CoreMissionPageShell>
    );
  }

  if (
    status === "locked" ||
    status === "signed_out" ||
    status === "profile_required"
  ) {
    const text =
      status === "signed_out"
        ? "Log in to continue into Core Missions."
        : status === "profile_required"
          ? "Complete the learner profile before continuing into Core Missions."
          : "This account does not currently have Core Missions access.";

    return (
      <CoreMissionPageShell>
        <CoreMissionTopBar
          backHref={`/learning-missions/core?subject=${subject}`}
          backLabel={`${theme.shortName} Levels`}
        />

        <MessagePanel text={text} />
      </CoreMissionPageShell>
    );
  }

  // ====================================================================
  // PAGE
  // ====================================================================

  return (
    <CoreMissionPageShell>
      <CoreMissionTopBar
        backHref={`/learning-missions/core?subject=${subject}`}
        backLabel={`${theme.shortName} Levels`}
      />

      <section
        className={[
          "mt-7 overflow-hidden rounded-[2.25rem] border bg-white/[0.055]",
          "shadow-[0_30px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl",
          theme.borderClass,
        ].join(" ")}
      >
        <div className={`h-2 ${theme.barClass}`} />

        <div className="grid gap-7 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:p-10">
          <div>
            <p
              className={[
                "m-0 text-xs font-black uppercase tracking-[0.2em]",
                theme.eyebrowClass,
              ].join(" ")}
            >
              Primary {level} · {theme.name} Curriculum
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
              {theme.name} Primary {level}
            </h1>

            <p className="mt-4 max-w-3xl text-base leading-7 text-white/65 sm:text-lg">
              {levelCopy.subtitle} Choose a curriculum topic and continue
              into its mission bank.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <span
                className={[
                  "rounded-full border px-3 py-1.5 text-xs font-bold",
                  theme.borderClass,
                  theme.softClass,
                  theme.textClass,
                ].join(" ")}
              >
                Curriculum mastery
              </span>

              <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-100">
                Topic-based missions
              </span>

              <span className="rounded-full border border-white/15 bg-white/[0.05] px-3 py-1.5 text-xs font-bold text-white/70">
                {totalPlanned || 250} planned quizzes
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <Metric
              label="Published"
              value={String(totalPublished)}
            />

            <Metric
              label="Completed"
              value={String(totalCompleted)}
            />

            <Metric
              label="Progress"
              value={`${progress}%`}
            />
          </div>
        </div>
      </section>

      {loading ? (
        <StatusPanel
          text={`Loading ${theme.name} topics…`}
        />
      ) : message ? (
        <MessagePanel text={message} />
      ) : (
        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="m-0 text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
                Primary {level} Topics
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-[-0.035em]">
                Choose a {theme.name} topic
              </h2>
            </div>

            <p className="m-0 max-w-xl text-sm leading-6 text-white/50">
              Quiz cards appear inside each topic after a Curriculum Lead
              or Admin publishes them.
            </p>
          </div>

          {/* ============================================================
              ADMIN REVIEW LEGEND
          ============================================================ */}

          {isAdmin ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="m-0 text-xs font-bold text-white/55">
                  Admin curriculum review
                </p>

                <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.1em]">
                  <span className="text-cyan-200">
                    ● Blue = Reviewing
                  </span>

                  <span className="text-amber-200">
                    ● Gold = Satisfied
                  </span>
                </div>
              </div>

              {reviewError ? (
                <p className="mt-2 text-xs font-bold text-red-300">
                  {reviewError}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* ============================================================
              TOPIC CARDS
          ============================================================ */}

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {topicRows.map((topic) => {
              const topicProgress =
                topic.publishedCount > 0
                  ? Math.round(
                      (topic.completedCount /
                        topic.publishedCount) *
                        100,
                    )
                  : 0;

              const isSatisfied =
                topic.review_satisfied === true;

              const isSaving =
                savingTopicId === topic.id;

              return (
                <article
                  key={topic.id}
                  className={[
                    "group overflow-hidden rounded-[1.75rem] border text-white",
                    "transition duration-200 hover:-translate-y-1",

                    isSatisfied
                      ? [
                          "border-amber-200/35",
                          "bg-[linear-gradient(145deg,rgba(120,78,12,0.38),rgba(22,14,4,0.94))]",
                          "shadow-[0_20px_58px_rgba(245,158,11,0.12)]",
                          "hover:border-amber-200/60",
                          "hover:shadow-[0_22px_64px_rgba(245,158,11,0.18)]",
                        ].join(" ")
                      : [
                          "border-cyan-200/20",
                          "bg-[linear-gradient(145deg,rgba(14,59,104,0.48),rgba(4,15,34,0.95))]",
                          "shadow-[0_20px_58px_rgba(0,0,0,0.24)]",
                          "hover:border-cyan-200/45",
                          "hover:shadow-[0_22px_64px_rgba(34,211,238,0.10)]",
                        ].join(" "),
                  ].join(" ")}
                >
                  {/* ====================================================
                      ADMIN-ONLY BLUE / GOLD CONTROL
                  ==================================================== */}

                  {isAdmin ? (
                    <div
                      className={[
                        "flex items-center justify-between gap-3",
                        "border-b px-4 py-3",

                        isSatisfied
                          ? "border-amber-200/15 bg-amber-950/25"
                          : "border-cyan-200/15 bg-slate-950/25",
                      ].join(" ")}
                    >
                      <div>
                        <p className="m-0 text-[9px] font-black uppercase tracking-[0.16em] text-white/35">
                          Admin review
                        </p>

                        <p
                          className={[
                            "mt-0.5 text-xs font-black",

                            isSatisfied
                              ? "text-amber-200"
                              : "text-cyan-200",
                          ].join(" ")}
                        >
                          {isSaving
                            ? "Saving…"
                            : isSatisfied
                              ? "Satisfied"
                              : "Reviewing"}
                        </p>
                      </div>

                      <div className="flex rounded-xl border border-white/10 bg-black/25 p-1">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() =>
                            void setTopicReviewStatus(
                              topic.id,
                              false,
                            )
                          }
                          className={[
                            "rounded-lg px-3 py-2",
                            "text-[10px] font-black uppercase tracking-[0.08em]",
                            "transition",
                            "disabled:cursor-wait disabled:opacity-50",

                            !isSatisfied
                              ? [
                                  "bg-cyan-300/20",
                                  "text-cyan-100",
                                  "shadow-[0_0_18px_rgba(34,211,238,0.14)]",
                                ].join(" ")
                              : [
                                  "text-white/35",
                                  "hover:bg-white/[0.06]",
                                  "hover:text-white/70",
                                ].join(" "),
                          ].join(" ")}
                        >
                          Blue
                        </button>

                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() =>
                            void setTopicReviewStatus(
                              topic.id,
                              true,
                            )
                          }
                          className={[
                            "rounded-lg px-3 py-2",
                            "text-[10px] font-black uppercase tracking-[0.08em]",
                            "transition",
                            "disabled:cursor-wait disabled:opacity-50",

                            isSatisfied
                              ? [
                                  "bg-amber-300/20",
                                  "text-amber-100",
                                  "shadow-[0_0_18px_rgba(251,191,36,0.14)]",
                                ].join(" ")
                              : [
                                  "text-white/35",
                                  "hover:bg-white/[0.06]",
                                  "hover:text-white/70",
                                ].join(" "),
                          ].join(" ")}
                        >
                          Gold
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* ====================================================
                      CLICKABLE TOPIC AREA
                  ==================================================== */}

                  <Link
                    href={`/learning-missions/core/${subject}/p${level}/${topic.slug}`}
                    className="block p-5 text-white no-underline"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div
                        className={[
                          "grid h-14 w-14 place-items-center rounded-2xl border text-2xl",

                          isSatisfied
                            ? [
                                "border-amber-200/35",
                                "bg-amber-300/10",
                                "text-amber-100",
                                "shadow-[0_0_26px_rgba(251,191,36,0.10)]",
                              ].join(" ")
                            : [
                                "border-cyan-200/30",
                                "bg-cyan-300/10",
                                "text-cyan-100",
                                "shadow-[0_0_26px_rgba(34,211,238,0.08)]",
                              ].join(" "),
                        ].join(" ")}
                      >
                        {topic.icon || theme.icon}
                      </div>

                      <span
                        className={[
                          "rounded-full border px-3 py-1",
                          "text-[10px] font-black uppercase tracking-[0.12em]",

                          isSatisfied
                            ? [
                                "border-amber-200/25",
                                "bg-amber-300/10",
                                "text-amber-100/80",
                              ].join(" ")
                            : [
                                "border-cyan-200/20",
                                "bg-cyan-300/[0.07]",
                                "text-cyan-100/70",
                              ].join(" "),
                        ].join(" ")}
                      >
                        {topic.quiz_target} planned
                      </span>
                    </div>

                    <h3
                      className={[
                        "mt-5 text-xl font-black tracking-[-0.025em]",

                        isSatisfied
                          ? "text-amber-50"
                          : "text-white",
                      ].join(" ")}
                    >
                      {topic.title}
                    </h3>

                    <p
                      className={[
                        "mt-2 min-h-[66px] text-sm leading-6",

                        isSatisfied
                          ? "text-amber-50/62"
                          : "text-white/55",
                      ].join(" ")}
                    >
                      {topic.description ||
                        "Focused curriculum practice for this topic."}
                    </p>

                    <div className="mt-5">
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={
                            isSatisfied
                              ? "text-amber-50/45"
                              : "text-white/45"
                          }
                        >
                          {topic.publishedCount} published ·{" "}
                          {topic.completedCount} completed
                        </span>

                        <strong
                          className={
                            isSatisfied
                              ? "text-amber-200"
                              : "text-cyan-200"
                          }
                        >
                          {topicProgress}%
                        </strong>
                      </div>

                      <div
                        className={[
                          "mt-2 h-2 overflow-hidden rounded-full",

                          isSatisfied
                            ? "bg-amber-50/[0.08]"
                            : "bg-white/[0.07]",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "h-full rounded-full",

                            isSatisfied
                              ? "bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-200"
                              : "bg-gradient-to-r from-blue-500 via-cyan-300 to-sky-200",
                          ].join(" ")}
                          style={{
                            width: `${topicProgress}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div
                      className={[
                        "mt-5 text-sm font-extrabold",

                        isSatisfied
                          ? "text-amber-200"
                          : "text-cyan-200",
                      ].join(" ")}
                    >
                      Open topic →
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </CoreMissionPageShell>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <strong className="block text-2xl font-black">
        {value}
      </strong>

      <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.13em] text-white/40">
        {label}
      </span>
    </div>
  );
}

function StatusPanel({
  text,
}: {
  text: string;
}) {
  return (
    <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/55">
      {text}
    </div>
  );
}

function MessagePanel({
  text,
}: {
  text: string;
}) {
  return (
    <div className="mt-7 rounded-3xl border border-amber-200/25 bg-amber-300/10 p-6 text-amber-100">
      {text}
    </div>
  );
}