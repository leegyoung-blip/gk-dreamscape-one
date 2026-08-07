"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  NovaAnalyticsEvidenceRef,
  NovaAnalyticsFinding,
  NovaAnalyticsReport,
  NovaAnalyticsReportHistoryRow,
  NovaConfidenceLabel,
  NovaFreshnessStatus,
  NovaTrendDirection,
} from "@/lib/nova-analytics-contract";
import { supabase } from "@/lib/supabase";

export type NovaAttemptIndexRow = {
  id: string;
  source: string;
  title: string;
  createdAt: string;
};

type EvidenceState = {
  findingId: string | null;
  loading: boolean;
  rows: NovaAnalyticsEvidenceRef[];
  message: string;
};

type ReportView = NovaAnalyticsReport | NovaAnalyticsReportHistoryRow;

const confidenceText: Record<NovaConfidenceLabel, string> = {
  insufficient: "Insufficient",
  low: "Low",
  medium: "Medium",
  high: "High",
};

const freshnessText: Record<NovaFreshnessStatus, string> = {
  current: "Current",
  limited_evidence: "Limited evidence",
  stale: "Stale",
  insufficient_evidence: "Insufficient evidence",
};

const trendText: Record<NovaTrendDirection, string> = {
  improving: "Improving",
  stable: "Stable",
  declining: "Declining",
  unknown: "Not established",
};

function titleCase(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Not specified";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

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

function badgeTone(value: string | null | undefined) {
  const clean = String(value || "").toLowerCase();
  if (clean.includes("high") || clean === "current" || clean === "improving") {
    return "border-emerald-200/20 bg-emerald-300/8 text-emerald-100";
  }
  if (clean.includes("medium") || clean === "stable" || clean === "limited_evidence") {
    return "border-amber-200/20 bg-amber-300/8 text-amber-100";
  }
  if (clean.includes("low") || clean === "stale" || clean === "declining") {
    return "border-orange-200/20 bg-orange-300/8 text-orange-100";
  }
  return "border-white/10 bg-white/[0.035] text-white/55";
}

function findingGroup(finding: NovaAnalyticsFinding) {
  const type = finding.finding_type.toLowerCase();
  const priority = String(finding.priority_level || "").toLowerCase();

  if (
    type.includes("strength") ||
    type.includes("improvement") ||
    finding.trend_direction === "improving"
  ) {
    return "strength";
  }

  if (
    type.includes("gap") ||
    type.includes("decline") ||
    priority.includes("high") ||
    priority.includes("urgent")
  ) {
    return "priority";
  }

  return "other";
}

function findingTitle(finding: NovaAnalyticsFinding) {
  return (
    finding.skill_name ||
    finding.topic ||
    finding.domain ||
    titleCase(finding.finding_type)
  );
}

export default function NovaLearnerAnalyticsPanel({
  studentUserId,
  studentLabel,
  classSubject,
  primaryLevel,
  teacherPreviewUserId,
  attemptIndex,
  onOpenAttempt,
}: {
  studentUserId: string;
  studentLabel: string;
  classSubject: string | null;
  primaryLevel: number | null;
  teacherPreviewUserId: string | null;
  attemptIndex: NovaAttemptIndexRow[];
  onOpenAttempt: (source: string, attemptId: string) => void;
}) {
  const defaultScope =
    classSubject && ["english", "math", "science"].includes(classSubject)
      ? classSubject
      : "__all__";

  const [scope, setScope] = useState(defaultScope);
  const [latestReport, setLatestReport] = useState<NovaAnalyticsReport | null>(null);
  const [history, setHistory] = useState<NovaAnalyticsReportHistoryRow[]>([]);
  const [selectedReportId, setSelectedReportId] = useState("");
  const [findings, setFindings] = useState<NovaAnalyticsFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [findingsLoading, setFindingsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceState>({
    findingId: null,
    loading: false,
    rows: [],
    message: "",
  });

  useEffect(() => {
    setScope(defaultScope);
  }, [studentUserId, defaultScope]);

  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      setLoading(true);
      setMessage("");
      setLatestReport(null);
      setSelectedReportId("");
      setFindings([]);
      setEvidence({
        findingId: null,
        loading: false,
        rows: [],
        message: "",
      });

      const subjectScope = scope === "__all__" ? null : scope;

      const [latestResult, historyResult] = await Promise.all([
        supabase.rpc("get_latest_nova_report_for_student", {
          p_student_user_id: studentUserId,
          p_subject_scope: subjectScope,
          p_primary_level: subjectScope ? primaryLevel : null,
          p_teacher_user_id: teacherPreviewUserId,
        }),
        supabase.rpc("get_nova_report_history_for_student", {
          p_student_user_id: studentUserId,
          p_subject_scope: null,
          p_primary_level: null,
          p_limit: 30,
          p_teacher_user_id: teacherPreviewUserId,
        }),
      ]);

      if (cancelled) return;

      if (historyResult.error) {
        console.warn("Nova report history error:", historyResult.error.message);
        setHistory([]);
      } else {
        setHistory((historyResult.data || []) as NovaAnalyticsReportHistoryRow[]);
      }

      if (latestResult.error) {
        setMessage(
          latestResult.error.message ||
            "Nova Analytics could not be loaded for this learner.",
        );
        setLoading(false);
        return;
      }

      const rows = (latestResult.data || []) as NovaAnalyticsReport[];
      const latest = rows[0] || null;

      setLatestReport(latest);
      setSelectedReportId(latest?.report_id || "");
      setLoading(false);

      if (!latest) {
        setMessage(
          subjectScope
            ? `Nova has not published a ${titleCase(subjectScope)} report for ${studentLabel} yet.`
            : `Nova has not published a learner report for ${studentLabel} yet.`,
        );
      }
    }

    void loadReports();

    return () => {
      cancelled = true;
    };
  }, [
    studentUserId,
    studentLabel,
    scope,
    primaryLevel,
    teacherPreviewUserId,
  ]);

  useEffect(() => {
    if (!selectedReportId) {
      setFindings([]);
      return;
    }

    let cancelled = false;

    async function loadFindings() {
      setFindingsLoading(true);
      setEvidence({
        findingId: null,
        loading: false,
        rows: [],
        message: "",
      });

      const { data, error } = await supabase.rpc("get_nova_report_findings", {
        p_report_id: selectedReportId,
        p_teacher_user_id: teacherPreviewUserId,
      });

      if (cancelled) return;

      if (error) {
        setFindings([]);
        setMessage(error.message || "Nova findings could not be loaded.");
        setFindingsLoading(false);
        return;
      }

      setFindings((data || []) as NovaAnalyticsFinding[]);
      setFindingsLoading(false);
    }

    void loadFindings();

    return () => {
      cancelled = true;
    };
  }, [selectedReportId, teacherPreviewUserId]);

  const selectedHistoricalReport = useMemo(
    () => history.find((report) => report.report_id === selectedReportId) || null,
    [history, selectedReportId],
  );

  const visibleReport: ReportView | null =
    latestReport?.report_id === selectedReportId
      ? latestReport
      : selectedHistoricalReport;

  const availableScopes = useMemo(() => {
    const values = new Set<string>();
    history.forEach((report) => values.add(report.subject_scope.toLowerCase()));
    if (classSubject) values.add(classSubject.toLowerCase());
    return Array.from(values).sort();
  }, [history, classSubject]);

  const visibleHistory = useMemo(() => {
    if (scope === "__all__") return history;

    return history.filter(
      (report) =>
        report.subject_scope.toLowerCase() === scope.toLowerCase() &&
        (primaryLevel === null || report.primary_level === primaryLevel),
    );
  }, [history, scope, primaryLevel]);

  const priorityFindings = findings.filter(
    (finding) => findingGroup(finding) === "priority",
  );
  const strengthFindings = findings.filter(
    (finding) => findingGroup(finding) === "strength",
  );
  const otherFindings = findings.filter(
    (finding) => findingGroup(finding) === "other",
  );
  const trendFindings = findings.filter(
    (finding) => finding.trend_direction !== "unknown",
  );

  async function toggleEvidence(findingId: string) {
    if (evidence.findingId === findingId) {
      setEvidence({
        findingId: null,
        loading: false,
        rows: [],
        message: "",
      });
      return;
    }

    setEvidence({
      findingId,
      loading: true,
      rows: [],
      message: "",
    });

    const { data, error } = await supabase.rpc("get_nova_finding_evidence", {
      p_finding_id: findingId,
      p_teacher_user_id: teacherPreviewUserId,
    });

    if (error) {
      setEvidence({
        findingId,
        loading: false,
        rows: [],
        message:
          error.message ||
          "The evidence references for this finding could not be loaded.",
      });
      return;
    }

    const rows = (data || []) as NovaAnalyticsEvidenceRef[];

    setEvidence({
      findingId,
      loading: false,
      rows,
      message:
        rows.length === 0
          ? "Nova did not publish question-level evidence references for this finding."
          : "",
    });
  }

  return (
    <section className="grid gap-4">
      <header className="flex flex-col gap-5 rounded-[22px] border border-violet-200/15 bg-[linear-gradient(145deg,rgba(13,25,51,0.92),rgba(5,13,30,0.95))] p-5 shadow-[0_24px_58px_rgba(0,0,0,0.24)] xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="m-0 text-[10px] font-black uppercase tracking-[0.18em] text-violet-200">
            Nova Analytics · Read-only integration
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">
            Individual learner analysis
          </h2>
          <p className="mt-2 max-w-3xl text-xs leading-6 text-white/50">
            This workspace displays Nova&apos;s published output. It does not
            recalculate, reinterpret or modify Nova&apos;s internal analytics.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="grid gap-1.5">
            <span className="text-[8px] font-black uppercase tracking-[0.12em] text-white/40">
              Report scope
            </span>
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              className="min-h-11 min-w-[190px] rounded-xl border border-violet-200/20 bg-[#071329] px-3 text-xs text-white outline-none"
            >
              <option value="__all__">Latest Nova report</option>
              {availableScopes.map((value) => (
                <option key={value} value={value}>
                  {titleCase(value)}
                  {value === classSubject?.toLowerCase() ? " · Class subject" : ""}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            disabled={history.length === 0}
            onClick={() => setShowHistory((current) => !current)}
            className="min-h-11 rounded-xl border border-violet-200/20 bg-violet-300/[0.07] px-4 text-[9px] font-black uppercase tracking-[0.08em] text-white disabled:opacity-40"
          >
            Report History
          </button>
        </div>
      </header>

      {showHistory && (
        <section className="rounded-[22px] border border-violet-200/15 bg-white/[0.035] p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="m-0 text-[9px] font-black uppercase tracking-[0.14em] text-violet-200">
                Historical reports
              </p>
              <h3 className="mt-2 text-2xl font-black text-white">
                {visibleHistory.length} saved report
                {visibleHistory.length === 1 ? "" : "s"}
              </h3>
            </div>
            {latestReport && (
              <button
                type="button"
                onClick={() => setSelectedReportId(latestReport.report_id)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[9px] font-black uppercase text-white/70"
              >
                Latest
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-2">
            {visibleHistory.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-white/40">
                No historical reports are available for this scope.
              </p>
            ) : (
              visibleHistory.map((report) => (
                <button
                  type="button"
                  key={report.report_id}
                  onClick={() => {
                    setSelectedReportId(report.report_id);
                    setShowHistory(false);
                    setMessage("");
                  }}
                  className={`flex min-h-14 items-center justify-between gap-4 rounded-xl border px-4 text-left ${
                    selectedReportId === report.report_id
                      ? "border-violet-200/35 bg-violet-300/[0.08]"
                      : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <span className="grid min-w-0 gap-1">
                    <strong className="truncate text-xs text-white">
                      {formatDateTime(report.generated_at)}
                    </strong>
                    <small className="truncate text-[9px] text-white/40">
                      {titleCase(report.subject_scope)}
                      {report.primary_level
                        ? ` · Primary ${report.primary_level}`
                        : ""}
                    </small>
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase ${badgeTone(
                      report.freshness_status,
                    )}`}
                  >
                    {freshnessText[report.freshness_status]}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      )}

      {loading ? (
        <EmptyState title="Loading Nova report…" />
      ) : !visibleReport ? (
        <EmptyState
          title="No published Nova report yet"
          message={
            message ||
            "The Teacher Dashboard is ready to consume Nova output as soon as the analytics engine publishes through the Phase 2A contract."
          }
          note="This is expected while Nova's mapping, scoring and report-generation work is still in development."
        />
      ) : (
        <>
          {message && (
            <div className="rounded-xl border border-amber-200/15 bg-amber-300/[0.06] px-4 py-3 text-xs text-amber-100">
              {message}
            </div>
          )}

          <section className="rounded-[22px] border border-violet-200/15 bg-[linear-gradient(145deg,rgba(13,25,51,0.92),rgba(5,13,30,0.95))] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="m-0 text-[9px] font-black uppercase tracking-[0.14em] text-violet-200">
                  {selectedReportId === latestReport?.report_id
                    ? "Latest published report"
                    : "Historical report"}
                </p>
                <h3 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">
                  {titleCase(visibleReport.subject_scope)}
                  {visibleReport.primary_level
                    ? ` · Primary ${visibleReport.primary_level}`
                    : ""}
                </h3>
                <p className="mt-2 text-[10px] text-white/42">
                  Generated {formatDateTime(visibleReport.generated_at)}
                  {visibleReport.analytics_version
                    ? ` · Analytics ${visibleReport.analytics_version}`
                    : ""}
                  {visibleReport.taxonomy_version
                    ? ` · Taxonomy ${visibleReport.taxonomy_version}`
                    : ""}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-3 py-1.5 text-[8px] font-black uppercase ${badgeTone(
                    visibleReport.freshness_status,
                  )}`}
                >
                  {freshnessText[visibleReport.freshness_status]}
                </span>
                <span
                  className={`rounded-full border px-3 py-1.5 text-[8px] font-black uppercase ${badgeTone(
                    visibleReport.overall_confidence_label,
                  )}`}
                >
                  {visibleReport.overall_confidence_label
                    ? confidenceText[visibleReport.overall_confidence_label]
                    : "Not established"}{" "}
                  confidence
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Quizzes analysed"
                value={String(visibleReport.evidence_quiz_count)}
              />
              <Metric
                label="Questions analysed"
                value={String(visibleReport.evidence_question_count)}
              />
              <Metric
                label="Evidence through"
                value={formatDate(visibleReport.evidence_through)}
              />
              <Metric label="Contract" value={visibleReport.contract_version} />
            </div>

            {visibleReport.report_summary && (
              <div className="mt-4 rounded-xl border border-violet-200/12 bg-violet-300/[0.045] p-4">
                <span className="text-[8px] font-black uppercase tracking-[0.11em] text-violet-200">
                  Nova summary
                </span>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  {visibleReport.report_summary}
                </p>
              </div>
            )}
          </section>

          {findingsLoading ? (
            <EmptyState title="Loading Nova findings…" />
          ) : findings.length === 0 ? (
            <EmptyState
              title="No structured findings published"
              message="Nova may publish the report shell before structured strengths, gaps and evidence are ready. They will appear here automatically when published."
            />
          ) : (
            <>
              <FindingSection
                eyebrow="What needs attention"
                title="Priority areas"
                findings={priorityFindings}
                evidence={evidence}
                attemptIndex={attemptIndex}
                onToggleEvidence={toggleEvidence}
                onOpenAttempt={onOpenAttempt}
                emptyText="Nova did not publish any current priority findings in this report."
              />

              <FindingSection
                eyebrow="What is secure or improving"
                title="Strengths"
                findings={strengthFindings}
                evidence={evidence}
                attemptIndex={attemptIndex}
                onToggleEvidence={toggleEvidence}
                onOpenAttempt={onOpenAttempt}
                emptyText="Nova did not publish any strength findings in this report."
              />

              {trendFindings.length > 0 && (
                <section className="rounded-[22px] border border-cyan-200/12 bg-white/[0.03] p-5">
                  <SectionHeading
                    eyebrow="Movement over time"
                    title="Recent changes"
                    count={trendFindings.length}
                  />
                  <div className="mt-4 grid gap-2">
                    {trendFindings.map((finding) => (
                      <div
                        key={finding.finding_id}
                        className="grid min-h-16 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_120px]"
                      >
                        <span className="grid min-w-0 gap-1">
                          <strong className="truncate text-xs text-white">
                            {findingTitle(finding)}
                          </strong>
                          <small className="truncate text-[9px] text-white/40">
                            {finding.topic ||
                              finding.domain ||
                              titleCase(finding.finding_type)}
                          </small>
                        </span>
                        <span
                          className={`w-fit rounded-full border px-2.5 py-1 text-[8px] font-black uppercase ${badgeTone(
                            finding.trend_direction,
                          )}`}
                        >
                          {trendText[finding.trend_direction]}
                        </span>
                        <strong className="text-xs text-white/70">
                          {finding.previous_accuracy_pct !== null
                            ? `${Math.round(finding.previous_accuracy_pct)}%`
                            : "—"}{" "}
                          <span className="px-1 text-cyan-200">→</span>{" "}
                          {finding.current_accuracy_pct !== null
                            ? `${Math.round(finding.current_accuracy_pct)}%`
                            : "—"}
                        </strong>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {otherFindings.length > 0 && (
                <FindingSection
                  eyebrow="Additional Nova findings"
                  title="Monitor & developing areas"
                  findings={otherFindings}
                  evidence={evidence}
                  attemptIndex={attemptIndex}
                  onToggleEvidence={toggleEvidence}
                  onOpenAttempt={onOpenAttempt}
                  emptyText=""
                />
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

function EmptyState({
  title,
  message,
  note,
}: {
  title: string;
  message?: string;
  note?: string;
}) {
  return (
    <div className="grid min-h-40 place-items-center content-center gap-2 rounded-[22px] border border-violet-200/15 bg-[linear-gradient(145deg,rgba(16,18,45,0.86),rgba(5,12,28,0.92))] p-7 text-center">
      <strong className="text-white">{title}</strong>
      {message && (
        <p className="m-0 max-w-3xl text-xs leading-6 text-white/48">{message}</p>
      )}
      {note && (
        <small className="max-w-3xl text-[10px] leading-5 text-white/34">
          {note}
        </small>
      )}
    </div>
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
    <div className="grid min-w-0 gap-1 rounded-xl border border-white/10 bg-white/[0.025] p-3">
      <span className="text-[8px] font-black uppercase tracking-[0.1em] text-white/35">
        {label}
      </span>
      <strong className="truncate text-xs text-white/80">{value}</strong>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  count,
}: {
  eyebrow: string;
  title: string;
  count: number;
}) {
  return (
    <header className="flex items-end justify-between gap-4">
      <div>
        <p className="m-0 text-[9px] font-black uppercase tracking-[0.14em] text-violet-200">
          {eyebrow}
        </p>
        <h3 className="mt-2 text-2xl font-black tracking-[-0.035em] text-white">
          {title}
        </h3>
      </div>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-300/[0.08] text-sm font-black text-violet-200">
        {count}
      </span>
    </header>
  );
}

function FindingSection({
  eyebrow,
  title,
  findings,
  evidence,
  attemptIndex,
  onToggleEvidence,
  onOpenAttempt,
  emptyText,
}: {
  eyebrow: string;
  title: string;
  findings: NovaAnalyticsFinding[];
  evidence: EvidenceState;
  attemptIndex: NovaAttemptIndexRow[];
  onToggleEvidence: (findingId: string) => void | Promise<void>;
  onOpenAttempt: (source: string, attemptId: string) => void;
  emptyText: string;
}) {
  return (
    <section className="rounded-[22px] border border-cyan-200/12 bg-white/[0.03] p-5">
      <SectionHeading eyebrow={eyebrow} title={title} count={findings.length} />

      {findings.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-white/40">
          {emptyText}
        </p>
      ) : (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {findings.map((finding) => (
            <FindingCard
              key={finding.finding_id}
              finding={finding}
              evidence={evidence}
              attemptIndex={attemptIndex}
              onToggleEvidence={() => void onToggleEvidence(finding.finding_id)}
              onOpenAttempt={onOpenAttempt}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function FindingCard({
  finding,
  evidence,
  attemptIndex,
  onToggleEvidence,
  onOpenAttempt,
}: {
  finding: NovaAnalyticsFinding;
  evidence: EvidenceState;
  attemptIndex: NovaAttemptIndexRow[];
  onToggleEvidence: () => void;
  onOpenAttempt: (source: string, attemptId: string) => void;
}) {
  const evidenceOpen = evidence.findingId === finding.finding_id;

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <span className="text-[8px] font-black uppercase tracking-[0.11em] text-white/38">
            {titleCase(finding.finding_type)}
          </span>
          <h4 className="mt-1.5 text-lg font-black text-white">
            {findingTitle(finding)}
          </h4>
          <p className="mt-1 text-[9px] text-white/38">
            {[finding.domain, finding.topic]
              .filter(Boolean)
              .filter((value, index, array) => array.indexOf(value) === index)
              .join(" · ") || "Nova finding"}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {finding.priority_level && (
            <span className="rounded-full border border-white/10 px-2 py-1 text-[7px] font-black uppercase text-white/55">
              {titleCase(finding.priority_level)}
            </span>
          )}
          {finding.confidence_label && (
            <span
              className={`rounded-full border px-2 py-1 text-[7px] font-black uppercase ${badgeTone(
                finding.confidence_label,
              )}`}
            >
              {confidenceText[finding.confidence_label]} confidence
            </span>
          )}
        </div>
      </header>

      {finding.finding_summary && (
        <p className="mt-3 text-xs leading-5 text-white/68">
          {finding.finding_summary}
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric
          label="Evidence"
          value={`${finding.evidence_question_count} questions`}
        />
        <Metric
          label="Correct"
          value={
            finding.evidence_question_count > 0
              ? `${finding.evidence_correct_count}/${finding.evidence_question_count}`
              : "—"
          }
        />
        <Metric label="Trend" value={trendText[finding.trend_direction]} />
        <Metric
          label="Current"
          value={
            finding.current_accuracy_pct !== null
              ? `${Math.round(finding.current_accuracy_pct)}%`
              : "—"
          }
        />
      </div>

      {finding.recommendation && (
        <div className="mt-3 rounded-xl border border-violet-200/10 bg-violet-300/[0.04] p-3">
          <span className="text-[8px] font-black uppercase tracking-[0.1em] text-violet-200">
            Nova recommendation
          </span>
          <p className="mt-1.5 text-[11px] leading-5 text-white/66">
            {finding.recommendation}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onToggleEvidence}
        className="mt-3 min-h-9 rounded-full border border-cyan-200/15 bg-cyan-300/[0.05] px-3 text-[8px] font-black uppercase tracking-[0.08em] text-cyan-100"
      >
        {evidenceOpen ? "Hide Evidence" : "Inspect Evidence"}
      </button>

      {evidenceOpen && (
        <div className="mt-3 grid gap-2">
          {evidence.loading ? (
            <p className="m-0 rounded-xl bg-white/[0.025] p-3 text-[10px] text-white/42">
              Loading evidence references…
            </p>
          ) : evidence.message ? (
            <p className="m-0 rounded-xl bg-white/[0.025] p-3 text-[10px] text-white/42">
              {evidence.message}
            </p>
          ) : (
            evidence.rows.map((row) => {
              const linkedAttempt = attemptIndex.find(
                (attempt) =>
                  attempt.id === row.attempt_id &&
                  attempt.source === row.attempt_source,
              );

              return (
                <div
                  key={row.evidence_ref_id}
                  className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/10 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="grid min-w-0 gap-1">
                    <strong className="truncate text-[10px] text-white/80">
                      {linkedAttempt?.title ||
                        `${titleCase(row.attempt_source)} attempt`}
                    </strong>
                    <small className="text-[8px] text-white/35">
                      {formatDateTime(row.observed_at)}
                      {row.question_id ? " · Question evidence" : ""}
                      {row.is_correct === false ? " · Incorrect" : ""}
                    </small>
                    {row.evidence_note && (
                      <span className="text-[9px] text-white/48">
                        {row.evidence_note}
                      </span>
                    )}
                  </span>

                  {linkedAttempt && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenAttempt(row.attempt_source, row.attempt_id)
                      }
                      className="w-fit rounded-full border border-violet-200/15 bg-violet-300/[0.06] px-3 py-2 text-[8px] font-black uppercase text-violet-100"
                    >
                      Open attempt →
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </article>
  );
}
