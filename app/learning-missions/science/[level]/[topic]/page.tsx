"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import SciencePageShell from "@/components/science-missions/SciencePageShell";
import {
  SCIENCE_MISSION_META,
  canAccessScience,
  canEditScience,
} from "@/lib/science/helpers";
import { supabase } from "@/lib/supabase";
import type {
  ScienceLevelRow,
  ScienceMissionType,
  ScienceQuizRow,
  ScienceTopicRow,
} from "@/lib/science/types";

const DISPLAY_TYPES: ScienceMissionType[] = [
  "learn",
  "practice",
  "investigate",
  "mastery",
  "assessment",
];

function cleanRouteValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || "";
}

export default function ScienceTopicPage() {
  const params = useParams<{ level: string; topic: string }>();
  const levelSlug = cleanRouteValue(params.level).toLowerCase();
  const topicSlug = cleanRouteValue(params.topic);

  const [level, setLevel] = useState<ScienceLevelRow | null>(null);
  const [topic, setTopic] = useState<ScienceTopicRow | null>(null);
  const [quizzes, setQuizzes] = useState<ScienceQuizRow[]>([]);
  const [completedQuizIds, setCompletedQuizIds] = useState<Set<string>>(
    new Set(),
  );
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage("");
      setLevel(null);
      setTopic(null);
      setQuizzes([]);
      setCompletedQuizIds(new Set());

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        setMessage("Log in to open Science Missions.");
        setLoading(false);
        return;
      }

      const profileResult = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      const loadedRole = profileResult.data?.role ?? null;
      setRole(loadedRole);

      if (!canAccessScience(loadedRole)) {
        setMessage(
          "Science Missions are currently available to Teacher, Curriculum Lead and Admin accounts.",
        );
        setLoading(false);
        return;
      }

      const levelResult = await supabase
        .from("science_levels")
        .select("*")
        .eq("slug", levelSlug)
        .eq("is_active", true)
        .maybeSingle();

      if (levelResult.error || !levelResult.data) {
        if (!cancelled) {
          setMessage(
            levelResult.error?.message ||
              `${levelSlug.toUpperCase()} Science is not installed yet.`,
          );
          setLoading(false);
        }
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

      if (topicResult.error || !topicResult.data) {
        if (!cancelled) {
          setMessage(topicResult.error?.message || "Science topic not found.");
          setLoading(false);
        }
        return;
      }

      const loadedTopic = topicResult.data as ScienceTopicRow;
      setTopic(loadedTopic);

      const [quizResult, progressResult] = await Promise.all([
        supabase
          .from("science_quizzes")
          .select("*")
          .eq("topic_id", loadedTopic.id)
          .eq("status", "published")
          .order("sequence_no", { ascending: true }),
        supabase
          .from("science_user_quiz_progress")
          .select("quiz_id,first_completed_at")
          .eq("user_id", user.id)
          .not("first_completed_at", "is", null),
      ]);

      if (cancelled) return;

      if (quizResult.error) {
        setMessage(quizResult.error.message);
      }

      setQuizzes((quizResult.data ?? []) as ScienceQuizRow[]);
      setCompletedQuizIds(
        new Set((progressResult.data ?? []).map((row) => String(row.quiz_id))),
      );
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [levelSlug, topicSlug]);

  const groupedQuizzes = useMemo(() => {
    return new Map(
      DISPLAY_TYPES.map((type) => [
        type,
        quizzes.filter((quiz) => quiz.mission_type === type),
      ]),
    );
  }, [quizzes]);

  return (
    <SciencePageShell>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/learning-missions/science/${levelSlug}`}
          className="inline-flex min-h-11 items-center rounded-full border border-cyan-200/25 bg-white/[0.055] px-4 text-sm font-extrabold text-white no-underline"
        >
          ← {level?.school_level || levelSlug.toUpperCase()} Topics
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-emerald-200/20 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-100">
            {level?.display_name || "Science Missions"}
          </span>

          {canEditScience(role) && (
            <Link
              href="/learning-missions/science/manage"
              className="inline-flex min-h-10 items-center rounded-full border border-violet-200/30 bg-violet-400/15 px-4 text-[10px] font-black uppercase tracking-[0.12em] text-violet-100 no-underline"
            >
              Edit curriculum
            </Link>
          )}
        </div>
      </header>

      <section className="mt-7 rounded-[2.2rem] border border-white/10 bg-white/[0.055] p-6 shadow-[0_28px_84px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-8 lg:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <div className="grid h-16 w-16 place-items-center rounded-3xl border border-emerald-200/20 bg-emerald-300/10 text-3xl">
              {topic?.icon || "🔬"}
            </div>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
              {level?.school_level || levelSlug.toUpperCase()} Science Topic
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
              {topic?.title || "Science Topic"}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-white/62">
              {topic?.summary || "Loading topic details…"}
            </p>
          </div>

          <div className="grid min-w-[230px] grid-cols-2 gap-3 lg:grid-cols-1">
            <Metric label="Published quizzes" value={String(quizzes.length)} />
            <Metric
              label="Completed"
              value={String(
                quizzes.filter((quiz) => completedQuizIds.has(quiz.id)).length,
              )}
            />
            <Metric
              label="Planned"
              value={String(topic?.planned_quiz_count ?? 0)}
            />
          </div>
        </div>

        <div className="mt-7 flex flex-wrap gap-2">
          {(topic?.learning_areas ?? []).map((area) => (
            <span
              key={area}
              className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-bold text-white/62"
            >
              {area}
            </span>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/55">
          Loading topic quizzes…
        </div>
      ) : message ? (
        <div className="mt-7 rounded-3xl border border-amber-200/25 bg-amber-300/10 p-6 text-amber-100">
          {message}
        </div>
      ) : (
        <section className="mt-8 grid gap-5">
          {DISPLAY_TYPES.map((type) => {
            const meta = SCIENCE_MISSION_META[type];
            const typeQuizzes = groupedQuizzes.get(type) ?? [];

            return (
              <article
                key={type}
                className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(145deg,rgba(7,31,55,0.8),rgba(3,13,30,0.9))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.2)] sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-200/18 bg-cyan-300/10 text-xl">
                      {meta.icon}
                    </div>
                    <div>
                      <h2 className="m-0 text-xl font-black">{meta.label}</h2>
                      <p className="mt-1 text-sm leading-6 text-white/50">
                        {meta.description}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black text-white/52">
                    {typeQuizzes.length} published
                  </span>
                </div>

                {typeQuizzes.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-white/12 bg-white/[0.025] p-5 text-sm text-white/42">
                    No published {meta.shortLabel.toLowerCase()} quizzes yet.
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {typeQuizzes.map((quiz) => {
                      const completed = completedQuizIds.has(quiz.id);

                      return (
                        <Link
                          key={quiz.id}
                          href={`/learning-missions/science/${levelSlug}/${topicSlug}/${quiz.slug}`}
                          className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-white no-underline transition hover:border-cyan-200/28 hover:bg-cyan-300/[0.055]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">
                              Quiz {quiz.sequence_no}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] ${
                                completed
                                  ? "bg-emerald-300/12 text-emerald-100"
                                  : "bg-white/[0.05] text-white/45"
                              }`}
                            >
                              {completed ? "Completed" : "Not started"}
                            </span>
                          </div>
                          <h3 className="mt-3 text-base font-black leading-6">
                            {quiz.title}
                          </h3>
                          <p className="mt-2 line-clamp-2 min-h-[40px] text-xs leading-5 text-white/48">
                            {quiz.description || "A short Science mission."}
                          </p>
                          <div className="mt-4 flex items-center justify-between text-xs text-white/42">
                            <span>{quiz.question_target} questions</span>
                            <span>{quiz.estimated_minutes} min</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </SciencePageShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <strong className="block text-2xl font-black">{value}</strong>
      <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.13em] text-white/42">
        {label}
      </span>
    </div>
  );
}
