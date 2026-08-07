"use client";

import { useEffect, useMemo, useState } from "react";
import type { ClassAnalyticsReport } from "@/lib/class-analytics";
import type {
  ClassTeachingPlan,
  ClassTeachingPlanHistoryRow,
  ClassTeachingPlanReadiness,
} from "@/lib/class-teaching-plan";
import { supabase } from "@/lib/supabase";

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function titleCase(value: string | null | undefined) {
  return String(value || "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function skillLabel(
  value: {
    skill_name?: string | null;
    topic?: string | null;
    domain?: string | null;
  },
) {
  return (
    value.skill_name ||
    value.topic ||
    value.domain ||
    "Class priority"
  );
}

export default function ClassAnalyticsPlanningPanel({
  classId,
  className,
  onClose,
}: {
  classId: string;
  className: string;
  onClose: () => void;
}) {
  const [report, setReport] =
    useState<ClassAnalyticsReport | null>(null);

  const [readiness, setReadiness] =
    useState<ClassTeachingPlanReadiness | null>(null);

  const [planHistory, setPlanHistory] =
    useState<ClassTeachingPlanHistoryRow[]>([]);

  const [selectedPlan, setSelectedPlan] =
    useState<ClassTeachingPlan | null>(null);

  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] =
    useState(false);
  const [generatingPlan, setGeneratingPlan] =
    useState<number | null>(null);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const canGeneratePlan =
    readiness?.ready_to_generate === true;

  const reportStatus =
    report?.report.report_status || null;

  const allNeeds = useMemo(
    () => [
      ...(report?.shared_needs || []),
      ...(report?.clusters || []),
      ...(report?.individual_exceptions || []),
    ],
    [report],
  );

  useEffect(() => {
    let cancelled = false;

    async function initialise() {
      setLoading(true);
      setMessage("");
      setErrorMessage("");

      await loadLatestReport(cancelled);
      await loadPlanHistory(cancelled);

      if (!cancelled) {
        setLoading(false);
      }
    }

    void initialise();

    return () => {
      cancelled = true;
    };
  }, [classId]);

  async function loadLatestReport(cancelled = false) {
    const { data, error } = await supabase.rpc(
      "get_latest_class_analytics_report",
      {
        p_class_id: classId,
      },
    );

    if (cancelled) return;

    if (error) {
      setReport(null);
      setReadiness(null);
      setErrorMessage(
        error.message ||
          "Class Analytics could not be loaded.",
      );
      return;
    }

    const nextReport =
      (data || null) as ClassAnalyticsReport | null;

    setReport(nextReport);

    if (!nextReport) {
      setReadiness(null);
      return;
    }

    await loadReadiness(
      nextReport.report.report_id,
      cancelled,
    );
  }

  async function loadReadiness(
    reportId: string,
    cancelled = false,
  ) {
    const { data, error } = await supabase.rpc(
      "get_class_teaching_plan_readiness",
      {
        p_class_analytics_report_id: reportId,
      },
    );

    if (cancelled) return;

    if (error) {
      setReadiness(null);
      setErrorMessage(
        error.message ||
          "Teaching-plan safeguards could not be checked.",
      );
      return;
    }

    setReadiness(
      (data || null) as ClassTeachingPlanReadiness | null,
    );
  }

  async function loadPlanHistory(cancelled = false) {
    const { data, error } = await supabase.rpc(
      "get_class_teaching_plan_history",
      {
        p_class_id: classId,
        p_limit: 20,
      },
    );

    if (cancelled) return;

    if (error) {
      console.warn(
        "Class teaching plan history error:",
        error.message,
      );
      setPlanHistory([]);
      return;
    }

    setPlanHistory(
      (data || []) as ClassTeachingPlanHistoryRow[],
    );
  }

  async function generateClassAnalytics() {
    setGeneratingReport(true);
    setMessage("");
    setErrorMessage("");
    setSelectedPlan(null);

    const { data, error } = await supabase.rpc(
      "generate_class_analytics_report",
      {
        p_class_id: classId,
        p_snapshot_batch_id: null,
        p_refresh_snapshot: true,
      },
    );

    setGeneratingReport(false);

    if (error) {
      setErrorMessage(
        error.message ||
          "Class Analytics could not be generated.",
      );
      return;
    }

    const reportId = String(data || "");

    const { data: reportData, error: reportError } =
      await supabase.rpc("get_class_analytics_report", {
        p_report_id: reportId,
      });

    if (reportError) {
      setErrorMessage(
        reportError.message ||
          "The generated Class Analytics report could not be opened.",
      );
      return;
    }

    const nextReport =
      (reportData || null) as ClassAnalyticsReport | null;

    setReport(nextReport);

    if (nextReport) {
      await loadReadiness(
        nextReport.report.report_id,
      );
    }

    setMessage(
      nextReport?.report.report_status === "ready"
        ? "Fresh Class Analytics generated. Teaching-plan safeguards are now being applied."
        : "Fresh Class Analytics generated. A teaching plan will remain blocked until the report satisfies the safeguards.",
    );
  }

  async function generatePlan(horizon: 4 | 8 | 12) {
    if (!report || !canGeneratePlan) return;

    setGeneratingPlan(horizon);
    setMessage("");
    setErrorMessage("");

    const { data, error } = await supabase.rpc(
      "generate_class_teaching_plan",
      {
        p_class_analytics_report_id:
          report.report.report_id,
        p_planning_horizon_weeks: horizon,
      },
    );

    setGeneratingPlan(null);

    if (error) {
      setErrorMessage(
        error.message ||
          "The teaching-plan safeguards blocked generation.",
      );
      return;
    }

    const planId = String(data || "");

    const { data: planData, error: planError } =
      await supabase.rpc("get_class_teaching_plan", {
        p_plan_id: planId,
      });

    if (planError) {
      setErrorMessage(
        planError.message ||
          "The generated teaching plan could not be opened.",
      );
      return;
    }

    setSelectedPlan(
      (planData || null) as ClassTeachingPlan | null,
    );

    await loadPlanHistory();

    setMessage(
      `${horizon}-week recommendation generated as a DRAFT. It has not been approved or activated.`,
    );
  }

  async function openPlan(planId: string) {
    setErrorMessage("");
    setMessage("");

    const { data, error } = await supabase.rpc(
      "get_class_teaching_plan",
      {
        p_plan_id: planId,
      },
    );

    if (error) {
      setErrorMessage(
        error.message ||
          "The teaching plan could not be opened.",
      );
      return;
    }

    setSelectedPlan(
      (data || null) as ClassTeachingPlan | null,
    );
  }

  return (
    <div
      className="fixed inset-0 z-[150] overflow-y-auto bg-[#01050d]/86 px-3 py-5 backdrop-blur-xl sm:px-5"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Class Analytics and teaching plan"
        onMouseDown={(event) => event.stopPropagation()}
        className="mx-auto w-full max-w-[1450px] overflow-hidden rounded-[30px] border border-violet-200/20 bg-[#061226] text-white shadow-[0_45px_130px_rgba(0,0,0,0.66)]"
      >
        <header className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <p className="m-0 text-[10px] font-black uppercase tracking-[0.18em] text-violet-200">
              Phase 3 · Class Analytics
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
              {className}
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">
              Class Analytics uses frozen Nova learner outputs. Teaching plans
              are generated only when coverage, freshness and confidence
              safeguards pass.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-11 w-11 shrink-0 rounded-full border border-white/14 bg-white/[0.05] text-xl"
          >
            ×
          </button>
        </header>

        <div className="grid gap-5 p-5 sm:p-7">
          {loading ? (
            <Panel>
              <p className="m-0 text-white/55">
                Loading Class Analytics…
              </p>
            </Panel>
          ) : (
            <>
              {message && (
                <div className="rounded-2xl border border-emerald-200/20 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-100">
                  {message}
                </div>
              )}

              {errorMessage && (
                <div className="rounded-2xl border border-red-200/20 bg-red-400/10 px-5 py-4 text-sm text-red-100">
                  {errorMessage}
                </div>
              )}

              {!report ? (
                <Panel>
                  <div className="grid min-h-[240px] place-items-center text-center">
                    <div>
                      <strong className="text-xl">
                        No Class Analytics report yet
                      </strong>

                      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/48">
                        Generate a fresh Phase 2D snapshot and Phase 3A report.
                        If the real Nova dataset is still too limited, the
                        report will correctly remain provisional or
                        insufficient.
                      </p>

                      <button
                        type="button"
                        disabled={generatingReport}
                        onClick={() =>
                          void generateClassAnalytics()
                        }
                        className="mt-5 min-h-12 rounded-full border border-cyan-200/28 bg-cyan-300/10 px-6 text-xs font-black uppercase tracking-[0.12em] disabled:opacity-50"
                      >
                        {generatingReport
                          ? "Generating..."
                          : "Generate Class Analytics"}
                      </button>
                    </div>
                  </div>
                </Panel>
              ) : (
                <>
                  <Panel>
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <p className="m-0 text-[9px] font-black uppercase tracking-[0.15em] text-cyan-200">
                          Latest Phase 3A report
                        </p>

                        <h3 className="mt-2 text-2xl font-black">
                          {titleCase(report.class.subject)}
                          {report.class.primary_level
                            ? ` · Primary ${report.class.primary_level}`
                            : ""}
                        </h3>

                        <p className="mt-2 text-xs text-white/42">
                          Generated{" "}
                          {formatDateTime(
                            report.report.generated_at,
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <StatusPill
                          label={titleCase(
                            report.report.report_status,
                          )}
                          tone={
                            reportStatus === "ready"
                              ? "good"
                              : reportStatus === "provisional"
                                ? "medium"
                                : "warning"
                          }
                        />

                        <StatusPill
                          label={`${Math.round(
                            report.coverage.nova_coverage_pct,
                          )}% Nova coverage`}
                          tone={
                            report.coverage.nova_coverage_pct >= 75
                              ? "good"
                              : "warning"
                          }
                        />
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      <Metric
                        label="Class students"
                        value={String(
                          report.coverage.active_student_count,
                        )}
                      />
                      <Metric
                        label="Nova covered"
                        value={String(
                          report.coverage.nova_report_student_count,
                        )}
                      />
                      <Metric
                        label="Shared needs"
                        value={String(
                          report.summary.shared_need_count,
                        )}
                      />
                      <Metric
                        label="Clusters"
                        value={String(
                          report.summary.cluster_need_count +
                            report.summary.targeted_cluster_count,
                        )}
                      />
                      <Metric
                        label="Exceptions"
                        value={String(
                          report.summary.individual_exception_count,
                        )}
                      />
                    </div>

                    <button
                      type="button"
                      disabled={generatingReport}
                      onClick={() =>
                        void generateClassAnalytics()
                      }
                      className="mt-5 min-h-11 rounded-full border border-cyan-200/18 bg-cyan-300/[0.06] px-5 text-[10px] font-black uppercase tracking-[0.1em] disabled:opacity-50"
                    >
                      {generatingReport
                        ? "Refreshing..."
                        : "Generate Fresh Report"}
                    </button>
                  </Panel>

                  <Panel>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="m-0 text-[9px] font-black uppercase tracking-[0.15em] text-violet-200">
                          Phase 3B safeguards
                        </p>

                        <h3 className="mt-2 text-2xl font-black">
                          Teaching-plan readiness
                        </h3>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/48">
                          A strong class plan is blocked unless the underlying
                          dataset has enough learners, coverage, recent evidence
                          and Nova confidence.
                        </p>
                      </div>

                      <StatusPill
                        label={
                          canGeneratePlan
                            ? "Ready to generate"
                            : "Plan generation blocked"
                        }
                        tone={
                          canGeneratePlan
                            ? "good"
                            : "warning"
                        }
                      />
                    </div>

                    {readiness && (
                      <>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <CheckMetric
                            label="Phase 3A"
                            value={titleCase(
                              report.report.report_status,
                            )}
                            passed={
                              readiness.checks.phase3a_ready
                            }
                          />

                          <CheckMetric
                            label="Nova coverage"
                            value={`${Math.round(
                              readiness.checks.nova_coverage_pct,
                            )}%`}
                            passed={
                              readiness.checks.minimum_nova_coverage_met
                            }
                          />

                          <CheckMetric
                            label="Freshness"
                            value={`${Math.round(
                              readiness.checks.usable_freshness_pct,
                            )}% usable`}
                            passed={
                              readiness.checks.minimum_freshness_met
                            }
                          />

                          <CheckMetric
                            label="Confidence"
                            value={`${Math.round(
                              readiness.checks.medium_high_confidence_pct,
                            )}% med/high`}
                            passed={
                              readiness.checks.minimum_confidence_met
                            }
                          />
                        </div>

                        {!canGeneratePlan &&
                          readiness.blockers.length > 0 && (
                            <div className="mt-5 rounded-2xl border border-amber-200/16 bg-amber-300/[0.06] p-4">
                              <strong className="text-sm text-amber-100">
                                Why generation is blocked
                              </strong>

                              <ul className="mt-3 grid gap-2 pl-5 text-xs leading-5 text-amber-50/72">
                                {readiness.blockers.map(
                                  (blocker) => (
                                    <li key={blocker}>
                                      {blocker}
                                    </li>
                                  ),
                                )}
                              </ul>
                            </div>
                          )}
                      </>
                    )}

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      {([4, 8, 12] as const).map(
                        (horizon) => (
                          <button
                            type="button"
                            key={horizon}
                            disabled={
                              !canGeneratePlan ||
                              generatingPlan !== null
                            }
                            onClick={() =>
                              void generatePlan(horizon)
                            }
                            className="min-h-[88px] rounded-2xl border border-violet-200/16 bg-violet-300/[0.05] px-5 text-left transition hover:bg-violet-300/[0.08] disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            <span className="text-[9px] font-black uppercase tracking-[0.12em] text-violet-200">
                              Draft recommendation
                            </span>

                            <strong className="mt-2 block text-xl">
                              {generatingPlan === horizon
                                ? "Generating..."
                                : `${horizon}-Week Plan`}
                            </strong>

                            <small className="mt-2 block text-white/42">
                              Never auto-approved or activated.
                            </small>
                          </button>
                        ),
                      )}
                    </div>
                  </Panel>

                  <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                    <Panel>
                      <SectionTitle
                        eyebrow="Class Analytics"
                        title="What Phase 3A found"
                      />

                      {allNeeds.length === 0 ? (
                        <p className="mt-4 text-sm text-white/44">
                          No need aggregates are available in this
                          report.
                        </p>
                      ) : (
                        <div className="mt-4 grid gap-3">
                          {allNeeds.map((need) => (
                            <div
                              key={need.aggregate_id}
                              className="rounded-2xl border border-white/9 bg-white/[0.025] p-4"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <strong className="text-sm">
                                    {skillLabel(need)}
                                  </strong>

                                  <p className="mt-1 text-[10px] text-white/40">
                                    {titleCase(
                                      need.classification,
                                    )}
                                  </p>
                                </div>

                                <span className="text-sm font-black text-cyan-100">
                                  {need.affected_student_count}/
                                  {need.denominator_student_count}
                                </span>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2 text-[9px] text-white/48">
                                <span>
                                  {Math.round(
                                    need.affected_pct,
                                  )}
                                  % affected
                                </span>
                                <span>·</span>
                                <span>
                                  {need.total_evidence_question_count}{" "}
                                  evidence questions
                                </span>
                                {need.priority_score !== null && (
                                  <>
                                    <span>·</span>
                                    <span>
                                      Priority{" "}
                                      {Math.round(
                                        need.priority_score *
                                          100,
                                      )}
                                      /100
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Panel>

                    <Panel>
                      <SectionTitle
                        eyebrow="Plan history"
                        title="Generated drafts"
                      />

                      {planHistory.length === 0 ? (
                        <p className="mt-4 text-sm text-white/44">
                          No teaching-plan drafts have been generated for
                          this class yet.
                        </p>
                      ) : (
                        <div className="mt-4 grid gap-2">
                          {planHistory.map((item) => (
                            <button
                              type="button"
                              key={item.plan_id}
                              onClick={() =>
                                void openPlan(item.plan_id)
                              }
                              className="rounded-2xl border border-white/9 bg-white/[0.025] p-4 text-left hover:border-violet-200/20"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <strong className="text-sm">
                                  {item.planning_horizon_weeks}-Week
                                </strong>

                                <span className="text-[9px] font-black uppercase tracking-[0.08em] text-violet-200">
                                  {titleCase(item.plan_status)}
                                </span>
                              </div>

                              <p className="mt-2 text-[10px] text-white/40">
                                {formatDateTime(
                                  item.generated_at,
                                )}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </Panel>
                  </div>

                  {selectedPlan && (
                    <Panel>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="m-0 text-[9px] font-black uppercase tracking-[0.15em] text-violet-200">
                            Generated recommendation
                          </p>

                          <h3 className="mt-2 text-2xl font-black">
                            {selectedPlan.plan.title}
                          </h3>

                          <p className="mt-2 text-sm text-white/45">
                            {selectedPlan.plan.recommended_start_date} →{" "}
                            {selectedPlan.plan.recommended_end_date}
                          </p>
                        </div>

                        <StatusPill
                          label={titleCase(
                            selectedPlan.plan.plan_status,
                          )}
                          tone="medium"
                        />
                      </div>

                      <div className="mt-5 rounded-2xl border border-amber-200/16 bg-amber-300/[0.05] px-4 py-3 text-xs leading-5 text-amber-100/78">
                        This is a generated draft only. Teacher editing,
                        approval and plan feedback belong to Phase 3C. Nothing
                        here is automatically activated.
                      </div>

                      <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                        <div>
                          <SectionTitle
                            eyebrow="Recommended priorities"
                            title="Targeted support"
                          />

                          <div className="mt-4 grid gap-3">
                            {selectedPlan.priorities.map(
                              (priority) => (
                                <div
                                  key={priority.priority_id}
                                  className="rounded-2xl border border-white/9 bg-white/[0.025] p-4"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <span className="text-[9px] font-black uppercase tracking-[0.1em] text-cyan-200">
                                        {titleCase(
                                          priority.recommendation_scope,
                                        )}
                                      </span>

                                      <strong className="mt-1 block text-sm">
                                        {skillLabel(priority)}
                                      </strong>
                                    </div>

                                    {priority.targeted_support_share_pct !==
                                      null && (
                                      <span className="rounded-full border border-cyan-200/14 bg-cyan-300/[0.05] px-3 py-1 text-[9px] font-black text-cyan-100">
                                        {Math.round(
                                          priority.targeted_support_share_pct,
                                        )}
                                        % of targeted-support emphasis
                                      </span>
                                    )}
                                  </div>

                                  <p className="mt-3 text-xs leading-5 text-white/62">
                                    {priority.recommendation_text}
                                  </p>

                                  <p className="mt-2 text-[10px] leading-4 text-white/38">
                                    {priority.rationale_text}
                                  </p>
                                </div>
                              ),
                            )}
                          </div>
                        </div>

                        <div>
                          <SectionTitle
                            eyebrow="Planning sequence"
                            title={`${selectedPlan.plan.planning_horizon_weeks}-week phases`}
                          />

                          <div className="mt-4 grid gap-3">
                            {selectedPlan.phases.map(
                              (phase) => (
                                <div
                                  key={phase.phase_id}
                                  className="rounded-2xl border border-violet-200/12 bg-violet-300/[0.04] p-4"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <strong className="text-sm">
                                      {phase.phase_title}
                                    </strong>

                                    <span className="text-[9px] font-black uppercase text-violet-200">
                                      Week {phase.week_start}
                                      {phase.week_end !==
                                      phase.week_start
                                        ? `–${phase.week_end}`
                                        : ""}
                                    </span>
                                  </div>

                                  <p className="mt-2 text-xs leading-5 text-white/52">
                                    {phase.phase_goal}
                                  </p>

                                  {phase.reassessment_checkpoint && (
                                    <p className="mt-3 text-[9px] font-black uppercase tracking-[0.08em] text-emerald-200">
                                      Fresh-evidence checkpoint
                                    </p>
                                  )}
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    </Panel>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function Panel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.025] p-5 shadow-[0_18px_42px_rgba(0,0,0,0.18)] sm:p-6">
      {children}
    </section>
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
    <div className="rounded-2xl border border-white/9 bg-black/10 p-4">
      <span className="text-[8px] font-black uppercase tracking-[0.1em] text-white/34">
        {label}
      </span>
      <strong className="mt-2 block text-xl">
        {value}
      </strong>
    </div>
  );
}

function CheckMetric({
  label,
  value,
  passed,
}: {
  label: string;
  value: string;
  passed: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        passed
          ? "border-emerald-200/15 bg-emerald-300/[0.04]"
          : "border-amber-200/15 bg-amber-300/[0.04]"
      }`}
    >
      <span className="text-[8px] font-black uppercase tracking-[0.1em] text-white/35">
        {label}
      </span>
      <strong className="mt-2 block text-base">
        {value}
      </strong>
      <small
        className={`mt-1 block text-[9px] ${
          passed
            ? "text-emerald-200"
            : "text-amber-200"
        }`}
      >
        {passed ? "Passed" : "Blocked"}
      </small>
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "good" | "medium" | "warning";
}) {
  const classes =
    tone === "good"
      ? "border-emerald-200/20 bg-emerald-300/[0.07] text-emerald-100"
      : tone === "medium"
        ? "border-violet-200/20 bg-violet-300/[0.07] text-violet-100"
        : "border-amber-200/20 bg-amber-300/[0.07] text-amber-100";

  return (
    <span
      className={`w-fit rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-[0.08em] ${classes}`}
    >
      {label}
    </span>
  );
}

function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <p className="m-0 text-[9px] font-black uppercase tracking-[0.15em] text-violet-200">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-xl font-black">
        {title}
      </h3>
    </div>
  );
}
