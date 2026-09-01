import "server-only";

import type { WorldAdapter } from "../types";
import {
  buildPayload,
  collectErrors,
  groupCount,
  rows,
  safeQuery,
} from "../utils";

type ArenaQuestionIndexRow = {
  id: string;
  topic?: string | null;
  is_active?: boolean | null;
};

type ArenaAttemptRow = {
  id: string;
  topic?: string | null;
  mode?: string | null;
  score?: number | null;
  correct_count?: number | null;
  total_questions?: number | null;
  tokens_earned?: number | null;
  challenge_mode?: string | null;
  timer_seconds?: number | null;
  topic_results?: unknown;
  selection_context?: unknown;
  created_at?: string | null;
};

export const observeNovaKnowledgeArena: WorldAdapter = async ({
  admin,
  agentUserId,
  observedAt = new Date().toISOString(),
}) => {
  const [questionIndexResult, attemptsResult] = await Promise.all([
    safeQuery<ArenaQuestionIndexRow[]>(
      "knowledge_arena_questions",
      admin
        .from("knowledge_arena_questions")
        .select("id,topic,is_active")
        .eq("is_active", true)
        .limit(1000),
    ),
    safeQuery<ArenaAttemptRow[]>(
      "knowledge_arena_attempts",
      admin
        .from("knowledge_arena_attempts")
        .select(
          "id,topic,mode,score,correct_count,total_questions,tokens_earned,challenge_mode,timer_seconds,topic_results,selection_context,created_at",
        )
        .eq("user_id", agentUserId)
        .order("created_at", { ascending: false })
        .limit(50),
    ),
  ]);

  const questionIndex = rows(questionIndexResult.data);
  const attempts = rows(attemptsResult.data);
  const errors = collectErrors(questionIndexResult, attemptsResult);

  return buildPayload({
    sourceKey: "nova.knowledge_arena",
    observedAt,
    requiredOk: questionIndexResult.ok && attemptsResult.ok,
    errors,
    data: {
      safety: {
        readOnly: true,
        includesAnswerKeys: false,
        includesQuestionPrompts: false,
      },
      activeQuestionCount: questionIndex.length,
      activeQuestionCountByTopic: groupCount(
        questionIndex.map((row) => row.topic),
      ),
      activeTopics: Object.keys(
        groupCount(questionIndex.map((row) => row.topic)),
      ).filter((topic) => topic !== "unknown"),
      recentAttempts: attempts,
    },
  });
};
