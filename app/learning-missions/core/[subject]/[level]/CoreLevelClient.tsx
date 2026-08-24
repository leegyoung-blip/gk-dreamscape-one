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

  useEffect(() => {
    if (status !== "allowed") return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage("");
      setTopics([]);
      setQuizzes([]);
      setCompletedQuizIds(new Set());

      const topicResult = await supabase
        .from(tables.topics)
        .select(
          "id,subject,primary_level,slug,title,short_title,description,icon,quiz_target,sort_order,is_assessment_topic",
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
      ? Math.round((totalCompleted / totalPublished) * 100)
      : 0;

  const levelCopy = CORE_LEVEL_COPY[level];

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

  if (status === "signed_out") {
    return (
      <CoreMissionPageShell>
        <CoreMissionTopBar
          backHref={`/learning-missions/core?subject=${subject}`}
          backLabel={`${theme.shortName} Levels`}
        />
        <MessagePanel text="Log in with the learner account connected to Dreamscape access." />
      </CoreMissionPageShell>
    );
  }

  if (status === "profile_required") {
    return (
      <CoreMissionPageShell>
        <CoreMissionTopBar
          backHref={`/learning-missions/core?subject=${subject}`}
          backLabel={`${theme.shortName} Levels`}
        />
        <MessagePanel text="Complete the learner profile before using unpaid or manually unavailable Core access." />
      </CoreMissionPageShell>
    );
  }

  if (status === "locked") {
    return (
      <CoreMissionPageShell>
        <CoreMissionTopBar
          backHref={`/learning-missions/core?subject=${subject}`}
          backLabel={`${theme.shortName} Levels`}
        />
        <MessagePanel text="This account does not currently have Core Missions access." />
      </CoreMissionPageShell>
    );
  }

  return (
    <CoreMissionPageShell>
      <CoreMissionTopBar
        backHref={`/learning-missions/core?subject=${subject}`}
        backLabel={`${theme.shortName} Levels`}
      />

      <section
        className={[
          "mt-7 overflow-hidden rounded-[2.25rem] border bg-white/[0.055] shadow-[0_30px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl",
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
              {levelCopy.subtitle} Choose a curriculum topic and continue into
              its mission bank.
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
            <Metric label="Published" value={String(totalPublished)} />
            <Metric label="Completed" value={String(totalCompleted)} />
            <Metric label="Progress" value={`${progress}%`} />
          </div>
        </div>
      </section>

      {loading ? (
        <StatusPanel text={`Loading ${theme.name} topics…`} />
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
              Quiz cards appear inside each topic after a Curriculum Lead or
              Admin publishes them.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {topicRows.map((topic) => {
              const topicProgress =
                topic.publishedCount > 0
                  ? Math.round(
                      (topic.completedCount / topic.publishedCount) * 100,
                    )
                  : 0;

              return (
                <Link
                  key={topic.id}
                  href={`/learning-missions/core/${subject}/p${level}/${topic.slug}`}
                  className={[
                    "group rounded-[1.75rem] border border-white/10 p-5 text-white no-underline shadow-[0_20px_58px_rgba(0,0,0,0.22)] transition hover:-translate-y-1",
                    theme.cardBackground,
                    subject === "english"
                      ? "hover:border-violet-200/30"
                      : "hover:border-emerald-200/30",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={[
                        "grid h-14 w-14 place-items-center rounded-2xl border text-2xl",
                        theme.borderClass,
                        theme.softClass,
                      ].join(" ")}
                    >
                      {topic.icon || theme.icon}
                    </div>

                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/55">
                      {topic.quiz_target} planned
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-black tracking-[-0.025em]">
                    {topic.title}
                  </h3>

                  <p className="mt-2 min-h-[66px] text-sm leading-6 text-white/55">
                    {topic.description ||
                      "Focused curriculum practice for this topic."}
                  </p>

                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/45">
                        {topic.publishedCount} published · {topic.completedCount}{" "}
                        completed
                      </span>
                      <strong className={theme.eyebrowClass}>
                        {topicProgress}%
                      </strong>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className={`h-full rounded-full ${theme.progressClass}`}
                        style={{ width: `${topicProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 text-sm font-extrabold text-cyan-200">
                    Open topic →
                  </div>
                </Link>
              );
            })}
          </div>
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
