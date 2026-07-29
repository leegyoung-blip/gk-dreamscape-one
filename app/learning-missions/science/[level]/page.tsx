"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import SciencePageShell from "@/components/science-missions/SciencePageShell";
import { canAccessScience, canEditScience } from "@/lib/science/helpers";
import { supabase } from "@/lib/supabase";
import type {
  ScienceLevelRow,
  ScienceQuizRow,
  ScienceTopicRow,
} from "@/lib/science/types";

type TopicWithCounts = ScienceTopicRow & {
  publishedCount: number;
  completedCount: number;
};

function cleanRouteValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || "";
}

export default function ScienceLevelPage() {
  const params = useParams<{ level: string }>();
  const levelSlug = cleanRouteValue(params.level).toLowerCase();

  const [level, setLevel] = useState<ScienceLevelRow | null>(null);
  const [topics, setTopics] = useState<ScienceTopicRow[]>([]);
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
      setTopics([]);
      setQuizzes([]);
      setCompletedQuizIds(new Set());

      if (!/^p[1-6]$/.test(levelSlug)) {
        setMessage("This Science level does not exist.");
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        setMessage("Log in to open Science Missions.");
        setLoading(false);
        return;
      }

      const [profileResult, levelResult] = await Promise.all([
        supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
        supabase
          .from("science_levels")
          .select("*")
          .eq("slug", levelSlug)
          .eq("is_active", true)
          .maybeSingle(),
      ]);

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

      if (levelResult.error || !levelResult.data) {
        setMessage(
          levelResult.error?.message ||
            `${levelSlug.toUpperCase()} Science has not been added to Supabase yet.`,
        );
        setLoading(false);
        return;
      }

      const loadedLevel = levelResult.data as ScienceLevelRow;
      setLevel(loadedLevel);

      const topicResult = await supabase
        .from("science_topics")
        .select("*")
        .eq("level_id", loadedLevel.id)
        .eq("status", "active")
        .order("sort_order", { ascending: true });

      if (cancelled) return;

      if (topicResult.error) {
        setMessage(topicResult.error.message);
        setLoading(false);
        return;
      }

      const loadedTopics = (topicResult.data ?? []) as ScienceTopicRow[];
      setTopics(loadedTopics);

      const topicIds = loadedTopics.map((topic) => topic.id);

      const [quizResult, progressResult] = await Promise.all([
        topicIds.length
          ? supabase
              .from("science_quizzes")
              .select("*")
              .in("topic_id", topicIds)
              .eq("status", "published")
              .order("sequence_no", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
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
  }, [levelSlug]);

  const topicRows = useMemo<TopicWithCounts[]>(() => {
    return topics.map((topic) => {
      const topicQuizzes = quizzes.filter((quiz) => quiz.topic_id === topic.id);

      return {
        ...topic,
        publishedCount: topicQuizzes.length,
        completedCount: topicQuizzes.filter((quiz) =>
          completedQuizIds.has(quiz.id),
        ).length,
      };
    });
  }, [topics, quizzes, completedQuizIds]);

  const totalPublished = topicRows.reduce(
    (sum, topic) => sum + topic.publishedCount,
    0,
  );
  const totalCompleted = topicRows.reduce(
    (sum, topic) => sum + topic.completedCount,
    0,
  );
  const completionPercentage =
    totalPublished > 0 ? Math.round((totalCompleted / totalPublished) * 100) : 0;

  const isDiscovery = level?.pathway === "science_discovery";

  return (
    <SciencePageShell>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/learning-missions/science"
          className="inline-flex min-h-11 items-center rounded-full border border-cyan-200/25 bg-white/[0.055] px-4 text-sm font-extrabold text-white no-underline backdrop-blur-xl"
        >
          ← Science Levels
        </Link>

        {canEditScience(role) && (
          <Link
            href="/learning-missions/science/manage"
            className="inline-flex min-h-11 items-center rounded-full border border-violet-200/30 bg-violet-400/15 px-4 text-xs font-black uppercase tracking-[0.12em] text-violet-100 no-underline"
          >
            Curriculum Editor
          </Link>
        )}
      </header>

      <section className="mt-7 overflow-hidden rounded-[2.25rem] border border-emerald-200/20 bg-white/[0.055] shadow-[0_30px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <div className="h-2 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
        <div className="grid gap-7 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:p-10">
          <div>
            <p className="m-0 text-xs font-black uppercase tracking-[0.2em] text-emerald-200">
              {level
                ? `${level.school_level} · ${
                    isDiscovery ? "Science Discovery" : "Primary Science"
                  }`
                : `${levelSlug.toUpperCase()} · Science Missions`}
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
              {level?.display_name || "Science Missions"}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-white/65 sm:text-lg">
              {level?.description || "Loading Science curriculum…"}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-100">
                {isDiscovery ? "Visual discovery" : "Concept mastery"}
              </span>
              <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-100">
                Topic-based missions
              </span>
              <span className="rounded-full border border-white/15 bg-white/[0.05] px-3 py-1.5 text-xs font-bold text-white/70">
                {level?.planned_quiz_count ?? 250} planned quizzes
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <Metric label="Published" value={`${totalPublished}`} />
            <Metric label="Completed" value={`${totalCompleted}`} />
            <Metric label="Progress" value={`${completionPercentage}%`} />
          </div>
        </div>
      </section>

      {loading ? (
        <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/55">
          Loading Science topics…
        </div>
      ) : message ? (
        <div className="mt-7 rounded-3xl border border-amber-200/25 bg-amber-300/10 p-6 text-amber-100">
          {message}
        </div>
      ) : (
        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="m-0 text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
                {level?.school_level} Topics
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.035em]">
                Choose a science topic
              </h2>
            </div>
            <p className="m-0 max-w-xl text-sm leading-6 text-white/50">
              Quiz cards appear inside each topic after a Curriculum Lead or Admin publishes them.
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
                  href={`/learning-missions/science/${levelSlug}/${topic.slug}`}
                  className="group rounded-[1.75rem] border border-white/10 bg-[linear-gradient(145deg,rgba(8,40,61,0.76),rgba(4,17,37,0.88))] p-5 text-white no-underline shadow-[0_20px_58px_rgba(0,0,0,0.22)] transition hover:-translate-y-1 hover:border-emerald-200/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl border border-emerald-200/20 bg-emerald-300/10 text-2xl">
                      {topic.icon || "🔬"}
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/55">
                      {topic.planned_quiz_count} planned
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-black tracking-[-0.025em]">
                    {topic.title}
                  </h3>
                  <p className="mt-2 min-h-[66px] text-sm leading-6 text-white/55">
                    {topic.summary}
                  </p>

                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/45">
                        {topic.publishedCount} published · {topic.completedCount} completed
                      </span>
                      <strong className="text-emerald-200">{topicProgress}%</strong>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
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
