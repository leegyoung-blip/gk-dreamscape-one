"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { useNovaFeatureFlags } from "@/hooks/useNovaFeatureFlags";
import styles from "./NovaLearningSummaryPopup.module.css";

type SubjectKey = "english" | "math" | "science" | "knowledge";
type PopupTab = "analytics" | "plan";

type ClientSubjectSummary = {
  subject: SubjectKey;
  attempts: number;
  questions: number;
  accuracy: number;
  trend: number | null;
  weakestAttempt?: { title: string; correctCount: number; totalQuestions: number } | null;
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
};

type PlanItem = {
  id: string;
  plan_date: string;
  day_index: number;
  day_name: string;
  item_type: "focus" | "revisit" | "stretch" | "assessment" | "rest";
  subject: SubjectKey | null;
  quiz_title: string;
  quiz_href: string | null;
  reason: string;
  target_accuracy: number | null;
  bonus_dt: number;
  recommended_session_minutes?: number | null;
  status: "pending" | "completed" | "missed" | "cancelled";
};

type NovaPreferences = {
  plan_enabled: boolean;
  monday_email_enabled: boolean;
};

type WeeklyReportResponse = {
  week_start: string;
  week_end: string;
  next_refresh_at: string;
  preferences: NovaPreferences;
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
  clientOverall: { attempts: number; questions: number; accuracy: number };
  clientSubjects: ClientSubjectSummary[];
  clientSkills: ClientSkillRow[];
  clientAnalyticsLoading: boolean;
  clientAnalyticsMessage: string;
  clientAnswerCount: number;
};

const SUBJECT_META: Record<SubjectKey, { label: string; icon: string }> = {
  english: { label: "English", icon: "✎" },
  math: { label: "Mathematics", icon: "∑" },
  science: { label: "Science", icon: "⚗" },
  knowledge: { label: "Knowledge Arena", icon: "◎" },
};

function normalisePreferences(value: unknown): NovaPreferences {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") {
    return { plan_enabled: false, monday_email_enabled: false };
  }
  const record = row as Record<string, unknown>;
  return {
    plan_enabled: Boolean(record.plan_enabled),
    monday_email_enabled: Boolean(record.monday_email_enabled),
  };
}

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

function itemTypeLabel(value: PlanItem["item_type"]) {
  switch (value) {
    case "focus": return "Focus practice";
    case "revisit": return "Revisit";
    case "stretch": return "Stretch task";
    case "assessment": return "Assessment";
    default: return "Rest or catch up";
  }
}

function statusLabel(value: ReportSubject["status"]) {
  switch (value) {
    case "needs_attention": return "Needs attention";
    case "developing": return "Developing";
    case "secure": return "Secure";
    default: return "No recent data";
  }
}

export default function NovaLearningSummaryPopup({
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
  const [portalReady, setPortalReady] = useState(false);
  const [tab, setTab] = useState<PopupTab>("analytics");
  const [report, setReport] = useState<WeeklyReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [planEnabled, setPlanEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);

  const { isEnabled, loading: featureFlagsLoading } = useNovaFeatureFlags(viewerUserId);
  const analyticsEnabled = isEnabled("nova_weekly_analytics_enabled", true);
  const planFeatureEnabled = isEnabled("nova_weekly_plan_enabled", true);
  const emailFeatureEnabled = isEnabled("nova_weekly_email_enabled", true);

  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    setReport(null);
    setMessage("");
  }, [studentUserId]);

  useEffect(() => {
    if (!open || !studentUserId) return;
    void loadPreferences();
    void loadReport(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, studentUserId]);

  async function loadPreferences() {
    if (!studentUserId) return;
    const { data, error } = await supabase.rpc("get_nova_virtual_teacher_preferences", {
      p_student_user_id: studentUserId,
    });
    if (error) {
      console.warn("Nova preferences unavailable:", error.message);
      return;
    }
    const next = normalisePreferences(data);
    setPlanEnabled(next.plan_enabled);
    setEmailEnabled(next.monday_email_enabled);
  }

  async function loadReport(force: boolean) {
    if (!studentUserId) return;
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase.functions.invoke("nova-weekly-report", {
      body: { student_user_id: studentUserId, force },
    });
    if (error) {
      console.warn("Nova weekly report error:", error.message);
      setMessage("Nova could not refresh the stored weekly report. The recent dashboard results are still shown below.");
      setLoading(false);
      return;
    }
    const next = data as WeeklyReportResponse;
    setReport(next);
    if (next?.preferences) {
      const preferences = normalisePreferences(next.preferences);
      setPlanEnabled(preferences.plan_enabled);
      setEmailEnabled(preferences.monday_email_enabled);
    }
    setLoading(false);
  }

  async function updatePreferences(nextPlan: boolean, nextEmail: boolean) {
    if (!studentUserId) return;
    const previous = { planEnabled, emailEnabled };
    setPlanEnabled(nextPlan);
    setEmailEnabled(nextEmail);
    setSaving(true);

    const { data, error } = await supabase.rpc("set_nova_virtual_teacher_preferences", {
      p_student_user_id: studentUserId,
      p_plan_enabled: nextPlan,
      p_monday_email_enabled: nextEmail,
    });

    if (error) {
      setPlanEnabled(previous.planEnabled);
      setEmailEnabled(previous.emailEnabled);
      setMessage(`The preference could not be saved. ${error.message}`);
      setSaving(false);
      return;
    }

    const saved = normalisePreferences(data);
    setPlanEnabled(saved.plan_enabled);
    setEmailEnabled(saved.monday_email_enabled);
    setSaving(false);
    void loadReport(true);
  }

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

  const analytics = report?.analytics;
  const subjects = analytics?.subjects || fallbackSubjects;
  const weaknesses = analytics?.weaknesses?.length ? analytics.weaknesses : fallbackWeaknesses;
  const recommendations = analytics?.recommendations?.length
    ? analytics.recommendations
    : [
        weaknesses[0]
          ? `Start with ${weaknesses[0].label}.`
          : "Complete a few more quizzes so Nova can identify a reliable priority.",
        "Review wrong answers before repeating the same quiz.",
        "Use shorter practice sessions across several days.",
      ];

  if (!open || !portalReady) return null;

  return createPortal(
    <div className={styles.backdrop} role="presentation">
      <section className={styles.modal} role="dialog" aria-modal="true" aria-label="Nova Learning Summary">
        <header className={styles.header}>
          <div className={styles.brand}>
            <img src="/nova/nova-character.png" alt="Nova" />
            <div>
              <span>NOVA</span>
              <h2>Learning Summary</h2>
              <p>{studentLabel}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className={styles.close} aria-label="Close Nova Learning Summary">×</button>
        </header>

        <div className={styles.toolbar}>
          <div className={styles.tabs} role="tablist">
            <button type="button" className={tab === "analytics" ? styles.active : ""} disabled={!analyticsEnabled} onClick={() => setTab("analytics")}>Weekly Analytics</button>
            <button type="button" className={tab === "plan" ? styles.active : ""} disabled={!planFeatureEnabled} onClick={() => setTab("plan")}>Seven-Day Plan</button>
          </div>

          <div className={styles.switches}>
            <button type="button" className={planEnabled ? styles.toggleOn : styles.toggleOff} disabled={saving || featureFlagsLoading || !planFeatureEnabled} onClick={() => void updatePreferences(!planEnabled, emailEnabled)}>
              <span><strong>Weekly plan</strong><small>{planEnabled ? "On" : "Off"}</small></span><i />
            </button>
            <button type="button" className={emailEnabled ? styles.toggleOn : styles.toggleOff} disabled={saving || featureFlagsLoading || !emailFeatureEnabled} onClick={() => void updatePreferences(planEnabled, !emailEnabled)}>
              <span><strong>Monday email</strong><small>{emailEnabled ? "On" : "Off"}</small></span><i />
            </button>
          </div>
        </div>

        {(loading || clientAnalyticsLoading) && <div className={styles.notice}>Nova is reviewing the latest results…</div>}
        {(message || clientAnalyticsMessage) && <div className={styles.message}>{message || clientAnalyticsMessage}</div>}

        <div className={styles.scroll}>
          {tab === "analytics" ? (
            <>
              <section className={styles.summary}>
                <div>
                  <span>WHAT PARENTS SHOULD KNOW</span>
                  <h3>{analytics?.summary || clientSummary}</h3>
                  <p>{analytics?.parent_note || "Nova uses recent quiz results and saved answers to identify what deserves attention first."}</p>
                </div>
                <div className={styles.metrics}>
                  <Metric label="Recent accuracy" value={`${analytics?.overall_accuracy ?? clientOverall.accuracy}%`} />
                  <Metric label="Attempts" value={String(analytics?.attempts_analyzed ?? clientOverall.attempts)} />
                  <Metric label="Questions" value={String(analytics?.questions_analyzed ?? clientOverall.questions)} />
                  <Metric label="Confidence" value={analytics?.confidence || (clientAnswerCount > 20 ? "High" : "Medium")} />
                </div>
              </section>

              <section className={styles.section}>
                <div className={styles.sectionHeading}><div><span>SUBJECT HEALTH</span><h3>Main strengths and weaknesses</h3></div><small>Latest eight weeks</small></div>
                <div className={styles.subjectGrid}>
                  {subjects.map((subject) => (
                    <article key={subject.subject} data-state={subject.status}>
                      <div className={styles.subjectTop}><i>{SUBJECT_META[subject.subject].icon}</i><small>{statusLabel(subject.status)}</small></div>
                      <h4>{subject.label}</h4>
                      <strong>{subject.questions > 0 ? `${subject.accuracy}%` : "—"}</strong>
                      <p>{subject.attempts} quizzes · {subject.questions} questions</p>
                      {subject.focus && <em>Focus: {subject.focus}</em>}
                    </article>
                  ))}
                </div>
              </section>

              <section className={styles.twoColumn}>
                <article className={styles.section}>
                  <div className={styles.sectionHeading}><div><span>PRIORITY WEAKNESSES</span><h3>Strengthen first</h3></div></div>
                  <div className={styles.areaList}>
                    {weaknesses.length === 0 ? <div className={styles.empty}>No consistent weakness found yet.</div> : weaknesses.slice(0, 5).map((area, index) => (
                      <div key={`${area.subject}-${area.label}-${index}`}><b>{index + 1}</b><span><strong>{area.label}</strong><small>{SUBJECT_META[area.subject].label} · {area.accuracy}%</small><p>{area.reason}</p></span></div>
                    ))}
                  </div>
                </article>
                <article className={styles.section}>
                  <div className={styles.sectionHeading}><div><span>NOVA'S NEXT STEPS</span><h3>What to do this week</h3></div></div>
                  <ol className={styles.recommendations}>{recommendations.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ol>
                </article>
              </section>
            </>
          ) : (
            <section className={styles.section}>
              <div className={styles.planHeading}>
                <div><span>MONDAY TO SUNDAY</span><h3>Nova's seven-day plan</h3><p>{report ? `${formatDate(report.week_start)} to ${formatDate(report.week_end)} · Refreshes ${formatDateTime(report.next_refresh_at)}` : "Nova is preparing the current plan."}</p></div>
                {report && planEnabled && <button type="button" disabled={loading || saving} onClick={() => void loadReport(true)}>Refresh this week</button>}
              </div>

              {!report ? (
                <div className={styles.empty}>The stored weekly plan is not available yet.</div>
              ) : !planEnabled ? (
                <div className={styles.planOff}><span>◇</span><strong>Weekly planning is off</strong><p>Turn it on above to let Nova prepare a Monday-to-Sunday practice plan.</p></div>
              ) : report.plan.length === 0 ? (
                <div className={styles.empty}>Nova could not find suitable published quizzes for this week.</div>
              ) : (
                <div className={styles.planList}>
                  {report.plan.map((item) => {
                    const content = <><div className={styles.day}><strong>{item.day_name}</strong><small>{formatDate(item.plan_date)}</small></div><i>{item.status === "completed" ? "✓" : item.subject ? SUBJECT_META[item.subject].icon : "◇"}</i><div className={styles.planCopy}><span>{itemTypeLabel(item.item_type)}{item.subject ? ` · ${SUBJECT_META[item.subject].label}` : ""}</span><h4>{item.quiz_title}</h4><p>{item.reason}</p><div>{item.target_accuracy !== null && <small>Target {item.target_accuracy}%</small>}{item.recommended_session_minutes ? <small>About {item.recommended_session_minutes} min</small> : null}{item.bonus_dt > 0 && <small>+{item.bonus_dt} DT</small>}</div></div><b>{item.quiz_href ? "→" : ""}</b></>;
                    return item.quiz_href ? <a key={item.id} href={item.quiz_href} className={styles.planItem}>{content}</a> : <div key={item.id} className={styles.planItem}>{content}</div>;
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className={styles.metric}><span>{label}</span><strong>{value}</strong></div>;
}
