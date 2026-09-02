import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { checkAdminFromRequest } from "@/lib/checkAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { reportAgentFailure } from "@/lib/agents/runtime/failures";
import { buildOrchestratorDayPlan } from "@/lib/agents/orchestrator/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type JsonObject = Record<string, unknown>;

function objectValue(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const access = await checkAdminFromRequest(request);
  if (!access.isAdmin || !access.user) {
    return json({ ok: false, error: access.error || "Admin access required." }, 403);
  }

  const admin = createAdminClient();

  try {
    const [{ data: readinessData, error: readinessError }, { data: settings, error: settingsError }] =
      await Promise.all([
        admin.rpc("agent_get_orchestrator_readiness"),
        admin
          .from("agent_runtime_settings")
          .select("simulation_day_duration_minutes,min_sessions_per_sim_day,max_sessions_per_sim_day,min_decisions_per_session,max_decisions_per_session")
          .eq("singleton_key", "global")
          .maybeSingle(),
      ]);

    if (readinessError) throw new Error(readinessError.message);
    if (settingsError || !settings) throw new Error(settingsError?.message || "Runtime settings missing.");

    const readiness = objectValue(readinessData);

    const { data: pilotRows, error: pilotError } = await admin
      .from("agent_pilot_memberships")
      .select("agent_user_id,pilot_order,world_affinity,status")
      .eq("pilot_key", "phase3-pilot-10")
      .order("pilot_order", { ascending: true });

    if (pilotError) throw new Error(pilotError.message);
    if ((pilotRows || []).length !== 10) throw new Error(`Expected 10 pilot agents; found ${(pilotRows || []).length}.`);

    const ids = (pilotRows || []).map((row) => String(row.agent_user_id));
    const { data: agents, error: agentsError } = await admin
      .from("agent_profiles")
      .select("user_id,agent_code,natural_name,lifecycle_status,world_affinity")
      .in("user_id", ids);

    if (agentsError) throw new Error(agentsError.message);
    const agentMap = new Map((agents || []).map((row) => [String(row.user_id), row]));

    const beforeCounts = {
      sessions: Number(readiness.run_sessions || 0),
      budgets: Number(readiness.daily_budgets || 0),
      runtimeDecisions: Number(readiness.runtime_policy_decisions || 0),
      requests: Number(readiness.action_requests || 0),
      executions: Number(readiness.execution_runs || 0),
      ticks: Number(readiness.orchestrator_ticks || 0),
    };

    const plans = (pilotRows || []).map((pilot) => {
      const agentUserId = String(pilot.agent_user_id);
      const agent = agentMap.get(agentUserId);
      if (!agent) throw new Error(`Pilot agent ${agentUserId} is missing from agent_profiles.`);

      const plan = buildOrchestratorDayPlan({
        agentUserId,
        simulationDayIndex: 0,
        simulationDayDurationMinutes: Number(settings.simulation_day_duration_minutes),
        minSessions: Number(settings.min_sessions_per_sim_day),
        maxSessions: Number(settings.max_sessions_per_sim_day),
        minDecisions: Number(settings.min_decisions_per_session),
        maxDecisions: Number(settings.max_decisions_per_session),
      });

      const secondPass = buildOrchestratorDayPlan({
        agentUserId,
        simulationDayIndex: 0,
        simulationDayDurationMinutes: Number(settings.simulation_day_duration_minutes),
        minSessions: Number(settings.min_sessions_per_sim_day),
        maxSessions: Number(settings.max_sessions_per_sim_day),
        minDecisions: Number(settings.min_decisions_per_session),
        maxDecisions: Number(settings.max_decisions_per_session),
      });

      return {
        pilotOrder: Number(pilot.pilot_order),
        agentCode: String(agent.agent_code),
        naturalName: String(agent.natural_name),
        worldAffinity: String(pilot.world_affinity),
        lifecycleStatus: String(agent.lifecycle_status),
        deterministic: JSON.stringify(plan) === JSON.stringify(secondPass),
        plan,
      };
    });

    const { data: afterReadinessData, error: afterError } = await admin.rpc("agent_get_orchestrator_readiness");
    if (afterError) throw new Error(afterError.message);
    const after = objectValue(afterReadinessData);

    const afterCounts = {
      sessions: Number(after.run_sessions || 0),
      budgets: Number(after.daily_budgets || 0),
      runtimeDecisions: Number(after.runtime_policy_decisions || 0),
      requests: Number(after.action_requests || 0),
      executions: Number(after.execution_runs || 0),
      ticks: Number(after.orchestrator_ticks || 0),
    };

    const scheduleChecks = {
      tenPlans: plans.length === 10,
      deterministic: plans.every((item) => item.deterministic),
      sessionCountWithinRange: plans.every(
        (item) => item.plan.sessionCount >= Number(settings.min_sessions_per_sim_day) && item.plan.sessionCount <= Number(settings.max_sessions_per_sim_day),
      ),
      decisionCountWithinRange: plans.every((item) =>
        item.plan.sessions.every(
          (session) => session.plannedDecisions >= Number(settings.min_decisions_per_session) && session.plannedDecisions <= Number(settings.max_decisions_per_session),
        ),
      ),
      dueMinutesWithinDay: plans.every((item) =>
        item.plan.sessions.every(
          (session) => session.dueMinute >= 0 && session.dueMinute < Number(settings.simulation_day_duration_minutes),
        ),
      ),
    };

    const safetyChecks = {
      phase3D: readiness.phase === "3D",
      tenDormantPilotAgents: Number(readiness.dormant_pilot_agents || 0) === 10,
      zeroActiveAgents: Number(readiness.active_agents || 0) === 0,
      zeroExecutionEnabledAgents: Number(readiness.execution_enabled_agents || 0) === 0,
      agentsEnabledOff: readiness.agents_enabled === false,
      activationLocked: readiness.activation_unlocked === false,
      simulationClockOff: readiness.simulation_epoch_at === null,
      fiveContractsLocked: Number(readiness.locked_pilot_contracts || 0) === 5,
      fiveAdaptersReady: Number(readiness.ready_adapters || 0) === 5,
      actionRequestSchemaRepaired: Number(readiness.action_request_runtime_columns || 0) === 4,
      runtimeFunctionsReady: Number(readiness.functions_ready || 0) === 7,
      noRuntimeMutationDuringQa: JSON.stringify(beforeCounts) === JSON.stringify(afterCounts),
    };

    const ok = [...Object.values(scheduleChecks), ...Object.values(safetyChecks)].every(Boolean);

    return json({
      ok,
      previewOnly: true,
      executionOccurred: false,
      databaseMutationOccurred: false,
      scheduleChecks,
      safetyChecks,
      plans,
      counts: afterCounts,
    }, ok ? 200 : 422);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Phase 3D orchestrator QA failed.";

    const failure = await reportAgentFailure({
      admin,
      agentUserId: null,
      scope: "orchestrator",
      severity: "error",
      errorCode: "PHASE3D_ORCHESTRATOR_QA_FAILED",
      message,
      context: { phase: "3D", previewOnly: true, executionOccurred: false },
      idempotencyKey: `phase3d-qa:${randomUUID()}`,
      createdBy: access.user.id,
    });

    return json({
      ok: false,
      previewOnly: true,
      executionOccurred: false,
      databaseMutationOccurred: false,
      error: message,
      failureId: failure.failureId,
    }, 500);
  }
}
