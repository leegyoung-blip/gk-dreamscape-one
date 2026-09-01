import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { reportAgentFailure } from "@/lib/agents/runtime/failures";
import { AGENT_EXECUTION_ADAPTERS, isAgentExecutableActionKey } from "@/lib/agents/execution/registry";
import { buildSyntheticPerformanceProfile } from "@/lib/agents/execution/syntheticPerformance";
import {
  buildKnowledgeArenaPayload,
  buildMiloCategoriesPayload,
  buildNovaLearningPayload,
  buildRoverPayload,
  buildThinkPayload,
} from "@/lib/agents/execution/answerBuilder";
import type { AgentExecutionResult } from "@/lib/agents/execution/types";

type JsonObject = Record<string, unknown>;

function objectValue(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
}

export async function executeValidatedAgentAction({
  actionRequestId,
  admin: suppliedAdmin,
}: {
  actionRequestId: string;
  admin?: SupabaseClient;
}): Promise<AgentExecutionResult> {
  const admin = suppliedAdmin || createAdminClient();

  const { data: requestRow, error: requestError } = await admin
    .from("agent_action_requests")
    .select("id,agent_user_id,action_key,action_version,status,requested_mode,parameters")
    .eq("id", actionRequestId)
    .maybeSingle();

  if (requestError || !requestRow) {
    throw new Error(requestError?.message || "Agent action request was not found.");
  }

  const actionKey = String(requestRow.action_key || "");
  if (!isAgentExecutableActionKey(actionKey)) {
    throw new Error(`No Phase 3C execution adapter is registered for ${actionKey}.`);
  }

  const agentUserId = String(requestRow.agent_user_id);
  const [{ data: agent, error: agentError }, { data: persona, error: personaError }] = await Promise.all([
    admin
      .from("agent_profiles")
      .select("user_id,agent_code,account_role,primary_level,lifecycle_status")
      .eq("user_id", agentUserId)
      .maybeSingle(),
    admin.from("agent_personas").select("archetype").eq("agent_user_id", agentUserId).maybeSingle(),
  ]);

  if (agentError || !agent) throw new Error(agentError?.message || "Agent registry row was not found.");
  if (personaError) throw new Error(personaError.message);

  const adapter = AGENT_EXECUTION_ADAPTERS[actionKey];
  if (adapter.requiresStudentRole && String(agent.account_role) !== "student") {
    throw new Error(`${actionKey} is restricted to student-role agents in the initial pilot.`);
  }

  const performance = buildSyntheticPerformanceProfile({
    agentCode: String(agent.agent_code),
    accountRole: String(agent.account_role),
    archetype: persona?.archetype ? String(persona.archetype) : null,
    primaryLevel: agent.primary_level === null ? null : Number(agent.primary_level),
    actionKey,
    actionRequestId,
  });

  const parameters = objectValue(requestRow.parameters);

  try {
    let rpcName = "";
    let rpcArgs: JsonObject = {};

    switch (actionKey) {
      case "nova.learning.attempt_quiz": {
        const quizId = String(parameters.quizId || "");
        const payload = await buildNovaLearningPayload({ admin, quizId, performance });
        rpcName = "agent_execute_nova_learning_v1";
        rpcArgs = {
          p_action_request_id: actionRequestId,
          p_subject: payload.subject,
          p_quiz_id: payload.quizId,
          p_answers: payload.answers,
          p_duration_seconds: payload.durationSeconds,
        };
        break;
      }

      case "nova.knowledge_arena.attempt_quiz": {
        const topic = String(parameters.topic || "");
        const payload = await buildKnowledgeArenaPayload({ admin, topic, performance });
        rpcName = "agent_execute_nova_knowledge_arena_v1";
        rpcArgs = {
          p_action_request_id: actionRequestId,
          p_topic: payload.topic,
          p_answers: payload.answers,
        };
        break;
      }

      case "nova.think.attempt_activity": {
        const activityId = String(parameters.activityId || parameters.quizId || "");
        const payload = await buildThinkPayload({ admin, activityId, performance });
        rpcName = "agent_execute_nova_think_v1";
        rpcArgs = {
          p_action_request_id: actionRequestId,
          p_activity_id: payload.activityId,
          p_answers: payload.answers,
          p_duration_seconds: payload.durationSeconds,
        };
        break;
      }

      case "nova.rover.run_challenge": {
        const payload = buildRoverPayload({ performance });
        rpcName = "agent_execute_nova_rover_v1";
        rpcArgs = {
          p_action_request_id: actionRequestId,
          p_score: payload.score,
          p_completion_time_ms: payload.completionTimeMs,
          p_orbs_collected: payload.orbsCollected,
          p_checkpoints_reached: payload.checkpointsReached,
          p_crash_penalty: payload.crashPenalty,
        };
        break;
      }

      case "milo.categories.attempt_quiz": {
        const category = String(parameters.category || "");
        const payload = await buildMiloCategoriesPayload({ admin, category, performance });
        rpcName = "agent_execute_milo_categories_v1";
        rpcArgs = {
          p_action_request_id: actionRequestId,
          p_category: payload.category,
          p_started_at: payload.startedAt,
          p_duration_seconds: payload.durationSeconds,
          p_answers: payload.answers,
        };
        break;
      }
    }

    const { data, error } = await admin.rpc(rpcName, rpcArgs);
    if (error) throw new Error(error.message);

    const result = objectValue(data);
    if (result.ok !== true) {
      const message = String(result.error || "Agent action adapter returned a failure.");
      const failure = await reportAgentFailure({
        admin,
        agentUserId,
        actionRequestId,
        scope: "action",
        severity: "error",
        errorCode: String(result.error_code || "AGENT_ACTION_EXECUTION_FAILED"),
        message,
        context: {
          phase: "3C+",
          actionKey,
          adapterKey: adapter.adapterKey,
          expectedAccuracyPercent: performance.expectedAccuracyPercent,
        },
        idempotencyKey: `agent-action:${actionRequestId}:failure`,
      });

      return { ok: false, actionRequestId, actionKey, failureId: failure.failureId, error: message };
    }

    return {
      ok: true,
      actionRequestId,
      actionKey,
      result: objectValue(result.result || result),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent execution gateway failed.";
    const failure = await reportAgentFailure({
      admin,
      agentUserId,
      actionRequestId,
      scope: "action",
      severity: "critical",
      errorCode: "AGENT_EXECUTION_GATEWAY_FAILED",
      message,
      context: { phase: "3C+", actionKey, adapterKey: adapter.adapterKey },
      idempotencyKey: `agent-action:${actionRequestId}:gateway-failure`,
    });

    return { ok: false, actionRequestId, actionKey, failureId: failure.failureId, error: message };
  }
}
