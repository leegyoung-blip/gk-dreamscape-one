import "server-only";

import type { WorldAdapter } from "../types";
import {
  buildPayload,
  collectErrors,
  groupCount,
  rows,
  safeQuery,
} from "../utils";

type ThinkQuizRow = {
  id: string;
  level_band?: string | null;
  level_label?: string | null;
  title?: string | null;
  description?: string | null;
  quiz_order?: number | null;
  is_active?: boolean | null;
};

type ThinkQuestionIndexRow = {
  id: string;
  quiz_id?: string | null;
};

type ThinkAttemptRow = {
  quiz_id?: string | null;
  score?: number | null;
  correct_count?: number | null;
  tokens_earned?: number | null;
  gems_earned?: number | null;
  created_at?: string | null;
};

export const observeNovaThink: WorldAdapter = async ({
  admin,
  agentUserId,
  observedAt = new Date().toISOString(),
}) => {
  const [quizzesResult, questionIndexResult, attemptsResult] =
    await Promise.all([
      safeQuery<ThinkQuizRow[]>(
        "think_mission_quizzes",
        admin
          .from("think_mission_quizzes")
          .select(
            "id,level_band,level_label,title,description,quiz_order,is_active",
          )
          .eq("is_active", true)
          .order("quiz_order", { ascending: true })
          .limit(500),
      ),
      safeQuery<ThinkQuestionIndexRow[]>(
        "think_mission_questions",
        admin
          .from("think_mission_questions")
          .select("id,quiz_id")
          .eq("is_active", true)
          .limit(1000),
      ),
      safeQuery<ThinkAttemptRow[]>(
        "think_mission_attempts",
        admin
          .from("think_mission_attempts")
          .select(
            "quiz_id,score,correct_count,tokens_earned,gems_earned,created_at",
          )
          .eq("user_id", agentUserId)
          .order("created_at", { ascending: false })
          .limit(50),
      ),
    ]);

  const quizzes = rows(quizzesResult.data);
  const questionIndex = rows(questionIndexResult.data);
  const attempts = rows(attemptsResult.data);
  const errors = collectErrors(
    quizzesResult,
    questionIndexResult,
    attemptsResult,
  );

  const questionsPerQuiz: Record<string, number> = {};
  for (const row of questionIndex) {
    const quizId = String(row.quiz_id || "");
    if (!quizId) continue;
    questionsPerQuiz[quizId] = (questionsPerQuiz[quizId] || 0) + 1;
  }

  return buildPayload({
    sourceKey: "nova.think",
    observedAt,
    requiredOk: quizzesResult.ok && questionIndexResult.ok && attemptsResult.ok,
    errors,
    data: {
      safety: {
        readOnly: true,
        includesAnswerKeys: false,
        includesQuestionPrompts: false,
      },
      activeQuizzes: quizzes.map((quiz) => ({
        ...quiz,
        activeQuestionCount: questionsPerQuiz[quiz.id] || 0,
      })),
      quizCountByLevelBand: groupCount(
        quizzes.map((row) => row.level_band),
      ),
      recentAttempts: attempts,
    },
  });
};
