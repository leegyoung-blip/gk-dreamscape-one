"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import SciencePageShell from "@/components/science-missions/SciencePageShell";
import {
  SCIENCE_MISSION_META,
  SCIENCE_STATUS_META,
  canEditScience,
} from "@/lib/science/helpers";
import { supabase } from "@/lib/supabase";
import type {
  ScienceMissionType,
  ScienceQuizRow,
  ScienceQuizStatus,
  ScienceTopicRow,
} from "@/lib/science/types";
import ScienceCsvImportPanel from "./ScienceCsvImportPanel";

type BuilderTab = "manual" | "csv";

type QuizDraft = {
  id: string | null;
  topicId: string;
  title: string;
  description: string;
  missionType: ScienceMissionType;
  sequenceNo: number;
  difficulty: number;
  questionTarget: number;
  estimatedMinutes: number;
  status: ScienceQuizStatus;
};

const PRIMARY_LEVEL = 1;
const LEVEL_SLUG = `p${PRIMARY_LEVEL}`;

const EMPTY_DRAFT: QuizDraft = {
  id: null,
  topicId: "",
  title: "",
  description: "",
  missionType: "learn",
  sequenceNo: 1,
  difficulty: 1,
  questionTarget: 5,
  estimatedMinutes: 5,
  status: "draft",
};

export default function ScienceCurriculumManagerPage() {
  const [role, setRole] = useState<string | null>(null);
  const [topics, setTopics] = useState<ScienceTopicRow[]>([]);
  const [quizzes, setQuizzes] = useState<ScienceQuizRow[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState("all");
  const [selectedStatus, setSelectedStatus] =
    useState<ScienceQuizStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<QuizDraft>(EMPTY_DRAFT);
  const [editorOpen, setEditorOpen] = useState(false);
  const [builderTab, setBuilderTab] = useState<BuilderTab>("manual");

  useEffect(() => {
    void loadManager();
  }, []);

  async function loadManager() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Log in with an Admin or Curriculum Lead account.");
      setLoading(false);
      return;
    }

    const profileResult = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const loadedRole = profileResult.data?.role ?? null;
    setRole(loadedRole);

    if (!canEditScience(loadedRole)) {
      setMessage("Only Administrators and Curriculum Leads can edit Science curriculum.");
      setLoading(false);
      return;
    }

    const levelResult = await supabase
      .from("science_levels")
      .select("id")
      .eq("slug", LEVEL_SLUG)
      .maybeSingle();

    if (levelResult.error || !levelResult.data) {
      setMessage(levelResult.error?.message || `Run the Science ${LEVEL_SLUG.toUpperCase()} migration first.`);
      setLoading(false);
      return;
    }

    const topicResult = await supabase
      .from("science_topics")
      .select("*")
      .eq("level_id", levelResult.data.id)
      .order("sort_order", { ascending: true });

    const loadedTopics = (topicResult.data ?? []) as ScienceTopicRow[];
    const topicIds = loadedTopics.map((topic) => topic.id);

    const quizResult = topicIds.length
      ? await supabase
          .from("science_quizzes")
          .select("*")
          .in("topic_id", topicIds)
          .order("sequence_no", { ascending: true })
      : { data: [], error: null };

    if (topicResult.error || quizResult.error) {
      setMessage(
        topicResult.error?.message ||
          quizResult.error?.message ||
          "Could not load Science curriculum.",
      );
    }

    setTopics(loadedTopics);
    setQuizzes((quizResult.data ?? []) as ScienceQuizRow[]);
    setDraft((current) => ({
      ...current,
      topicId: current.topicId || loadedTopics[0]?.id || "",
    }));
    setLoading(false);
  }

  const visibleQuizzes = useMemo(() => {
    return quizzes.filter((quiz) => {
      if (selectedTopicId !== "all" && quiz.topic_id !== selectedTopicId) {
        return false;
      }
      if (selectedStatus !== "all" && quiz.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [quizzes, selectedStatus, selectedTopicId]);

  const counts = useMemo(
    () => ({
      total: quizzes.length,
      draft: quizzes.filter((quiz) => quiz.status === "draft").length,
      review: quizzes.filter((quiz) => quiz.status === "in_review").length,
      published: quizzes.filter((quiz) => quiz.status === "published").length,
    }),
    [quizzes],
  );

  function startNewQuiz() {
    const topicId =
      selectedTopicId !== "all" ? selectedTopicId : topics[0]?.id || "";
    const nextSequence =
      Math.max(
        0,
        ...quizzes
          .filter((quiz) => quiz.topic_id === topicId)
          .map((quiz) => quiz.sequence_no),
      ) + 1;

    setDraft({
      ...EMPTY_DRAFT,
      topicId,
      sequenceNo: nextSequence,
    });
    setEditorOpen(true);
    setMessage("");
  }

  function editQuiz(quiz: ScienceQuizRow) {
    setDraft({
      id: quiz.id,
      topicId: quiz.topic_id,
      title: quiz.title,
      description: quiz.description || "",
      missionType: quiz.mission_type,
      sequenceNo: quiz.sequence_no,
      difficulty: quiz.difficulty,
      questionTarget: quiz.question_target,
      estimatedMinutes: quiz.estimated_minutes,
      status: quiz.status,
    });
    setEditorOpen(true);
    setMessage("");
  }

  async function saveQuiz() {
    setSaving(true);
    setMessage("");

    const { data, error } = await supabase.rpc("science_save_quiz", {
      p_quiz_id: draft.id,
      p_topic_id: draft.topicId,
      p_title: draft.title,
      p_description: draft.description,
      p_mission_type: draft.missionType,
      p_sequence_no: draft.sequenceNo,
      p_difficulty: draft.difficulty,
      p_question_target: draft.questionTarget,
      p_estimated_minutes: draft.estimatedMinutes,
      p_status: draft.status,
    });

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEditorOpen(false);
    await loadManager();
    setMessage(draft.id ? "Quiz updated." : "Quiz created. Open it to add questions.");

    if (!draft.id && data) {
      window.location.href = `/learning-missions/science/manage/quizzes/${String(data)}`;
    }
  }

  const accessAllowed = canEditScience(role);

  return (
    <SciencePageShell>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/learning-missions/science/${LEVEL_SLUG}`}
          className="inline-flex min-h-11 items-center rounded-full border border-cyan-200/25 bg-white/[0.055] px-4 text-sm font-extrabold text-white no-underline"
        >
          ← {LEVEL_SLUG.toUpperCase()} Science
        </Link>
        {accessAllowed && builderTab === "manual" && (
          <button
            type="button"
            onClick={startNewQuiz}
            className="min-h-11 rounded-full border border-emerald-200/25 bg-emerald-300/15 px-5 text-xs font-black uppercase tracking-[0.12em] text-emerald-100"
          >
            + Create Quiz
          </button>
        )}
      </header>

      <section className="mt-7 rounded-[2.2rem] border border-violet-200/18 bg-[linear-gradient(145deg,rgba(36,19,67,0.74),rgba(4,14,32,0.9))] p-6 shadow-[0_28px_84px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-8">
        <p className="m-0 text-xs font-black uppercase tracking-[0.2em] text-violet-200">
          Admin & Curriculum Lead
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
          P{PRIMARY_LEVEL} Science Builder
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-white/58">
          Build Science quizzes manually or import them in bulk. Bulk Science
          authoring now accepts only the same exact 28-column CSV used by English
          and Mathematics.
        </p>
      </section>

      {loading ? (
        <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/55">
          Loading curriculum…
        </div>
      ) : !accessAllowed ? (
        <div className="mt-7 rounded-3xl border border-rose-200/25 bg-rose-300/10 p-6 text-rose-100">
          {message || "You do not have curriculum editing access."}
        </div>
      ) : (
        <>
          {message && (
            <div className="mt-6 rounded-2xl border border-cyan-200/20 bg-cyan-300/10 px-5 py-4 text-sm text-cyan-100">
              {message}
            </div>
          )}

          <nav className="mt-6 flex flex-wrap gap-2 rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-2">
            <TabButton
              active={builderTab === "manual"}
              onClick={() => setBuilderTab("manual")}
            >
              Quiz Builder
            </TabButton>
            <TabButton
              active={builderTab === "csv"}
              onClick={() => setBuilderTab("csv")}
            >
              28-column CSV Import
            </TabButton>
          </nav>

          {builderTab === "csv" ? (
            <div className="mt-6">
              <ScienceCsvImportPanel
                primaryLevel={PRIMARY_LEVEL}
                role={role}
                onImported={loadManager}
              />
            </div>
          ) : (
            <>
              <section className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="All quizzes" value={counts.total} />
                <Metric label="Draft" value={counts.draft} />
                <Metric label="In review" value={counts.review} />
                <Metric label="Published" value={counts.published} />
              </section>

              <section className="mt-6 rounded-[1.8rem] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-white/45">
                    Topic
                    <select
                      value={selectedTopicId}
                      onChange={(event) => setSelectedTopicId(event.target.value)}
                      className="min-h-12 rounded-2xl border border-white/12 bg-[#07162c] px-4 text-sm font-bold normal-case tracking-normal text-white outline-none"
                    >
                      <option value="all">All P{PRIMARY_LEVEL} topics</option>
                      {topics.map((topic) => (
                        <option key={topic.id} value={topic.id}>
                          {topic.title}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-white/45">
                    Status
                    <select
                      value={selectedStatus}
                      onChange={(event) =>
                        setSelectedStatus(
                          event.target.value as ScienceQuizStatus | "all",
                        )
                      }
                      className="min-h-12 rounded-2xl border border-white/12 bg-[#07162c] px-4 text-sm font-bold normal-case tracking-normal text-white outline-none"
                    >
                      <option value="all">All statuses</option>
                      {(Object.keys(SCIENCE_STATUS_META) as ScienceQuizStatus[]).map(
                        (status) => (
                          <option key={status} value={status}>
                            {SCIENCE_STATUS_META[status].label}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                </div>
              </section>

              <section className="mt-6 grid gap-3">
                {visibleQuizzes.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/12 bg-white/[0.03] p-8 text-center">
                    <p className="m-0 text-white/48">No quizzes match these filters.</p>
                    <button
                      type="button"
                      onClick={startNewQuiz}
                      className="mt-5 min-h-11 rounded-full border border-emerald-200/25 bg-emerald-300/12 px-5 text-sm font-extrabold text-emerald-100"
                    >
                      Create the first quiz
                    </button>
                  </div>
                ) : (
                  visibleQuizzes.map((quiz) => {
                    const topic = topics.find((item) => item.id === quiz.topic_id);
                    const mission = SCIENCE_MISSION_META[quiz.mission_type];
                    const status = SCIENCE_STATUS_META[quiz.status];

                    return (
                      <article
                        key={quiz.id}
                        className="flex flex-col gap-4 rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-cyan-200/18 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-100">
                              {mission?.label || quiz.mission_type}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-white/50">
                              {status?.label || quiz.status}
                            </span>
                            <span className="text-xs font-bold text-white/38">
                              #{quiz.sequence_no}
                            </span>
                          </div>

                          <h2 className="mt-3 truncate text-xl font-black">{quiz.title}</h2>
                          <p className="mt-1 text-sm text-white/48">
                            {topic?.title || `P${PRIMARY_LEVEL} Topic`} · {quiz.question_target} questions · {quiz.estimated_minutes} min · Difficulty {quiz.difficulty}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => editQuiz(quiz)}
                            className="min-h-11 rounded-xl border border-white/12 bg-white/[0.05] px-4 text-sm font-bold text-white"
                          >
                            Edit details
                          </button>
                          <Link
                            href={`/learning-missions/science/manage/quizzes/${quiz.id}`}
                            className="inline-flex min-h-11 items-center rounded-xl border border-violet-200/24 bg-violet-300/12 px-4 text-sm font-extrabold text-violet-100 no-underline"
                          >
                            Edit questions →
                          </Link>
                        </div>
                      </article>
                    );
                  })
                )}
              </section>
            </>
          )}
        </>
      )}

      {editorOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md">
          <section className="w-full max-w-3xl rounded-[2rem] border border-violet-200/24 bg-[#071326] p-5 shadow-[0_36px_100px_rgba(0,0,0,0.6)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="m-0 text-xs font-black uppercase tracking-[0.16em] text-violet-200">
                  Quiz details
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  {draft.id ? "Edit quiz" : "Create quiz"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/12 bg-white/[0.05] text-xl text-white"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Topic">
                <select
                  value={draft.topicId}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      topicId: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.title}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Mission type">
                <select
                  value={draft.missionType}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      missionType: event.target.value as ScienceMissionType,
                    }))
                  }
                  className={inputClass}
                >
                  {(Object.keys(SCIENCE_MISSION_META) as ScienceMissionType[]).map(
                    (type) => (
                      <option key={type} value={type}>
                        {SCIENCE_MISSION_META[type].label}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Quiz title" wide>
                <input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Description" wide>
                <textarea
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={4}
                  className={`${inputClass} min-h-28 py-3`}
                />
              </Field>

              <NumberField
                label="Sequence"
                value={draft.sequenceNo}
                min={1}
                onChange={(value) =>
                  setDraft((current) => ({ ...current, sequenceNo: value }))
                }
              />
              <NumberField
                label="Difficulty"
                value={draft.difficulty}
                min={1}
                max={5}
                onChange={(value) =>
                  setDraft((current) => ({ ...current, difficulty: value }))
                }
              />
              <NumberField
                label="Question target"
                value={draft.questionTarget}
                min={1}
                max={30}
                onChange={(value) =>
                  setDraft((current) => ({ ...current, questionTarget: value }))
                }
              />
              <NumberField
                label="Estimated minutes"
                value={draft.estimatedMinutes}
                min={1}
                max={120}
                onChange={(value) =>
                  setDraft((current) => ({ ...current, estimatedMinutes: value }))
                }
              />

              <Field label="Status" wide>
                <select
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      status: event.target.value as ScienceQuizStatus,
                    }))
                  }
                  className={inputClass}
                >
                  {(Object.keys(SCIENCE_STATUS_META) as ScienceQuizStatus[]).map(
                    (status) => (
                      <option key={status} value={status}>
                        {SCIENCE_STATUS_META[status].label}
                      </option>
                    ),
                  )}
                </select>
              </Field>
            </div>

            <div className="mt-7 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                disabled={saving}
                className="min-h-11 rounded-full border border-white/12 bg-white/[0.05] px-5 text-sm font-bold text-white/70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveQuiz()}
                disabled={saving || !draft.topicId || !draft.title.trim()}
                className="min-h-11 rounded-full border border-emerald-200/25 bg-emerald-300/15 px-5 text-sm font-black text-emerald-100 disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save quiz"}
              </button>
            </div>
          </section>
        </div>
      )}
    </SciencePageShell>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 rounded-2xl px-5 text-sm font-black transition ${
        active
          ? "border border-cyan-200/25 bg-cyan-300/14 text-cyan-100"
          : "border border-transparent bg-transparent text-white/48 hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <strong className="block text-2xl font-black">{value}</strong>
      <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.13em] text-white/42">
        {label}
      </span>
    </div>
  );
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label
      className={`grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-white/45 ${
        wide ? "md:col-span-2" : ""
      }`}
    >
      {label}
      {children}
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(Number(event.target.value))}
        className={inputClass}
      />
    </Field>
  );
}

const inputClass =
  "min-h-12 w-full rounded-2xl border border-white/12 bg-[#07162c] px-4 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-cyan-200/35";
