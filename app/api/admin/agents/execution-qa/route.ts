import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { checkAdminFromRequest } from "@/lib/checkAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { reportAgentFailure } from "@/lib/agents/runtime/failures";
import { buildSyntheticPerformanceProfile } from "@/lib/agents/execution/syntheticPerformance";
import {
  buildKnowledgeArenaPayload,
  buildMiloCategoriesPayload,
  buildNovaLearningPayload,
  buildRoverPayload,
  buildThinkPayload,
} from "@/lib/agents/execution/answerBuilder";
import type { AgentExecutableActionKey } from "@/lib/agents/execution/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type JsonObject = Record<string, unknown>;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function objectValue(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
}

function arrayValue(value: unknown): JsonObject[] {
  return Array.isArray(value)
    ? value.filter((item) => item && typeof item === "object" && !Array.isArray(item)) as JsonObject[]
    : [];
}

function choose<T>(rows: T[], index: number): T | null {
  return rows.length ? rows[Math.abs(index) % rows.length] : null;
}

export async function POST(request: Request) {
  const access = await checkAdminFromRequest(request);
  if (!access.isAdmin || !access.user) {
    return json({ ok: false, error: access.error || "Admin access required." }, 403);
  }

  const admin = createAdminClient();

  try {
    const [settingsResult, runtimeSettingsResult, pilotResult, readinessResult, executionBefore, requestsBefore, activeBefore] = await Promise.all([
      admin.from("agent_system_settings").select("agents_enabled,public_visibility_enabled,leaderboard_visibility_enabled,exchange_visibility_enabled").eq("singleton_key", "global").maybeSingle(),
      admin.from("agent_runtime_settings").select("activation_unlocked,simulation_epoch_at").eq("singleton_key", "global").maybeSingle(),
      admin.from("agent_pilot_memberships").select("agent_user_id,pilot_order,world_affinity,status").eq("pilot_key", "phase3-pilot-10").order("pilot_order", { ascending: true }),
      admin.rpc("agent_get_execution_adapter_readiness"),
      admin.from("agent_action_execution_runs").select("id", { count: "exact", head: true }),
      admin.from("agent_action_requests").select("id", { count: "exact", head: true }),
      admin.from("agent_profiles").select("user_id", { count: "exact", head: true }).eq("lifecycle_status", "active"),
    ]);

    const firstError = settingsResult.error || runtimeSettingsResult.error || pilotResult.error || readinessResult.error || executionBefore.error || requestsBefore.error || activeBefore.error;
    if (firstError) throw new Error(firstError.message);
    if (!settingsResult.data || !runtimeSettingsResult.data) throw new Error("Phase 3 runtime settings are missing.");

    const pilotRows = pilotResult.data || [];
    if (pilotRows.length !== 10) throw new Error(`Expected 10 Phase 3 pilot agents; found ${pilotRows.length}.`);

    const agentIds = pilotRows.map((row) => String(row.agent_user_id));
    const [agentsResult, personasResult, profilesResult, adapterResult] = await Promise.all([
      admin.from("agent_profiles").select("user_id,agent_code,account_role,lifecycle_status,world_affinity,primary_level").in("user_id", agentIds),
      admin.from("agent_personas").select("agent_user_id,archetype").in("agent_user_id", agentIds),
      admin.from("profiles").select("id,dream_token_balance,dream_gem_balance,is_simulation_user").in("id", agentIds),
      admin.from("agent_execution_adapter_versions").select("action_key,adapter_key,status,requires_student_role").eq("version", 1).eq("status", "ready"),
    ]);

    const secondError = agentsResult.error || personasResult.error || profilesResult.error || adapterResult.error;
    if (secondError) throw new Error(secondError.message);

    const agentById = new Map((agentsResult.data || []).map((row) => [String(row.user_id), row]));
    const personaById = new Map((personasResult.data || []).map((row) => [String(row.agent_user_id), row]));
    const profileById = new Map((profilesResult.data || []).map((row) => [String(row.id), row]));
    const adapterByAction = new Map((adapterResult.data || []).map((row) => [String(row.action_key), row]));

    const readiness = objectValue(readinessResult.data);
    const learning = objectValue(readiness.nova_learning);
    const english = arrayValue(learning.english);
    const math = arrayValue(learning.math);
    const knowledge = arrayValue(readiness.nova_knowledge_arena);
    const think = arrayValue(readiness.nova_think);
    const milo = arrayValue(readiness.milo_categories);

    const plans: JsonObject[] = [];

    for (const pilot of pilotRows) {
      const userId = String(pilot.agent_user_id);
      const agent = agentById.get(userId);
      const persona = personaById.get(userId);
      const profile = profileById.get(userId);
      const pilotOrder = Number(pilot.pilot_order);

      if (!agent || !profile) {
        plans.push({ ok: false, pilotOrder, agentUserId: userId, error: "Agent/profile row missing." });
        continue;
      }

      const affinity = String(pilot.world_affinity);
      const accountRole = String(agent.account_role);
      const primaryLevel = agent.primary_level === null ? null : Number(agent.primary_level);

      const levelFilter = (rows: JsonObject[]) => {
        if (primaryLevel === null) return rows;
        const same = rows.filter((row) => Number(row.primary_level) === primaryLevel);
        return same.length ? same : rows;
      };

      const learningPools = [levelFilter(english), levelFilter(math)].filter((rows) => rows.length > 0);
      const learningTarget = learningPools.length ? choose(learningPools[pilotOrder % learningPools.length], pilotOrder) : null;
      const knowledgeTarget = choose(knowledge, pilotOrder);
      const thinkTarget = accountRole === "student" ? choose(think, pilotOrder) : null;
      const miloTarget = choose(milo, pilotOrder);

      type Candidate = { actionKey: AgentExecutableActionKey; target: string; parameters: JsonObject };
      const candidates: Candidate[] = [];

      if (affinity === "milo") {
        if (miloTarget) candidates.push({ actionKey: "milo.categories.attempt_quiz", target: String(miloTarget.category), parameters: { category: String(miloTarget.category) } });
        if (knowledgeTarget) candidates.push({ actionKey: "nova.knowledge_arena.attempt_quiz", target: String(knowledgeTarget.topic), parameters: { topic: String(knowledgeTarget.topic) } });
      } else if (affinity === "both") {
        if (pilotOrder % 3 === 0 && miloTarget) candidates.push({ actionKey: "milo.categories.attempt_quiz", target: String(miloTarget.category), parameters: { category: String(miloTarget.category) } });
        if (pilotOrder % 3 === 1 && knowledgeTarget) candidates.push({ actionKey: "nova.knowledge_arena.attempt_quiz", target: String(knowledgeTarget.topic), parameters: { topic: String(knowledgeTarget.topic) } });
        if (pilotOrder % 3 === 2) candidates.push({ actionKey: "nova.rover.run_challenge", target: "Skyforge Test Track", parameters: { courseId: "skyforge-test-track-01" } });
      } else {
        const mode = pilotOrder % 4;
        if (mode === 0) candidates.push({ actionKey: "nova.rover.run_challenge", target: "Skyforge Test Track", parameters: { courseId: "skyforge-test-track-01" } });
        if (mode === 1 && learningTarget) candidates.push({ actionKey: "nova.learning.attempt_quiz", target: String(learningTarget.title || learningTarget.quiz_id), parameters: { quizId: String(learningTarget.quiz_id) } });
        if (mode === 2 && knowledgeTarget) candidates.push({ actionKey: "nova.knowledge_arena.attempt_quiz", target: String(knowledgeTarget.topic), parameters: { topic: String(knowledgeTarget.topic) } });
        if (mode === 3 && thinkTarget) candidates.push({ actionKey: "nova.think.attempt_activity", target: String(thinkTarget.title || thinkTarget.activity_id), parameters: { activityId: String(thinkTarget.activity_id) } });
      }

      if (!candidates.length) {
        if (miloTarget) candidates.push({ actionKey: "milo.categories.attempt_quiz", target: String(miloTarget.category), parameters: { category: String(miloTarget.category) } });
        else if (knowledgeTarget) candidates.push({ actionKey: "nova.knowledge_arena.attempt_quiz", target: String(knowledgeTarget.topic), parameters: { topic: String(knowledgeTarget.topic) } });
        else if (learningTarget) candidates.push({ actionKey: "nova.learning.attempt_quiz", target: String(learningTarget.title || learningTarget.quiz_id), parameters: { quizId: String(learningTarget.quiz_id) } });
        else candidates.push({ actionKey: "nova.rover.run_challenge", target: "Skyforge Test Track", parameters: { courseId: "skyforge-test-track-01" } });
      }

      const plan = candidates[0];
      const adapter = adapterByAction.get(plan.actionKey);
      if (!adapter) {
        plans.push({ ok: false, pilotOrder, agentCode: String(agent.agent_code), error: `No ready adapter for ${plan.actionKey}.` });
        continue;
      }

      const performance = buildSyntheticPerformanceProfile({
        agentCode: String(agent.agent_code),
        accountRole,
        archetype: persona?.archetype ? String(persona.archetype) : null,
        primaryLevel,
        actionKey: plan.actionKey,
        actionRequestId: `phase3c-qa-${pilotOrder}`,
      });

      let payloadSummary: JsonObject = {};
      if (plan.actionKey === "nova.learning.attempt_quiz") {
        const payload = await buildNovaLearningPayload({ admin, quizId: String(plan.parameters.quizId), performance });
        payloadSummary = { subject: payload.subject, questionCount: payload.questionCount };
      } else if (plan.actionKey === "nova.knowledge_arena.attempt_quiz") {
        const payload = await buildKnowledgeArenaPayload({ admin, topic: String(plan.parameters.topic), performance });
        payloadSummary = { questionCount: payload.answers.length };
      } else if (plan.actionKey === "nova.think.attempt_activity") {
        const payload = await buildThinkPayload({ admin, activityId: String(plan.parameters.activityId), performance });
        payloadSummary = { questionCount: payload.answers.length };
      } else if (plan.actionKey === "milo.categories.attempt_quiz") {
        const payload = await buildMiloCategoriesPayload({ admin, category: String(plan.parameters.category), performance });
        payloadSummary = { questionCount: payload.answers.length, timerSeconds: 20 };
      } else {
        const payload = buildRoverPayload({ performance });
        payloadSummary = { levelId: 1, courseId: payload.courseId };
      }

      plans.push({
        ok: agent.lifecycle_status === "dormant" && profile.is_simulation_user === true,
        pilotOrder,
        agentUserId: userId,
        agentCode: String(agent.agent_code),
        affinity,
        accountRole,
        archetype: persona?.archetype ? String(persona.archetype) : null,
        actionKey: plan.actionKey,
        target: plan.target,
        parameters: plan.parameters,
        adapterKey: String(adapter.adapter_key),
        expectedAccuracyPercent: performance.expectedAccuracyPercent,
        payloadSummary,
        balanceBefore: { dt: Number(profile.dream_token_balance || 0), dg: Number(profile.dream_gem_balance || 0) },
        lifecycleStatus: String(agent.lifecycle_status),
      });
    }

    const [executionAfter, requestsAfter, profilesAfter, activeAfter] = await Promise.all([
      admin.from("agent_action_execution_runs").select("id", { count: "exact", head: true }),
      admin.from("agent_action_requests").select("id", { count: "exact", head: true }),
      admin.from("profiles").select("id,dream_token_balance,dream_gem_balance").in("id", agentIds),
      admin.from("agent_profiles").select("user_id", { count: "exact", head: true }).eq("lifecycle_status", "active"),
    ]);

    const postError = executionAfter.error || requestsAfter.error || profilesAfter.error || activeAfter.error;
    if (postError) throw new Error(postError.message);

    const afterById = new Map((profilesAfter.data || []).map((row) => [String(row.id), row]));
    const balancesUnchanged = plans.every((plan) => {
      if (plan.ok !== true) return false;
      const after = afterById.get(String(plan.agentUserId));
      const before = objectValue(plan.balanceBefore);
      return Boolean(after && Number(after.dream_token_balance || 0) === Number(before.dt || 0) && Number(after.dream_gem_balance || 0) === Number(before.dg || 0));
    });

    const affinityCounts = pilotRows.reduce<Record<string, number>>((acc, row) => {
      const key = String(row.world_affinity);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const actionDistribution = plans.reduce<Record<string, number>>((acc, plan) => {
      if (plan.ok === true && plan.actionKey) {
        const key = String(plan.actionKey);
        acc[key] = (acc[key] || 0) + 1;
      }
      return acc;
    }, {});

    const settings = settingsResult.data;
    const runtimeSettings = runtimeSettingsResult.data;
    const checks = {
      pilotCount: pilotRows.length === 10,
      affinityDistribution: affinityCounts.nova === 4 && affinityCounts.milo === 3 && affinityCounts.both === 3,
      allTenPrepared: plans.length === 10 && plans.every((plan) => plan.ok === true),
      fiveAdaptersReady: Number(readiness.adapters_ready || 0) === 5,
      agentsRemainDormant: Number(activeBefore.count || 0) === 0 && Number(activeAfter.count || 0) === 0 && plans.every((plan) => plan.lifecycleStatus === "dormant"),
      agentsEnabledOff: settings.agents_enabled === false,
      activationLocked: runtimeSettings.activation_unlocked === false,
      simulationClockOff: runtimeSettings.simulation_epoch_at === null,
      publicVisibilityOff: settings.public_visibility_enabled === false && settings.leaderboard_visibility_enabled === false && settings.exchange_visibility_enabled === false,
      noExecutionRunsCreated: Number(executionBefore.count || 0) === Number(executionAfter.count || 0),
      noActionRequestsCreated: Number(requestsBefore.count || 0) === Number(requestsAfter.count || 0),
      balancesUnchanged,
    };

    const ok = Object.values(checks).every(Boolean);
    return json({ ok, previewOnly: true, executionOccurred: false, pilotSize: 10, affinityCounts, actionDistribution, plans, globalChecks: checks }, ok ? 200 : 422);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Phase 3C execution adapter QA failed.";
    let failureId: string | null = null;
    try {
      const failure = await reportAgentFailure({
        admin,
        agentUserId: null,
        scope: "orchestrator",
        severity: "error",
        errorCode: "PHASE3C_EXECUTION_QA_FAILED",
        message,
        context: { phase: "3C", previewOnly: true, executionOccurred: false },
        idempotencyKey: `phase3c-qa:${randomUUID()}`,
        createdBy: access.user.id,
      });
      failureId = failure.failureId;
    } catch (failureError) {
      console.error("Could not record Phase 3C QA failure:", failureError);
    }

    return json({ ok: false, previewOnly: true, executionOccurred: false, error: message, failureId }, 500);
  }
}
