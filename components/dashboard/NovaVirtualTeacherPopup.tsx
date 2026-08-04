"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

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
  skillId?: string | null;
  skillCode?: string | null;
  mappingCoverage?: number | null;
  evidenceLevel?: "question_skill" | "topic";
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
  target_skill_id?: string | null;
  target_skill_code?: string | null;
  target_skill_name?: string | null;
  recommendation_version?: string | null;
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


type ProfileView =
  | "overview"
  | "mastery"
  | "patterns"
  | "timeline"
  | "insights";

type ProfileSubjectSummary = {
  subject: string;
  mastery_score: number;
  confidence_score: number;
  questions_attempted: number;
  skills_count: number;
  secure_skills: number;
  priority_skills: number;
  last_activity_at: string | null;
};

type ProfileSkill = {
  skill_id: string;
  subject: string;
  primary_level: number;
  domain: string;
  topic: string;
  skill_name: string;
  skill_code: string;
  public_explanation: string | null;
  parent_skill_id: string | null;
  is_topic_level: boolean;
  mastery_score: number;
  confidence_score: number;
  recent_accuracy: number | null;
  lifetime_accuracy: number | null;
  questions_attempted: number;
  correct_answers: number;
  wrong_answers: number;
  recent_wrong_answers: number;
  weighted_questions: number;
  primary_questions_attempted: number;
  primary_correct_answers: number;
  primary_wrong_answers: number;
  recent_primary_wrong_answers: number;
  unique_questions: number;
  primary_unique_questions: number;
  unique_attempts: number;
  primary_unique_attempts: number;
  unique_activities: number;
  unique_quizzes: number;
  primary_unique_quizzes: number;
  active_weeks: number;
  mapping_coverage: number | null;
  granular_eligible: boolean;
  evidence_quality:
    | "broad"
    | "insufficient_mapping"
    | "limited_primary_evidence"
    | "ready";
  trend_points: number | null;
  trend: "improving" | "declining" | "stable" | "no_data";
  status:
    | "not_enough_data"
    | "needs_support"
    | "emerging"
    | "developing"
    | "secure"
    | "mastered"
    | "review_due";
  first_seen_at: string | null;
  last_attempted_at: string | null;
};

type ProfilePattern = {
  id: string;
  pattern_key: string;
  subject: string;
  current_value: number | null;
  previous_value: number | null;
  unit: string;
  confidence_score: number;
  evidence_count: number;
  window_start: string | null;
  window_end: string | null;
  interpretation: string | null;
  metadata: Record<string, unknown>;
  calculated_at: string;
};

type ProfileInsight = {
  id: string;
  insight_key: string;
  insight_type: string;
  subject: string | null;
  skill_id: string | null;
  title: string;
  summary: string;
  confidence_score: number;
  severity: "info" | "low" | "medium" | "high";
  status: "active" | "resolved" | "dismissed";
  evidence: Record<string, unknown>;
  first_detected_at: string;
  last_confirmed_at: string;
  resolved_at: string | null;
};

type ProfileSnapshot = {
  id: string;
  snapshot_date: string;
  snapshot_type: "weekly" | "monthly" | "manual";
  overall_mastery: number | null;
  profile_confidence: number | null;
  strongest_subject: string | null;
  priority_subject: string | null;
  strongest_skills: unknown[];
  priority_skills: unknown[];
  subject_summaries: unknown[];
  learning_patterns: unknown[];
  active_insights: unknown[];
  source_event_count: number;
  source_question_count: number;
  generated_at: string;
};

type LearningProfilePayload = {
  student_user_id: string;
  generated_at: string;
  analytics_version?: string;
  latest_snapshot: Partial<ProfileSnapshot>;
  subject_summaries: ProfileSubjectSummary[];
  skills: ProfileSkill[];
  patterns: ProfilePattern[];
  insights: ProfileInsight[];
  resolved_insights: ProfileInsight[];
  timeline: ProfileSnapshot[];
  processing: Record<string, unknown>;
};

type ProfileTopicGroup = {
  key: string;
  subject: string;
  primaryLevel: number;
  domain: string;
  topic: string;
  topicSkill: ProfileSkill | null;
  granularSkills: ProfileSkill[];
  masteryScore: number;
  confidenceScore: number;
  mappingCoverage: number | null;
  status: ProfileSkill["status"];
  readySkills: number;
  totalSkills: number;
  lastActivityAt: string | null;
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


function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function titleCase(value: string | null | undefined) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatProfileDate(value: string | null | undefined) {
  if (!value) return "No recorded activity";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No recorded activity";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function profileStatusLabel(status: ProfileSkill["status"]) {
  switch (status) {
    case "needs_support":
      return "Needs support";
    case "not_enough_data":
      return "More evidence needed";
    case "review_due":
      return "Review due";
    case "mastered":
      return "Mastered";
    case "secure":
      return "Secure";
    case "developing":
      return "Developing";
    case "emerging":
      return "Emerging";
    default:
      return titleCase(status);
  }
}

function evidenceQualityLabel(
  value: ProfileSkill["evidence_quality"],
) {
  switch (value) {
    case "ready":
      return "Reliable skill evidence";
    case "limited_primary_evidence":
      return "More direct evidence needed";
    case "insufficient_mapping":
      return "More question mapping needed";
    default:
      return "Broad topic evidence";
  }
}

function patternLabel(patternKey: string) {
  const labels: Record<string, string> = {
    weekly_consistency: "Weekly consistency",
    retry_persistence: "Retry persistence",
    error_review_effectiveness: "Error-review effectiveness",
    speed_accuracy_balance: "Speed and accuracy balance",
    endurance: "Practice endurance",
    challenge_readiness: "Challenge readiness",
    independent_completion: "Independent completion",
    hint_reliance: "Hint reliance",
    practice_spacing: "Practice spacing",
    completion_follow_through: "Completion follow-through",
  };

  return labels[patternKey] || titleCase(patternKey);
}

function formatPatternValue(
  value: number | null,
  unit: string,
) {
  if (value === null || value === undefined) return "Not enough data";

  if (unit === "percentage" || unit === "percent") {
    return `${Math.round(value)}%`;
  }

  if (unit === "days") {
    return `${Math.round(value)} day${Math.round(value) === 1 ? "" : "s"}`;
  }

  if (unit === "count") {
    return String(Math.round(value));
  }

  return `${Math.round(value * 10) / 10}`;
}

function profileSubjectLabel(subject: string | null | undefined) {
  switch (String(subject || "").toLowerCase()) {
    case "math":
      return "Mathematics";
    case "science":
      return "Science";
    case "english":
      return "English";
    case "knowledge":
      return "Knowledge Arena";
    case "all":
      return "Across subjects";
    default:
      return titleCase(subject);
  }
}

function subjectAccent(subject: string) {
  switch (subject) {
    case "english":
      return "#ff9df0";
    case "math":
      return "#53d7ff";
    case "science":
      return "#a6ff7a";
    default:
      return "#ffd76a";
  }
}

function weightedAverage(
  rows: ProfileSkill[],
  field: "mastery_score" | "confidence_score",
) {
  if (rows.length === 0) return 0;

  const totals = rows.reduce(
    (result, row) => {
      const weight = Math.max(
        safeNumber(row.weighted_questions),
        safeNumber(row.questions_attempted),
        1,
      );

      result.weight += weight;
      result.value += safeNumber(row[field]) * weight;
      return result;
    },
    { value: 0, weight: 0 },
  );

  return totals.weight > 0
    ? Math.round((totals.value / totals.weight) * 10) / 10
    : 0;
}

function weakestProfileStatus(
  rows: ProfileSkill[],
): ProfileSkill["status"] {
  const ranking: Record<ProfileSkill["status"], number> = {
    needs_support: 1,
    emerging: 2,
    review_due: 3,
    developing: 4,
    not_enough_data: 5,
    secure: 6,
    mastered: 7,
  };

  return (
    [...rows].sort(
      (first, second) =>
        ranking[first.status] - ranking[second.status],
    )[0]?.status || "not_enough_data"
  );
}

function normaliseRole(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}


function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={`nova-info-tip ${open ? "open" : ""}`}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="More information"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
      >
        i
      </button>
      <span role="tooltip">{text}</span>
    </span>
  );
}

function MetricBox({
  label,
  value,
  help,
}: {
  label: string;
  value: string;
  help: string;
}) {
  return (
    <div className="nova-mastery-metric-box">
      <span>
        {label}
        <InfoTip text={help} />
      </span>
      <strong>{value}</strong>
    </div>
  );
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
  const [profileView, setProfileView] =
    useState<ProfileView>("overview");
  const [profileSubjectFilter, setProfileSubjectFilter] =
    useState<"all" | "english" | "math" | "science">("all");
  const [profilePayload, setProfilePayload] =
    useState<LearningProfilePayload | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileRefreshing, setProfileRefreshing] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [expandedTopics, setExpandedTopics] =
    useState<Set<string>>(new Set());

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
    setProfilePayload(null);
    setProfileError("");
    setExpandedTopics(new Set());
    setProfileView("overview");
    setProfileSubjectFilter("all");
  }, [studentUserId]);

  useEffect(() => {
    if (
      !open ||
      tab !== "profile" ||
      !learningProfileUnlocked ||
      !studentUserId ||
      profilePayload ||
      profileLoading
    ) {
      return;
    }

    void loadLearningProfile(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    tab,
    learningProfileUnlocked,
    studentUserId,
    profilePayload,
    profileLoading,
  ]);

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

  async function loadLearningProfile(refresh: boolean) {
    if (!studentUserId || !learningProfileUnlocked) return;

    if (refresh) {
      setProfileRefreshing(true);
    } else {
      setProfileLoading(true);
    }

    setProfileError("");

    const functionName = refresh
      ? "admin_refresh_learning_profile"
      : "admin_get_learning_profile";

    const { data, error } = await supabase.rpc(functionName, {
      p_student_user_id: studentUserId,
    });

    if (error) {
      console.warn(
        "Nova Learning Profile load failed:",
        error.message,
      );
      setProfileError(
        "Nova could not load the persistent Learning Profile. Confirm that Phases 1–2 and 2B.5 were installed successfully.",
      );
    } else {
      setProfilePayload(data as LearningProfilePayload);
    }

    setProfileLoading(false);
    setProfileRefreshing(false);
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

  const subjectsWithData = displayedSubjects.filter(
    (subject) => subject.questions > 0,
  );

  const strongestSubject = [...subjectsWithData].sort(
    (first, second) => second.accuracy - first.accuracy,
  )[0] ?? null;

  const prioritySubject = [...subjectsWithData].sort(
    (first, second) => first.accuracy - second.accuracy,
  )[0] ?? null;

  const profileSubjectSummaries =
    profilePayload?.subject_summaries || [];
  const profileSkills = profilePayload?.skills || [];
  const profilePatterns = profilePayload?.patterns || [];
  const profileInsights = profilePayload?.insights || [];
  const resolvedProfileInsights =
    profilePayload?.resolved_insights || [];
  const profileTimeline = profilePayload?.timeline || [];

  const profileTopicGroups = useMemo<ProfileTopicGroup[]>(() => {
    const groups = new Map<
      string,
      {
        subject: string;
        primaryLevel: number;
        domain: string;
        topic: string;
        topicSkill: ProfileSkill | null;
        granularSkills: ProfileSkill[];
      }
    >();

    for (const skill of profileSkills) {
      const subject = String(skill.subject || "").toLowerCase();
      const topic = String(skill.topic || skill.skill_name || "Other");
      const key = [
        subject,
        skill.primary_level,
        topic.toLowerCase(),
      ].join(":");

      const existing = groups.get(key) || {
        subject,
        primaryLevel: safeNumber(skill.primary_level),
        domain: String(skill.domain || ""),
        topic,
        topicSkill: null,
        granularSkills: [],
      };

      if (skill.is_topic_level) {
        existing.topicSkill = skill;
      } else {
        existing.granularSkills.push(skill);
      }

      groups.set(key, existing);
    }

    const subjectOrder: Record<string, number> = {
      english: 1,
      math: 2,
      science: 3,
    };

    return [...groups.entries()]
      .map(([key, group]): ProfileTopicGroup => {
        const granular = group.granularSkills.sort(
          (first, second) =>
            first.skill_name.localeCompare(second.skill_name),
        );

        const mappingRows = granular.filter(
          (skill) => skill.mapping_coverage !== null,
        );

        const mappingCoverage =
          mappingRows.length > 0
            ? Math.round(
                (mappingRows.reduce(
                  (sum, skill) =>
                    sum + safeNumber(skill.mapping_coverage),
                  0,
                ) /
                  mappingRows.length) *
                  10,
              ) / 10
            : null;

        const statusRows =
          granular.filter(
            (skill) =>
              skill.granular_eligible ||
              skill.evidence_quality === "ready",
          ).length > 0
            ? granular.filter(
                (skill) =>
                  skill.granular_eligible ||
                  skill.evidence_quality === "ready",
              )
            : granular;

        const lastDates = [
          group.topicSkill?.last_attempted_at,
          ...granular.map((skill) => skill.last_attempted_at),
        ]
          .filter(Boolean)
          .map((value) => new Date(String(value)))
          .filter((date) => !Number.isNaN(date.getTime()))
          .sort(
            (first, second) =>
              second.getTime() - first.getTime(),
          );

        return {
          key,
          subject: group.subject,
          primaryLevel: group.primaryLevel,
          domain: group.domain,
          topic: group.topic,
          topicSkill: group.topicSkill,
          granularSkills: granular,
          masteryScore: group.topicSkill
            ? safeNumber(group.topicSkill.mastery_score)
            : weightedAverage(granular, "mastery_score"),
          confidenceScore: group.topicSkill
            ? safeNumber(group.topicSkill.confidence_score)
            : weightedAverage(granular, "confidence_score"),
          mappingCoverage,
          status: group.topicSkill?.status ||
            weakestProfileStatus(statusRows),
          readySkills: granular.filter(
            (skill) =>
              skill.granular_eligible &&
              skill.evidence_quality === "ready",
          ).length,
          totalSkills: granular.length,
          lastActivityAt:
            lastDates[0]?.toISOString() || null,
        };
      })
      .sort(
        (first, second) =>
          (subjectOrder[first.subject] || 99) -
            (subjectOrder[second.subject] || 99) ||
          first.primaryLevel - second.primaryLevel ||
          first.topic.localeCompare(second.topic),
      );
  }, [profileSkills]);

  const filteredProfileTopicGroups = profileTopicGroups.filter(
    (group) =>
      profileSubjectFilter === "all" ||
      group.subject === profileSubjectFilter,
  );

  const strongestProfileSubject = [...profileSubjectSummaries].sort(
    (first, second) =>
      safeNumber(second.mastery_score) -
      safeNumber(first.mastery_score),
  )[0] || null;

  const priorityProfileSubject = [...profileSubjectSummaries].sort(
    (first, second) =>
      safeNumber(first.mastery_score) -
      safeNumber(second.mastery_score),
  )[0] || null;

  const profileSnapshot = profilePayload?.latest_snapshot || {};
  const granularReadyCount = profileSkills.filter(
    (skill) =>
      !skill.is_topic_level &&
      skill.granular_eligible &&
      skill.evidence_quality === "ready",
  ).length;

  function toggleTopic(topicKey: string) {
    setExpandedTopics((current) => {
      const next = new Set(current);

      if (next.has(topicKey)) {
        next.delete(topicKey);
      } else {
        next.add(topicKey);
      }

      return next;
    });
  }

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
        aria-label="Nova Personal Learning Coach"
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
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="nova-vt-close"
            aria-label="Close Nova Personal Learning Coach"
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
            <section className="nova-vt-profile-section">
              <div className="nova-vt-profile-heading">
                <div>
                  <p className="nova-vt-eyebrow">Persistent learner record</p>
                  <h3>{studentLabel}’s Learning Profile</h3>
                  <p>
                    Nova combines recorded Learning Missions activity,
                    question-level evidence and long-term trends into one
                    structured profile.
                  </p>
                </div>

                <div className="nova-profile-heading-actions">
                  <span className="nova-vt-admin-badge">
                    Admin only
                  </span>
                  <button
                    type="button"
                    className="nova-profile-refresh-button"
                    disabled={
                      profileLoading ||
                      profileRefreshing ||
                      !studentUserId
                    }
                    onClick={() =>
                      void loadLearningProfile(true)
                    }
                  >
                    {profileRefreshing
                      ? "Refreshing…"
                      : "Refresh profile"}
                  </button>
                </div>
              </div>

              <div className="nova-profile-safety-note">
                <span>
                  The profile describes recorded learning evidence.
                </span>
                <InfoTip text="Nova reports patterns found in saved academic activity. It does not diagnose ability, personality or a learning condition." />
              </div>

              <nav
                className="nova-profile-nav"
                aria-label="Learning Profile sections"
              >
                {(
                  [
                    ["overview", "Overview"],
                    ["mastery", "Mastery Map"],
                    ["patterns", "Learning Patterns"],
                    ["timeline", "Development Timeline"],
                    ["insights", "Nova’s Understanding"],
                  ] as Array<[ProfileView, string]>
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      profileView === value ? "active" : ""
                    }
                    onClick={() => setProfileView(value)}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              {profileLoading && (
                <div className="nova-profile-loading">
                  Building the persistent Learning Profile…
                </div>
              )}

              {profileError && (
                <div className="nova-vt-message error">
                  {profileError}
                </div>
              )}

              {!profileLoading &&
                !profileError &&
                !profilePayload && (
                  <div className="nova-profile-empty">
                    No persistent Learning Profile payload was returned.
                  </div>
                )}

              {!profileLoading &&
                profilePayload &&
                profileView === "overview" && (
                  <div className="nova-profile-view">
                    <div className="nova-vt-profile-overview">
                      <article>
                        <span>Overall mastery</span>
                        <strong>
                          {profileSnapshot.overall_mastery !== null &&
                          profileSnapshot.overall_mastery !== undefined
                            ? `${Math.round(
                                safeNumber(
                                  profileSnapshot.overall_mastery,
                                ),
                              )}%`
                            : `${Math.round(
                                displayedAccuracy,
                              )}%`}
                        </strong>
                        <p>
                          Combined curriculum evidence currently
                          available to Nova.
                        </p>
                      </article>

                      <article>
                        <span>Profile confidence</span>
                        <strong>
                          {profileSnapshot.profile_confidence !== null &&
                          profileSnapshot.profile_confidence !== undefined
                            ? `${Math.round(
                                safeNumber(
                                  profileSnapshot.profile_confidence,
                                ),
                              )}%`
                            : titleCase(
                                analytics?.confidence || "medium",
                              )}
                        </strong>
                        <p>
                          Confidence rises as evidence covers more
                          questions, skills and weeks.
                        </p>
                      </article>

                      <article>
                        <span>Specific skills ready</span>
                        <strong>{granularReadyCount}</strong>
                        <p>
                          Granular skills with enough direct evidence
                          and mapping coverage.
                        </p>
                      </article>

                      <article>
                        <span>Questions recorded</span>
                        <strong>
                          {safeNumber(
                            profileSnapshot.source_question_count,
                            clientAnswerCount,
                          )}
                        </strong>
                        <p>
                          Verified answer records contributing to the
                          current profile.
                        </p>
                      </article>
                    </div>

                    <div className="nova-vt-profile-columns">
                      <article className="nova-vt-profile-card">
                        <div className="nova-profile-card-heading">
                          <div>
                            <p className="nova-vt-eyebrow">
                              Current understanding
                            </p>
                            <h4>What Nova knows now</h4>
                          </div>
                          <InfoTip text="These conclusions are recalculated from stored evidence. They may change as the learner completes more work." />
                        </div>

                        <div className="nova-vt-profile-facts">
                          <div>
                            <span>Strongest current subject</span>
                            <strong>
                              {strongestProfileSubject
                                ? `${profileSubjectLabel(
                                    strongestProfileSubject.subject,
                                  )} · ${Math.round(
                                    safeNumber(
                                      strongestProfileSubject.mastery_score,
                                    ),
                                  )}% mastery`
                                : strongestSubject
                                  ? `${strongestSubject.label} · ${strongestSubject.accuracy}%`
                                  : "More activity needed"}
                            </strong>
                          </div>

                          <div>
                            <span>Highest-priority subject</span>
                            <strong>
                              {priorityProfileSubject
                                ? `${profileSubjectLabel(
                                    priorityProfileSubject.subject,
                                  )} · ${Math.round(
                                    safeNumber(
                                      priorityProfileSubject.mastery_score,
                                    ),
                                  )}% mastery`
                                : prioritySubject
                                  ? `${prioritySubject.label} · ${prioritySubject.accuracy}%`
                                  : "More activity needed"}
                            </strong>
                          </div>

                          <div>
                            <span>Current priority skills</span>
                            <strong>
                              {profileInsights.filter(
                                (insight) =>
                                  insight.insight_type ===
                                    "persistent_weakness" ||
                                  insight.insight_type ===
                                    "review_due",
                              ).length > 0
                                ? profileInsights
                                    .filter(
                                      (insight) =>
                                        insight.insight_type ===
                                          "persistent_weakness" ||
                                        insight.insight_type ===
                                          "review_due",
                                    )
                                    .slice(0, 3)
                                    .map(
                                      (insight) => insight.title,
                                    )
                                    .join(", ")
                                : weaknesses.length > 0
                                  ? weaknesses
                                      .slice(0, 3)
                                      .map((area) => area.label)
                                      .join(", ")
                                  : "No reliable priority detected yet"}
                            </strong>
                          </div>

                          <div>
                            <span>Current weekly direction</span>
                            <strong>{displayedSummary}</strong>
                          </div>
                        </div>
                      </article>

                      <article className="nova-vt-profile-card">
                        <p className="nova-vt-eyebrow">
                          Academic data coverage
                        </p>
                        <h4>Connected Learning Missions</h4>

                        <div className="nova-vt-source-list">
                          {(
                            [
                              ["english", "English Missions"],
                              ["math", "Mathematics Missions"],
                              ["science", "Science Missions"],
                            ] as const
                          ).map(([subject, label]) => {
                            const summary =
                              profileSubjectSummaries.find(
                                (row) =>
                                  row.subject === subject,
                              );
                            const skillCount =
                              profileSkills.filter(
                                (skill) =>
                                  skill.subject === subject,
                              ).length;

                            return (
                              <div
                                key={subject}
                                className={
                                  summary || skillCount > 0
                                    ? "connected"
                                    : "pending"
                                }
                              >
                                <span>
                                  {summary || skillCount > 0
                                    ? "✓"
                                    : "…"}
                                </span>
                                <div>
                                  <strong>{label}</strong>
                                  <small>
                                    {summary
                                      ? `${summary.questions_attempted} questions · ${skillCount} profile rows`
                                      : "Waiting for recorded activity"}
                                  </small>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </article>
                    </div>

                    <section className="nova-profile-insight-strip">
                      <div className="nova-profile-card-heading">
                        <div>
                          <p className="nova-vt-eyebrow">
                            Latest evidence-backed findings
                          </p>
                          <h4>What deserves attention</h4>
                        </div>
                        <InfoTip text="A specific weakness is shown only after repeated direct errors across different questions and attempts. Secondary supporting mappings cannot create a misconception by themselves." />
                      </div>

                      {profileInsights.length === 0 ? (
                        <p className="nova-profile-muted-copy">
                          More completed mapped questions are needed
                          before Nova can form a reliable long-term
                          finding.
                        </p>
                      ) : (
                        <div className="nova-profile-insight-grid">
                          {profileInsights
                            .slice(0, 4)
                            .map((insight) => (
                              <article
                                key={insight.id}
                                className={`severity-${insight.severity}`}
                              >
                                <span>
                                  {profileSubjectLabel(
                                    insight.subject,
                                  )}
                                </span>
                                <strong>{insight.title}</strong>
                                <p>{insight.summary}</p>
                              </article>
                            ))}
                        </div>
                      )}
                    </section>
                  </div>
                )}

              {!profileLoading &&
                profilePayload &&
                profileView === "mastery" && (
                  <div className="nova-profile-view">
                    <div className="nova-profile-section-heading">
                      <div>
                        <p className="nova-vt-eyebrow">
                          Curriculum understanding
                        </p>
                        <h4>
                          Mastery Map
                          <InfoTip text="Mastery Map shows broad curriculum areas and the specific skills Nova has enough evidence to assess. Select a topic to view the skills underneath." />
                        </h4>
                        <p>
                          Select a topic to see the specific skills,
                          evidence quality and recent learning signals
                          underneath it.
                        </p>
                      </div>

                      <div className="nova-profile-subject-filter">
                        {(
                          [
                            ["all", "All"],
                            ["english", "English"],
                            ["math", "Mathematics"],
                            ["science", "Science"],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            className={
                              profileSubjectFilter === value
                                ? "active"
                                : ""
                            }
                            onClick={() =>
                              setProfileSubjectFilter(value)
                            }
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {filteredProfileTopicGroups.length === 0 ? (
                      <div className="nova-profile-empty">
                        No mastery rows are available for the selected
                        subject yet.
                      </div>
                    ) : (
                      <div className="nova-mastery-map">
                        {filteredProfileTopicGroups.map((group) => {
                          const expanded =
                            expandedTopics.has(group.key);

                          return (
                            <article
                              key={group.key}
                              className={`nova-mastery-topic ${expanded ? "expanded" : ""}`}
                            >
                              <button
                                type="button"
                                className="nova-mastery-topic-row"
                                onClick={() =>
                                  toggleTopic(group.key)
                                }
                                aria-expanded={expanded}
                              >
                                <div className="nova-mastery-topic-title">
                                  <span
                                    className="nova-mastery-subject-dot"
                                    style={{
                                      background:
                                        subjectAccent(
                                          group.subject,
                                        ),
                                    }}
                                  />
                                  <div>
                                    <small>
                                      {profileSubjectLabel(
                                        group.subject,
                                      )}{" "}
                                      · Primary {group.primaryLevel}
                                      {group.domain
                                        ? ` · ${group.domain}`
                                        : ""}
                                    </small>
                                    <strong>{group.topic}</strong>
                                    <p>
                                      {group.totalSkills > 0
                                        ? `${group.readySkills} of ${group.totalSkills} specific skills have reliable evidence`
                                        : "Broad topic evidence only"}
                                    </p>
                                  </div>
                                </div>

                                <div className="nova-mastery-topic-metrics">
                                  <div>
                                    <span>Mastery</span>
                                    <strong>
                                      {Math.round(
                                        group.masteryScore,
                                      )}
                                      %
                                    </strong>
                                  </div>
                                  <div>
                                    <span>Confidence</span>
                                    <strong>
                                      {Math.round(
                                        group.confidenceScore,
                                      )}
                                      %
                                    </strong>
                                  </div>
                                  <div>
                                    <span>Status</span>
                                    <strong
                                      className={`status-${group.status}`}
                                    >
                                      {profileStatusLabel(
                                        group.status,
                                      )}
                                    </strong>
                                  </div>
                                  <span className="nova-mastery-arrow">
                                    {expanded ? "⌃" : "⌄"}
                                  </span>
                                </div>
                              </button>

                              {expanded && (
                                <div className="nova-mastery-topic-detail">
                                  {group.topicSkill && (
                                    <div className="nova-mastery-broad-row">
                                      <div>
                                        <span>Broad topic result</span>
                                        <strong>
                                          {profileStatusLabel(
                                            group.topicSkill.status,
                                          )}
                                        </strong>
                                      </div>
                                      <p>
                                        Based on{" "}
                                        {
                                          group.topicSkill
                                            .questions_attempted
                                        }{" "}
                                        recorded questions across{" "}
                                        {
                                          group.topicSkill
                                            .unique_activities
                                        }{" "}
                                        activities.
                                      </p>
                                    </div>
                                  )}

                                  {group.granularSkills.length === 0 ? (
                                    <div className="nova-mastery-no-skills">
                                      Nova will show specific skills here
                                      after more questions have been
                                      mapped and attempted.
                                    </div>
                                  ) : (
                                    <div className="nova-mastery-skill-list">
                                      {group.granularSkills.map(
                                        (skill) => (
                                          <article
                                            key={skill.skill_id}
                                            className="nova-mastery-skill"
                                          >
                                            <div className="nova-mastery-skill-heading">
                                              <div>
                                                <span>
                                                  {skill.skill_code}
                                                </span>
                                                <h5>
                                                  {skill.skill_name}
                                                  {skill.public_explanation && (
                                                    <InfoTip
                                                      text={
                                                        skill.public_explanation
                                                      }
                                                    />
                                                  )}
                                                </h5>
                                              </div>

                                              <span
                                                className={`nova-mastery-status status-${skill.status}`}
                                              >
                                                {profileStatusLabel(
                                                  skill.status,
                                                )}
                                              </span>
                                            </div>

                                            <div className="nova-mastery-skill-metrics">
                                              <MetricBox
                                                label="Mastery"
                                                value={`${Math.round(
                                                  safeNumber(
                                                    skill.mastery_score,
                                                  ),
                                                )}%`}
                                                help="Mastery combines recent accuracy, longer-term accuracy, repeated evidence and recency."
                                              />
                                              <MetricBox
                                                label="Confidence"
                                                value={`${Math.round(
                                                  safeNumber(
                                                    skill.confidence_score,
                                                  ),
                                                )}%`}
                                                help="Confidence measures how much evidence supports the mastery estimate. It is separate from the mastery score."
                                              />
                                              <MetricBox
                                                label="Mapping coverage"
                                                value={
                                                  skill.mapping_coverage ===
                                                    null ||
                                                  skill.mapping_coverage ===
                                                    undefined
                                                    ? "Building"
                                                    : `${Math.round(
                                                        safeNumber(
                                                          skill.mapping_coverage,
                                                        ),
                                                      )}%`
                                                }
                                                help="Mapping coverage shows how much of the related question bank has approved skill mappings."
                                              />
                                              <MetricBox
                                                label="Direct questions"
                                                value={String(
                                                  skill.primary_unique_questions,
                                                )}
                                                help="Direct questions are questions where this was the primary skill being tested."
                                              />
                                            </div>

                                            <div className="nova-mastery-evidence-row">
                                              <div>
                                                <span>
                                                  Evidence quality
                                                </span>
                                                <strong>
                                                  {evidenceQualityLabel(
                                                    skill.evidence_quality,
                                                  )}
                                                </strong>
                                              </div>
                                              <div>
                                                <span>
                                                  Direct attempts
                                                </span>
                                                <strong>
                                                  {
                                                    skill.primary_unique_attempts
                                                  }
                                                </strong>
                                              </div>
                                              <div>
                                                <span>
                                                  Recent direct errors
                                                </span>
                                                <strong>
                                                  {
                                                    skill.recent_primary_wrong_answers
                                                  }
                                                </strong>
                                              </div>
                                              <div>
                                                <span>Trend</span>
                                                <strong>
                                                  {titleCase(
                                                    skill.trend,
                                                  )}
                                                  {skill.trend_points !==
                                                    null &&
                                                  skill.trend_points !==
                                                    undefined
                                                    ? ` · ${
                                                        skill
                                                          .trend_points >
                                                        0
                                                          ? "+"
                                                          : ""
                                                      }${Math.round(
                                                        safeNumber(
                                                          skill.trend_points,
                                                        ),
                                                      )} pts`
                                                    : ""}
                                                </strong>
                                              </div>
                                              <div>
                                                <span>Last activity</span>
                                                <strong>
                                                  {formatProfileDate(
                                                    skill.last_attempted_at,
                                                  )}
                                                </strong>
                                              </div>
                                            </div>

                                            {!skill.granular_eligible && (
                                              <p className="nova-mastery-building-note">
                                                This skill remains in
                                                evidence-building mode and
                                                will not be presented as a
                                                firm strength or weakness
                                                yet.
                                              </p>
                                            )}
                                          </article>
                                        ),
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

              {!profileLoading &&
                profilePayload &&
                profileView === "patterns" && (
                  <div className="nova-profile-view">
                    <div className="nova-profile-section-heading">
                      <div>
                        <p className="nova-vt-eyebrow">
                          Recorded study behaviour
                        </p>
                        <h4>
                          Learning Patterns
                          <InfoTip text="These patterns describe recorded activity, such as consistency or retry behaviour. They are not personality labels or diagnoses." />
                        </h4>
                        <p>
                          Patterns are calculated from completed work
                          over time and remain separate from academic
                          mastery.
                        </p>
                      </div>
                    </div>

                    {profilePatterns.length === 0 ? (
                      <div className="nova-profile-empty">
                        More activity over several weeks is needed
                        before learning patterns can be calculated.
                      </div>
                    ) : (
                      <div className="nova-pattern-grid">
                        {profilePatterns.map((pattern) => (
                          <article key={pattern.id}>
                            <div className="nova-pattern-heading">
                              <span>
                                {profileSubjectLabel(
                                  pattern.subject,
                                )}
                              </span>
                              <strong>
                                {Math.round(
                                  safeNumber(
                                    pattern.confidence_score,
                                  ),
                                )}
                                % confidence
                              </strong>
                            </div>
                            <h5>
                              {patternLabel(
                                pattern.pattern_key,
                              )}
                            </h5>
                            <div className="nova-pattern-value">
                              {formatPatternValue(
                                pattern.current_value,
                                pattern.unit,
                              )}
                            </div>
                            <p>
                              {pattern.interpretation ||
                                "Nova needs more evidence before describing this pattern."}
                            </p>
                            <small>
                              {pattern.evidence_count} evidence
                              record
                              {pattern.evidence_count === 1
                                ? ""
                                : "s"}
                            </small>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              {!profileLoading &&
                profilePayload &&
                profileView === "timeline" && (
                  <div className="nova-profile-view">
                    <div className="nova-profile-section-heading">
                      <div>
                        <p className="nova-vt-eyebrow">
                          Long-term development
                        </p>
                        <h4>Development Timeline</h4>
                        <p>
                          Weekly, monthly and manual snapshots show how
                          the recorded profile changes over time.
                        </p>
                      </div>
                    </div>

                    {profileTimeline.length === 0 ? (
                      <div className="nova-profile-empty">
                        The first timeline point will appear after a
                        Learning Profile snapshot has been generated.
                      </div>
                    ) : (
                      <div className="nova-timeline">
                        {profileTimeline.map((snapshot) => (
                          <article key={snapshot.id}>
                            <div className="nova-timeline-marker" />
                            <div className="nova-timeline-card">
                              <div className="nova-timeline-heading">
                                <div>
                                  <span>
                                    {titleCase(
                                      snapshot.snapshot_type,
                                    )}{" "}
                                    snapshot
                                  </span>
                                  <h5>
                                    {formatProfileDate(
                                      snapshot.snapshot_date,
                                    )}
                                  </h5>
                                </div>
                                <strong>
                                  {snapshot.overall_mastery !== null
                                    ? `${Math.round(
                                        safeNumber(
                                          snapshot.overall_mastery,
                                        ),
                                      )}% mastery`
                                    : "Mastery building"}
                                </strong>
                              </div>

                              <div className="nova-timeline-metrics">
                                <div>
                                  <span>Confidence</span>
                                  <strong>
                                    {snapshot.profile_confidence !==
                                    null
                                      ? `${Math.round(
                                          safeNumber(
                                            snapshot.profile_confidence,
                                          ),
                                        )}%`
                                      : "—"}
                                  </strong>
                                </div>
                                <div>
                                  <span>Strongest subject</span>
                                  <strong>
                                    {profileSubjectLabel(
                                      snapshot.strongest_subject,
                                    ) || "—"}
                                  </strong>
                                </div>
                                <div>
                                  <span>Priority subject</span>
                                  <strong>
                                    {profileSubjectLabel(
                                      snapshot.priority_subject,
                                    ) || "—"}
                                  </strong>
                                </div>
                                <div>
                                  <span>Questions recorded</span>
                                  <strong>
                                    {
                                      snapshot.source_question_count
                                    }
                                  </strong>
                                </div>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              {!profileLoading &&
                profilePayload &&
                profileView === "insights" && (
                  <div className="nova-profile-view">
                    <div className="nova-profile-section-heading">
                      <div>
                        <p className="nova-vt-eyebrow">
                          Evidence-backed interpretation
                        </p>
                        <h4>
                          Nova’s Understanding
                          <InfoTip text="Nova explains calculations already produced by deterministic analytics. AI wording does not alter mastery scores, evidence counts or reward eligibility." />
                        </h4>
                        <p>
                          Active findings remain visible while the
                          supporting evidence is current. Resolved
                          findings remain in history.
                        </p>
                      </div>
                    </div>

                    <div className="nova-understanding-columns">
                      <section>
                        <div className="nova-understanding-title">
                          <h5>Active findings</h5>
                          <span>{profileInsights.length}</span>
                        </div>

                        {profileInsights.length === 0 ? (
                          <div className="nova-profile-empty compact">
                            No active long-term finding is currently
                            supported by enough evidence.
                          </div>
                        ) : (
                          <div className="nova-understanding-list">
                            {profileInsights.map((insight) => (
                              <article
                                key={insight.id}
                                className={`severity-${insight.severity}`}
                              >
                                <div>
                                  <span>
                                    {profileSubjectLabel(
                                      insight.subject,
                                    )}{" "}
                                    ·{" "}
                                    {titleCase(
                                      insight.insight_type,
                                    )}
                                  </span>
                                  <strong>{insight.title}</strong>
                                </div>
                                <p>{insight.summary}</p>
                                <footer>
                                  <span>
                                    {Math.round(
                                      safeNumber(
                                        insight.confidence_score,
                                      ),
                                    )}
                                    % confidence
                                  </span>
                                  <span>
                                    Confirmed{" "}
                                    {formatProfileDate(
                                      insight.last_confirmed_at,
                                    )}
                                  </span>
                                </footer>
                              </article>
                            ))}
                          </div>
                        )}
                      </section>

                      <section>
                        <div className="nova-understanding-title">
                          <h5>Resolved history</h5>
                          <span>
                            {resolvedProfileInsights.length}
                          </span>
                        </div>

                        {resolvedProfileInsights.length === 0 ? (
                          <div className="nova-profile-empty compact">
                            Resolved findings will appear here as the
                            learner’s evidence changes.
                          </div>
                        ) : (
                          <div className="nova-understanding-list resolved">
                            {resolvedProfileInsights
                              .slice(0, 20)
                              .map((insight) => (
                                <article key={insight.id}>
                                  <div>
                                    <span>
                                      {profileSubjectLabel(
                                        insight.subject,
                                      )}
                                    </span>
                                    <strong>
                                      {insight.title}
                                    </strong>
                                  </div>
                                  <p>{insight.summary}</p>
                                  <footer>
                                    <span>
                                      Resolved{" "}
                                      {formatProfileDate(
                                        insight.resolved_at,
                                      )}
                                    </span>
                                  </footer>
                                </article>
                              ))}
                          </div>
                        )}
                      </section>
                    </div>
                  </div>
                )}
            </section>
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

          .nova-profile-heading-actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            flex-wrap: wrap;
            gap: 10px;
          }

          .nova-profile-refresh-button {
            min-height: 38px;
            padding: 0 13px;
            border-radius: 11px;
            border: 1px solid rgba(126, 232, 255, 0.24);
            background: rgba(255, 255, 255, 0.055);
            color: white;
            font-size: 12px;
            font-weight: 800;
            cursor: pointer;
          }

          .nova-profile-refresh-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .nova-profile-safety-note {
            margin-top: 14px;
            display: flex;
            align-items: center;
            gap: 7px;
            color: rgba(235, 247, 255, 0.52);
            font-size: 12px;
          }

          .nova-info-tip {
            position: relative;
            display: inline-flex;
            align-items: center;
            margin-left: 6px;
            vertical-align: middle;
          }

          .nova-info-tip > button {
            width: 20px;
            height: 20px;
            padding: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            border: 1px solid rgba(126, 232, 255, 0.32);
            background: rgba(83, 215, 255, 0.08);
            color: #a9efff;
            font-size: 11px;
            font-weight: 900;
            cursor: pointer;
          }

          .nova-info-tip > span {
            position: absolute;
            z-index: 60;
            left: 50%;
            bottom: calc(100% + 9px);
            width: min(310px, 72vw);
            padding: 10px 11px;
            border-radius: 11px;
            border: 1px solid rgba(126, 232, 255, 0.24);
            background: #06152d;
            color: rgba(255, 255, 255, 0.86);
            font-size: 11px;
            font-weight: 500;
            line-height: 1.5;
            text-align: left;
            box-shadow: 0 18px 50px rgba(0, 0, 0, 0.48);
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transform: translate(-50%, 5px);
            transition:
              opacity 0.16s ease,
              transform 0.16s ease,
              visibility 0.16s ease;
          }

          .nova-info-tip:hover > span,
          .nova-info-tip:focus-within > span,
          .nova-info-tip.open > span {
            opacity: 1;
            visibility: visible;
            transform: translate(-50%, 0);
          }

          .nova-profile-nav {
            margin-top: 18px;
            display: flex;
            gap: 8px;
            overflow-x: auto;
            padding-bottom: 5px;
            scrollbar-width: thin;
          }

          .nova-profile-nav button {
            flex: 0 0 auto;
            min-height: 42px;
            padding: 0 14px;
            border-radius: 12px;
            border: 1px solid rgba(126, 232, 255, 0.12);
            background: rgba(255, 255, 255, 0.035);
            color: rgba(255, 255, 255, 0.58);
            font-size: 12px;
            font-weight: 850;
            cursor: pointer;
          }

          .nova-profile-nav button.active {
            border-color: rgba(126, 232, 255, 0.44);
            background: rgba(83, 215, 255, 0.12);
            color: white;
            box-shadow: 0 0 24px rgba(83, 215, 255, 0.1);
          }

          .nova-profile-view {
            margin-top: 16px;
          }

          .nova-profile-loading,
          .nova-profile-empty {
            margin-top: 16px;
            padding: 25px 18px;
            border-radius: 15px;
            border: 1px dashed rgba(126, 232, 255, 0.18);
            background: rgba(255, 255, 255, 0.025);
            color: rgba(235, 247, 255, 0.55);
            font-size: 13px;
            text-align: center;
            line-height: 1.55;
          }

          .nova-profile-empty.compact {
            margin-top: 10px;
            padding: 17px 13px;
          }

          .nova-profile-card-heading,
          .nova-profile-section-heading {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
          }

          .nova-profile-card-heading h4,
          .nova-profile-section-heading h4 {
            margin: 6px 0 0;
            display: flex;
            align-items: center;
            font-size: 21px;
          }

          .nova-profile-section-heading > div > p:last-child {
            max-width: 780px;
            margin: 9px 0 0;
            color: rgba(235, 247, 255, 0.52);
            font-size: 13px;
            line-height: 1.55;
          }

          .nova-profile-insight-strip {
            margin-top: 15px;
            padding: 18px;
            border-radius: 18px;
            border: 1px solid rgba(126, 232, 255, 0.12);
            background: rgba(255, 255, 255, 0.026);
          }

          .nova-profile-insight-grid {
            margin-top: 13px;
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
          }

          .nova-profile-insight-grid article {
            min-width: 0;
            padding: 13px;
            border-radius: 13px;
            border: 1px solid rgba(126, 232, 255, 0.1);
            background: rgba(255, 255, 255, 0.03);
          }

          .nova-profile-insight-grid article.severity-high,
          .nova-understanding-list article.severity-high {
            border-color: rgba(248, 113, 113, 0.3);
            background: rgba(239, 68, 68, 0.065);
          }

          .nova-profile-insight-grid article.severity-medium,
          .nova-understanding-list article.severity-medium {
            border-color: rgba(250, 204, 21, 0.25);
            background: rgba(234, 179, 8, 0.055);
          }

          .nova-profile-insight-grid article > span {
            color: #8dfcff;
            font-size: 9px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }

          .nova-profile-insight-grid article > strong {
            display: block;
            margin-top: 7px;
            font-size: 14px;
            line-height: 1.35;
          }

          .nova-profile-insight-grid article > p,
          .nova-profile-muted-copy {
            margin: 8px 0 0;
            color: rgba(235, 247, 255, 0.52);
            font-size: 11px;
            line-height: 1.55;
          }

          .nova-profile-subject-filter {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            gap: 7px;
          }

          .nova-profile-subject-filter button {
            min-height: 36px;
            padding: 0 11px;
            border-radius: 10px;
            border: 1px solid rgba(126, 232, 255, 0.12);
            background: rgba(255, 255, 255, 0.035);
            color: rgba(255, 255, 255, 0.56);
            font-size: 11px;
            font-weight: 800;
            cursor: pointer;
          }

          .nova-profile-subject-filter button.active {
            border-color: rgba(126, 232, 255, 0.42);
            background: rgba(83, 215, 255, 0.12);
            color: white;
          }

          .nova-mastery-map {
            margin-top: 15px;
            display: grid;
            gap: 10px;
          }

          .nova-mastery-topic {
            overflow: hidden;
            border-radius: 17px;
            border: 1px solid rgba(126, 232, 255, 0.11);
            background: rgba(255, 255, 255, 0.025);
          }

          .nova-mastery-topic.expanded {
            border-color: rgba(126, 232, 255, 0.26);
            box-shadow: 0 0 28px rgba(83, 215, 255, 0.06);
          }

          .nova-mastery-topic-row {
            width: 100%;
            min-height: 96px;
            padding: 15px 17px;
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: center;
            gap: 20px;
            border: 0;
            background: transparent;
            color: white;
            text-align: left;
            cursor: pointer;
          }

          .nova-mastery-topic-title {
            min-width: 0;
            display: flex;
            align-items: flex-start;
            gap: 12px;
          }

          .nova-mastery-subject-dot {
            width: 10px;
            height: 10px;
            margin-top: 7px;
            flex: 0 0 auto;
            border-radius: 999px;
            box-shadow: 0 0 14px currentColor;
          }

          .nova-mastery-topic-title small {
            color: rgba(235, 247, 255, 0.42);
            font-size: 9px;
            font-weight: 850;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .nova-mastery-topic-title strong {
            display: block;
            margin-top: 5px;
            font-size: 17px;
          }

          .nova-mastery-topic-title p {
            margin: 5px 0 0;
            color: rgba(235, 247, 255, 0.48);
            font-size: 11px;
          }

          .nova-mastery-topic-metrics {
            display: flex;
            align-items: center;
            gap: 18px;
          }

          .nova-mastery-topic-metrics > div {
            display: grid;
            gap: 4px;
            text-align: right;
          }

          .nova-mastery-topic-metrics span {
            color: rgba(235, 247, 255, 0.4);
            font-size: 9px;
            font-weight: 850;
            text-transform: uppercase;
            letter-spacing: 0.07em;
          }

          .nova-mastery-topic-metrics strong {
            font-size: 13px;
          }

          .nova-mastery-arrow {
            color: #8dfcff !important;
            font-size: 18px !important;
          }

          .nova-mastery-topic-detail {
            padding: 0 17px 17px;
            border-top: 1px solid rgba(126, 232, 255, 0.08);
          }

          .nova-mastery-broad-row {
            margin-top: 13px;
            padding: 11px 13px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.026);
          }

          .nova-mastery-broad-row > div {
            display: grid;
            gap: 3px;
          }

          .nova-mastery-broad-row span {
            color: rgba(235, 247, 255, 0.42);
            font-size: 9px;
            font-weight: 850;
            text-transform: uppercase;
          }

          .nova-mastery-broad-row strong {
            font-size: 12px;
          }

          .nova-mastery-broad-row p {
            margin: 0;
            color: rgba(235, 247, 255, 0.48);
            font-size: 11px;
          }

          .nova-mastery-no-skills {
            margin-top: 13px;
            padding: 17px;
            border-radius: 12px;
            border: 1px dashed rgba(126, 232, 255, 0.14);
            color: rgba(235, 247, 255, 0.5);
            font-size: 12px;
            text-align: center;
          }

          .nova-mastery-skill-list {
            margin-top: 13px;
            display: grid;
            gap: 9px;
          }

          .nova-mastery-skill {
            padding: 14px;
            border-radius: 14px;
            border: 1px solid rgba(126, 232, 255, 0.09);
            background: rgba(2, 8, 19, 0.34);
          }

          .nova-mastery-skill-heading {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
          }

          .nova-mastery-skill-heading > div > span {
            color: #8dfcff;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 0.08em;
          }

          .nova-mastery-skill-heading h5 {
            margin: 5px 0 0;
            display: flex;
            align-items: center;
            font-size: 14px;
          }

          .nova-mastery-status {
            flex: 0 0 auto;
            padding: 6px 8px;
            border-radius: 999px;
            border: 1px solid rgba(126, 232, 255, 0.16);
            background: rgba(255, 255, 255, 0.035);
            font-size: 9px;
            font-weight: 900;
            text-transform: uppercase;
          }

          .status-needs_support {
            color: #fecaca !important;
          }

          .status-emerging,
          .status-review_due {
            color: #fde68a !important;
          }

          .status-developing {
            color: #bfdbfe !important;
          }

          .status-secure,
          .status-mastered {
            color: #a7f3d0 !important;
          }

          .status-not_enough_data {
            color: #cbd5e1 !important;
          }

          .nova-mastery-skill-metrics {
            margin-top: 12px;
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 8px;
          }

          .nova-mastery-metric-box {
            padding: 10px;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.03);
          }

          .nova-mastery-metric-box > span {
            display: flex;
            align-items: center;
            color: rgba(235, 247, 255, 0.42);
            font-size: 9px;
            font-weight: 850;
            text-transform: uppercase;
          }

          .nova-mastery-metric-box > strong {
            display: block;
            margin-top: 6px;
            color: white;
            font-size: 16px;
          }

          .nova-mastery-evidence-row {
            margin-top: 9px;
            display: grid;
            grid-template-columns: 1.35fr repeat(4, minmax(0, 1fr));
            gap: 7px;
          }

          .nova-mastery-evidence-row > div {
            padding: 9px 10px;
            border-radius: 9px;
            background: rgba(255, 255, 255, 0.022);
          }

          .nova-mastery-evidence-row span {
            display: block;
            color: rgba(235, 247, 255, 0.38);
            font-size: 8px;
            font-weight: 850;
            text-transform: uppercase;
          }

          .nova-mastery-evidence-row strong {
            display: block;
            margin-top: 5px;
            color: rgba(255, 255, 255, 0.75);
            font-size: 10px;
            line-height: 1.35;
          }

          .nova-mastery-building-note {
            margin: 9px 0 0;
            color: rgba(253, 230, 138, 0.74);
            font-size: 10px;
            line-height: 1.5;
          }

          .nova-pattern-grid {
            margin-top: 15px;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
          }

          .nova-pattern-grid article {
            padding: 15px;
            border-radius: 15px;
            border: 1px solid rgba(126, 232, 255, 0.1);
            background: rgba(255, 255, 255, 0.026);
          }

          .nova-pattern-heading {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
          }

          .nova-pattern-heading span,
          .nova-pattern-heading strong {
            color: rgba(235, 247, 255, 0.42);
            font-size: 9px;
            font-weight: 850;
            text-transform: uppercase;
          }

          .nova-pattern-grid h5 {
            margin: 11px 0 0;
            font-size: 14px;
          }

          .nova-pattern-value {
            margin-top: 8px;
            color: #8dfcff;
            font-size: 24px;
            font-weight: 900;
          }

          .nova-pattern-grid p {
            min-height: 50px;
            margin: 8px 0 0;
            color: rgba(235, 247, 255, 0.54);
            font-size: 11px;
            line-height: 1.55;
          }

          .nova-pattern-grid small {
            display: block;
            margin-top: 10px;
            color: rgba(235, 247, 255, 0.35);
            font-size: 9px;
          }

          .nova-timeline {
            position: relative;
            margin-top: 15px;
            padding-left: 22px;
            display: grid;
            gap: 12px;
          }

          .nova-timeline::before {
            content: "";
            position: absolute;
            left: 6px;
            top: 7px;
            bottom: 7px;
            width: 1px;
            background: rgba(126, 232, 255, 0.18);
          }

          .nova-timeline > article {
            position: relative;
          }

          .nova-timeline-marker {
            position: absolute;
            left: -21px;
            top: 19px;
            width: 11px;
            height: 11px;
            border-radius: 999px;
            border: 2px solid #071a32;
            background: #53d7ff;
            box-shadow: 0 0 14px rgba(83, 215, 255, 0.55);
          }

          .nova-timeline-card {
            padding: 15px;
            border-radius: 15px;
            border: 1px solid rgba(126, 232, 255, 0.1);
            background: rgba(255, 255, 255, 0.026);
          }

          .nova-timeline-heading {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
          }

          .nova-timeline-heading span {
            color: #8dfcff;
            font-size: 9px;
            font-weight: 900;
            text-transform: uppercase;
          }

          .nova-timeline-heading h5 {
            margin: 5px 0 0;
            font-size: 15px;
          }

          .nova-timeline-heading > strong {
            color: #a7f3d0;
            font-size: 13px;
          }

          .nova-timeline-metrics {
            margin-top: 12px;
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 8px;
          }

          .nova-timeline-metrics > div {
            padding: 9px 10px;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.025);
          }

          .nova-timeline-metrics span {
            display: block;
            color: rgba(235, 247, 255, 0.38);
            font-size: 8px;
            font-weight: 850;
            text-transform: uppercase;
          }

          .nova-timeline-metrics strong {
            display: block;
            margin-top: 5px;
            font-size: 11px;
          }

          .nova-understanding-columns {
            margin-top: 15px;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .nova-understanding-columns > section {
            padding: 15px;
            border-radius: 16px;
            border: 1px solid rgba(126, 232, 255, 0.1);
            background: rgba(255, 255, 255, 0.022);
          }

          .nova-understanding-title {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }

          .nova-understanding-title h5 {
            margin: 0;
            font-size: 15px;
          }

          .nova-understanding-title span {
            min-width: 26px;
            height: 26px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            background: rgba(83, 215, 255, 0.1);
            color: #8dfcff;
            font-size: 10px;
            font-weight: 900;
          }

          .nova-understanding-list {
            margin-top: 10px;
            display: grid;
            gap: 8px;
          }

          .nova-understanding-list article {
            padding: 12px;
            border-radius: 12px;
            border: 1px solid rgba(126, 232, 255, 0.09);
            background: rgba(2, 8, 19, 0.3);
          }

          .nova-understanding-list article > div > span {
            color: #8dfcff;
            font-size: 8px;
            font-weight: 900;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .nova-understanding-list article > div > strong {
            display: block;
            margin-top: 5px;
            font-size: 13px;
          }

          .nova-understanding-list article > p {
            margin: 7px 0 0;
            color: rgba(235, 247, 255, 0.52);
            font-size: 10px;
            line-height: 1.5;
          }

          .nova-understanding-list article > footer {
            margin-top: 9px;
            display: flex;
            justify-content: space-between;
            gap: 8px;
            color: rgba(235, 247, 255, 0.34);
            font-size: 8px;
          }

          .nova-understanding-list.resolved {
            opacity: 0.74;
          }

          @media (max-width: 1100px) {
            .nova-profile-insight-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .nova-mastery-topic-row {
              grid-template-columns: 1fr;
            }

            .nova-mastery-topic-metrics {
              justify-content: flex-start;
            }

            .nova-mastery-topic-metrics > div {
              text-align: left;
            }

            .nova-mastery-skill-metrics,
            .nova-timeline-metrics {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .nova-mastery-evidence-row {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }

            .nova-pattern-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 760px) {
            .nova-profile-heading-actions,
            .nova-profile-card-heading,
            .nova-profile-section-heading {
              display: grid;
              grid-template-columns: 1fr;
              justify-items: start;
            }

            .nova-profile-refresh-button {
              width: 100%;
            }

            .nova-profile-nav {
              margin-left: -2px;
              margin-right: -2px;
            }

            .nova-profile-nav button {
              min-height: 39px;
              padding: 0 11px;
              font-size: 10px;
            }

            .nova-profile-insight-grid,
            .nova-pattern-grid,
            .nova-understanding-columns {
              grid-template-columns: 1fr;
            }

            .nova-profile-subject-filter {
              justify-content: flex-start;
            }

            .nova-mastery-topic-row {
              min-height: 0;
              padding: 13px;
            }

            .nova-mastery-topic-metrics {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
              gap: 8px;
            }

            .nova-mastery-topic-detail {
              padding: 0 12px 12px;
            }

            .nova-mastery-broad-row {
              display: grid;
              grid-template-columns: 1fr;
            }

            .nova-mastery-skill-heading {
              display: grid;
              grid-template-columns: 1fr;
            }

            .nova-mastery-status {
              justify-self: start;
            }

            .nova-mastery-skill-metrics,
            .nova-mastery-evidence-row,
            .nova-timeline-metrics {
              grid-template-columns: 1fr 1fr;
            }

            .nova-timeline-heading {
              display: grid;
              grid-template-columns: 1fr;
            }

            .nova-info-tip > span {
              position: fixed;
              left: 16px;
              right: 16px;
              bottom: 18px;
              width: auto;
              transform: translateY(6px);
            }

            .nova-info-tip:hover > span,
            .nova-info-tip:focus-within > span,
            .nova-info-tip.open > span {
              transform: translateY(0);
            }
          }

          @media (max-width: 480px) {
            .nova-mastery-topic-metrics {
              grid-template-columns: 1fr 1fr;
            }

            .nova-mastery-arrow {
              display: none;
            }

            .nova-mastery-skill-metrics,
            .nova-mastery-evidence-row,
            .nova-timeline-metrics {
              grid-template-columns: 1fr;
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
