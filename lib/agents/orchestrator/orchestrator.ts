import "server-only";

import {
  createHash,
  randomUUID,
} from "crypto";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  executeValidatedAgentAction,
} from "@/lib/agents/execution/gateway";

import {
  reportAgentFailure,
} from "@/lib/agents/runtime/failures";

import {
  buildOrchestratorDayPlan,
  simulationClock,
} from "@/lib/agents/orchestrator/schedule";

import {
  runRuleBasedRuntimeDecision,
} from "@/lib/agents/orchestrator/runtimePolicy";

import type {
  OrchestratorTickSummary,
  RuntimeDecisionResult,
} from "@/lib/agents/orchestrator/types";

type JsonObject = Record<
  string,
  unknown
>;

function objectValue(
  value: unknown,
): JsonObject {
  return value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value,
    )
    ? value as JsonObject
    : {};
}

function stringArray(
  value: unknown,
) {
  return Array.isArray(
    value,
  )
    ? value.map(
        (
          item,
        ) => String(
          item,
        ),
      )
    : [];
}

/*
 * Phase 3F stop-race protection.
 *
 * The administrator can stop the runtime while a serverless shard is still
 * processing an observation, policy decision or database request.
 *
 * In that case the stop RPC may already have closed/cancelled the session.
 * Errors saying the session is no longer open are therefore expected
 * cancellation races, not critical runtime failures.
 */
function isClosedSessionRaceMessage(
  message: string,
) {
  const normalized =
    String(
      message ||
      "",
    )
      .toLowerCase();

  return (
    normalized.includes(
      "session is not an open session",
    ) ||
    normalized.includes(
      "session is not open",
    ) ||
    normalized.includes(
      "run session is not open",
    )
  );
}

async function recordDecisionResult({
  admin,
  sessionId,
  decisionId,
  actionKey,
  succeeded,
  blockAction,
}: {
  admin: SupabaseClient;
  sessionId: string;
  decisionId: string;
  actionKey: string;
  succeeded: boolean;
  blockAction: boolean;
}) {
  const {
    data,
    error,
  } =
    await admin.rpc(
      "agent_record_session_decision_result",
      {
        p_session_id:
          sessionId,

        p_policy_decision_id:
          decisionId,

        p_action_key:
          actionKey,

        p_succeeded:
          succeeded,

        p_block_action:
          blockAction,
      },
    );

  if (error) {
    /*
     * The administrator may have stopped Phase 3F after the decision began
     * but before its result was recorded.
     *
     * The session has already been safely cancelled, so this is not an
     * orchestrator failure.
     */
    if (
      isClosedSessionRaceMessage(
        error.message,
      )
    ) {
      return {
        skipped:
          true,
        reason:
          "session_closed",
      };
    }

    throw new Error(
      error.message,
    );
  }

  return objectValue(
    data,
  );
}

async function closeSession({
  admin,
  sessionId,
  status,
  reason,
}: {
  admin: SupabaseClient;
  sessionId: string;
  status:
    | "completed"
    | "failed"
    | "cancelled";
  reason: string;
}) {
  const {
    error,
  } =
    await admin.rpc(
      "agent_close_run_session",
      {
        p_session_id:
          sessionId,

        p_status:
          status,

        p_reason:
          reason,
      },
    );

  if (error) {
    /*
     * Another control path may already have cancelled the session.
     * Closing an already-closed session during Stop is idempotent from the
     * orchestrator's perspective.
     */
    if (
      isClosedSessionRaceMessage(
        error.message,
      )
    ) {
      return;
    }

    throw new Error(
      error.message,
    );
  }
}

async function getSession(
  admin: SupabaseClient,
  sessionId: string,
) {
  const {
    data,
    error,
  } =
    await admin
      .from(
        "agent_run_sessions",
      )
      .select(
        `
        id,
        agent_user_id,
        simulation_day_index,
        session_number,
        status,
        planned_decisions,
        attempted_decisions,
        completed_decisions,
        failed_decisions,
        metadata,
        started_at
      `,
      )
      .eq(
        "id",
        sessionId,
      )
      .maybeSingle();

  if (
    error ||
    !data
  ) {
    throw new Error(
      error?.message ||
      "Agent session was not found.",
    );
  }

  return data;
}

/*
 * Re-read every gate that is relevant to executing a live agent action.
 *
 * This is intentionally separate from the first gate check in
 * processOneDecision().
 *
 * Observation/policy generation can take several seconds, so the original
 * values may be stale by the time an action is ready to run.
 */
async function getRuntimeGateState({
  admin,
  sessionId,
  agentUserId,
}: {
  admin: SupabaseClient;
  sessionId: string;
  agentUserId: string;
}) {
  const [
    sessionResult,
    agentResult,
    stateResult,
    systemResult,
    runtimeSettingsResult,
  ] =
    await Promise.all([
      admin
        .from(
          "agent_run_sessions",
        )
        .select(
          "status",
        )
        .eq(
          "id",
          sessionId,
        )
        .maybeSingle(),

      admin
        .from(
          "agent_profiles",
        )
        .select(
          "lifecycle_status",
        )
        .eq(
          "user_id",
          agentUserId,
        )
        .maybeSingle(),

      admin
        .from(
          "agent_runtime_state",
        )
        .select(
          "execution_enabled",
        )
        .eq(
          "agent_user_id",
          agentUserId,
        )
        .maybeSingle(),

      admin
        .from(
          "agent_system_settings",
        )
        .select(
          "agents_enabled",
        )
        .eq(
          "singleton_key",
          "global",
        )
        .maybeSingle(),

      admin
        .from(
          "agent_runtime_settings",
        )
        .select(
          "activation_unlocked",
        )
        .eq(
          "singleton_key",
          "global",
        )
        .maybeSingle(),
    ]);

  const errors =
    [
      sessionResult.error,
      agentResult.error,
      stateResult.error,
      systemResult.error,
      runtimeSettingsResult.error,
    ].filter(
      Boolean,
    );

  if (
    errors.length >
    0
  ) {
    throw new Error(
      errors
        .map(
          (
            error,
          ) =>
            error?.message ||
            "Runtime gate read failed.",
        )
        .join(
          " | ",
        ),
    );
  }

  const sessionStatus =
    String(
      sessionResult
        .data
        ?.status ||
      "",
    );

  if (
    sessionStatus !==
    "started"
  ) {
    return {
      open: false,
      sessionStatus,
      reason:
        "session_closed",
    };
  }

  if (
    agentResult
      .data
      ?.lifecycle_status !==
    "active"
  ) {
    return {
      open: false,
      sessionStatus,
      reason:
        "agent_not_active",
    };
  }

  if (
    stateResult
      .data
      ?.execution_enabled !==
    true
  ) {
    return {
      open: false,
      sessionStatus,
      reason:
        "execution_disabled",
    };
  }

  if (
    systemResult
      .data
      ?.agents_enabled !==
    true
  ) {
    return {
      open: false,
      sessionStatus,
      reason:
        "global_agents_disabled",
    };
  }

  if (
    runtimeSettingsResult
      .data
      ?.activation_unlocked !==
    true
  ) {
    return {
      open: false,
      sessionStatus,
      reason:
        "activation_locked",
    };
  }

  return {
    open: true,
    sessionStatus,
    reason:
      "open",
  };
}

async function getOrCreateRuntimeDecision({
  admin,
  agentUserId,
  sessionId,
  decisionIndex,
  blockedActionKeys,
}: {
  admin: SupabaseClient;
  agentUserId: string;
  sessionId: string;
  decisionIndex: number;
  blockedActionKeys: string[];
}): Promise<RuntimeDecisionResult> {
  const {
    data:
      existing,
    error:
      existingError,
  } =
    await admin
      .from(
        "agent_policy_decisions",
      )
      .select(
        `
        id,
        snapshot_id,
        selected_action_key,
        selected_action_version,
        selected_parameters,
        selected_score,
        reasoning_summary
      `,
      )
      .eq(
        "session_id",
        sessionId,
      )
      .eq(
        "decision_mode",
        "runtime",
      )
      .eq(
        "decision_index",
        decisionIndex,
      )
      .maybeSingle();

  if (existingError) {
    throw new Error(
      existingError.message,
    );
  }

  if (existing) {
    return {
      decisionId:
        String(
          existing.id,
        ),

      snapshotId:
        String(
          existing.snapshot_id,
        ),

      selectedActionKey:
        String(
          existing.selected_action_key,
        ),

      selectedActionVersion:
        Number(
          existing.selected_action_version,
        ),

      selectedParameters:
        objectValue(
          existing.selected_parameters,
        ),

      selectedScore:
        Number(
          existing.selected_score,
        ),

      reasoningSummary:
        String(
          existing.reasoning_summary,
        ),
    };
  }

  return runRuleBasedRuntimeDecision({
    admin,
    agentUserId,
    sessionId,
    decisionIndex,
    blockedActionKeys,
  });
}

async function resolveExistingActionRequest({
  admin,
  decisionId,
}: {
  admin: SupabaseClient;
  decisionId: string;
}) {
  const {
    data,
    error,
  } =
    await admin
      .from(
        "agent_action_requests",
      )
      .select(
        `
        id,
        status,
        action_key,
        error_message,
        rejection_code,
        updated_at
      `,
      )
      .eq(
        "policy_decision_id",
        decisionId,
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  return data;
}

async function processOneDecision({
  admin,
  sessionId,
}: {
  admin: SupabaseClient;
  sessionId: string;
}) {
  const session =
    await getSession(
      admin,
      sessionId,
    );

  if (
    session.status !==
    "started"
  ) {
    return {
      attempted: 0,
      completed: 0,
      failed: 0,
      closed: true,
    };
  }

  const agentUserId =
    String(
      session.agent_user_id,
    );

  const [
    {
      data:
        agent,
    },
    {
      data:
        runtime,
    },
    {
      data:
        system,
    },
  ] =
    await Promise.all([
      admin
        .from(
          "agent_profiles",
        )
        .select(
          "lifecycle_status",
        )
        .eq(
          "user_id",
          agentUserId,
        )
        .maybeSingle(),

      admin
        .from(
          "agent_runtime_state",
        )
        .select(
          "execution_enabled",
        )
        .eq(
          "agent_user_id",
          agentUserId,
        )
        .maybeSingle(),

      admin
        .from(
          "agent_system_settings",
        )
        .select(
          "agents_enabled",
        )
        .eq(
          "singleton_key",
          "global",
        )
        .maybeSingle(),
    ]);

  if (
    agent?.lifecycle_status !==
      "active" ||
    runtime?.execution_enabled !==
      true ||
    system?.agents_enabled !==
      true
  ) {
    await closeSession({
      admin,
      sessionId,
      status:
        "cancelled",
      reason:
        "Runtime gate closed before the next session decision.",
    });

    return {
      attempted: 0,
      completed: 0,
      failed: 0,
      closed: true,
    };
  }

  if (
    Number(
      session.attempted_decisions,
    ) >=
    Number(
      session.planned_decisions,
    )
  ) {
    await closeSession({
      admin,
      sessionId,
      status:
        "completed",
      reason:
        Number(
          session.failed_decisions,
        ) > 0
          ? "Session completed with one or more failed decisions."
          : "Session completed successfully.",
    });

    return {
      attempted: 0,
      completed: 0,
      failed: 0,
      closed: true,
    };
  }

  const decisionIndex =
    Number(
      session.attempted_decisions,
    ) + 1;

  const blockedActionKeys =
    stringArray(
      objectValue(
        session.metadata,
      ).blocked_action_keys,
    );

  let decision:
    RuntimeDecisionResult |
    null =
    null;

  try {
    decision =
      await getOrCreateRuntimeDecision({
        admin,
        agentUserId,
        sessionId,
        decisionIndex,
        blockedActionKeys,
      });

    /*
     * Observation + policy selection may take several seconds.
     *
     * The administrator can press Stop while that work is running. Re-read
     * the live runtime/session gates before creating, validating or executing
     * anything from the decision.
     */
    const postDecisionGate =
      await getRuntimeGateState({
        admin,
        sessionId,
        agentUserId,
      });

    if (
      !postDecisionGate.open
    ) {
      /*
       * If the Stop RPC already closed the session, leave it alone.
       * If another gate was closed but the session itself is still started,
       * cancel it here.
       */
      if (
        postDecisionGate.sessionStatus ===
        "started"
      ) {
        await closeSession({
          admin,
          sessionId,
          status:
            "cancelled",
          reason:
            `Runtime gate closed after observation/policy: ${postDecisionGate.reason}.`,
        });
      }

      return {
        attempted: 0,
        completed: 0,
        failed: 0,
        closed: true,
      };
    }

    if (
      decision.selectedActionKey ===
      "system.wait"
    ) {
      await recordDecisionResult({
        admin,
        sessionId,
        decisionId:
          decision.decisionId,
        actionKey:
          decision.selectedActionKey,
        succeeded: true,
        blockAction: false,
      });

      return {
        attempted: 1,
        completed: 1,
        failed: 0,
        closed: false,
      };
    }

    let request =
      await resolveExistingActionRequest({
        admin,
        decisionId:
          decision.decisionId,
      });

    if (!request) {
      const {
        data:
          requestId,
        error:
          requestError,
      } =
        await admin.rpc(
          "agent_create_runtime_action_request",
          {
            p_policy_decision_id:
              decision.decisionId,
          },
        );

      if (
        requestError ||
        !requestId
      ) {
        throw new Error(
          requestError?.message ||
          "Runtime action request could not be created.",
        );
      }

      request =
        await resolveExistingActionRequest({
          admin,
          decisionId:
            decision.decisionId,
        });
    }

    if (!request) {
      throw new Error(
        "Runtime action request disappeared after creation.",
      );
    }

    if (
      request.status ===
      "requested"
    ) {
      const {
        data:
          validationData,
        error:
          validationError,
      } =
        await admin.rpc(
          "agent_validate_runtime_action_request",
          {
            p_action_request_id:
              request.id,
          },
        );

      if (validationError) {
        throw new Error(
          validationError.message,
        );
      }

      const validation =
        objectValue(
          validationData,
        );

      if (
        validation.valid !==
        true
      ) {
        const validationCode =
          String(
            validation.code ||
            "ACTION_VALIDATION_FAILED",
          );

        const message =
          String(
            validation.message ||
            validationCode ||
            "ActionValidatorV1 rejected the action.",
          );

        /*
         * A quiz can be made unavailable by curriculum/admin between the
         * observation snapshot and execution. That is a stale opportunity,
         * not an agent/runtime failure.
         */
        const expectedAvailabilitySkip =
          validationCode ===
          "LEARNING_QUIZ_NOT_LEARNER_VISIBLE";

        if (!expectedAvailabilitySkip) {
          await reportAgentFailure({
            admin,
            agentUserId,
            sessionId,
            actionRequestId:
              String(
                request.id,
              ),
            scope:
              "action",
            severity:
              "error",
            errorCode:
              validationCode,
            message,
            context: {
              phase:
                "3E",
              orchestrator:
                "OrchestratorV1-resumable",
              decisionId:
                decision.decisionId,
              actionKey:
                decision.selectedActionKey,
              validation,
            },
            idempotencyKey:
              `runtime-validation:${request.id}`,
          });
        }

        await recordDecisionResult({
          admin,
          sessionId,
          decisionId:
            decision.decisionId,
          actionKey:
            decision.selectedActionKey,
          succeeded: false,
          blockAction: true,
        });

        return {
          attempted: 1,
          completed: 0,
          failed: 1,
          closed: false,
        };
      }

      request =
        await resolveExistingActionRequest({
          admin,
          decisionId:
            decision.decisionId,
        });
    }

    if (!request) {
      throw new Error(
        "Validated runtime action request was not found.",
      );
    }

    if (
      request.status ===
      "validated"
    ) {
      /*
       * Validation itself can take long enough for an administrator to press
       * Stop. This is the final gate before a real action reaches the
       * execution gateway.
       */
      const preExecutionGate =
        await getRuntimeGateState({
          admin,
          sessionId,
          agentUserId,
        });

      if (
        !preExecutionGate.open
      ) {
        if (
          preExecutionGate.sessionStatus ===
          "started"
        ) {
          await closeSession({
            admin,
            sessionId,
            status:
              "cancelled",
            reason:
              `Runtime gate closed before action execution: ${preExecutionGate.reason}.`,
          });
        }

        return {
          attempted: 0,
          completed: 0,
          failed: 0,
          closed: true,
        };
      }

      const execution =
        await executeValidatedAgentAction({
          admin,
          actionRequestId:
            String(
              request.id,
            ),
        });

      if (!execution.ok) {
        await recordDecisionResult({
          admin,
          sessionId,
          decisionId:
            decision.decisionId,
          actionKey:
            decision.selectedActionKey,
          succeeded: false,
          blockAction: true,
        });

        return {
          attempted: 1,
          completed: 0,
          failed: 1,
          closed: false,
        };
      }

      await recordDecisionResult({
        admin,
        sessionId,
        decisionId:
          decision.decisionId,
        actionKey:
          decision.selectedActionKey,
        succeeded: true,
        blockAction: false,
      });

      return {
        attempted: 1,
        completed: 1,
        failed: 0,
        closed: false,
      };
    }

    if (
      request.status ===
      "succeeded"
    ) {
      await recordDecisionResult({
        admin,
        sessionId,
        decisionId:
          decision.decisionId,
        actionKey:
          decision.selectedActionKey,
        succeeded: true,
        blockAction: false,
      });

      return {
        attempted: 1,
        completed: 1,
        failed: 0,
        closed: false,
      };
    }

    if (
      [
        "failed",
        "rejected",
        "cancelled",
      ].includes(
        String(
          request.status,
        ),
      )
    ) {
      await recordDecisionResult({
        admin,
        sessionId,
        decisionId:
          decision.decisionId,
        actionKey:
          decision.selectedActionKey,
        succeeded: false,
        blockAction: true,
      });

      return {
        attempted: 1,
        completed: 0,
        failed: 1,
        closed: false,
      };
    }

    if (
      request.status ===
      "executing"
    ) {
      const {
        data:
          executionRun,
        error:
          executionRunError,
      } =
        await admin
          .from(
            "agent_action_execution_runs",
          )
          .select(
            "status,started_at,error_message",
          )
          .eq(
            "action_request_id",
            request.id,
          )
          .maybeSingle();

      if (executionRunError) {
        throw new Error(
          executionRunError.message,
        );
      }

      if (
        executionRun?.status ===
        "succeeded"
      ) {
        await recordDecisionResult({
          admin,
          sessionId,
          decisionId:
            decision.decisionId,
          actionKey:
            decision.selectedActionKey,
          succeeded: true,
          blockAction: false,
        });

        return {
          attempted: 1,
          completed: 1,
          failed: 0,
          closed: false,
        };
      }

      if (
        executionRun?.status ===
        "failed"
      ) {
        await recordDecisionResult({
          admin,
          sessionId,
          decisionId:
            decision.decisionId,
          actionKey:
            decision.selectedActionKey,
          succeeded: false,
          blockAction: true,
        });

        return {
          attempted: 1,
          completed: 0,
          failed: 1,
          closed: false,
        };
      }

      const startedAt =
        executionRun?.started_at
          ? new Date(
              String(
                executionRun.started_at,
              ),
            ).getTime()
          : Date.now();

      if (
        Date.now() -
        startedAt >
        10 * 60 * 1000
      ) {
        await admin.rpc(
          "agent_execution_finish_failure",
          {
            p_action_request_id:
              request.id,
            p_error_code:
              "EXECUTION_STALE_TIMEOUT",
            p_error_message:
              "Execution remained in-progress for more than 10 minutes.",
          },
        );

        await reportAgentFailure({
          admin,
          agentUserId,
          sessionId,
          actionRequestId:
            String(
              request.id,
            ),
          scope:
            "action",
          severity:
            "critical",
          errorCode:
            "EXECUTION_STALE_TIMEOUT",
          message:
            "Execution remained in-progress for more than 10 minutes.",
          context: {
            phase:
              "3E",
            decisionId:
              decision.decisionId,
            actionKey:
              decision.selectedActionKey,
          },
          idempotencyKey:
            `execution-stale:${request.id}`,
        });

        await recordDecisionResult({
          admin,
          sessionId,
          decisionId:
            decision.decisionId,
          actionKey:
            decision.selectedActionKey,
          succeeded: false,
          blockAction: true,
        });

        return {
          attempted: 1,
          completed: 0,
          failed: 1,
          closed: false,
        };
      }

      /*
       * A non-stale executing request is left alone for the next tick.
       */
      return {
        attempted: 0,
        completed: 0,
        failed: 0,
        closed: false,
      };
    }

    throw new Error(
      `Unsupported runtime request status: ${request.status}.`,
    );

  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "Runtime decision processing failed.";

    /*
     * There is an unavoidable microscopic race between the final gate read
     * and a database RPC. If Stop closed the session inside that gap, treat
     * the resulting closed-session response as a clean cancellation.
     */
    if (
      isClosedSessionRaceMessage(
        message,
      )
    ) {
      return {
        attempted: 0,
        completed: 0,
        failed: 0,
        closed: true,
      };
    }

    await reportAgentFailure({
      admin,
      agentUserId,
      sessionId,
      actionRequestId:
        null,
      scope:
        "orchestrator",
      severity:
        "critical",
      errorCode:
        "ORCHESTRATOR_DECISION_FAILED",
      message,
      context: {
        phase:
          "3E/3F",
        decisionId:
          decision?.decisionId ||
          null,
        decisionIndex,
        sessionId,
      },
      idempotencyKey:
        `orchestrator-decision:${sessionId}:${decisionIndex}:failure`,
    });

    /*
     * If a durable decision exists, account the failed decision once.
     * If policy creation itself failed, close the whole session instead of
     * inventing a policy result that never existed.
     */
    if (decision) {
      try {
        await recordDecisionResult({
          admin,
          sessionId,
          decisionId:
            decision.decisionId,
          actionKey:
            decision.selectedActionKey,
          succeeded: false,
          blockAction: true,
        });

        return {
          attempted: 1,
          completed: 0,
          failed: 1,
          closed: false,
        };
      } catch {
        // Fall through to session failure below.
      }
    }

    await closeSession({
      admin,
      sessionId,
      status:
        "failed",
      reason:
        message,
    });

    return {
      attempted: 0,
      completed: 0,
      failed: 1,
      closed: true,
    };
  }
}

function shardForAgent(
  agentUserId: string,
  shardCount: number,
) {
  if (shardCount <= 1) {
    return 0;
  }

  const digest =
    createHash(
      "sha256",
    )
      .update(
        agentUserId,
      )
      .digest();

  return (
    digest.readUInt32BE(
      0,
    ) %
    shardCount
  );
}

async function closeCompletedStartedSessions(
  admin: SupabaseClient,
  shardIndex: number,
  shardCount: number,
) {
  const {
    data:
      sessions,
    error,
  } =
    await admin
      .from(
        "agent_run_sessions",
      )
      .select(
        "id,agent_user_id,planned_decisions,attempted_decisions,failed_decisions",
      )
      .eq(
        "status",
        "started",
      );

  if (error) {
    throw new Error(
      error.message,
    );
  }

  for (
    const session
    of sessions ||
    []
  ) {
    if (
      shardForAgent(
        String(
          session.agent_user_id,
        ),
        shardCount,
      ) !==
      shardIndex
    ) {
      continue;
    }

    if (
      Number(
        session.attempted_decisions,
      ) >=
      Number(
        session.planned_decisions,
      )
    ) {
      await closeSession({
        admin,
        sessionId:
          String(
            session.id,
          ),
        status:
          "completed",
        reason:
          Number(
            session.failed_decisions,
          ) > 0
            ? "Session completed with one or more failed decisions."
            : "Session completed successfully.",
      });
    }
  }
}

export async function runAgentOrchestratorTick({
  admin:
    suppliedAdmin,
  triggerSource =
    "scheduler",
  maxDecisionsPerTick =
    2,
  shardIndex =
    0,
  shardCount =
    1,
}: {
  admin?: SupabaseClient;
  triggerSource?:
    | "scheduler"
    | "admin"
    | "system"
    | "test";
  maxDecisionsPerTick?:
    number;
  shardIndex?:
    number;
  shardCount?:
    number;
} = {}): Promise<OrchestratorTickSummary> {
  const admin =
    suppliedAdmin ||
    createAdminClient();

  const safeShardCount =
    Math.max(
      1,
      Math.min(
        32,
        Math.floor(
          Number.isFinite(
            shardCount,
          )
            ? shardCount
            : 1,
        ),
      ),
    );

  const safeShardIndex =
    Math.max(
      0,
      Math.min(
        safeShardCount - 1,
        Math.floor(
          Number.isFinite(
            shardIndex,
          )
            ? shardIndex
            : 0,
        ),
      ),
    );

  const leaseToken =
    randomUUID();

  const useShardLease =
    safeShardCount >
    1;

  const {
    data:
      leaseClaimed,
    error:
      leaseError,
  } =
    await admin.rpc(
      useShardLease
        ? "agent_claim_orchestrator_shard_lease"
        : "agent_claim_orchestrator_lease",
      useShardLease
        ? {
            p_shard_index:
              safeShardIndex,
            p_shard_count:
              safeShardCount,
            p_lease_token:
              leaseToken,
            p_ttl_seconds:
              240,
          }
        : {
            p_lease_token:
              leaseToken,
            p_ttl_seconds:
              240,
          },
    );

  if (leaseError) {
    throw new Error(
      leaseError.message,
    );
  }

  if (
    leaseClaimed !==
    true
  ) {
    return {
      ok: true,
      skipped: true,
      reason:
        useShardLease
          ? `Another orchestrator tick currently owns shard ${safeShardIndex}/${safeShardCount}.`
          : "Another orchestrator tick currently owns the runtime lease.",
      agentsConsidered: 0,
      sessionsClaimed: 0,
      sessionsCompleted: 0,
      decisionsAttempted: 0,
      decisionsCompleted: 0,
      decisionsFailed: 0,
    };
  }

  let tickId:
    string |
    null =
    null;

  const summary:
    OrchestratorTickSummary =
    {
      ok: true,
      skipped: false,
      agentsConsidered: 0,
      sessionsClaimed: 0,
      sessionsCompleted: 0,
      decisionsAttempted: 0,
      decisionsCompleted: 0,
      decisionsFailed: 0,
    };

  try {
    const [
      {
        data:
          runtimeSettings,
        error:
          runtimeError,
      },
      {
        data:
          systemSettings,
        error:
          systemError,
      },
    ] =
      await Promise.all([
        admin
          .from(
            "agent_runtime_settings",
          )
          .select(
            `
            phase,
            pilot_key,
            activation_unlocked,
            simulation_epoch_at,
            simulation_day_duration_minutes,
            min_sessions_per_sim_day,
            max_sessions_per_sim_day,
            min_decisions_per_session,
            max_decisions_per_session
          `,
          )
          .eq(
            "singleton_key",
            "global",
          )
          .maybeSingle(),

        admin
          .from(
            "agent_system_settings",
          )
          .select(
            "agents_enabled",
          )
          .eq(
            "singleton_key",
            "global",
          )
          .maybeSingle(),
      ]);

    if (
      runtimeError ||
      !runtimeSettings
    ) {
      throw new Error(
        runtimeError?.message ||
        "Runtime settings missing.",
      );
    }

    if (
      systemError ||
      !systemSettings
    ) {
      throw new Error(
        systemError?.message ||
        "Agent system settings missing.",
      );
    }

    if (
      systemSettings.agents_enabled !==
        true ||
      runtimeSettings.activation_unlocked !==
        true ||
      !runtimeSettings.simulation_epoch_at
    ) {
      return {
        ...summary,
        skipped: true,
        reason:
          "Agent runtime activation gates are closed.",
      };
    }

    const clock =
      simulationClock({
        epochIso:
          String(
            runtimeSettings.simulation_epoch_at,
          ),
        simulationDayDurationMinutes:
          Number(
            runtimeSettings.simulation_day_duration_minutes,
          ),
      });

    summary.simulationDayIndex =
      clock.simulationDayIndex;

    summary.minuteInSimulationDay =
      clock.minuteInSimulationDay;

    const {
      data:
        tickRow,
      error:
        tickError,
    } =
      await admin
        .from(
          "agent_orchestrator_ticks",
        )
        .insert({
          trigger_source:
            triggerSource,

          shard_index:
            safeShardIndex,

          shard_count:
            safeShardCount,

          simulation_day_index:
            clock.simulationDayIndex,

          minute_in_simulation_day:
            clock.minuteInSimulationDay,

          status:
            "running",

          metadata: {
            orchestrator:
              "OrchestratorV1-sharded",

            runtimePhase:
              String(
                runtimeSettings.phase ||
                "3E",
              ),

            shardIndex:
              safeShardIndex,

            shardCount:
              safeShardCount,

            maxDecisionsPerTick:
              Math.max(
                1,
                Math.min(
                  4,
                  maxDecisionsPerTick,
                ),
              ),
          },
        })
        .select(
          "id",
        )
        .single();

    if (
      tickError ||
      !tickRow
    ) {
      throw new Error(
        tickError?.message ||
        "Could not create orchestrator tick audit row.",
      );
    }

    tickId =
      String(
        tickRow.id,
      );

    await closeCompletedStartedSessions(
      admin,
      safeShardIndex,
      safeShardCount,
    );

    const maxWork =
      Math.max(
        1,
        Math.min(
          4,
          maxDecisionsPerTick,
        ),
      );

    let workDone =
      0;

    /*
     * Resume existing sessions first.
     *
     * One decision per session per tick keeps the serverless request bounded
     * and gives the global Stop switch frequent opportunities to intervene.
     */
    const {
      data:
        openSessions,
      error:
        openError,
    } =
      await admin
        .from(
          "agent_run_sessions",
        )
        .select(
          "id,agent_user_id,started_at",
        )
        .eq(
          "status",
          "started",
        )
        .order(
          "started_at",
          {
            ascending:
              true,
          },
        );

    if (openError) {
      throw new Error(
        openError.message,
      );
    }

    const shardOpenSessions =
      (
        openSessions ||
        []
      ).filter(
        (
          session,
        ) =>
          shardForAgent(
            String(
              session.agent_user_id,
            ),
            safeShardCount,
          ) ===
          safeShardIndex,
      );

    const touchedSessions =
      new Set<
        string
      >();

    for (
      const openSession
      of shardOpenSessions
    ) {
      if (
        workDone >=
        maxWork
      ) {
        break;
      }

      const result =
        await processOneDecision({
          admin,
          sessionId:
            String(
              openSession.id,
            ),
        });

      touchedSessions.add(
        String(
          openSession.id,
        ),
      );

      summary.decisionsAttempted +=
        result.attempted;

      summary.decisionsCompleted +=
        result.completed;

      summary.decisionsFailed +=
        result.failed;

      if (
        result.attempted >
          0 ||
        result.failed >
          0
      ) {
        workDone +=
          1;
      }
    }

    if (
      workDone <
      maxWork
    ) {
      let runtimeRows: Array<{
        agent_user_id: string;
      }> = [];

      if (
        String(
          runtimeSettings.phase ||
          "3E",
        ) ===
        "3F"
      ) {
        const {
          data:
            populationRows,
          error:
            populationError,
        } =
          await admin
            .from(
              "agent_runtime_population_memberships",
            )
            .select(
              "agent_user_id,activation_order,status,join_simulation_day_index",
            )
            .eq(
              "population_key",
              "phase3-full-100",
            )
            .eq(
              "status",
              "active",
            )
            .lte(
              "join_simulation_day_index",
              clock.simulationDayIndex,
            )
            .order(
              "activation_order",
              {
                ascending:
                  true,
              },
            );

        if (populationError) {
          throw new Error(
            populationError.message,
          );
        }

        runtimeRows =
          (
            populationRows ||
            []
          ).map(
            (
              row,
            ) => ({
              agent_user_id:
                String(
                  row.agent_user_id,
                ),
            }),
          );
      } else {
        const {
          data:
            pilotRows,
          error:
            pilotError,
        } =
          await admin
            .from(
              "agent_pilot_memberships",
            )
            .select(
              "agent_user_id,pilot_order,status",
            )
            .eq(
              "pilot_key",
              runtimeSettings.pilot_key,
            )
            .eq(
              "status",
              "active",
            )
            .order(
              "pilot_order",
              {
                ascending:
                  true,
              },
            );

        if (pilotError) {
          throw new Error(
            pilotError.message,
          );
        }

        runtimeRows =
          (
            pilotRows ||
            []
          ).map(
            (
              row,
            ) => ({
              agent_user_id:
                String(
                  row.agent_user_id,
                ),
            }),
          );
      }

      const shardRuntimeRows =
        runtimeRows.filter(
          (
            row,
          ) =>
            shardForAgent(
              row.agent_user_id,
              safeShardCount,
            ) ===
            safeShardIndex,
        );

      summary.agentsConsidered =
        shardRuntimeRows.length;

      for (
        const runtimeMember
        of shardRuntimeRows
      ) {
        if (
          workDone >=
          maxWork
        ) {
          break;
        }

        const agentUserId =
          String(
            runtimeMember.agent_user_id,
          );

        const [
          {
            data:
              agent,
          },
          {
            data:
              state,
          },
          {
            data:
              openForAgent,
          },
        ] =
          await Promise.all([
            admin
              .from(
                "agent_profiles",
              )
              .select(
                "lifecycle_status",
              )
              .eq(
                "user_id",
                agentUserId,
              )
              .maybeSingle(),

            admin
              .from(
                "agent_runtime_state",
              )
              .select(
                "execution_enabled",
              )
              .eq(
                "agent_user_id",
                agentUserId,
              )
              .maybeSingle(),

            admin
              .from(
                "agent_run_sessions",
              )
              .select(
                "id",
              )
              .eq(
                "agent_user_id",
                agentUserId,
              )
              .eq(
                "status",
                "started",
              )
              .limit(
                1,
              ),
          ]);

        if (
          agent?.lifecycle_status !==
            "active" ||
          state?.execution_enabled !==
            true ||
          (
            openForAgent ||
            []
          ).length >
            0
        ) {
          continue;
        }

        const plan =
          buildOrchestratorDayPlan({
            agentUserId,

            simulationDayIndex:
              clock.simulationDayIndex,

            simulationDayDurationMinutes:
              Number(
                runtimeSettings.simulation_day_duration_minutes,
              ),

            minSessions:
              Number(
                runtimeSettings.min_sessions_per_sim_day,
              ),

            maxSessions:
              Number(
                runtimeSettings.max_sessions_per_sim_day,
              ),

            minDecisions:
              Number(
                runtimeSettings.min_decisions_per_session,
              ),

            maxDecisions:
              Number(
                runtimeSettings.max_decisions_per_session,
              ),
          });

        const {
          data:
            existingSessions,
          error:
            sessionsError,
        } =
          await admin
            .from(
              "agent_run_sessions",
            )
            .select(
              "session_number",
            )
            .eq(
              "agent_user_id",
              agentUserId,
            )
            .eq(
              "simulation_day_index",
              clock.simulationDayIndex,
            );

        if (sessionsError) {
          throw new Error(
            sessionsError.message,
          );
        }

        const existing =
          new Set(
            (
              existingSessions ||
              []
            ).map(
              (
                row,
              ) =>
                Number(
                  row.session_number,
                ),
            ),
          );

        const due =
          plan.sessions.find(
            (
              session,
            ) =>
              session.dueMinute <=
                clock.minuteInSimulationDay &&
              !existing.has(
                session.sessionNumber,
              ),
          );

        if (!due) {
          continue;
        }

        const {
          data:
            claimData,
          error:
            claimError,
        } =
          await admin.rpc(
            "agent_claim_run_session",
            {
              p_agent_user_id:
                agentUserId,

              p_simulation_day_index:
                clock.simulationDayIndex,

              p_session_number:
                due.sessionNumber,

              p_due_minute:
                due.dueMinute,

              p_planned_decisions:
                due.plannedDecisions,
            },
          );

        if (claimError) {
          throw new Error(
            claimError.message,
          );
        }

        const claim =
          objectValue(
            claimData,
          );

        if (
          claim.claimed !==
            true ||
          !claim.session_id
        ) {
          continue;
        }

        summary.sessionsClaimed +=
          1;

        const claimedSessionId =
          String(
            claim.session_id,
          );

        if (
          touchedSessions.has(
            claimedSessionId,
          )
        ) {
          continue;
        }

        const result =
          await processOneDecision({
            admin,
            sessionId:
              claimedSessionId,
          });

        touchedSessions.add(
          claimedSessionId,
        );

        summary.decisionsAttempted +=
          result.attempted;

        summary.decisionsCompleted +=
          result.completed;

        summary.decisionsFailed +=
          result.failed;

        if (
          result.attempted >
            0 ||
          result.failed >
            0
        ) {
          workDone +=
            1;
        }
      }
    }

    await closeCompletedStartedSessions(
      admin,
      safeShardIndex,
      safeShardCount,
    );

    if (tickId) {
      const {
        data:
          sessionCounts,
      } =
        await admin
          .from(
            "agent_run_sessions",
          )
          .select(
            "status",
          )
          .gte(
            "started_at",
            new Date(
              Date.now() -
              10 * 60 * 1000,
            ).toISOString(),
          );

      summary.sessionsCompleted =
        (
          sessionCounts ||
          []
        ).filter(
          (
            session,
          ) =>
            session.status ===
            "completed",
        ).length;

      await admin
        .from(
          "agent_orchestrator_ticks",
        )
        .update({
          status:
            "completed",

          agents_considered:
            summary.agentsConsidered,

          sessions_claimed:
            summary.sessionsClaimed,

          sessions_completed:
            summary.sessionsCompleted,

          decisions_attempted:
            summary.decisionsAttempted,

          decisions_completed:
            summary.decisionsCompleted,

          decisions_failed:
            summary.decisionsFailed,

          finished_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          tickId,
        );
    }

    return summary;

  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "Orchestrator tick failed.";

    if (tickId) {
      await admin
        .from(
          "agent_orchestrator_ticks",
        )
        .update({
          status:
            "failed",

          error_message:
            message,

          agents_considered:
            summary.agentsConsidered,

          sessions_claimed:
            summary.sessionsClaimed,

          sessions_completed:
            summary.sessionsCompleted,

          decisions_attempted:
            summary.decisionsAttempted,

          decisions_completed:
            summary.decisionsCompleted,

          decisions_failed:
            summary.decisionsFailed,

          finished_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          tickId,
        );
    }

    await reportAgentFailure({
      admin,

      agentUserId:
        null,

      scope:
        "orchestrator",

      severity:
        "critical",

      errorCode:
        "ORCHESTRATOR_TICK_FAILED",

      message,

      context: {
        phase:
          "3E/3F",

        tickId,

        summary,
      },

      idempotencyKey:
        `orchestrator-tick:${tickId || leaseToken}:failure`,
    });

    return {
      ...summary,
      ok: false,
    };

  } finally {
    await admin.rpc(
      useShardLease
        ? "agent_release_orchestrator_shard_lease"
        : "agent_release_orchestrator_lease",

      useShardLease
        ? {
            p_shard_index:
              safeShardIndex,

            p_shard_count:
              safeShardCount,

            p_lease_token:
              leaseToken,
          }
        : {
            p_lease_token:
              leaseToken,
          },
    );
  }
}