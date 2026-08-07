"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type FocusPlanRow = {
  plan_id: string;
  organisation_id: string;
  class_id: string;
  student_user_id: string;
  created_by: string;
  title: string;
  planning_horizon_weeks: number;
  start_date: string;
  end_date: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type FocusItemRow = {
  focus_item_id: string;
  plan_id: string;
  source_type: "nova" | "teacher";
  nova_report_id: string | null;
  nova_finding_id: string | null;
  subject: string | null;
  domain: string | null;
  topic: string | null;
  skill_code: string | null;
  skill_name: string | null;
  focus_label: string;
  priority_level: "low" | "medium" | "high";
  action_status: "active" | "monitoring" | "completed" | "removed";
  teacher_note: string | null;
  nova_summary_snapshot: string | null;
  nova_recommendation_snapshot: string | null;
  baseline_accuracy_pct: number | null;
  baseline_evidence_question_count: number | null;
  baseline_trend_direction: string | null;
  outcome_accuracy_pct: number | null;
  outcome_note: string | null;
  added_by: string;
  added_at: string;
  completed_at: string | null;
  updated_at: string;
};

type ObservationRow = {
  observation_id: string;
  teacher_user_id: string;
  teacher_label: string;
  nova_report_id: string | null;
  nova_finding_id: string | null;
  observation_type: string;
  subject: string | null;
  skill_code: string | null;
  skill_name: string | null;
  note: string;
  observed_at: string;
  created_at: string;
  updated_at: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function titleCase(value: string | null | undefined) {
  const clean = String(value || "")
    .trim()
    .replaceAll("_", " ")
    .replaceAll("-", " ");

  if (!clean) return "Not specified";

  return clean.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function TeacherLearnerActionPanel({
  classId,
  studentUserId,
  studentLabel,
  classSubject,
  readOnly = false,
  refreshToken = 0,
  onChanged,
}: {
  classId: string;
  studentUserId: string;
  studentLabel: string;
  classSubject: string | null;
  readOnly?: boolean;
  refreshToken?: number;
  onChanged?: () => void;
}) {
  const [plan, setPlan] = useState<FocusPlanRow | null>(null);
  const [items, setItems] = useState<FocusItemRow[]>([]);
  const [observations, setObservations] = useState<ObservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [manualFocusLabel, setManualFocusLabel] = useState("");
  const [manualFocusPriority, setManualFocusPriority] = useState<
    "low" | "medium" | "high"
  >("medium");
  const [manualFocusStatus, setManualFocusStatus] = useState<
    "active" | "monitoring"
  >("active");
  const [manualFocusNote, setManualFocusNote] = useState("");

  const [observationType, setObservationType] = useState("observation");
  const [observationNote, setObservationNote] = useState("");

  const activeItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.action_status === "active" ||
          item.action_status === "monitoring",
      ),
    [items],
  );

  const completedItems = useMemo(
    () => items.filter((item) => item.action_status === "completed"),
    [items],
  );

  async function loadActionState() {
    setLoading(true);
    setErrorMessage("");

    const [planResult, observationResult] = await Promise.all([
      supabase.rpc("get_active_teacher_student_focus_plan", {
        p_class_id: classId,
        p_student_user_id: studentUserId,
      }),
      supabase.rpc("get_teacher_student_observations", {
        p_class_id: classId,
        p_student_user_id: studentUserId,
        p_limit: 30,
      }),
    ]);

    if (planResult.error) {
      setPlan(null);
      setItems([]);
      setErrorMessage(
        planResult.error.message || "Teaching focus plan could not be loaded.",
      );
    } else {
      const planRows = (planResult.data || []) as FocusPlanRow[];
      const nextPlan = planRows[0] || null;
      setPlan(nextPlan);

      if (nextPlan) {
        const itemResult = await supabase.rpc("get_teacher_student_focus_items", {
          p_plan_id: nextPlan.plan_id,
        });

        if (itemResult.error) {
          setItems([]);
          setErrorMessage(
            itemResult.error.message || "Teaching focus items could not be loaded.",
          );
        } else {
          setItems((itemResult.data || []) as FocusItemRow[]);
        }
      } else {
        setItems([]);
      }
    }

    if (observationResult.error) {
      setObservations([]);
      setErrorMessage((current) =>
        current
          ? `${current} ${observationResult.error?.message || ""}`.trim()
          : observationResult.error?.message ||
            "Teacher observations could not be loaded.",
      );
    } else {
      setObservations((observationResult.data || []) as ObservationRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadActionState();
  }, [classId, studentUserId, refreshToken]);

  async function createPlan(weeks: 4 | 8 | 12) {
    if (readOnly) return;

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("create_teacher_student_focus_plan", {
      p_class_id: classId,
      p_student_user_id: studentUserId,
      p_planning_horizon_weeks: weeks,
      p_title: "Current Teaching Focus",
      p_notes: null,
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message || "Focus plan could not be created.");
      return;
    }

    setMessage(`${weeks}-week teaching focus plan created.`);
    await loadActionState();
    onChanged?.();
  }

  async function closePlan(status: "completed" | "archived") {
    if (!plan || readOnly) return;

    const label = status === "completed" ? "complete" : "archive";
    const confirmed = window.confirm(
      `Mark this ${plan.planning_horizon_weeks}-week plan as ${label}d? Its history will be preserved.`,
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("close_teacher_student_focus_plan", {
      p_plan_id: plan.plan_id,
      p_status: status,
      p_notes: null,
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message || "Focus plan could not be closed.");
      return;
    }

    setMessage(
      status === "completed"
        ? "Teaching focus plan completed."
        : "Teaching focus plan archived.",
    );
    await loadActionState();
    onChanged?.();
  }

  async function addManualFocus() {
    if (readOnly || !plan) return;

    if (!manualFocusLabel.trim()) {
      setErrorMessage("Enter a focus area.");
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("add_teacher_defined_focus_item", {
      p_class_id: classId,
      p_student_user_id: studentUserId,
      p_focus_label: manualFocusLabel.trim(),
      p_subject: classSubject || null,
      p_priority_level: manualFocusPriority,
      p_action_status: manualFocusStatus,
      p_teacher_note: manualFocusNote.trim() || null,
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message || "Teacher focus item could not be added.");
      return;
    }

    setManualFocusLabel("");
    setManualFocusNote("");
    setManualFocusPriority("medium");
    setManualFocusStatus("active");
    setMessage("Teacher-defined focus area added.");
    await loadActionState();
    onChanged?.();
  }

  async function updateFocusItem(
    item: FocusItemRow,
    status: FocusItemRow["action_status"],
  ) {
    if (readOnly) return;

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("update_teacher_student_focus_item", {
      p_focus_item_id: item.focus_item_id,
      p_action_status: status,
      p_priority_level: item.priority_level,
      p_teacher_note: null,
      p_outcome_accuracy_pct: null,
      p_outcome_note: null,
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message || "Focus item could not be updated.");
      return;
    }

    setMessage(
      status === "completed"
        ? `${item.focus_label} marked complete.`
        : status === "removed"
          ? `${item.focus_label} removed from the active plan.`
          : `${item.focus_label} updated.`,
    );
    await loadActionState();
    onChanged?.();
  }

  async function addObservation() {
    if (readOnly) return;

    if (!observationNote.trim()) {
      setErrorMessage("Enter a teacher observation.");
      return;
    }

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("add_teacher_student_observation", {
      p_class_id: classId,
      p_student_user_id: studentUserId,
      p_observation_type: observationType,
      p_note: observationNote.trim(),
      p_subject: classSubject || null,
      p_nova_finding_id: null,
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message || "Observation could not be saved.");
      return;
    }

    setObservationNote("");
    setObservationType("observation");
    setMessage("Teacher observation saved separately from Nova Analytics.");
    await loadActionState();
    onChanged?.();
  }

  async function archiveObservation(observation: ObservationRow) {
    if (readOnly) return;

    const confirmed = window.confirm(
      "Archive this teacher observation? It will remain in the database history but disappear from the active list.",
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "archive_teacher_student_observation",
      {
        p_observation_id: observation.observation_id,
      },
    );

    setSaving(false);

    if (error) {
      setErrorMessage(error.message || "Observation could not be archived.");
      return;
    }

    setMessage("Teacher observation archived.");
    await loadActionState();
    onChanged?.();
  }

  return (
    <section className="grid gap-4 rounded-[22px] border border-emerald-200/14 bg-[linear-gradient(145deg,rgba(6,32,42,0.76),rgba(4,14,30,0.92))] p-5">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="m-0 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-200">
            Teacher Action Layer
          </p>
          <h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-white">
            Teaching Response
          </h3>
          <p className="mt-2 max-w-3xl text-[11px] leading-5 text-white/46">
            Nova remains the learner-analysis source. These records capture what
            teachers decide, observe and actively work on in class.
          </p>
        </div>

        {readOnly && (
          <span className="w-fit rounded-full border border-amber-200/20 bg-amber-300/[0.07] px-3 py-2 text-[8px] font-black uppercase tracking-[0.1em] text-amber-100">
            Admin preview · Read only
          </span>
        )}
      </header>

      {message && (
        <p className="m-0 rounded-xl border border-emerald-200/18 bg-emerald-300/[0.06] px-4 py-3 text-[10px] text-emerald-100">
          {message}
        </p>
      )}

      {errorMessage && (
        <p className="m-0 rounded-xl border border-red-200/18 bg-red-300/[0.06] px-4 py-3 text-[10px] text-red-100">
          {errorMessage}
        </p>
      )}

      {loading ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-xs text-white/42">
          Loading teaching actions…
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <span className="text-[8px] font-black uppercase tracking-[0.12em] text-white/38">
                  Individual focus plan
                </span>

                {plan ? (
                  <>
                    <h4 className="mt-2 text-xl font-black text-white">
                      {plan.title}
                    </h4>
                    <p className="mt-1 text-[10px] text-white/42">
                      {plan.planning_horizon_weeks} weeks · {formatDate(plan.start_date)}
                      {" → "}
                      {formatDate(plan.end_date)}
                    </p>
                  </>
                ) : (
                  <>
                    <h4 className="mt-2 text-xl font-black text-white">
                      No active plan
                    </h4>
                    <p className="mt-1 text-[10px] text-white/42">
                      Start a planning window before adding Nova or teacher-defined
                      priorities.
                    </p>
                  </>
                )}
              </div>

              {!readOnly && (
                <div className="flex flex-wrap gap-2">
                  {!plan ? (
                    <>
                      {[4, 8, 12].map((weeks) => (
                        <button
                          key={weeks}
                          type="button"
                          disabled={saving}
                          onClick={() => void createPlan(weeks as 4 | 8 | 12)}
                          className="min-h-10 rounded-full border border-emerald-200/20 bg-emerald-300/[0.06] px-4 text-[8px] font-black uppercase tracking-[0.08em] text-emerald-100 disabled:opacity-40"
                        >
                          Start {weeks}-Week Plan
                        </button>
                      ))}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void closePlan("completed")}
                        className="min-h-10 rounded-full border border-emerald-200/20 bg-emerald-300/[0.06] px-4 text-[8px] font-black uppercase tracking-[0.08em] text-emerald-100 disabled:opacity-40"
                      >
                        Complete Plan
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void closePlan("archived")}
                        className="min-h-10 rounded-full border border-white/12 bg-white/[0.035] px-4 text-[8px] font-black uppercase tracking-[0.08em] text-white/55 disabled:opacity-40"
                      >
                        Archive
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {plan && (
              <>
                <div className="mt-4 grid gap-2">
                  {activeItems.length === 0 ? (
                    <p className="m-0 rounded-xl border border-dashed border-white/10 p-4 text-center text-[10px] text-white/38">
                      No active priorities yet. Use a Nova finding&apos;s “Add to
                      Focus” button or add a teacher-defined area below.
                    </p>
                  ) : (
                    activeItems.map((item) => (
                      <article
                        key={item.focus_item_id}
                        className="rounded-xl border border-white/10 bg-black/10 p-3"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="rounded-full border border-white/10 px-2 py-1 text-[7px] font-black uppercase text-white/48">
                                {item.source_type === "nova" ? "Nova-linked" : "Teacher-added"}
                              </span>
                              <span className="rounded-full border border-white/10 px-2 py-1 text-[7px] font-black uppercase text-white/48">
                                {titleCase(item.priority_level)} priority
                              </span>
                              <span className="rounded-full border border-white/10 px-2 py-1 text-[7px] font-black uppercase text-white/48">
                                {titleCase(item.action_status)}
                              </span>
                            </div>

                            <strong className="mt-2 block text-sm text-white">
                              {item.focus_label}
                            </strong>

                            {item.teacher_note && (
                              <p className="mt-1 text-[10px] leading-5 text-white/48">
                                {item.teacher_note}
                              </p>
                            )}

                            {item.baseline_accuracy_pct !== null && (
                              <small className="mt-2 block text-[8px] text-white/34">
                                Baseline captured from Nova:{" "}
                                {Math.round(item.baseline_accuracy_pct)}%
                                {item.baseline_evidence_question_count !== null
                                  ? ` · ${item.baseline_evidence_question_count} questions`
                                  : ""}
                              </small>
                            )}
                          </div>

                          {!readOnly && (
                            <div className="flex shrink-0 flex-wrap gap-1.5">
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() =>
                                  void updateFocusItem(
                                    item,
                                    item.action_status === "monitoring"
                                      ? "active"
                                      : "monitoring",
                                  )
                                }
                                className="rounded-full border border-amber-200/15 bg-amber-300/[0.05] px-3 py-2 text-[7px] font-black uppercase text-amber-100 disabled:opacity-40"
                              >
                                {item.action_status === "monitoring"
                                  ? "Make Active"
                                  : "Monitor"}
                              </button>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => void updateFocusItem(item, "completed")}
                                className="rounded-full border border-emerald-200/15 bg-emerald-300/[0.05] px-3 py-2 text-[7px] font-black uppercase text-emerald-100 disabled:opacity-40"
                              >
                                Complete
                              </button>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => void updateFocusItem(item, "removed")}
                                className="rounded-full border border-red-200/15 bg-red-300/[0.04] px-3 py-2 text-[7px] font-black uppercase text-red-100 disabled:opacity-40"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>

                {completedItems.length > 0 && (
                  <details className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <summary className="cursor-pointer text-[9px] font-black uppercase tracking-[0.08em] text-white/48">
                      Completed focus items ({completedItems.length})
                    </summary>
                    <div className="mt-3 grid gap-2">
                      {completedItems.map((item) => (
                        <div
                          key={item.focus_item_id}
                          className="rounded-lg border border-white/8 bg-black/10 px-3 py-2"
                        >
                          <strong className="text-[10px] text-white/65">
                            {item.focus_label}
                          </strong>
                          <small className="ml-2 text-[8px] text-white/32">
                            {item.completed_at
                              ? formatDateTime(item.completed_at)
                              : "Completed"}
                          </small>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {!readOnly && (
                  <div className="mt-4 rounded-xl border border-cyan-200/10 bg-cyan-300/[0.025] p-3">
                    <span className="text-[8px] font-black uppercase tracking-[0.1em] text-cyan-100/70">
                      Add teacher-defined focus
                    </span>
                    <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_130px_130px]">
                      <input
                        value={manualFocusLabel}
                        onChange={(event) => setManualFocusLabel(event.target.value)}
                        placeholder="e.g. Explain reasoning more clearly"
                        className="min-h-11 rounded-xl border border-white/10 bg-[#061329] px-3 text-xs text-white outline-none placeholder:text-white/25"
                      />
                      <select
                        value={manualFocusPriority}
                        onChange={(event) =>
                          setManualFocusPriority(
                            event.target.value as "low" | "medium" | "high",
                          )
                        }
                        className="min-h-11 rounded-xl border border-white/10 bg-[#061329] px-3 text-xs text-white outline-none"
                      >
                        <option value="low">Low priority</option>
                        <option value="medium">Medium priority</option>
                        <option value="high">High priority</option>
                      </select>
                      <select
                        value={manualFocusStatus}
                        onChange={(event) =>
                          setManualFocusStatus(
                            event.target.value as "active" | "monitoring",
                          )
                        }
                        className="min-h-11 rounded-xl border border-white/10 bg-[#061329] px-3 text-xs text-white outline-none"
                      >
                        <option value="active">Active focus</option>
                        <option value="monitoring">Monitor</option>
                      </select>
                    </div>
                    <textarea
                      value={manualFocusNote}
                      onChange={(event) => setManualFocusNote(event.target.value)}
                      placeholder="Optional teacher note"
                      rows={2}
                      className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-[#061329] px-3 py-3 text-xs text-white outline-none placeholder:text-white/25"
                    />
                    <button
                      type="button"
                      disabled={saving || !manualFocusLabel.trim()}
                      onClick={() => void addManualFocus()}
                      className="mt-2 min-h-10 rounded-full border border-cyan-200/18 bg-cyan-300/[0.05] px-4 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100 disabled:opacity-40"
                    >
                      Add Focus Area
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <span className="text-[8px] font-black uppercase tracking-[0.12em] text-white/38">
                  Classroom evidence
                </span>
                <h4 className="mt-2 text-xl font-black text-white">
                  Teacher Observations
                </h4>
              </div>
              <strong className="text-2xl text-emerald-200">
                {observations.length}
              </strong>
            </div>

            {!readOnly && (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/10 p-3">
                <div className="grid gap-2 md:grid-cols-[170px_minmax(0,1fr)]">
                  <select
                    value={observationType}
                    onChange={(event) => setObservationType(event.target.value)}
                    className="min-h-11 rounded-xl border border-white/10 bg-[#061329] px-3 text-xs text-white outline-none"
                  >
                    <option value="observation">Observation</option>
                    <option value="strength">Strength</option>
                    <option value="concern">Concern</option>
                    <option value="support_needed">Needs support</option>
                    <option value="progress">Progress</option>
                    <option value="other">Other</option>
                  </select>
                  <textarea
                    value={observationNote}
                    onChange={(event) => setObservationNote(event.target.value)}
                    rows={2}
                    placeholder={`Record a classroom observation about ${studentLabel}`}
                    className="resize-y rounded-xl border border-white/10 bg-[#061329] px-3 py-3 text-xs text-white outline-none placeholder:text-white/25"
                  />
                </div>
                <button
                  type="button"
                  disabled={saving || !observationNote.trim()}
                  onClick={() => void addObservation()}
                  className="mt-2 min-h-10 rounded-full border border-emerald-200/18 bg-emerald-300/[0.05] px-4 text-[8px] font-black uppercase tracking-[0.08em] text-emerald-100 disabled:opacity-40"
                >
                  Save Observation
                </button>
              </div>
            )}

            <div className="mt-4 grid gap-2">
              {observations.length === 0 ? (
                <p className="m-0 rounded-xl border border-dashed border-white/10 p-4 text-center text-[10px] text-white/38">
                  No teacher observations recorded for this learner yet.
                </p>
              ) : (
                observations.map((observation) => (
                  <article
                    key={observation.observation_id}
                    className="rounded-xl border border-white/10 bg-black/10 p-3"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full border border-white/10 px-2 py-1 text-[7px] font-black uppercase text-white/48">
                            {titleCase(observation.observation_type)}
                          </span>
                          {observation.nova_finding_id && (
                            <span className="rounded-full border border-violet-200/12 bg-violet-300/[0.04] px-2 py-1 text-[7px] font-black uppercase text-violet-100">
                              Linked to Nova finding
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-[11px] leading-5 text-white/68">
                          {observation.note}
                        </p>

                        <small className="mt-2 block text-[8px] text-white/32">
                          {observation.teacher_label} ·{" "}
                          {formatDateTime(observation.observed_at)}
                          {observation.skill_name
                            ? ` · ${observation.skill_name}`
                            : ""}
                        </small>
                      </div>

                      {!readOnly && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void archiveObservation(observation)}
                          className="w-fit shrink-0 rounded-full border border-white/10 px-3 py-2 text-[7px] font-black uppercase text-white/38 disabled:opacity-40"
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
