import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  storeAgentMemory,
  storeAgentMemoryCheckpoint,
} from "@/lib/agents/memory/store";

function asObject(
  value:
    unknown,
) {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value,
    )
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return {};
}

function numberValue(
  value:
    unknown,
) {
  const parsed =
    Number(
      value ?? 0,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
}

export async function deriveAgentMemoryFromSnapshot({
  admin,
  agentUserId,
  snapshotId,
  createdBy = null,
}: {
  admin:
    SupabaseClient;

  agentUserId:
    string;

  snapshotId:
    string;

  createdBy?:
    string | null;
}) {
  const {
    data:
      snapshot,

    error:
      snapshotError,
  } =
    await admin
      .from(
        "agent_world_snapshots",
      )
      .select(
        `
        id,
        agent_user_id,
        observed_at,
        summary,
        state_hash
      `,
      )
      .eq(
        "id",
        snapshotId,
      )
      .maybeSingle();

  if (
    snapshotError ||
    !snapshot
  ) {
    throw new Error(
      snapshotError?.message ||
      "World snapshot was not found.",
    );
  }

  if (
    String(
      snapshot.agent_user_id,
    ) !==
    agentUserId
  ) {
    throw new Error(
      "World snapshot belongs to another agent.",
    );
  }

  const {
    data:
      sectionRows,

    error:
      sectionError,
  } =
    await admin
      .from(
        "agent_world_snapshot_sections",
      )
      .select(
        `
        source_key,
        payload
      `,
      )
      .eq(
        "snapshot_id",
        snapshotId,
      );

  if (sectionError) {
    throw new Error(
      `Snapshot sections could not be loaded: ${sectionError.message}`,
    );
  }

  const sections =
    new Map<
      string,
      Record<
        string,
        unknown
      >
    >();

  for (
    const row
    of sectionRows ||
      []
  ) {
    sections.set(
      String(
        row.source_key,
      ),

      asObject(
        row.payload,
      ),
    );
  }

  const agent =
    sections.get(
      "identity.agent",
    ) || {};

  const goals =
    sections.get(
      "identity.goals",
    ) || {};

  const wallet =
    sections.get(
      "economy.wallet",
    ) || {};

  const system =
    sections.get(
      "system.agent_settings",
    ) || {};

  const agentCode =
    String(
      agent.agentCode ||
      "Agent",
    );

  const worldAffinity =
    String(
      agent.worldAffinity ||
      "unknown",
    );

  const lifecycle =
    String(
      agent.lifecycleStatus ||
      "unknown",
    );

  const accessTier =
    String(
      agent.simulationAccessTier ||
      "basic",
    );

  const dt =
    asObject(
      wallet.dt,
    );

  const dg =
    asObject(
      wallet.dg,
    );

  const dtBalance =
    numberValue(
      dt.cachedBalance,
    );

  const dgBalance =
    numberValue(
      dg.cachedBalance,
    );

  const goalCount =
    numberValue(
      goals.count,
    );

  const memoryIds:
    string[] =
      [];

  /* =================================================================
     CURRENT AGENT STATE
     ================================================================= */

  memoryIds.push(
    await storeAgentMemory({
      admin,

      agentUserId,

      memoryType:
        "semantic",

      domain:
        "global",

      subjectKey:
        "agent_state",

      summary:
        `${agentCode} currently has ${worldAffinity} world affinity and lifecycle state ${lifecycle}.`,

      content: {
        agentCode,

        worldAffinity,

        lifecycleStatus:
          lifecycle,

        simulationAccessTier:
          accessTier,

        containsHumanPrivateData:
          false,
      },

      importance:
        0.85,

      confidence:
        1,

      valence:
        0,

      sourceType:
        "observation",

      sourceSnapshotId:
        snapshotId,

      dedupeKey:
        "current_agent_state",

      occurredAt:
        snapshot.observed_at,

      createdBy,
    }),
  );

  /* =================================================================
     CURRENT WALLET
     ================================================================= */

  memoryIds.push(
    await storeAgentMemory({
      admin,

      agentUserId,

      memoryType:
        "economic",

      domain:
        "economy",

      subjectKey:
        "wallet",

      summary:
        `${agentCode} currently holds ${dtBalance} DT and ${dgBalance} DG.`,

      content: {
        dreamTokens:
          dtBalance,

        dreamGems:
          dgBalance,

        dtLedgerConsistent:
          Boolean(
            dt.consistent,
          ),

        dgLedgerConsistent:
          Boolean(
            dg.consistent,
          ),

        containsHumanPrivateData:
          false,
      },

      importance:
        0.95,

      confidence:
        1,

      valence:
        0,

      sourceType:
        "observation",

      sourceSnapshotId:
        snapshotId,

      dedupeKey:
        "current_wallet",

      occurredAt:
        snapshot.observed_at,

      createdBy,
    }),
  );

  /* =================================================================
     CURRENT GOALS
     ================================================================= */

  memoryIds.push(
    await storeAgentMemory({
      admin,

      agentUserId,

      memoryType:
        "goal",

      domain:
        "global",

      subjectKey:
        "active_goals",

      summary:
        `${agentCode} currently has ${goalCount} active goal${goalCount === 1 ? "" : "s"}.`,

      content: {
        activeGoalCount:
          goalCount,

        goals:
          Array.isArray(
            goals.goals,
          )
            ? goals.goals
                .slice(
                  0,
                  10,
                )
                .map(
                  (
                    goal,
                  ) => {
                    const item =
                      asObject(
                        goal,
                      );

                    return {
                      goalSlot:
                        item.goal_slot,

                      goalScope:
                        item.goal_scope,

                      goalType:
                        item.goal_type,

                      title:
                        item.title,

                      priority:
                        item.priority,

                      targetData:
                        item.target_data,

                      progressData:
                        item.progress_data,
                    };
                  },
                )
            : [],

        containsHumanPrivateData:
          false,
      },

      importance:
        0.9,

      confidence:
        1,

      valence:
        0,

      sourceType:
        "observation",

      sourceSnapshotId:
        snapshotId,

      dedupeKey:
        "current_goals",

      occurredAt:
        snapshot.observed_at,

      createdBy,
    }),
  );

  /* =================================================================
     SYSTEM STATE
     ================================================================= */

  memoryIds.push(
    await storeAgentMemory({
      admin,

      agentUserId,

      memoryType:
        "system",

      domain:
        "system",

      subjectKey:
        "agent_system",

      summary:
        `Agent engine is ${
          Boolean(
            system.agentsEnabled,
          )
            ? "enabled"
            : "disabled"
        }.`,

      content: {
        agentsEnabled:
          Boolean(
            system.agentsEnabled,
          ),

        publicVisibilityEnabled:
          Boolean(
            system.publicVisibilityEnabled,
          ),

        leaderboardVisibilityEnabled:
          Boolean(
            system.leaderboardVisibilityEnabled,
          ),

        exchangeVisibilityEnabled:
          Boolean(
            system.exchangeVisibilityEnabled,
          ),

        containsHumanPrivateData:
          false,
      },

      importance:
        0.7,

      confidence:
        1,

      valence:
        0,

      sourceType:
        "observation",

      sourceSnapshotId:
        snapshotId,

      dedupeKey:
        "current_agent_system_state",

      occurredAt:
        snapshot.observed_at,

      createdBy,
    }),
  );

  /* =================================================================
     EPISODIC OBSERVATION

     Unlike current-state memories, this is kept as history.
     ================================================================= */

  memoryIds.push(
    await storeAgentMemory({
      admin,

      agentUserId,

      memoryType:
        "episodic",

      domain:
        "global",

      subjectKey:
        "world_observation",

      summary:
        `${agentCode} observed the DREAMSCAPE world with ${dtBalance} DT, ${dgBalance} DG and ${goalCount} active goals.`,

      content: {
        snapshotId,

        snapshotStateHash:
          snapshot.state_hash,

        snapshotSummary:
          asObject(
            snapshot.summary,
          ),

        containsHumanPrivateData:
          false,
      },

      importance:
        0.55,

      confidence:
        1,

      valence:
        0,

      sourceType:
        "observation",

      sourceSnapshotId:
        snapshotId,

      dedupeKey:
        `snapshot:${snapshotId}`,

      occurredAt:
        snapshot.observed_at,

      createdBy,
    }),
  );

  /* =================================================================
     CHECKPOINT
     ================================================================= */

  const checkpointSummary =
    {
      agentCode,

      lifecycleStatus:
        lifecycle,

      worldAffinity,

      simulationAccessTier:
        accessTier,

      economy: {
        dreamTokens:
          dtBalance,

        dreamGems:
          dgBalance,
      },

      activeGoalCount:
        goalCount,

      agentEngineEnabled:
        Boolean(
          system.agentsEnabled,
        ),

      sourceSnapshotId:
        snapshotId,

      generatedAt:
        new Date()
          .toISOString(),
    };

  const checkpoint =
    await storeAgentMemoryCheckpoint({
      admin,

      agentUserId,

      sourceSnapshotId:
        snapshotId,

      summary:
        checkpointSummary,

      memoryIds,

      createdBy,
    });

  return {
    agentUserId,

    snapshotId,

    memoryIds,

    memoryCount:
      memoryIds.length,

    checkpointId:
      checkpoint.checkpointId,

    checkpointStateHash:
      checkpoint.stateHash,

    summary:
      checkpointSummary,
  };
}