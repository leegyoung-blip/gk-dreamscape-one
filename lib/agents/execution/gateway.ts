import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  reportAgentFailure,
} from "@/lib/agents/runtime/failures";

import {
  AGENT_EXECUTION_ADAPTERS,
  isAgentExecutableActionKey,
} from "@/lib/agents/execution/registry";

import type {
  AgentExecutionResult,
} from "@/lib/agents/execution/types";

type JsonObject =
  Record<string, unknown>;

function objectValue(
  value: unknown,
): JsonObject {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value as JsonObject
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
  const {
    error,
  } = await admin.rpc(
    "agent_fail_unstarted_runtime_action_request",
    {
      p_action_request_id:
        actionRequestId,

      p_error_code:
        errorCode,

      p_error_message:
        message,
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
  const admin =
    suppliedAdmin ||
    createAdminClient();

  const {
    data: requestRow,
    error: requestError,
  } = await admin
    .from(
      "agent_action_requests",
    )
    .select(
      "id,agent_user_id,action_key",
    )
    .eq(
      "id",
      actionRequestId,
    )
    .maybeSingle();

  if (
    requestError ||
    !requestRow
  ) {
    throw new Error(
      requestError?.message ||
      "Agent action request was not found.",
    );
  }

  const actionKey =
    String(
      requestRow.action_key ||
      "",
    );

  const agentUserId =
    String(
      requestRow.agent_user_id ||
      "",
    );

  if (!agentUserId) {
    throw new Error(
      `Agent action request ${actionRequestId} has no agent_user_id.`,
    );
  }

  if (
    !isAgentExecutableActionKey(
      actionKey,
    )
  ) {
    throw new Error(
      `No synthetic execution adapter is registered for ${actionKey}.`,
    );
  }

  const adapter =
    AGENT_EXECUTION_ADAPTERS[
      actionKey
    ];

  const isEconomyAction =
    actionKey ===
    "economy.synthetic_spend";

  /*
   * Gameplay actions all use the lightweight synthetic activity executor.
   *
   * Phase 4A economy actions use their own budget-protected executor.
   */
  const rpcName =
    isEconomyAction
      ? "agent_execute_synthetic_economy_spend_v1"
      : "agent_execute_synthetic_activity_v1";

  const executionArchitecture =
    isEconomyAction
      ? "synthetic_economy"
      : "synthetic_completion_only";

  try {
    const {
      data,
      error,
    } = await admin.rpc(
      rpcName,
      {
        p_action_request_id:
          actionRequestId,
      },
    );

    if (error) {
      throw new Error(
        error.message,
      );
    }

    const result =
      objectValue(
        data,
      );

    if (
      result.ok !==
      true
    ) {
      const message =
        String(
          result.error ||
          "Synthetic agent executor returned a failure.",
        );

      const failure =
        await reportAgentFailure({
          admin,
          agentUserId,
          actionRequestId,

          scope:
            "action",

          severity:
            "error",

          errorCode:
            String(
              result.error_code ||
              (
                isEconomyAction
                  ? "AGENT_SYNTHETIC_ECONOMY_EXECUTION_FAILED"
                  : "AGENT_SYNTHETIC_ACTIVITY_EXECUTION_FAILED"
              ),
            ),

          message,

          context: {
            phase:
              "4A",

            actionKey,

            adapterKey:
              adapter.adapterKey,

            rpcName,

            executionArchitecture,

            realScoreGenerated:
              false,

            learnerAnalyticsWritten:
              false,

            realInventoryMutated:
              false,
          },

          idempotencyKey:
            `agent-action:${actionRequestId}:synthetic-failure`,
        });

      return {
        ok:
          false,

        actionRequestId,

        actionKey,

        failureId:
          failure.failureId,

        error:
          message,
      };
    }

    return {
      ok:
        true,

      actionRequestId,

      actionKey,

      result:
        objectValue(
          result.result ||
          result,
        ),
    };

  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "Synthetic agent execution gateway failed.";

    await markPreExecutionFailure({
      admin,
      actionRequestId,

      errorCode:
        "AGENT_EXECUTION_GATEWAY_FAILED",

      message,
    });

    const failure =
      await reportAgentFailure({
        admin,
        agentUserId,
        actionRequestId,

        scope:
          "action",

        severity:
          "critical",

        errorCode:
          "AGENT_EXECUTION_GATEWAY_FAILED",

        message,

        context: {
          phase:
            "4A",

          actionKey,

          adapterKey:
            adapter.adapterKey,

          rpcName,

          executionArchitecture,

          realScoreGenerated:
            false,

          learnerAnalyticsWritten:
            false,

          realInventoryMutated:
            false,
        },

        idempotencyKey:
          `agent-action:${actionRequestId}:gateway-failure`,
      });

    return {
      ok:
        false,

      actionRequestId,

      actionKey,

      failureId:
        failure.failureId,

      error:
        message,
    };
  }
}