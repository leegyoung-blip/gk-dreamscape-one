import "server-only";

import type { WorldAdapter } from "../types";
import {
  buildPayload,
  collectErrors,
  groupCount,
  rows,
  safeQuery,
} from "../utils";

type CategoryQuestionIndexRow = {
  id: string;
  category?: string | null;
  topic?: string | null;
  subtopic?: string | null;
  adaptive_difficulty?: number | null;
  is_active?: boolean | null;
};

type CategoryAttemptRow = Record<string, unknown>;

export const observeMiloCategories: WorldAdapter = async ({
  admin,
  agentUserId,
  observedAt = new Date().toISOString(),
}) => {
  const [questionIndexResult, attemptsResult] = await Promise.all([
    safeQuery<CategoryQuestionIndexRow[]>(
      "milo_category_questions",
      admin
        .from("milo_category_questions")
        .select("id,category,topic,subtopic,adaptive_difficulty,is_active")
        .eq("is_active", true)
        .limit(1000),
    ),
    safeQuery<CategoryAttemptRow[]>(
      "milo_category_quiz_attempts",
      admin
        .from("milo_category_quiz_attempts")
        .select("*")
        .eq("user_id", agentUserId)
        .order("completed_at", { ascending: false })
        .limit(50),
    ),
  ]);

  const questionIndex = rows(questionIndexResult.data);
  const attempts = rows(attemptsResult.data);
  const errors = collectErrors(questionIndexResult, attemptsResult);

  return buildPayload({
    sourceKey: "milo.categories",
    observedAt,
    requiredOk: questionIndexResult.ok && attemptsResult.ok,
    errors,
    data: {
      safety: {
        readOnly: true,
        includesAnswerKeys: false,
        includesQuestionPrompts: false,
        createsMultiplayerLobby: false,
      },
      activeQuestionCount: questionIndex.length,
      activeQuestionCountByCategory: groupCount(
        questionIndex.map((row) => row.category),
      ),
      activeQuestionCountByDifficulty: groupCount(
        questionIndex.map((row) =>
          row.adaptive_difficulty == null
            ? "unknown"
            : String(row.adaptive_difficulty),
        ),
      ),
      taxonomyIndex: questionIndex.map((row) => ({
        id: row.id,
        category: row.category,
        topic: row.topic,
        subtopic: row.subtopic,
        adaptiveDifficulty: row.adaptive_difficulty,
      })),
      recentAttempts: attempts,
    },
  });
};
