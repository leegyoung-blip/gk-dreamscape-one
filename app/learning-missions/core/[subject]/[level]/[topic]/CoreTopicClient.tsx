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

type CoreTopic = {
  id: string;
  slug: string;
  title: string;
  short_title: string;
  description: string | null;
  icon: string | null;
  quiz_target: number;
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

  useEffect(() => {
    if (status !== "allowed") return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage("");
      setTopic(null);
      setQuizzes([]);
      setAttempts([]);

      const topicResult = await supabase
        .from(tables.topics)
        .select("id,slug,title,short_title,description,icon,quiz_target")
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

      const quizResult = await supabase
        .from(tables.quizzes)
        .select(
          "id,topic_id,title,description,quiz_type,difficulty,question_count,estimated_minutes,reward_tokens,reward_gems,quiz_order",
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

      {loading ? (
        <StatusPanel text="Loading topic quizzes…" />
      ) : message ? (
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

                    return (
                      <button
                        key={quiz.id}
                        type="button"
                        onClick={() =>
                          router.push(
                            `/learning-missions/core/${subject}/p${level}/quiz/${quiz.id}`,
                          )
                        }
                        className={[
                          "group flex min-h-[270px] flex-col rounded-[1.55rem] border p-5 text-left text-white shadow-[0_18px_50px_rgba(0,0,0,0.2)] transition hover:-translate-y-1",
                          completed
                            ? "border-emerald-200/25 bg-[linear-gradient(145deg,rgba(8,54,49,0.68),rgba(4,19,34,0.92))]"
                            : `border-white/10 ${theme.cardBackground}`,
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span
                            className={[
                              "rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.11em]",
                              theme.borderClass,
                              theme.softClass,
                              theme.textClass,
                            ].join(" ")}
                          >
                            {CORE_QUIZ_TYPE_LABELS[type]}
                          </span>

                          <span
                            className={[
                              "rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.08em]",
                              completed
                                ? "border-emerald-200/25 bg-emerald-300/10 text-emerald-100"
                                : "border-white/10 bg-white/[0.04] text-white/50",
                            ].join(" ")}
                          >
                            {completed ? "✓ Completed" : `Level ${quiz.difficulty}`}
                          </span>
                        </div>

                        <h3 className="mt-5 text-xl font-black tracking-[-0.025em]">
                          {quiz.title}
                        </h3>

                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/55">
                          {quiz.description ||
                            "Complete this curriculum mission and review your answers."}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-white/50">
                          <span>{quiz.question_count} questions</span>
                          <span>{quiz.estimated_minutes} min</span>
                          <span>
                            {quiz.reward_tokens} DT · {quiz.reward_gems} DG
                          </span>
                        </div>

                        <div className="mt-auto pt-5">
                          {attempt && (
                            <p className="mb-3 text-xs font-extrabold text-emerald-200">
                              Best score: {Math.round(Number(attempt.percentage || 0))}% ·{" "}
                              {attempt.correct_count}/{attempt.total_questions}
                            </p>
                          )}

                          <div
                            className={[
                              "flex min-h-11 items-center justify-center rounded-xl text-sm font-black",
                              completed
                                ? "bg-gradient-to-r from-emerald-400 to-teal-400 text-emerald-950"
                                : theme.barClass,
                            ].join(" ")}
                          >
                            {completed ? "Replay Mission" : "Start Mission"} →
                          </div>
                        </div>
                      </button>
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
