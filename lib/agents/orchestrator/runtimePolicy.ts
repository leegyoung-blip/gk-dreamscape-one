import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { captureAgentWorldObservation } from "@/lib/agents/observation/capture";
import { deriveAgentMemoryFromSnapshot } from "@/lib/agents/memory/derive";
import { recallAgentMemory } from "@/lib/agents/memory/recall";
import { runRuleBasedPolicyV1 } from "@/lib/agents/policy/ruleBasedV1";
import type {
  PolicyActionKey,
  PolicyCandidate,
} from "@/lib/agents/policy/types";
import type { RuntimeDecisionResult } from "@/lib/agents/orchestrator/types";

const POLICY_ACTION_KEYS: PolicyActionKey[] = [
  "system.wait",
  "nova.learning.attempt_quiz",
  "nova.knowledge_arena.attempt_quiz",
  "nova.think.attempt_activity",
  "nova.rover.run_challenge",
  "milo.categories.attempt_quiz",
];

function runtimeCandidate(
  candidate: PolicyCandidate,
  contracts: Map<string, { status: string; executionMode: string; adapterKey: string | null }>,
  readyAdapters: Set<string>,
  blocked: Set<string>,
): PolicyCandidate {
  const contract = contracts.get(candidate.actionKey);
  const blockedForSession = blocked.has(candidate.actionKey);

  if (candidate.actionKey === "system.wait") {
    const allowed = candidate.available && contract?.status === "active";
    return allowed
      ? candidate
      : {
          ...candidate,
          available: false,
          reasons: [...candidate.reasons, "system.wait contract is not active"],
        };
  }

  const executable =
    candidate.available &&
    !blockedForSession &&
    contract?.status === "active" &&
    contract.executionMode === "executable" &&
    Boolean(contract.adapterKey && readyAdapters.has(contract.adapterKey));

  if (executable) return candidate;

  const reasons = [...candidate.reasons];
  if (blockedForSession) reasons.push("blocked after an earlier failure in this session");
  if (contract?.status !== "active") reasons.push("runtime contract is not active");
  if (contract?.executionMode !== "executable") reasons.push("runtime contract is not executable");
  if (contract?.adapterKey && !readyAdapters.has(contract.adapterKey)) reasons.push("execution adapter is not ready");

  return {
    ...candidate,
    available: false,
    reasons,
  };
}

export async function runRuleBasedRuntimeDecision({
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
  const [{ data: agent, error: agentError }, { data: assignment, error: assignmentError }] =
    await Promise.all([
      admin
        .from("agent_profiles")
        .select("user_id,agent_code,lifecycle_status")
        .eq("user_id", agentUserId)
        .maybeSingle(),
      admin
        .from("agent_policy_assignments")
        .select("policy_version_id")
        .eq("agent_user_id", agentUserId)
        .is("effective_to", null)
        .maybeSingle(),
    ]);

  if (agentError || !agent) throw new Error(agentError?.message || "Runtime policy agent was not found.");
  if (assignmentError || !assignment) throw new Error(assignmentError?.message || "Runtime policy assignment was not found.");
  if (String(agent.lifecycle_status) !== "active") throw new Error("Runtime policy requires an active agent.");

  const { data: policy, error: policyError } = await admin
    .from("agent_policy_versions")
    .select("id,policy_key,version,engine_kind,status")
    .eq("id", assignment.policy_version_id)
    .maybeSingle();

  if (policyError || !policy) throw new Error(policyError?.message || "Assigned policy definition was not found.");
  if (
    policy.policy_key !== "rule_based" ||
    Number(policy.version) !== 1 ||
    policy.engine_kind !== "rule_based" ||
    policy.status !== "active"
  ) {
    throw new Error("OrchestratorV1 requires active RuleBasedPolicyV1.");
  }

  const observation = await captureAgentWorldObservation({
    admin,
    agentUserId,
    initiatedBy: agentUserId,
    triggerType: "scheduler",
  });

  if (observation.sections.length !== 18) {
    throw new Error(`Runtime policy requires an 18-source snapshot; received ${observation.sections.length}.`);
  }

  await deriveAgentMemoryFromSnapshot({
    admin,
    agentUserId,
    snapshotId: observation.snapshotId,
    createdBy: agentUserId,
  });

  const recalled = await recallAgentMemory({
    admin,
    agentUserId,
    requestSource: "policy",
    createdBy: agentUserId,
    query: "goals preferences recent success failure economy learning nova milo rover knowledge think categories",
    limit: 10,
    minimumImportance: 0.45,
  });

  const [{ data: contracts, error: contractsError }, { data: adapters, error: adaptersError }] =
    await Promise.all([
      admin
        .from("agent_action_contract_versions")
        .select("action_key,version,status,execution_mode,adapter_key")
        .eq("version", 1)
        .in("action_key", POLICY_ACTION_KEYS),
      admin
        .from("agent_execution_adapter_versions")
        .select("adapter_key,status")
        .eq("version", 1)
        .eq("status", "ready"),
    ]);

  if (contractsError) throw new Error(contractsError.message);
  if (adaptersError) throw new Error(adaptersError.message);

  const contractStatusByAction = Object.fromEntries(
    (contracts || []).map((contract) => [
      String(contract.action_key),
      {
        status: String(contract.status),
        executionMode: String(contract.execution_mode),
      },
    ]),
  );

  const baseDecision = runRuleBasedPolicyV1({
    agentUserId,
    agentCode: String(agent.agent_code),
    snapshotId: observation.snapshotId,
    snapshotStateHash: observation.stateHash,
    decisionIndex,
    sections: observation.sections,
    recalledMemories: recalled.map((item) => ({
      id: item.memory.id,
      memoryType: item.memory.memoryType,
      domain: item.memory.domain,
      summary: item.memory.summary,
      content: item.memory.content,
      score: item.score,
    })),
    contractStatusByAction,
  });

  const contractMap = new Map(
    (contracts || []).map((contract) => [
      String(contract.action_key),
      {
        status: String(contract.status),
        executionMode: String(contract.execution_mode),
        adapterKey: contract.adapter_key ? String(contract.adapter_key) : null,
      },
    ]),
  );

  const readyAdapters = new Set((adapters || []).map((adapter) => String(adapter.adapter_key)));
  const blocked = new Set(blockedActionKeys);
  const runtimeCandidates = baseDecision.candidates.map((candidate) =>
    runtimeCandidate(candidate, contractMap, readyAdapters, blocked),
  );

  const selected = runtimeCandidates.find((candidate) => candidate.available);
  if (!selected) throw new Error("RuleBasedPolicyV1 has no runtime-safe action, including system.wait.");

  const reasoningSummary = `${agent.agent_code} selected ${selected.actionKey}${
    selected.targetLabel ? ` targeting ${selected.targetLabel}` : ""
  } with score ${selected.score.toFixed(3)}. OrchestratorV1 removed inactive, non-executable and same-session blocked actions before dispatch.`;

  const { data: decisionId, error: storeError } = await admin.rpc(
    "agent_store_runtime_policy_decision",
    {
      p_agent_user_id: agentUserId,
      p_policy_version_id: policy.id,
      p_snapshot_id: observation.snapshotId,
      p_session_id: sessionId,
      p_decision_index: decisionIndex,
      p_selected_action_key: selected.actionKey,
      p_selected_action_version: selected.actionVersion,
      p_selected_parameters: selected.parameters,
      p_selected_score: selected.score,
      p_candidates: runtimeCandidates,
      p_reasoning_summary: reasoningSummary,
      p_policy_input_summary: {
        ...baseDecision.inputSummary,
        orchestrator: "OrchestratorV1",
        blockedActionKeys: [...blocked],
        executionContractsRequired: true,
      },
      p_recalled_memory_ids: baseDecision.recalledMemoryIds,
    },
  );

  if (storeError || !decisionId) {
    throw new Error(storeError?.message || "Runtime policy decision could not be persisted.");
  }

  return {
    decisionId: String(decisionId),
    snapshotId: observation.snapshotId,
    selectedActionKey: selected.actionKey,
    selectedActionVersion: selected.actionVersion,
    selectedParameters: selected.parameters,
    selectedScore: selected.score,
    reasoningSummary,
  };
}
