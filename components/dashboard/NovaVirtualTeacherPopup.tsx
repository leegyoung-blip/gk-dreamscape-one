"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, ChangeEvent } from "react";
import { supabase } from "@/lib/supabase";
import { useNovaFeatureFlags } from "@/hooks/useNovaFeatureFlags";

type SubjectKey = "english" | "math" | "science" | "knowledge";
type PopupTab = "analytics" | "plan" | "profile";

type LearnerAvatarChoice =
  | {
      kind: "preset";
      value: string;
      presetId: string;
    }
  | {
      kind: "upload";
      value: string;
      presetId?: never;
    };

const LEARNER_AVATAR_PRESETS = [
  { id: "star", symbol: "★", label: "Star", className: "avatar-star" },
  { id: "rocket", symbol: "↗", label: "Explorer", className: "avatar-rocket" },
  { id: "orbit", symbol: "◎", label: "Orbit", className: "avatar-orbit" },
  { id: "puzzle", symbol: "◆", label: "Thinker", className: "avatar-puzzle" },
  { id: "spark", symbol: "✦", label: "Spark", className: "avatar-spark" },
  { id: "moon", symbol: "◐", label: "Moon", className: "avatar-moon" },
  { id: "compass", symbol: "⌖", label: "Discoverer", className: "avatar-compass" },
  { id: "bolt", symbol: "ϟ", label: "Bolt", className: "avatar-bolt" },
] as const;

const DEFAULT_LEARNER_AVATAR: LearnerAvatarChoice = {
  kind: "preset",
  value: "★",
  presetId: "star",
};

function learnerAvatarStorageKey(
  studentUserId: string | null,
  studentLabel: string,
) {
  return `dreamscape:nova-plus-avatar:${studentUserId || studentLabel}`;
}

function subjectHealthMeta(
  masteryValue: number | null | undefined,
  questionsAttempted: number,
) {
  const mastery = Math.max(0, Math.min(100, safeNumber(masteryValue)));

  if (questionsAttempted < 5) {
    return {
      key: "building",
      label: "Building picture",
      colour: "#94a3b8",
      soft: "rgba(148,163,184,0.14)",
      border: "rgba(148,163,184,0.36)",
    };
  }

  if (mastery >= 80) {
    return {
      key: "strong",
      label: "Strong",
      colour: "#45e59a",
      soft: "rgba(69,229,154,0.16)",
      border: "rgba(69,229,154,0.46)",
    };
  }

  if (mastery >= 65) {
    return {
      key: "developing",
      label: "Developing",
      colour: "#ffad42",
      soft: "rgba(255,173,66,0.16)",
      border: "rgba(255,173,66,0.48)",
    };
  }

  return {
    key: "attention",
    label: "Needs attention",
    colour: "#ff646e",
    soft: "rgba(255,100,110,0.16)",
    border: "rgba(255,100,110,0.48)",
  };
}

function resizeLearnerAvatar(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Choose an image file."));
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      reject(new Error("Choose an image smaller than 12 MB."));
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => reject(new Error("The image could not be read."));

    reader.onload = () => {
      const image = new Image();

      image.onerror = () => reject(new Error("The image could not be opened."));

      image.onload = () => {
        const size = 512;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("The image could not be prepared."));
          return;
        }

        const sourceSize = Math.min(image.width, image.height);
        const sourceX = Math.max(0, (image.width - sourceSize) / 2);
        const sourceY = Math.max(0, (image.height - sourceSize) / 2);

        context.drawImage(
          image,
          sourceX,
          sourceY,
          sourceSize,
          sourceSize,
          0,
          0,
          size,
          size,
        );

        resolve(canvas.toDataURL("image/jpeg", 0.88));
      };

      image.src = String(reader.result || "");
    };

    reader.readAsDataURL(file);
  });
}

type NovaAgeContext = {
  available: boolean;
  age_years: number | null;
  age_band: string | null;
  age_band_label: string;
  session_minutes_min: number | null;
  session_minutes_max: number | null;
  recommended_session_minutes: number | null;
  explanation_style: string;
  feedback_style: string;
  support_guidance: string;
  independence_guidance: string;
  plan_spacing: string;
  curriculum_rule: string;
  privacy_rule: string;
  context_version: string;
  as_of: string | null;
};


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
  analytics_version?: string;
  age_context?: NovaAgeContext;
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
  recommended_session_minutes?: number | null;
  support_guidance?: string | null;
  age_context_version?: string | null;
  status: "pending" | "completed" | "missed" | "cancelled";
  completed_at: string | null;
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


type ProfileView =
  | "learning"
  | "strengths"
  | "mastery"
  | "recommends"
  | "progress"
  | "parent";

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
  age_context?: NovaAgeContext;
  age_context_version?: string | null;
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
  age_context?: NovaAgeContext;
  age_context_version?: string;
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



function readableGuidance(value: string | null | undefined) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function ageContextSummary(
  context: NovaAgeContext | null | undefined,
) {
  if (!context?.available) {
    return "Age context unavailable";
  }

  const minutes =
    context.session_minutes_min !== null &&
    context.session_minutes_max !== null
      ? `${context.session_minutes_min}–${context.session_minutes_max} min`
      : "Session length building";

  return `${context.age_band_label} · ${minutes}`;
}


function normalisePreferences(
  value: unknown,
): NovaPreferences {
  const row = Array.isArray(value)
    ? value[0]
    : value;

  if (!row || typeof row !== "object") {
    return {
      plan_enabled: false,
      monday_email_enabled: false,
    };
  }

  const record = row as Record<string, unknown>;

  return {
    plan_enabled: Boolean(record.plan_enabled),
    monday_email_enabled: Boolean(
      record.monday_email_enabled,
    ),
  };
}

function singaporeDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function addDateKeyDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function currentSingaporeWeek() {
  const today = singaporeDateKey();
  const day = new Date(`${today}T00:00:00Z`).getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const weekStart = addDateKeyDays(today, -daysFromMonday);

  return {
    weekStart,
    weekEnd: addDateKeyDays(weekStart, 6),
    nextRefreshAt:
      `${addDateKeyDays(weekStart, 7)}T08:00:00+08:00`,
  };
}

async function functionErrorDetail(error: unknown) {
  const fallback =
    error &&
    typeof error === "object" &&
    "message" in error
      ? String(
          (error as { message?: unknown }).message ||
            "Edge Function request failed",
        )
      : "Edge Function request failed";

  const context =
    error &&
    typeof error === "object" &&
    "context" in error
      ? (error as { context?: unknown }).context
      : null;

  if (
    !context ||
    typeof context !== "object" ||
    !("clone" in context)
  ) {
    return fallback;
  }

  try {
    const response = (
      context as Response
    ).clone();

    const contentType =
      response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const payload = await response.json();

      if (payload && typeof payload === "object") {
        const record = payload as Record<string, unknown>;
        return String(
          record.error ||
            record.message ||
            record.details ||
            fallback,
        );
      }
    }

    const text = await response.text();
    return text.trim() || fallback;
  } catch {
    return fallback;
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


function profileStatusColour(status: ProfileSkill["status"]) {
  switch (status) {
    case "mastered":
      return "#2dd4bf";
    case "secure":
      return "#34d399";
    case "developing":
      return "#facc15";
    case "emerging":
      return "#fb923c";
    case "needs_support":
      return "#f87171";
    case "review_due":
      return "#a78bfa";
    default:
      return "#94a3b8";
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
  const [preferencesLoading, setPreferencesLoading] =
    useState(false);
  const [message, setMessage] = useState("");
  const [reportErrorDetail, setReportErrorDetail] =
    useState("");
  const [localPlanEnabled, setLocalPlanEnabled] = useState(false);
  const [localEmailEnabled, setLocalEmailEnabled] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [viewerRoleLoading, setViewerRoleLoading] = useState(false);
  const [profileView, setProfileView] =
    useState<ProfileView>("learning");
  const [profileSubjectFilter, setProfileSubjectFilter] =
    useState<"all" | "english" | "math" | "science">("all");
  const [profilePayload, setProfilePayload] =
    useState<LearningProfilePayload | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileRefreshing, setProfileRefreshing] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [expandedTopics, setExpandedTopics] =
    useState<Set<string>>(new Set());
  const [learnerAvatar, setLearnerAvatar] =
    useState<LearnerAvatarChoice>(DEFAULT_LEARNER_AVATAR);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState("");

  const {
    isEnabled: featureEnabled,
    loading: featureFlagsLoading,
  } = useNovaFeatureFlags(viewerUserId);

  const weeklyAnalyticsFeatureEnabled =
    featureEnabled(
      "nova_weekly_analytics_enabled",
      true,
    );
  const weeklyPlanFeatureEnabled =
    featureEnabled(
      "nova_weekly_plan_enabled",
      true,
    );
  const weeklyEmailFeatureEnabled =
    featureEnabled(
      "nova_weekly_email_enabled",
      true,
    );
  const learningProfileFeatureEnabled =
    featureEnabled(
      "nova_learning_profile_enabled",
      true,
    );
  const granularInsightsFeatureEnabled =
    featureEnabled(
      "nova_granular_insights_enabled",
      true,
    );
  const ageContextFeatureEnabled =
    featureEnabled(
      "nova_age_context_enabled",
      true,
    );

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const key = learnerAvatarStorageKey(studentUserId, studentLabel);
    const saved = window.localStorage.getItem(key);

    if (!saved) {
      setLearnerAvatar(DEFAULT_LEARNER_AVATAR);
      return;
    }

    try {
      const parsed = JSON.parse(saved) as LearnerAvatarChoice;

      if (
        parsed &&
        (parsed.kind === "preset" || parsed.kind === "upload") &&
        typeof parsed.value === "string"
      ) {
        setLearnerAvatar(parsed);
      } else {
        setLearnerAvatar(DEFAULT_LEARNER_AVATAR);
      }
    } catch {
      setLearnerAvatar(DEFAULT_LEARNER_AVATAR);
    }
  }, [studentUserId, studentLabel]);

  function saveLearnerAvatar(nextAvatar: LearnerAvatarChoice) {
    setLearnerAvatar(nextAvatar);
    setAvatarUploadError("");

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        learnerAvatarStorageKey(studentUserId, studentLabel),
        JSON.stringify(nextAvatar),
      );
    }
  }

  async function handleLearnerAvatarUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";

    if (!file) return;

    setAvatarUploadError("");

    try {
      const value = await resizeLearnerAvatar(file);
      saveLearnerAvatar({
        kind: "upload",
        value,
      });
      setAvatarPickerOpen(false);
    } catch (error) {
      setAvatarUploadError(
        error instanceof Error
          ? error.message
          : "The image could not be prepared.",
      );
    }
  }

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
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [open]);

  useEffect(() => {
    setReport(null);
    setMessage("");
    setReportErrorDetail("");
    setLocalPlanEnabled(false);
    setLocalEmailEnabled(false);
  }, [studentUserId]);

  useEffect(() => {
    if (!open || !studentUserId || !viewerUserId) return;

    void loadPreferences();
    void loadReport(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, studentUserId, viewerUserId]);

  const learningProfileUnlocked =
    normaliseRole(viewerRole) === "admin" &&
    learningProfileFeatureEnabled;

  useEffect(() => {
    setProfilePayload(null);
    setProfileError("");
    setExpandedTopics(new Set());
    setProfileView("learning");
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
      setTab(
        weeklyAnalyticsFeatureEnabled
          ? "analytics"
          : "plan",
      );
    }
  }, [
    tab,
    viewerRoleLoading,
    learningProfileUnlocked,
    weeklyAnalyticsFeatureEnabled,
  ]);

  useEffect(() => {
    if (featureFlagsLoading) return;

    if (
      tab === "analytics" &&
      !weeklyAnalyticsFeatureEnabled
    ) {
      setTab(
        weeklyPlanFeatureEnabled
          ? "plan"
          : learningProfileUnlocked
            ? "profile"
            : "analytics",
      );
      return;
    }

    if (
      tab === "plan" &&
      !weeklyPlanFeatureEnabled
    ) {
      setTab(
        weeklyAnalyticsFeatureEnabled
          ? "analytics"
          : learningProfileUnlocked
            ? "profile"
            : "plan",
      );
    }
  }, [
    featureFlagsLoading,
    learningProfileUnlocked,
    tab,
    weeklyAnalyticsFeatureEnabled,
    weeklyPlanFeatureEnabled,
  ]);


  async function loadPreferences() {
    if (!studentUserId) return null;

    setPreferencesLoading(true);

    const { data, error } = await supabase.rpc(
      "get_nova_virtual_teacher_preferences",
      {
        p_student_user_id: studentUserId,
      },
    );

    setPreferencesLoading(false);

    if (error) {
      console.warn(
        "Nova preference load error:",
        error.message,
      );
      setMessage(
        "Nova could not load the saved weekly-plan preferences. Confirm that the Nova preference RPC is installed.",
      );
      return null;
    }

    const preferences = normalisePreferences(data);
    setLocalPlanEnabled(preferences.plan_enabled);
    setLocalEmailEnabled(
      preferences.monday_email_enabled,
    );

    setReport((current) =>
      current
        ? {
            ...current,
            preferences,
          }
        : current,
    );

    return preferences;
  }

  async function loadStoredReportFallback() {
    if (!studentUserId) return null;

    const week = currentSingaporeWeek();

    const { data: storedReport, error: storedError } =
      await supabase
        .from("nova_weekly_reports")
        .select(
          "id,week_start,week_end,analytics_json",
        )
        .eq("student_user_id", studentUserId)
        .eq("week_start", week.weekStart)
        .maybeSingle();

    if (storedError || !storedReport) {
      if (storedError) {
        console.warn(
          "Stored Nova report fallback failed:",
          storedError.message,
        );
      }
      return null;
    }

    const { data: planRows, error: planError } =
      await supabase
        .from("nova_weekly_plan_items")
        .select(
          "id,plan_date,day_index,item_type,subject,quiz_id,quiz_title,quiz_href,reason,target_accuracy,bonus_dt,target_skill_id,target_skill_code,target_skill_name,recommendation_version,recommended_session_minutes,support_guidance,age_context_version,status,completed_at",
        )
        .eq("report_id", storedReport.id)
        .order("day_index", { ascending: true });

    if (planError) {
      console.warn(
        "Stored Nova plan fallback failed:",
        planError.message,
      );
      return null;
    }

    const preferences =
      (await loadPreferences()) || {
        plan_enabled: localPlanEnabled,
        monday_email_enabled: localEmailEnabled,
      };

    return {
      week_start:
        String(storedReport.week_start || week.weekStart),
      week_end:
        String(storedReport.week_end || week.weekEnd),
      next_refresh_at: week.nextRefreshAt,
      preferences,
      analytics:
        storedReport.analytics_json as ReportAnalytics,
      plan: (planRows || []).map((item) => ({
        ...item,
        day_name:
          [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ][safeNumber(item.day_index)] || "Day",
      })) as PlanItem[],
    } satisfies WeeklyReportResponse;
  }

  async function loadReport(force: boolean) {
    if (!studentUserId) return;

    setLoading(true);
    setMessage("");
    setReportErrorDetail("");

    try {
      const { data, error } =
        await supabase.functions.invoke(
          "nova-weekly-report",
          {
            body: {
              student_user_id: studentUserId,
              force,
            },
          },
        );

      if (error) {
        const detail =
          await functionErrorDetail(error);

        console.warn(
          "Nova weekly report error:",
          detail,
        );

        setReportErrorDetail(detail);

        const stored =
          await loadStoredReportFallback();

        if (stored) {
          setReport(stored);
          setMessage(
            `Nova loaded the last stored weekly plan, but could not refresh it. ${detail}`,
          );
        } else {
          setReport(null);
          setMessage(
            `Nova could not generate this week’s plan. ${detail}`,
          );
        }

        return;
      }

      const nextReport =
        data as WeeklyReportResponse;

      setReport(nextReport);

      if (nextReport?.preferences) {
        const preferences =
          normalisePreferences(
            nextReport.preferences,
          );
        setLocalPlanEnabled(
          preferences.plan_enabled,
        );
        setLocalEmailEnabled(
          preferences.monday_email_enabled,
        );
      }
    } finally {
      setLoading(false);
    }
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
      ? "admin_refresh_learning_profile_with_age"
      : "admin_get_learning_profile_with_age";

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

    const previousPlanEnabled =
      localPlanEnabled;
    const previousEmailEnabled =
      localEmailEnabled;

    setSavingPreference(true);
    setMessage("");

    // Update the switch immediately. It is rolled back only if
    // the preference RPC itself fails.
    setLocalPlanEnabled(nextPlanEnabled);
    setLocalEmailEnabled(nextEmailEnabled);

    const { data, error } = await supabase.rpc(
      "set_nova_virtual_teacher_preferences",
      {
        p_student_user_id: studentUserId,
        p_plan_enabled: nextPlanEnabled,
        p_monday_email_enabled: nextEmailEnabled,
      },
    );

    if (error) {
      console.warn(
        "Nova preference update error:",
        error.message,
      );

      setLocalPlanEnabled(previousPlanEnabled);
      setLocalEmailEnabled(previousEmailEnabled);
      setMessage(
        `The preference could not be saved. ${error.message}`,
      );
      setSavingPreference(false);
      return;
    }

    const savedPreferences =
      normalisePreferences(data);

    setLocalPlanEnabled(
      savedPreferences.plan_enabled,
    );
    setLocalEmailEnabled(
      savedPreferences.monday_email_enabled,
    );

    setReport((current) =>
      current
        ? {
            ...current,
            preferences: savedPreferences,
            plan: savedPreferences.plan_enabled
              ? current.plan
              : [],
          }
        : current,
    );

    setSavingPreference(false);

    // Report generation is separate from preference persistence.
    // A report failure must never switch the saved settings back off.
    void loadReport(true);
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

  const planEnabled = localPlanEnabled;
  const emailEnabled = localEmailEnabled;

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
  const profileSkills = granularInsightsFeatureEnabled
    ? profilePayload?.skills || []
    : (profilePayload?.skills || []).filter(
        (skill) => skill.is_topic_level,
      );
  const profileInsights = granularInsightsFeatureEnabled
    ? profilePayload?.insights || []
    : (profilePayload?.insights || []).filter(
        (insight) => !insight.skill_id,
      );
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

  const novaPlusCurriculumSubjects = useMemo(
    () =>
      ["english", "math", "science"]
        .map((subjectKey) =>
          profileSubjectSummaries.find(
            (subject) => subject.subject === subjectKey,
          ),
        )
        .filter(
          (
            subject,
          ): subject is ProfileSubjectSummary =>
            Boolean(subject),
        ),
    [profileSubjectSummaries],
  );

  const novaPlusKnowledgeSubject =
    profileSubjectSummaries.find(
      (subject) => subject.subject === "knowledge",
    ) || null;

  const novaPlusStrongestCurriculumSubject =
    [...novaPlusCurriculumSubjects]
      .filter((subject) => subject.questions_attempted >= 5)
      .sort(
        (first, second) =>
          safeNumber(second.mastery_score) -
          safeNumber(first.mastery_score),
      )[0] || null;

  const novaPlusPriorityCurriculumSubject =
    [...novaPlusCurriculumSubjects]
      .filter((subject) => subject.questions_attempted >= 5)
      .sort(
        (first, second) =>
          safeNumber(first.mastery_score) -
          safeNumber(second.mastery_score),
      )[0] || null;

  const profileSnapshot = profilePayload?.latest_snapshot || {};
  const reportAgeContext = ageContextFeatureEnabled
    ? analytics?.age_context || null
    : null;
  const granularReadyCount = profileSkills.filter(
    (skill) =>
      !skill.is_topic_level &&
      skill.granular_eligible &&
      skill.evidence_quality === "ready",
  ).length;

  const novaPlusStrongSkills = useMemo(
    () =>
      [...profileSkills]
        .filter((skill) =>
          ["secure", "mastered"].includes(skill.status),
        )
        .sort(
          (first, second) =>
            safeNumber(second.mastery_score) -
            safeNumber(first.mastery_score),
        )
        .slice(0, 8),
    [profileSkills],
  );

  const novaPlusGapSkills = useMemo(
    () =>
      [...profileSkills]
        .filter((skill) =>
          [
            "needs_support",
            "emerging",
            "developing",
          ].includes(skill.status),
        )
        .sort(
          (first, second) =>
            safeNumber(first.mastery_score) -
              safeNumber(second.mastery_score) ||
            safeNumber(second.confidence_score) -
              safeNumber(first.confidence_score),
        )
        .slice(0, 8),
    [profileSkills],
  );

  const novaPlusImprovingSkills = useMemo(
    () =>
      [...profileSkills]
        .filter((skill) => skill.trend === "improving")
        .sort(
          (first, second) =>
            safeNumber(second.trend_points) -
            safeNumber(first.trend_points),
        )
        .slice(0, 6),
    [profileSkills],
  );

  const novaPlusReviewSkills = useMemo(
    () =>
      [...profileSkills]
        .filter((skill) => skill.status === "review_due")
        .sort(
          (first, second) =>
            new Date(first.last_attempted_at || 0).getTime() -
            new Date(second.last_attempted_at || 0).getTime(),
        )
        .slice(0, 6),
    [profileSkills],
  );

  const novaPlusRecommendations = useMemo(() => {
    const focusSkill = novaPlusGapSkills[0] || null;
    const revisitSkill =
      novaPlusReviewSkills[0] || novaPlusGapSkills[1] || null;
    const stretchSkill =
      novaPlusStrongSkills[0] || novaPlusImprovingSkills[0] || null;
    const reassessSkill =
      novaPlusGapSkills[2] || novaPlusReviewSkills[1] || null;

    return [
      {
        key: "focus",
        icon: "◎",
        label: "Focus now",
        title:
          focusSkill?.skill_name ||
          (priorityProfileSubject
            ? profileSubjectLabel(priorityProfileSubject.subject)
            : "Build more evidence"),
        reason: focusSkill
          ? `Nova has identified this ${profileSubjectLabel(
              focusSkill.subject,
            )} skill as the clearest current priority.`
          : "Complete a few more varied missions so Nova can identify a reliable priority.",
      },
      {
        key: "revisit",
        icon: "↺",
        label: "Revisit",
        title: revisitSkill?.skill_name || "Refresh a developing skill",
        reason: revisitSkill
          ? `A short return to this ${profileSubjectLabel(
              revisitSkill.subject,
            )} area can strengthen retention before it slips further.`
          : "Nova will surface a revisit target once enough repeated evidence is available.",
      },
      {
        key: "stretch",
        icon: "✦",
        label: "Stretch",
        title: stretchSkill?.skill_name || "Extend a secure strength",
        reason: stretchSkill
          ? `This ${profileSubjectLabel(
              stretchSkill.subject,
            )} skill is secure enough for a more demanding challenge.`
          : "Nova will add a stretch target once a stable strength is confirmed.",
      },
      {
        key: "reassess",
        icon: "✓",
        label: "Reassess",
        title: reassessSkill?.skill_name || "Check whether practice worked",
        reason: reassessSkill
          ? "After targeted practice, Nova should check this same area again to confirm whether the gap has narrowed."
          : "Reassessment targets will appear after Nova identifies and supports a persistent gap.",
      },
    ];
  }, [
    novaPlusGapSkills,
    novaPlusReviewSkills,
    novaPlusStrongSkills,
    novaPlusImprovingSkills,
    priorityProfileSubject,
  ]);

  const novaPlusProgressSeries = useMemo(
    () =>
      [...profileTimeline]
        .filter(
          (entry) =>
            entry.overall_mastery !== null &&
            entry.overall_mastery !== undefined &&
            Boolean(entry.snapshot_date),
        )
        .sort(
          (first, second) =>
            new Date(first.snapshot_date).getTime() -
            new Date(second.snapshot_date).getTime(),
        )
        .slice(-12)
        .map((entry) => ({
          date: entry.snapshot_date,
          mastery: safeNumber(entry.overall_mastery),
        })),
    [profileTimeline],
  );

  const novaPlusProgressPoints = useMemo(
    () =>
      novaPlusProgressSeries
        .map((entry, index) => {
          const x =
            (index /
              Math.max(1, novaPlusProgressSeries.length - 1)) *
            700;
          const y =
            190 -
            (Math.max(0, Math.min(100, entry.mastery)) / 100) *
              160;

          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" "),
    [novaPlusProgressSeries],
  );

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
        padding: 0,
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
          width: "100vw",
          height: "100dvh",
          maxHeight: "100dvh",
          margin: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          overscrollBehavior: "contain",
          borderRadius: 0,
          border: 0,
          background:
            "linear-gradient(145deg, #071a32, #030916 74%)",
          color: "white",
          boxShadow: "none",
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
              aria-disabled={!weeklyAnalyticsFeatureEnabled}
              disabled={!weeklyAnalyticsFeatureEnabled}
              className={[
                tab === "analytics" ? "active" : "",
                !weeklyAnalyticsFeatureEnabled
                  ? "locked"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                if (weeklyAnalyticsFeatureEnabled) {
                  setTab("analytics");
                }
              }}
              title={
                weeklyAnalyticsFeatureEnabled
                  ? "Open weekly analytics"
                  : "Weekly analytics are disabled by the production release controls"
              }
            >
              Weekly analytics
              {!weeklyAnalyticsFeatureEnabled && (
                <span
                  className="nova-vt-tab-lock"
                  aria-hidden="true"
                >
                  🔒
                </span>
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "plan"}
              aria-disabled={!weeklyPlanFeatureEnabled}
              disabled={!weeklyPlanFeatureEnabled}
              className={[
                tab === "plan" ? "active" : "",
                !weeklyPlanFeatureEnabled
                  ? "locked"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                if (weeklyPlanFeatureEnabled) {
                  setTab("plan");
                }
              }}
              title={
                weeklyPlanFeatureEnabled
                  ? "Open Nova’s seven-day plan"
                  : "The seven-day plan is disabled by the production release controls"
              }
            >
              Seven-day plan
              {!weeklyPlanFeatureEnabled && (
                <span
                  className="nova-vt-tab-lock"
                  aria-hidden="true"
                >
                  🔒
                </span>
              )}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={tab === "profile"}
              aria-disabled={!learningProfileUnlocked}
              disabled={!learningProfileUnlocked}
              className={[
                "nova-plus-tab",
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
                  ? "Open Nova+ Learning Intelligence"
                  : learningProfileFeatureEnabled
                    ? "Nova+ is currently available as an admin preview"
                    : "Nova+ is disabled by the production release controls"
              }
            >
              <span className="nova-plus-tab-label">
                <span className="nova-plus-tab-star" aria-hidden="true">✦</span>
                NOVA+
              </span>
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
              disabled={
                savingPreference ||
                preferencesLoading ||
                featureFlagsLoading ||
                !weeklyPlanFeatureEnabled ||
                !studentUserId
              }
              onClick={() =>
                void updatePreferences(!planEnabled, emailEnabled)
              }
            >
              <span className="nova-vt-setting-copy">
                <strong>Schedule weekly plan</strong>
                <small>
                  {weeklyPlanFeatureEnabled
                    ? "Nova selects a Monday-to-Sunday quiz plan."
                    : "Disabled by the production release controls."}
                </small>
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
              disabled={
                savingPreference ||
                preferencesLoading ||
                featureFlagsLoading ||
                !weeklyEmailFeatureEnabled ||
                !studentUserId
              }
              onClick={() =>
                void updatePreferences(planEnabled, !emailEnabled)
              }
            >
              <span className="nova-vt-setting-copy">
                <strong>Notify me every Monday</strong>
                <small>
                  {weeklyEmailFeatureEnabled
                    ? "Send the report to the registered parent email."
                    : "Disabled by the production release controls."}
                </small>
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

              {reportAgeContext?.available && (
                <section className="nova-vt-age-context">
                  <div>
                    <p className="nova-vt-eyebrow">
                      Age-aware guidance
                    </p>
                    <h3>
                      {ageContextSummary(reportAgeContext)}
                    </h3>
                    <p>
                      {reportAgeContext.support_guidance}
                    </p>
                  </div>

                  <div className="nova-vt-age-context-grid">
                    <Metric
                      label="Explanation style"
                      value={readableGuidance(
                        reportAgeContext.explanation_style,
                      )}
                    />
                    <Metric
                      label="Independence"
                      value={readableGuidance(
                        reportAgeContext.independence_guidance,
                      )}
                    />
                    <Metric
                      label="Plan spacing"
                      value={readableGuidance(
                        reportAgeContext.plan_spacing,
                      )}
                    />
                  </div>

                  <div className="nova-vt-age-context-rule">
                    <InfoTip text="Nova receives only the derived age and age band, not the learner’s exact date of birth. Age changes wording, suggested session length and support guidance only. It does not change correctness, marks, mastery, skill priority, quiz eligibility or rewards." />
                    <span>
                      Primary level remains the curriculum reference.
                    </span>
                  </div>
                </section>
              )}

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
                      : reportErrorDetail
                        ? "The weekly report service returned an error."
                        : "Nova is preparing the first stored weekly report."}
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
                  Nova could not generate the current plan. Check the error message above, then use “Refresh this week” after the weekly report function is redeployed.
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
                            {item.recommended_session_minutes && (
                              <span>
                                About {item.recommended_session_minutes} min
                              </span>
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
            <section className="nova-plus-shell">
              <div className="nova-plus-hero">
                <div className="nova-plus-hero-copy">
                  <div className="nova-plus-brand-line">
                    <span className="nova-plus-kicker">NOVA+</span>
                    <span className="nova-plus-preview-badge">Admin preview</span>
                  </div>
                  <h3>Learning Intelligence</h3>
                  <p>
                    A visual learning map that shows where {studentLabel} is strongest,
                    what needs attention, and what Nova recommends next.
                  </p>
                </div>

                <div className="nova-plus-hero-visual" aria-hidden="true">
                  <div className="nova-plus-orbit orbit-one" />
                  <div className="nova-plus-orbit orbit-two" />
                  <div className="nova-plus-core">
                    <img src="/nova/nova-character.png" alt="" />
                  </div>
                  <span className="nova-plus-spark spark-a">✦</span>
                  <span className="nova-plus-spark spark-b">✧</span>
                  <span className="nova-plus-spark spark-c">✦</span>
                </div>

                <button
                  type="button"
                  className="nova-plus-refresh"
                  disabled={profileLoading || profileRefreshing || !studentUserId}
                  onClick={() => void loadLearningProfile(true)}
                >
                  {profileRefreshing ? "Refreshing…" : "Refresh intelligence"}
                </button>
              </div>

              <nav className="nova-plus-nav" aria-label="Nova+ Intelligence sections">
                {(
                  [
                    ["learning", "My Learning", "◎"],
                    ["strengths", "Strengths & Gaps", "✦"],
                    ["mastery", "Mastery Map", "⌘"],
                    ["recommends", "Nova Recommends", "➜"],
                    ["progress", "Progress", "↗"],
                    ["parent", "Parent Report", "◇"],
                  ] as Array<[ProfileView, string, string]>
                ).map(([value, label, icon]) => (
                  <button
                    key={value}
                    type="button"
                    className={profileView === value ? "active" : ""}
                    onClick={() => setProfileView(value)}
                  >
                    <span aria-hidden="true">{icon}</span>
                    <strong>{label}</strong>
                  </button>
                ))}
              </nav>

              {avatarPickerOpen && (
                <div
                  className="nova-plus-avatar-picker-backdrop"
                  role="presentation"
                  onMouseDown={() => setAvatarPickerOpen(false)}
                >
                  <section
                    className="nova-plus-avatar-picker"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Choose learner profile picture"
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    <header>
                      <div>
                        <p className="nova-vt-eyebrow">Profile picture</p>
                        <h4>Choose a picture for {studentLabel}</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAvatarPickerOpen(false)}
                        aria-label="Close profile picture selector"
                      >
                        ×
                      </button>
                    </header>

                    <div className="nova-plus-avatar-options">
                      {LEARNER_AVATAR_PRESETS.map((preset) => {
                        const selected =
                          learnerAvatar.kind === "preset" &&
                          learnerAvatar.presetId === preset.id;

                        return (
                          <button
                            key={preset.id}
                            type="button"
                            className={`nova-plus-avatar-option ${selected ? "selected" : ""}`}
                            onClick={() => {
                              saveLearnerAvatar({
                                kind: "preset",
                                value: preset.symbol,
                                presetId: preset.id,
                              });
                              setAvatarPickerOpen(false);
                            }}
                          >
                            <span className={preset.className} aria-hidden="true">
                              {preset.symbol}
                            </span>
                            <strong>{preset.label}</strong>
                          </button>
                        );
                      })}
                    </div>

                    <div className="nova-plus-avatar-upload-row">
                      <div>
                        <strong>Use your own picture</strong>
                        <span>Choose any image from this device.</span>
                      </div>

                      <label className="nova-plus-avatar-upload-button">
                        Choose image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => void handleLearnerAvatarUpload(event)}
                        />
                      </label>
                    </div>

                    {avatarUploadError && (
                      <div className="nova-plus-avatar-error">
                        {avatarUploadError}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {profileLoading && (
                <div className="nova-plus-loading">
                  <span className="nova-plus-loading-orb" aria-hidden="true" />
                  <strong>Nova is building the learning map…</strong>
                  <p>Combining mastery, trends, question evidence and long-term patterns.</p>
                </div>
              )}

              {profileError && (
                <div className="nova-vt-message error">{profileError}</div>
              )}

              {!profileLoading && !profileError && !profilePayload && (
                <div className="nova-plus-empty">
                  Nova does not have enough processed profile data yet.
                </div>
              )}

              {!profileLoading && profilePayload && profileView === "learning" && (
                <div className="nova-plus-view nova-plus-learning-view">
                  <section className="nova-plus-learning-stage nova-plus-learning-stage-simple">
                    <div className="nova-plus-learning-heading">
                      <div>
                        <p className="nova-vt-eyebrow">{studentLabel}</p>
                        <h4>Your learning at a glance</h4>
                      </div>

                      <div className="nova-plus-status-legend" aria-label="Subject status colours">
                        <span><i className="strong" /> Strong</span>
                        <span><i className="developing" /> Developing</span>
                        <span><i className="attention" /> Needs attention</span>
                      </div>
                    </div>

                    <div className="nova-plus-learning-main">
                      <div className="nova-plus-learner-card">
                        <button
                          type="button"
                          className="nova-plus-avatar-button"
                          onClick={() => {
                            setAvatarUploadError("");
                            setAvatarPickerOpen(true);
                          }}
                          aria-label={`Change ${studentLabel}'s profile picture`}
                        >
                          <div className="nova-plus-learner-avatar">
                            {learnerAvatar.kind === "upload" ? (
                              <img
                                src={learnerAvatar.value}
                                alt={`${studentLabel}'s profile`}
                              />
                            ) : (
                              <span
                                className={
                                  LEARNER_AVATAR_PRESETS.find(
                                    (preset) =>
                                      preset.id === learnerAvatar.presetId,
                                  )?.className || "avatar-star"
                                }
                                aria-hidden="true"
                              >
                                {learnerAvatar.value}
                              </span>
                            )}
                          </div>
                          <span className="nova-plus-avatar-edit" aria-hidden="true">✎</span>
                        </button>

                        <strong>{studentLabel}</strong>
                        <button
                          type="button"
                          className="nova-plus-change-avatar-link"
                          onClick={() => {
                            setAvatarUploadError("");
                            setAvatarPickerOpen(true);
                          }}
                        >
                          Change picture
                        </button>

                        <div className="nova-plus-learner-coach">
                          <img src="/nova/nova-character.png" alt="" aria-hidden="true" />
                          <span>Nova is learning what helps you improve.</span>
                        </div>
                      </div>

                      <div className="nova-plus-curriculum-grid">
                        {(["english", "math", "science"] as const).map((subjectKey) => {
                          const subject = novaPlusCurriculumSubjects.find(
                            (item) => item.subject === subjectKey,
                          );
                          const health = subjectHealthMeta(
                            subject?.mastery_score,
                            subject?.questions_attempted || 0,
                          );
                          const subjectMeta = SUBJECT_META[subjectKey];

                          return (
                            <article
                              key={subjectKey}
                              className={`nova-plus-subject-zone ${health.key}`}
                              style={{
                                borderColor: health.border,
                                background: `linear-gradient(145deg, ${health.soft}, rgba(4,11,26,0.82))`,
                                boxShadow: `inset 0 0 42px ${health.soft}`,
                              }}
                            >
                              <div
                                className="nova-plus-subject-zone-icon"
                                style={{
                                  color: health.colour,
                                  borderColor: health.border,
                                  background: health.soft,
                                }}
                              >
                                {subjectMeta.icon}
                              </div>

                              <div className="nova-plus-subject-zone-copy">
                                <strong>{subjectMeta.label}</strong>
                                <span style={{ color: health.colour }}>
                                  {health.label}
                                </span>
                              </div>

                              <div
                                className="nova-plus-subject-state-light"
                                style={{
                                  background: health.colour,
                                  boxShadow: `0 0 24px ${health.colour}`,
                                }}
                                aria-hidden="true"
                              />
                            </article>
                          );
                        })}

                        {(() => {
                          const subject = novaPlusKnowledgeSubject;
                          const health = subjectHealthMeta(
                            subject?.mastery_score,
                            subject?.questions_attempted || 0,
                          );

                          return (
                            <article
                              className={`nova-plus-knowledge-zone ${health.key}`}
                              style={{
                                borderColor: health.border,
                                background: `linear-gradient(145deg, ${health.soft}, rgba(4,11,26,0.76))`,
                              }}
                            >
                              <div className="nova-plus-knowledge-left">
                                <span
                                  className="nova-plus-knowledge-icon"
                                  style={{
                                    color: health.colour,
                                    borderColor: health.border,
                                    background: health.soft,
                                  }}
                                >
                                  ◎
                                </span>
                                <div>
                                  <small>General knowledge</small>
                                  <strong>Knowledge Arena</strong>
                                </div>
                              </div>

                              <span
                                className="nova-plus-knowledge-status"
                                style={{
                                  color: health.colour,
                                  borderColor: health.border,
                                  background: health.soft,
                                }}
                              >
                                {health.label}
                              </span>
                            </article>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="nova-plus-learning-actions">
                      <article className="nova-plus-quick-answer strong-answer">
                        <span className="nova-plus-quick-icon">✓</span>
                        <div>
                          <small>Strongest right now</small>
                          <strong>
                            {novaPlusStrongestCurriculumSubject
                              ? profileSubjectLabel(
                                  novaPlusStrongestCurriculumSubject.subject,
                                )
                              : "Still building the picture"}
                          </strong>
                        </div>
                      </article>

                      <article className="nova-plus-quick-answer focus-answer">
                        <span className="nova-plus-quick-icon">!</span>
                        <div>
                          <small>Needs attention</small>
                          <strong>
                            {novaPlusGapSkills[0]?.skill_name ||
                              (novaPlusPriorityCurriculumSubject
                                ? profileSubjectLabel(
                                    novaPlusPriorityCurriculumSubject.subject,
                                  )
                                : "No priority confirmed yet")}
                          </strong>
                        </div>
                      </article>

                      <button
                        type="button"
                        className="nova-plus-next-mission"
                        onClick={() => setProfileView("recommends")}
                      >
                        <span className="nova-plus-next-nova">
                          <img src="/nova/nova-character.png" alt="" aria-hidden="true" />
                        </span>
                        <span className="nova-plus-next-copy">
                          <small>Nova recommends</small>
                          <strong>
                            {novaPlusRecommendations[0]?.title ||
                              "Complete another mission"}
                          </strong>
                          <span>See what to do next</span>
                        </span>
                        <span className="nova-plus-next-arrow" aria-hidden="true">→</span>
                      </button>
                    </div>
                  </section>
                </div>
              )}

              {!profileLoading && profilePayload && profileView === "strengths" && (
                <div className="nova-plus-view nova-plus-strengths-view">
                  <section className="nova-plus-constellation-card positive">
                    <div className="nova-plus-section-title">
                      <div>
                        <p className="nova-vt-eyebrow">Strength constellation</p>
                        <h4>What is becoming secure</h4>
                      </div>
                      <span className="nova-plus-section-symbol">✦</span>
                    </div>

                    <div className="nova-plus-constellation">
                      <div className="nova-plus-constellation-lines" aria-hidden="true" />
                      {novaPlusStrongSkills.length === 0 ? (
                        <div className="nova-plus-empty compact">
                          Nova needs more evidence before confirming stable strengths.
                        </div>
                      ) : (
                        novaPlusStrongSkills.slice(0, 6).map((skill, index) => {
                          const accent = subjectAccent(skill.subject);
                          return (
                            <article
                              key={skill.skill_id}
                              className={`nova-plus-skill-star star-${index + 1}`}
                              style={{ borderColor: `${accent}66`, boxShadow: `0 0 28px ${accent}20` }}
                            >
                              <span style={{ color: accent }}>✦</span>
                              <strong>{skill.skill_name}</strong>
                              <small>{profileSubjectLabel(skill.subject)}</small>
                            </article>
                          );
                        })
                      )}
                    </div>
                  </section>

                  <section className="nova-plus-gap-card">
                    <div className="nova-plus-section-title">
                      <div>
                        <p className="nova-vt-eyebrow">Focus radar</p>
                        <h4>Where attention will have the biggest effect</h4>
                      </div>
                      <span className="nova-plus-section-symbol warning">◎</span>
                    </div>

                    <div className="nova-plus-gap-radar">
                      <div className="nova-plus-radar-disc" aria-hidden="true">
                        <span className="ring r1" />
                        <span className="ring r2" />
                        <span className="ring r3" />
                        <span className="sweep" />
                        {novaPlusGapSkills.slice(0, 4).map((skill, index) => (
                          <span key={skill.skill_id} className={`blip b${index + 1}`} />
                        ))}
                      </div>

                      <div className="nova-plus-gap-list">
                        {novaPlusGapSkills.length === 0 ? (
                          <div className="nova-plus-empty compact">
                            No persistent learning gap currently has enough evidence.
                          </div>
                        ) : (
                          novaPlusGapSkills.slice(0, 5).map((skill) => {
                            const accent = subjectAccent(skill.subject);
                            return (
                              <article key={skill.skill_id}>
                                <span
                                  className="nova-plus-gap-status"
                                  style={{ background: profileStatusColour(skill.status) }}
                                />
                                <div>
                                  <strong>{skill.skill_name}</strong>
                                  <small>{profileSubjectLabel(skill.subject)} · {profileStatusLabel(skill.status)}</small>
                                </div>
                                <div
                                  className="nova-plus-gap-meter"
                                  aria-label={`${skill.skill_name} mastery ${Math.round(skill.mastery_score)} percent`}
                                >
                                  <span
                                    style={{
                                      width: `${Math.max(6, Math.min(100, skill.mastery_score))}%`,
                                      background: accent,
                                    }}
                                  />
                                </div>
                              </article>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="nova-plus-insight-ribbon">
                    <span>↗</span>
                    <div>
                      <small>Movement Nova has noticed</small>
                      <strong>
                        {novaPlusImprovingSkills[0]
                          ? `${novaPlusImprovingSkills[0].skill_name} is trending upward.`
                          : "Nova is waiting for enough repeated evidence to confirm a trend."}
                      </strong>
                    </div>
                  </section>
                </div>
              )}

              {!profileLoading && profilePayload && profileView === "mastery" && (
                <div className="nova-plus-view nova-plus-mastery-view">
                  <section className="nova-plus-map-toolbar">
                    <div>
                      <p className="nova-vt-eyebrow">Curriculum mastery map</p>
                      <h4>Explore the learner’s skill landscape</h4>
                    </div>

                    <div className="nova-plus-subject-pills">
                      {(["all", "english", "math", "science"] as const).map((subject) => (
                        <button
                          key={subject}
                          type="button"
                          className={profileSubjectFilter === subject ? "active" : ""}
                          onClick={() => setProfileSubjectFilter(subject)}
                        >
                          {subject === "all" ? "All" : profileSubjectLabel(subject)}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="nova-plus-map-grid">
                    {filteredProfileTopicGroups.length === 0 ? (
                      <div className="nova-plus-empty">No mapped topics are available yet.</div>
                    ) : (
                      filteredProfileTopicGroups.map((group) => {
                        const accent = subjectAccent(group.subject);
                        const expanded = expandedTopics.has(group.key);

                        return (
                          <article
                            key={group.key}
                            className={`nova-plus-topic-world ${expanded ? "expanded" : ""}`}
                            style={{ borderColor: `${accent}35` }}
                          >
                            <button
                              type="button"
                              className="nova-plus-topic-world-head"
                              onClick={() => toggleTopic(group.key)}
                            >
                              <div
                                className="nova-plus-topic-ring"
                                style={{
                                  background: `conic-gradient(${accent} ${Math.max(
                                    0,
                                    Math.min(100, group.masteryScore),
                                  )}%, rgba(255,255,255,0.07) 0)`,
                                }}
                              >
                                <div style={{ color: accent }}>
                                  {SUBJECT_META[group.subject as SubjectKey]?.icon || "◇"}
                                </div>
                              </div>

                              <div className="nova-plus-topic-copy">
                                <small>{profileSubjectLabel(group.subject)}{group.primaryLevel ? ` · Primary ${group.primaryLevel}` : ""}</small>
                                <strong>{group.topic}</strong>
                                <span>{profileStatusLabel(group.status)}</span>
                              </div>

                              <span className="nova-plus-topic-expand">{expanded ? "−" : "+"}</span>
                            </button>

                            <div className="nova-plus-topic-legend">
                              <span><i className="mastered" /> Mastered</span>
                              <span><i className="secure" /> Secure</span>
                              <span><i className="developing" /> Developing</span>
                              <span><i className="support" /> Needs attention</span>
                            </div>

                            {expanded && (
                              <div className="nova-plus-skill-node-map">
                                {group.granularSkills.length === 0 ? (
                                  <div className="nova-plus-empty compact">
                                    This topic is currently represented at topic level.
                                  </div>
                                ) : (
                                  group.granularSkills.map((skill) => (
                                    <article
                                      key={skill.skill_id}
                                      className="nova-plus-skill-node"
                                      title={`${profileStatusLabel(skill.status)} · ${evidenceQualityLabel(skill.evidence_quality)}`}
                                    >
                                      <span
                                        style={{
                                          background: profileStatusColour(skill.status),
                                          boxShadow: `0 0 18px ${profileStatusColour(skill.status)}55`,
                                        }}
                                      />
                                      <strong>{skill.skill_name}</strong>
                                      <small>{profileStatusLabel(skill.status)}</small>
                                    </article>
                                  ))
                                )}
                              </div>
                            )}
                          </article>
                        );
                      })
                    )}
                  </section>
                </div>
              )}

              {!profileLoading && profilePayload && profileView === "recommends" && (
                <div className="nova-plus-view nova-plus-recommend-view">
                  <section className="nova-plus-recommend-hero">
                    <div>
                      <p className="nova-vt-eyebrow">Nova’s next move</p>
                      <h4>Turn the learning profile into action</h4>
                      <p>
                        Nova prioritises practice that closes a real gap, refreshes fading knowledge,
                        stretches secure skills and checks whether support worked.
                      </p>
                    </div>
                    <button type="button" onClick={() => setTab("plan")}>Open seven-day plan →</button>
                  </section>

                  <section className="nova-plus-recommend-grid">
                    {novaPlusRecommendations.map((item) => (
                      <article key={item.key} className={`nova-plus-recommend-card ${item.key}`}>
                        <div className="nova-plus-recommend-visual">
                          <span>{item.icon}</span>
                          <div className="nova-plus-recommend-pulse" />
                        </div>
                        <div className="nova-plus-recommend-copy">
                          <small>{item.label}</small>
                          <h5>{item.title}</h5>
                          <p>{item.reason}</p>
                        </div>
                        <button type="button" onClick={() => setTab("plan")}>View plan</button>
                      </article>
                    ))}
                  </section>

                  <section className="nova-plus-reassess-flow">
                    <div className="nova-plus-flow-step done"><span>1</span><strong>Identify</strong></div>
                    <i />
                    <div className="nova-plus-flow-step active"><span>2</span><strong>Practise</strong></div>
                    <i />
                    <div className="nova-plus-flow-step"><span>3</span><strong>Reassess</strong></div>
                    <i />
                    <div className="nova-plus-flow-step"><span>4</span><strong>Confirm growth</strong></div>
                  </section>
                </div>
              )}

              {!profileLoading && profilePayload && profileView === "progress" && (
                <div className="nova-plus-view nova-plus-progress-view">
                  <section className="nova-plus-progress-chart-card">
                    <div className="nova-plus-section-title">
                      <div>
                        <p className="nova-vt-eyebrow">Learning journey</p>
                        <h4>How the profile is moving over time</h4>
                      </div>
                      <span className="nova-plus-progress-arrow">↗</span>
                    </div>

                    {novaPlusProgressSeries.length < 2 ? (
                      <div className="nova-plus-empty">
                        Nova needs at least two saved snapshots before a progress journey can be drawn.
                      </div>
                    ) : (
                      <div className="nova-plus-chart-wrap">
                        <svg viewBox="0 0 700 230" role="img" aria-label="Overall mastery progress over time">
                          <defs>
                            <linearGradient id="novaPlusArea" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#8dfcff" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#8dfcff" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <line x1="0" x2="700" y1="190" y2="190" className="nova-plus-chart-axis" />
                          <line x1="0" x2="700" y1="110" y2="110" className="nova-plus-chart-grid" />
                          <line x1="0" x2="700" y1="30" y2="30" className="nova-plus-chart-grid" />
                          <polygon points={`0,190 ${novaPlusProgressPoints} 700,190`} fill="url(#novaPlusArea)" />
                          <polyline points={novaPlusProgressPoints} className="nova-plus-chart-line" />
                          {novaPlusProgressSeries.map((entry, index) => {
                            const x = (index / Math.max(1, novaPlusProgressSeries.length - 1)) * 700;
                            const y = 190 - (Math.max(0, Math.min(100, entry.mastery)) / 100) * 160;
                            return <circle key={`${entry.date}-${index}`} cx={x} cy={y} r="6" className="nova-plus-chart-dot" />;
                          })}
                        </svg>
                        <div className="nova-plus-chart-labels">
                          <span>{formatProfileDate(novaPlusProgressSeries[0]?.date)}</span>
                          <span>{formatProfileDate(novaPlusProgressSeries[novaPlusProgressSeries.length - 1]?.date)}</span>
                        </div>
                      </div>
                    )}
                  </section>

                  <section className="nova-plus-progress-subjects">
                    {profileSubjectSummaries.slice(0, 4).map((subject) => {
                      const accent = subjectAccent(subject.subject);
                      return (
                        <article key={subject.subject}>
                          <div className="nova-plus-progress-subject-head">
                            <span style={{ color: accent }}>{SUBJECT_META[subject.subject as SubjectKey]?.icon || "◇"}</span>
                            <strong>{profileSubjectLabel(subject.subject)}</strong>
                          </div>
                          <div className="nova-plus-progress-track">
                            <span style={{ width: `${Math.max(0, Math.min(100, safeNumber(subject.mastery_score)))}%`, background: accent }} />
                          </div>
                          <small>
                            {subject.secure_skills > 0
                              ? `${subject.secure_skills} secure areas`
                              : "Still gathering secure evidence"}
                          </small>
                        </article>
                      );
                    })}
                  </section>

                  <section className="nova-plus-milestones">
                    <article className="celebrate">
                      <span>✦</span>
                      <div>
                        <small>Latest growth signal</small>
                        <strong>{novaPlusImprovingSkills[0]?.skill_name || "More progress data is being collected"}</strong>
                      </div>
                    </article>
                    <article className="watch">
                      <span>◎</span>
                      <div>
                        <small>Watch next</small>
                        <strong>{novaPlusReviewSkills[0]?.skill_name || novaPlusGapSkills[0]?.skill_name || "No review is due yet"}</strong>
                      </div>
                    </article>
                    <article className="history">
                      <span>↺</span>
                      <div>
                        <small>Resolved findings</small>
                        <strong>{resolvedProfileInsights.length} learning signal{resolvedProfileInsights.length === 1 ? "" : "s"} resolved</strong>
                      </div>
                    </article>
                  </section>
                </div>
              )}

              {!profileLoading && profilePayload && profileView === "parent" && (
                <div className="nova-plus-view nova-plus-parent-view">
                  <section className="nova-plus-parent-cover">
                    <div className="nova-plus-parent-nova">
                      <img src="/nova/nova-character.png" alt="Nova" />
                    </div>
                    <div>
                      <p className="nova-vt-eyebrow">Parent learning report</p>
                      <h4>{studentLabel}’s current learning picture</h4>
                      <p>{displayedParentNote}</p>
                    </div>
                    <div className="nova-plus-parent-status">
                      <span>{priorityProfileSubject ? "Focus identified" : "Profile developing"}</span>
                      <strong>
                        {priorityProfileSubject
                          ? profileSubjectLabel(priorityProfileSubject.subject)
                          : "Nova is collecting evidence"}
                      </strong>
                    </div>
                  </section>

                  <section className="nova-plus-parent-triptych">
                    <article className="celebrate">
                      <div className="nova-plus-report-icon">✦</div>
                      <small>Celebrate</small>
                      <strong>
                        {novaPlusStrongSkills[0]?.skill_name ||
                          (strongestProfileSubject
                            ? profileSubjectLabel(strongestProfileSubject.subject)
                            : "Steady participation")}
                      </strong>
                      <p>
                        {novaPlusStrongSkills[0]
                          ? `This is one of Nova’s clearest current strengths in ${profileSubjectLabel(novaPlusStrongSkills[0].subject)}.`
                          : "More varied evidence will let Nova confirm specific strengths."}
                      </p>
                    </article>

                    <article className="focus">
                      <div className="nova-plus-report-icon">◎</div>
                      <small>Focus</small>
                      <strong>{novaPlusGapSkills[0]?.skill_name || "No persistent gap confirmed"}</strong>
                      <p>
                        {novaPlusGapSkills[0]
                          ? `Nova is prioritising this ${profileSubjectLabel(novaPlusGapSkills[0].subject)} skill before moving on.`
                          : "Current evidence does not show a stable weakness that needs intervention."}
                      </p>
                    </article>

                    <article className="next">
                      <div className="nova-plus-report-icon">➜</div>
                      <small>Next</small>
                      <strong>{recommendations[0] || "Continue regular practice"}</strong>
                      <p>Nova will update the profile as new work is completed.</p>
                    </article>
                  </section>

                  <section className="nova-plus-parent-visual-summary">
                    <div className="nova-plus-parent-rings">
                      {profileSubjectSummaries.slice(0, 3).map((subject) => {
                        const accent = subjectAccent(subject.subject);
                        const mastery = Math.max(0, Math.min(100, safeNumber(subject.mastery_score)));
                        return (
                          <article key={subject.subject}>
                            <div
                              className="nova-plus-parent-ring"
                              style={{ background: `conic-gradient(${accent} ${mastery}%, rgba(255,255,255,0.07) 0)` }}
                            >
                              <span style={{ color: accent }}>{SUBJECT_META[subject.subject as SubjectKey]?.icon || "◇"}</span>
                            </div>
                            <strong>{profileSubjectLabel(subject.subject)}</strong>
                          </article>
                        );
                      })}
                    </div>

                    <div className="nova-plus-parent-actions">
                      <p className="nova-vt-eyebrow">What to encourage at home</p>
                      <ol>
                        {recommendations.slice(0, 3).map((recommendation, index) => (
                          <li key={`${recommendation}-${index}`}>
                            <span>{index + 1}</span>
                            <p>{recommendation}</p>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </section>

                  <footer className="nova-plus-parent-footer">
                    <span>Last profile update: {formatProfileDate(profileSnapshot.generated_at || profilePayload.generated_at)}</span>
                    <span>{granularReadyCount} specific skills currently have reliable direct evidence</span>
                  </footer>
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
            padding: 0;
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
            width: 100vw;
            height: 100dvh;
            max-height: 100dvh;
            margin: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            visibility: visible;
            opacity: 1;
            transform: none;
            border-radius: 0;
            border: 0;
            background: linear-gradient(145deg, #071a32, #030916 74%);
            color: white;
            box-shadow: none;
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
            grid-template-columns: repeat(5, minmax(0, 1fr));
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
            grid-template-columns: repeat(5, minmax(0, 1fr));
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
              padding: 0;
            }

            .nova-vt-modal {
              width: 100vw;
              height: 100dvh;
              max-height: 100dvh;
              border-radius: 0;
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
              padding: 0;
              align-items: stretch;
              justify-content: stretch;
            }

            .nova-vt-modal {
              width: 100vw;
              height: 100dvh;
              max-height: 100dvh;
              border-radius: 0;
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


          .nova-vt-age-context {
            margin-top: 14px;
            padding: 18px;
            display: grid;
            grid-template-columns: minmax(250px, 1.15fr) minmax(420px, 1.85fr);
            gap: 16px;
            border-radius: 18px;
            border: 1px solid rgba(126, 232, 255, 0.18);
            background:
              linear-gradient(
                145deg,
                rgba(83, 215, 255, 0.075),
                rgba(167, 139, 250, 0.055)
              );
          }

          .nova-vt-age-context h3 {
            margin: 7px 0 0;
            font-size: 21px;
          }

          .nova-vt-age-context > div:first-child > p:last-child {
            margin: 9px 0 0;
            color: rgba(235, 247, 255, 0.58);
            font-size: 12px;
            line-height: 1.55;
          }

          .nova-vt-age-context-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
          }

          .nova-vt-age-context-grid > div {
            background: rgba(255, 255, 255, 0.035);
          }

          .nova-vt-age-context-grid > div strong {
            font-size: 11px;
            line-height: 1.35;
          }

          .nova-vt-age-context-rule {
            grid-column: 1 / -1;
            display: flex;
            align-items: center;
            gap: 7px;
            color: rgba(235, 247, 255, 0.43);
            font-size: 10px;
          }

          @media (max-width: 900px) {
            .nova-vt-age-context {
              grid-template-columns: 1fr;
            }

            .nova-vt-age-context-grid {
              grid-template-columns: 1fr;
            }
          }

          /* ============================================================
             NOVA+ INTELLIGENCE
             Graphic-first premium learning workspace
             ============================================================ */

          .nova-vt-tabs .nova-plus-tab {
            position: relative;
            overflow: hidden;
          }

          .nova-vt-tabs .nova-plus-tab::before {
            content: "";
            position: absolute;
            inset: 0;
            background:
              radial-gradient(circle at 20% 15%, rgba(192, 132, 252, 0.18), transparent 42%),
              radial-gradient(circle at 82% 82%, rgba(83, 215, 255, 0.12), transparent 42%);
            opacity: 0.8;
            pointer-events: none;
          }

          .nova-vt-tabs .nova-plus-tab.active {
            border-color: rgba(196, 181, 253, 0.46);
            background:
              linear-gradient(135deg, rgba(76, 29, 149, 0.34), rgba(8, 145, 178, 0.18));
            box-shadow:
              inset 0 0 0 1px rgba(255, 255, 255, 0.02),
              0 0 28px rgba(167, 139, 250, 0.18);
          }

          .nova-plus-tab-label {
            position: relative;
            z-index: 1;
            display: inline-flex;
            align-items: center;
            gap: 7px;
            letter-spacing: 0.08em;
          }

          .nova-plus-tab-star {
            color: #ddd6fe;
            text-shadow: 0 0 14px rgba(196, 181, 253, 0.75);
          }

          .nova-plus-shell {
            display: grid;
            gap: 14px;
            min-height: 0;
          }

          .nova-plus-hero {
            position: relative;
            min-height: 190px;
            padding: 24px 270px 24px 24px;
            overflow: hidden;
            border-radius: 24px;
            border: 1px solid rgba(196, 181, 253, 0.22);
            background:
              radial-gradient(circle at 83% 45%, rgba(124, 58, 237, 0.27), transparent 28%),
              radial-gradient(circle at 64% 20%, rgba(14, 165, 233, 0.12), transparent 35%),
              linear-gradient(135deg, rgba(30, 18, 65, 0.72), rgba(4, 16, 34, 0.76));
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.035),
              0 20px 55px rgba(0, 0, 0, 0.2);
          }

          .nova-plus-hero::after {
            content: "";
            position: absolute;
            inset: 0;
            background-image:
              radial-gradient(circle at 10% 20%, rgba(255,255,255,0.33) 0 1px, transparent 1.5px),
              radial-gradient(circle at 34% 70%, rgba(255,255,255,0.22) 0 1px, transparent 1.5px),
              radial-gradient(circle at 58% 34%, rgba(255,255,255,0.28) 0 1px, transparent 1.5px),
              radial-gradient(circle at 91% 70%, rgba(255,255,255,0.28) 0 1px, transparent 1.5px);
            background-size: 150px 110px, 190px 130px, 170px 120px, 210px 150px;
            opacity: 0.45;
            pointer-events: none;
          }

          .nova-plus-hero-copy {
            position: relative;
            z-index: 2;
            max-width: 760px;
          }

          .nova-plus-brand-line {
            display: flex;
            align-items: center;
            gap: 9px;
          }

          .nova-plus-kicker,
          .nova-plus-preview-badge {
            min-height: 28px;
            padding: 0 10px;
            border-radius: 999px;
            display: inline-flex;
            align-items: center;
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 0.14em;
            text-transform: uppercase;
          }

          .nova-plus-kicker {
            border: 1px solid rgba(196, 181, 253, 0.45);
            background: rgba(124, 58, 237, 0.2);
            color: #ede9fe;
            box-shadow: 0 0 24px rgba(167, 139, 250, 0.17);
          }

          .nova-plus-preview-badge {
            border: 1px solid rgba(83, 215, 255, 0.22);
            background: rgba(83, 215, 255, 0.07);
            color: #bdf6ff;
          }

          .nova-plus-hero h3 {
            margin: 12px 0 0;
            font-size: clamp(30px, 4.3vw, 48px);
            line-height: 1;
            letter-spacing: -0.05em;
          }

          .nova-plus-hero-copy > p {
            max-width: 710px;
            margin: 12px 0 0;
            color: rgba(235, 247, 255, 0.63);
            font-size: 13px;
            line-height: 1.65;
          }

          .nova-plus-hero-visual {
            position: absolute;
            right: 42px;
            top: 50%;
            z-index: 2;
            width: 180px;
            height: 180px;
            transform: translateY(-50%);
          }

          .nova-plus-orbit {
            position: absolute;
            left: 50%;
            top: 50%;
            border-radius: 999px;
            border: 1px solid rgba(196, 181, 253, 0.24);
            transform: translate(-50%, -50%);
          }

          .nova-plus-orbit.orbit-one {
            width: 176px;
            height: 176px;
            box-shadow: 0 0 30px rgba(139, 92, 246, 0.12);
          }

          .nova-plus-orbit.orbit-two {
            width: 132px;
            height: 132px;
            border-color: rgba(83, 215, 255, 0.2);
          }

          .nova-plus-core {
            position: absolute;
            left: 50%;
            top: 50%;
            width: 104px;
            height: 104px;
            overflow: hidden;
            border-radius: 999px;
            border: 1px solid rgba(141, 252, 255, 0.38);
            background:
              radial-gradient(circle at 50% 55%, rgba(83, 215, 255, 0.18), rgba(20, 9, 51, 0.93));
            transform: translate(-50%, -50%);
            box-shadow:
              0 0 32px rgba(83, 215, 255, 0.24),
              0 0 60px rgba(139, 92, 246, 0.18);
          }

          .nova-plus-core img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            object-position: center bottom;
          }

          .nova-plus-spark {
            position: absolute;
            color: #ede9fe;
            text-shadow: 0 0 14px rgba(196, 181, 253, 0.85);
          }

          .nova-plus-spark.spark-a { left: 12px; top: 48px; }
          .nova-plus-spark.spark-b { right: 14px; top: 30px; }
          .nova-plus-spark.spark-c { right: 2px; bottom: 35px; }

          .nova-plus-refresh {
            position: absolute;
            left: 24px;
            bottom: 18px;
            z-index: 3;
            min-height: 38px;
            padding: 0 14px;
            border-radius: 999px;
            border: 1px solid rgba(196, 181, 253, 0.3);
            background: rgba(124, 58, 237, 0.12);
            color: #ede9fe;
            font-size: 10px;
            font-weight: 850;
            cursor: pointer;
          }

          .nova-plus-refresh:disabled {
            opacity: 0.5;
            cursor: wait;
          }

          .nova-plus-nav {
            display: grid;
            grid-template-columns: repeat(6, minmax(0, 1fr));
            gap: 7px;
            padding: 6px;
            border-radius: 18px;
            border: 1px solid rgba(196, 181, 253, 0.11);
            background: rgba(255, 255, 255, 0.02);
          }

          .nova-plus-nav button {
            min-height: 58px;
            padding: 8px 7px;
            border-radius: 14px;
            border: 1px solid transparent;
            background: transparent;
            color: rgba(235, 247, 255, 0.5);
            display: grid;
            grid-template-columns: 24px minmax(0, 1fr);
            align-items: center;
            gap: 6px;
            text-align: left;
            font-family: inherit;
            cursor: pointer;
          }

          .nova-plus-nav button > span {
            width: 24px;
            height: 24px;
            border-radius: 9px;
            display: grid;
            place-items: center;
            border: 1px solid rgba(196, 181, 253, 0.12);
            background: rgba(196, 181, 253, 0.05);
            color: #c4b5fd;
            font-size: 12px;
          }

          .nova-plus-nav button strong {
            font-size: 10px;
            line-height: 1.2;
          }

          .nova-plus-nav button.active {
            border-color: rgba(196, 181, 253, 0.28);
            background:
              linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(8, 145, 178, 0.08));
            color: white;
            box-shadow: 0 0 22px rgba(124, 58, 237, 0.1);
          }

          .nova-plus-nav button.active > span {
            border-color: rgba(196, 181, 253, 0.34);
            background: rgba(124, 58, 237, 0.16);
            color: #ede9fe;
          }

          .nova-plus-loading,
          .nova-plus-empty {
            min-height: 170px;
            border-radius: 20px;
            border: 1px dashed rgba(196, 181, 253, 0.17);
            background: rgba(255, 255, 255, 0.018);
            color: rgba(235, 247, 255, 0.5);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 24px;
            text-align: center;
            font-size: 12px;
            line-height: 1.5;
          }

          .nova-plus-empty.compact {
            min-height: 100px;
          }

          .nova-plus-loading-orb {
            width: 36px;
            height: 36px;
            border-radius: 999px;
            border: 2px solid rgba(196, 181, 253, 0.15);
            border-top-color: #c4b5fd;
            box-shadow: 0 0 24px rgba(167, 139, 250, 0.18);
            animation: nova-plus-spin 0.9s linear infinite;
          }

          @keyframes nova-plus-spin {
            to { transform: rotate(360deg); }
          }

          .nova-plus-view {
            display: grid;
            gap: 14px;
          }

          .nova-plus-learning-stage,
          .nova-plus-constellation-card,
          .nova-plus-gap-card,
          .nova-plus-map-toolbar,
          .nova-plus-topic-world,
          .nova-plus-recommend-hero,
          .nova-plus-recommend-card,
          .nova-plus-reassess-flow,
          .nova-plus-progress-chart-card,
          .nova-plus-progress-subjects,
          .nova-plus-milestones,
          .nova-plus-parent-cover,
          .nova-plus-parent-triptych > article,
          .nova-plus-parent-visual-summary,
          .nova-plus-pattern-strip,
          .nova-plus-age-ribbon,
          .nova-plus-insight-ribbon {
            border: 1px solid rgba(196, 181, 253, 0.1);
            background: rgba(255, 255, 255, 0.024);
            border-radius: 20px;
          }

          .nova-plus-learning-stage-simple {
            padding: 24px;
          }

          .nova-plus-learning-heading {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 18px;
            margin-bottom: 18px;
          }

          .nova-plus-learning-heading h4 {
            margin: 6px 0 0;
            font-size: clamp(22px, 2.4vw, 31px);
            letter-spacing: -0.035em;
          }

          .nova-plus-status-legend {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            justify-content: flex-end;
            gap: 10px;
            color: rgba(235,247,255,0.5);
            font-size: 9px;
            font-weight: 800;
          }

          .nova-plus-status-legend span {
            display: inline-flex;
            align-items: center;
            gap: 5px;
          }

          .nova-plus-status-legend i {
            width: 8px;
            height: 8px;
            border-radius: 999px;
            box-shadow: 0 0 12px currentColor;
          }

          .nova-plus-status-legend i.strong {
            background: #45e59a;
            color: #45e59a;
          }

          .nova-plus-status-legend i.developing {
            background: #ffad42;
            color: #ffad42;
          }

          .nova-plus-status-legend i.attention {
            background: #ff646e;
            color: #ff646e;
          }

          .nova-plus-learning-main {
            display: grid;
            grid-template-columns: minmax(220px, 0.7fr) minmax(0, 2fr);
            gap: 16px;
            align-items: stretch;
          }

          .nova-plus-learner-card {
            min-height: 330px;
            padding: 20px;
            border-radius: 22px;
            border: 1px solid rgba(141,252,255,0.13);
            background:
              radial-gradient(circle at 50% 24%, rgba(83,215,255,0.12), transparent 32%),
              linear-gradient(155deg, rgba(16,44,70,0.72), rgba(4,11,26,0.86));
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .nova-plus-avatar-button {
            position: relative;
            width: 178px;
            height: 178px;
            padding: 8px;
            border-radius: 999px;
            border: 1px solid rgba(141,252,255,0.4);
            background:
              conic-gradient(
                from 25deg,
                rgba(141,252,255,0.92),
                rgba(167,139,250,0.72),
                rgba(141,252,255,0.92)
              );
            box-shadow:
              0 0 34px rgba(83,215,255,0.18),
              inset 0 0 26px rgba(255,255,255,0.06);
            cursor: pointer;
          }

          .nova-plus-learner-avatar {
            width: 100%;
            height: 100%;
            overflow: hidden;
            border-radius: inherit;
            border: 1px solid rgba(255,255,255,0.16);
            background:
              radial-gradient(circle at 50% 34%, rgba(19,63,92,0.96), rgba(4,11,26,0.98));
            display: grid;
            place-items: center;
          }

          .nova-plus-learner-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .nova-plus-learner-avatar > span,
          .nova-plus-avatar-option > span {
            display: grid;
            place-items: center;
            color: white;
            font-weight: 950;
            text-shadow: 0 6px 22px rgba(0,0,0,0.35);
          }

          .nova-plus-learner-avatar > span {
            width: 100%;
            height: 100%;
            font-size: 66px;
          }

          .avatar-star {
            background: radial-gradient(circle at 35% 30%, #fef3c7, #7c3aed 68%, #172554);
          }

          .avatar-rocket {
            background: radial-gradient(circle at 35% 30%, #bae6fd, #0369a1 62%, #082f49);
          }

          .avatar-orbit {
            background: radial-gradient(circle at 40% 35%, #d8b4fe, #6d28d9 60%, #1e1b4b);
          }

          .avatar-puzzle {
            background: radial-gradient(circle at 35% 30%, #bbf7d0, #047857 62%, #052e16);
          }

          .avatar-spark {
            background: radial-gradient(circle at 40% 30%, #fde68a, #ea580c 63%, #431407);
          }

          .avatar-moon {
            background: radial-gradient(circle at 35% 30%, #e2e8f0, #475569 62%, #0f172a);
          }

          .avatar-compass {
            background: radial-gradient(circle at 35% 30%, #fecdd3, #be123c 62%, #4c0519);
          }

          .avatar-bolt {
            background: radial-gradient(circle at 35% 30%, #cffafe, #0e7490 62%, #083344);
          }

          .nova-plus-avatar-edit {
            position: absolute;
            right: 6px;
            bottom: 12px;
            width: 38px;
            height: 38px;
            border-radius: 999px;
            border: 2px solid #071326;
            background: #8dfcff;
            color: #071326;
            display: grid;
            place-items: center;
            font-size: 14px;
            font-weight: 950;
            box-shadow: 0 9px 28px rgba(0,0,0,0.35);
          }

          .nova-plus-learner-card > strong {
            margin-top: 14px;
            font-size: 20px;
            letter-spacing: -0.025em;
          }

          .nova-plus-change-avatar-link {
            margin-top: 5px;
            padding: 0;
            border: 0;
            background: transparent;
            color: #8dfcff;
            font-size: 10px;
            font-weight: 850;
            cursor: pointer;
          }

          .nova-plus-learner-coach {
            width: 100%;
            margin-top: auto;
            padding: 10px 12px;
            border-radius: 15px;
            border: 1px solid rgba(196,181,253,0.14);
            background: rgba(124,58,237,0.08);
            display: grid;
            grid-template-columns: 38px minmax(0,1fr);
            align-items: center;
            gap: 9px;
            text-align: left;
          }

          .nova-plus-learner-coach img {
            width: 32px;
            height: 42px;
            object-fit: contain;
            object-position: center bottom;
          }

          .nova-plus-learner-coach span {
            color: rgba(235,247,255,0.58);
            font-size: 10px;
            line-height: 1.4;
          }

          .nova-plus-curriculum-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0,1fr));
            gap: 12px;
            align-content: stretch;
          }

          .nova-plus-subject-zone {
            position: relative;
            min-height: 210px;
            padding: 18px;
            overflow: hidden;
            border-radius: 22px;
            border: 1px solid;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            justify-content: space-between;
          }

          .nova-plus-subject-zone::after {
            content: "";
            position: absolute;
            right: -38px;
            bottom: -48px;
            width: 150px;
            height: 150px;
            border-radius: 999px;
            border: 1px solid currentColor;
            opacity: 0.07;
          }

          .nova-plus-subject-zone-icon {
            width: 54px;
            height: 54px;
            border-radius: 17px;
            border: 1px solid;
            display: grid;
            place-items: center;
            font-size: 24px;
            font-weight: 950;
          }

          .nova-plus-subject-zone-copy {
            position: relative;
            z-index: 1;
          }

          .nova-plus-subject-zone-copy > strong {
            display: block;
            font-size: 17px;
            letter-spacing: -0.02em;
          }

          .nova-plus-subject-zone-copy > span {
            display: block;
            margin-top: 7px;
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }

          .nova-plus-subject-state-light {
            position: absolute;
            top: 16px;
            right: 16px;
            width: 10px;
            height: 10px;
            border-radius: 999px;
          }

          .nova-plus-knowledge-zone {
            grid-column: 1 / -1;
            min-height: 80px;
            padding: 13px 15px;
            border-radius: 18px;
            border: 1px solid;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
          }

          .nova-plus-knowledge-left {
            display: flex;
            align-items: center;
            gap: 11px;
          }

          .nova-plus-knowledge-icon {
            width: 42px;
            height: 42px;
            border-radius: 13px;
            border: 1px solid;
            display: grid;
            place-items: center;
            font-size: 17px;
            font-weight: 950;
          }

          .nova-plus-knowledge-left small {
            color: rgba(235,247,255,0.4);
            font-size: 8px;
            font-weight: 900;
            letter-spacing: 0.1em;
            text-transform: uppercase;
          }

          .nova-plus-knowledge-left strong {
            display: block;
            margin-top: 3px;
            font-size: 13px;
          }

          .nova-plus-knowledge-status {
            padding: 7px 10px;
            border-radius: 999px;
            border: 1px solid;
            font-size: 9px;
            font-weight: 900;
            text-transform: uppercase;
          }

          .nova-plus-learning-actions {
            margin-top: 14px;
            display: grid;
            grid-template-columns: minmax(0,0.85fr) minmax(0,0.95fr) minmax(0,1.35fr);
            gap: 11px;
          }

          .nova-plus-quick-answer,
          .nova-plus-next-mission {
            min-height: 104px;
            border-radius: 18px;
          }

          .nova-plus-quick-answer {
            padding: 14px;
            border: 1px solid rgba(255,255,255,0.09);
            background: rgba(255,255,255,0.025);
            display: grid;
            grid-template-columns: 40px minmax(0,1fr);
            align-items: center;
            gap: 10px;
          }

          .nova-plus-quick-icon {
            width: 40px;
            height: 40px;
            border-radius: 13px;
            display: grid;
            place-items: center;
            font-weight: 950;
          }

          .strong-answer .nova-plus-quick-icon {
            color: #45e59a;
            border: 1px solid rgba(69,229,154,0.35);
            background: rgba(69,229,154,0.1);
          }

          .focus-answer .nova-plus-quick-icon {
            color: #ff646e;
            border: 1px solid rgba(255,100,110,0.35);
            background: rgba(255,100,110,0.1);
          }

          .nova-plus-quick-answer small,
          .nova-plus-next-copy small {
            color: rgba(235,247,255,0.42);
            font-size: 8px;
            font-weight: 900;
            letter-spacing: 0.1em;
            text-transform: uppercase;
          }

          .nova-plus-quick-answer strong {
            display: block;
            margin-top: 5px;
            font-size: 13px;
            line-height: 1.35;
          }

          .nova-plus-next-mission {
            padding: 12px 14px;
            border: 1px solid rgba(196,181,253,0.3);
            background:
              linear-gradient(135deg, rgba(124,58,237,0.2), rgba(83,215,255,0.08));
            color: white;
            display: grid;
            grid-template-columns: 50px minmax(0,1fr) 32px;
            align-items: center;
            gap: 10px;
            text-align: left;
            cursor: pointer;
            box-shadow: 0 0 26px rgba(124,58,237,0.08);
          }

          .nova-plus-next-nova {
            width: 48px;
            height: 62px;
            display: grid;
            place-items: end center;
          }

          .nova-plus-next-nova img {
            width: 42px;
            height: 58px;
            object-fit: contain;
            object-position: center bottom;
          }

          .nova-plus-next-copy > strong {
            display: block;
            margin-top: 4px;
            font-size: 14px;
          }

          .nova-plus-next-copy > span {
            display: block;
            margin-top: 5px;
            color: #c4b5fd;
            font-size: 9px;
            font-weight: 850;
          }

          .nova-plus-next-arrow {
            width: 30px;
            height: 30px;
            border-radius: 999px;
            border: 1px solid rgba(196,181,253,0.26);
            background: rgba(196,181,253,0.08);
            display: grid;
            place-items: center;
            color: #ddd6fe;
            font-size: 15px;
          }

          .nova-plus-avatar-picker-backdrop {
            position: fixed;
            inset: 0;
            z-index: 2147483400;
            padding: 24px;
            display: grid;
            place-items: center;
            background: rgba(0,3,12,0.82);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }

          .nova-plus-avatar-picker {
            width: min(720px, calc(100vw - 30px));
            max-height: min(760px, calc(100dvh - 30px));
            overflow-y: auto;
            border-radius: 24px;
            border: 1px solid rgba(141,252,255,0.28);
            background:
              radial-gradient(circle at 15% 0%, rgba(83,215,255,0.08), transparent 30%),
              linear-gradient(145deg, #071a32, #030916 74%);
            box-shadow: 0 32px 90px rgba(0,0,0,0.68);
            padding: 20px;
          }

          .nova-plus-avatar-picker header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 14px;
          }

          .nova-plus-avatar-picker header h4 {
            margin: 6px 0 0;
            font-size: 22px;
          }

          .nova-plus-avatar-picker header > button {
            width: 38px;
            height: 38px;
            border-radius: 999px;
            border: 1px solid rgba(255,255,255,0.13);
            background: rgba(255,255,255,0.05);
            color: white;
            font-size: 20px;
            cursor: pointer;
          }

          .nova-plus-avatar-options {
            margin-top: 18px;
            display: grid;
            grid-template-columns: repeat(4, minmax(0,1fr));
            gap: 10px;
          }

          .nova-plus-avatar-option {
            min-height: 128px;
            padding: 10px;
            border-radius: 17px;
            border: 1px solid rgba(255,255,255,0.09);
            background: rgba(255,255,255,0.025);
            color: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            cursor: pointer;
          }

          .nova-plus-avatar-option.selected {
            border-color: rgba(141,252,255,0.55);
            box-shadow: 0 0 24px rgba(83,215,255,0.12);
          }

          .nova-plus-avatar-option > span {
            width: 76px;
            height: 76px;
            border-radius: 999px;
            font-size: 30px;
          }

          .nova-plus-avatar-option > strong {
            font-size: 10px;
          }

          .nova-plus-avatar-upload-row {
            margin-top: 16px;
            padding: 14px;
            border-radius: 17px;
            border: 1px solid rgba(196,181,253,0.16);
            background: rgba(124,58,237,0.07);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
          }

          .nova-plus-avatar-upload-row strong {
            display: block;
            font-size: 12px;
          }

          .nova-plus-avatar-upload-row span {
            display: block;
            margin-top: 4px;
            color: rgba(235,247,255,0.44);
            font-size: 10px;
          }

          .nova-plus-avatar-upload-button {
            min-height: 42px;
            padding: 0 15px;
            border-radius: 13px;
            border: 1px solid rgba(141,252,255,0.3);
            background: rgba(83,215,255,0.09);
            color: #c7f7ff;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 900;
            cursor: pointer;
            white-space: nowrap;
          }

          .nova-plus-avatar-upload-button input {
            position: absolute;
            width: 1px;
            height: 1px;
            opacity: 0;
            pointer-events: none;
          }

          .nova-plus-avatar-error {
            margin-top: 10px;
            padding: 10px 12px;
            border-radius: 13px;
            border: 1px solid rgba(255,100,110,0.25);
            background: rgba(255,100,110,0.08);
            color: #fecaca;
            font-size: 10px;
          }

          .nova-plus-learning-stage {
            padding: 22px;
            background:
              radial-gradient(circle at 50% 48%, rgba(83, 215, 255, 0.08), transparent 30%),
              radial-gradient(circle at 12% 18%, rgba(124, 58, 237, 0.11), transparent 32%),
              rgba(255, 255, 255, 0.022);
          }

          .nova-plus-learning-orbit {
            min-height: 335px;
            display: grid;
            grid-template-columns: minmax(250px, 0.75fr) minmax(0, 1.35fr);
            align-items: center;
            gap: 28px;
          }

          .nova-plus-learning-center {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .nova-plus-master-ring {
            width: 188px;
            height: 188px;
            padding: 10px;
            border-radius: 999px;
            box-shadow:
              0 0 36px rgba(83, 215, 255, 0.15),
              inset 0 0 25px rgba(83, 215, 255, 0.06);
          }

          .nova-plus-master-ring > div {
            width: 100%;
            height: 100%;
            overflow: hidden;
            border-radius: inherit;
            border: 1px solid rgba(141, 252, 255, 0.17);
            background:
              radial-gradient(circle, rgba(7, 32, 61, 0.96), rgba(4, 11, 26, 0.98));
          }

          .nova-plus-master-ring img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            object-position: center bottom;
          }

          .nova-plus-learning-center > span {
            margin-top: 14px;
            color: #8dfcff;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: 0.14em;
            text-transform: uppercase;
          }

          .nova-plus-learning-center > strong {
            max-width: 280px;
            margin-top: 7px;
            font-size: 18px;
            line-height: 1.25;
          }

          .nova-plus-subject-planets {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .nova-plus-planet {
            min-height: 145px;
            padding: 14px;
            border-radius: 18px;
            border: 1px solid;
            background:
              linear-gradient(145deg, rgba(255,255,255,0.032), rgba(255,255,255,0.012));
            display: grid;
            grid-template-columns: 66px minmax(0, 1fr);
            grid-template-rows: auto auto;
            align-items: center;
            gap: 4px 12px;
          }

          .nova-plus-planet-ring {
            grid-row: 1 / 3;
            width: 66px;
            height: 66px;
            padding: 6px;
            border-radius: 999px;
          }

          .nova-plus-planet-ring > div {
            width: 100%;
            height: 100%;
            border-radius: inherit;
            display: grid;
            place-items: center;
            background: #071326;
            font-size: 22px;
            font-weight: 900;
          }

          .nova-plus-planet > strong {
            align-self: end;
            font-size: 13px;
          }

          .nova-plus-planet > span {
            align-self: start;
            color: rgba(235, 247, 255, 0.45);
            font-size: 9.5px;
            line-height: 1.35;
          }

          .nova-plus-learning-path {
            margin-top: 12px;
            display: grid;
            grid-template-columns: minmax(0, 1fr) 54px minmax(0, 1fr) 54px minmax(0, 1fr);
            align-items: center;
            gap: 0;
          }

          .nova-plus-path-node {
            min-height: 84px;
            padding: 12px;
            border-radius: 16px;
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.026);
            display: grid;
            grid-template-columns: 36px minmax(0,1fr);
            align-items: center;
            gap: 10px;
          }

          .nova-plus-path-node > span {
            width: 36px;
            height: 36px;
            border-radius: 999px;
            display: grid;
            place-items: center;
            font-size: 12px;
            font-weight: 900;
            border: 1px solid rgba(196,181,253,0.2);
          }

          .nova-plus-path-node small,
          .nova-plus-parent-triptych small,
          .nova-plus-milestones small,
          .nova-plus-parent-status span {
            color: rgba(235,247,255,0.4);
            font-size: 8.5px;
            font-weight: 900;
            letter-spacing: 0.1em;
            text-transform: uppercase;
          }

          .nova-plus-path-node strong {
            display: block;
            margin-top: 4px;
            font-size: 11px;
            line-height: 1.35;
          }

          .nova-plus-path-node.completed > span {
            color: #a7f3d0;
            border-color: rgba(52,211,153,0.3);
            background: rgba(52,211,153,0.08);
          }

          .nova-plus-path-node.focus {
            border-color: rgba(248,113,113,0.18);
            background: rgba(248,113,113,0.04);
          }

          .nova-plus-path-node.focus > span {
            color: #fecaca;
            border-color: rgba(248,113,113,0.3);
            background: rgba(248,113,113,0.08);
          }

          .nova-plus-path-node.future > span {
            color: #ddd6fe;
            border-color: rgba(167,139,250,0.3);
            background: rgba(167,139,250,0.08);
          }

          .nova-plus-path-line {
            height: 1px;
            background: linear-gradient(90deg, rgba(141,252,255,0.18), rgba(196,181,253,0.32));
          }

          .nova-plus-pattern-strip {
            padding: 12px;
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 9px;
          }

          .nova-plus-pattern-strip > article {
            min-height: 100px;
            padding: 11px;
            border-radius: 15px;
            border: 1px solid rgba(196,181,253,0.08);
            background: rgba(255,255,255,0.02);
            display: grid;
            grid-template-columns: 46px minmax(0,1fr);
            align-items: center;
            gap: 9px;
          }

          .nova-plus-pattern-gauge {
            width: 44px;
            height: 44px;
            padding: 5px;
            border-radius: 999px;
          }

          .nova-plus-pattern-gauge > span {
            width: 100%;
            height: 100%;
            border-radius: inherit;
            display: grid;
            place-items: center;
            background: #071326;
            color: #ddd6fe;
          }

          .nova-plus-pattern-strip strong {
            font-size: 10.5px;
          }

          .nova-plus-pattern-strip p {
            margin: 5px 0 0;
            color: rgba(235,247,255,0.42);
            font-size: 9px;
            line-height: 1.4;
          }

          .nova-plus-age-ribbon,
          .nova-plus-insight-ribbon {
            min-height: 72px;
            padding: 12px 14px;
            display: grid;
            grid-template-columns: 38px minmax(160px,0.65fr) minmax(0,1.35fr) auto;
            align-items: center;
            gap: 12px;
          }

          .nova-plus-age-icon,
          .nova-plus-insight-ribbon > span {
            width: 38px;
            height: 38px;
            border-radius: 13px;
            display: grid;
            place-items: center;
            border: 1px solid rgba(196,181,253,0.18);
            background: rgba(196,181,253,0.07);
            color: #ddd6fe;
          }

          .nova-plus-age-ribbon small,
          .nova-plus-insight-ribbon small {
            color: #c4b5fd;
            font-size: 8.5px;
            font-weight: 900;
            letter-spacing: 0.11em;
            text-transform: uppercase;
          }

          .nova-plus-age-ribbon strong,
          .nova-plus-insight-ribbon strong {
            display: block;
            margin-top: 4px;
            font-size: 11px;
          }

          .nova-plus-age-ribbon > p {
            margin: 0;
            color: rgba(235,247,255,0.48);
            font-size: 10px;
            line-height: 1.5;
          }

          .nova-plus-strengths-view {
            grid-template-columns: minmax(0,1.05fr) minmax(0,0.95fr);
          }

          .nova-plus-constellation-card,
          .nova-plus-gap-card {
            min-height: 410px;
            padding: 18px;
          }

          .nova-plus-section-title {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
          }

          .nova-plus-section-title h4,
          .nova-plus-map-toolbar h4,
          .nova-plus-recommend-hero h4,
          .nova-plus-parent-cover h4 {
            margin: 7px 0 0;
            font-size: 22px;
            letter-spacing: -0.035em;
          }

          .nova-plus-section-symbol {
            width: 42px;
            height: 42px;
            border-radius: 14px;
            display: grid;
            place-items: center;
            border: 1px solid rgba(52,211,153,0.2);
            background: rgba(52,211,153,0.06);
            color: #a7f3d0;
            font-size: 17px;
          }

          .nova-plus-section-symbol.warning {
            border-color: rgba(248,113,113,0.2);
            background: rgba(248,113,113,0.05);
            color: #fecaca;
          }

          .nova-plus-constellation {
            position: relative;
            min-height: 305px;
            margin-top: 14px;
            overflow: hidden;
            border-radius: 17px;
            background:
              radial-gradient(circle at 50% 50%, rgba(83,215,255,0.05), transparent 30%),
              rgba(0,0,0,0.1);
          }

          .nova-plus-constellation-lines {
            position: absolute;
            inset: 0;
            background:
              linear-gradient(25deg, transparent 32%, rgba(141,252,255,0.08) 32.2% 32.6%, transparent 32.8%),
              linear-gradient(145deg, transparent 54%, rgba(196,181,253,0.08) 54.2% 54.6%, transparent 54.8%);
          }

          .nova-plus-skill-star {
            position: absolute;
            width: 124px;
            min-height: 76px;
            padding: 10px;
            border-radius: 17px;
            border: 1px solid;
            background: rgba(4, 12, 28, 0.91);
            display: flex;
            flex-direction: column;
            justify-content: center;
            text-align: center;
          }

          .nova-plus-skill-star > span {
            font-size: 14px;
          }

          .nova-plus-skill-star strong {
            margin-top: 3px;
            font-size: 9.5px;
            line-height: 1.25;
          }

          .nova-plus-skill-star small {
            margin-top: 4px;
            color: rgba(235,247,255,0.38);
            font-size: 8px;
          }

          .nova-plus-skill-star.star-1 { left: 8%; top: 13%; }
          .nova-plus-skill-star.star-2 { right: 8%; top: 8%; }
          .nova-plus-skill-star.star-3 { left: 35%; top: 38%; }
          .nova-plus-skill-star.star-4 { left: 8%; bottom: 9%; }
          .nova-plus-skill-star.star-5 { right: 9%; bottom: 10%; }
          .nova-plus-skill-star.star-6 { right: 31%; top: 6%; transform: scale(0.86); }

          .nova-plus-gap-radar {
            min-height: 310px;
            margin-top: 15px;
            display: grid;
            grid-template-columns: 220px minmax(0,1fr);
            align-items: center;
            gap: 16px;
          }

          .nova-plus-radar-disc {
            position: relative;
            width: 210px;
            height: 210px;
            margin: auto;
            border-radius: 999px;
            border: 1px solid rgba(83,215,255,0.13);
            background:
              linear-gradient(90deg, transparent 49.7%, rgba(83,215,255,0.07) 50%, transparent 50.3%),
              linear-gradient(0deg, transparent 49.7%, rgba(83,215,255,0.07) 50%, transparent 50.3%),
              radial-gradient(circle, rgba(83,215,255,0.06), transparent 65%);
            overflow: hidden;
          }

          .nova-plus-radar-disc .ring {
            position: absolute;
            left: 50%;
            top: 50%;
            border-radius: 999px;
            border: 1px solid rgba(83,215,255,0.11);
            transform: translate(-50%,-50%);
          }

          .nova-plus-radar-disc .r1 { width: 64px; height: 64px; }
          .nova-plus-radar-disc .r2 { width: 126px; height: 126px; }
          .nova-plus-radar-disc .r3 { width: 188px; height: 188px; }

          .nova-plus-radar-disc .sweep {
            position: absolute;
            left: 50%;
            top: 50%;
            width: 50%;
            height: 50%;
            transform-origin: 0 0;
            background: linear-gradient(25deg, rgba(83,215,255,0.18), transparent 58%);
            animation: nova-plus-radar 4.8s linear infinite;
          }

          @keyframes nova-plus-radar {
            to { transform: rotate(360deg); }
          }

          .nova-plus-radar-disc .blip {
            position: absolute;
            width: 8px;
            height: 8px;
            border-radius: 999px;
            background: #fca5a5;
            box-shadow: 0 0 14px rgba(248,113,113,0.85);
          }

          .nova-plus-radar-disc .b1 { left: 27%; top: 34%; }
          .nova-plus-radar-disc .b2 { right: 23%; top: 24%; }
          .nova-plus-radar-disc .b3 { right: 32%; bottom: 24%; }
          .nova-plus-radar-disc .b4 { left: 22%; bottom: 28%; }

          .nova-plus-gap-list {
            display: grid;
            gap: 8px;
          }

          .nova-plus-gap-list > article {
            min-height: 58px;
            padding: 9px 10px;
            display: grid;
            grid-template-columns: 9px minmax(0,1fr) 78px;
            align-items: center;
            gap: 9px;
            border-radius: 13px;
            background: rgba(255,255,255,0.025);
            border: 1px solid rgba(255,255,255,0.05);
          }

          .nova-plus-gap-status {
            width: 8px;
            height: 8px;
            border-radius: 999px;
          }

          .nova-plus-gap-list strong {
            display: block;
            font-size: 10px;
            line-height: 1.3;
          }

          .nova-plus-gap-list small {
            display: block;
            margin-top: 3px;
            color: rgba(235,247,255,0.37);
            font-size: 8px;
          }

          .nova-plus-gap-meter {
            height: 5px;
            overflow: hidden;
            border-radius: 999px;
            background: rgba(255,255,255,0.06);
          }

          .nova-plus-gap-meter span {
            display: block;
            height: 100%;
            border-radius: inherit;
          }

          .nova-plus-insight-ribbon {
            grid-column: 1 / -1;
            grid-template-columns: 38px minmax(0,1fr);
          }

          .nova-plus-map-toolbar {
            padding: 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
          }

          .nova-plus-subject-pills {
            display: flex;
            flex-wrap: wrap;
            gap: 7px;
          }

          .nova-plus-subject-pills button {
            min-height: 34px;
            padding: 0 11px;
            border-radius: 999px;
            border: 1px solid rgba(141,252,255,0.13);
            background: rgba(255,255,255,0.025);
            color: rgba(235,247,255,0.48);
            font-size: 9px;
            font-weight: 850;
            cursor: pointer;
          }

          .nova-plus-subject-pills button.active {
            border-color: rgba(141,252,255,0.32);
            background: rgba(83,215,255,0.09);
            color: white;
          }

          .nova-plus-map-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0,1fr));
            gap: 11px;
          }

          .nova-plus-topic-world {
            padding: 12px;
            transition: 180ms ease;
          }

          .nova-plus-topic-world.expanded {
            grid-column: 1 / -1;
            border-color: rgba(196,181,253,0.22) !important;
            background:
              radial-gradient(circle at 10% 10%, rgba(124,58,237,0.09), transparent 28%),
              rgba(255,255,255,0.027);
          }

          .nova-plus-topic-world-head {
            width: 100%;
            min-height: 84px;
            padding: 4px;
            border: 0;
            background: transparent;
            color: white;
            display: grid;
            grid-template-columns: 64px minmax(0,1fr) 34px;
            align-items: center;
            gap: 12px;
            text-align: left;
            cursor: pointer;
            font-family: inherit;
          }

          .nova-plus-topic-ring {
            width: 60px;
            height: 60px;
            padding: 6px;
            border-radius: 999px;
          }

          .nova-plus-topic-ring > div {
            width: 100%;
            height: 100%;
            border-radius: inherit;
            display: grid;
            place-items: center;
            background: #071326;
            font-size: 19px;
            font-weight: 900;
          }

          .nova-plus-topic-copy small {
            color: rgba(235,247,255,0.35);
            font-size: 8px;
            font-weight: 850;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .nova-plus-topic-copy strong {
            display: block;
            margin-top: 4px;
            font-size: 13px;
          }

          .nova-plus-topic-copy > span {
            display: inline-flex;
            margin-top: 5px;
            padding: 4px 7px;
            border-radius: 999px;
            background: rgba(255,255,255,0.04);
            color: rgba(235,247,255,0.45);
            font-size: 8px;
          }

          .nova-plus-topic-expand {
            width: 30px;
            height: 30px;
            border-radius: 999px;
            display: grid;
            place-items: center;
            border: 1px solid rgba(196,181,253,0.13);
            background: rgba(196,181,253,0.05);
            color: #ddd6fe;
          }

          .nova-plus-topic-legend {
            padding: 8px 4px 2px;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            border-top: 1px solid rgba(255,255,255,0.045);
            color: rgba(235,247,255,0.35);
            font-size: 7.5px;
          }

          .nova-plus-topic-legend span {
            display: inline-flex;
            align-items: center;
            gap: 4px;
          }

          .nova-plus-topic-legend i {
            width: 7px;
            height: 7px;
            border-radius: 999px;
          }

          .nova-plus-topic-legend i.mastered { background: #2dd4bf; }
          .nova-plus-topic-legend i.secure { background: #34d399; }
          .nova-plus-topic-legend i.developing { background: #facc15; }
          .nova-plus-topic-legend i.support { background: #f87171; }

          .nova-plus-skill-node-map {
            margin-top: 12px;
            padding: 16px;
            border-radius: 16px;
            background:
              radial-gradient(circle at 50% 40%, rgba(83,215,255,0.05), transparent 45%),
              rgba(0,0,0,0.12);
            display: grid;
            grid-template-columns: repeat(4, minmax(0,1fr));
            gap: 9px;
          }

          .nova-plus-skill-node {
            min-height: 82px;
            padding: 10px;
            border-radius: 15px;
            border: 1px solid rgba(255,255,255,0.055);
            background: rgba(4,12,28,0.74);
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }

          .nova-plus-skill-node > span {
            width: 11px;
            height: 11px;
            border-radius: 999px;
          }

          .nova-plus-skill-node strong {
            margin-top: 7px;
            font-size: 9px;
            line-height: 1.25;
          }

          .nova-plus-skill-node small {
            margin-top: 4px;
            color: rgba(235,247,255,0.32);
            font-size: 7.5px;
          }

          .nova-plus-recommend-hero {
            padding: 18px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 20px;
            background:
              linear-gradient(135deg, rgba(124,58,237,0.1), rgba(83,215,255,0.035));
          }

          .nova-plus-recommend-hero > div > p:last-child {
            max-width: 760px;
            margin: 8px 0 0;
            color: rgba(235,247,255,0.48);
            font-size: 11px;
            line-height: 1.55;
          }

          .nova-plus-recommend-hero > button,
          .nova-plus-recommend-card > button {
            min-height: 38px;
            padding: 0 13px;
            border-radius: 999px;
            border: 1px solid rgba(196,181,253,0.24);
            background: rgba(124,58,237,0.1);
            color: #ede9fe;
            font-size: 9px;
            font-weight: 850;
            cursor: pointer;
          }

          .nova-plus-recommend-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0,1fr));
            gap: 10px;
          }

          .nova-plus-recommend-card {
            min-height: 290px;
            padding: 16px;
            display: flex;
            flex-direction: column;
          }

          .nova-plus-recommend-card.focus { border-color: rgba(248,113,113,0.17); }
          .nova-plus-recommend-card.revisit { border-color: rgba(167,139,250,0.17); }
          .nova-plus-recommend-card.stretch { border-color: rgba(52,211,153,0.17); }
          .nova-plus-recommend-card.reassess { border-color: rgba(83,215,255,0.17); }

          .nova-plus-recommend-visual {
            position: relative;
            width: 78px;
            height: 78px;
            margin-bottom: 16px;
            display: grid;
            place-items: center;
          }

          .nova-plus-recommend-visual > span {
            position: relative;
            z-index: 2;
            width: 54px;
            height: 54px;
            border-radius: 18px;
            display: grid;
            place-items: center;
            border: 1px solid rgba(196,181,253,0.2);
            background: rgba(124,58,237,0.08);
            color: #ddd6fe;
            font-size: 21px;
          }

          .nova-plus-recommend-pulse {
            position: absolute;
            inset: 0;
            border-radius: 999px;
            border: 1px solid rgba(196,181,253,0.13);
            animation: nova-plus-pulse 2.8s ease-out infinite;
          }

          @keyframes nova-plus-pulse {
            0% { transform: scale(0.65); opacity: 0.7; }
            80%,100% { transform: scale(1.15); opacity: 0; }
          }

          .nova-plus-recommend-copy small {
            color: #c4b5fd;
            font-size: 8px;
            font-weight: 900;
            letter-spacing: 0.11em;
            text-transform: uppercase;
          }

          .nova-plus-recommend-copy h5 {
            min-height: 42px;
            margin: 6px 0 0;
            font-size: 14px;
            line-height: 1.25;
          }

          .nova-plus-recommend-copy p {
            margin: 8px 0 0;
            color: rgba(235,247,255,0.46);
            font-size: 9.5px;
            line-height: 1.55;
          }

          .nova-plus-recommend-card > button {
            margin-top: auto;
            align-self: flex-start;
          }

          .nova-plus-reassess-flow {
            min-height: 100px;
            padding: 15px;
            display: grid;
            grid-template-columns: auto minmax(20px,1fr) auto minmax(20px,1fr) auto minmax(20px,1fr) auto;
            align-items: center;
            gap: 8px;
          }

          .nova-plus-flow-step {
            min-width: 105px;
            display: grid;
            grid-template-columns: 32px minmax(0,1fr);
            align-items: center;
            gap: 7px;
          }

          .nova-plus-flow-step > span {
            width: 32px;
            height: 32px;
            border-radius: 999px;
            display: grid;
            place-items: center;
            border: 1px solid rgba(196,181,253,0.16);
            color: rgba(235,247,255,0.52);
            font-size: 9px;
          }

          .nova-plus-flow-step strong {
            font-size: 9px;
          }

          .nova-plus-flow-step.done > span {
            color: #a7f3d0;
            border-color: rgba(52,211,153,0.26);
            background: rgba(52,211,153,0.07);
          }

          .nova-plus-flow-step.active > span {
            color: #fecaca;
            border-color: rgba(248,113,113,0.28);
            background: rgba(248,113,113,0.07);
            box-shadow: 0 0 18px rgba(248,113,113,0.14);
          }

          .nova-plus-reassess-flow > i {
            height: 1px;
            background: linear-gradient(90deg, rgba(196,181,253,0.14), rgba(83,215,255,0.18));
          }

          .nova-plus-progress-chart-card {
            padding: 18px;
          }

          .nova-plus-progress-arrow {
            width: 42px;
            height: 42px;
            border-radius: 14px;
            display: grid;
            place-items: center;
            border: 1px solid rgba(52,211,153,0.18);
            background: rgba(52,211,153,0.05);
            color: #a7f3d0;
            font-size: 18px;
          }

          .nova-plus-chart-wrap {
            margin-top: 14px;
            padding: 12px 12px 8px;
            border-radius: 17px;
            background:
              linear-gradient(180deg, rgba(83,215,255,0.035), rgba(0,0,0,0.08));
          }

          .nova-plus-chart-wrap svg {
            width: 100%;
            height: 245px;
            overflow: visible;
          }

          .nova-plus-chart-axis {
            stroke: rgba(235,247,255,0.11);
            stroke-width: 1;
          }

          .nova-plus-chart-grid {
            stroke: rgba(235,247,255,0.045);
            stroke-width: 1;
            stroke-dasharray: 6 9;
          }

          .nova-plus-chart-line {
            fill: none;
            stroke: #8dfcff;
            stroke-width: 4;
            stroke-linecap: round;
            stroke-linejoin: round;
            filter: drop-shadow(0 0 8px rgba(83,215,255,0.35));
          }

          .nova-plus-chart-dot {
            fill: #071326;
            stroke: #8dfcff;
            stroke-width: 3;
          }

          .nova-plus-chart-labels {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            color: rgba(235,247,255,0.32);
            font-size: 8px;
          }

          .nova-plus-progress-subjects {
            padding: 12px;
            display: grid;
            grid-template-columns: repeat(4, minmax(0,1fr));
            gap: 9px;
          }

          .nova-plus-progress-subjects > article {
            min-height: 105px;
            padding: 12px;
            border-radius: 15px;
            background: rgba(255,255,255,0.02);
            border: 1px solid rgba(255,255,255,0.05);
          }

          .nova-plus-progress-subject-head {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .nova-plus-progress-subject-head > span {
            font-size: 18px;
          }

          .nova-plus-progress-subject-head strong {
            font-size: 10px;
          }

          .nova-plus-progress-track {
            height: 8px;
            margin-top: 14px;
            overflow: hidden;
            border-radius: 999px;
            background: rgba(255,255,255,0.06);
          }

          .nova-plus-progress-track span {
            display: block;
            height: 100%;
            border-radius: inherit;
            box-shadow: 0 0 14px rgba(83,215,255,0.15);
          }

          .nova-plus-progress-subjects small {
            display: block;
            margin-top: 9px;
            color: rgba(235,247,255,0.35);
            font-size: 8px;
          }

          .nova-plus-milestones {
            padding: 12px;
            display: grid;
            grid-template-columns: repeat(3, minmax(0,1fr));
            gap: 9px;
          }

          .nova-plus-milestones > article {
            min-height: 84px;
            padding: 12px;
            border-radius: 15px;
            display: grid;
            grid-template-columns: 38px minmax(0,1fr);
            align-items: center;
            gap: 10px;
            background: rgba(255,255,255,0.02);
            border: 1px solid rgba(255,255,255,0.05);
          }

          .nova-plus-milestones > article > span {
            width: 38px;
            height: 38px;
            border-radius: 13px;
            display: grid;
            place-items: center;
          }

          .nova-plus-milestones .celebrate > span {
            background: rgba(52,211,153,0.07);
            border: 1px solid rgba(52,211,153,0.18);
            color: #a7f3d0;
          }

          .nova-plus-milestones .watch > span {
            background: rgba(248,113,113,0.06);
            border: 1px solid rgba(248,113,113,0.16);
            color: #fecaca;
          }

          .nova-plus-milestones .history > span {
            background: rgba(167,139,250,0.07);
            border: 1px solid rgba(167,139,250,0.18);
            color: #ddd6fe;
          }

          .nova-plus-milestones strong {
            display: block;
            margin-top: 4px;
            font-size: 10px;
            line-height: 1.35;
          }

          .nova-plus-parent-cover {
            min-height: 150px;
            padding: 16px 18px;
            display: grid;
            grid-template-columns: 88px minmax(0,1fr) auto;
            align-items: center;
            gap: 16px;
            background:
              radial-gradient(circle at 10% 50%, rgba(83,215,255,0.08), transparent 26%),
              linear-gradient(135deg, rgba(124,58,237,0.08), rgba(255,255,255,0.018));
          }

          .nova-plus-parent-nova {
            width: 80px;
            height: 100px;
            overflow: hidden;
            display: flex;
            align-items: flex-end;
            justify-content: center;
          }

          .nova-plus-parent-nova img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            object-position: center bottom;
          }

          .nova-plus-parent-cover > div:nth-child(2) > p:last-child {
            max-width: 710px;
            margin: 8px 0 0;
            color: rgba(235,247,255,0.5);
            font-size: 10.5px;
            line-height: 1.55;
          }

          .nova-plus-parent-status {
            min-width: 150px;
            padding: 13px;
            border-radius: 16px;
            border: 1px solid rgba(196,181,253,0.13);
            background: rgba(196,181,253,0.05);
          }

          .nova-plus-parent-status strong {
            display: block;
            margin-top: 6px;
            color: #ede9fe;
            font-size: 12px;
          }

          .nova-plus-parent-triptych {
            display: grid;
            grid-template-columns: repeat(3, minmax(0,1fr));
            gap: 10px;
          }

          .nova-plus-parent-triptych > article {
            min-height: 210px;
            padding: 16px;
          }

          .nova-plus-parent-triptych > article.celebrate {
            border-color: rgba(52,211,153,0.14);
          }

          .nova-plus-parent-triptych > article.focus {
            border-color: rgba(248,113,113,0.14);
          }

          .nova-plus-parent-triptych > article.next {
            border-color: rgba(83,215,255,0.14);
          }

          .nova-plus-report-icon {
            width: 50px;
            height: 50px;
            margin-bottom: 14px;
            border-radius: 17px;
            display: grid;
            place-items: center;
            border: 1px solid rgba(196,181,253,0.16);
            background: rgba(196,181,253,0.055);
            color: #ddd6fe;
            font-size: 18px;
          }

          .nova-plus-parent-triptych strong {
            display: block;
            min-height: 38px;
            margin-top: 7px;
            font-size: 13px;
            line-height: 1.3;
          }

          .nova-plus-parent-triptych p {
            margin: 9px 0 0;
            color: rgba(235,247,255,0.45);
            font-size: 9.5px;
            line-height: 1.55;
          }

          .nova-plus-parent-visual-summary {
            padding: 15px;
            display: grid;
            grid-template-columns: minmax(300px,0.75fr) minmax(0,1.25fr);
            gap: 18px;
          }

          .nova-plus-parent-rings {
            display: grid;
            grid-template-columns: repeat(3, minmax(0,1fr));
            gap: 10px;
            align-items: center;
          }

          .nova-plus-parent-rings > article {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .nova-plus-parent-ring {
            width: 78px;
            height: 78px;
            padding: 7px;
            border-radius: 999px;
          }

          .nova-plus-parent-ring > span {
            width: 100%;
            height: 100%;
            border-radius: inherit;
            display: grid;
            place-items: center;
            background: #071326;
            font-size: 19px;
            font-weight: 900;
          }

          .nova-plus-parent-rings strong {
            margin-top: 8px;
            font-size: 9px;
          }

          .nova-plus-parent-actions {
            padding-left: 18px;
            border-left: 1px solid rgba(196,181,253,0.08);
          }

          .nova-plus-parent-actions ol {
            margin: 12px 0 0;
            padding: 0;
            display: grid;
            gap: 8px;
            list-style: none;
          }

          .nova-plus-parent-actions li {
            min-height: 50px;
            padding: 8px;
            border-radius: 13px;
            background: rgba(255,255,255,0.02);
            display: grid;
            grid-template-columns: 28px minmax(0,1fr);
            align-items: center;
            gap: 8px;
          }

          .nova-plus-parent-actions li > span {
            width: 28px;
            height: 28px;
            border-radius: 999px;
            display: grid;
            place-items: center;
            border: 1px solid rgba(83,215,255,0.16);
            background: rgba(83,215,255,0.05);
            color: #8dfcff;
            font-size: 8px;
            font-weight: 900;
          }

          .nova-plus-parent-actions li p {
            margin: 0;
            color: rgba(235,247,255,0.53);
            font-size: 9.5px;
            line-height: 1.45;
          }

          .nova-plus-parent-footer {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 0 4px;
            color: rgba(235,247,255,0.3);
            font-size: 8px;
          }

          @media (max-width: 1180px) {
            .nova-plus-nav {
              grid-template-columns: repeat(3, minmax(0,1fr));
            }

            .nova-plus-strengths-view {
              grid-template-columns: 1fr;
            }

            .nova-plus-gap-radar {
              grid-template-columns: 190px minmax(0,1fr);
            }

            .nova-plus-radar-disc {
              width: 180px;
              height: 180px;
            }

            .nova-plus-skill-node-map {
              grid-template-columns: repeat(3, minmax(0,1fr));
            }

            .nova-plus-recommend-grid {
              grid-template-columns: repeat(2, minmax(0,1fr));
            }

            .nova-plus-progress-subjects {
              grid-template-columns: repeat(2, minmax(0,1fr));
            }
          }

          @media (max-width: 900px) {
            .nova-plus-hero {
              padding: 20px 180px 58px 18px;
            }

            .nova-plus-hero-visual {
              right: 16px;
              width: 145px;
              height: 145px;
            }

            .nova-plus-orbit.orbit-one { width: 142px; height: 142px; }
            .nova-plus-orbit.orbit-two { width: 108px; height: 108px; }
            .nova-plus-core { width: 86px; height: 86px; }

            .nova-plus-learning-main {
              grid-template-columns: 1fr;
            }

            .nova-plus-learner-card {
              min-height: auto;
            }

            .nova-plus-curriculum-grid {
              grid-template-columns: repeat(3, minmax(0,1fr));
            }

            .nova-plus-learning-actions {
              grid-template-columns: 1fr 1fr;
            }

            .nova-plus-next-mission {
              grid-column: 1 / -1;
            }

            .nova-plus-learning-orbit {
              grid-template-columns: 1fr;
            }

            .nova-plus-learning-path {
              grid-template-columns: 1fr;
              gap: 7px;
            }

            .nova-plus-path-line {
              width: 1px;
              height: 18px;
              margin-left: 30px;
            }

            .nova-plus-pattern-strip {
              grid-template-columns: repeat(2, minmax(0,1fr));
            }

            .nova-plus-age-ribbon {
              grid-template-columns: 38px minmax(0,1fr) auto;
            }

            .nova-plus-age-ribbon > p {
              grid-column: 2 / -1;
            }

            .nova-plus-map-grid {
              grid-template-columns: 1fr;
            }

            .nova-plus-topic-world.expanded {
              grid-column: auto;
            }

            .nova-plus-skill-node-map {
              grid-template-columns: repeat(2, minmax(0,1fr));
            }

            .nova-plus-reassess-flow {
              grid-template-columns: 1fr;
              gap: 7px;
            }

            .nova-plus-reassess-flow > i {
              width: 1px;
              height: 14px;
              margin-left: 15px;
            }

            .nova-plus-parent-cover {
              grid-template-columns: 72px minmax(0,1fr);
            }

            .nova-plus-parent-status {
              grid-column: 1 / -1;
            }

            .nova-plus-parent-triptych {
              grid-template-columns: 1fr;
            }

            .nova-plus-parent-visual-summary {
              grid-template-columns: 1fr;
            }

            .nova-plus-parent-actions {
              padding-left: 0;
              padding-top: 14px;
              border-left: 0;
              border-top: 1px solid rgba(196,181,253,0.08);
            }
          }

          @media (max-width: 640px) {
            .nova-plus-hero {
              padding: 18px 16px 64px;
              min-height: 280px;
            }

            .nova-plus-hero-copy {
              padding-right: 0;
            }

            .nova-plus-hero-visual {
              right: 16px;
              bottom: 10px;
              top: auto;
              width: 118px;
              height: 118px;
              transform: none;
              opacity: 0.86;
            }

            .nova-plus-orbit.orbit-one { width: 116px; height: 116px; }
            .nova-plus-orbit.orbit-two { width: 88px; height: 88px; }
            .nova-plus-core { width: 70px; height: 70px; }

            .nova-plus-nav {
              grid-template-columns: repeat(2, minmax(0,1fr));
            }

            .nova-plus-nav button {
              min-height: 52px;
            }

            .nova-plus-learning-heading {
              align-items: flex-start;
              flex-direction: column;
            }

            .nova-plus-status-legend {
              justify-content: flex-start;
            }

            .nova-plus-curriculum-grid {
              grid-template-columns: 1fr;
            }

            .nova-plus-subject-zone {
              min-height: 132px;
              display: grid;
              grid-template-columns: 54px minmax(0,1fr);
              align-items: center;
              gap: 12px;
            }

            .nova-plus-subject-state-light {
              top: 14px;
              right: 14px;
            }

            .nova-plus-knowledge-zone {
              grid-column: auto;
            }

            .nova-plus-learning-actions {
              grid-template-columns: 1fr;
            }

            .nova-plus-next-mission {
              grid-column: auto;
            }

            .nova-plus-avatar-options {
              grid-template-columns: repeat(2, minmax(0,1fr));
            }

            .nova-plus-avatar-upload-row {
              align-items: flex-start;
              flex-direction: column;
            }

            .nova-plus-subject-planets,
            .nova-plus-pattern-strip,
            .nova-plus-recommend-grid,
            .nova-plus-progress-subjects,
            .nova-plus-milestones {
              grid-template-columns: 1fr;
            }

            .nova-plus-master-ring {
              width: 154px;
              height: 154px;
            }

            .nova-plus-gap-radar {
              grid-template-columns: 1fr;
            }

            .nova-plus-gap-list > article {
              grid-template-columns: 9px minmax(0,1fr);
            }

            .nova-plus-gap-meter {
              grid-column: 2;
            }

            .nova-plus-constellation {
              min-height: auto;
              padding: 10px;
              display: grid;
              grid-template-columns: repeat(2, minmax(0,1fr));
              gap: 8px;
            }

            .nova-plus-skill-star {
              position: static;
              width: auto;
              min-height: 90px;
              transform: none !important;
            }

            .nova-plus-map-toolbar,
            .nova-plus-recommend-hero {
              align-items: flex-start;
              flex-direction: column;
            }

            .nova-plus-topic-world-head {
              grid-template-columns: 54px minmax(0,1fr) 30px;
            }

            .nova-plus-topic-ring {
              width: 50px;
              height: 50px;
            }

            .nova-plus-skill-node-map {
              grid-template-columns: 1fr;
            }

            .nova-plus-chart-wrap svg {
              height: 190px;
            }

            .nova-plus-parent-rings {
              grid-template-columns: repeat(3, minmax(0,1fr));
            }

            .nova-plus-parent-ring {
              width: 62px;
              height: 62px;
            }

            .nova-plus-parent-footer {
              flex-direction: column;
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
