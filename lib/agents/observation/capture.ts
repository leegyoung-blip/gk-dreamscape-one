import "server-only";

import {
  createHash,
} from "crypto";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  AGENT_WORLD_SNAPSHOT_VERSION,
  FOUNDATION_OBSERVATION_SOURCE_KEYS,
  type AgentObservationSection,
  type AgentWorldObservationSummary,
  type CapturedAgentWorldSnapshot,
  type FoundationObservationSourceKey,
} from "@/lib/agents/observation/types";

type CaptureAgentObservationArgs = {
  admin:
    SupabaseClient;

  agentUserId:
    string;

  initiatedBy:
    string;

  triggerType?:
    "admin" |
    "policy" |
    "scheduler" |
    "system" |
    "test";
};

type SourceVersionRow = {
  id: string;
  source_key: string;
  version: number;
  status: string;
};

function sortForStableJson(
  value: unknown,
): unknown {
  if (
    Array.isArray(
      value,
    )
  ) {
    return value.map(
      sortForStableJson,
    );
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    const source =
      value as Record<
        string,
        unknown
      >;

    const result:
      Record<
        string,
        unknown
      > = {};

    for (
      const key
      of Object.keys(
        source,
      ).sort()
    ) {
      result[key] =
        sortForStableJson(
          source[key],
        );
    }

    return result;
  }

  return value;
}

function stableStringify(
  value: unknown,
) {
  return JSON.stringify(
    sortForStableJson(
      value,
    ),
  );
}

function sha256(
  value: unknown,
) {
  return createHash(
    "sha256",
  )
    .update(
      stableStringify(
        value,
      ),
      "utf8",
    )
    .digest(
      "hex",
    );
}

function numberValue(
  value: unknown,
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

function objectValue(
  value: unknown,
): Record<
  string,
  unknown
> {
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

function makeSection(
  sourceKey:
    FoundationObservationSourceKey,

  sourceVersion:
    number,

  payload:
    Record<
      string,
      unknown
    >,
): AgentObservationSection {
  return {
    source_key:
      sourceKey,

    source_version:
      sourceVersion,

    payload,

    payload_hash:
      sha256(
        payload,
      ),
  };
}

function simulationEntitlementFromTier(
  value: unknown,
) {
  const tier =
    String(
      value ||
      "basic",
    )
      .trim()
      .toLowerCase();

  const complete =
    tier ===
    "complete";

  const core =
    complete ||
    tier ===
    "core";

  return {
    simulationAccess:
      true,

    simulationAccessTier:
      tier,

    core,

    science:
      complete,

    businessBuilder:
      complete,

    rewards:
      core,

    /*
     * Simulation entitlement is never a paid subscription.
     */
    anyPaidAccess:
      false,
  };
}

async function markRunFailed(
  admin:
    SupabaseClient,

  runId:
    string,

  errorMessage:
    string,
) {
  const {
    error,
  } =
    await admin
      .from(
        "agent_observation_runs",
      )
      .update({
        status:
          "failed",

        error_message:
          errorMessage,

        finished_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        runId,
      );

  if (error) {
    console.error(
      "Could not mark observation run as failed:",
      error.message,
    );
  }
}

export async function captureAgentWorldObservation({
  admin,
  agentUserId,
  initiatedBy,
  triggerType = "admin",
}: CaptureAgentObservationArgs): Promise<
  CapturedAgentWorldSnapshot
> {
  const observedAt =
    new Date()
      .toISOString();

  /* ===============================================================
     1. VERIFY REGISTERED AGENT
     =============================================================== */

  const [
    agentResult,
    profileResult,
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
          internal_handle,
          natural_name,
          account_role,
          lifecycle_status,
          world_affinity,
          synthetic_age,
          education_system,
          education_level,
          primary_level,
          starting_dt_target,
          starting_dg_target,
          simulation_access_tier,
          public_visibility_override,
          generation_seed,
          seed_version,
          metadata,
          created_at,
          updated_at
        `,
        )
        .eq(
          "user_id",
          agentUserId,
        )
        .maybeSingle(),

      admin
        .from(
          "profiles",
        )
        .select(
          `
          id,
          email,
          username,
          role,
          date_of_birth,
          dream_token_balance,
          dream_gem_balance,
          is_simulation_user
        `,
        )
        .eq(
          "id",
          agentUserId,
        )
        .maybeSingle(),
    ]);

  if (
    agentResult.error
  ) {
    throw new Error(
      `Could not load agent registry state: ${agentResult.error.message}`,
    );
  }

  if (
    profileResult.error
  ) {
    throw new Error(
      `Could not load agent DREAMSCAPE profile: ${profileResult.error.message}`,
    );
  }

  if (
    !agentResult.data ||
    !profileResult.data
  ) {
    throw new Error(
      "Observation target is not a complete DREAMSCAPE agent identity.",
    );
  }

  if (
    profileResult.data
      .is_simulation_user !==
    true
  ) {
    throw new Error(
      "Observation target is not marked as a simulation user.",
    );
  }

  const agent =
    agentResult.data;

  const profile =
    profileResult.data;

  /* ===============================================================
     2. ACTIVE OBSERVATION CONTRACTS
     =============================================================== */

  const {
    data:
      sourceVersionData,

    error:
      sourceVersionError,
  } =
    await admin
      .from(
        "agent_observation_source_versions",
      )
      .select(
        "id,source_key,version,status",
      )
      .eq(
        "status",
        "active",
      )
      .in(
        "source_key",
        [
          ...FOUNDATION_OBSERVATION_SOURCE_KEYS,
        ],
      );

  if (
    sourceVersionError
  ) {
    throw new Error(
      `Could not load observation contracts: ${sourceVersionError.message}`,
    );
  }

  const sourceVersions =
    (
      sourceVersionData ||
      []
    ) as SourceVersionRow[];

  const sourceVersionMap =
    new Map<
      FoundationObservationSourceKey,
      number
    >();

  for (
    const source
    of sourceVersions
  ) {
    if (
      FOUNDATION_OBSERVATION_SOURCE_KEYS.includes(
        source.source_key as FoundationObservationSourceKey,
      )
    ) {
      sourceVersionMap.set(
        source.source_key as FoundationObservationSourceKey,
        Number(
          source.version,
        ),
      );
    }
  }

  for (
    const sourceKey
    of FOUNDATION_OBSERVATION_SOURCE_KEYS
  ) {
    if (
      !sourceVersionMap.has(
        sourceKey,
      )
    ) {
      throw new Error(
        `Observation contract ${sourceKey} is not active.`,
      );
    }
  }

  /* ===============================================================
     3. START AUDIT RUN
     =============================================================== */

  const {
    data:
      runData,

    error:
      runError,
  } =
    await admin
      .from(
        "agent_observation_runs",
      )
      .insert({
        agent_user_id:
          agentUserId,

        trigger_type:
          triggerType,

        status:
          "started",

        requested_source_keys:
          [
            ...FOUNDATION_OBSERVATION_SOURCE_KEYS,
          ],

        initiated_by:
          initiatedBy,

        metadata: {
          observer_version:
            "WorldObserverV1",

          snapshot_version:
            AGENT_WORLD_SNAPSHOT_VERSION,
        },
      })
      .select(
        "id",
      )
      .single();

  if (
    runError ||
    !runData
  ) {
    throw new Error(
      `Could not start observation run: ${
        runError?.message ||
        "No run was returned."
      }`,
    );
  }

  const runId =
    String(
      runData.id,
    );

  try {
    /* =============================================================
       4. READ ONLY — AGENT OWN STATE
       ============================================================= */

    const [
      personaResult,
      goalsResult,
      membershipsResult,
      policiesResult,
      dtResult,
      dgResult,
      settingsResult,
    ] =
      await Promise.all([
        admin
          .from(
            "agent_personas",
          )
          .select("*")
          .eq(
            "agent_user_id",
            agentUserId,
          )
          .maybeSingle(),

        admin
          .from(
            "agent_goals",
          )
          .select(
            `
            id,
            goal_slot,
            goal_scope,
            goal_type,
            title,
            description,
            priority,
            status,
            source,
            target_data,
            progress_data,
            starts_at,
            due_at,
            completed_at,
            created_at,
            updated_at
          `,
          )
          .eq(
            "agent_user_id",
            agentUserId,
          )
          .eq(
            "status",
            "active",
          )
          .order(
            "priority",
            {
              ascending:
                false,
            },
          ),

        admin
          .from(
            "agent_cohort_memberships",
          )
          .select(
            `
            id,
            cohort_id,
            is_primary,
            joined_at,
            left_at,
            metadata
          `,
          )
          .eq(
            "agent_user_id",
            agentUserId,
          )
          .is(
            "left_at",
            null,
          ),

        admin
          .from(
            "agent_policy_assignments",
          )
          .select(
            `
            id,
            policy_version_id,
            effective_from,
            effective_to,
            assignment_reason,
            config_override,
            created_at
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
          .order(
            "effective_from",
            {
              ascending:
                false,
            },
          )
          .limit(
            1,
          ),

        admin
          .from(
            "dream_token_transactions",
          )
          .select(
            `
            id,
            amount,
            type,
            title,
            token_kind,
            created_at
          `,
          )
          .eq(
            "user_id",
            agentUserId,
          )
          .eq(
            "token_kind",
            "virtual",
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            },
          ),

        admin
          .from(
            "dream_gem_transactions",
          )
          .select(
            `
            id,
            amount,
            type,
            source,
            title,
            description,
            balance_after,
            created_at
          `,
          )
          .eq(
            "user_id",
            agentUserId,
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            },
          ),

        admin
          .from(
            "agent_system_settings",
          )
          .select(
            `
            agents_enabled,
            public_visibility_enabled,
            leaderboard_visibility_enabled,
            exchange_visibility_enabled,
            default_simulation_access_tier,
            updated_at
          `,
          )
          .eq(
            "singleton_key",
            "global",
          )
          .maybeSingle(),
      ]);

    if (
      personaResult.error
    ) {
      throw new Error(
        `Persona observation failed: ${personaResult.error.message}`,
      );
    }

    if (
      goalsResult.error
    ) {
      throw new Error(
        `Goal observation failed: ${goalsResult.error.message}`,
      );
    }

    if (
      membershipsResult.error
    ) {
      throw new Error(
        `Cohort observation failed: ${membershipsResult.error.message}`,
      );
    }

    if (
      policiesResult.error
    ) {
      throw new Error(
        `Policy observation failed: ${policiesResult.error.message}`,
      );
    }

    if (
      dtResult.error
    ) {
      throw new Error(
        `DT observation failed: ${dtResult.error.message}`,
      );
    }

    if (
      dgResult.error
    ) {
      throw new Error(
        `DG observation failed: ${dgResult.error.message}`,
      );
    }

    if (
      settingsResult.error ||
      !settingsResult.data
    ) {
      throw new Error(
        `Agent-system observation failed: ${
          settingsResult.error
            ?.message ||
          "Global settings row is missing."
        }`,
      );
    }

    /* =============================================================
       5. COHORT DETAILS
       ============================================================= */

    const membershipRows =
      membershipsResult.data ||
      [];

    const cohortIds =
      membershipRows
        .map(
          (
            membership,
          ) =>
            String(
              membership.cohort_id,
            ),
        )
        .filter(
          Boolean,
        );

    let cohortRows:
      Record<
        string,
        unknown
      >[] =
        [];

    if (
      cohortIds.length >
      0
    ) {
      const {
        data,
        error,
      } =
        await admin
          .from(
            "agent_cohorts",
          )
          .select(
            `
            id,
            cohort_key,
            name,
            cohort_type,
            description,
            is_active,
            metadata
          `,
          )
          .in(
            "id",
            cohortIds,
          );

      if (error) {
        throw new Error(
          `Cohort detail observation failed: ${error.message}`,
        );
      }

      cohortRows =
        (
          data ||
          []
        ) as Record<
          string,
          unknown
        >[];
    }

    /* =============================================================
       6. POLICY DETAILS
       ============================================================= */

    const policyAssignment =
      (
        policiesResult.data ||
        []
      )[0] ||
      null;

    let policyVersion:
      Record<
        string,
        unknown
      > |
      null =
        null;

    if (
      policyAssignment
        ?.policy_version_id
    ) {
      const {
        data,
        error,
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
            status,
            decision_contract_version,
            description,
            default_config,
            metadata
          `,
          )
          .eq(
            "id",
            policyAssignment
              .policy_version_id,
          )
          .maybeSingle();

      if (error) {
        throw new Error(
          `Policy-version observation failed: ${error.message}`,
        );
      }

      policyVersion =
        data as Record<
          string,
          unknown
        > |
        null;
    }

    /* =============================================================
       7. ECONOMY CONSISTENCY
       ============================================================= */

    const dtRows =
      dtResult.data ||
      [];

    const dgRows =
      dgResult.data ||
      [];

    const dtLedgerBalance =
      dtRows.reduce(
        (
          total,
          row,
        ) =>
          total +
          numberValue(
            row.amount,
          ),
        0,
      );

    const dgLedgerBalance =
      dgRows.reduce(
        (
          total,
          row,
        ) =>
          total +
          numberValue(
            row.amount,
          ),
        0,
      );

    const cachedDt =
      numberValue(
        profile
          .dream_token_balance,
      );

    const cachedDg =
      numberValue(
        profile
          .dream_gem_balance,
      );

    /* =============================================================
       8. BUILD SECTION PAYLOADS
       ============================================================= */

    const sections:
      AgentObservationSection[] =
      [];

    sections.push(
      makeSection(
        "identity.profile",

        sourceVersionMap.get(
          "identity.profile",
        )!,

        {
          userId:
            profile.id,

          email:
            profile.email,

          username:
            profile.username,

          role:
            profile.role,

          dateOfBirth:
            profile.date_of_birth,

          isSimulationUser:
            profile.is_simulation_user,
        },
      ),
    );

    sections.push(
      makeSection(
        "identity.agent",

        sourceVersionMap.get(
          "identity.agent",
        )!,

        {
          userId:
            agent.user_id,

          agentCode:
            agent.agent_code,

          internalHandle:
            agent.internal_handle,

          naturalName:
            agent.natural_name,

          accountRole:
            agent.account_role,

          lifecycleStatus:
            agent.lifecycle_status,

          worldAffinity:
            agent.world_affinity,

          syntheticAge:
            agent.synthetic_age,

          educationSystem:
            agent.education_system,

          educationLevel:
            agent.education_level,

          primaryLevel:
            agent.primary_level,

          simulationAccessTier:
            agent.simulation_access_tier,

          publicVisibilityOverride:
            agent.public_visibility_override,

          seedVersion:
            agent.seed_version,

          metadata:
            objectValue(
              agent.metadata,
            ),
        },
      ),
    );

    sections.push(
      makeSection(
        "identity.persona",

        sourceVersionMap.get(
          "identity.persona",
        )!,

        objectValue(
          personaResult.data,
        ),
      ),
    );

    sections.push(
      makeSection(
        "identity.goals",

        sourceVersionMap.get(
          "identity.goals",
        )!,

        {
          count:
            (
              goalsResult.data ||
              []
            ).length,

          goals:
            goalsResult.data ||
            [],
        },
      ),
    );

    sections.push(
      makeSection(
        "identity.cohort",

        sourceVersionMap.get(
          "identity.cohort",
        )!,

        {
          memberships:
            membershipRows,

          cohorts:
            cohortRows,
        },
      ),
    );

    sections.push(
      makeSection(
        "identity.policy",

        sourceVersionMap.get(
          "identity.policy",
        )!,

        {
          assignment:
            policyAssignment,

          policyVersion,
        },
      ),
    );

    sections.push(
      makeSection(
        "economy.wallet",

        sourceVersionMap.get(
          "economy.wallet",
        )!,

        {
          dt: {
            cachedBalance:
              cachedDt,

            ledgerBalance:
              dtLedgerBalance,

            consistent:
              cachedDt ===
              dtLedgerBalance,
          },

          dg: {
            cachedBalance:
              cachedDg,

            ledgerBalance:
              dgLedgerBalance,

            consistent:
              cachedDg ===
              dgLedgerBalance,
          },
        },
      ),
    );

    sections.push(
      makeSection(
        "economy.recent_transactions",

        sourceVersionMap.get(
          "economy.recent_transactions",
        )!,

        {
          dreamTokens:
            dtRows.slice(
              0,
              20,
            ),

          dreamGems:
            dgRows.slice(
              0,
              20,
            ),
        },
      ),
    );

    sections.push(
      makeSection(
        "access.simulation_entitlement",

        sourceVersionMap.get(
          "access.simulation_entitlement",
        )!,

        simulationEntitlementFromTier(
          agent
            .simulation_access_tier,
        ),
      ),
    );

    sections.push(
      makeSection(
        "system.agent_settings",

        sourceVersionMap.get(
          "system.agent_settings",
        )!,

        {
          agentsEnabled:
            Boolean(
              settingsResult
                .data
                .agents_enabled,
            ),

          publicVisibilityEnabled:
            Boolean(
              settingsResult
                .data
                .public_visibility_enabled,
            ),

          leaderboardVisibilityEnabled:
            Boolean(
              settingsResult
                .data
                .leaderboard_visibility_enabled,
            ),

          exchangeVisibilityEnabled:
            Boolean(
              settingsResult
                .data
                .exchange_visibility_enabled,
            ),

          defaultSimulationAccessTier:
            settingsResult
              .data
              .default_simulation_access_tier,

          updatedAt:
            settingsResult
              .data
              .updated_at,
        },
      ),
    );

    /* =============================================================
       9. SUMMARY + FULL STATE HASH
       ============================================================= */

    const summary:
      AgentWorldObservationSummary =
      {
        agentCode:
          String(
            agent.agent_code,
          ),

        lifecycleStatus:
          String(
            agent.lifecycle_status,
          ),

        worldAffinity:
          String(
            agent.world_affinity,
          ),

        dtBalance:
          cachedDt,

        dgBalance:
          cachedDg,

        activeGoalCount:
          (
            goalsResult.data ||
            []
          ).length,

        simulationAccessTier:
          String(
            agent
              .simulation_access_tier ||
            "basic",
          ),

        engineEnabled:
          Boolean(
            settingsResult
              .data
              .agents_enabled,
          ),

        observedSourceCount:
          sections.length,
      };

    const stateHash =
      sha256({
        snapshotVersion:
          AGENT_WORLD_SNAPSHOT_VERSION,

        agentUserId,

        sections:
          sections.map(
            (
              section,
            ) => ({
              source_key:
                section.source_key,

              source_version:
                section.source_version,

              payload_hash:
                section.payload_hash,
            }),
          ),
      });

    const sourceVersionsObject =
      Object.fromEntries(
        sections.map(
          (
            section,
          ) => [
            section.source_key,
            section.source_version,
          ],
        ),
      );

    /* =============================================================
       10. ATOMIC PERSISTENCE
       ============================================================= */

    const {
      data:
        snapshotId,

      error:
        storeError,
    } =
      await admin.rpc(
        "agent_store_world_snapshot",
        {
          p_agent_user_id:
            agentUserId,

          p_run_id:
            runId,

          p_snapshot_version:
            AGENT_WORLD_SNAPSHOT_VERSION,

          p_observed_at:
            observedAt,

          p_state_hash:
            stateHash,

          p_summary:
            summary,

          p_source_versions:
            sourceVersionsObject,

          p_sections:
            sections,
        },
      );

    if (
      storeError ||
      !snapshotId
    ) {
      throw new Error(
        `Could not store agent world snapshot: ${
          storeError
            ?.message ||
          "Snapshot id was not returned."
        }`,
      );
    }

    return {
      snapshotId:
        String(
          snapshotId,
        ),

      runId,

      agentUserId,

      agentCode:
        String(
          agent.agent_code,
        ),

      observedAt,

      stateHash,

      summary,

      sections,
    };

  } catch (
    observationError
  ) {
    const message =
      observationError instanceof
        Error
        ? observationError.message
        : "Agent world observation failed.";

    await markRunFailed(
      admin,
      runId,
      message,
    );

    throw observationError;
  }
}