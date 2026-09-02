import "server-only";

import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { executeValidatedAgentAction } from "@/lib/agents/execution/gateway";
import { reportAgentFailure } from "@/lib/agents/runtime/failures";
import { buildOrchestratorDayPlan, simulationClock } from "@/lib/agents/orchestrator/schedule";
import { runRuleBasedRuntimeDecision } from "@/lib/agents/orchestrator/runtimePolicy";
import type { OrchestratorTickSummary } from "@/lib/agents/orchestrator/types";

type JsonObject = Record<string, unknown>;

function objectValue(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
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
  const { data, error } = await admin.rpc("agent_record_session_decision_result", {
    p_session_id: sessionId,
    p_policy_decision_id: decisionId,
    p_action_key: actionKey,
    p_succeeded: succeeded,
    p_block_action: blockAction,
  });

  if (error) throw new Error(error.message);
  return objectValue(data);
}

async function closeSession({
  admin,
  sessionId,
  status,
  reason,
}: {
  admin: SupabaseClient;
  sessionId: string;
  status: "completed" | "failed" | "cancelled";
  reason: string;
}) {
  const { error } = await admin.rpc("agent_close_run_session", {
    p_session_id: sessionId,
    p_status: status,
    p_reason: reason,
  });

  if (error) throw new Error(error.message);
}

async function runClaimedSession({
  admin,
  agentUserId,
  sessionId,
  plannedDecisions,
}: {
  admin: SupabaseClient;
  agentUserId: string;
  sessionId: string;
  plannedDecisions: number;
}) {
  const blocked = new Set<string>();
  let attempted = 0;
  let completed = 0;
  let failed = 0;

  try {
    for (let decisionIndex = 1; decisionIndex <= plannedDecisions; decisionIndex += 1) {
      const [{ data: agent }, { data: runtime }, { data: settings }] = await Promise.all([
        admin.from("agent_profiles").select("lifecycle_status").eq("user_id", agentUserId).maybeSingle(),
        admin.from("agent_runtime_state").select("execution_enabled").eq("agent_user_id", agentUserId).maybeSingle(),
        admin.from("agent_system_settings").select("agents_enabled").eq("singleton_key", "global").maybeSingle(),
      ]);

      if (
        agent?.lifecycle_status !== "active" ||
        runtime?.execution_enabled !== true ||
        settings?.agents_enabled !== true
      ) {
        await closeSession({
          admin,
          sessionId,
          status: "cancelled",
          reason: "Runtime gate closed while the session was in progress.",
        });
        return { attempted, completed, failed, cancelled: true };
      }

      const decision = await runRuleBasedRuntimeDecision({
        admin,
        agentUserId,
        sessionId,
        decisionIndex,
        blockedActionKeys: [...blocked],
      });

      attempted += 1;

      if (decision.selectedActionKey === "system.wait") {
        await recordDecisionResult({
          admin,
          sessionId,
          decisionId: decision.decisionId,
          actionKey: decision.selectedActionKey,
          succeeded: true,
          blockAction: false,
        });
        completed += 1;
        continue;
      }

      let actionRequestId: string | null = null;

      try {
        const { data: requestId, error: requestError } = await admin.rpc(
          "agent_create_runtime_action_request",
          { p_policy_decision_id: decision.decisionId },
        );
        if (requestError || !requestId) {
          throw new Error(requestError?.message || "Runtime action request could not be created.");
        }
        actionRequestId = String(requestId);

        const { data: validationData, error: validationError } = await admin.rpc(
          "agent_validate_runtime_action_request",
          { p_action_request_id: actionRequestId },
        );
        if (validationError) throw new Error(validationError.message);

        const validation = objectValue(validationData);
        if (validation.valid !== true) {
          const message = String(validation.message || validation.code || "ActionValidatorV1 rejected the action.");

          await reportAgentFailure({
            admin,
            agentUserId,
            sessionId,
            actionRequestId,
            scope: "action",
            severity: "error",
            errorCode: String(validation.code || "ACTION_VALIDATION_FAILED"),
            message,
            context: {
              phase: "3D+",
              orchestrator: "OrchestratorV1",
              decisionId: decision.decisionId,
              actionKey: decision.selectedActionKey,
              validation,
            },
            idempotencyKey: `runtime-validation:${actionRequestId}`,
          });

          blocked.add(decision.selectedActionKey);
          await recordDecisionResult({
            admin,
            sessionId,
            decisionId: decision.decisionId,
            actionKey: decision.selectedActionKey,
            succeeded: false,
            blockAction: true,
          });
          failed += 1;
          continue;
        }

        const execution = await executeValidatedAgentAction({
          admin,
          actionRequestId,
        });

        if (!execution.ok) {
          blocked.add(decision.selectedActionKey);
          await recordDecisionResult({
            admin,
            sessionId,
            decisionId: decision.decisionId,
            actionKey: decision.selectedActionKey,
            succeeded: false,
            blockAction: true,
          });
          failed += 1;
          continue;
        }

        await recordDecisionResult({
          admin,
          sessionId,
          decisionId: decision.decisionId,
          actionKey: decision.selectedActionKey,
          succeeded: true,
          blockAction: false,
        });
        completed += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Runtime action dispatch failed.";

        await reportAgentFailure({
          admin,
          agentUserId,
          sessionId,
          actionRequestId,
          scope: "orchestrator",
          severity: "error",
          errorCode: "ORCHESTRATOR_ACTION_DISPATCH_FAILED",
          message,
          context: {
            phase: "3D+",
            decisionId: decision.decisionId,
            actionKey: decision.selectedActionKey,
            sessionId,
          },
          idempotencyKey: `orchestrator-dispatch:${decision.decisionId}`,
        });

        blocked.add(decision.selectedActionKey);
        await recordDecisionResult({
          admin,
          sessionId,
          decisionId: decision.decisionId,
          actionKey: decision.selectedActionKey,
          succeeded: false,
          blockAction: true,
        });
        failed += 1;
      }
    }

    await closeSession({
      admin,
      sessionId,
      status: "completed",
      reason: failed > 0 ? "Session completed with one or more failed decisions." : "Session completed successfully.",
    });

    return { attempted, completed, failed, cancelled: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent session failed.";

    try {
      await closeSession({
        admin,
        sessionId,
        status: "failed",
        reason: message,
      });
    } catch {
      // Durable failure reporting below is the primary failure path.
    }

    await reportAgentFailure({
      admin,
      agentUserId,
      sessionId,
      actionRequestId: null,
      scope: "orchestrator",
      severity: "critical",
      errorCode: "ORCHESTRATOR_SESSION_FAILED",
      message,
      context: { phase: "3D+", sessionId, attempted, completed, failed },
      idempotencyKey: `orchestrator-session:${sessionId}:failure`,
    });

    return { attempted, completed, failed: failed + 1, cancelled: false };
  }
}

export async function runAgentOrchestratorTick({
  admin: suppliedAdmin,
  triggerSource = "scheduler",
}: {
  admin?: SupabaseClient;
  triggerSource?: "scheduler" | "admin" | "system" | "test";
} = {}): Promise<OrchestratorTickSummary> {
  const admin = suppliedAdmin || createAdminClient();

  const [{ data: runtimeSettings, error: runtimeError }, { data: systemSettings, error: systemError }] =
    await Promise.all([
      admin
        .from("agent_runtime_settings")
        .select("pilot_key,activation_unlocked,simulation_epoch_at,simulation_day_duration_minutes,min_sessions_per_sim_day,max_sessions_per_sim_day,min_decisions_per_session,max_decisions_per_session")
        .eq("singleton_key", "global")
        .maybeSingle(),
      admin
        .from("agent_system_settings")
        .select("agents_enabled")
        .eq("singleton_key", "global")
        .maybeSingle(),
    ]);

  if (runtimeError || !runtimeSettings) throw new Error(runtimeError?.message || "Runtime settings missing.");
  if (systemError || !systemSettings) throw new Error(systemError?.message || "Agent system settings missing.");

  if (
    systemSettings.agents_enabled !== true ||
    runtimeSettings.activation_unlocked !== true ||
    !runtimeSettings.simulation_epoch_at
  ) {
    return {
      ok: true,
      skipped: true,
      reason: "Agent runtime activation gates are closed.",
      agentsConsidered: 0,
      sessionsClaimed: 0,
      sessionsCompleted: 0,
      decisionsAttempted: 0,
      decisionsCompleted: 0,
      decisionsFailed: 0,
    };
  }

  const clock = simulationClock({
    epochIso: String(runtimeSettings.simulation_epoch_at),
    simulationDayDurationMinutes: Number(runtimeSettings.simulation_day_duration_minutes),
  });

  const { data: tickRow, error: tickError } = await admin
    .from("agent_orchestrator_ticks")
    .insert({
      trigger_source: triggerSource,
      simulation_day_index: clock.simulationDayIndex,
      minute_in_simulation_day: clock.minuteInSimulationDay,
      status: "running",
      metadata: { orchestrator: "OrchestratorV1" },
    })
    .select("id")
    .single();

  if (tickError || !tickRow) throw new Error(tickError?.message || "Could not create orchestrator tick audit row.");
  const tickId = String(tickRow.id);

  const summary: OrchestratorTickSummary = {
    ok: true,
    skipped: false,
    simulationDayIndex: clock.simulationDayIndex,
    minuteInSimulationDay: clock.minuteInSimulationDay,
    agentsConsidered: 0,
    sessionsClaimed: 0,
    sessionsCompleted: 0,
    decisionsAttempted: 0,
    decisionsCompleted: 0,
    decisionsFailed: 0,
  };

  try {
    const { data: pilotRows, error: pilotError } = await admin
      .from("agent_pilot_memberships")
      .select("agent_user_id,pilot_order,status")
      .eq("pilot_key", runtimeSettings.pilot_key)
      .eq("status", "active")
      .order("pilot_order", { ascending: true });

    if (pilotError) throw new Error(pilotError.message);

    const agentIds = (pilotRows || []).map((row) => String(row.agent_user_id));
    const [{ data: agents, error: agentsError }, { data: states, error: statesError }] = await Promise.all([
      admin
        .from("agent_profiles")
        .select("user_id,agent_code,lifecycle_status")
        .in("user_id", agentIds.length > 0 ? agentIds : ["00000000-0000-0000-0000-000000000000"]),
      admin
        .from("agent_runtime_state")
        .select("agent_user_id,execution_enabled")
        .in("agent_user_id", agentIds.length > 0 ? agentIds : ["00000000-0000-0000-0000-000000000000"]),
    ]);

    if (agentsError) throw new Error(agentsError.message);
    if (statesError) throw new Error(statesError.message);

    const agentMap = new Map((agents || []).map((row) => [String(row.user_id), row]));
    const stateMap = new Map((states || []).map((row) => [String(row.agent_user_id), row]));

    for (const pilot of pilotRows || []) {
      const agentUserId = String(pilot.agent_user_id);
      const agent = agentMap.get(agentUserId);
      const state = stateMap.get(agentUserId);

      if (agent?.lifecycle_status !== "active" || state?.execution_enabled !== true) continue;
      summary.agentsConsidered += 1;

      const plan = buildOrchestratorDayPlan({
        agentUserId,
        simulationDayIndex: clock.simulationDayIndex,
        simulationDayDurationMinutes: Number(runtimeSettings.simulation_day_duration_minutes),
        minSessions: Number(runtimeSettings.min_sessions_per_sim_day),
        maxSessions: Number(runtimeSettings.max_sessions_per_sim_day),
        minDecisions: Number(runtimeSettings.min_decisions_per_session),
        maxDecisions: Number(runtimeSettings.max_decisions_per_session),
      });

      const { data: existingSessions, error: sessionsError } = await admin
        .from("agent_run_sessions")
        .select("session_number")
        .eq("agent_user_id", agentUserId)
        .eq("simulation_day_index", clock.simulationDayIndex);

      if (sessionsError) throw new Error(sessionsError.message);
      const existing = new Set((existingSessions || []).map((row) => Number(row.session_number)));

      /* At most one new session per agent per tick prevents catch-up bursts. */
      const due = plan.sessions.find(
        (session) => session.dueMinute <= clock.minuteInSimulationDay && !existing.has(session.sessionNumber),
      );
      if (!due) continue;

      const { data: claimData, error: claimError } = await admin.rpc("agent_claim_run_session", {
        p_agent_user_id: agentUserId,
        p_simulation_day_index: clock.simulationDayIndex,
        p_session_number: due.sessionNumber,
        p_due_minute: due.dueMinute,
        p_planned_decisions: due.plannedDecisions,
      });

      if (claimError) throw new Error(claimError.message);
      const claim = objectValue(claimData);
      if (claim.claimed !== true || !claim.session_id) continue;

      summary.sessionsClaimed += 1;
      const sessionResult = await runClaimedSession({
        admin,
        agentUserId,
        sessionId: String(claim.session_id),
        plannedDecisions: due.plannedDecisions,
      });

      summary.sessionsCompleted += sessionResult.cancelled ? 0 : 1;
      summary.decisionsAttempted += sessionResult.attempted;
      summary.decisionsCompleted += sessionResult.completed;
      summary.decisionsFailed += sessionResult.failed;
    }

    await admin
      .from("agent_orchestrator_ticks")
      .update({
        status: "completed",
        agents_considered: summary.agentsConsidered,
        sessions_claimed: summary.sessionsClaimed,
        sessions_completed: summary.sessionsCompleted,
        decisions_attempted: summary.decisionsAttempted,
        decisions_completed: summary.decisionsCompleted,
        decisions_failed: summary.decisionsFailed,
        finished_at: new Date().toISOString(),
      })
      .eq("id", tickId);

    return summary;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Orchestrator tick failed.";

    await admin
      .from("agent_orchestrator_ticks")
      .update({
        status: "failed",
        error_message: message,
        agents_considered: summary.agentsConsidered,
        sessions_claimed: summary.sessionsClaimed,
        sessions_completed: summary.sessionsCompleted,
        decisions_attempted: summary.decisionsAttempted,
        decisions_completed: summary.decisionsCompleted,
        decisions_failed: summary.decisionsFailed,
        finished_at: new Date().toISOString(),
      })
      .eq("id", tickId);

    await reportAgentFailure({
      admin,
      agentUserId: null,
      scope: "orchestrator",
      severity: "critical",
      errorCode: "ORCHESTRATOR_TICK_FAILED",
      message,
      context: { phase: "3D+", tickId, summary },
      idempotencyKey: `orchestrator-tick:${tickId}:failure`,
    });

    return { ...summary, ok: false };
  }
}
