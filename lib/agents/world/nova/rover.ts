import "server-only";

import type { WorldAdapter } from "../types";
import { buildPayload, collectErrors, rows, safeQuery } from "../utils";

type RoverScoreRow = {
  user_id?: string | null;
  course_id?: string | null;
  best_score?: number | null;
  best_time_ms?: number | null;
  orbs_collected?: number | null;
  checkpoints_reached?: number | null;
  crash_penalty?: number | null;
  rover_stage?: number | null;
  completed_at?: string | null;
  updated_at?: string | null;
};

type RoverUnlockRow = Record<string, unknown>;

export const observeNovaRover: WorldAdapter = async ({
  admin,
  agentUserId,
  observedAt = new Date().toISOString(),
}) => {
  const [scoresResult, unlocksResult] = await Promise.all([
    safeQuery<RoverScoreRow[]>(
      "rover_challenge_scores",
      admin
        .from("rover_challenge_scores")
        .select(
          "user_id,course_id,best_score,best_time_ms,orbs_collected,checkpoints_reached,crash_penalty,rover_stage,completed_at,updated_at",
        )
        .eq("user_id", agentUserId)
        .order("updated_at", { ascending: false }),
    ),
    safeQuery<RoverUnlockRow[]>(
      "rover_level_unlocks",
      admin
        .from("rover_level_unlocks")
        .select("*")
        .eq("user_id", agentUserId),
    ),
  ]);

  const scores = rows(scoresResult.data);
  const unlocks = rows(unlocksResult.data);
  const errors = collectErrors(scoresResult, unlocksResult);

  return buildPayload({
    sourceKey: "nova.rover",
    observedAt,
    requiredOk: scoresResult.ok && unlocksResult.ok,
    errors,
    data: {
      safety: {
        readOnly: true,
        executesRoverRpc: false,
        spendsDreamGems: false,
      },
      progress: scores,
      paidOrPermanentUnlocks: unlocks,
      completedCourseIds: scores
        .filter((row) => Boolean(row.completed_at))
        .map((row) => row.course_id)
        .filter(Boolean),
      highestObservedRoverStage: scores.reduce(
        (max, row) => Math.max(max, Number(row.rover_stage || 0)),
        0,
      ),
    },
  });
};
