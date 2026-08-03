"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import NovaVirtualTeacherPopup from "@/components/dashboard/NovaVirtualTeacherPopup";
import DashboardTopControls from "@/components/dashboard/DashboardTopControls";

type ScreenMode = "desktop" | "tablet" | "mobile";
type AttemptSource = "core" | "english" | "math" | "science" | "knowledge";
type SubjectKey = "english" | "math" | "science" | "knowledge";
type DateFilter = "this_week" | "last_week" | "this_month" | "all_time";
type AccuracyFilter = "all" | "with_mistakes" | "perfect";

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

type NewCoreAttemptRpcRow = {
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

type NewCoreAnswerRpcRow = {
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
  is_correct: boolean;
  skill: string | null;
  subject: string | null;
};

type ScienceAttemptRow = {
  id: string;
  user_id: string;
  quiz_id: string;
  status: string | null;
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

type CoreQuizRow = {
  id: string;
  title: string | null;
  subject: string | null;
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

type DashboardStudent = {
  id: string;
  label: string;
  relationship: string;
};

type LearningMonthRange = {
  index: number;
  start: string;
  end: string;
  label: string;
};

type AnalyticsSkillRow = {
  subject: SubjectKey;
  skill: string;
  correct: number;
  wrong: number;
  total: number;
  accuracy: number;
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
  science: {
    label: "Science",
    shortLabel: "Science",
    icon: "⚗",
    accent: "#a6ff7a",
  },
  knowledge: {
    label: "Knowledge Arena",
    shortLabel: "Knowledge",
    icon: "◎",
    accent: "#ffd76a",
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

function useResponsiveMode() {
  const [mode, setMode] = useState<ScreenMode>("desktop");

  useEffect(() => {
    function update() {
      const width = window.innerWidth;
      const height = window.innerHeight;

      if (width <= 720) setMode("mobile");
      else if (width <= 1180 || height > width) setMode("tablet");
      else setMode("desktop");
    }

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return mode;
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
    const nextMonth = parseDateKey(first);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    nextMonth.setUTCDate(0);
    return { start: first, end: nextMonth.toISOString().slice(0, 10) };
  }

  return { start: null, end: null };
}

function isDateInsideRange(value: string, range: { start: string | null; end: string | null }) {
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

function formatDuration(seconds: number | null) {
  if (seconds === null || seconds <= 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function differenceInDays(startKey: string, endKey: string) {
  const milliseconds =
    parseDateKey(endKey).getTime() - parseDateKey(startKey).getTime();

  return Math.max(0, Math.floor(milliseconds / 86_400_000));
}

function formatDateKeyShort(key: string) {
  const date = parseDateKey(key);

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function buildLearningMonthRanges(
  attempts: DashboardAttempt[],
): LearningMonthRange[] {
  if (attempts.length === 0) {
    const today = singaporeDateKey(new Date());

    return [
      {
        index: 0,
        start: today,
        end: addDaysToKey(today, 27),
        label: "Learning Month 1",
      },
    ];
  }

  const firstAttempt = [...attempts].sort(
    (first, second) =>
      new Date(first.createdAt).getTime() -
      new Date(second.createdAt).getTime(),
  )[0];

  const firstKey = singaporeDateKey(
    new Date(firstAttempt.createdAt),
  );
  const todayKey = singaporeDateKey(new Date());
  const monthCount =
    Math.floor(differenceInDays(firstKey, todayKey) / 28) + 1;

  return Array.from({ length: monthCount }, (_, index) => {
    const start = addDaysToKey(firstKey, index * 28);

    return {
      index,
      start,
      end: addDaysToKey(start, 27),
      label: `Learning Month ${index + 1}`,
    };
  });
}

function accuracyOf(attempt: DashboardAttempt) {
  if (attempt.totalQuestions <= 0) return 0;
  return Math.round((attempt.correctCount / attempt.totalQuestions) * 100);
}

function answerDisplay(label: string | null, text: string | null) {
  if (label && text) return `${label}. ${text}`;
  return text || label || "No answer";
}

function normaliseRole(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

function hasTeacherDashboardRole(value: string | null | undefined) {
  const cleanRole = normaliseRole(value);

  return cleanRole === "teacher" || cleanRole === "curriculum-lead";
}

export default function TeachingDashboardPage() {
  const screenMode = useResponsiveMode();
  const isMobile = screenMode === "mobile";
  const isCompact = screenMode !== "desktop";

  const [isLoading, setIsLoading] = useState(true);
  const [loadMessage, setLoadMessage] = useState("");
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState<string>("regular");
  const [students, setStudents] = useState<DashboardStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<DashboardAttempt[]>([]);

  const [dateFilter, setDateFilter] = useState<DateFilter>("this_week");
  const [subjectFilter, setSubjectFilter] = useState<SubjectKey | "all">("all");
  const [accuracyFilter, setAccuracyFilter] = useState<AccuracyFilter>("all");

  const [selectedAttempt, setSelectedAttempt] = useState<DashboardAttempt | null>(null);
  const [detailAnswers, setDetailAnswers] = useState<AttemptAnswerRow[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailMessage, setDetailMessage] = useState("");
  const [wrongOnly, setWrongOnly] = useState(false);

  const [selectedLearningMonthIndex, setSelectedLearningMonthIndex] =
    useState(0);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsMessage, setAnalyticsMessage] = useState("");
  const [analyticsSkillRows, setAnalyticsSkillRows] = useState<
    AnalyticsSkillRow[]
  >([]);
  const [analyticsAnswerCount, setAnalyticsAnswerCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function initialise() {
      setIsLoading(true);
      setLoadMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        setViewerId(null);
        setViewerRole("regular");
        setSelectedStudentId(null);
        setStudents([]);
        setAttempts([]);
        setLoadMessage("Log in to view the Teaching Dashboard.");
        setIsLoading(false);
        return;
      }

      setViewerId(user.id);

      const { data: viewerProfile, error: viewerProfileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (viewerProfileError) {
        console.info(
          "Could not load the Teaching Dashboard role label:",
          viewerProfileError.message,
        );
      }

      const loadedViewerRole = normaliseRole(viewerProfile?.role) || "regular";
      setViewerRole(loadedViewerRole);

      const accessibleStudents: DashboardStudent[] = [
        { id: user.id, label: "My learning", relationship: "self" },
      ];

      const { data: accessRows, error: accessError } = await supabase
        .from("learning_dashboard_access")
        .select("student_user_id,student_label,relationship")
        .eq("viewer_user_id", user.id)
        .order("student_label", { ascending: true });

      if (!accessError) {
        for (const row of accessRows ?? []) {
          const studentId = String(row.student_user_id || "");
          if (!studentId || accessibleStudents.some((student) => student.id === studentId)) {
            continue;
          }

          accessibleStudents.push({
            id: studentId,
            label: String(row.student_label || "Student"),
            relationship: String(row.relationship || "linked"),
          });
        }
      } else {
        console.info(
          "Parent/teacher access table is not installed yet; showing the signed-in user's records only.",
          accessError.message,
        );
      }

      if (cancelled) return;

      setStudents(accessibleStudents);
      setSelectedStudentId((current) => current ?? accessibleStudents[0].id);
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
  }, []);

  useEffect(() => {
    if (!selectedStudentId) return;
    void loadAttempts(selectedStudentId);
  }, [selectedStudentId]);

  async function loadAttempts(studentId: string) {
    setIsLoading(true);
    setLoadMessage("");

    const [
      coreResult,
      englishResult,
      mathResult,
      scienceResult,
      knowledgeResult,
    ] = await Promise.all([
      // Legacy Core records are retained so older completed work remains visible.
      supabase
        .from("core_mission_attempts")
        .select(
          "id,user_id,quiz_id,score,correct_count,total_questions,tokens_earned,created_at",
        )
        .eq("user_id", studentId)
        .order("created_at", { ascending: false })
        .limit(500),

      supabase.rpc("teacher_get_english_quiz_attempts", {
        p_student_user_ids: [studentId],
        p_teacher_user_id: null,
      }),

      supabase.rpc("teacher_get_math_quiz_attempts", {
        p_student_user_ids: [studentId],
        p_teacher_user_id: null,
      }),

      supabase
        .from("science_quiz_attempts")
        .select(
          "id,user_id,quiz_id,status,score,percentage,correct_count,total_questions,time_seconds,tokens_earned,gems_earned,first_completion,submitted_at,created_at",
        )
        .eq("user_id", studentId)
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false, nullsFirst: false })
        .limit(500),

      supabase
        .from("knowledge_arena_attempts")
        .select(
          "id,user_id,topic,mode,score,correct_count,total_questions,tokens_earned,created_at",
        )
        .eq("user_id", studentId)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    const errors = [
      coreResult.error,
      englishResult.error,
      mathResult.error,
      scienceResult.error,
      knowledgeResult.error,
    ].filter(Boolean);

    if (errors.length === 5) {
      setAttempts([]);
      setLoadMessage("The dashboard could not load the quiz attempt tables.");
      setIsLoading(false);
      return;
    }

    if (errors.length > 0) {
      setLoadMessage(
        "Some mission records could not be loaded. Check the browser console for the table or RPC error.",
      );
      errors.forEach((error) =>
        console.warn("Progress dashboard attempt load error:", error),
      );
    }

    const coreRows = (coreResult.data ?? []) as CoreAttemptRow[];
    const englishRows = (englishResult.data ?? []) as NewCoreAttemptRpcRow[];
    const mathRows = (mathResult.data ?? []) as NewCoreAttemptRpcRow[];
    const scienceRows = (scienceResult.data ?? []) as ScienceAttemptRow[];
    const knowledgeRows = (knowledgeResult.data ?? []) as KnowledgeAttemptRow[];

    const coreQuizIds = [
      ...new Set(coreRows.map((row) => row.quiz_id).filter(Boolean)),
    ];
    const scienceQuizIds = [
      ...new Set(scienceRows.map((row) => row.quiz_id).filter(Boolean)),
    ];

    const [coreQuizResult, scienceQuizResult] = await Promise.all([
      coreQuizIds.length
        ? supabase
            .from("core_mission_quizzes")
            .select("id,title,subject,level_label")
            .in("id", coreQuizIds)
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
      scienceQuizResult.error,
    ].filter(Boolean);

    if (catalogueErrors.length > 0) {
      setLoadMessage(
        "Some quiz titles could not be loaded. Attempt records are still shown where available.",
      );
      catalogueErrors.forEach((error) =>
        console.warn("Teaching Dashboard catalogue error:", error),
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
        "Teaching Dashboard Science-topic error:",
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
        "Teaching Dashboard Science-level error:",
        scienceLevelResult.error,
      );
    }

    const coreQuizMap = new Map(
      ((coreQuizResult.data ?? []) as CoreQuizRow[]).map((quiz) => [quiz.id, quiz]),
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

    const nextAttempts: DashboardAttempt[] = [];

    for (const row of coreRows) {
      const quiz = coreQuizMap.get(row.quiz_id);
      const subject: SubjectKey = quiz?.subject === "math" ? "math" : "english";

      nextAttempts.push({
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

    for (const [subject, rows] of [
      ["english", englishRows],
      ["math", mathRows],
    ] as const) {
      for (const row of rows) {
        const levelLabel = row.primary_level
          ? `Primary ${row.primary_level}`
          : null;

        nextAttempts.push({
          id: String(row.id),
          source: subject,
          userId: String(row.user_id),
          quizId: row.quiz_id,
          title:
            row.quiz_title ||
            `${SUBJECT_META[subject].label} Mission Quiz`,
          subtitle: [
            SUBJECT_META[subject].label,
            levelLabel,
            row.topic_title,
            row.quiz_type ? row.quiz_type.replaceAll("_", " ") : null,
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
            row.submitted_at || row.created_at || new Date(0).toISOString(),
        });
      }
    }

    for (const row of scienceRows) {
      const quiz = scienceQuizMap.get(row.quiz_id);
      const topic = quiz ? scienceTopicMap.get(quiz.topic_id) : undefined;
      const level = topic ? scienceLevelMap.get(topic.level_id) : undefined;
      const missionType = quiz?.mission_type
        ? SCIENCE_MISSION_TYPE_LABELS[quiz.mission_type] || quiz.mission_type
        : null;

      nextAttempts.push({
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

    for (const row of knowledgeRows) {
      const topic = String(row.topic || "knowledge");

      nextAttempts.push({
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

    nextAttempts.sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    );

    setAttempts(nextAttempts);
    setIsLoading(false);
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
        p_teacher_user_id: null,
      });

      if (error) {
        console.info(
          `${SUBJECT_META[attempt.subject].label} answer detail could not be loaded:`,
          error.message,
        );
        setDetailMessage(
          `The ${SUBJECT_META[attempt.subject].label} answer record could not be loaded. Run the split Teaching Dashboard RPC migration and try again.`,
        );
        setDetailsLoading(false);
        return;
      }

      const rows = ((data ?? []) as NewCoreAnswerRpcRow[]).map(
        (row): AttemptAnswerRow => ({
          ...row,
          id: String(row.id),
          attempt_source: attempt.source,
          attempt_id: attempt.id,
          question_id: row.question_id
            ? String(row.question_id)
            : null,
          question_order: safeNumber(row.question_order),
          is_correct: Boolean(row.is_correct),
        }),
      );

      setDetailAnswers(rows);

      if (rows.length === 0) {
        setDetailMessage(
          "This attempt has a final result but no saved question responses.",
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
      console.info(
        "Detailed answer tracking is not available yet:",
        error.message,
      );
      setDetailMessage(
        "Individual answers were not recorded for this attempt. Install the answer-tracking table and update the quiz pages to save each answer.",
      );
      setDetailsLoading(false);
      return;
    }

    const rows = (data ?? []) as AttemptAnswerRow[];
    setDetailAnswers(rows);

    if (rows.length === 0) {
      setDetailMessage(
        "This attempt contains a score summary, but no individual answer records. Older attempts cannot be reconstructed because the student's selections were not saved.",
      );
    }

    setDetailsLoading(false);
  }

  async function openAnalytics() {
    setAnalyticsOpen(true);
    setAnalyticsLoading(true);
    setAnalyticsMessage("");
    setAnalyticsSkillRows([]);
    setAnalyticsAnswerCount(0);

    const todayKey = singaporeDateKey(new Date());
    const analyticsStart = addDaysToKey(todayKey, -55);
    const recentAttempts = attempts
      .filter((attempt) => {
        const key = singaporeDateKey(new Date(attempt.createdAt));
        return key >= analyticsStart && key <= todayKey;
      })
      .slice(0, 30);

    if (recentAttempts.length === 0) {
      setAnalyticsMessage(
        "Nova needs at least one recorded quiz before she can prepare a results summary.",
      );
      setAnalyticsLoading(false);
      return;
    }

    const aggregate = new Map<
      string,
      {
        subject: SubjectKey;
        skill: string;
        correct: number;
        wrong: number;
        total: number;
      }
    >();

    let loadedAnswerCount = 0;
    let failedAttemptCount = 0;

    for (let index = 0; index < recentAttempts.length; index += 6) {
      const batch = recentAttempts.slice(index, index + 6);

      const batchResults = await Promise.all(
        batch.map(async (attempt) => {
          if (
            attempt.source === "english" ||
            attempt.source === "math"
          ) {
            const answerRpc =
              attempt.source === "english"
                ? "teacher_get_english_quiz_attempt_answers"
                : "teacher_get_math_quiz_attempt_answers";

            const { data, error } = await supabase.rpc(answerRpc, {
              p_attempt_id: attempt.id,
              p_student_user_id: attempt.userId,
              p_teacher_user_id: null,
            });

            return {
              attempt,
              rows: (data ?? []) as NewCoreAnswerRpcRow[],
              error,
            };
          }

          const { data, error } = await supabase
            .from("learning_mission_attempt_answers")
            .select(
              "question_text,is_correct,skill,subject",
            )
            .eq("attempt_source", attempt.source)
            .eq("attempt_id", attempt.id)
            .eq("user_id", attempt.userId);

          return {
            attempt,
            rows: (data ?? []) as Array<{
              question_text: string | null;
              is_correct: boolean | null;
              skill: string | null;
              subject: string | null;
            }>,
            error,
          };
        }),
      );

      for (const result of batchResults) {
        if (result.error) {
          failedAttemptCount += 1;
          continue;
        }

        for (const row of result.rows) {
          loadedAnswerCount += 1;

          const rawSkill = String(
            row.skill ||
              result.attempt.subtitle
                .split(" · ")
                .filter(Boolean)
                .slice(-2, -1)[0] ||
              result.attempt.title,
          ).trim();

          const skill = rawSkill || result.attempt.title;
          const key = `${result.attempt.subject}::${skill}`;
          const current = aggregate.get(key) || {
            subject: result.attempt.subject,
            skill,
            correct: 0,
            wrong: 0,
            total: 0,
          };

          current.total += 1;

          if (Boolean(row.is_correct)) {
            current.correct += 1;
          } else {
            current.wrong += 1;
          }

          aggregate.set(key, current);
        }
      }
    }

    const nextRows = [...aggregate.values()]
      .map((row): AnalyticsSkillRow => ({
        ...row,
        accuracy:
          row.total > 0
            ? Math.round((row.correct / row.total) * 100)
            : 0,
      }))
      .filter((row) => row.total >= 2 || row.wrong >= 2)
      .sort(
        (first, second) =>
          first.accuracy - second.accuracy ||
          second.wrong - first.wrong ||
          second.total - first.total,
      );

    setAnalyticsSkillRows(nextRows);
    setAnalyticsAnswerCount(loadedAnswerCount);

    if (loadedAnswerCount === 0) {
      setAnalyticsMessage(
        "Skill-level answer records were not available, so Nova is using quiz scores and topic names for this summary.",
      );
    } else if (failedAttemptCount > 0) {
      setAnalyticsMessage(
        `Nova analysed ${loadedAnswerCount} saved answers. ${failedAttemptCount} older attempt record${
          failedAttemptCount === 1 ? "" : "s"
        } could not provide question-level details.`,
      );
    }

    setAnalyticsLoading(false);
  }

  const thisWeekRange = useMemo(() => getDateRange("this_week"), []);
  const previousWeekRange = useMemo(() => getDateRange("last_week"), []);

  const thisWeekAttempts = useMemo(
    () => attempts.filter((attempt) => isDateInsideRange(attempt.createdAt, thisWeekRange)),
    [attempts, thisWeekRange],
  );

  const previousWeekAttempts = useMemo(
    () => attempts.filter((attempt) => isDateInsideRange(attempt.createdAt, previousWeekRange)),
    [attempts, previousWeekRange],
  );


  const learningMonths = useMemo(
    () => buildLearningMonthRanges(attempts),
    [attempts],
  );

  useEffect(() => {
    setSelectedLearningMonthIndex(
      Math.max(0, learningMonths.length - 1),
    );
  }, [selectedStudentId, learningMonths.length]);

  const selectedLearningMonth =
    learningMonths[
      Math.min(
        selectedLearningMonthIndex,
        Math.max(0, learningMonths.length - 1),
      )
    ] || learningMonths[0];

  const learningMonthAttempts = useMemo(() => {
    if (!selectedLearningMonth) return [];

    return attempts.filter((attempt) =>
      isDateInsideRange(attempt.createdAt, {
        start: selectedLearningMonth.start,
        end: selectedLearningMonth.end,
      }),
    );
  }, [attempts, selectedLearningMonth]);

  const learningMonthWeeks = useMemo(() => {
    if (!selectedLearningMonth) return [];

    return Array.from({ length: 4 }, (_, index) => {
      const start = addDaysToKey(
        selectedLearningMonth.start,
        index * 7,
      );
      const end = addDaysToKey(start, 6);
      const weekAttempts = learningMonthAttempts.filter((attempt) =>
        isDateInsideRange(attempt.createdAt, { start, end }),
      );
      const questions = weekAttempts.reduce(
        (sum, attempt) => sum + attempt.totalQuestions,
        0,
      );
      const correct = weekAttempts.reduce(
        (sum, attempt) => sum + attempt.correctCount,
        0,
      );

      return {
        index,
        start,
        end,
        label: `Week ${index + 1}`,
        attempts: weekAttempts.length,
        questions,
        accuracy:
          questions > 0
            ? Math.round((correct / questions) * 100)
            : 0,
      };
    });
  }, [learningMonthAttempts, selectedLearningMonth]);

  const maxLearningWeekAttempts = Math.max(
    1,
    ...learningMonthWeeks.map((week) => week.attempts),
  );

  const analyticsRange = useMemo(() => {
    const todayKey = singaporeDateKey(new Date());
    return {
      start: addDaysToKey(todayKey, -55),
      end: todayKey,
    };
  }, []);

  const analyticsAttempts = useMemo(
    () =>
      attempts
        .filter((attempt) =>
          isDateInsideRange(attempt.createdAt, analyticsRange),
        )
        .slice(0, 30),
    [attempts, analyticsRange],
  );

  const analyticsSubjectSummaries = useMemo(() => {
    const todayKey = singaporeDateKey(new Date());
    const recentStart = addDaysToKey(todayKey, -27);
    const previousStart = addDaysToKey(todayKey, -55);
    const previousEnd = addDaysToKey(todayKey, -28);

    return (Object.keys(SUBJECT_META) as SubjectKey[]).map(
      (subject) => {
        const subjectAttempts = analyticsAttempts.filter(
          (attempt) => attempt.subject === subject,
        );
        const questions = subjectAttempts.reduce(
          (sum, attempt) => sum + attempt.totalQuestions,
          0,
        );
        const correct = subjectAttempts.reduce(
          (sum, attempt) => sum + attempt.correctCount,
          0,
        );
        const recentAttempts = subjectAttempts.filter((attempt) =>
          isDateInsideRange(attempt.createdAt, {
            start: recentStart,
            end: todayKey,
          }),
        );
        const previousAttempts = subjectAttempts.filter((attempt) =>
          isDateInsideRange(attempt.createdAt, {
            start: previousStart,
            end: previousEnd,
          }),
        );

        function periodAccuracy(rows: DashboardAttempt[]) {
          const periodQuestions = rows.reduce(
            (sum, attempt) => sum + attempt.totalQuestions,
            0,
          );
          const periodCorrect = rows.reduce(
            (sum, attempt) => sum + attempt.correctCount,
            0,
          );

          return periodQuestions > 0
            ? Math.round(
                (periodCorrect / periodQuestions) * 100,
              )
            : null;
        }

        const recentAccuracy = periodAccuracy(recentAttempts);
        const previousAccuracy = periodAccuracy(previousAttempts);
        const accuracy =
          questions > 0
            ? Math.round((correct / questions) * 100)
            : 0;
        const trend =
          recentAccuracy !== null && previousAccuracy !== null
            ? recentAccuracy - previousAccuracy
            : null;
        const weakestAttempt = [...subjectAttempts]
          .sort(
            (first, second) =>
              accuracyOf(first) - accuracyOf(second),
          )[0];

        return {
          subject,
          attempts: subjectAttempts.length,
          questions,
          accuracy,
          trend,
          weakestAttempt,
        };
      },
    );
  }, [analyticsAttempts]);

  const analyticsOverall = useMemo(() => {
    const questions = analyticsAttempts.reduce(
      (sum, attempt) => sum + attempt.totalQuestions,
      0,
    );
    const correct = analyticsAttempts.reduce(
      (sum, attempt) => sum + attempt.correctCount,
      0,
    );

    return {
      attempts: analyticsAttempts.length,
      questions,
      accuracy:
        questions > 0
          ? Math.round((correct / questions) * 100)
          : 0,
    };
  }, [analyticsAttempts]);

  const weakRecentAttempts = useMemo(
    () =>
      [...analyticsAttempts]
        .filter((attempt) => accuracyOf(attempt) < 70)
        .sort(
          (first, second) =>
            accuracyOf(first) - accuracyOf(second),
        )
        .slice(0, 6),
    [analyticsAttempts],
  );

  const weakestSubject = useMemo(
    () =>
      analyticsSubjectSummaries
        .filter((summary) => summary.questions > 0)
        .sort(
          (first, second) =>
            first.accuracy - second.accuracy,
        )[0] || null,
    [analyticsSubjectSummaries],
  );

  const strongestSubject = useMemo(
    () =>
      analyticsSubjectSummaries
        .filter((summary) => summary.questions > 0)
        .sort(
          (first, second) =>
            second.accuracy - first.accuracy,
        )[0] || null,
    [analyticsSubjectSummaries],
  );

  const novaAnalyticsSummary = useMemo(() => {
    if (analyticsAttempts.length === 0) {
      return "There is not enough recorded work yet for a reliable learning summary.";
    }

    if (!weakestSubject) {
      return "Nova found recent quiz activity, but there are not enough scored questions to identify a clear priority.";
    }

    const weakestMeta = SUBJECT_META[weakestSubject.subject];
    const strongestMeta = strongestSubject
      ? SUBJECT_META[strongestSubject.subject]
      : null;

    if (weakestSubject.accuracy < 70) {
      return `${weakestMeta.label} needs the most immediate attention at ${weakestSubject.accuracy}% accuracy. ${
        strongestMeta && strongestSubject?.subject !== weakestSubject.subject
          ? `${strongestMeta.label} is currently the strongest subject at ${strongestSubject?.accuracy}%.`
          : "Start with the lowest-scoring topics below."
      }`;
    }

    if (weakestSubject.accuracy < 85) {
      return `${weakestMeta.label} is developing but remains the main area to strengthen at ${weakestSubject.accuracy}% accuracy. Focused revision should help turn partial understanding into consistent mastery.`;
    }

    return `Performance is currently secure across the recorded subjects. ${weakestMeta.label} is still the best place for targeted improvement because it has the lowest recent accuracy at ${weakestSubject.accuracy}%.`;
  }, [
    analyticsAttempts.length,
    weakestSubject,
    strongestSubject,
  ]);

  const weeklyQuestionCount = thisWeekAttempts.reduce(
    (sum, attempt) => sum + attempt.totalQuestions,
    0,
  );
  const weeklyCorrectCount = thisWeekAttempts.reduce(
    (sum, attempt) => sum + attempt.correctCount,
    0,
  );
  const weeklyWrongCount = Math.max(0, weeklyQuestionCount - weeklyCorrectCount);
  const weeklyAccuracy =
    weeklyQuestionCount > 0 ? Math.round((weeklyCorrectCount / weeklyQuestionCount) * 100) : 0;

  const previousQuestionCount = previousWeekAttempts.reduce(
    (sum, attempt) => sum + attempt.totalQuestions,
    0,
  );
  const previousCorrectCount = previousWeekAttempts.reduce(
    (sum, attempt) => sum + attempt.correctCount,
    0,
  );
  const previousAccuracy =
    previousQuestionCount > 0
      ? Math.round((previousCorrectCount / previousQuestionCount) * 100)
      : 0;

  const subjectSummaries = useMemo(() => {
    return (Object.keys(SUBJECT_META) as SubjectKey[]).map((subject) => {
      const subjectAttempts = thisWeekAttempts.filter((attempt) => attempt.subject === subject);
      const questions = subjectAttempts.reduce((sum, attempt) => sum + attempt.totalQuestions, 0);
      const correct = subjectAttempts.reduce((sum, attempt) => sum + attempt.correctCount, 0);

      return {
        subject,
        attempts: subjectAttempts.length,
        questions,
        accuracy: questions > 0 ? Math.round((correct / questions) * 100) : 0,
      };
    });
  }, [thisWeekAttempts]);

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

  const filteredAttempts = useMemo(() => {
    const range = getDateRange(dateFilter);

    return attempts.filter((attempt) => {
      if (!isDateInsideRange(attempt.createdAt, range)) return false;
      if (subjectFilter !== "all" && attempt.subject !== subjectFilter) return false;

      const accuracy = accuracyOf(attempt);
      if (accuracyFilter === "with_mistakes" && accuracy >= 100) return false;
      if (accuracyFilter === "perfect" && accuracy < 100) return false;

      return true;
    });
  }, [attempts, dateFilter, subjectFilter, accuracyFilter]);

  const visibleAnswers = wrongOnly
    ? detailAnswers.filter((answer) => !answer.is_correct)
    : detailAnswers;

  const selectedStudent = students.find((student) => student.id === selectedStudentId);
  const isTeachingViewer = hasTeacherDashboardRole(viewerRole);
  const dashboardAudienceLabel =
    viewerRole === "curriculum-lead"
      ? "Curriculum Lead"
      : viewerRole === "teacher"
        ? "Teacher Dashboard"
        : "Parents & Teachers";

  return (
    <main className="dashboard-page">
      <div className="background-grid" aria-hidden="true" />

      <DashboardTopControls />

      <section className="dashboard-shell">
        <div className="dashboard-context-row">
          {students.length > 1 && (
            <label className="student-picker">
              <span>Student</span>
              <select
                value={selectedStudentId ?? ""}
                onChange={(event) => setSelectedStudentId(event.target.value)}
              >
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.label}
                    {student.relationship !== "self"
                      ? ` · ${student.relationship}`
                      : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="viewer-pill">
            <span>Viewing</span>
            <strong>{selectedStudent?.label || "My learning"}</strong>
          </div>
        </div>
        <header className="hero">
          <div>
            <p className="eyebrow">{dashboardAudienceLabel}</p>
            <h1>Teaching Dashboard</h1>
            <p className="hero-copy">
              {isTeachingViewer
                ? "Review assigned student activity, subject performance, and every recorded answer."
                : "Review weekly quiz activity, subject performance, and every recorded answer."}
            </p>
          </div>

          <div className="hero-insights">
            <button
              type="button"
              className="analytics-tab"
              onClick={() => void openAnalytics()}
            >
              <span>Results Analytics</span>
              <strong>Nova’s quick summary</strong>
              <small>Weaknesses, trends and next steps →</small>
            </button>

            <div className="week-comparison">
              <span>This week</span>
              <strong>{thisWeekAttempts.length} quizzes</strong>
              <small>
                {thisWeekAttempts.length - previousWeekAttempts.length >= 0 ? "+" : ""}
                {thisWeekAttempts.length - previousWeekAttempts.length} compared with last week
              </small>
            </div>
          </div>
        </header>

        {isLoading && <div className="notice-card">Loading learning records…</div>}

        {!isLoading && !viewerId && (
          <div className="notice-card">
            <p>{loadMessage || "Log in to view the dashboard."}</p>
            <Link href="/login" className="primary-link">
              Log in
            </Link>
          </div>
        )}

        {!isLoading && viewerId && (
          <>
            {loadMessage && <div className="warning-card">{loadMessage}</div>}

            <section className="summary-grid">
              <SummaryCard
                label="Quizzes this week"
                value={String(thisWeekAttempts.length)}
                supporting={`${previousWeekAttempts.length} last week`}
                icon="▤"
              />
              <SummaryCard
                label="Questions attempted"
                value={String(weeklyQuestionCount)}
                supporting={`${weeklyCorrectCount} answered correctly`}
                icon="?"
              />
              <SummaryCard
                label="Overall accuracy"
                value={`${weeklyAccuracy}%`}
                supporting={`${weeklyAccuracy - previousAccuracy >= 0 ? "+" : ""}${
                  weeklyAccuracy - previousAccuracy
                } points vs last week`}
                icon="◎"
              />
              <SummaryCard
                label="Incorrect answers"
                value={String(weeklyWrongCount)}
                supporting="Review these in the answer records"
                icon="!"
              />
            </section>

            <section className="overview-grid">
              <article className="panel weekly-chart-panel">
                <div className="panel-heading monthly-panel-heading">
                  <div>
                    <p className="section-label">Monthly activity</p>
                    <h2>Compare each learning week</h2>
                    <p className="monthly-description">
                      Learning Month 1 begins on the date of the student’s first recorded quiz.
                    </p>
                  </div>

                  <span className="panel-total">
                    {selectedLearningMonth?.label || "Learning Month 1"}
                  </span>
                </div>

                <div className="month-slider-controls">
                  <button
                    type="button"
                    aria-label="Previous learning month"
                    disabled={selectedLearningMonthIndex <= 0}
                    onClick={() =>
                      setSelectedLearningMonthIndex((current) =>
                        Math.max(0, current - 1),
                      )
                    }
                  >
                    ‹
                  </button>

                  <div className="month-slider-copy">
                    <strong>
                      {selectedLearningMonth
                        ? `${formatDateKeyShort(
                            selectedLearningMonth.start,
                          )} – ${formatDateKeyShort(
                            selectedLearningMonth.end,
                          )}`
                        : "No recorded month"}
                    </strong>

                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, learningMonths.length - 1)}
                      value={Math.min(
                        selectedLearningMonthIndex,
                        Math.max(0, learningMonths.length - 1),
                      )}
                      onChange={(event) =>
                        setSelectedLearningMonthIndex(
                          Number(event.target.value),
                        )
                      }
                      aria-label="Select learning month"
                    />
                  </div>

                  <button
                    type="button"
                    aria-label="Next learning month"
                    disabled={
                      selectedLearningMonthIndex >=
                      learningMonths.length - 1
                    }
                    onClick={() =>
                      setSelectedLearningMonthIndex((current) =>
                        Math.min(
                          learningMonths.length - 1,
                          current + 1,
                        ),
                      )
                    }
                  >
                    ›
                  </button>
                </div>

                <div
                  className="weekly-chart monthly-week-chart"
                  aria-label="Four-week learning month comparison"
                >
                  {learningMonthWeeks.map((week) => (
                    <div className="chart-day" key={week.start}>
                      <div className="chart-value">
                        {week.attempts} quiz{week.attempts === 1 ? "" : "zes"}
                      </div>

                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            height: `${Math.max(
                              5,
                              (week.attempts /
                                maxLearningWeekAttempts) *
                                100,
                            )}%`,
                          }}
                        />
                      </div>

                      <span>{week.label}</span>
                      <small>
                        {week.questions > 0
                          ? `${week.accuracy}% · ${week.questions} questions`
                          : "No activity"}
                      </small>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel subject-panel">
                <div className="panel-heading">
                  <div>
                    <p className="section-label">Subject breakdown</p>
                    <h2>This week by subject</h2>
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
                        <span className="subject-copy">
                          <strong>{meta.label}</strong>
                          <small>
                            {summary.attempts} quizzes · {summary.questions} questions
                          </small>
                        </span>
                        <strong style={{ color: meta.accent }}>{summary.accuracy}%</strong>
                      </button>
                    );
                  })}
                </div>
              </article>
            </section>

            <section className="panel attempt-panel">
              <div className="attempt-heading">
                <div>
                  <p className="section-label">Recorded attempts</p>
                  <h2>Quiz history</h2>
                  <p>
                    Every retake is kept separately. Open a record to review the student's answers.
                  </p>
                </div>

                <div className="filter-grid">
                  <label>
                    <span>Date</span>
                    <select
                      value={dateFilter}
                      onChange={(event) => setDateFilter(event.target.value as DateFilter)}
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
                        setSubjectFilter(event.target.value as SubjectKey | "all")
                      }
                    >
                      <option value="all">All subjects</option>
                      {(Object.keys(SUBJECT_META) as SubjectKey[]).map((subject) => (
                        <option key={subject} value={subject}>
                          {SUBJECT_META[subject].label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Results</span>
                    <select
                      value={accuracyFilter}
                      onChange={(event) =>
                        setAccuracyFilter(event.target.value as AccuracyFilter)
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
                <div className="empty-state">No quiz attempts match these filters.</div>
              ) : (
                <div className="attempt-table-wrap">
                  {!isMobile && (
                    <div className="attempt-table-header">
                      <span>Quiz</span>
                      <span>Subject</span>
                      <span>Date</span>
                      <span>Score</span>
                      <span>Accuracy</span>
                      <span>Duration</span>
                      <span />
                    </div>
                  )}

                  <div className="attempt-list">
                    {filteredAttempts.map((attempt) => {
                      const meta = SUBJECT_META[attempt.subject];
                      const accuracy = accuracyOf(attempt);

                      return (
                        <button
                          type="button"
                          className={`attempt-row ${
                            accuracy < 70
                              ? "low-attempt"
                              : accuracy === 100
                                ? "perfect-attempt"
                                : "neutral-attempt"
                          }`}
                          key={`${attempt.source}-${attempt.id}`}
                          onClick={() => void openAttempt(attempt)}
                        >
                          <span className="attempt-title-cell">
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
                            <span>
                              <strong>{attempt.title}</strong>
                              <small>{attempt.subtitle}</small>
                            </span>
                          </span>

                          <span className="desktop-cell subject-badge">{meta.label}</span>
                          <span className="desktop-cell">{formatDateTime(attempt.createdAt)}</span>
                          <span className="desktop-cell">
                            {attempt.correctCount}/{attempt.totalQuestions}
                          </span>
                          <span
                            className={`desktop-cell accuracy-badge ${
                              accuracy === 100
                                ? "perfect"
                                : accuracy < 70
                                  ? "needs-work"
                                  : "neutral"
                            }`}
                          >
                            {accuracy}%
                          </span>
                          <span className="desktop-cell">{formatDuration(attempt.durationSeconds)}</span>
                          <span className="view-link">View answers →</span>

                          {isMobile && (
                            <span className="mobile-attempt-meta">
                              <span>{meta.label}</span>
                              <span>{formatDateTime(attempt.createdAt)}</span>
                              <span>
                                {attempt.correctCount}/{attempt.totalQuestions} · {accuracy}%
                              </span>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </section>

      <NovaVirtualTeacherPopup
        open={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        viewerUserId={viewerId}
        studentUserId={selectedStudentId}
        studentLabel={selectedStudent?.label || "Student"}
        clientSummary={novaAnalyticsSummary}
        clientOverall={analyticsOverall}
        clientSubjects={analyticsSubjectSummaries}
        clientSkills={analyticsSkillRows}
        clientAnalyticsLoading={analyticsLoading}
        clientAnalyticsMessage={analyticsMessage}
        clientAnswerCount={analyticsAnswerCount}
      />

      {selectedAttempt && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelectedAttempt(null)}>
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
                  {SUBJECT_META[selectedAttempt.subject].label} · {formatDateTime(selectedAttempt.createdAt)}
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
              <MiniMetric label="Score" value={`${selectedAttempt.correctCount}/${selectedAttempt.totalQuestions}`} />
              <MiniMetric label="Accuracy" value={`${accuracyOf(selectedAttempt)}%`} />
              <MiniMetric label="Duration" value={formatDuration(selectedAttempt.durationSeconds)} />
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
                  {wrongOnly ? "There are no wrong answers in this attempt." : "No answer records found."}
                </div>
              ) : isMobile ? (
                <div className="mobile-answer-list">
                  {visibleAnswers.map((answer) => (
                    <article
                      key={answer.id}
                      className={`mobile-answer-card ${answer.is_correct ? "correct" : "wrong"}`}
                    >
                      <div className="mobile-answer-heading">
                        <strong>Question {answer.question_order}</strong>
                        <span>{answer.is_correct ? "Correct" : "Incorrect"}</span>
                      </div>

                      <AnswerSection label="Question">
                        <p>{answer.question_text}</p>
                        {answer.question_image && (
                          <img src={answer.question_image} alt="Question illustration" />
                        )}
                      </AnswerSection>

                      <AnswerSection label="Student's answer">
                        <p>{answerDisplay(answer.student_answer_label, answer.student_answer_text)}</p>
                      </AnswerSection>

                      <AnswerSection label="Correct answer">
                        <p>{answerDisplay(answer.correct_answer_label, answer.correct_answer_text)}</p>
                      </AnswerSection>

                      <AnswerSection label="Explanation">
                        <p>{answer.explanation || "No explanation was saved."}</p>
                      </AnswerSection>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="answer-table">
                  <div className="answer-table-header">
                    <span>Question</span>
                    <span>Student's answer</span>
                    <span>Correct answer</span>
                    <span>Explanation</span>
                  </div>

                  {visibleAnswers.map((answer) => (
                    <div
                      key={answer.id}
                      className={`answer-table-row ${answer.is_correct ? "correct" : "wrong"}`}
                    >
                      <div>
                        <span className="question-number">Question {answer.question_order}</span>
                        <p>{answer.question_text}</p>
                        {answer.skill && <small>{answer.skill}</small>}
                        {answer.question_image && (
                          <img src={answer.question_image} alt="Question illustration" />
                        )}
                      </div>
                      <div>
                        <span className="cell-label">Student's answer</span>
                        <p>{answerDisplay(answer.student_answer_label, answer.student_answer_text)}</p>
                      </div>
                      <div>
                        <span className="cell-label">Correct answer</span>
                        <p>{answerDisplay(answer.correct_answer_label, answer.correct_answer_text)}</p>
                      </div>
                      <div>
                        <span className="cell-label">Explanation</span>
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
        :global(*) {
          box-sizing: border-box;
        }

        :global(html) {
          background: #030812;
        }

        :global(body) {
          margin: 0;
          background: #030812;
        }

        :global(button),
        :global(select),
        :global(input) {
          font: inherit;
        }

        .dashboard-page {
          position: relative;
          min-height: 100dvh;
          overflow-x: hidden;
          color: white;
          background:
            radial-gradient(circle at 50% 0%, rgba(83, 215, 255, 0.16), transparent 32%),
            linear-gradient(180deg, #071326 0%, #030812 62%, #02050b 100%);
          font-family: Arial, Helvetica, sans-serif;
        }

        .background-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.1;
          background-image:
            linear-gradient(rgba(126, 232, 255, 0.18) 1px, transparent 1px),
            linear-gradient(90deg, rgba(126, 232, 255, 0.18) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.8), transparent 85%);
        }

        .dashboard-context-row {
          min-height: 46px;
          margin-bottom: 28px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
        }

        .viewer-pill,
        .student-picker {
          min-height: 42px;
          border-radius: 999px;
          border: 1px solid rgba(126, 232, 255, 0.25);
          background: rgba(12, 31, 57, 0.72);
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.24);
          backdrop-filter: blur(16px);
        }

        .viewer-pill {
          padding: 7px 15px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .viewer-pill span,
        .student-picker span {
          color: rgba(235, 247, 255, 0.5);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .viewer-pill strong {
          color: #8dfcff;
          font-size: 13px;
        }

        .student-picker {
          padding: 6px 12px 6px 15px;
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .student-picker select,
        .filter-grid select {
          border: 0;
          outline: none;
          color: white;
          background: transparent;
          cursor: pointer;
        }

        .student-picker option,
        .filter-grid option {
          color: #071326;
        }

        .dashboard-shell {
          position: relative;
          z-index: 2;
          width: min(1440px, calc(100% - 40px));
          margin: 0 auto;
          padding: 100px 0 70px;
        }

        .hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: end;
          gap: 28px;
        }

        .eyebrow,
        .section-label {
          margin: 0;
          color: #8dfcff;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .hero h1 {
          margin: 10px 0 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(48px, 7vw, 82px);
          font-weight: 400;
          line-height: 0.96;
          letter-spacing: -0.055em;
        }

        .hero-copy {
          max-width: 760px;
          margin: 17px 0 0;
          color: rgba(235, 247, 255, 0.72);
          font-size: clamp(16px, 2vw, 20px);
          line-height: 1.55;
        }

        .hero-insights {
          display: grid;
          grid-template-columns: minmax(220px, 1fr) minmax(220px, 1fr);
          gap: 12px;
        }

        .analytics-tab,
        .week-comparison {
          min-width: 220px;
          padding: 20px 22px;
          border-radius: 22px;
          border: 1px solid rgba(126, 232, 255, 0.2);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
        }

        .analytics-tab {
          background:
            linear-gradient(145deg, rgba(71, 35, 112, 0.78), rgba(19, 13, 55, 0.9));
          color: white;
          text-align: left;
          cursor: pointer;
        }

        .analytics-tab:hover {
          border-color: rgba(216, 180, 254, 0.48);
          box-shadow:
            0 24px 60px rgba(0, 0, 0, 0.3),
            0 0 28px rgba(192, 132, 252, 0.16);
        }

        .analytics-tab span,
        .analytics-tab strong,
        .analytics-tab small {
          display: block;
        }

        .analytics-tab span {
          color: #e9d5ff;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .analytics-tab strong {
          margin-top: 8px;
          font-size: 19px;
        }

        .analytics-tab small {
          margin-top: 6px;
          color: rgba(245, 235, 255, 0.58);
          line-height: 1.4;
        }

        .week-comparison {
          background: rgba(6, 22, 47, 0.74);
        }

        .week-comparison span,
        .week-comparison small {
          display: block;
        }

        .week-comparison span {
          color: #8dfcff;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .week-comparison strong {
          display: block;
          margin-top: 8px;
          font-size: 27px;
        }

        .week-comparison small {
          margin-top: 6px;
          color: rgba(235, 247, 255, 0.55);
          line-height: 1.4;
        }

        .summary-grid {
          margin-top: 30px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .overview-grid {
          margin-top: 18px;
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.75fr);
          gap: 18px;
        }

        .panel,
        .notice-card,
        .warning-card {
          border: 1px solid rgba(126, 232, 255, 0.16);
          background:
            linear-gradient(145deg, rgba(8, 27, 55, 0.8), rgba(4, 14, 32, 0.9));
          box-shadow: 0 28px 76px rgba(0, 0, 0, 0.28);
          backdrop-filter: blur(18px);
        }

        .panel {
          border-radius: 26px;
          padding: 24px;
        }

        .notice-card,
        .warning-card {
          width: min(720px, 100%);
          margin: 34px auto 0;
          padding: 26px;
          border-radius: 22px;
          text-align: center;
          color: rgba(240, 249, 255, 0.76);
        }

        .warning-card {
          width: 100%;
          border-color: rgba(255, 211, 110, 0.26);
          background: rgba(104, 77, 16, 0.22);
          color: #ffe5a0;
        }

        .primary-link {
          width: fit-content;
          min-height: 46px;
          margin: 18px auto 0;
          padding: 0 20px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #35c5ff, #4c6dff);
          color: white;
          text-decoration: none;
          font-weight: 850;
        }

        .panel-heading,
        .attempt-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }

        .panel-heading h2,
        .attempt-heading h2 {
          margin: 7px 0 0;
          font-size: 26px;
          letter-spacing: -0.035em;
        }

        .panel-total {
          padding: 7px 11px;
          border-radius: 999px;
          background: rgba(126, 232, 255, 0.08);
          color: #8dfcff;
          font-size: 11px;
          font-weight: 850;
        }

        .monthly-description {
          max-width: 620px;
          margin: 8px 0 0;
          color: rgba(235, 247, 255, 0.5);
          font-size: 12px;
          line-height: 1.5;
        }

        .month-slider-controls {
          margin-top: 20px;
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr) 42px;
          align-items: center;
          gap: 12px;
        }

        .month-slider-controls > button {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          border: 1px solid rgba(126, 232, 255, 0.18);
          background: rgba(255, 255, 255, 0.04);
          color: white;
          cursor: pointer;
          font-size: 24px;
        }

        .month-slider-controls > button:disabled {
          opacity: 0.28;
          cursor: not-allowed;
        }

        .month-slider-copy {
          display: grid;
          gap: 9px;
          text-align: center;
        }

        .month-slider-copy strong {
          color: rgba(245, 251, 255, 0.82);
          font-size: 12px;
        }

        .month-slider-copy input {
          width: 100%;
          accent-color: #53d7ff;
          cursor: pointer;
        }

        .weekly-chart {
          height: 250px;
          margin-top: 28px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          align-items: end;
          gap: 12px;
        }

        .chart-day {
          height: 100%;
          display: grid;
          grid-template-rows: 28px 1fr 20px 30px;
          align-items: end;
          text-align: center;
          color: rgba(235, 247, 255, 0.56);
          font-size: 11px;
          font-weight: 750;
        }

        .chart-day small {
          align-self: start;
          color: rgba(235, 247, 255, 0.38);
          font-size: 9px;
          line-height: 1.35;
        }

        .chart-value {
          color: white;
          font-size: 12px;
        }

        .bar-track {
          width: min(44px, 68%);
          height: 100%;
          margin: 0 auto;
          display: flex;
          align-items: flex-end;
          overflow: hidden;
          border-radius: 12px 12px 5px 5px;
          background: rgba(255, 255, 255, 0.045);
        }

        .bar-fill {
          width: 100%;
          min-height: 5px;
          border-radius: 12px 12px 5px 5px;
          background: linear-gradient(180deg, #8dfcff, #4c6dff);
          box-shadow: 0 0 18px rgba(83, 215, 255, 0.25);
        }

        .subject-list {
          margin-top: 20px;
          display: grid;
          gap: 9px;
        }

        .subject-row {
          width: 100%;
          min-height: 66px;
          padding: 10px 12px;
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr) auto;
          align-items: center;
          gap: 11px;
          border-radius: 15px;
          border: 1px solid rgba(126, 232, 255, 0.1);
          background: rgba(255, 255, 255, 0.03);
          color: white;
          text-align: left;
          cursor: pointer;
        }

        .subject-row:hover {
          background: rgba(255, 255, 255, 0.055);
        }

        .subject-icon,
        .attempt-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          border-style: solid;
          border-width: 1px;
        }

        .subject-icon {
          width: 42px;
          height: 42px;
          border-radius: 13px;
          font-size: 19px;
        }

        .subject-copy {
          min-width: 0;
          display: grid;
          gap: 5px;
        }

        .subject-copy strong {
          font-size: 13px;
        }

        .subject-copy small {
          color: rgba(235, 247, 255, 0.48);
          font-size: 11px;
        }

        .attempt-panel {
          margin-top: 18px;
        }

        .attempt-heading > div:first-child > p:last-child {
          max-width: 600px;
          margin: 9px 0 0;
          color: rgba(235, 247, 255, 0.58);
          font-size: 13px;
          line-height: 1.5;
        }

        .filter-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(140px, 1fr));
          gap: 9px;
        }

        .filter-grid label {
          min-height: 58px;
          padding: 8px 12px;
          display: grid;
          gap: 4px;
          border-radius: 14px;
          border: 1px solid rgba(126, 232, 255, 0.14);
          background: rgba(255, 255, 255, 0.035);
        }

        .filter-grid label > span {
          color: rgba(235, 247, 255, 0.46);
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .attempt-table-wrap {
          margin-top: 22px;
        }

        .attempt-table-header,
        .attempt-row {
          display: grid;
          grid-template-columns: minmax(260px, 1.8fr) minmax(120px, 0.8fr) minmax(145px, 0.9fr) 78px 82px 74px 108px;
          gap: 10px;
          align-items: center;
        }

        .attempt-table-header {
          padding: 0 14px 10px;
          color: rgba(235, 247, 255, 0.42);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .attempt-list {
          display: grid;
          gap: 8px;
        }

        .attempt-row {
          width: 100%;
          min-height: 76px;
          padding: 11px 14px;
          border-radius: 16px;
          border: 1px solid rgba(126, 232, 255, 0.11);
          background: rgba(255, 255, 255, 0.027);
          color: white;
          text-align: left;
          cursor: pointer;
        }

        .attempt-row:hover {
          border-color: rgba(126, 232, 255, 0.28);
          background: rgba(126, 232, 255, 0.055);
        }

        .attempt-row.low-attempt {
          border-color: rgba(255, 78, 96, 0.5);
          background:
            linear-gradient(90deg, rgba(255, 44, 67, 0.17), rgba(255, 44, 67, 0.07));
          box-shadow: inset 4px 0 0 #ff4e60;
        }

        .attempt-row.low-attempt:hover {
          border-color: rgba(255, 94, 110, 0.78);
          background:
            linear-gradient(90deg, rgba(255, 44, 67, 0.24), rgba(255, 44, 67, 0.1));
        }

        .attempt-row.neutral-attempt {
          border-color: rgba(126, 232, 255, 0.11);
          background: rgba(255, 255, 255, 0.027);
          box-shadow: none;
        }

        .attempt-row.perfect-attempt {
          border-color: rgba(93, 255, 181, 0.28);
          background:
            linear-gradient(90deg, rgba(36, 145, 102, 0.16), rgba(36, 145, 102, 0.055));
          box-shadow: inset 4px 0 0 rgba(93, 255, 181, 0.72);
        }

        .attempt-row.perfect-attempt:hover {
          border-color: rgba(93, 255, 181, 0.48);
          background:
            linear-gradient(90deg, rgba(36, 145, 102, 0.22), rgba(36, 145, 102, 0.08));
        }

        .attempt-title-cell {
          min-width: 0;
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr);
          align-items: center;
          gap: 11px;
        }

        .attempt-icon {
          width: 42px;
          height: 42px;
          border-radius: 13px;
          font-size: 18px;
        }

        .attempt-title-cell > span:last-child {
          min-width: 0;
          display: grid;
          gap: 5px;
        }

        .attempt-title-cell strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .attempt-title-cell small {
          overflow: hidden;
          color: rgba(235, 247, 255, 0.46);
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 10px;
        }

        .desktop-cell,
        .view-link {
          font-size: 12px;
        }

        .subject-badge,
        .accuracy-badge {
          width: fit-content;
          padding: 6px 9px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.05);
        }

        .accuracy-badge {
          color: #ffe4a0;
        }

        .accuracy-badge.perfect {
          color: #9fffd2;
          background: rgba(93, 255, 181, 0.08);
        }

        .accuracy-badge.needs-work {
          color: #ffd6dc;
          border: 1px solid rgba(255, 78, 96, 0.5);
          background: rgba(255, 44, 67, 0.2);
        }

        .accuracy-badge.neutral {
          color: rgba(245, 251, 255, 0.76);
          border: 1px solid rgba(126, 232, 255, 0.14);
          background: rgba(126, 232, 255, 0.055);
        }

        .view-link {
          color: #8dfcff;
          font-weight: 850;
          text-align: right;
        }

        .mobile-attempt-meta {
          display: none;
        }

        .empty-state,
        .detail-message {
          margin-top: 20px;
          padding: 25px;
          border-radius: 17px;
          border: 1px solid rgba(126, 232, 255, 0.1);
          background: rgba(255, 255, 255, 0.025);
          color: rgba(235, 247, 255, 0.58);
          text-align: center;
        }

        .analytics-modal {
          width: min(1320px, 96vw);
          max-height: 92dvh;
          overflow: hidden;
          border-radius: 30px;
          border: 1px solid rgba(216, 180, 254, 0.32);
          background:
            linear-gradient(145deg, rgba(14, 20, 48, 0.99), rgba(4, 9, 23, 0.995));
          box-shadow:
            0 40px 110px rgba(0, 0, 0, 0.68),
            0 0 44px rgba(192, 132, 252, 0.14);
        }

        .analytics-modal-header {
          padding: 22px 24px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          border-bottom: 1px solid rgba(216, 180, 254, 0.14);
          background:
            radial-gradient(circle at 12% 0%, rgba(192, 132, 252, 0.14), transparent 38%);
        }

        .analytics-title-block {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .analytics-nova {
          width: 92px;
          height: 92px;
          object-fit: contain;
          filter: drop-shadow(0 16px 28px rgba(0, 0, 0, 0.4));
        }

        .analytics-modal-header h2 {
          margin: 7px 0 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(32px, 4vw, 48px);
          font-weight: 500;
          letter-spacing: -0.045em;
        }

        .analytics-modal-header p:last-child {
          margin: 8px 0 0;
          color: rgba(245, 239, 255, 0.56);
          line-height: 1.5;
        }

        .analytics-scroll {
          max-height: calc(92dvh - 138px);
          overflow-y: auto;
          padding: 20px;
        }

        .nova-summary-card {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 20px;
          align-items: center;
          border-radius: 22px;
          border: 1px solid rgba(216, 180, 254, 0.2);
          background:
            linear-gradient(145deg, rgba(94, 48, 145, 0.22), rgba(25, 18, 61, 0.42));
          padding: 20px;
        }

        .nova-summary-card h3 {
          margin: 9px 0 0;
          max-width: 850px;
          font-size: 23px;
          line-height: 1.45;
          letter-spacing: -0.02em;
        }

        .analytics-coverage {
          min-width: 170px;
          display: grid;
          grid-template-columns: auto auto;
          align-items: baseline;
          gap: 6px 10px;
          padding: 14px;
          border-radius: 16px;
          background: rgba(0, 0, 0, 0.2);
        }

        .analytics-coverage strong {
          color: #e9d5ff;
          font-size: 22px;
        }

        .analytics-coverage span {
          color: rgba(245, 239, 255, 0.48);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .analytics-metric-grid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .analytics-section {
          margin-top: 14px;
          border-radius: 22px;
          border: 1px solid rgba(216, 180, 254, 0.12);
          background: rgba(255, 255, 255, 0.026);
          padding: 20px;
        }

        .analytics-section-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .analytics-section-heading h3 {
          margin: 7px 0 0;
          font-size: 24px;
          letter-spacing: -0.03em;
        }

        .analytics-section-heading > span {
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(216, 180, 254, 0.14);
          background: rgba(192, 132, 252, 0.07);
          color: rgba(245, 239, 255, 0.58);
          font-size: 10px;
          font-weight: 800;
        }

        .analytics-subject-grid {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .analytics-subject-card {
          min-height: 230px;
          border-radius: 18px;
          border: 1px solid rgba(126, 232, 255, 0.11);
          background: rgba(255, 255, 255, 0.026);
          padding: 15px;
        }

        .analytics-subject-card.low {
          border-color: rgba(255, 78, 96, 0.38);
          background: rgba(255, 44, 67, 0.08);
        }

        .analytics-subject-card.perfect {
          border-color: rgba(93, 255, 181, 0.3);
          background: rgba(36, 145, 102, 0.08);
        }

        .analytics-subject-card.no-data {
          opacity: 0.55;
        }

        .analytics-subject-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .analytics-status {
          color: rgba(245, 251, 255, 0.5);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .analytics-subject-card h4 {
          margin: 15px 0 0;
          font-size: 17px;
        }

        .analytics-subject-accuracy {
          display: block;
          margin-top: 6px;
          font-size: 32px;
          letter-spacing: -0.04em;
        }

        .analytics-subject-card > p,
        .analytics-subject-card > small {
          display: block;
          margin: 7px 0 0;
          color: rgba(245, 251, 255, 0.48);
          font-size: 10px;
          line-height: 1.45;
        }

        .analytics-focus-quiz {
          margin-top: 13px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .analytics-focus-quiz span,
        .analytics-focus-quiz strong {
          display: block;
        }

        .analytics-focus-quiz span {
          color: rgba(245, 251, 255, 0.4);
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .analytics-focus-quiz strong {
          margin-top: 5px;
          font-size: 11px;
          line-height: 1.4;
        }

        .weakness-list {
          margin-top: 16px;
          display: grid;
          gap: 8px;
        }

        .weakness-row {
          min-height: 62px;
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr) auto;
          align-items: center;
          gap: 11px;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.025);
          padding: 10px 12px;
        }

        .weakness-rank {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          border: 1px solid rgba(216, 180, 254, 0.18);
          background: rgba(192, 132, 252, 0.08);
          color: #e9d5ff;
          font-weight: 900;
        }

        .weakness-copy {
          min-width: 0;
        }

        .weakness-copy strong,
        .weakness-copy small {
          display: block;
        }

        .weakness-copy strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .weakness-copy small {
          margin-top: 4px;
          color: rgba(245, 251, 255, 0.43);
          font-size: 10px;
        }

        .weakness-score {
          min-width: 52px;
          padding: 7px 9px;
          border-radius: 999px;
          text-align: center;
          font-size: 11px;
        }

        .weakness-score.low {
          border: 1px solid rgba(255, 78, 96, 0.4);
          background: rgba(255, 44, 67, 0.13);
          color: #ffd6dc;
        }

        .weakness-score.neutral {
          border: 1px solid rgba(126, 232, 255, 0.14);
          background: rgba(126, 232, 255, 0.05);
          color: rgba(245, 251, 255, 0.75);
        }

        .analytics-loading,
        .analytics-message {
          margin-top: 16px;
          border-radius: 15px;
          border: 1px solid rgba(216, 180, 254, 0.12);
          background: rgba(192, 132, 252, 0.05);
          padding: 16px;
          color: rgba(245, 239, 255, 0.58);
          font-size: 12px;
          line-height: 1.55;
          text-align: center;
        }

        .recommendation-grid {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .recommendation-grid article {
          min-height: 140px;
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr);
          gap: 11px;
          border-radius: 17px;
          border: 1px solid rgba(126, 232, 255, 0.1);
          background: rgba(255, 255, 255, 0.025);
          padding: 14px;
        }

        .recommendation-grid article > span {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          border: 1px solid rgba(126, 232, 255, 0.2);
          background: rgba(126, 232, 255, 0.07);
          color: #8dfcff;
          font-weight: 900;
        }

        .recommendation-grid strong {
          font-size: 13px;
        }

        .recommendation-grid p {
          margin: 7px 0 0;
          color: rgba(245, 251, 255, 0.5);
          font-size: 11px;
          line-height: 1.55;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 4, 12, 0.78);
          backdrop-filter: blur(9px);
        }

        .attempt-modal {
          width: min(1480px, 96vw);
          max-height: 92dvh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: 28px;
          border: 1px solid rgba(126, 232, 255, 0.3);
          background: linear-gradient(145deg, #07182e, #030916);
          box-shadow: 0 40px 100px rgba(0, 0, 0, 0.62);
        }

        .modal-header {
          padding: 23px 26px 19px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          border-bottom: 1px solid rgba(126, 232, 255, 0.13);
        }

        .modal-header h2 {
          margin: 7px 0 0;
          font-size: clamp(28px, 4vw, 42px);
          letter-spacing: -0.045em;
        }

        .modal-header p:last-child {
          margin: 9px 0 0;
          color: rgba(235, 247, 255, 0.58);
        }

        .close-button {
          width: 42px;
          height: 42px;
          flex: 0 0 auto;
          border-radius: 999px;
          border: 1px solid rgba(126, 232, 255, 0.25);
          background: rgba(255, 255, 255, 0.055);
          color: white;
          font-size: 26px;
          cursor: pointer;
        }

        .modal-summary {
          padding: 14px 26px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          border-bottom: 1px solid rgba(126, 232, 255, 0.1);
        }

        .answer-toolbar {
          padding: 14px 26px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border-bottom: 1px solid rgba(126, 232, 255, 0.1);
        }

        .answer-toolbar > div {
          display: grid;
          gap: 4px;
        }

        .answer-toolbar span {
          color: rgba(235, 247, 255, 0.48);
          font-size: 11px;
        }

        .toggle-label {
          min-height: 42px;
          padding: 0 14px;
          display: flex;
          align-items: center;
          gap: 9px;
          border-radius: 999px;
          border: 1px solid rgba(126, 232, 255, 0.18);
          background: rgba(255, 255, 255, 0.04);
          cursor: pointer;
        }

        .toggle-label input {
          accent-color: #53d7ff;
        }

        .toggle-label span {
          color: white;
          font-size: 12px;
          font-weight: 800;
        }

        .answer-area {
          min-height: 260px;
          padding: 0 20px 20px;
          overflow-y: auto;
        }

        .detail-message strong {
          color: white;
          font-size: 17px;
        }

        .detail-message p {
          max-width: 720px;
          margin: 9px auto 0;
          line-height: 1.55;
        }

        .answer-table {
          min-width: 1040px;
        }

        .answer-table-header,
        .answer-table-row {
          display: grid;
          grid-template-columns: 1.35fr 0.85fr 0.85fr 1.25fr;
        }

        .answer-table-header {
          position: sticky;
          top: 0;
          z-index: 2;
          padding: 13px 14px;
          background: #061329;
          color: rgba(235, 247, 255, 0.45);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .answer-table-row {
          border-top: 1px solid rgba(126, 232, 255, 0.09);
          background: rgba(255, 255, 255, 0.018);
        }

        .answer-table-row.wrong {
          border-top-color: rgba(255, 78, 96, 0.42);
          background: rgba(255, 44, 67, 0.16);
          box-shadow: inset 5px 0 0 #ff4e60;
        }

        .answer-table-row.correct {
          background: rgba(93, 255, 181, 0.02);
        }

        .answer-table-row > div {
          min-width: 0;
          padding: 16px 14px;
          border-right: 1px solid rgba(126, 232, 255, 0.07);
        }

        .answer-table-row > div:last-child {
          border-right: 0;
        }

        .answer-table-row p {
          margin: 0;
          color: rgba(246, 251, 255, 0.84);
          font-size: 13px;
          line-height: 1.55;
        }

        .answer-table-row small,
        .cell-label,
        .question-number {
          display: block;
          margin-bottom: 7px;
          color: #8dfcff;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .answer-table-row small {
          margin: 8px 0 0;
          color: rgba(235, 247, 255, 0.42);
        }

        .answer-table-row img,
        .mobile-answer-card img {
          max-width: 100%;
          max-height: 220px;
          margin-top: 12px;
          border-radius: 12px;
          object-fit: contain;
          background: white;
        }

        .mobile-answer-list {
          display: grid;
          gap: 12px;
          padding-top: 14px;
        }

        .mobile-answer-card {
          border-radius: 18px;
          border: 1px solid rgba(126, 232, 255, 0.12);
          background: rgba(255, 255, 255, 0.027);
          overflow: hidden;
        }

        .mobile-answer-card.wrong {
          border-color: rgba(255, 78, 96, 0.62);
          background: rgba(255, 44, 67, 0.14);
          box-shadow: inset 4px 0 0 #ff4e60;
        }

        .mobile-answer-card.correct {
          border-color: rgba(93, 255, 181, 0.2);
        }

        .mobile-answer-heading {
          padding: 13px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(126, 232, 255, 0.09);
        }

        .mobile-answer-heading span {
          color: rgba(235, 247, 255, 0.5);
          font-size: 11px;
        }

        @media (max-width: 1180px) {
          .hero-insights {
            grid-template-columns: 1fr;
          }

          .analytics-subject-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .recommendation-grid {
            grid-template-columns: 1fr;
          }

          .analytics-metric-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .overview-grid {
            grid-template-columns: 1fr;
          }

          .attempt-heading {
            display: grid;
          }

          .filter-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .attempt-table-wrap {
            overflow-x: auto;
          }
        }

        @media (max-width: 720px) {
          .dashboard-context-row {
            min-height: 40px;
            margin-bottom: 22px;
          }

          .student-picker span,
          .viewer-pill span {
            display: none;
          }

          .viewer-pill {
            padding: 7px 11px;
          }

          .viewer-pill strong {
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .dashboard-shell {
            width: min(100% - 24px, 1440px);
            padding-top: 84px;
          }

          .hero {
            grid-template-columns: 1fr;
          }

          .hero h1 {
            font-size: clamp(44px, 14vw, 60px);
          }

          .week-comparison {
            min-width: 0;
          }

          .hero-insights {
            width: 100%;
          }

          .analytics-tab,
          .week-comparison {
            min-width: 0;
          }

          .monthly-panel-heading {
            display: grid;
          }

          .month-slider-controls {
            grid-template-columns: 38px minmax(0, 1fr) 38px;
            gap: 8px;
          }

          .month-slider-controls > button {
            width: 38px;
            height: 38px;
          }

          .monthly-week-chart {
            height: 220px;
            gap: 7px;
          }

          .analytics-backdrop {
            padding: 0;
            align-items: stretch;
          }

          .analytics-modal {
            width: 100%;
            max-height: 100dvh;
            border-radius: 0;
          }

          .analytics-modal-header {
            padding: 14px;
          }

          .analytics-title-block {
            align-items: flex-start;
            gap: 10px;
          }

          .analytics-nova {
            width: 64px;
            height: 64px;
          }

          .analytics-modal-header h2 {
            font-size: 28px;
          }

          .analytics-modal-header p:last-child {
            font-size: 11px;
          }

          .analytics-scroll {
            max-height: calc(100dvh - 106px);
            padding: 12px;
          }

          .nova-summary-card {
            grid-template-columns: 1fr;
            padding: 15px;
          }

          .nova-summary-card h3 {
            font-size: 18px;
          }

          .analytics-coverage {
            grid-template-columns: auto 1fr auto 1fr;
          }

          .analytics-subject-grid {
            grid-template-columns: 1fr;
          }

          .analytics-section {
            padding: 14px;
          }

          .analytics-section-heading {
            display: grid;
          }

          .weakness-row {
            grid-template-columns: 30px minmax(0, 1fr) auto;
            padding: 9px;
          }

          .summary-grid {
            grid-template-columns: 1fr 1fr;
            gap: 9px;
          }

          .panel {
            padding: 18px 13px;
            border-radius: 20px;
          }

          .weekly-chart {
            height: 200px;
            gap: 5px;
          }

          .bar-track {
            width: 72%;
          }

          .filter-grid {
            grid-template-columns: 1fr;
          }

          .attempt-table-wrap {
            overflow: visible;
          }

          .attempt-table-header {
            display: none;
          }

          .attempt-row {
            grid-template-columns: 1fr auto;
            min-height: 0;
            padding: 13px;
          }

          .desktop-cell {
            display: none;
          }

          .attempt-title-cell {
            grid-column: 1 / -1;
          }

          .view-link {
            grid-column: 2;
            grid-row: 2;
            align-self: end;
          }

          .mobile-attempt-meta {
            grid-column: 1;
            grid-row: 2;
            display: flex;
            flex-wrap: wrap;
            gap: 6px 12px;
            color: rgba(235, 247, 255, 0.48);
            font-size: 10px;
          }

          .modal-backdrop {
            padding: 0;
            align-items: stretch;
          }

          .attempt-modal {
            width: 100%;
            max-height: 100dvh;
            border-radius: 0;
          }

          .modal-header {
            padding: 17px 14px 14px;
          }

          .modal-header h2 {
            font-size: 28px;
          }

          .modal-summary {
            padding: 10px 12px;
            grid-template-columns: repeat(2, 1fr);
          }

          .answer-toolbar {
            padding: 11px 12px;
            align-items: flex-start;
            flex-direction: column;
          }

          .answer-area {
            padding: 0 12px 16px;
          }
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
      <div className="summary-icon">{icon}</div>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{supporting}</small>

      <style jsx>{`
        .summary-card {
          min-height: 154px;
          padding: 18px;
          border-radius: 22px;
          border: 1px solid rgba(126, 232, 255, 0.15);
          background: linear-gradient(145deg, rgba(9, 31, 61, 0.8), rgba(4, 14, 32, 0.9));
          box-shadow: 0 22px 58px rgba(0, 0, 0, 0.24);
        }

        .summary-icon {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(126, 232, 255, 0.25);
          background: rgba(126, 232, 255, 0.07);
          color: #8dfcff;
          font-weight: 900;
        }

        p {
          margin: 15px 0 0;
          color: rgba(235, 247, 255, 0.48);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        strong {
          display: block;
          margin-top: 7px;
          font-size: 31px;
          letter-spacing: -0.04em;
        }

        small {
          display: block;
          margin-top: 7px;
          color: rgba(235, 247, 255, 0.52);
          line-height: 1.4;
        }

        @media (max-width: 720px) {
          .summary-card {
            min-height: 142px;
            padding: 14px;
          }

          strong {
            font-size: 27px;
          }
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
          min-height: 58px;
          padding: 9px 12px;
          border-radius: 14px;
          border: 1px solid rgba(126, 232, 255, 0.11);
          background: rgba(255, 255, 255, 0.028);
        }

        span {
          display: block;
          color: rgba(235, 247, 255, 0.45);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        strong {
          display: block;
          margin-top: 6px;
          color: #8dfcff;
          font-size: 17px;
        }
      `}</style>
    </div>
  );
}

function AnswerSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="answer-section">
      <span>{label}</span>
      {children}

      <style jsx>{`
        .answer-section {
          padding: 13px 14px;
          border-bottom: 1px solid rgba(126, 232, 255, 0.08);
        }

        .answer-section:last-child {
          border-bottom: 0;
        }

        span {
          display: block;
          margin-bottom: 7px;
          color: #8dfcff;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        :global(.answer-section p) {
          margin: 0;
          color: rgba(246, 251, 255, 0.84);
          font-size: 13px;
          line-height: 1.55;
        }
      `}</style>
    </section>
  );
}
