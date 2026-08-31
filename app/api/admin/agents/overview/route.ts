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
  buildInitialAgentPopulation,
  buildInitialPopulationSummary,
} from "@/lib/agents/initialPopulation";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

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
    Number(value || 0);

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
}

function countBy(
  values: string[],
) {
  return values.reduce<
    Record<string, number>
  >(
    (
      result,
      value,
    ) => {
      result[value] =
        (
          result[value] ||
          0
        ) + 1;

      return result;
    },
    {},
  );
}

export async function GET(
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
    const admin =
      createAdminClient();

    const [
      settingsResult,
      agentResult,
      provisioningResult,
    ] =
      await Promise.all([
        admin
          .from(
            "agent_system_settings",
          )
          .select(
            `
            singleton_key,
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
            created_at,
            updated_at
          `,
          )
          .order(
            "agent_code",
            {
              ascending:
                true,
            },
          ),

        admin
          .from(
            "agent_provisioning_events",
          )
          .select(
            "id",
            {
              count: "exact",
              head: true,
            },
          ),
      ]);

    if (
      settingsResult.error
    ) {
      throw new Error(
        `Could not load agent settings: ${settingsResult.error.message}`,
      );
    }

    if (
      !settingsResult.data
    ) {
      throw new Error(
        "Global agent settings were not found.",
      );
    }

    if (
      agentResult.error
    ) {
      throw new Error(
        `Could not load agent registry: ${agentResult.error.message}`,
      );
    }

    const actualAgents =
      agentResult.data ||
      [];

    const agentIds =
      actualAgents.map(
        (agent) =>
          String(
            agent.user_id,
          ),
      );

    let profileRows:
      Record<string, unknown>[] =
      [];

    let personaRows:
      Record<string, unknown>[] =
      [];

    if (
      agentIds.length > 0
    ) {
      const [
        profilesResult,
        personasResult,
      ] =
        await Promise.all([
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
              dream_token_balance,
              dream_gem_balance,
              is_simulation_user
            `,
            )
            .in(
              "id",
              agentIds,
            ),

          admin
            .from(
              "agent_personas",
            )
            .select(
              `
              agent_user_id,
              archetype
            `,
            )
            .in(
              "agent_user_id",
              agentIds,
            ),
        ]);

      if (
        profilesResult.error
      ) {
        throw new Error(
          `Could not load agent DREAMSCAPE profiles: ${profilesResult.error.message}`,
        );
      }

      if (
        personasResult.error
      ) {
        throw new Error(
          `Could not load agent personas: ${personasResult.error.message}`,
        );
      }

      profileRows =
        (
          profilesResult.data ||
          []
        ) as Record<
          string,
          unknown
        >[];

      personaRows =
        (
          personasResult.data ||
          []
        ) as Record<
          string,
          unknown
        >[];
    }

    const profileById =
      new Map(
        profileRows.map(
          (row) => [
            String(
              row.id,
            ),
            row,
          ],
        ),
      );

    const personaById =
      new Map(
        personaRows.map(
          (row) => [
            String(
              row.agent_user_id,
            ),
            row,
          ],
        ),
      );

    const actualByCode =
      new Map(
        actualAgents.map(
          (agent) => [
            String(
              agent.agent_code,
            ),
            agent,
          ],
        ),
      );

    const planned =
      buildInitialAgentPopulation();

    const plannedSummary =
      buildInitialPopulationSummary(
        planned,
      );

    const plannedCodes =
      new Set(
        planned.map(
          (agent) =>
            agent.agentCode,
        ),
      );

    /*
     * Merge the deterministic Phase 1D population with
     * any real provisioned identities.
     *
     * Before 1G all 100 rows show as "planned".
     */
    const population =
      planned.map(
        (
          specification,
          index,
        ) => {
          const actual =
            actualByCode.get(
              specification
                .agentCode,
            );

          if (!actual) {
            return {
              number:
                index + 1,

              provisioned:
                false,

              userId:
                null,

              agentCode:
                specification
                  .agentCode,

              internalHandle:
                specification
                  .internalHandle,

              naturalName:
                specification
                  .naturalName,

              username:
                specification
                  .username,

              email:
                specification
                  .email,

              accountRole:
                specification
                  .accountRole,

              lifecycleStatus:
                "planned",

              worldAffinity:
                specification
                  .worldAffinity,

              syntheticAge:
                specification
                  .syntheticAge,

              educationSystem:
                specification
                  .educationSystem,

              educationLevel:
                specification
                  .educationLevel,

              primaryLevel:
                specification
                  .primaryLevel,

              archetype:
                specification
                  .persona
                  .archetype,

              startingDtTarget:
                specification
                  .startingDtTarget,

              startingDgTarget:
                specification
                  .startingDgTarget,

              currentDt:
                null,

              currentDg:
                null,

              simulationAccessTier:
                specification
                  .simulationAccessTier,

              publicVisibilityOverride:
                null,
            };
          }

          const userId =
            String(
              actual.user_id,
            );

          const profile =
            profileById.get(
              userId,
            );

          const persona =
            personaById.get(
              userId,
            );

          return {
            number:
              index + 1,

            provisioned:
              true,

            userId,

            agentCode:
              String(
                actual.agent_code,
              ),

            internalHandle:
              String(
                actual.internal_handle,
              ),

            naturalName:
              String(
                actual.natural_name,
              ),

            username:
              String(
                profile
                  ?.username ||
                  specification
                    .username,
              ),

            email:
              String(
                profile
                  ?.email ||
                  specification
                    .email,
              ),

            accountRole:
              String(
                actual.account_role,
              ),

            lifecycleStatus:
              String(
                actual.lifecycle_status,
              ),

            worldAffinity:
              String(
                actual.world_affinity,
              ),

            syntheticAge:
              Number(
                actual.synthetic_age,
              ),

            educationSystem:
              String(
                actual.education_system,
              ),

            educationLevel:
              actual.education_level
                ? String(
                    actual.education_level,
                  )
                : null,

            primaryLevel:
              actual.primary_level ===
                null
                ? null
                : Number(
                    actual.primary_level,
                  ),

            archetype:
              String(
                persona
                  ?.archetype ||
                  specification
                    .persona
                    .archetype,
              ),

            startingDtTarget:
              Number(
                actual.starting_dt_target,
              ),

            startingDgTarget:
              Number(
                actual.starting_dg_target,
              ),

            currentDt:
              numberValue(
                profile
                  ?.dream_token_balance,
              ),

            currentDg:
              numberValue(
                profile
                  ?.dream_gem_balance,
              ),

            simulationAccessTier:
              String(
                actual.simulation_access_tier,
              ),

            publicVisibilityOverride:
              actual.public_visibility_override ??
              null,
          };
        },
      );

    /*
     * Future populations may include agents outside
     * the initial-100 seed.
     */
    const additionalAgents =
      actualAgents
        .filter(
          (agent) =>
            !plannedCodes.has(
              String(
                agent.agent_code,
              ),
            ),
        )
        .map(
          (
            actual,
            index,
          ) => {
            const userId =
              String(
                actual.user_id,
              );

            const profile =
              profileById.get(
                userId,
              );

            const persona =
              personaById.get(
                userId,
              );

            return {
              number:
                planned.length +
                index +
                1,

              provisioned:
                true,

              userId,

              agentCode:
                String(
                  actual.agent_code,
                ),

              internalHandle:
                String(
                  actual.internal_handle,
                ),

              naturalName:
                String(
                  actual.natural_name,
                ),

              username:
                String(
                  profile
                    ?.username ||
                    "",
                ),

              email:
                String(
                  profile
                    ?.email ||
                    "",
                ),

              accountRole:
                String(
                  actual.account_role,
                ),

              lifecycleStatus:
                String(
                  actual.lifecycle_status,
                ),

              worldAffinity:
                String(
                  actual.world_affinity,
                ),

              syntheticAge:
                Number(
                  actual.synthetic_age,
                ),

              educationSystem:
                String(
                  actual.education_system,
                ),

              educationLevel:
                actual.education_level
                  ? String(
                      actual.education_level,
                    )
                  : null,

              primaryLevel:
                actual.primary_level ===
                  null
                  ? null
                  : Number(
                      actual.primary_level,
                    ),

              archetype:
                String(
                  persona
                    ?.archetype ||
                    "unknown",
                ),

              startingDtTarget:
                Number(
                  actual.starting_dt_target,
                ),

              startingDgTarget:
                Number(
                  actual.starting_dg_target,
                ),

              currentDt:
                numberValue(
                  profile
                    ?.dream_token_balance,
                ),

              currentDg:
                numberValue(
                  profile
                    ?.dream_gem_balance,
                ),

              simulationAccessTier:
                String(
                  actual.simulation_access_tier,
                ),

              publicVisibilityOverride:
                actual.public_visibility_override ??
                null,
            };
          },
        );

    const allRows = [
      ...population,
      ...additionalAgents,
    ];

    const lifecycleCounts =
      countBy(
        actualAgents.map(
          (agent) =>
            String(
              agent.lifecycle_status,
            ),
        ),
      );

    const roleCounts =
      countBy(
        actualAgents.map(
          (agent) =>
            String(
              agent.account_role,
            ),
        ),
      );

    const worldCounts =
      countBy(
        actualAgents.map(
          (agent) =>
            String(
              agent.world_affinity,
            ),
        ),
      );

    const currentDt =
      profileRows.reduce(
        (
          total,
          profile,
        ) =>
          total +
          numberValue(
            profile
              .dream_token_balance,
          ),
        0,
      );

    const currentDg =
      profileRows.reduce(
        (
          total,
          profile,
        ) =>
          total +
          numberValue(
            profile
              .dream_gem_balance,
          ),
        0,
      );

    const settings =
      settingsResult.data;

    return json({
      ok: true,

      settings: {
        agentsEnabled:
          Boolean(
            settings
              .agents_enabled,
          ),

        publicVisibilityEnabled:
          Boolean(
            settings
              .public_visibility_enabled,
          ),

        leaderboardVisibilityEnabled:
          Boolean(
            settings
              .leaderboard_visibility_enabled,
          ),

        exchangeVisibilityEnabled:
          Boolean(
            settings
              .exchange_visibility_enabled,
          ),

        defaultSimulationAccessTier:
          String(
            settings
              .default_simulation_access_tier ||
              "complete",
          ),

        updatedAt:
          settings.updated_at,
      },

      summary: {
        planned:
          plannedSummary.total,

        provisioned:
          actualAgents.length,

        remaining:
          Math.max(
            0,
            plannedSummary.total -
              actualAgents.filter(
                (agent) =>
                  plannedCodes.has(
                    String(
                      agent
                        .agent_code,
                    ),
                  ),
              ).length,
          ),

        dormant:
          lifecycleCounts
            .dormant ||
          0,

        active:
          lifecycleCounts
            .active ||
          0,

        paused:
          lifecycleCounts
            .paused ||
          0,

        retired:
          lifecycleCounts
            .retired ||
          0,

        students:
          roleCounts
            .student ||
          0,

        regular:
          roleCounts
            .regular ||
          0,

        nova:
          worldCounts.nova ||
          0,

        milo:
          worldCounts.milo ||
          0,

        both:
          worldCounts.both ||
          0,

        currentDt,
        currentDg,

        provisioningEvents:
          provisioningResult.count ||
          0,
      },

      plannedSummary,

      agents:
        allRows,
    });
  } catch (error) {
    console.error(
      "Agent overview error:",
      error,
    );

    return json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Agent overview could not be loaded.",
      },
      500,
    );
  }
}


/* =====================================================================
   SETTINGS UPDATE

   Phase 1F deliberately DOES NOT expose agents_enabled.

   Activation belongs to Phase 3.

   This endpoint controls public visibility only.
   ===================================================================== */

export async function PATCH(
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
      (await request.json()) as {
        publicVisibilityEnabled?: boolean;
        leaderboardVisibilityEnabled?: boolean;
        exchangeVisibilityEnabled?: boolean;
      };

    const updates:
      Record<
        string,
        unknown
      > = {
      updated_by:
        access.user.id,
    };

    let hasUpdate =
      false;

    if (
      typeof body
        .publicVisibilityEnabled ===
      "boolean"
    ) {
      updates.public_visibility_enabled =
        body.publicVisibilityEnabled;

      hasUpdate =
        true;
    }

    if (
      typeof body
        .leaderboardVisibilityEnabled ===
      "boolean"
    ) {
      updates.leaderboard_visibility_enabled =
        body.leaderboardVisibilityEnabled;

      hasUpdate =
        true;
    }

    if (
      typeof body
        .exchangeVisibilityEnabled ===
      "boolean"
    ) {
      updates.exchange_visibility_enabled =
        body.exchangeVisibilityEnabled;

      hasUpdate =
        true;
    }

    if (!hasUpdate) {
      return json(
        {
          ok: false,
          error:
            "No supported agent setting was supplied.",
        },
        400,
      );
    }

    const admin =
      createAdminClient();

    const {
      data,
      error,
    } =
      await admin
        .from(
          "agent_system_settings",
        )
        .update(
          updates,
        )
        .eq(
          "singleton_key",
          "global",
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
        .single();

    if (error) {
      throw new Error(
        error.message,
      );
    }

    return json({
      ok: true,

      settings: {
        agentsEnabled:
          Boolean(
            data.agents_enabled,
          ),

        publicVisibilityEnabled:
          Boolean(
            data
              .public_visibility_enabled,
          ),

        leaderboardVisibilityEnabled:
          Boolean(
            data
              .leaderboard_visibility_enabled,
          ),

        exchangeVisibilityEnabled:
          Boolean(
            data
              .exchange_visibility_enabled,
          ),

        defaultSimulationAccessTier:
          String(
            data
              .default_simulation_access_tier ||
              "complete",
          ),

        updatedAt:
          data.updated_at,
      },
    });
  } catch (error) {
    console.error(
      "Agent settings update error:",
      error,
    );

    return json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Agent settings could not be updated.",
      },
      500,
    );
  }
}