"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import LearningProfilePanel from "@/components/dashboard/LearningProfilePanel";

type SubjectKey = "english" | "math" | "science" | "knowledge";
type PopupTab = "analytics" | "plan" | "profile";

type ClientSubjectSummary = {
  subject: SubjectKey;
  attempts: number;
  questions: number;
  accuracy: number;
  trend: number | null;
  weakestAttempt?: {
    title: string;
    correctCount: number;
    totalQuestions: number;
  } | null;
};

type ClientSkillRow = {
  subject: SubjectKey;
  skill: string;
  correct: number;
  wrong: number;
  total: number;
  accuracy: number;
};

type ReportSubject = {
  subject: SubjectKey;
  label: string;
  attempts: number;
  questions: number;
  accuracy: number;
  trend: number | null;
  status: "needs_attention" | "developing" | "secure" | "no_data";
  focus: string | null;
};

type ReportArea = {
  subject: SubjectKey;
  label: string;
  accuracy: number;
  attempts: number;
  reason: string;
};

type ReportAnalytics = {
  summary: string;
  parent_note: string;
  confidence: "low" | "medium" | "high";
  attempts_analyzed: number;
  questions_analyzed: number;
  overall_accuracy: number;
  subjects: ReportSubject[];
  weaknesses: ReportArea[];
  strengths: ReportArea[];
  recommendations: string[];
  generated_by_ai: boolean;
};

type PlanItem = {
  id: string;
  plan_date: string;
  day_index: number;
  day_name: string;
  item_type: "focus" | "revisit" | "stretch" | "assessment" | "rest";
  subject: SubjectKey | null;
  quiz_id: string | null;
  quiz_title: string;
  quiz_href: string | null;
  reason: string;
  target_accuracy: number | null;
  bonus_dt: number;
  status: "pending" | "completed" | "missed" | "cancelled";
  completed_at: string | null;
};

type WeeklyReportResponse = {
  week_start: string;
  week_end: string;
  next_refresh_at: string;
  preferences: {
    plan_enabled: boolean;
    monday_email_enabled: boolean;
  };
  analytics: ReportAnalytics;
  plan: PlanItem[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  viewerUserId: string | null;
  studentUserId: string | null;
  studentLabel: string;
  clientSummary: string;
  clientOverall: {
    attempts: number;
    questions: number;
    accuracy: number;
  };
  clientSubjects: ClientSubjectSummary[];
  clientSkills: ClientSkillRow[];
  clientAnalyticsLoading: boolean;
  clientAnalyticsMessage: string;
  clientAnswerCount: number;
};

const SUBJECT_META: Record<
  SubjectKey,
  { label: string; icon: string; accent: string }
> = {
  english: { label: "English", icon: "✎", accent: "#ff9df0" },
  math: { label: "Mathematics", icon: "∑", accent: "#53d7ff" },
  science: { label: "Science", icon: "⚗", accent: "#a6ff7a" },
  knowledge: { label: "Knowledge Arena", icon: "◎", accent: "#ffd76a" },
};

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00+08:00`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(status: ReportSubject["status"]) {
  switch (status) {
    case "needs_attention":
      return "Needs attention";
    case "developing":
      return "Developing";
    case "secure":
      return "Secure";
    default:
      return "No recent data";
  }
}

function itemTypeLabel(value: PlanItem["item_type"]) {
  switch (value) {
    case "focus":
      return "Focus practice";
    case "revisit":
      return "Revisit";
    case "stretch":
      return "Stretch task";
    case "assessment":
      return "Assessment";
    default:
      return "Rest or catch up";
  }
}

function normaliseRole(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export default function NovaVirtualTeacherPopup({
  open,
  onClose,
  viewerUserId,
  studentUserId,
  studentLabel,
  clientSummary,
  clientOverall,
  clientSubjects,
  clientSkills,
  clientAnalyticsLoading,
  clientAnalyticsMessage,
  clientAnswerCount,
}: Props) {
  const [tab, setTab] = useState<PopupTab>("analytics");
  const [report, setReport] = useState<WeeklyReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);
  const [message, setMessage] = useState("");
  const [localPlanEnabled, setLocalPlanEnabled] = useState(false);
  const [localEmailEnabled, setLocalEmailEnabled] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [viewerRoleLoading, setViewerRoleLoading] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open || !viewerUserId) {
      setViewerRole(null);
      setViewerRoleLoading(false);
      return;
    }

    let cancelled = false;

    async function loadViewerRole() {
      setViewerRoleLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", viewerUserId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.warn(
          "Nova Learning Profile role check failed:",
          error.message,
        );
        setViewerRole(null);
      } else {
        setViewerRole(data?.role ? String(data.role) : null);
      }

      setViewerRoleLoading(false);
    }

    void loadViewerRole();

    return () => {
      cancelled = true;
    };
  }, [open, viewerUserId]);

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !studentUserId || !viewerUserId) return;
    void loadReport(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, studentUserId, viewerUserId]);

  useEffect(() => {
    if (!report) return;

    setLocalPlanEnabled(Boolean(report.preferences.plan_enabled));
    setLocalEmailEnabled(Boolean(report.preferences.monday_email_enabled));
  }, [report]);

  const learningProfileUnlocked =
    normaliseRole(viewerRole) === "admin";

  useEffect(() => {
    if (
      tab === "profile" &&
      !viewerRoleLoading &&
      !learningProfileUnlocked
    ) {
      setTab("analytics");
    }
  }, [tab, viewerRoleLoading, learningProfileUnlocked]);

  async function loadReport(force: boolean) {
    if (!studentUserId) return;

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.functions.invoke(
      "nova-weekly-report",
      {
        body: {
          student_user_id: studentUserId,
          force,
        },
      },
    );

    if (error) {
      console.warn("Nova weekly report error:", error.message);
      setMessage(
        "Nova could not load the stored weekly plan. The live dashboard analytics below are still available.",
      );
      setLoading(false);
      return;
    }

    setReport(data as WeeklyReportResponse);
    setLoading(false);
  }

  async function updatePreferences(
    nextPlanEnabled: boolean,
    nextEmailEnabled: boolean,
  ) {
    if (!studentUserId) return;

    setSavingPreference(true);
    setMessage("");

    const { error } = await supabase.rpc(
      "set_nova_virtual_teacher_preferences",
      {
        p_student_user_id: studentUserId,
        p_plan_enabled: nextPlanEnabled,
        p_monday_email_enabled: nextEmailEnabled,
      },
    );

    if (error) {
      console.warn("Nova preference update error:", error.message);
      setMessage(
        "The preference could not be saved. Check that the Nova Virtual Teacher SQL migration has been run.",
      );
      setSavingPreference(false);
      return;
    }

    setLocalPlanEnabled(nextPlanEnabled);
    setLocalEmailEnabled(nextEmailEnabled);

    setReport((current) =>
      current
        ? {
            ...current,
            preferences: {
              plan_enabled: nextPlanEnabled,
              monday_email_enabled: nextEmailEnabled,
            },
            plan: nextPlanEnabled ? current.plan : [],
          }
        : current,
    );

    // Refreshing the report can fail independently of saving the preference.
    await loadReport(true);
    setSavingPreference(false);
  }

  const analytics = report?.analytics;

  const fallbackSubjects = useMemo<ReportSubject[]>(
    () =>
      clientSubjects.map((summary) => ({
        subject: summary.subject,
        label: SUBJECT_META[summary.subject].label,
        attempts: summary.attempts,
        questions: summary.questions,
        accuracy: summary.accuracy,
        trend: summary.trend,
        status:
          summary.questions === 0
            ? "no_data"
            : summary.accuracy < 70
              ? "needs_attention"
              : summary.accuracy < 85
                ? "developing"
                : "secure",
        focus: summary.weakestAttempt?.title || null,
      })),
    [clientSubjects],
  );

  const displayedSubjects = analytics?.subjects || fallbackSubjects;
  const displayedSummary = analytics?.summary || clientSummary;
  const displayedParentNote =
    analytics?.parent_note ||
    "Nova uses recorded quiz results and saved answers to identify the areas that deserve attention first.";
  const displayedAttempts =
    analytics?.attempts_analyzed ?? clientOverall.attempts;
  const displayedQuestions =
    analytics?.questions_analyzed ?? clientOverall.questions;
  const displayedAccuracy =
    analytics?.overall_accuracy ?? clientOverall.accuracy;

  const fallbackWeaknesses = useMemo<ReportArea[]>(
    () =>
      clientSkills
        .filter((row) => row.accuracy < 70)
        .slice(0, 5)
        .map((row) => ({
          subject: row.subject,
          label: row.skill,
          accuracy: row.accuracy,
          attempts: row.total,
          reason: `${row.wrong} incorrect saved answers were recorded in this area.`,
        })),
    [clientSkills],
  );

  const weaknesses = analytics?.weaknesses?.length
    ? analytics.weaknesses
    : fallbackWeaknesses;

  const recommendations = analytics?.recommendations?.length
    ? analytics.recommendations
    : [
        weaknesses[0]
          ? `Start with ${weaknesses[0].label} and review every wrong answer before attempting another quiz.`
          : "Complete a few more quizzes so Nova can identify a reliable priority.",
        "Use shorter practice sessions across several days instead of completing everything at once.",
        "Revisit a quiz only when it is below mastery or enough time has passed since the last attempt.",
      ];

  const planEnabled = report
    ? Boolean(report.preferences.plan_enabled)
    : localPlanEnabled;
  const emailEnabled = report
    ? Boolean(report.preferences.monday_email_enabled)
    : localEmailEnabled;

  if (!open || !portalReady) return null;

  return createPortal(
    <div
      className="nova-vt-backdrop"
      role="presentation"
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000,
        padding: "clamp(14px, 2.2vw, 32px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        overscrollBehavior: "none",
        background: "rgba(0, 3, 12, 0.78)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <section
        className="nova-vt-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Nova Virtual Teacher"
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          position: "relative",
          zIndex: 1,
          width: "min(1480px, calc(100vw - 48px))",
          maxHeight: "calc(100dvh - 48px)",
          margin: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          overscrollBehavior: "contain",
          borderRadius: "30px",
          border: "1px solid rgba(142, 232, 255, 0.34)",
          background:
            "linear-gradient(145deg, #071a32, #030916 74%)",
          color: "white",
          boxShadow:
            "0 42px 110px rgba(0, 0, 0, 0.68), 0 0 44px rgba(83, 215, 255, 0.12)",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <header className="nova-vt-header">
          <div className="nova-vt-title-wrap">
            <img
              src="/nova/nova-character.png"
              alt="Nova"
              className="nova-vt-character"
            />

            <div>
              <p className="nova-vt-brand">NOVA</p>
              <h2>Your Personal Learning Coach</h2>
              <p className="nova-vt-report-label">
                {studentLabel}’s weekly report
              </p>
              <p className="nova-vt-refresh-copy">
                Results analytics refresh continuously. The seven-day plan
                refreshes every Monday.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="nova-vt-close"
            aria-label="Close Nova Virtual Teacher"
          >
            ×
          </button>
        </header>

        <div className="nova-vt-controls">
          <div className="nova-vt-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "analytics"}
              className={tab === "analytics" ? "active" : ""}
              onClick={() => setTab("analytics")}
            >
              Weekly analytics
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "plan"}
              className={tab === "plan" ? "active" : ""}
              onClick={() => setTab("plan")}
            >
              Seven-day plan
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={tab === "profile"}
              aria-disabled={!learningProfileUnlocked}
              disabled={!learningProfileUnlocked}
              className={[
                tab === "profile" ? "active" : "",
                !learningProfileUnlocked ? "locked" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                if (learningProfileUnlocked) {
                  setTab("profile");
                }
              }}
              title={
                learningProfileUnlocked
                  ? "Open Nova’s Learning Profile"
                  : "Learning Profile is currently available to admins only"
              }
            >
              Learning Profile
              {!learningProfileUnlocked && (
                <span className="nova-vt-tab-lock" aria-hidden="true">
                  🔒
                </span>
              )}
            </button>
          </div>

          <div className="nova-vt-switches">
            <button
              type="button"
              className={`nova-vt-setting-toggle ${planEnabled ? "enabled" : "disabled"}`}
              aria-pressed={planEnabled}
              disabled={savingPreference || !studentUserId}
              onClick={() =>
                void updatePreferences(!planEnabled, emailEnabled)
              }
            >
              <span className="nova-vt-setting-copy">
                <strong>Schedule weekly plan</strong>
                <small>Nova selects a Monday-to-Sunday quiz plan.</small>
              </span>
              <span className="nova-vt-toggle-pill" aria-hidden="true">
                <span className="nova-vt-toggle-knob" />
              </span>
              <span className="nova-vt-toggle-state">
                {savingPreference ? "SAVING" : planEnabled ? "ON" : "OFF"}
              </span>
            </button>

            <button
              type="button"
              className={`nova-vt-setting-toggle email ${emailEnabled ? "enabled" : "disabled"}`}
              aria-pressed={emailEnabled}
              disabled={savingPreference || !studentUserId}
              onClick={() =>
                void updatePreferences(planEnabled, !emailEnabled)
              }
            >
              <span className="nova-vt-setting-copy">
                <strong>Notify me every Monday</strong>
                <small>Send the report to the registered parent email.</small>
              </span>
              <span className="nova-vt-toggle-pill" aria-hidden="true">
                <span className="nova-vt-toggle-knob" />
              </span>
              <span className="nova-vt-toggle-state">
                {savingPreference ? "SAVING" : emailEnabled ? "ON" : "OFF"}
              </span>
            </button>
          </div>
        </div>

        {(loading || clientAnalyticsLoading) && (
          <div className="nova-vt-notice">Nova is reviewing the latest results…</div>
        )}

        {(message || clientAnalyticsMessage) && (
          <div className="nova-vt-message">
            {message || clientAnalyticsMessage}
          </div>
        )}

        <div className="nova-vt-scroll">
          {tab === "analytics" ? (
            <>
              <section className="nova-vt-summary">
                <div>
                  <p className="nova-vt-eyebrow">What parents should know</p>
                  <h3>{displayedSummary}</h3>
                  <p>{displayedParentNote}</p>
                </div>

                <div className="nova-vt-coverage">
                  <Metric label="Recent accuracy" value={`${displayedAccuracy}%`} />
                  <Metric label="Attempts analysed" value={String(displayedAttempts)} />
                  <Metric label="Questions analysed" value={String(displayedQuestions)} />
                  <Metric
                    label="Data confidence"
                    value={analytics?.confidence || (clientAnswerCount > 20 ? "High" : "Medium")}
                  />
                </div>
              </section>

              <section className="nova-vt-section">
                <div className="nova-vt-section-heading">
                  <div>
                    <p className="nova-vt-eyebrow">Subject health</p>
                    <h3>Main strengths and weaknesses</h3>
                  </div>
                  <span>Latest eight weeks</span>
                </div>

                <div className="nova-vt-subject-grid">
                  {displayedSubjects.map((subject) => {
                    const meta = SUBJECT_META[subject.subject];

                    return (
                      <article
                        key={subject.subject}
                        className={`nova-vt-subject-card ${subject.status}`}
                      >
                        <div className="nova-vt-subject-top">
                          <span
                            style={{
                              color: meta.accent,
                              borderColor: `${meta.accent}55`,
                              background: `${meta.accent}12`,
                            }}
                          >
                            {meta.icon}
                          </span>
                          <small>{statusLabel(subject.status)}</small>
                        </div>

                        <h4>{subject.label}</h4>
                        <strong>
                          {subject.questions > 0 ? `${subject.accuracy}%` : "—"}
                        </strong>
                        <p>
                          {subject.attempts} quizzes · {subject.questions} questions
                        </p>
                        <small>
                          {subject.trend === null
                            ? "More data is needed for a trend."
                            : `${subject.trend >= 0 ? "+" : ""}${subject.trend} points compared with the previous four weeks.`}
                        </small>
                        {subject.focus && <em>Focus: {subject.focus}</em>}
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="nova-vt-two-column">
                <article className="nova-vt-section">
                  <div className="nova-vt-section-heading">
                    <div>
                      <p className="nova-vt-eyebrow">Priority weaknesses</p>
                      <h3>Areas to strengthen first</h3>
                    </div>
                  </div>

                  {weaknesses.length === 0 ? (
                    <div className="nova-vt-empty">
                      Nova did not find a consistent weakness in the available data.
                    </div>
                  ) : (
                    <div className="nova-vt-area-list">
                      {weaknesses.slice(0, 6).map((area, index) => (
                        <div key={`${area.subject}-${area.label}-${index}`}>
                          <span>{index + 1}</span>
                          <div>
                            <strong>{area.label}</strong>
                            <small>
                              {SUBJECT_META[area.subject].label} · {area.accuracy}% accuracy
                            </small>
                            <p>{area.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>

                <article className="nova-vt-section">
                  <div className="nova-vt-section-heading">
                    <div>
                      <p className="nova-vt-eyebrow">Nova’s next steps</p>
                      <h3>What to do this week</h3>
                    </div>
                  </div>

                  <ol className="nova-vt-recommendations">
                    {recommendations.slice(0, 5).map((recommendation) => (
                      <li key={recommendation}>{recommendation}</li>
                    ))}
                  </ol>

                  {analytics?.strengths?.length ? (
                    <div className="nova-vt-strength-note">
                      <strong>Strong area:</strong>{" "}
                      {analytics.strengths[0].label} is secure at {analytics.strengths[0].accuracy}%.
                      Nova shifts more time towards weaker areas instead of repeating mastered work.
                    </div>
                  ) : null}
                </article>
              </section>
            </>
          ) : tab === "plan" ? (
            <section className="nova-vt-plan-section">
              <div className="nova-vt-plan-heading">
                <div>
                  <p className="nova-vt-eyebrow">Monday to Sunday</p>
                  <h3>Nova’s seven-day plan</h3>
                  <p>
                    {report
                      ? `${formatDate(report.week_start)} to ${formatDate(report.week_end)} · Refreshes ${formatDateTime(report.next_refresh_at)}`
                      : "The plan appears after the weekly report service is installed."}
                  </p>
                </div>

                {report && planEnabled && (
                  <button
                    type="button"
                    onClick={() => void loadReport(true)}
                    disabled={loading || savingPreference}
                  >
                    Refresh this week
                  </button>
                )}
              </div>

              {!report ? (
                <div className="nova-vt-empty">
                  Run the Nova Virtual Teacher SQL and deploy the weekly report Edge Function to activate plans.
                </div>
              ) : !planEnabled ? (
                <div className="nova-vt-plan-off">
                  <span>◇</span>
                  <h4>Weekly planning is currently off</h4>
                  <p>
                    Analytics will always remain available. Turn on “Schedule weekly plan” to let Nova select suitable quizzes and bonus DT tasks.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      void updatePreferences(true, emailEnabled)
                    }
                    disabled={savingPreference}
                  >
                    Enable Nova’s weekly plan
                  </button>
                </div>
              ) : report.plan.length === 0 ? (
                <div className="nova-vt-empty">
                  Nova could not find enough suitable published quizzes. Quizzes already mastered at 100% are intentionally excluded.
                </div>
              ) : (
                <div className="nova-vt-plan-list">
                  {report.plan.map((item) => {
                    const meta = item.subject
                      ? SUBJECT_META[item.subject]
                      : null;
                    const completed = item.status === "completed";

                    const content = (
                      <>
                        <div className="nova-vt-day">
                          <strong>{item.day_name}</strong>
                          <small>{formatDate(item.plan_date)}</small>
                        </div>

                        <span
                          className="nova-vt-plan-icon"
                          style={
                            meta
                              ? {
                                  color: meta.accent,
                                  borderColor: `${meta.accent}55`,
                                  background: `${meta.accent}12`,
                                }
                              : undefined
                          }
                        >
                          {completed ? "✓" : meta?.icon || "◇"}
                        </span>

                        <div className="nova-vt-plan-copy">
                          <div>
                            <span>{itemTypeLabel(item.item_type)}</span>
                            {item.subject && <small>{SUBJECT_META[item.subject].label}</small>}
                          </div>
                          <h4>{item.quiz_title}</h4>
                          <p>{item.reason}</p>
                          <div className="nova-vt-plan-meta">
                            {item.target_accuracy !== null && (
                              <span>Target: {item.target_accuracy}%</span>
                            )}
                            {item.bonus_dt > 0 && (
                              <span className="bonus">+{item.bonus_dt} bonus DT</span>
                            )}
                            {completed && <span className="done">Completed</span>}
                          </div>
                        </div>

                        <span className="nova-vt-plan-arrow">
                          {item.quiz_href ? "→" : ""}
                        </span>
                      </>
                    );

                    return item.quiz_href ? (
                      <a
                        key={item.id}
                        href={item.quiz_href}
                        className={`nova-vt-plan-item ${completed ? "completed" : ""}`}
                      >
                        {content}
                      </a>
                    ) : (
                      <div
                        key={item.id}
                        className={`nova-vt-plan-item no-link ${completed ? "completed" : ""}`}
                      >
                        {content}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="nova-vt-reward-rule">
                <strong>How bonus DT works</strong>
                <p>
                  Bonus DT is awarded once when the student completes a selected quiz during its weekly plan and reaches the target shown. Standard quiz rewards remain separate.
                </p>
              </div>
            </section>
          ) : (
            <LearningProfilePanel
              studentUserId={studentUserId}
              studentLabel={studentLabel}
            />
          )}
        </div>

        <style jsx global>{`
          :global(*) {
            box-sizing: border-box;
          }

          .nova-vt-backdrop {
            position: fixed;
            inset: 0;
            z-index: 2147483000;
            padding: clamp(14px, 2.2vw, 32px);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            visibility: visible;
            opacity: 1;
            pointer-events: auto;
            background: rgba(0, 3, 12, 0.78);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }

          .nova-vt-modal {
            position: relative;
            z-index: 1;
            width: min(1480px, calc(100vw - 48px));
            max-height: calc(100dvh - 48px);
            margin: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            visibility: visible;
            opacity: 1;
            transform: none;
            border-radius: 30px;
            border: 1px solid rgba(142, 232, 255, 0.34);
            background: linear-gradient(145deg, #071a32, #030916 74%);
            color: white;
            box-shadow:
              0 42px 110px rgba(0, 0, 0, 0.68),
              0 0 44px rgba(83, 215, 255, 0.12);
            font-family: Arial, Helvetica, sans-serif;
            font-size: 15px;
          }

          .nova-vt-header {
            min-height: 126px;
            padding: 20px 24px 18px;
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 20px;
            border-bottom: 1px solid rgba(142, 232, 255, 0.13);
          }

          .nova-vt-title-wrap {
            display: grid;
            grid-template-columns: 104px minmax(0, 1fr);
            align-items: center;
            gap: 18px;
          }

          .nova-vt-character {
            width: 104px;
            height: 112px;
            object-fit: contain;
            object-position: center bottom;
            filter: drop-shadow(0 18px 28px rgba(0, 0, 0, 0.42));
          }

          .nova-vt-eyebrow,
          .nova-vt-brand {
            margin: 0;
            color: #8dfcff;
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 0.18em;
            text-transform: uppercase;
          }

          .nova-vt-brand {
            font-size: 13px;
            letter-spacing: 0.22em;
          }

          .nova-vt-title-wrap h2 {
            margin: 7px 0 0;
            font-size: clamp(32px, 4vw, 50px);
            line-height: 1.05;
            letter-spacing: -0.045em;
          }

          .nova-vt-report-label {
            margin: 9px 0 0;
            color: rgba(255, 255, 255, 0.86);
            font-size: 14px;
            font-weight: 800;
          }

          .nova-vt-refresh-copy {
            margin: 6px 0 0;
            color: rgba(235, 247, 255, 0.59);
            font-size: 13px;
            line-height: 1.5;
          }

          .nova-vt-close {
            width: 42px;
            height: 42px;
            flex: 0 0 auto;
            border-radius: 999px;
            border: 1px solid rgba(142, 232, 255, 0.25);
            background: rgba(255, 255, 255, 0.055);
            color: white;
            font-size: 25px;
            cursor: pointer;
          }

          .nova-vt-controls {
            padding: 13px 22px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            border-bottom: 1px solid rgba(142, 232, 255, 0.11);
            background: rgba(1, 7, 20, 0.35);
          }

          .nova-vt-tabs {
            display: flex;
            gap: 8px;
          }

          .nova-vt-tabs button,
          .nova-vt-plan-heading button,
          .nova-vt-plan-off button {
            min-height: 42px;
            border-radius: 999px;
            border: 1px solid rgba(142, 232, 255, 0.17);
            background: rgba(255, 255, 255, 0.035);
            color: rgba(255, 255, 255, 0.62);
            padding: 0 16px;
            font-size: 13px;
            font-weight: 850;
            cursor: pointer;
          }

          .nova-vt-tabs button.active {
            border-color: rgba(142, 232, 255, 0.52);
            background: rgba(83, 215, 255, 0.13);
            color: white;
            box-shadow: 0 0 20px rgba(83, 215, 255, 0.11);
          }

          .nova-vt-tabs button.locked {
            border-color: rgba(255, 255, 255, 0.08);
            background: rgba(255, 255, 255, 0.02);
            color: rgba(255, 255, 255, 0.32);
            cursor: not-allowed;
          }

          .nova-vt-tab-lock {
            margin-left: 7px;
            font-size: 11px;
          }

          .nova-vt-switches {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .nova-vt-setting-toggle {
            min-height: 54px;
            min-width: 286px;
            padding: 7px 10px 7px 15px;
            display: grid;
            grid-template-columns: minmax(0, 1fr) 44px 48px;
            align-items: center;
            gap: 10px;
            border-radius: 999px;
            border: 1px solid rgba(142, 232, 255, 0.18);
            background: rgba(255, 255, 255, 0.035);
            color: white;
            text-align: left;
            cursor: pointer;
            transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease, transform 180ms ease;
          }

          .nova-vt-setting-toggle:hover:not(:disabled) {
            transform: translateY(-1px);
            border-color: rgba(142, 232, 255, 0.42);
            background: rgba(83, 215, 255, 0.075);
          }

          .nova-vt-setting-toggle.enabled {
            border-color: rgba(83, 215, 255, 0.52);
            background: linear-gradient(135deg, rgba(25, 115, 150, 0.34), rgba(31, 83, 122, 0.2));
            box-shadow: 0 0 22px rgba(83, 215, 255, 0.12);
          }

          .nova-vt-setting-toggle.email.enabled {
            border-color: rgba(216, 180, 254, 0.52);
            background: linear-gradient(135deg, rgba(126, 64, 170, 0.3), rgba(66, 34, 112, 0.22));
            box-shadow: 0 0 22px rgba(192, 132, 252, 0.12);
          }

          .nova-vt-setting-toggle:disabled {
            opacity: 0.58;
            cursor: wait;
          }

          .nova-vt-setting-copy {
            min-width: 0;
            display: grid;
            gap: 3px;
          }

          .nova-vt-setting-copy strong {
            font-size: 12px;
          }

          .nova-vt-setting-copy small {
            overflow: hidden;
            color: rgba(235, 247, 255, 0.43);
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 10px;
          }

          .nova-vt-toggle-pill {
            position: relative;
            width: 44px;
            height: 24px;
            border-radius: 999px;
            border: 1px solid rgba(255, 255, 255, 0.16);
            background: rgba(255, 255, 255, 0.08);
            box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.24);
          }

          .nova-vt-toggle-knob {
            position: absolute;
            top: 3px;
            left: 3px;
            width: 16px;
            height: 16px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.66);
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.32);
            transition: left 180ms ease, background 180ms ease, box-shadow 180ms ease;
          }

          .nova-vt-setting-toggle.enabled .nova-vt-toggle-pill {
            border-color: rgba(83, 215, 255, 0.58);
            background: rgba(83, 215, 255, 0.28);
          }

          .nova-vt-setting-toggle.email.enabled .nova-vt-toggle-pill {
            border-color: rgba(216, 180, 254, 0.62);
            background: rgba(192, 132, 252, 0.3);
          }

          .nova-vt-setting-toggle.enabled .nova-vt-toggle-knob {
            left: 23px;
            background: #bdf6ff;
            box-shadow: 0 0 12px rgba(83, 215, 255, 0.5);
          }

          .nova-vt-setting-toggle.email.enabled .nova-vt-toggle-knob {
            background: #f3e8ff;
            box-shadow: 0 0 12px rgba(192, 132, 252, 0.5);
          }

          .nova-vt-toggle-state {
            text-align: center;
            color: rgba(235, 247, 255, 0.45);
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 0.12em;
          }

          .nova-vt-setting-toggle.enabled .nova-vt-toggle-state {
            color: #8dfcff;
          }

          .nova-vt-setting-toggle.email.enabled .nova-vt-toggle-state {
            color: #e9d5ff;
          }

          .nova-vt-notice,
          .nova-vt-message {
            margin: 12px 22px 0;
            padding: 11px 13px;
            border-radius: 13px;
            border: 1px solid rgba(142, 232, 255, 0.13);
            background: rgba(83, 215, 255, 0.06);
            color: rgba(235, 247, 255, 0.68);
            font-size: 13px;
          }

          .nova-vt-message {
            border-color: rgba(255, 215, 106, 0.2);
            background: rgba(255, 215, 106, 0.07);
            color: #ffe6a7;
          }

          .nova-vt-scroll {
            min-height: 0;
            padding: 20px 22px 24px;
            overflow-y: auto;
          }

          .nova-vt-summary,
          .nova-vt-section,
          .nova-vt-plan-section {
            border-radius: 23px;
            border: 1px solid rgba(142, 232, 255, 0.12);
            background: rgba(255, 255, 255, 0.027);
          }

          .nova-vt-summary {
            padding: 22px;
            display: grid;
            grid-template-columns: minmax(0, 1.25fr) minmax(360px, 0.75fr);
            gap: 22px;
            align-items: center;
          }

          .nova-vt-summary h3,
          .nova-vt-section h3,
          .nova-vt-plan-heading h3 {
            margin: 8px 0 0;
            font-size: 27px;
            line-height: 1.15;
            letter-spacing: -0.03em;
          }

          .nova-vt-summary > div:first-child > p:last-child {
            margin: 11px 0 0;
            color: rgba(235, 247, 255, 0.56);
            line-height: 1.6;
          }

          .nova-vt-coverage {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 9px;
          }

          .nova-vt-section {
            margin-top: 16px;
            padding: 20px;
          }

          .nova-vt-section-heading,
          .nova-vt-plan-heading {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
          }

          .nova-vt-section-heading > span {
            color: rgba(235, 247, 255, 0.4);
            font-size: 11px;
          }

          .nova-vt-subject-grid {
            margin-top: 17px;
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
          }

          .nova-vt-subject-card {
            min-height: 214px;
            padding: 15px;
            border-radius: 18px;
            border: 1px solid rgba(142, 232, 255, 0.1);
            background: rgba(255, 255, 255, 0.025);
          }

          .nova-vt-subject-card.needs_attention {
            border-color: rgba(255, 78, 96, 0.42);
            background: rgba(255, 44, 67, 0.1);
          }

          .nova-vt-subject-card.secure {
            border-color: rgba(93, 255, 181, 0.22);
            background: rgba(93, 255, 181, 0.045);
          }

          .nova-vt-subject-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }

          .nova-vt-subject-top > span {
            width: 38px;
            height: 38px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
            border-style: solid;
            border-width: 1px;
          }

          .nova-vt-subject-top small {
            color: rgba(235, 247, 255, 0.5);
            font-size: 9px;
            font-weight: 850;
            text-transform: uppercase;
          }

          .nova-vt-subject-card h4 {
            margin: 15px 0 0;
            font-size: 14px;
          }

          .nova-vt-subject-card > strong {
            display: block;
            margin-top: 7px;
            font-size: 31px;
          }

          .nova-vt-subject-card > p,
          .nova-vt-subject-card > small,
          .nova-vt-subject-card > em {
            display: block;
            margin: 7px 0 0;
            color: rgba(235, 247, 255, 0.46);
            font-size: 10px;
            line-height: 1.45;
          }

          .nova-vt-subject-card > em {
            color: #8dfcff;
            font-style: normal;
          }

          .nova-vt-two-column {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }

          .nova-vt-area-list {
            margin-top: 16px;
            display: grid;
            gap: 9px;
          }

          .nova-vt-area-list > div {
            min-height: 72px;
            padding: 11px 12px;
            display: grid;
            grid-template-columns: 31px minmax(0, 1fr);
            gap: 10px;
            border-radius: 15px;
            border: 1px solid rgba(255, 78, 96, 0.18);
            background: rgba(255, 44, 67, 0.055);
          }

          .nova-vt-area-list > div > span {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            background: rgba(255, 78, 96, 0.11);
            color: #ffd6dc;
            font-size: 11px;
            font-weight: 900;
          }

          .nova-vt-area-list strong,
          .nova-vt-area-list small,
          .nova-vt-area-list p {
            display: block;
          }

          .nova-vt-area-list strong {
            font-size: 13px;
          }

          .nova-vt-area-list small {
            margin-top: 4px;
            color: #ffb4bf;
            font-size: 10px;
          }

          .nova-vt-area-list p {
            margin: 6px 0 0;
            color: rgba(235, 247, 255, 0.5);
            font-size: 11px;
            line-height: 1.45;
          }

          .nova-vt-recommendations {
            margin: 16px 0 0;
            padding-left: 20px;
            display: grid;
            gap: 12px;
            color: rgba(242, 250, 255, 0.78);
            font-size: 13px;
            line-height: 1.55;
          }

          .nova-vt-strength-note,
          .nova-vt-reward-rule {
            margin-top: 17px;
            padding: 13px 14px;
            border-radius: 14px;
            border: 1px solid rgba(93, 255, 181, 0.16);
            background: rgba(93, 255, 181, 0.055);
            color: rgba(235, 255, 246, 0.7);
            font-size: 12px;
            line-height: 1.55;
          }

          .nova-vt-empty {
            margin-top: 16px;
            padding: 22px;
            border-radius: 16px;
            border: 1px dashed rgba(142, 232, 255, 0.15);
            background: rgba(255, 255, 255, 0.02);
            color: rgba(235, 247, 255, 0.5);
            text-align: center;
            line-height: 1.55;
          }

          .nova-vt-plan-section {
            padding: 20px;
          }

          .nova-vt-plan-heading > div > p:last-child {
            margin: 8px 0 0;
            color: rgba(235, 247, 255, 0.5);
            font-size: 12px;
          }

          .nova-vt-plan-heading button {
            color: white;
          }

          .nova-vt-plan-off {
            margin-top: 20px;
            padding: 34px 22px;
            border-radius: 20px;
            border: 1px dashed rgba(142, 232, 255, 0.18);
            background: rgba(255, 255, 255, 0.02);
            text-align: center;
          }

          .nova-vt-plan-off > span {
            font-size: 34px;
            color: #8dfcff;
          }

          .nova-vt-plan-off h4 {
            margin: 12px 0 0;
            font-size: 21px;
          }

          .nova-vt-plan-off p {
            max-width: 620px;
            margin: 9px auto 0;
            color: rgba(235, 247, 255, 0.52);
            line-height: 1.55;
          }

          .nova-vt-plan-off button {
            margin-top: 18px;
            border-color: rgba(83, 215, 255, 0.45);
            background: rgba(83, 215, 255, 0.13);
            color: white;
          }

          .nova-vt-plan-list {
            margin-top: 18px;
            display: grid;
            gap: 9px;
          }

          .nova-vt-plan-item {
            min-height: 92px;
            padding: 12px 14px;
            display: grid;
            grid-template-columns: 82px 42px minmax(0, 1fr) 26px;
            align-items: center;
            gap: 12px;
            border-radius: 17px;
            border: 1px solid rgba(142, 232, 255, 0.11);
            background: rgba(255, 255, 255, 0.025);
            color: white;
            text-decoration: none;
            transition: transform 170ms ease, border-color 170ms ease, background 170ms ease;
          }

          .nova-vt-plan-item:not(.no-link):hover {
            transform: translateY(-2px);
            border-color: rgba(142, 232, 255, 0.32);
            background: rgba(83, 215, 255, 0.055);
          }

          .nova-vt-plan-item.completed {
            border-color: rgba(93, 255, 181, 0.25);
            background: rgba(93, 255, 181, 0.045);
          }

          .nova-vt-day {
            display: grid;
            gap: 4px;
          }

          .nova-vt-day strong {
            font-size: 14px;
          }

          .nova-vt-day small {
            color: rgba(235, 247, 255, 0.43);
            font-size: 10px;
          }

          .nova-vt-plan-icon {
            width: 42px;
            height: 42px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 13px;
            border: 1px solid rgba(142, 232, 255, 0.18);
            background: rgba(83, 215, 255, 0.07);
            font-weight: 900;
          }

          .nova-vt-plan-copy {
            min-width: 0;
          }

          .nova-vt-plan-copy > div:first-child {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .nova-vt-plan-copy > div:first-child > span,
          .nova-vt-plan-copy > div:first-child > small {
            color: #8dfcff;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 0.1em;
            text-transform: uppercase;
          }

          .nova-vt-plan-copy > div:first-child > small {
            color: rgba(235, 247, 255, 0.43);
          }

          .nova-vt-plan-copy h4 {
            margin: 6px 0 0;
            font-size: 17px;
          }

          .nova-vt-plan-copy p {
            margin: 6px 0 0;
            color: rgba(235, 247, 255, 0.56);
            font-size: 12px;
            line-height: 1.5;
          }

          .nova-vt-plan-meta {
            margin-top: 8px;
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }

          .nova-vt-plan-meta span {
            padding: 4px 7px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.045);
            color: rgba(235, 247, 255, 0.55);
            font-size: 9px;
            font-weight: 800;
          }

          .nova-vt-plan-meta .bonus {
            background: rgba(255, 215, 106, 0.09);
            color: #ffe6a7;
          }

          .nova-vt-plan-meta .done {
            background: rgba(93, 255, 181, 0.09);
            color: #9fffd2;
          }

          .nova-vt-plan-arrow {
            color: #8dfcff;
            font-size: 20px;
          }

          .nova-vt-reward-rule {
            border-color: rgba(255, 215, 106, 0.15);
            background: rgba(255, 215, 106, 0.045);
            color: rgba(255, 240, 200, 0.68);
          }

          .nova-vt-reward-rule strong,
          .nova-vt-reward-rule p {
            display: block;
          }

          .nova-vt-reward-rule p {
            margin: 5px 0 0;
          }

          .nova-vt-profile-section {
            padding: 22px;
            border-radius: 23px;
            border: 1px solid rgba(142, 232, 255, 0.12);
            background: rgba(255, 255, 255, 0.027);
          }

          .nova-vt-profile-heading {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 20px;
          }

          .nova-vt-profile-heading h3 {
            margin: 8px 0 0;
            font-size: 30px;
            line-height: 1.12;
            letter-spacing: -0.035em;
          }

          .nova-vt-profile-heading > div > p:last-child {
            max-width: 830px;
            margin: 11px 0 0;
            color: rgba(235, 247, 255, 0.6);
            font-size: 14px;
            line-height: 1.6;
          }

          .nova-vt-admin-badge {
            flex: 0 0 auto;
            padding: 8px 12px;
            border-radius: 999px;
            border: 1px solid rgba(216, 180, 254, 0.3);
            background: rgba(192, 132, 252, 0.1);
            color: #e9d5ff;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }

          .nova-vt-profile-overview {
            margin-top: 20px;
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
          }

          .nova-vt-profile-overview article {
            min-height: 142px;
            padding: 16px;
            border-radius: 17px;
            border: 1px solid rgba(142, 232, 255, 0.1);
            background: rgba(255, 255, 255, 0.025);
          }

          .nova-vt-profile-overview span {
            color: rgba(235, 247, 255, 0.5);
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 0.11em;
            text-transform: uppercase;
          }

          .nova-vt-profile-overview strong {
            display: block;
            margin-top: 10px;
            color: #8dfcff;
            font-size: 28px;
            letter-spacing: -0.035em;
          }

          .nova-vt-profile-overview p {
            margin: 8px 0 0;
            color: rgba(235, 247, 255, 0.5);
            font-size: 12px;
            line-height: 1.5;
          }

          .nova-vt-profile-columns {
            margin-top: 16px;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }

          .nova-vt-profile-card,
          .nova-vt-profile-next {
            padding: 20px;
            border-radius: 20px;
            border: 1px solid rgba(142, 232, 255, 0.1);
            background: rgba(255, 255, 255, 0.025);
          }

          .nova-vt-profile-card h4,
          .nova-vt-profile-next h4 {
            margin: 8px 0 0;
            font-size: 23px;
            letter-spacing: -0.025em;
          }

          .nova-vt-profile-facts,
          .nova-vt-source-list {
            margin-top: 16px;
            display: grid;
            gap: 9px;
          }

          .nova-vt-profile-facts > div {
            padding: 13px 14px;
            border-radius: 14px;
            border: 1px solid rgba(142, 232, 255, 0.09);
            background: rgba(255, 255, 255, 0.025);
          }

          .nova-vt-profile-facts span {
            display: block;
            color: rgba(235, 247, 255, 0.46);
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 0.1em;
            text-transform: uppercase;
          }

          .nova-vt-profile-facts strong {
            display: block;
            margin-top: 7px;
            color: rgba(255, 255, 255, 0.88);
            font-size: 13px;
            line-height: 1.5;
          }

          .nova-vt-source-list > div {
            min-height: 62px;
            padding: 11px 12px;
            display: grid;
            grid-template-columns: 34px minmax(0, 1fr);
            align-items: center;
            gap: 11px;
            border-radius: 14px;
            border: 1px solid rgba(142, 232, 255, 0.09);
            background: rgba(255, 255, 255, 0.025);
          }

          .nova-vt-source-list > div > span {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 11px;
            font-weight: 900;
          }

          .nova-vt-source-list .connected > span {
            border: 1px solid rgba(93, 255, 181, 0.28);
            background: rgba(93, 255, 181, 0.09);
            color: #9fffd2;
          }

          .nova-vt-source-list .pending > span {
            border: 1px solid rgba(255, 215, 106, 0.25);
            background: rgba(255, 215, 106, 0.08);
            color: #ffe6a7;
          }

          .nova-vt-source-list strong,
          .nova-vt-source-list small {
            display: block;
          }

          .nova-vt-source-list strong {
            font-size: 13px;
          }

          .nova-vt-source-list small {
            margin-top: 4px;
            color: rgba(235, 247, 255, 0.46);
            font-size: 11px;
            line-height: 1.45;
          }

          .nova-vt-profile-next {
            margin-top: 16px;
            border-color: rgba(216, 180, 254, 0.15);
            background: rgba(192, 132, 252, 0.04);
          }

          .nova-vt-profile-next > p:last-child {
            margin: 10px 0 0;
            color: rgba(235, 247, 255, 0.58);
            font-size: 13px;
            line-height: 1.6;
          }

          @media (max-width: 1040px) {
            .nova-vt-controls {
              align-items: stretch;
              flex-direction: column;
            }

            .nova-vt-switches {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .nova-vt-setting-toggle {
              width: 100%;
              min-width: 0;
            }
            .nova-vt-controls {
              align-items: stretch;
              flex-direction: column;
            }

            .nova-vt-switches {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .nova-vt-summary {
              grid-template-columns: 1fr;
            }

            .nova-vt-subject-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .nova-vt-two-column {
              grid-template-columns: 1fr;
            }

            .nova-vt-profile-overview {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .nova-vt-profile-columns {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 1180px) {
            .nova-vt-backdrop {
              padding: 14px;
            }

            .nova-vt-modal {
              width: calc(100vw - 28px);
              max-height: calc(100dvh - 28px);
              border-radius: 24px;
            }
          }

          @media (max-width: 720px) {
            .nova-vt-tabs {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }

            .nova-vt-tabs button {
              padding: 0 7px;
              font-size: 10.5px;
              line-height: 1.2;
            }

            .nova-vt-switches {
              grid-template-columns: 1fr;
            }

            .nova-vt-setting-toggle {
              grid-template-columns: minmax(0, 1fr) 42px 42px;
              padding-left: 13px;
            }

            .nova-vt-setting-copy small {
              white-space: normal;
              line-height: 1.35;
            }
            .nova-vt-backdrop {
              padding: 8px;
              align-items: center;
              justify-content: center;
            }

            .nova-vt-modal {
              width: calc(100vw - 16px);
              max-height: calc(100dvh - 16px);
              border-radius: 22px;
            }

            .nova-vt-header {
              min-height: 0;
              padding: 14px 12px;
            }

            .nova-vt-title-wrap {
              grid-template-columns: 70px minmax(0, 1fr);
              gap: 10px;
            }

            .nova-vt-character {
              width: 70px;
              height: 82px;
            }

            .nova-vt-title-wrap h2 {
              font-size: 26px;
              line-height: 1.04;
            }

            .nova-vt-report-label {
              margin-top: 7px;
              font-size: 12px;
            }

            .nova-vt-refresh-copy {
              display: none;
            }

            .nova-vt-close {
              width: 36px;
              height: 36px;
            }

            .nova-vt-controls {
              padding: 10px 12px;
            }

            .nova-vt-tabs {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }

            .nova-vt-tabs button {
              padding: 0 7px;
              font-size: 10.5px;
              line-height: 1.2;
            }

            .nova-vt-switches {
              grid-template-columns: 1fr;
            }

            .nova-vt-scroll {
              padding: 12px;
            }

            .nova-vt-summary,
            .nova-vt-section,
            .nova-vt-plan-section {
              padding: 15px;
              border-radius: 18px;
            }

            .nova-vt-coverage,
            .nova-vt-subject-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .nova-vt-subject-card {
              min-height: 194px;
            }

            .nova-vt-plan-heading {
              align-items: stretch;
              flex-direction: column;
            }

            .nova-vt-plan-item {
              grid-template-columns: 58px 38px minmax(0, 1fr);
              gap: 9px;
              padding: 11px;
            }

            .nova-vt-plan-arrow {
              display: none;
            }

            .nova-vt-day strong {
              font-size: 11px;
            }

            .nova-vt-plan-copy h4 {
              font-size: 15px;
            }

            .nova-vt-profile-section {
              padding: 15px;
              border-radius: 18px;
            }

            .nova-vt-profile-heading {
              flex-direction: column;
            }

            .nova-vt-profile-heading h3 {
              font-size: 25px;
            }

            .nova-vt-profile-heading > div > p:last-child {
              font-size: 13px;
            }

            .nova-vt-profile-overview {
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 8px;
            }

            .nova-vt-profile-overview article {
              min-height: 154px;
              padding: 13px;
            }

            .nova-vt-profile-overview strong {
              font-size: 24px;
            }

            .nova-vt-profile-card,
            .nova-vt-profile-next {
              padding: 15px;
            }
          }
        `}</style>
      </section>
    </div>,
    document.body,
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={metricStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const metricStyle: CSSProperties = {
  minHeight: 67,
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(142,232,255,0.1)",
  background: "rgba(255,255,255,0.025)",
  display: "grid",
  alignContent: "center",
  gap: 5,
};
