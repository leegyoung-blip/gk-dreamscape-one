import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  captureAgentWorldObservation,
} from "@/lib/agents/observation/capture";

import {
  deriveAgentMemoryFromSnapshot,
} from "@/lib/agents/memory/derive";

import {
  recallAgentMemory,
} from "@/lib/agents/memory/recall";

import {
  runRuleBasedPolicyV1,
} from "@/lib/agents/policy/ruleBasedV1";

import type {
  PolicyActionKey,
} from "@/lib/agents/policy/types";

const POLICY_ACTION_KEYS:
  PolicyActionKey[] =
  [
    "system.wait",
    "nova.learning.attempt_quiz",
    "nova.knowledge_arena.attempt_quiz",
    "nova.think.attempt_activity",
    "nova.rover.run_challenge",
    "milo.categories.attempt_quiz",
  ];

export async function previewRuleBasedPolicyV1({
  admin,
  agentUserId,
  initiatedBy,
  decisionIndex = 1,
}: {
  admin:
    SupabaseClient;

  agentUserId:
    string;

  initiatedBy:
    string;

  decisionIndex?:
    number;
}) {
  const [
    agentResult,
    runtimeResult,
    settingsResult,
  ] =
    await Promise.all([
      admin
        .from(
          "agent_profiles",
        )
        .select(
          `
          user_id,
          agent_code,
          lifecycle_status,
          world_affinity
        `,
        )
        .eq(
          "user_id",
          agentUserId,
        )
        .maybeSingle(),

      admin
        .from(
          "agent_runtime_settings",
        )
        .select(
          `
          activation_unlocked,
          simulation_epoch_at
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
    agentResult.error ||
    !agentResult.data
  ) {
    throw new Error(
      agentResult.error?.message ||
      "Policy preview target agent was not found.",
    );
  }

  if (
    runtimeResult.error ||
    !runtimeResult.data
  ) {
    throw new Error(
      runtimeResult.error?.message ||
      "Agent runtime settings are missing.",
    );
  }

  if (
    settingsResult.error ||
    !settingsResult.data
  ) {
    throw new Error(
      settingsResult.error?.message ||
      "Agent system settings are missing.",
    );
  }

  if (
    agentResult.data
      .lifecycle_status !==
    "dormant"
  ) {
    throw new Error(
      "Phase 3B policy preview only supports dormant agents.",
    );
  }

  if (
    runtimeResult.data
      .activation_unlocked ===
      true ||
    runtimeResult.data
      .simulation_epoch_at !==
      null ||
    settingsResult.data
      .agents_enabled ===
      true
  ) {
    throw new Error(
      "Phase 3B preview safety lock failed: activation or runtime is already enabled.",
    );
  }

  const {
    data:
      pilotMembership,

    error:
      pilotError,
  } =
    await admin
      .from(
        "agent_pilot_memberships",
      )
      .select(
        `
        pilot_key,
        pilot_order,
        status
      `,
      )
      .eq(
        "agent_user_id",
        agentUserId,
      )
      .eq(
        "pilot_key",
        "phase3-pilot-10",
      )
      .maybeSingle();

  if (
    pilotError ||
    !pilotMembership
  ) {
    throw new Error(
      pilotError?.message ||
      "Phase 3B policy preview is restricted to the 10-agent pilot.",
    );
  }

  const {
    data:
      assignment,

    error:
      assignmentError,
  } =
    await admin
      .from(
        "agent_policy_assignments",
      )
      .select(
        `
        policy_version_id
      `,
      )
      .eq(
        "agent_user_id",
        agentUserId,
      )
      .is(
        "effective_to",
        null,
      )
      .maybeSingle();

  if (
    assignmentError ||
    !assignment
  ) {
    throw new Error(
      assignmentError?.message ||
      "Current policy assignment was not found.",
    );
  }

  const {
    data:
      policy,

    error:
      policyError,
  } =
    await admin
      .from(
        "agent_policy_versions",
      )
      .select(
        `
        id,
        policy_key,
        version,
        engine_kind,
        status
      `,
      )
      .eq(
        "id",
        assignment
          .policy_version_id,
      )
      .maybeSingle();

  if (
    policyError ||
    !policy
  ) {
    throw new Error(
      policyError?.message ||
      "Assigned policy definition was not found.",
    );
  }

  if (
    policy.policy_key !==
      "rule_based" ||
    Number(
      policy.version,
    ) !== 1 ||
    policy.engine_kind !==
      "rule_based" ||
    policy.status !==
      "active"
  ) {
    throw new Error(
      "Pilot agent is not assigned to active rule_based v1.",
    );
  }

  /*
   * A fresh 18-source observation is captured for each preview.
   * This is read-only DREAMSCAPE world access.
   */
  const observation =
    await captureAgentWorldObservation({
      admin,

      agentUserId,

      initiatedBy,

      triggerType:
        "policy",
    });

  if (
    observation.sections
      .length !== 18
  ) {
    throw new Error(
      `RuleBasedPolicyV1 requires an 18-source snapshot; received ${observation.sections.length}.`,
    );
  }

  /*
   * Refresh compact durable memory before recall.
   */
  await deriveAgentMemoryFromSnapshot({
    admin,

    agentUserId,

    snapshotId:
      observation.snapshotId,

    createdBy:
      initiatedBy,
  });

  const recalled =
    await recallAgentMemory({
      admin,

      agentUserId,

      requestSource:
        "policy",

      createdBy:
        initiatedBy,

      query:
        "goals preferences recent success failure economy learning nova milo rover knowledge think categories",

      limit:
        10,

      minimumImportance:
        0.45,
    });

  const {
    data:
      contracts,

    error:
      contractsError,
  } =
    await admin
      .from(
        "agent_action_contract_versions",
      )
      .select(
        `
        action_key,
        version,
        status,
        execution_mode
      `,
      )
      .eq(
        "version",
        1,
      )
      .in(
        "action_key",
        POLICY_ACTION_KEYS,
      );

  if (
    contractsError
  ) {
    throw new Error(
      contractsError.message,
    );
  }

  const contractStatusByAction =
    Object.fromEntries(
      (
        contracts ||
        []
      ).map(
        (
          contract,
        ) => [
          String(
            contract.action_key,
          ),

          {
            status:
              String(
                contract.status,
              ),

            executionMode:
              String(
                contract.execution_mode,
              ),
          },
        ],
      ),
    );

  const decision =
    runRuleBasedPolicyV1({
      agentUserId,

      agentCode:
        String(
          agentResult.data
            .agent_code,
        ),

      snapshotId:
        observation.snapshotId,

      snapshotStateHash:
        observation.stateHash,

      decisionIndex,

      sections:
        observation.sections,

      recalledMemories:
        recalled.map(
          (
            item,
          ) => ({
            id:
              item.memory.id,

            memoryType:
              item.memory
                .memoryType,

            domain:
              item.memory
                .domain,

            summary:
              item.memory
                .summary,

            content:
              item.memory
                .content,

            score:
              item.score,
          }),
        ),

      contractStatusByAction,
    });

  const {
    data:
      decisionId,

    error:
      storeError,
  } =
    await admin.rpc(
      "agent_store_policy_decision",
      {
        p_agent_user_id:
          agentUserId,

        p_policy_version_id:
          policy.id,

        p_snapshot_id:
          observation.snapshotId,

        p_session_id:
          null,

        p_decision_mode:
          "preview",

        p_decision_index:
          decisionIndex,

        p_selected_action_key:
          decision.selected
            .actionKey,

        p_selected_action_version:
          decision.selected
            .actionVersion,

        p_selected_parameters:
          decision.selected
            .parameters,

        p_selected_score:
          decision.selected
            .score,

        p_candidates:
          decision.candidates,

        p_reasoning_summary:
          decision.reasoningSummary,

        p_policy_input_summary:
          decision.inputSummary,

        p_recalled_memory_ids:
          decision
            .recalledMemoryIds,

        p_created_by:
          initiatedBy,
      },
    );

  if (
    storeError ||
    !decisionId
  ) {
    throw new Error(
      storeError?.message ||
      "Policy preview decision could not be persisted.",
    );
  }

  return {
    decisionId:
      String(
        decisionId,
      ),

    pilotOrder:
      Number(
        pilotMembership
          .pilot_order,
      ),

    observation: {
      snapshotId:
        observation
          .snapshotId,

      sourceCount:
        observation
          .sections
          .length,

      observedAt:
        observation
          .observedAt,
    },

    decision,
  };
}
