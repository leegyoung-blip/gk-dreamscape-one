"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CoreMissionPageShell from "@/components/core-missions/CoreMissionPageShell";
import CoreMissionTopBar from "@/components/core-missions/CoreMissionTopBar";
import {
  CORE_LEVEL_COPY,
  CORE_SUBJECT_THEMES,
  normaliseRole,
  type CoreSubject,
  type PrimaryLevel,
} from "@/lib/core-missions/catalogue";
import { useCoreMissionAccess } from "@/hooks/useCoreMissionAccess";
import { supabase } from "@/lib/supabase";

type TopicReviewStatus =
  | "locked"
  | "reviewing"
  | "satisfied";

type TopicOverviewRow = {
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
  review_status: TopicReviewStatus;
  published_count: number;
  completed_count: number;
};

type TopicWithCounts = {
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
  review_status: TopicReviewStatus;
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
  const { status, role } = useCoreMissionAccess();

  const theme = CORE_SUBJECT_THEMES[subject];

  const [topics, setTopics] = useState<TopicWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [savingTopicId, setSavingTopicId] =
    useState<string | null>(null);
  const [reviewError, setReviewError] = useState("");

  const [editingTopic, setEditingTopic] =
    useState<TopicWithCounts | null>(null);
  const [editTopicTitle, setEditTopicTitle] = useState("");
  const [editTopicShortTitle, setEditTopicShortTitle] = useState("");
  const [renameTopicSaving, setRenameTopicSaving] = useState(false);
  const [renameTopicError, setRenameTopicError] = useState("");

  const isAdmin = normaliseRole(role) === "admin";

  useEffect(() => {
    if (status !== "allowed") return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage("");
      setReviewError("");

      const { data, error } = await supabase.rpc(
        "get_core_level_topics_overview",
        {
          p_subject: subject,
          p_level: level,
        },
      );

      if (cancelled) return;

      if (error) {
        setMessage(error.message);
        setTopics([]);
        setLoading(false);
        return;
      }

      const rows = (data || []) as TopicOverviewRow[];

      setTopics(
        rows.map((row) => ({
          id: row.id,
          subject: row.subject,
          primary_level: Number(row.primary_level),
          slug: row.slug,
          title: row.title,
          short_title: row.short_title,
          description: row.description,
          icon: row.icon,
          quiz_target: Number(row.quiz_target || 0),
          sort_order: Number(row.sort_order || 0),
          is_assessment_topic: Boolean(row.is_assessment_topic),
          review_status: row.review_status || "reviewing",
          publishedCount: Number(row.published_count || 0),
          completedCount: Number(row.completed_count || 0),
        })),
      );

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [status, subject, level]);

  async function setTopicReviewStatus(
    topicId: string,
    nextStatus: TopicReviewStatus,
  ) {
    if (!isAdmin) return;
    if (savingTopicId) return;

    const previousTopic = topics.find(
      (topic) => topic.id === topicId,
    );

    if (!previousTopic) return;

    if (previousTopic.review_status === nextStatus) {
      return;
    }

    setSavingTopicId(topicId);
    setReviewError("");

    setTopics((current) =>
      current.map((topic) =>
        topic.id === topicId
          ? {
              ...topic,
              review_status: nextStatus,
            }
          : topic,
      ),
    );

    const { error } = await supabase.rpc(
      "set_core_topic_review_status",
      {
        p_subject: subject,
        p_topic_id: topicId,
        p_status: nextStatus,
      },
    );

    if (error) {
      setTopics((current) =>
        current.map((topic) =>
          topic.id === topicId
            ? {
                ...topic,
                review_status:
                  previousTopic.review_status,
              }
            : topic,
        ),
      );

      setReviewError(
        `Could not update topic status: ${error.message}`,
      );
    }

    setSavingTopicId(null);
  }

  function openTopicRename(topic: TopicWithCounts) {
    if (!isAdmin) return;
    setEditingTopic(topic);
    setEditTopicTitle(topic.title);
    setEditTopicShortTitle(topic.short_title || topic.title);
    setRenameTopicError("");
  }

  function closeTopicRename() {
    if (renameTopicSaving) return;
    setEditingTopic(null);
    setEditTopicTitle("");
    setEditTopicShortTitle("");
    setRenameTopicError("");
  }

  async function saveTopicRename() {
    if (!isAdmin || !editingTopic || renameTopicSaving) return;

    const nextTitle = editTopicTitle.trim();
    const nextShortTitle = editTopicShortTitle.trim() || nextTitle;

    if (!nextTitle) {
      setRenameTopicError("Enter a topic name.");
      return;
    }

    setRenameTopicSaving(true);
    setRenameTopicError("");

    const { error } = await supabase.rpc("rename_core_topic", {
      p_subject: subject,
      p_topic_id: editingTopic.id,
      p_title: nextTitle,
      p_short_title: nextShortTitle,
    });

    if (error) {
      setRenameTopicError(`Could not rename topic: ${error.message}`);
      setRenameTopicSaving(false);
      return;
    }

    setTopics((current) =>
      current.map((topic) =>
        topic.id === editingTopic.id
          ? {
              ...topic,
              title: nextTitle,
              short_title: nextShortTitle,
            }
          : topic,
      ),
    );

    setRenameTopicSaving(false);
    setEditingTopic(null);
    setEditTopicTitle("");
    setEditTopicShortTitle("");
  }

  const totalPublished = useMemo(
    () =>
      topics.reduce(
        (sum, topic) => sum + topic.publishedCount,
        0,
      ),
    [topics],
  );

  const totalCompleted = useMemo(
    () =>
      topics.reduce(
        (sum, topic) => sum + topic.completedCount,
        0,
      ),
    [topics],
  );

  const totalPlanned = useMemo(
    () =>
      topics.reduce(
        (sum, topic) => sum + Number(topic.quiz_target || 0),
        0,
      ),
    [topics],
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

          {isAdmin ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="m-0 text-xs font-bold text-white/55">
                  Admin curriculum status
                </p>

                <div className="flex flex-wrap items-center gap-4 text-[11px] font-black uppercase tracking-[0.1em]">
                  <span className="text-red-300">
                    ● Red = Locked
                  </span>

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

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {topics.map((topic) => {
              const topicProgress =
                topic.publishedCount > 0
                  ? Math.round(
                      (topic.completedCount /
                        topic.publishedCount) *
                        100,
                    )
                  : 0;

              const topicStatus =
                topic.review_status || "reviewing";

              const isLocked =
                topicStatus === "locked";

              const isSatisfied =
                topicStatus === "satisfied";

              const isReviewing =
                topicStatus === "reviewing";

              const isSaving =
                savingTopicId === topic.id;

              const canOpen =
                !isLocked || isAdmin;

              const cardClasses = isLocked
                ? [
                    "border-red-400/70",
                    "bg-[linear-gradient(145deg,rgba(50,12,18,0.32),rgba(8,12,23,0.96))]",
                    "shadow-[0_20px_58px_rgba(239,68,68,0.08)]",
                    "hover:border-red-300",
                  ].join(" ")
                : isSatisfied
                  ? [
                      "border-amber-200/35",
                      "bg-[linear-gradient(145deg,rgba(120,78,12,0.38),rgba(22,14,4,0.94))]",
                      "shadow-[0_20px_58px_rgba(245,158,11,0.12)]",
                      "hover:border-amber-200/60",
                    ].join(" ")
                  : [
                      "border-cyan-200/20",
                      "bg-[linear-gradient(145deg,rgba(14,59,104,0.48),rgba(4,15,34,0.95))]",
                      "shadow-[0_20px_58px_rgba(0,0,0,0.24)]",
                      "hover:border-cyan-200/45",
                    ].join(" ");

              const cardContents = (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={[
                        "grid h-14 w-14 place-items-center rounded-2xl border text-2xl",
                        isLocked
                          ? "border-red-300/50 bg-red-400/10 text-red-100"
                          : isSatisfied
                            ? "border-amber-200/35 bg-amber-300/10 text-amber-100"
                            : "border-cyan-200/30 bg-cyan-300/10 text-cyan-100",
                      ].join(" ")}
                    >
                      {isLocked && !isAdmin
                        ? "🔒"
                        : topic.icon || theme.icon}
                    </div>

                    <span
                      className={[
                        "rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
                        isLocked
                          ? "border-red-300/40 bg-red-400/10 text-red-200"
                          : isSatisfied
                            ? "border-amber-200/25 bg-amber-300/10 text-amber-100/80"
                            : "border-cyan-200/20 bg-cyan-300/[0.07] text-cyan-100/70",
                      ].join(" ")}
                    >
                      {isLocked
                        ? "Locked"
                        : `${topic.quiz_target} planned`}
                    </span>
                  </div>

                  <h3
                    className={[
                      "mt-5 text-xl font-black tracking-[-0.025em]",
                      isLocked
                        ? "text-red-50"
                        : isSatisfied
                          ? "text-amber-50"
                          : "text-white",
                    ].join(" ")}
                  >
                    {topic.title}
                  </h3>

                  <p
                    className={[
                      "mt-2 min-h-[66px] text-sm leading-6",
                      isLocked
                        ? "text-red-50/55"
                        : isSatisfied
                          ? "text-amber-50/62"
                          : "text-white/55",
                    ].join(" ")}
                  >
                    {isLocked && !isAdmin
                      ? "This topic is currently locked."
                      : topic.description ||
                        "Focused curriculum practice for this topic."}
                  </p>

                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={
                          isLocked
                            ? "text-red-100/40"
                            : isSatisfied
                              ? "text-amber-50/45"
                              : "text-white/45"
                        }
                      >
                        {topic.publishedCount} published ·{" "}
                        {topic.completedCount} completed
                      </span>

                      <strong
                        className={
                          isLocked
                            ? "text-red-300"
                            : isSatisfied
                              ? "text-amber-200"
                              : "text-cyan-200"
                        }
                      >
                        {topicProgress}%
                      </strong>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className={[
                          "h-full rounded-full",
                          isLocked
                            ? "bg-gradient-to-r from-red-600 to-red-300"
                            : isSatisfied
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
                      isLocked
                        ? "text-red-300"
                        : isSatisfied
                          ? "text-amber-200"
                          : "text-cyan-200",
                    ].join(" ")}
                  >
                    {isLocked && !isAdmin
                      ? "🔒 Admin access only"
                      : "Open topic →"}
                  </div>
                </>
              );

              return (
                <article
                  key={topic.id}
                  className={[
                    "group overflow-hidden rounded-[1.75rem] border text-white transition duration-200",
                    canOpen
                      ? "hover:-translate-y-1"
                      : "cursor-not-allowed",
                    cardClasses,
                  ].join(" ")}
                >
                  {isAdmin ? (
                    <div
                      className={[
                        "border-b px-4 py-3",
                        isLocked
                          ? "border-red-300/20 bg-red-950/20"
                          : isSatisfied
                            ? "border-amber-200/15 bg-amber-950/25"
                            : "border-cyan-200/15 bg-slate-950/25",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="m-0 text-[9px] font-black uppercase tracking-[0.16em] text-white/35">
                            Admin status
                          </p>

                          <p
                            className={[
                              "mt-0.5 text-xs font-black",
                              isLocked
                                ? "text-red-300"
                                : isSatisfied
                                  ? "text-amber-200"
                                  : "text-cyan-200",
                            ].join(" ")}
                          >
                            {isSaving
                              ? "Saving…"
                              : isLocked
                                ? "Locked"
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
                                "locked",
                              )
                            }
                            className={[
                              "rounded-lg px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.06em] transition",
                              "disabled:cursor-wait disabled:opacity-50",
                              isLocked
                                ? "bg-red-400/20 text-red-200"
                                : "text-white/35 hover:bg-white/[0.06] hover:text-white/70",
                            ].join(" ")}
                          >
                            Red
                          </button>

                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() =>
                              void setTopicReviewStatus(
                                topic.id,
                                "reviewing",
                              )
                            }
                            className={[
                              "rounded-lg px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.06em] transition",
                              "disabled:cursor-wait disabled:opacity-50",
                              isReviewing
                                ? "bg-cyan-300/20 text-cyan-100"
                                : "text-white/35 hover:bg-white/[0.06] hover:text-white/70",
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
                                "satisfied",
                              )
                            }
                            className={[
                              "rounded-lg px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.06em] transition",
                              "disabled:cursor-wait disabled:opacity-50",
                              isSatisfied
                                ? "bg-amber-300/20 text-amber-100"
                                : "text-white/35 hover:bg-white/[0.06] hover:text-white/70",
                            ].join(" ")}
                          >
                            Gold
                          </button>

                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => openTopicRename(topic)}
                            className="rounded-lg px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.06em] text-white/60 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-wait disabled:opacity-50"
                          >
                            ✎ Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {canOpen ? (
                    <Link
                      href={`/learning-missions/core/${subject}/p${level}/${topic.slug}`}
                      className="block p-5 text-white no-underline"
                    >
                      {cardContents}
                    </Link>
                  ) : (
                    <div className="p-5">
                      {cardContents}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {editingTopic ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit topic name"
          className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeTopicRename();
          }}
        >
          <div className="w-full max-w-lg rounded-[1.75rem] border border-cyan-200/20 bg-[#08172f] p-6 text-white shadow-[0_30px_100px_rgba(0,0,0,0.55)] sm:p-7">
            <p className="m-0 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
              Admin edit
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">
              Rename Topic
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/50">
              This changes only the displayed names. The topic slug, ID,
              ordering and status stay unchanged.
            </p>

            <label className="mt-5 grid gap-2 text-xs font-black uppercase tracking-[0.08em] text-white/55">
              Topic name
              <input
                autoFocus
                value={editTopicTitle}
                disabled={renameTopicSaving}
                onChange={(event) => setEditTopicTitle(event.target.value)}
                className="min-h-12 rounded-xl border border-white/15 bg-white/[0.055] px-4 text-base font-bold normal-case tracking-normal text-white outline-none focus:border-cyan-200/45 disabled:opacity-50"
              />
            </label>

            <label className="mt-4 grid gap-2 text-xs font-black uppercase tracking-[0.08em] text-white/55">
              Short name
              <input
                value={editTopicShortTitle}
                disabled={renameTopicSaving}
                onChange={(event) => setEditTopicShortTitle(event.target.value)}
                className="min-h-12 rounded-xl border border-white/15 bg-white/[0.055] px-4 text-base font-bold normal-case tracking-normal text-white outline-none focus:border-cyan-200/45 disabled:opacity-50"
              />
            </label>

            {renameTopicError ? (
              <p className="mt-4 rounded-xl border border-red-300/30 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-200">
                {renameTopicError}
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={renameTopicSaving}
                onClick={closeTopicRename}
                className="min-h-11 rounded-xl border border-white/12 bg-white/[0.05] px-5 text-sm font-black text-white/75 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={renameTopicSaving || !editTopicTitle.trim()}
                onClick={() => void saveTopicRename()}
                className="min-h-11 rounded-xl border border-cyan-200/35 bg-gradient-to-r from-cyan-400 to-blue-500 px-5 text-sm font-black text-slate-950 disabled:opacity-40"
              >
                {renameTopicSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
