"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  ScienceQuizRow,
  ScienceTopicRow,
} from "@/lib/science/types";

function cleanRouteValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value || "";
}

export default function ScienceQuizPlaceholderPage() {
  const params = useParams<{ level: string; topic: string; quiz: string }>();
  const levelSlug = cleanRouteValue(params.level).toLowerCase();
  const topicSlug = cleanRouteValue(params.topic);
  const quizSlug = cleanRouteValue(params.quiz);

  const [level, setLevel] = useState<ScienceLevelRow | null>(null);
  const [topic, setTopic] = useState<ScienceTopicRow | null>(null);
  const [quiz, setQuiz] = useState<ScienceQuizRow | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage("");
      setLevel(null);
      setTopic(null);
      setQuiz(null);
      setQuestionCount(0);

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
          setMessage(levelResult.error?.message || "Science level not found.");
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

      const quizResult = await supabase
        .from("science_quizzes")
        .select("*")
        .eq("topic_id", loadedTopic.id)
        .eq("slug", quizSlug)
        .eq("status", "published")
        .maybeSingle();

      if (quizResult.error || !quizResult.data) {
        if (!cancelled) {
          setMessage(quizResult.error?.message || "Published quiz not found.");
          setLoading(false);
        }
        return;
      }

      const loadedQuiz = quizResult.data as ScienceQuizRow;
      setQuiz(loadedQuiz);

      const countResult = await supabase
        .from("science_quiz_questions")
        .select("question_id", { count: "exact", head: true })
        .eq("quiz_id", loadedQuiz.id);

      if (!cancelled) {
        setQuestionCount(countResult.count ?? 0);
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [levelSlug, quizSlug, topicSlug]);

  const missionMeta = quiz ? SCIENCE_MISSION_META[quiz.mission_type] : null;

  return (
    <SciencePageShell>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/learning-missions/science/${levelSlug}/${topicSlug}`}
          className="inline-flex min-h-11 items-center rounded-full border border-cyan-200/25 bg-white/[0.055] px-4 text-sm font-extrabold text-white no-underline"
        >
          ← {topic?.title || "Topic"}
        </Link>

        {canEditScience(role) && quiz && (
          <Link
            href={`/learning-missions/science/manage/quizzes/${quiz.id}`}
            className="inline-flex min-h-11 items-center rounded-full border border-violet-200/30 bg-violet-400/15 px-4 text-[10px] font-black uppercase tracking-[0.12em] text-violet-100 no-underline"
          >
            Edit questions
          </Link>
        )}
      </header>

      <section className="mx-auto mt-8 max-w-4xl rounded-[2.25rem] border border-white/10 bg-white/[0.055] p-6 text-center shadow-[0_30px_90px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-10">
        {loading ? (
          <p className="text-white/55">Loading quiz…</p>
        ) : message ? (
          <p className="text-amber-100">{message}</p>
        ) : quiz ? (
          <>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-cyan-200/20 bg-cyan-300/10 text-3xl">
              {missionMeta?.icon || "🔬"}
            </div>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
              {level?.school_level} · {missionMeta?.label}
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
              {quiz.title}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/58">
              {quiz.description || "A short Science mission."}
            </p>

            <div className="mx-auto mt-7 grid max-w-xl grid-cols-3 gap-3">
              <Metric label="Questions added" value={String(questionCount)} />
              <Metric label="Target" value={String(quiz.question_target)} />
              <Metric label="Time" value={`${quiz.estimated_minutes}m`} />
            </div>

            <div className="mt-8 rounded-2xl border border-dashed border-amber-200/25 bg-amber-300/[0.07] p-5 text-left">
              <strong className="text-amber-100">
                Questions are installed. The student quiz runner is the next phase.
              </strong>
              <p className="mt-2 text-sm leading-6 text-white/55">
                Curriculum Leads can review and edit the saved questions now. The next installation will add student answers, secure marking, progress, Dream Token and Dream Gem rewards, and Teaching Dashboard records.
              </p>
            </div>

            <button
              type="button"
              disabled
              className="mt-7 min-h-12 rounded-2xl border border-white/10 bg-white/[0.05] px-7 text-sm font-black text-white/35"
            >
              Start Quiz — Phase 2
            </button>
          </>
        ) : null}
      </section>
    </SciencePageShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <strong className="block text-xl font-black">{value}</strong>
      <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.12em] text-white/40">
        {label}
      </span>
    </div>
  );
}
