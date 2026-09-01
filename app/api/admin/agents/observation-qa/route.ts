import {
  NextResponse,
} from "next/server";

import {
  checkAdminFromRequest,
} from "@/lib/checkAdmin";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  captureAgentWorldObservation,
} from "@/lib/agents/observation/capture";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

const EXPECTED_SOURCE_KEYS = [
  "identity.profile",
  "identity.agent",
  "identity.persona",
  "identity.goals",
  "identity.cohort",
  "identity.policy",
  "economy.wallet",
  "economy.recent_transactions",
  "access.simulation_entitlement",
  "system.agent_settings",
  "nova.learning",
  "nova.knowledge_arena",
  "nova.rover",
  "nova.home",
  "nova.think",
  "milo.categories",
  "milo.exchange",
  "milo.business_builder",
] as const;

function json(
  body: unknown,
  status = 200,
) {
  return NextResponse.json(
    body,
    {
      status,

      headers: {
        "Cache-Control":
          "no-store",
      },
    },
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

async function actionRequestCount(
  admin: ReturnType<
    typeof createAdminClient
  >,
  agentUserId: string,
) {
  const {
    count,
    error,
  } =
    await admin
      .from(
        "agent_action_requests",
      )
      .select(
        "id",
        {
          count:
            "exact",
          head:
            true,
        },
      )
      .eq(
        "agent_user_id",
        agentUserId,
      );

  if (error) {
    throw new Error(
      `Could not count agent action requests: ${error.message}`,
    );
  }

  return count ?? 0;
}

export async function POST(
  request: Request,
) {
  const access =
    await checkAdminFromRequest(
      request,
    );

  if (
    !access.isAdmin ||
    !access.user
  ) {
    return json(
      {
        ok: false,

        error:
          access.error ||
          "Admin access required.",
      },
      403,
    );
  }

  try {
    const body =
      (
        await request
          .json()
          .catch(
            () => ({}),
          )
      ) as {
        agentCode?:
          string;
      };

    const agentCode =
      String(
        body.agentCode ||
        "DSBOT-0001",
      )
        .trim()
        .toUpperCase();

    const admin =
      createAdminClient();

    /* ===============================================================
       1. TARGET + PRE-QA SAFETY STATE
       =============================================================== */

    const {
      data:
        agent,

      error:
        agentError,
    } =
      await admin
        .from(
          "agent_profiles",
        )
        .select(
          `
          user_id,
          agent_code,
          lifecycle_status,
          seed_version
        `,
        )
        .eq(
          "agent_code",
          agentCode,
        )
        .maybeSingle();

    if (
      agentError ||
      !agent
    ) {
      return json(
        {
          ok: false,

          error:
            agentError?.message ||
            `Agent ${agentCode} was not found.`,
        },
        404,
      );
    }

    const agentUserId =
      String(
        agent.user_id,
      );

    if (
      agent.seed_version !==
      "phase1-v1"
    ) {
      throw new Error(
        `${agentCode} is not a Phase 1 seed-population agent.`,
      );
    }

    if (
      agent.lifecycle_status !==
      "dormant"
    ) {
      throw new Error(
        `${agentCode} must remain dormant during Phase 2D.4.`,
      );
    }

    const [
      beforeProfileResult,
      beforeSettingsResult,
      beforeActiveAgentsResult,
      beforeExecutedActionsResult,
    ] =
      await Promise.all([
        admin
          .from(
            "profiles",
          )
          .select(
            `
            id,
            is_simulation_user,
            dream_token_balance,
            dream_gem_balance
          `,
          )
          .eq(
            "id",
            agentUserId,
          )
          .maybeSingle(),

        admin
          .from(
            "agent_system_settings",
          )
          .select(
            `
            agents_enabled,
            public_visibility_enabled,
            leaderboard_visibility_enabled,
            exchange_visibility_enabled
          `,
          )
          .eq(
            "singleton_key",
            "global",
          )
          .maybeSingle(),

        admin
          .from(
            "agent_profiles",
          )
          .select(
            "user_id",
            {
              count:
                "exact",
              head:
                true,
            },
          )
          .eq(
            "lifecycle_status",
            "active",
          ),

        admin
          .from(
            "agent_action_requests",
          )
          .select(
            "id",
            {
              count:
                "exact",
              head:
                true,
            },
          )
          .in(
            "status",
            [
              "executing",
              "succeeded",
            ],
          ),
      ]);

    if (
      beforeProfileResult.error ||
      !beforeProfileResult.data
    ) {
      throw new Error(
        beforeProfileResult.error?.message ||
        "Agent profile could not be loaded.",
      );
    }

    if (
      beforeSettingsResult.error ||
      !beforeSettingsResult.data
    ) {
      throw new Error(
        beforeSettingsResult.error?.message ||
        "Agent system settings could not be loaded.",
      );
    }

    if (
      beforeActiveAgentsResult.error
    ) {
      throw new Error(
        beforeActiveAgentsResult.error.message,
      );
    }

    if (
      beforeExecutedActionsResult.error
    ) {
      throw new Error(
        beforeExecutedActionsResult.error.message,
      );
    }

    if (
      beforeProfileResult.data
        .is_simulation_user !==
      true
    ) {
      throw new Error(
        `${agentCode} is not marked as a simulation user.`,
      );
    }

    const settings =
      beforeSettingsResult.data;

    if (
      settings.agents_enabled ||
      settings.public_visibility_enabled ||
      settings.leaderboard_visibility_enabled ||
      settings.exchange_visibility_enabled
    ) {
      throw new Error(
        "Phase 2D.4 requires all agent engine/public visibility switches to remain off.",
      );
    }

    if (
      (
        beforeActiveAgentsResult.count ??
        0
      ) !== 0
    ) {
      throw new Error(
        "Phase 2D.4 requires zero active agents.",
      );
    }

    if (
      (
        beforeExecutedActionsResult.count ??
        0
      ) !== 0
    ) {
      throw new Error(
        "Phase 2D.4 requires zero executing/succeeded agent action requests.",
      );
    }

    const beforeActionCount =
      await actionRequestCount(
        admin,
        agentUserId,
      );

    const beforeDt =
      numberValue(
        beforeProfileResult.data
          .dream_token_balance,
      );

    const beforeDg =
      numberValue(
        beforeProfileResult.data
          .dream_gem_balance,
      );

    /* ===============================================================
       2. RUN THE REAL 18-SOURCE OBSERVER
       =============================================================== */

    const observation =
      await captureAgentWorldObservation({
        admin,

        agentUserId,

        initiatedBy:
          access.user.id,

        triggerType:
          "test",
      });

    /* ===============================================================
       3. LOAD THE PERSISTED RESULT
       =============================================================== */

    const [
      snapshotResult,
      runResult,
      sectionsResult,
      afterProfileResult,
      afterAgentResult,
      afterSettingsResult,
      afterActiveAgentsResult,
      afterExecutedActionsResult,
    ] =
      await Promise.all([
        admin
          .from(
            "agent_world_snapshots",
          )
          .select(
            `
            id,
            run_id,
            agent_user_id,
            snapshot_version,
            observed_at,
            state_hash,
            is_complete,
            summary,
            source_versions
          `,
          )
          .eq(
            "id",
            observation.snapshotId,
          )
          .maybeSingle(),

        admin
          .from(
            "agent_observation_runs",
          )
          .select(
            `
            id,
            agent_user_id,
            trigger_type,
            status,
            error_message,
            started_at,
            finished_at,
            metadata
          `,
          )
          .eq(
            "id",
            observation.runId,
          )
          .maybeSingle(),

        admin
          .from(
            "agent_world_snapshot_sections",
          )
          .select(
            `
            source_key,
            source_version,
            payload_hash
          `,
          )
          .eq(
            "snapshot_id",
            observation.snapshotId,
          ),

        admin
          .from(
            "profiles",
          )
          .select(
            `
            dream_token_balance,
            dream_gem_balance
          `,
          )
          .eq(
            "id",
            agentUserId,
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
            "agent_system_settings",
          )
          .select(
            `
            agents_enabled,
            public_visibility_enabled,
            leaderboard_visibility_enabled,
            exchange_visibility_enabled
          `,
          )
          .eq(
            "singleton_key",
            "global",
          )
          .maybeSingle(),

        admin
          .from(
            "agent_profiles",
          )
          .select(
            "user_id",
            {
              count:
                "exact",
              head:
                true,
            },
          )
          .eq(
            "lifecycle_status",
            "active",
          ),

        admin
          .from(
            "agent_action_requests",
          )
          .select(
            "id",
            {
              count:
                "exact",
              head:
                true,
            },
          )
          .in(
            "status",
            [
              "executing",
              "succeeded",
            ],
          ),
      ]);

    if (
      snapshotResult.error ||
      !snapshotResult.data
    ) {
      throw new Error(
        snapshotResult.error?.message ||
        "Persisted world snapshot could not be loaded.",
      );
    }

    if (
      runResult.error ||
      !runResult.data
    ) {
      throw new Error(
        runResult.error?.message ||
        "Observation run audit could not be loaded.",
      );
    }

    if (
      sectionsResult.error
    ) {
      throw new Error(
        sectionsResult.error.message,
      );
    }

    if (
      afterProfileResult.error ||
      !afterProfileResult.data
    ) {
      throw new Error(
        afterProfileResult.error?.message ||
        "Post-observation profile could not be loaded.",
      );
    }

    if (
      afterAgentResult.error ||
      !afterAgentResult.data
    ) {
      throw new Error(
        afterAgentResult.error?.message ||
        "Post-observation agent state could not be loaded.",
      );
    }

    if (
      afterSettingsResult.error ||
      !afterSettingsResult.data
    ) {
      throw new Error(
        afterSettingsResult.error?.message ||
        "Post-observation settings could not be loaded.",
      );
    }

    if (
      afterActiveAgentsResult.error
    ) {
      throw new Error(
        afterActiveAgentsResult.error.message,
      );
    }

    if (
      afterExecutedActionsResult.error
    ) {
      throw new Error(
        afterExecutedActionsResult.error.message,
      );
    }

    const afterActionCount =
      await actionRequestCount(
        admin,
        agentUserId,
      );

    const afterDt =
      numberValue(
        afterProfileResult.data
          .dream_token_balance,
      );

    const afterDg =
      numberValue(
        afterProfileResult.data
          .dream_gem_balance,
      );

    const actualSourceKeys =
      (
        sectionsResult.data ||
        []
      )
        .map(
          (
            row,
          ) =>
            String(
              row.source_key,
            ),
        )
        .sort();

    const actualSourceSet =
      new Set(
        actualSourceKeys,
      );

    const missingSourceKeys =
      EXPECTED_SOURCE_KEYS
        .filter(
          (
            sourceKey,
          ) =>
            !actualSourceSet.has(
              sourceKey,
            ),
        );

    const unexpectedSourceKeys =
      actualSourceKeys
        .filter(
          (
            sourceKey,
          ) =>
            !EXPECTED_SOURCE_KEYS
              .includes(
                sourceKey as
                  (typeof EXPECTED_SOURCE_KEYS)[number],
              ),
        );

    const checks = {
      runSucceeded:
        runResult.data.status ===
        "succeeded",

      snapshotComplete:
        snapshotResult.data
          .is_complete ===
        true,

      sectionCountIs18:
        actualSourceKeys.length ===
        EXPECTED_SOURCE_KEYS.length,

      uniqueSectionCountIs18:
        new Set(
          actualSourceKeys,
        ).size ===
        EXPECTED_SOURCE_KEYS.length,

      noMissingSources:
        missingSourceKeys.length ===
        0,

      noUnexpectedSources:
        unexpectedSourceKeys.length ===
        0,

      dreamTokensUnchanged:
        beforeDt ===
        afterDt,

      dreamGemsUnchanged:
        beforeDg ===
        afterDg,

      actionRequestsUnchanged:
        beforeActionCount ===
        afterActionCount,

      agentStillDormant:
        afterAgentResult.data
          .lifecycle_status ===
        "dormant",

      zeroActiveAgents:
        (
          afterActiveAgentsResult.count ??
          0
        ) === 0,

      zeroExecutedActions:
        (
          afterExecutedActionsResult.count ??
          0
        ) === 0,

      engineStillDisabled:
        afterSettingsResult.data
          .agents_enabled ===
        false,

      publicVisibilityStillDisabled:
        afterSettingsResult.data
          .public_visibility_enabled ===
        false,

      leaderboardVisibilityStillDisabled:
        afterSettingsResult.data
          .leaderboard_visibility_enabled ===
        false,

      exchangeVisibilityStillDisabled:
        afterSettingsResult.data
          .exchange_visibility_enabled ===
        false,
    };

    const failedChecks =
      Object.entries(
        checks,
      )
        .filter(
          (
            [, passed],
          ) =>
            !passed,
        )
        .map(
          (
            [name],
          ) =>
            name,
        );

    const phase2D4Pass =
      failedChecks.length ===
      0;

    return json(
      {
        ok:
          phase2D4Pass,

        phase:
          "2D.4",

        agentCode,

        agentUserId,

        phase2D4Pass,

        failedChecks,

        checks,

        snapshot: {
          snapshotId:
            observation.snapshotId,

          runId:
            observation.runId,

          observerSummary:
            observation.summary,

          persistedStatus:
            runResult.data.status,

          observedAt:
            snapshotResult.data
              .observed_at,

          sourceCount:
            actualSourceKeys.length,

          sourceKeys:
            actualSourceKeys,

          missingSourceKeys,

          unexpectedSourceKeys,
        },

        safety: {
          dreamTokens: {
            before:
              beforeDt,

            after:
              afterDt,

            changed:
              beforeDt !==
              afterDt,
          },

          dreamGems: {
            before:
              beforeDg,

            after:
              afterDg,

            changed:
              beforeDg !==
              afterDg,
          },

          actionRequests: {
            before:
              beforeActionCount,

            after:
              afterActionCount,

            changed:
              beforeActionCount !==
              afterActionCount,
          },

          lifecycleStatus:
            afterAgentResult.data
              .lifecycle_status,

          activeAgents:
            afterActiveAgentsResult.count ??
            0,

          executingOrSucceededActions:
            afterExecutedActionsResult.count ??
            0,

          settings:
            afterSettingsResult.data,
        },
      },

      phase2D4Pass
        ? 200
        : 422,
    );

  } catch (
    error
  ) {
    console.error(
      "Phase 2D.4 observation QA failed:",
      error,
    );

    return json(
      {
        ok: false,

        phase:
          "2D.4",

        phase2D4Pass:
          false,

        executionOccurred:
          false,

        error:
          error instanceof Error
            ? error.message
            : "Phase 2D.4 observation QA failed.",
      },
      500,
    );
  }
}
