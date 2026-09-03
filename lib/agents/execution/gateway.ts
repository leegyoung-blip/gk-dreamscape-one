import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { reportAgentFailure } from "@/lib/agents/runtime/failures";
import {
  AGENT_EXECUTION_ADAPTERS,
  isAgentExecutableActionKey,
} from "@/lib/agents/execution/registry";
import type { AgentExecutionResult } from "@/lib/agents/execution/types";

type JsonObject = Record<string, unknown>;

function objectValue(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

async function markPreExecutionFailure({
  admin,
  actionRequestId,
  errorCode,
  message,
}: {
  admin: SupabaseClient;
  actionRequestId: string;
  errorCode: string;
  message: string;
}) {
  const { error } = await admin.rpc(
    "agent_fail_unstarted_runtime_action_request",
    {
      p_action_request_id: actionRequestId,
      p_error_code: errorCode,
      p_error_message: message,
    },
  );

  if (error) {
    console.error(
      "Could not mark pre-execution agent request as failed:",
      error.message,
    );
  }
}

export async function executeValidatedAgentAction({
  actionRequestId,
  admin: suppliedAdmin,
}: {
  actionRequestId: string;
  admin?: SupabaseClient;
}): Promise<AgentExecutionResult> {
  const admin = suppliedAdmin || createAdminClient();

  /*
   * Keep this lookup deliberately tiny.
   *
   * We only need:
   *   - agent identity for failure reporting
   *   - action key for registry validation / result reporting
   *
   * We no longer load:
   *   - persona
   *   - primary level
   *   - synthetic performance
   *   - quiz questions
   *   - answer keys
   *   - game state
   */
  const { data: requestRow, error: requestError } = await admin
    .from("agent_action_requests")
    .select("id,agent_user_id,action_key")
    .eq("id", actionRequestId)
    .maybeSingle();

  if (requestError || !requestRow) {
    throw new Error(
      requestError?.message || "Agent action request was not found.",
    );
  }

  const actionKey = String(requestRow.action_key || "");
  const agentUserId = String(requestRow.agent_user_id || "");

  if (!agentUserId) {
    throw new Error(
      `Agent action request ${actionRequestId} has no agent_user_id.`,
    );
  }

  /*
   * Preserve the executable-action registry as a code-side safety boundary.
   *
   * Current supported synthetic actions:
   *
   *   nova.learning.attempt_quiz
   *   nova.knowledge_arena.attempt_quiz
   *   nova.think.attempt_activity
   *   nova.rover.run_challenge
   *   milo.categories.attempt_quiz
   */
  if (!isAgentExecutableActionKey(actionKey)) {
    throw new Error(
      `No Phase 3F synthetic execution adapter is registered for ${actionKey}.`,
    );
  }

  const adapter = AGENT_EXECUTION_ADAPTERS[actionKey];

  try {
    /*
     * ------------------------------------------------------------------------
     * SYNTHETIC COMPLETION ARCHITECTURE
     * ------------------------------------------------------------------------
     *
     * ALL supported simulation actions now use this ONE RPC.
     *
     * There is deliberately no switch(actionKey) here.
     *
     * The database RPC:
     *   - validates simulation-agent identity
     *   - validates Full-100 membership
     *   - validates runtime gates
     *   - uses the normal agent execution lifecycle
     *   - records one synthetic completion
     *   - awards DT
     *   - awards DG
     *   - marks the runtime execution succeeded
     *
     * It does NOT:
     *   - create real quiz attempts
     *   - create answer rows
     *   - calculate scores
     *   - update learner mastery
     *   - update learner analytics
     *   - write Rover gameplay results
     *   - write Knowledge Arena answers
     *   - write Milo Category answers
     */
    const { data, error } = await admin.rpc(
      "agent_execute_synthetic_activity_v1",
      {
        p_action_request_id: actionRequestId,
      },
    );

    if (error) {
      throw new Error(error.message);
    }

    const result = objectValue(data);

    /*
     * The RPC normally throws on validation/execution errors.
     *
     * Keep this branch as a defensive guard in case a future RPC version
     * returns { ok: false } instead.
     */
    if (result.ok !== true) {
      const message = String(
        result.error ||
          "Synthetic agent activity executor returned a failure.",
      );

      const failure = await reportAgentFailure({
        admin,
        agentUserId,
        actionRequestId,
        scope: "action",
        severity: "error",
        errorCode: String(
          result.error_code ||
            "AGENT_SYNTHETIC_ACTIVITY_EXECUTION_FAILED",
        ),
        message,
        context: {
          phase: "3F-synthetic",
          actionKey,
          adapterKey: adapter.adapterKey,
          executionArchitecture: "synthetic_completion_only",
          realScoreGenerated: false,
          learnerAnalyticsWritten: false,
        },
        idempotencyKey:
          `agent-action:${actionRequestId}:synthetic-failure`,
      });

      return {
        ok: false,
        actionRequestId,
        actionKey,
        failureId: failure.failureId,
        error: message,
      };
    }

    /*
     * A successful result looks roughly like:
     *
     * {
     *   ok: true,
     *   synthetic: true,
     *   action_key: "...",
     *   dt_awarded: 1-5,
     *   dg_awarded: 1,
     *   result: {
     *     synthetic: true,
     *     score: null,
     *     analytics_written: false,
     *     ...
     *   }
     * }
     */
    return {
      ok: true,
      actionRequestId,
      actionKey,
      result: objectValue(result.result || result),
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Synthetic agent execution gateway failed.";

    /*
     * The synthetic RPC executes transactionally.
     *
     * If the RPC throws, its internal execution-begin/reward writes roll back.
     * We can therefore safely mark the still-unstarted request as failed using
     * the existing runtime helper.
     */
    await markPreExecutionFailure({
      admin,
      actionRequestId,
      errorCode: "AGENT_EXECUTION_GATEWAY_FAILED",
      message,
    });

    const failure = await reportAgentFailure({
      admin,
      agentUserId,
      actionRequestId,
      scope: "action",
      severity: "critical",
      errorCode: "AGENT_EXECUTION_GATEWAY_FAILED",
      message,
      context: {
        phase: "3F-synthetic",
        actionKey,
        adapterKey: adapter.adapterKey,
        executionArchitecture: "synthetic_completion_only",
        realScoreGenerated: false,
        learnerAnalyticsWritten: false,
      },
      idempotencyKey:
        `agent-action:${actionRequestId}:gateway-failure`,
    });

    return {
      ok: false,
      actionRequestId,
      actionKey,
      failureId: failure.failureId,
      error: message,
    };
  }
}