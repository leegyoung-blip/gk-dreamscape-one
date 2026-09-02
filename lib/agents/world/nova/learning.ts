import "server-only";

import type { WorldAdapter } from "../types";
import {
  buildPayload,
  collectErrors,
  groupCount,
  rows,
  safeQuery,
} from "../utils";

type TopicRow = {
  id: string;
  primary_level?: number | null;
  title?: string | null;
  slug?: string | null;
  is_active?: boolean | null;
  review_status?: string | null;
};

type ScienceLevelRow = {
  id: string;
  slug?: string | null;
  display_name?: string | null;
  school_level?: string | null;
  is_active?: boolean | null;
};

type ScienceTopicRow = {
  id: string;
  title?: string | null;
  slug?: string | null;
  level_id?: string | null;
  status?: string | null;
};

type QuizRow = {
  id: string;
  topic_id?: string | null;
  title?: string | null;
  quiz_type?: string | null;
  difficulty?: number | null;
  is_published?: boolean | null;
  student_visibility?: string | null;
  slug?: string | null;
  mission_type?: string | null;
  status?: string | null;
};

type AttemptRow = {
  id: string;
  quiz_id?: string | null;
  status?: string | null;
  percentage?: number | null;
  correct_count?: number | null;
  total_questions?: number | null;
  attempt_number?: number | null;
  submitted_at?: string | null;
  created_at?: string | null;
  duration_seconds?: number | null;
  time_seconds?: number | null;
};

export const observeNovaLearning: WorldAdapter = async ({
  admin,
  agentUserId,
  observedAt = new Date().toISOString(),
}) => {
  const [
    englishTopicsResult,
    englishQuizzesResult,
    englishAttemptsResult,
    mathTopicsResult,
    mathQuizzesResult,
    mathAttemptsResult,
    scienceLevelsResult,
    scienceTopicsResult,
    scienceQuizzesResult,
    scienceAttemptsResult,
  ] = await Promise.all([
    safeQuery<TopicRow[]>(
      "english_topics",
      admin
        .from("english_topics")
        .select("id,primary_level,title,slug,is_active,review_status")
        .eq("is_active", true)
        .order("primary_level", { ascending: true }),
    ),
    safeQuery<QuizRow[]>(
      "english_quizzes",
      admin
        .from("english_quizzes")
        .select("id,topic_id,title,quiz_type,difficulty,is_published,student_visibility")
        .eq("is_published", true)
        .eq("student_visibility", "satisfied")
        .limit(1000),
    ),
    safeQuery<AttemptRow[]>(
      "english_quiz_attempts",
      admin
        .from("english_quiz_attempts")
        .select(
          "id,quiz_id,status,percentage,correct_count,total_questions,duration_seconds,attempt_number,submitted_at,created_at",
        )
        .eq("user_id", agentUserId)
        .order("created_at", { ascending: false })
        .limit(50),
    ),
    safeQuery<TopicRow[]>(
      "math_topics",
      admin
        .from("math_topics")
        .select("id,primary_level,title,slug,is_active,review_status")
        .eq("is_active", true)
        .order("primary_level", { ascending: true }),
    ),
    safeQuery<QuizRow[]>(
      "math_quizzes",
      admin
        .from("math_quizzes")
        .select("id,topic_id,title,quiz_type,difficulty,is_published,student_visibility")
        .eq("is_published", true)
        .eq("student_visibility", "satisfied")
        .limit(1000),
    ),
    safeQuery<AttemptRow[]>(
      "math_quiz_attempts",
      admin
        .from("math_quiz_attempts")
        .select(
          "id,quiz_id,status,percentage,correct_count,total_questions,duration_seconds,attempt_number,submitted_at,created_at",
        )
        .eq("user_id", agentUserId)
        .order("created_at", { ascending: false })
        .limit(50),
    ),
    safeQuery<ScienceLevelRow[]>(
      "science_levels",
      admin
        .from("science_levels")
        .select("id,slug,display_name,school_level,is_active")
        .eq("is_active", true),
    ),
    safeQuery<ScienceTopicRow[]>(
      "science_topics",
      admin.from("science_topics").select("id,title,slug,level_id,status"),
    ),
    safeQuery<QuizRow[]>(
      "science_quizzes",
      admin
        .from("science_quizzes")
        .select("id,topic_id,title,slug,mission_type,status")
        .limit(1000),
    ),
    safeQuery<AttemptRow[]>(
      "science_quiz_attempts",
      admin
        .from("science_quiz_attempts")
        .select(
          "id,quiz_id,status,percentage,correct_count,total_questions,time_seconds,submitted_at,created_at",
        )
        .eq("user_id", agentUserId)
        .order("created_at", { ascending: false })
        .limit(50),
    ),
  ]);

  const englishTopics = rows(englishTopicsResult.data);
  const learnerEnglishTopicIds = new Set(
    englishTopics
      .filter((row) => String(row.review_status ?? "reviewing").toLowerCase() !== "locked")
      .map((row) => String(row.id)),
  );
  const englishQuizzes = rows(englishQuizzesResult.data).filter((row) =>
    learnerEnglishTopicIds.has(String(row.topic_id ?? "")),
  );
  const englishAttempts = rows(englishAttemptsResult.data);
  const mathTopics = rows(mathTopicsResult.data);
  const learnerMathTopicIds = new Set(
    mathTopics
      .filter((row) => String(row.review_status ?? "reviewing").toLowerCase() !== "locked")
      .map((row) => String(row.id)),
  );
  const mathQuizzes = rows(mathQuizzesResult.data).filter((row) =>
    learnerMathTopicIds.has(String(row.topic_id ?? "")),
  );
  const mathAttempts = rows(mathAttemptsResult.data);
  const scienceLevels = rows(scienceLevelsResult.data);
  const scienceTopics = rows(scienceTopicsResult.data);
  const scienceQuizzes = rows(scienceQuizzesResult.data);
  const scienceAttempts = rows(scienceAttemptsResult.data);

  const errors = collectErrors(
    englishTopicsResult,
    englishQuizzesResult,
    englishAttemptsResult,
    mathTopicsResult,
    mathQuizzesResult,
    mathAttemptsResult,
    scienceLevelsResult,
    scienceTopicsResult,
    scienceQuizzesResult,
    scienceAttemptsResult,
  );

  return buildPayload({
    sourceKey: "nova.learning",
    observedAt,
    requiredOk:
      englishTopicsResult.ok &&
      englishQuizzesResult.ok &&
      mathTopicsResult.ok &&
      mathQuizzesResult.ok &&
      scienceLevelsResult.ok &&
      scienceTopicsResult.ok &&
      scienceQuizzesResult.ok,
    errors,
    data: {
      safety: {
        readOnly: true,
        includesAnswerKeys: false,
        includesQuestionPrompts: false,
      },
      english: {
        activeTopics: englishTopics,
        publishedQuizzes: englishQuizzes,
        recentAttempts: englishAttempts,
        topicCountByPrimaryLevel: groupCount(
          englishTopics.map((row) =>
            row.primary_level == null ? "unknown" : `P${row.primary_level}`,
          ),
        ),
      },
      math: {
        activeTopics: mathTopics,
        publishedQuizzes: mathQuizzes,
        recentAttempts: mathAttempts,
        topicCountByPrimaryLevel: groupCount(
          mathTopics.map((row) =>
            row.primary_level == null ? "unknown" : `P${row.primary_level}`,
          ),
        ),
      },
      science: {
        activeLevels: scienceLevels,
        topics: scienceTopics,
        quizzes: scienceQuizzes,
        recentAttempts: scienceAttempts,
        levelCountBySchoolLevel: groupCount(
          scienceLevels.map((row) => row.school_level),
        ),
      },
    },
  });
};
