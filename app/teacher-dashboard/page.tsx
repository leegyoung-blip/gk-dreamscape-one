"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AttemptSource = "core" | "english" | "math" | "think" | "knowledge" | "science";
type SubjectKey = "english" | "math" | "thinking" | "knowledge" | "science";
type DateFilter = "this_week" | "last_week" | "this_month" | "all_time";
type AccuracyFilter = "all" | "with_mistakes" | "perfect";
type RosterFilter = "all" | "active" | "needs_attention";

type TeacherProfile = {
  email: string | null;
  username: string | null;
  role: string | null;
  tier: string | null;
  teacher_type: string | null;
  organization_name: string | null;
  teacher_license_status: string | null;
};

type TeacherRosterRow = {
  student_user_id: string;
  student_label: string;
  student_email: string | null;
  class_label: string | null;
  assigned_at: string;
};

type TeacherRosterRpcRow = {
  student_user_id: unknown;
  student_label: unknown;
  student_email: unknown;
  class_label: unknown;
  is_active?: unknown;
  assigned_at: unknown;
};

type CoreAttemptRow = {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number | null;
  correct_count: number | null;
  total_questions: number | null;
  tokens_earned: number | null;
  created_at: string | null;
};

type CoreV2AttemptRow = {
  id: string;
  user_id: string;
  quiz_id: string;
  attempt_number: number | null;
  status: string | null;
  score: number | null;
  percentage: number | null;
  correct_count: number | null;
  total_questions: number | null;
  tokens_earned: number | null;
  gems_earned: number | null;
  duration_seconds: number | null;
  submitted_at: string | null;
  created_at: string | null;
  quiz_title: string | null;
  quiz_code: string | null;
  quiz_type: string | null;
  subject: string | null;
  primary_level: number | null;
  topic_title: string | null;
};

type CoreV2AttemptAnswerRow = {
  id: string;
  question_id: string | null;
  question_order: number;
  question_text: string;
  question_image: string | null;
  student_answer_label: string | null;
  student_answer_text: string | null;
  correct_answer_label: string | null;
  correct_answer_text: string | null;
  explanation: string | null;
  is_correct: boolean | null;
  skill: string | null;
  subject: string | null;
};

type ThinkAttemptRow = CoreAttemptRow & {
  mode: string | null;
  time_taken_seconds: number | null;
};

type KnowledgeAttemptRow = {
  id: string;
  user_id: string;
  topic: string | null;
  mode: string | null;
  score: number | null;
  correct_count: number | null;
  total_questions: number | null;
  tokens_earned: number | null;
  created_at: string | null;
};

type ScienceAttemptRow = {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number | null;
  percentage: number | null;
  correct_count: number | null;
  total_questions: number | null;
  time_seconds: number | null;
  tokens_earned: number | null;
  gems_earned: number | null;
  first_completion: boolean | null;
  submitted_at: string | null;
  created_at: string | null;
};

type CoreQuizRow = {
  id: string;
  title: string | null;
  subject: string | null;
  level_label: string | null;
};

type ThinkQuizRow = {
  id: string;
  title: string | null;
  level_label: string | null;
};

type ScienceQuizRow = {
  id: string;
  title: string | null;
  topic_id: string;
  mission_type: string | null;
};

type ScienceTopicRow = {
  id: string;
  title: string | null;
  level_id: string;
};

type ScienceLevelRow = {
  id: string;
  display_name: string | null;
  school_level: string | null;
};

type DashboardAttempt = {
  id: string;
  source: AttemptSource;
  userId: string;
  quizId: string | null;
  title: string;
  subtitle: string;
  subject: SubjectKey;
  mode: string | null;
  score: number;
  correctCount: number;
  totalQuestions: number;
  tokensEarned: number;
  durationSeconds: number | null;
  createdAt: string;
};

type AttemptAnswerRow = {
  id: string;
  attempt_source: AttemptSource;
  attempt_id: string;
  question_id: string | null;
  question_order: number;
  question_text: string;
  question_image: string | null;
  student_answer_label: string | null;
  student_answer_text: string | null;
  correct_answer_label: string | null;
  correct_answer_text: string | null;
  explanation: string | null;
  is_correct: boolean;
  skill: string | null;
  subject: string | null;
};

type StudentSummary = {
  student: TeacherRosterRow;
  attempts: DashboardAttempt[];
  weeklyAttempts: DashboardAttempt[];
  weeklyQuestions: number;
  weeklyCorrect: number;
  weeklyWrong: number;
  weeklyAccuracy: number;
  lastActivity: string | null;
};

const SUBJECT_META: Record<
  SubjectKey,
  { label: string; shortLabel: string; icon: string; accent: string }
> = {
  english: {
    label: "English",
    shortLabel: "English",
    icon: "✎",
    accent: "#ff9df0",
  },
  math: {
    label: "Mathematics",
    shortLabel: "Math",
    icon: "∑",
    accent: "#53d7ff",
  },
  thinking: {
    label: "Thinking Skills",
    shortLabel: "Thinking",
    icon: "◇",
    accent: "#60f0d0",
  },
  knowledge: {
    label: "Knowledge Arena",
    shortLabel: "Knowledge",
    icon: "◎",
    accent: "#ffd76a",
  },
  science: {
    label: "Science",
    shortLabel: "Science",
    icon: "⚗",
    accent: "#a6ff7a",
  },
};

const KNOWLEDGE_TOPIC_LABELS: Record<string, string> = {
  world_explorer: "World Explorer",
  time_traveller: "Time Traveller",
  science_sparks: "Science Sparks",
  mystery_logic: "Mystery Logic",
};

const SCIENCE_MISSION_TYPE_LABELS: Record<string, string> = {
  learn: "Learn",
  practice: "Practice",
  investigate: "Investigate",
  mastery: "Mastery",
  assessment: "Assessment",
};

function normaliseRole(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

function safeNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function singaporeDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDaysToKey(key: string, amount: number) {
  const date = parseDateKey(key);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function mondayKeyFor(date: Date) {
  const key = singaporeDateKey(date);
  const calendarDate = parseDateKey(key);
  const day = calendarDate.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  return addDaysToKey(key, -daysFromMonday);
}

function getDateRange(filter: DateFilter) {
  const now = new Date();
  const todayKey = singaporeDateKey(now);
  const thisMonday = mondayKeyFor(now);

  if (filter === "this_week") {
    return { start: thisMonday, end: addDaysToKey(thisMonday, 6) };
  }

  if (filter === "last_week") {
    const start = addDaysToKey(thisMonday, -7);
    return { start, end: addDaysToKey(start, 6) };
  }

  if (filter === "this_month") {
    const [year, month] = todayKey.split("-");
    const first = `${year}-${month}-01`;
    const monthEnd = parseDateKey(first);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
    monthEnd.setUTCDate(0);
    return { start: first, end: monthEnd.toISOString().slice(0, 10) };
  }

  return { start: null, end: null };
}

function isDateInsideRange(
  value: string,
  range: { start: string | null; end: string | null },
) {
  if (!range.start || !range.end) return true;
  const key = singaporeDateKey(new Date(value));
  return key >= range.start && key <= range.end;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved attempt";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatRelativeActivity(value: string | null) {
  if (!value) return "No quiz activity yet";

  const milliseconds = Date.now() - new Date(value).getTime();
  const days = Math.floor(milliseconds / 86_400_000);

  if (days <= 0) return "Active today";
  if (days === 1) return "Active yesterday";
  if (days < 7) return `Active ${days} days ago`;
  return `Last active ${formatDateTime(value)}`;
}

function formatDuration(seconds: number | null) {
  if (seconds === null || seconds <= 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function accuracyOf(attempt: DashboardAttempt) {
  if (attempt.totalQuestions <= 0) return 0;
  return Math.round((attempt.correctCount / attempt.totalQuestions) * 100);
}

function answerDisplay(label: string | null, text: string | null) {
  if (label && text) return `${label}. ${text}`;
  return text || label || "No answer";
}

function TeacherDashboardLoadingFallback() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#020813",
        color: "white",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          borderRadius: "18px",
          border: "1px solid rgba(126,232,255,0.3)",
          background: "rgba(255,255,255,0.06)",
          padding: "24px",
          color: "rgba(255,255,255,0.78)",
        }}
      >
        Loading Teacher Dashboard...
      </div>
    </main>
  );
}

export default function TeacherDashboardPage() {
  return (
    <Suspense fallback={<TeacherDashboardLoadingFallback />}>
      <TeacherDashboardContent />
    </Suspense>
  );
}

function TeacherDashboardContent() {
  const searchParams = useSearchParams();
  const previewTeacherId = searchParams.get("teacherId");

  const [isAdminPreview, setIsAdminPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadMessage, setLoadMessage] = useState("");
  const [teacherEmail, setTeacherEmail] = useState<string | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [roster, setRoster] = useState<TeacherRosterRow[]>([]);
  const [allAttempts, setAllAttempts] = useState<DashboardAttempt[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterFilter, setRosterFilter] = useState<RosterFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("this_week");
  const [subjectFilter, setSubjectFilter] = useState<SubjectKey | "all">("all");
  const [accuracyFilter, setAccuracyFilter] = useState<AccuracyFilter>("all");

  const [selectedAttempt, setSelectedAttempt] = useState<DashboardAttempt | null>(null);
  const [detailAnswers, setDetailAnswers] = useState<AttemptAnswerRow[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailMessage, setDetailMessage] = useState("");
  const [wrongOnly, setWrongOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function initialise() {
      setIsLoading(true);
      setLoadMessage("");
      setIsAdminPreview(false);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        setTeacherEmail(null);
        setTeacherProfile(null);
        setRoster([]);
        setAllAttempts([]);
        setLoadMessage("Log in with an active teacher account to view this dashboard.");
        setIsLoading(false);
        return;
      }

      const { data: viewerProfileData, error: viewerProfileError } =
        await supabase
          .from("profiles")
          .select("role,tier")
          .eq("id", user.id)
          .maybeSingle();

      if (cancelled) return;

      if (viewerProfileError || !viewerProfileData) {
        setTeacherProfile(null);
        setRoster([]);
        setAllAttempts([]);
        setLoadMessage("Your account role could not be checked.");
        setIsLoading(false);
        return;
      }

      const viewerRole = normaliseRole(
        viewerProfileData.role || viewerProfileData.tier,
      );
      const adminPreview = viewerRole === "admin" && Boolean(previewTeacherId);
      const targetTeacherId = adminPreview ? previewTeacherId : user.id;

      if (!targetTeacherId) {
        setTeacherProfile(null);
        setRoster([]);
        setAllAttempts([]);
        setLoadMessage("No teacher account was selected.");
        setIsLoading(false);
        return;
      }

      setIsAdminPreview(adminPreview);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          "email,username,role,tier,teacher_type,organization_name,teacher_license_status",
        )
        .eq("id", targetTeacherId)
        .maybeSingle();

      if (cancelled) return;

      if (profileError || !profileData) {
        setTeacherProfile(null);
        setRoster([]);
        setAllAttempts([]);
        setLoadMessage("The teacher profile could not be loaded.");
        setIsLoading(false);
        return;
      }

      const profile = profileData as TeacherProfile;
      setTeacherProfile(profile);
      setTeacherEmail(profile.email || (!adminPreview ? user.email ?? null : null));

      const role = normaliseRole(profile.role || profile.tier);
      const canUseTeacherDashboard =
        role === "teacher" || role === "curriculum-lead";
      const activeLicence =
        profile.teacher_license_status === "active" ||
        role === "curriculum-lead";

      if (!canUseTeacherDashboard) {
        setRoster([]);
        setAllAttempts([]);
        setLoadMessage(
          "The selected account does not have the Teacher or Curriculum Lead role.",
        );
        setIsLoading(false);
        return;
      }

      if (!adminPreview && !activeLicence) {
        setRoster([]);
        setAllAttempts([]);
        setLoadMessage("This teacher licence is not active.");
        setIsLoading(false);
        return;
      }

      const rosterRequest = adminPreview
        ? supabase.rpc("admin_get_teacher_assignments", {
            p_teacher_user_id: targetTeacherId,
          })
        : supabase.rpc("get_my_teacher_roster");

      const { data: rosterData, error: rosterError } = await rosterRequest;

      if (cancelled) return;

      if (rosterError) {
        setRoster([]);
        setAllAttempts([]);
        setLoadMessage(
          rosterError.message || "The assigned student list could not be loaded.",
        );
        setIsLoading(false);
        return;
      }

      const rosterRows = (rosterData ?? []) as TeacherRosterRpcRow[];
      const activeRosterRows = adminPreview
        ? rosterRows.filter((row) => Boolean(row.is_active))
        : rosterRows;

      const nextRoster: TeacherRosterRow[] = activeRosterRows.map(
        (row): TeacherRosterRow => ({
          student_user_id: String(row.student_user_id),
          student_label: String(row.student_label || "Student"),
          student_email: row.student_email ? String(row.student_email) : null,
          class_label: row.class_label ? String(row.class_label) : null,
          assigned_at: String(row.assigned_at || new Date().toISOString()),
        }),
      );

      setRoster(nextRoster);
      setSelectedStudentId((current) => {
        if (
          current &&
          nextRoster.some((student) => student.student_user_id === current)
        ) {
          return current;
        }
        return nextRoster[0]?.student_user_id ?? null;
      });

      if (adminPreview && !activeLicence) {
        setLoadMessage(
          `Admin preview: this teacher licence is ${
            profile.teacher_license_status || "inactive"
          }.`,
        );
      }

      if (nextRoster.length === 0) {
        setAllAttempts([]);
        setLoadMessage(
          adminPreview
            ? "This teacher currently has no active student assignments."
            : "No students have been assigned yet. An administrator must add students to this teacher roster.",
        );
        setIsLoading(false);
        return;
      }

      const attempts = await loadRosterAttempts(
        nextRoster.map((student) => student.student_user_id),
        adminPreview ? targetTeacherId : null,
      );

      if (cancelled) return;
      setAllAttempts(attempts);
      setIsLoading(false);
    }

    void initialise();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void initialise();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [previewTeacherId]);

  async function loadRosterAttempts(
    studentIds: string[],
    previewTeacherUserId: string | null,
  ) {
    if (studentIds.length === 0) return [];

    const [
      englishResult,
      mathResult,
      coreResult,
      thinkResult,
      knowledgeResult,
      scienceResult,
    ] = await Promise.all([
      supabase.rpc("teacher_get_english_quiz_attempts", {
        p_student_user_ids: studentIds,
        p_teacher_user_id: previewTeacherUserId,
      }),
      supabase.rpc("teacher_get_math_quiz_attempts", {
        p_student_user_ids: studentIds,
        p_teacher_user_id: previewTeacherUserId,
      }),
      // Legacy Core records are retained so older completed work remains visible.
      supabase
        .from("core_mission_attempts")
        .select(
          "id,user_id,quiz_id,score,correct_count,total_questions,tokens_earned,created_at",
        )
        .in("user_id", studentIds)
        .order("created_at", { ascending: false })
        .limit(3000),
      supabase
        .from("think_mission_attempts")
        .select(
          "id,user_id,quiz_id,mode,score,correct_count,total_questions,time_taken_seconds,tokens_earned,created_at",
        )
        .in("user_id", studentIds)
        .order("created_at", { ascending: false })
        .limit(3000),
      supabase
        .from("knowledge_arena_attempts")
        .select(
          "id,user_id,topic,mode,score,correct_count,total_questions,tokens_earned,created_at",
        )
        .in("user_id", studentIds)
        .order("created_at", { ascending: false })
        .limit(3000),
      supabase
        .from("science_quiz_attempts")
        .select(
          "id,user_id,quiz_id,score,percentage,correct_count,total_questions,time_seconds,tokens_earned,gems_earned,first_completion,submitted_at,created_at",
        )
        .in("user_id", studentIds)
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false, nullsFirst: false })
        .limit(3000),
    ]);

    const errors = [
      englishResult.error,
      mathResult.error,
      coreResult.error,
      thinkResult.error,
      knowledgeResult.error,
      scienceResult.error,
    ].filter(Boolean);

    if (errors.length === 6) {
      setLoadMessage("The teacher dashboard could not load the quiz-attempt tables.");
      return [];
    }

    if (errors.length > 0) {
      setLoadMessage(
        "Some mission records could not be loaded. Check the browser console for the table or RPC error.",
      );
      errors.forEach((error) => console.warn("Teacher dashboard load error:", error));
    }

    const englishRows = (englishResult.data ?? []) as CoreV2AttemptRow[];
    const mathRows = (mathResult.data ?? []) as CoreV2AttemptRow[];
    const coreRows = (coreResult.data ?? []) as CoreAttemptRow[];
    const thinkRows = (thinkResult.data ?? []) as ThinkAttemptRow[];
    const knowledgeRows = (knowledgeResult.data ?? []) as KnowledgeAttemptRow[];
    const scienceRows = (scienceResult.data ?? []) as ScienceAttemptRow[];

    const coreQuizIds = [...new Set(coreRows.map((row) => row.quiz_id).filter(Boolean))];
    const thinkQuizIds = [...new Set(thinkRows.map((row) => row.quiz_id).filter(Boolean))];
    const scienceQuizIds = [
      ...new Set(scienceRows.map((row) => row.quiz_id).filter(Boolean)),
    ];

    const [coreQuizResult, thinkQuizResult, scienceQuizResult] = await Promise.all([
      coreQuizIds.length
        ? supabase
            .from("core_mission_quizzes")
            .select("id,title,subject,level_label")
            .in("id", coreQuizIds)
        : Promise.resolve({ data: [], error: null }),
      thinkQuizIds.length
        ? supabase
            .from("think_mission_quizzes")
            .select("id,title,level_label")
            .in("id", thinkQuizIds)
        : Promise.resolve({ data: [], error: null }),
      scienceQuizIds.length
        ? supabase
            .from("science_quizzes")
            .select("id,title,topic_id,mission_type")
            .in("id", scienceQuizIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const catalogueErrors = [
      coreQuizResult.error,
      thinkQuizResult.error,
      scienceQuizResult.error,
    ].filter(Boolean);

    if (catalogueErrors.length > 0) {
      setLoadMessage(
        "Some quiz titles could not be loaded. Attempt records are still shown where available.",
      );
      catalogueErrors.forEach((error) =>
        console.warn("Teacher dashboard catalogue error:", error),
      );
    }

    const scienceQuizRows = (scienceQuizResult.data ?? []) as ScienceQuizRow[];
    const scienceTopicIds = [
      ...new Set(scienceQuizRows.map((quiz) => quiz.topic_id).filter(Boolean)),
    ];

    const scienceTopicResult = scienceTopicIds.length
      ? await supabase
          .from("science_topics")
          .select("id,title,level_id")
          .in("id", scienceTopicIds)
      : { data: [], error: null };

    if (scienceTopicResult.error) {
      console.warn(
        "Teacher dashboard Science-topic error:",
        scienceTopicResult.error,
      );
    }

    const scienceTopicRows = (scienceTopicResult.data ?? []) as ScienceTopicRow[];
    const scienceLevelIds = [
      ...new Set(scienceTopicRows.map((topic) => topic.level_id).filter(Boolean)),
    ];

    const scienceLevelResult = scienceLevelIds.length
      ? await supabase
          .from("science_levels")
          .select("id,display_name,school_level")
          .in("id", scienceLevelIds)
      : { data: [], error: null };

    if (scienceLevelResult.error) {
      console.warn(
        "Teacher dashboard Science-level error:",
        scienceLevelResult.error,
      );
    }

    const coreQuizMap = new Map(
      ((coreQuizResult.data ?? []) as CoreQuizRow[]).map((quiz) => [quiz.id, quiz]),
    );
    const thinkQuizMap = new Map(
      ((thinkQuizResult.data ?? []) as ThinkQuizRow[]).map((quiz) => [quiz.id, quiz]),
    );
    const scienceQuizMap = new Map(
      scienceQuizRows.map((quiz) => [quiz.id, quiz]),
    );
    const scienceTopicMap = new Map(
      scienceTopicRows.map((topic) => [topic.id, topic]),
    );
    const scienceLevelMap = new Map(
      ((scienceLevelResult.data ?? []) as ScienceLevelRow[]).map((level) => [
        level.id,
        level,
      ]),
    );

    const attempts: DashboardAttempt[] = [];

    for (const [subject, rows] of [
      ["english", englishRows],
      ["math", mathRows],
    ] as const) {
      for (const row of rows) {
        const primaryLevel = safeNumber(row.primary_level);
        const quizType = String(row.quiz_type || "")
          .replaceAll("_", " ")
          .trim();

        attempts.push({
          id: String(row.id),
          source: subject,
          userId: String(row.user_id),
          quizId: row.quiz_id,
          title:
            row.quiz_title ||
            `${SUBJECT_META[subject].label} Mission Quiz`,
          subtitle: [
            SUBJECT_META[subject].label,
            primaryLevel > 0 ? `Primary ${primaryLevel}` : null,
            row.topic_title,
            quizType || null,
            safeNumber(row.attempt_number) > 0
              ? `Attempt ${safeNumber(row.attempt_number)}`
              : null,
          ]
            .filter(Boolean)
            .join(" · "),
          subject,
          mode: row.quiz_type,
          score: safeNumber(row.score),
          correctCount: safeNumber(row.correct_count),
          totalQuestions: safeNumber(row.total_questions),
          tokensEarned: safeNumber(row.tokens_earned),
          durationSeconds:
            row.duration_seconds === null
              ? null
              : safeNumber(row.duration_seconds),
          createdAt:
            row.submitted_at ||
            row.created_at ||
            new Date(0).toISOString(),
        });
      }
    }

    for (const row of coreRows) {
      const quiz = coreQuizMap.get(row.quiz_id);
      const subject: SubjectKey = quiz?.subject === "math" ? "math" : "english";

      attempts.push({
        id: String(row.id),
        source: "core",
        userId: String(row.user_id),
        quizId: row.quiz_id,
        title: quiz?.title || "Core Mission Quiz",
        subtitle: [SUBJECT_META[subject].label, quiz?.level_label]
          .filter(Boolean)
          .join(" · "),
        subject,
        mode: null,
        score: safeNumber(row.score),
        correctCount: safeNumber(row.correct_count),
        totalQuestions: safeNumber(row.total_questions),
        tokensEarned: safeNumber(row.tokens_earned),
        durationSeconds: null,
        createdAt: row.created_at || new Date(0).toISOString(),
      });
    }

    for (const row of thinkRows) {
      const quiz = thinkQuizMap.get(row.quiz_id);

      attempts.push({
        id: String(row.id),
        source: "think",
        userId: String(row.user_id),
        quizId: row.quiz_id,
        title: quiz?.title || "Think Mission Quiz",
        subtitle: ["Thinking Skills", quiz?.level_label, row.mode]
          .filter(Boolean)
          .join(" · "),
        subject: "thinking",
        mode: row.mode,
        score: safeNumber(row.score),
        correctCount: safeNumber(row.correct_count),
        totalQuestions: safeNumber(row.total_questions),
        tokensEarned: safeNumber(row.tokens_earned),
        durationSeconds:
          row.time_taken_seconds === null ? null : safeNumber(row.time_taken_seconds),
        createdAt: row.created_at || new Date(0).toISOString(),
      });
    }

    for (const row of knowledgeRows) {
      const topic = String(row.topic || "knowledge");

      attempts.push({
        id: String(row.id),
        source: "knowledge",
        userId: String(row.user_id),
        quizId: null,
        title: KNOWLEDGE_TOPIC_LABELS[topic] || "Knowledge Arena",
        subtitle: ["Knowledge Arena", row.mode].filter(Boolean).join(" · "),
        subject: "knowledge",
        mode: row.mode,
        score: safeNumber(row.score),
        correctCount: safeNumber(row.correct_count),
        totalQuestions: safeNumber(row.total_questions),
        tokensEarned: safeNumber(row.tokens_earned),
        durationSeconds: null,
        createdAt: row.created_at || new Date(0).toISOString(),
      });
    }

    for (const row of scienceRows) {
      const quiz = scienceQuizMap.get(row.quiz_id);
      const topic = quiz ? scienceTopicMap.get(quiz.topic_id) : undefined;
      const level = topic ? scienceLevelMap.get(topic.level_id) : undefined;
      const missionType = quiz?.mission_type
        ? SCIENCE_MISSION_TYPE_LABELS[quiz.mission_type] || quiz.mission_type
        : null;

      attempts.push({
        id: String(row.id),
        source: "science",
        userId: String(row.user_id),
        quizId: row.quiz_id,
        title: quiz?.title || "Science Mission Quiz",
        subtitle: [
          "Science",
          level?.display_name || level?.school_level,
          topic?.title,
          missionType,
        ]
          .filter(Boolean)
          .join(" · "),
        subject: "science",
        mode: quiz?.mission_type || null,
        score: safeNumber(row.score),
        correctCount: safeNumber(row.correct_count),
        totalQuestions: safeNumber(row.total_questions),
        tokensEarned: safeNumber(row.tokens_earned),
        durationSeconds:
          row.time_seconds === null ? null : safeNumber(row.time_seconds),
        createdAt:
          row.submitted_at || row.created_at || new Date(0).toISOString(),
      });
    }

    return attempts.sort(
      (first, second) =>
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
    );
  }

  async function openAttempt(attempt: DashboardAttempt) {
    setSelectedAttempt(attempt);
    setWrongOnly(false);
    setDetailAnswers([]);
    setDetailMessage("");
    setDetailsLoading(true);

    if (attempt.source === "english" || attempt.source === "math") {
      const answerRpc =
        attempt.source === "english"
          ? "teacher_get_english_quiz_attempt_answers"
          : "teacher_get_math_quiz_attempt_answers";

      const { data, error } = await supabase.rpc(answerRpc, {
        p_attempt_id: attempt.id,
        p_student_user_id: attempt.userId,
        p_teacher_user_id:
          isAdminPreview && previewTeacherId
            ? previewTeacherId
            : null,
      });

      if (error) {
        setDetailMessage(
          error.message ||
            `The ${SUBJECT_META[attempt.subject].label} answer record could not be loaded.`,
        );
        setDetailsLoading(false);
        return;
      }

      const rows = ((data ?? []) as CoreV2AttemptAnswerRow[]).map(
        (row): AttemptAnswerRow => ({
          id: String(row.id),
          attempt_source: attempt.source,
          attempt_id: attempt.id,
          question_id: row.question_id,
          question_order: safeNumber(row.question_order),
          question_text:
            row.question_text ||
            `${SUBJECT_META[attempt.subject].label} question`,
          question_image: row.question_image,
          student_answer_label: row.student_answer_label,
          student_answer_text: row.student_answer_text,
          correct_answer_label: row.correct_answer_label,
          correct_answer_text: row.correct_answer_text,
          explanation: row.explanation,
          is_correct: row.is_correct === true,
          skill: row.skill,
          subject: row.subject || attempt.source,
        }),
      );

      setDetailAnswers(rows);

      if (rows.length === 0) {
        setDetailMessage(
          `This ${SUBJECT_META[attempt.subject].label} attempt has a score summary but no saved answer rows.`,
        );
      }

      setDetailsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("learning_mission_attempt_answers")
      .select(
        "id,attempt_source,attempt_id,question_id,question_order,question_text,question_image,student_answer_label,student_answer_text,correct_answer_label,correct_answer_text,explanation,is_correct,skill,subject",
      )
      .eq("attempt_source", attempt.source)
      .eq("attempt_id", attempt.id)
      .eq("user_id", attempt.userId)
      .order("question_order", { ascending: true });

    if (error) {
      setDetailMessage(
        "The individual answers could not be loaded. Check that the answer-tracking SQL and quiz-page updates have been installed.",
      );
      setDetailsLoading(false);
      return;
    }

    const rows = (data ?? []) as AttemptAnswerRow[];
    setDetailAnswers(rows);

    if (rows.length === 0) {
      setDetailMessage(
        "This attempt has a score summary but no individual answer records. Older attempts cannot be reconstructed.",
      );
    }

    setDetailsLoading(false);
  }

  const thisWeekRange = useMemo(() => getDateRange("this_week"), []);
  const lastWeekRange = useMemo(() => getDateRange("last_week"), []);

  const studentSummaries = useMemo<StudentSummary[]>(() => {
    return roster.map((student) => {
      const attempts = allAttempts.filter(
        (attempt) => attempt.userId === student.student_user_id,
      );
      const weeklyAttempts = attempts.filter((attempt) =>
        isDateInsideRange(attempt.createdAt, thisWeekRange),
      );
      const weeklyQuestions = weeklyAttempts.reduce(
        (sum, attempt) => sum + attempt.totalQuestions,
        0,
      );
      const weeklyCorrect = weeklyAttempts.reduce(
        (sum, attempt) => sum + attempt.correctCount,
        0,
      );
      const weeklyWrong = Math.max(0, weeklyQuestions - weeklyCorrect);
      const weeklyAccuracy =
        weeklyQuestions > 0 ? Math.round((weeklyCorrect / weeklyQuestions) * 100) : 0;

      return {
        student,
        attempts,
        weeklyAttempts,
        weeklyQuestions,
        weeklyCorrect,
        weeklyWrong,
        weeklyAccuracy,
        lastActivity: attempts[0]?.createdAt ?? null,
      };
    });
  }, [roster, allAttempts, thisWeekRange]);

  const selectedSummary = studentSummaries.find(
    (summary) => summary.student.student_user_id === selectedStudentId,
  );

  const activeStudentCount = studentSummaries.filter(
    (summary) => summary.weeklyAttempts.length > 0,
  ).length;
  const needsAttentionCount = studentSummaries.filter(
    (summary) => summary.weeklyQuestions > 0 && summary.weeklyAccuracy < 70,
  ).length;
  const classWeeklyAttempts = studentSummaries.reduce(
    (sum, summary) => sum + summary.weeklyAttempts.length,
    0,
  );
  const classWeeklyQuestions = studentSummaries.reduce(
    (sum, summary) => sum + summary.weeklyQuestions,
    0,
  );
  const classWeeklyCorrect = studentSummaries.reduce(
    (sum, summary) => sum + summary.weeklyCorrect,
    0,
  );
  const classAccuracy =
    classWeeklyQuestions > 0
      ? Math.round((classWeeklyCorrect / classWeeklyQuestions) * 100)
      : 0;

  const filteredRoster = useMemo(() => {
    const search = rosterSearch.trim().toLowerCase();

    return studentSummaries.filter((summary) => {
      const student = summary.student;
      const matchesSearch =
        !search ||
        student.student_label.toLowerCase().includes(search) ||
        String(student.student_email || "").toLowerCase().includes(search) ||
        String(student.class_label || "").toLowerCase().includes(search);

      if (!matchesSearch) return false;
      if (rosterFilter === "active") return summary.weeklyAttempts.length > 0;
      if (rosterFilter === "needs_attention") {
        return summary.weeklyQuestions > 0 && summary.weeklyAccuracy < 70;
      }
      return true;
    });
  }, [studentSummaries, rosterSearch, rosterFilter]);

  const selectedAttempts = selectedSummary?.attempts ?? [];
  const thisWeekAttempts = selectedSummary?.weeklyAttempts ?? [];
  const previousWeekAttempts = selectedAttempts.filter((attempt) =>
    isDateInsideRange(attempt.createdAt, lastWeekRange),
  );

  const previousQuestions = previousWeekAttempts.reduce(
    (sum, attempt) => sum + attempt.totalQuestions,
    0,
  );
  const previousCorrect = previousWeekAttempts.reduce(
    (sum, attempt) => sum + attempt.correctCount,
    0,
  );
  const previousAccuracy =
    previousQuestions > 0 ? Math.round((previousCorrect / previousQuestions) * 100) : 0;

  const weeklyDays = useMemo(() => {
    const start = thisWeekRange.start || mondayKeyFor(new Date());

    return Array.from({ length: 7 }, (_, index) => {
      const key = addDaysToKey(start, index);
      const count = thisWeekAttempts.filter(
        (attempt) => singaporeDateKey(new Date(attempt.createdAt)) === key,
      ).length;

      return {
        key,
        label: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index],
        count,
      };
    });
  }, [thisWeekAttempts, thisWeekRange]);

  const maxDailyCount = Math.max(1, ...weeklyDays.map((day) => day.count));

  const subjectSummaries = useMemo(() => {
    return (Object.keys(SUBJECT_META) as SubjectKey[]).map((subject) => {
      const attempts = thisWeekAttempts.filter((attempt) => attempt.subject === subject);
      const questions = attempts.reduce((sum, attempt) => sum + attempt.totalQuestions, 0);
      const correct = attempts.reduce((sum, attempt) => sum + attempt.correctCount, 0);

      return {
        subject,
        attempts: attempts.length,
        questions,
        accuracy: questions > 0 ? Math.round((correct / questions) * 100) : 0,
      };
    });
  }, [thisWeekAttempts]);

  const filteredAttempts = useMemo(() => {
    const range = getDateRange(dateFilter);

    return selectedAttempts.filter((attempt) => {
      if (!isDateInsideRange(attempt.createdAt, range)) return false;
      if (subjectFilter !== "all" && attempt.subject !== subjectFilter) return false;

      const accuracy = accuracyOf(attempt);
      if (accuracyFilter === "with_mistakes" && accuracy >= 100) return false;
      if (accuracyFilter === "perfect" && accuracy < 100) return false;
      return true;
    });
  }, [selectedAttempts, dateFilter, subjectFilter, accuracyFilter]);

  const visibleAnswers = wrongOnly
    ? detailAnswers.filter((answer) => !answer.is_correct)
    : detailAnswers;

  const dashboardRole = normaliseRole(
    teacherProfile?.role || teacherProfile?.tier,
  );
  const teacherTypeLabel =
    dashboardRole === "curriculum-lead"
      ? "Curriculum Lead"
      : teacherProfile?.teacher_type === "gkp"
        ? "GKP Teacher"
        : "External Teacher";

  return (
    <main className="teacher-page">
      <div className="background-grid" aria-hidden="true" />

      <header className="topbar">
        <Link href={isAdminPreview ? "/profile" : "/"} className="back-button">
          {isAdminPreview ? "← Admin Profile" : "← Home"}
        </Link>

        <div className="topbar-copy">
          <strong>{isAdminPreview ? "Teacher Dashboard Preview" : "Teacher Dashboard"}</strong>
          <span>{teacherProfile?.organization_name || teacherTypeLabel}</span>
        </div>

        <Link href="/profile" className="account-button">
          {isAdminPreview ? "Admin Account" : teacherEmail ? "My Account" : "Log In"}
        </Link>
      </header>

      <section className="page-shell">
        <header className="hero">
          <div>
            <p className="eyebrow">
              {isAdminPreview ? "Administrator Preview" : "B2B Learning Management"}
            </p>
            <h1>
              {isAdminPreview
                ? `${teacherProfile?.username || teacherEmail || "Teacher"}’s Student Roster`
                : "Your Student Roster"}
            </h1>
            <p>
              Monitor assigned students, weekly participation, performance by subject,
              and every recorded quiz answer.
            </p>
          </div>

          <div className="licence-card">
            <span>{teacherTypeLabel}</span>
            <strong>{teacherProfile?.organization_name || "Dreamscape One"}</strong>
            <small>Licence: {teacherProfile?.teacher_license_status || "inactive"}</small>
          </div>
        </header>

        {isLoading && <div className="notice-card">Loading teacher dashboard…</div>}

        {!isLoading && loadMessage && roster.length === 0 && (
          <div className="notice-card">
            <strong>Teacher dashboard unavailable</strong>
            <p>{loadMessage}</p>
            {!teacherEmail && (
              <Link href="/login" className="primary-link">
                Log in
              </Link>
            )}
          </div>
        )}

        {!isLoading && roster.length > 0 && (
          <>
            {loadMessage && <div className="warning-card">{loadMessage}</div>}

            <section className="class-summary-grid">
              <SummaryCard
                label="Assigned students"
                value={String(roster.length)}
                supporting={`${activeStudentCount} active this week`}
                icon="♙"
              />
              <SummaryCard
                label="Quizzes this week"
                value={String(classWeeklyAttempts)}
                supporting={`${classWeeklyQuestions} questions attempted`}
                icon="▤"
              />
              <SummaryCard
                label="Class accuracy"
                value={`${classAccuracy}%`}
                supporting="Across all recorded questions"
                icon="◎"
              />
              <SummaryCard
                label="Needs attention"
                value={String(needsAttentionCount)}
                supporting="Below 70% this week"
                icon="!"
              />
            </section>

            <section className="workspace-grid">
              <aside className="panel roster-panel">
                <div className="panel-heading">
                  <div>
                    <p className="section-label">Assigned users</p>
                    <h2>Students</h2>
                  </div>
                  <span>{filteredRoster.length}</span>
                </div>

                <input
                  value={rosterSearch}
                  onChange={(event) => setRosterSearch(event.target.value)}
                  className="search-input"
                  placeholder="Search student or class"
                />

                <div className="roster-filters">
                  {([
                    ["all", "All"],
                    ["active", "Active"],
                    ["needs_attention", "Needs attention"],
                  ] as [RosterFilter, string][]).map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      className={rosterFilter === value ? "active" : ""}
                      onClick={() => setRosterFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="roster-list">
                  {filteredRoster.map((summary) => {
                    const selected =
                      summary.student.student_user_id === selectedStudentId;
                    const needsAttention =
                      summary.weeklyQuestions > 0 && summary.weeklyAccuracy < 70;

                    return (
                      <button
                        type="button"
                        key={summary.student.student_user_id}
                        className={`student-row ${selected ? "selected" : ""}`}
                        onClick={() => setSelectedStudentId(summary.student.student_user_id)}
                      >
                        <span className="avatar">
                          {summary.student.student_label.charAt(0).toUpperCase()}
                        </span>
                        <span className="student-copy">
                          <strong>{summary.student.student_label}</strong>
                          <small>
                            {summary.student.class_label || "No class label"} · {formatRelativeActivity(summary.lastActivity)}
                          </small>
                        </span>
                        <span
                          className={`student-score ${needsAttention ? "warning" : ""}`}
                        >
                          {summary.weeklyQuestions > 0
                            ? `${summary.weeklyAccuracy}%`
                            : "—"}
                        </span>
                      </button>
                    );
                  })}

                  {filteredRoster.length === 0 && (
                    <div className="empty-state">No students match this filter.</div>
                  )}
                </div>
              </aside>

              <section className="student-workspace">
                {selectedSummary ? (
                  <>
                    <article className="panel student-header-card">
                      <div>
                        <p className="section-label">Selected student</p>
                        <h2>{selectedSummary.student.student_label}</h2>
                        <p>
                          {selectedSummary.student.class_label || "No class assigned"}
                          {selectedSummary.student.student_email
                            ? ` · ${selectedSummary.student.student_email}`
                            : ""}
                        </p>
                      </div>

                      <div className="student-header-metrics">
                        <MiniMetric
                          label="This week"
                          value={`${selectedSummary.weeklyAttempts.length} quizzes`}
                        />
                        <MiniMetric
                          label="Accuracy"
                          value={`${selectedSummary.weeklyAccuracy}%`}
                        />
                        <MiniMetric
                          label="Wrong answers"
                          value={String(selectedSummary.weeklyWrong)}
                        />
                      </div>
                    </article>

                    <section className="student-summary-grid">
                      <SummaryCard
                        label="Quizzes this week"
                        value={String(selectedSummary.weeklyAttempts.length)}
                        supporting={`${previousWeekAttempts.length} last week`}
                        icon="▤"
                      />
                      <SummaryCard
                        label="Questions attempted"
                        value={String(selectedSummary.weeklyQuestions)}
                        supporting={`${selectedSummary.weeklyCorrect} correct`}
                        icon="?"
                      />
                      <SummaryCard
                        label="Overall accuracy"
                        value={`${selectedSummary.weeklyAccuracy}%`}
                        supporting={`${selectedSummary.weeklyAccuracy - previousAccuracy >= 0 ? "+" : ""}${selectedSummary.weeklyAccuracy - previousAccuracy} points vs last week`}
                        icon="◎"
                      />
                      <SummaryCard
                        label="Incorrect answers"
                        value={String(selectedSummary.weeklyWrong)}
                        supporting="Open attempts to review"
                        icon="!"
                      />
                    </section>

                    <section className="overview-grid">
                      <article className="panel chart-panel">
                        <div className="panel-heading">
                          <div>
                            <p className="section-label">Weekly activity</p>
                            <h2>Quizzes by day</h2>
                          </div>
                        </div>

                        <div className="weekly-chart">
                          {weeklyDays.map((day) => (
                            <div className="chart-day" key={day.key}>
                              <strong>{day.count}</strong>
                              <div className="bar-track">
                                <div
                                  className="bar-fill"
                                  style={{
                                    height: `${Math.max(
                                      5,
                                      (day.count / maxDailyCount) * 100,
                                    )}%`,
                                  }}
                                />
                              </div>
                              <span>{day.label}</span>
                            </div>
                          ))}
                        </div>
                      </article>

                      <article className="panel subject-panel">
                        <div className="panel-heading">
                          <div>
                            <p className="section-label">Subject breakdown</p>
                            <h2>This week</h2>
                          </div>
                        </div>

                        <div className="subject-list">
                          {subjectSummaries.map((summary) => {
                            const meta = SUBJECT_META[summary.subject];

                            return (
                              <button
                                type="button"
                                key={summary.subject}
                                className="subject-row"
                                onClick={() => {
                                  setDateFilter("this_week");
                                  setSubjectFilter(summary.subject);
                                }}
                              >
                                <span
                                  className="subject-icon"
                                  style={{
                                    color: meta.accent,
                                    borderColor: `${meta.accent}55`,
                                    background: `${meta.accent}12`,
                                  }}
                                >
                                  {meta.icon}
                                </span>
                                <span>
                                  <strong>{meta.label}</strong>
                                  <small>
                                    {summary.attempts} quizzes · {summary.questions} questions
                                  </small>
                                </span>
                                <strong style={{ color: meta.accent }}>
                                  {summary.accuracy}%
                                </strong>
                              </button>
                            );
                          })}
                        </div>
                      </article>
                    </section>

                    <section className="panel attempts-panel">
                      <div className="attempt-heading">
                        <div>
                          <p className="section-label">Recorded attempts</p>
                          <h2>Quiz history</h2>
                          <p>
                            Every replay is kept. Open any record to inspect all saved answers.
                          </p>
                        </div>

                        <div className="filter-grid">
                          <label>
                            <span>Date</span>
                            <select
                              value={dateFilter}
                              onChange={(event) =>
                                setDateFilter(event.target.value as DateFilter)
                              }
                            >
                              <option value="this_week">This week</option>
                              <option value="last_week">Last week</option>
                              <option value="this_month">This month</option>
                              <option value="all_time">All time</option>
                            </select>
                          </label>

                          <label>
                            <span>Subject</span>
                            <select
                              value={subjectFilter}
                              onChange={(event) =>
                                setSubjectFilter(
                                  event.target.value as SubjectKey | "all",
                                )
                              }
                            >
                              <option value="all">All subjects</option>
                              {(Object.keys(SUBJECT_META) as SubjectKey[]).map(
                                (subject) => (
                                  <option key={subject} value={subject}>
                                    {SUBJECT_META[subject].label}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>

                          <label>
                            <span>Results</span>
                            <select
                              value={accuracyFilter}
                              onChange={(event) =>
                                setAccuracyFilter(
                                  event.target.value as AccuracyFilter,
                                )
                              }
                            >
                              <option value="all">All attempts</option>
                              <option value="with_mistakes">With wrong answers</option>
                              <option value="perfect">Perfect attempts</option>
                            </select>
                          </label>
                        </div>
                      </div>

                      {filteredAttempts.length === 0 ? (
                        <div className="empty-state">
                          No quiz attempts match these filters.
                        </div>
                      ) : (
                        <div className="attempt-list">
                          {filteredAttempts.map((attempt) => {
                            const meta = SUBJECT_META[attempt.subject];
                            const accuracy = accuracyOf(attempt);

                            return (
                              <button
                                type="button"
                                className="attempt-row"
                                key={`${attempt.source}-${attempt.id}`}
                                onClick={() => void openAttempt(attempt)}
                              >
                                <span
                                  className="attempt-icon"
                                  style={{
                                    color: meta.accent,
                                    borderColor: `${meta.accent}55`,
                                    background: `${meta.accent}12`,
                                  }}
                                >
                                  {meta.icon}
                                </span>
                                <span className="attempt-copy">
                                  <strong>{attempt.title}</strong>
                                  <small>
                                    {attempt.subtitle} · {formatDateTime(attempt.createdAt)}
                                  </small>
                                </span>
                                <span className="attempt-stat">
                                  {attempt.correctCount}/{attempt.totalQuestions}
                                </span>
                                <span
                                  className={`accuracy-pill ${
                                    accuracy < 60 ? "warning" : accuracy === 100 ? "perfect" : ""
                                  }`}
                                >
                                  {accuracy}%
                                </span>
                                <span className="view-link">View answers →</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  </>
                ) : (
                  <div className="panel empty-workspace">
                    Select a student to open their learning records.
                  </div>
                )}
              </section>
            </section>
          </>
        )}
      </section>

      {selectedAttempt && selectedSummary && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setSelectedAttempt(null)}
        >
          <section
            className="attempt-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Quiz answer record"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <div>
                <p className="section-label">Quiz record</p>
                <h2>{selectedAttempt.title}</h2>
                <p>
                  {selectedSummary.student.student_label} · {SUBJECT_META[selectedAttempt.subject].label} · {formatDateTime(selectedAttempt.createdAt)}
                </p>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() => setSelectedAttempt(null)}
                aria-label="Close quiz record"
              >
                ×
              </button>
            </header>

            <div className="modal-summary">
              <MiniMetric
                label="Score"
                value={`${selectedAttempt.correctCount}/${selectedAttempt.totalQuestions}`}
              />
              <MiniMetric label="Accuracy" value={`${accuracyOf(selectedAttempt)}%`} />
              <MiniMetric
                label="Duration"
                value={formatDuration(selectedAttempt.durationSeconds)}
              />
              <MiniMetric label="Attempt" value="Recorded" />
            </div>

            <div className="answer-toolbar">
              <div>
                <strong>Question review</strong>
                <span>{detailAnswers.length} recorded answers</span>
              </div>

              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={wrongOnly}
                  onChange={(event) => setWrongOnly(event.target.checked)}
                />
                <span>Wrong answers only</span>
              </label>
            </div>

            <div className="answer-area">
              {detailsLoading ? (
                <div className="empty-state">Loading individual answers…</div>
              ) : detailMessage ? (
                <div className="detail-message">
                  <strong>Answer detail unavailable</strong>
                  <p>{detailMessage}</p>
                </div>
              ) : visibleAnswers.length === 0 ? (
                <div className="empty-state">
                  {wrongOnly
                    ? "There are no wrong answers in this attempt."
                    : "No answer records found."}
                </div>
              ) : (
                <div className="answer-table">
                  <div className="answer-table-header">
                    <span>Question</span>
                    <span>Student&apos;s answer</span>
                    <span>Correct answer</span>
                    <span>Explanation</span>
                  </div>

                  {visibleAnswers.map((answer) => (
                    <div
                      key={answer.id}
                      className={`answer-row ${answer.is_correct ? "correct" : "wrong"}`}
                    >
                      <div>
                        <span className="question-number">
                          Question {answer.question_order}
                        </span>
                        <p>{answer.question_text}</p>
                        {answer.skill && <small>{answer.skill}</small>}
                        {answer.question_image && (
                          <img
                            src={answer.question_image}
                            alt="Question illustration"
                          />
                        )}
                      </div>
                      <div>
                        <span className="mobile-label">Student&apos;s answer</span>
                        <p>
                          {answerDisplay(
                            answer.student_answer_label,
                            answer.student_answer_text,
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="mobile-label">Correct answer</span>
                        <p>
                          {answerDisplay(
                            answer.correct_answer_label,
                            answer.correct_answer_text,
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="mobile-label">Explanation</span>
                        <p>{answer.explanation || "No explanation was saved."}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <style jsx>{`
        :global(*) { box-sizing: border-box; }
        :global(html), :global(body) { margin: 0; background: #020611; }
        :global(button), :global(input), :global(select) { font: inherit; }

        .teacher-page {
          min-height: 100dvh;
          color: white;
          background:
            radial-gradient(circle at 48% 0%, rgba(83, 215, 255, 0.17), transparent 34%),
            linear-gradient(180deg, #071426 0%, #030914 56%, #02050b 100%);
          font-family: Arial, Helvetica, sans-serif;
        }

        .background-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.09;
          background-image:
            linear-gradient(rgba(126, 232, 255, 0.17) 1px, transparent 1px),
            linear-gradient(90deg, rgba(126, 232, 255, 0.17) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: linear-gradient(to bottom, black, transparent 88%);
        }

        .topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          min-height: 70px;
          padding: 11px 22px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 14px;
          border-bottom: 1px solid rgba(126, 232, 255, 0.14);
          background: rgba(3, 8, 18, 0.85);
          backdrop-filter: blur(20px);
        }

        .back-button, .account-button {
          min-height: 42px;
          width: fit-content;
          padding: 0 16px;
          border-radius: 999px;
          border: 1px solid rgba(126, 232, 255, 0.24);
          background: rgba(12, 31, 57, 0.72);
          color: white;
          display: inline-flex;
          align-items: center;
          text-decoration: none;
          font-size: 13px;
          font-weight: 800;
        }

        .account-button { justify-self: end; }
        .topbar-copy { display: grid; gap: 3px; text-align: center; }
        .topbar-copy strong { font-size: 14px; }
        .topbar-copy span { color: rgba(235, 247, 255, 0.5); font-size: 10px; }

        .page-shell {
          position: relative;
          z-index: 1;
          width: min(1600px, calc(100% - 36px));
          margin: 0 auto;
          padding: 38px 0 70px;
        }

        .hero {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 30px;
        }

        .eyebrow, .section-label {
          margin: 0;
          color: #8dfcff;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .hero h1 {
          margin: 9px 0 0;
          font-size: clamp(46px, 6vw, 78px);
          line-height: 0.98;
          letter-spacing: -0.055em;
        }

        .hero > div:first-child > p:last-child {
          max-width: 760px;
          margin: 18px 0 0;
          color: rgba(235, 247, 255, 0.66);
          font-size: 17px;
          line-height: 1.6;
        }

        .licence-card {
          min-width: 270px;
          padding: 18px 20px;
          display: grid;
          gap: 7px;
          border-radius: 20px;
          border: 1px solid rgba(126, 232, 255, 0.24);
          background: linear-gradient(145deg, rgba(11, 35, 66, 0.82), rgba(5, 17, 37, 0.9));
          box-shadow: 0 24px 55px rgba(0, 0, 0, 0.3);
        }

        .licence-card span, .licence-card small {
          color: rgba(235, 247, 255, 0.5);
          font-size: 11px;
        }
        .licence-card strong { font-size: 18px; }

        .notice-card, .warning-card {
          margin-top: 24px;
          padding: 26px;
          border-radius: 20px;
          border: 1px solid rgba(126, 232, 255, 0.2);
          background: rgba(9, 28, 54, 0.78);
          text-align: center;
        }
        .notice-card p { margin: 10px 0 0; color: rgba(235, 247, 255, 0.64); }
        .warning-card { color: #ffe6a8; border-color: rgba(255, 215, 106, 0.28); }
        .primary-link { margin-top: 16px; color: #8dfcff; display: inline-block; }

        .class-summary-grid, .student-summary-grid {
          margin-top: 24px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .workspace-grid {
          margin-top: 18px;
          display: grid;
          grid-template-columns: 370px minmax(0, 1fr);
          gap: 16px;
          align-items: start;
        }

        .panel {
          border-radius: 22px;
          border: 1px solid rgba(126, 232, 255, 0.14);
          background: linear-gradient(145deg, rgba(7, 24, 48, 0.84), rgba(4, 13, 30, 0.9));
          box-shadow: 0 24px 58px rgba(0, 0, 0, 0.28);
        }

        .roster-panel {
          position: sticky;
          top: 88px;
          max-height: calc(100dvh - 108px);
          padding: 18px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .panel-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        .panel-heading h2 { margin: 6px 0 0; font-size: 27px; }
        .panel-heading > span {
          min-width: 34px;
          height: 34px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(83, 215, 255, 0.09);
          color: #8dfcff;
          font-weight: 900;
        }

        .search-input {
          width: 100%;
          height: 46px;
          margin-top: 16px;
          padding: 0 14px;
          border-radius: 13px;
          border: 1px solid rgba(126, 232, 255, 0.16);
          background: rgba(255, 255, 255, 0.04);
          color: white;
          outline: none;
        }

        .roster-filters {
          margin-top: 10px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
        }
        .roster-filters button {
          min-height: 36px;
          padding: 0 8px;
          border-radius: 10px;
          border: 1px solid rgba(126, 232, 255, 0.12);
          background: rgba(255, 255, 255, 0.025);
          color: rgba(235, 247, 255, 0.58);
          cursor: pointer;
          font-size: 10px;
          font-weight: 800;
        }
        .roster-filters button.active {
          border-color: rgba(126, 232, 255, 0.35);
          background: rgba(83, 215, 255, 0.1);
          color: white;
        }

        .roster-list {
          min-height: 180px;
          margin-top: 11px;
          display: grid;
          gap: 7px;
          overflow-y: auto;
          padding-right: 3px;
        }

        .student-row {
          width: 100%;
          min-height: 67px;
          padding: 9px 10px;
          display: grid;
          grid-template-columns: 40px minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          border-radius: 14px;
          border: 1px solid rgba(126, 232, 255, 0.09);
          background: rgba(255, 255, 255, 0.024);
          color: white;
          text-align: left;
          cursor: pointer;
        }
        .student-row.selected {
          border-color: rgba(126, 232, 255, 0.42);
          background: rgba(83, 215, 255, 0.09);
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(145deg, rgba(83, 215, 255, 0.26), rgba(76, 109, 255, 0.2));
          color: #bdf6ff;
          font-weight: 900;
        }
        .student-copy { min-width: 0; display: grid; gap: 5px; }
        .student-copy strong, .student-copy small {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .student-copy strong { font-size: 12px; }
        .student-copy small { color: rgba(235, 247, 255, 0.43); font-size: 9px; }
        .student-score { color: #9fffd2; font-size: 12px; font-weight: 900; }
        .student-score.warning { color: #ffc0a0; }

        .student-workspace { min-width: 0; display: grid; gap: 16px; }
        .student-header-card {
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }
        .student-header-card h2 { margin: 7px 0 0; font-size: 34px; }
        .student-header-card > div:first-child > p:last-child {
          margin: 8px 0 0;
          color: rgba(235, 247, 255, 0.52);
          font-size: 12px;
        }
        .student-header-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(110px, 1fr));
          gap: 8px;
        }

        .overview-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
          gap: 16px;
        }
        .chart-panel, .subject-panel, .attempts-panel { padding: 20px; }

        .weekly-chart {
          height: 220px;
          margin-top: 18px;
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 8px;
          align-items: end;
        }
        .chart-day {
          height: 100%;
          display: grid;
          grid-template-rows: 22px minmax(0, 1fr) 18px;
          gap: 7px;
          text-align: center;
        }
        .chart-day strong { font-size: 11px; color: #8dfcff; }
        .chart-day span { color: rgba(235, 247, 255, 0.48); font-size: 10px; }
        .bar-track {
          width: min(42px, 70%);
          height: 100%;
          margin: 0 auto;
          display: flex;
          align-items: flex-end;
          overflow: hidden;
          border-radius: 11px 11px 4px 4px;
          background: rgba(255, 255, 255, 0.04);
        }
        .bar-fill {
          width: 100%;
          min-height: 5px;
          border-radius: 11px 11px 4px 4px;
          background: linear-gradient(180deg, #8dfcff, #4c6dff);
        }

        .subject-list { margin-top: 16px; display: grid; gap: 8px; }
        .subject-row {
          width: 100%;
          min-height: 62px;
          padding: 9px 11px;
          display: grid;
          grid-template-columns: 40px minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          border-radius: 14px;
          border: 1px solid rgba(126, 232, 255, 0.09);
          background: rgba(255, 255, 255, 0.025);
          color: white;
          text-align: left;
          cursor: pointer;
        }
        .subject-icon, .attempt-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          border-width: 1px;
          border-style: solid;
        }
        .subject-icon { width: 40px; height: 40px; border-radius: 12px; }
        .subject-row > span:nth-child(2) { min-width: 0; display: grid; gap: 4px; }
        .subject-row small { color: rgba(235, 247, 255, 0.43); font-size: 9px; }

        .attempt-heading {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 18px;
        }
        .attempt-heading h2 { margin: 6px 0 0; font-size: 30px; }
        .attempt-heading > div:first-child > p:last-child {
          margin: 8px 0 0;
          color: rgba(235, 247, 255, 0.5);
          font-size: 12px;
        }

        .filter-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(130px, 1fr));
          gap: 7px;
        }
        .filter-grid label {
          min-height: 56px;
          padding: 7px 10px;
          display: grid;
          gap: 4px;
          border-radius: 12px;
          border: 1px solid rgba(126, 232, 255, 0.11);
          background: rgba(255, 255, 255, 0.025);
        }
        .filter-grid label > span {
          color: rgba(235, 247, 255, 0.42);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        select {
          border: 0;
          background: transparent;
          color: white;
          outline: none;
          font-size: 11px;
        }
        select option { color: #06142d; }

        .attempt-list { margin-top: 18px; display: grid; gap: 8px; }
        .attempt-row {
          width: 100%;
          min-height: 72px;
          padding: 10px 12px;
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr) 70px 70px 105px;
          align-items: center;
          gap: 10px;
          border-radius: 15px;
          border: 1px solid rgba(126, 232, 255, 0.1);
          background: rgba(255, 255, 255, 0.024);
          color: white;
          text-align: left;
          cursor: pointer;
        }
        .attempt-row:hover { background: rgba(83, 215, 255, 0.055); }
        .attempt-icon { width: 42px; height: 42px; border-radius: 13px; }
        .attempt-copy { min-width: 0; display: grid; gap: 5px; }
        .attempt-copy strong, .attempt-copy small {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .attempt-copy strong { font-size: 12px; }
        .attempt-copy small { color: rgba(235, 247, 255, 0.43); font-size: 9px; }
        .attempt-stat { font-size: 11px; }
        .accuracy-pill {
          width: fit-content;
          padding: 6px 9px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.05);
          color: #ffe4a0;
          font-size: 11px;
        }
        .accuracy-pill.warning { color: #ffc0a0; background: rgba(255, 138, 92, 0.08); }
        .accuracy-pill.perfect { color: #9fffd2; background: rgba(93, 255, 181, 0.08); }
        .view-link { color: #8dfcff; font-size: 10px; font-weight: 900; text-align: right; }

        .empty-state, .detail-message, .empty-workspace {
          padding: 24px;
          border-radius: 16px;
          border: 1px solid rgba(126, 232, 255, 0.1);
          background: rgba(255, 255, 255, 0.024);
          color: rgba(235, 247, 255, 0.54);
          text-align: center;
        }
        .empty-workspace { min-height: 300px; display: flex; align-items: center; justify-content: center; }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          padding: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 4, 12, 0.8);
          backdrop-filter: blur(10px);
        }
        .attempt-modal {
          width: min(1480px, 96vw);
          max-height: 92dvh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: 26px;
          border: 1px solid rgba(126, 232, 255, 0.28);
          background: linear-gradient(145deg, #07182e, #030916);
          box-shadow: 0 40px 100px rgba(0, 0, 0, 0.62);
        }
        .modal-header {
          padding: 22px 25px 18px;
          display: flex;
          justify-content: space-between;
          gap: 20px;
          border-bottom: 1px solid rgba(126, 232, 255, 0.12);
        }
        .modal-header h2 { margin: 7px 0 0; font-size: clamp(27px, 4vw, 42px); }
        .modal-header p:last-child { margin: 8px 0 0; color: rgba(235, 247, 255, 0.54); }
        .close-button {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          border: 1px solid rgba(126, 232, 255, 0.24);
          background: rgba(255, 255, 255, 0.05);
          color: white;
          font-size: 25px;
          cursor: pointer;
        }
        .modal-summary {
          padding: 13px 25px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 9px;
          border-bottom: 1px solid rgba(126, 232, 255, 0.1);
        }
        .answer-toolbar {
          padding: 13px 25px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border-bottom: 1px solid rgba(126, 232, 255, 0.1);
        }
        .answer-toolbar > div { display: grid; gap: 4px; }
        .answer-toolbar span { color: rgba(235, 247, 255, 0.48); font-size: 10px; }
        .toggle-label {
          min-height: 40px;
          padding: 0 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          border: 1px solid rgba(126, 232, 255, 0.16);
          background: rgba(255, 255, 255, 0.035);
          cursor: pointer;
        }
        .toggle-label input { accent-color: #53d7ff; }
        .toggle-label span { color: white; font-weight: 800; }
        .answer-area { min-height: 260px; padding: 0 18px 18px; overflow: auto; }
        .detail-message { margin-top: 18px; }
        .detail-message p { max-width: 760px; margin: 8px auto 0; line-height: 1.55; }

        .answer-table { min-width: 1040px; }
        .answer-table-header, .answer-row {
          display: grid;
          grid-template-columns: 1.35fr 0.85fr 0.85fr 1.25fr;
        }
        .answer-table-header {
          position: sticky;
          top: 0;
          z-index: 2;
          padding: 12px 13px;
          background: #061329;
          color: rgba(235, 247, 255, 0.43);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }
        .answer-row { border-top: 1px solid rgba(126, 232, 255, 0.08); }
        .answer-row.wrong { background: rgba(255, 138, 92, 0.035); }
        .answer-row.correct { background: rgba(93, 255, 181, 0.02); }
        .answer-row > div {
          min-width: 0;
          padding: 15px 13px;
          border-right: 1px solid rgba(126, 232, 255, 0.07);
        }
        .answer-row > div:last-child { border-right: 0; }
        .answer-row p { margin: 7px 0 0; font-size: 12px; line-height: 1.5; }
        .answer-row small { color: #8dfcff; }
        .answer-row img {
          width: 100%;
          max-height: 180px;
          margin-top: 10px;
          object-fit: contain;
          border-radius: 10px;
          background: white;
        }
        .question-number { color: #8dfcff; font-size: 9px; font-weight: 900; }
        .mobile-label { display: none; }

        @media (max-width: 1240px) {
          .workspace-grid { grid-template-columns: 320px minmax(0, 1fr); }
          .class-summary-grid, .student-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .overview-grid { grid-template-columns: 1fr; }
          .attempt-heading { align-items: stretch; flex-direction: column; }
        }

        @media (max-width: 900px) {
          .topbar { grid-template-columns: auto 1fr auto; }
          .page-shell { width: min(100% - 24px, 900px); padding-top: 26px; }
          .hero { align-items: stretch; flex-direction: column; }
          .licence-card { min-width: 0; }
          .workspace-grid { grid-template-columns: 1fr; }
          .roster-panel { position: static; max-height: none; }
          .roster-list { max-height: 340px; }
          .student-header-card { align-items: stretch; flex-direction: column; }
          .student-header-metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .filter-grid { grid-template-columns: 1fr; }
          .attempt-row { grid-template-columns: 42px minmax(0, 1fr) 64px 64px; }
          .view-link { display: none; }
        }

        @media (max-width: 680px) {
          .topbar { min-height: 60px; padding: 8px 10px; }
          .topbar-copy span { display: none; }
          .back-button, .account-button { min-height: 38px; padding: 0 11px; font-size: 10px; }
          .hero h1 { font-size: 42px; }
          .hero > div:first-child > p:last-child { font-size: 14px; }
          .class-summary-grid, .student-summary-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
          .student-header-metrics { grid-template-columns: 1fr; }
          .weekly-chart { height: 180px; gap: 4px; }
          .chart-panel, .subject-panel, .attempts-panel { padding: 15px; }
          .attempt-row {
            grid-template-columns: 38px minmax(0, 1fr) auto;
            min-height: 68px;
          }
          .attempt-icon { width: 38px; height: 38px; }
          .attempt-stat { display: none; }
          .modal-backdrop { padding: 8px; }
          .attempt-modal { width: 100%; max-height: 96dvh; border-radius: 19px; }
          .modal-header { padding: 17px; }
          .modal-summary { grid-template-columns: 1fr 1fr; padding: 11px 17px; }
          .answer-toolbar { align-items: stretch; flex-direction: column; padding: 12px 17px; }
          .answer-area { padding: 0 10px 10px; }
          .answer-table { min-width: 0; display: grid; gap: 10px; padding-top: 10px; }
          .answer-table-header { display: none; }
          .answer-row {
            display: grid;
            grid-template-columns: 1fr;
            border: 1px solid rgba(126, 232, 255, 0.11);
            border-radius: 15px;
            overflow: hidden;
          }
          .answer-row > div { border-right: 0; border-bottom: 1px solid rgba(126, 232, 255, 0.07); }
          .answer-row > div:last-child { border-bottom: 0; }
          .mobile-label { display: block; color: rgba(235, 247, 255, 0.4); font-size: 8px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; }
        }
      `}</style>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  supporting,
  icon,
}: {
  label: string;
  value: string;
  supporting: string;
  icon: string;
}) {
  return (
    <article className="summary-card">
      <span>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{supporting}</small>
      </div>

      <style jsx>{`
        .summary-card {
          min-height: 126px;
          padding: 17px;
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr);
          align-items: start;
          gap: 12px;
          border-radius: 19px;
          border: 1px solid rgba(126, 232, 255, 0.15);
          background: linear-gradient(145deg, rgba(9, 31, 59, 0.82), rgba(4, 14, 31, 0.9));
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.24);
        }
        .summary-card > span {
          width: 42px;
          height: 42px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(126, 232, 255, 0.25);
          background: rgba(83, 215, 255, 0.09);
          color: #8dfcff;
          font-size: 18px;
          font-weight: 900;
        }
        .summary-card div { min-width: 0; display: grid; }
        .summary-card p {
          margin: 1px 0 0;
          color: rgba(235, 247, 255, 0.48);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .summary-card strong { margin-top: 8px; font-size: 29px; line-height: 1; }
        .summary-card small { margin-top: 9px; color: rgba(235, 247, 255, 0.45); font-size: 10px; line-height: 1.35; }
        @media (max-width: 680px) {
          .summary-card { min-height: 112px; padding: 13px; grid-template-columns: 34px minmax(0, 1fr); gap: 9px; }
          .summary-card > span { width: 34px; height: 34px; border-radius: 11px; }
          .summary-card strong { font-size: 23px; }
        }
      `}</style>
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="mini-metric">
      <span>{label}</span>
      <strong>{value}</strong>

      <style jsx>{`
        .mini-metric {
          min-width: 0;
          padding: 10px 12px;
          display: grid;
          gap: 5px;
          border-radius: 13px;
          border: 1px solid rgba(126, 232, 255, 0.11);
          background: rgba(255, 255, 255, 0.027);
        }
        span {
          color: rgba(235, 247, 255, 0.42);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        strong { overflow: hidden; text-overflow: ellipsis; font-size: 13px; white-space: nowrap; }
      `}</style>
    </div>
  );
}
