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

async function findAuthEmailCollisions(
  admin:
    ReturnType<
      typeof createAdminClient
    >,
  plannedEmails:
    Set<string>,
) {
  const matches:
    string[] = [];

  /*
   * Scan Supabase Auth in pages so an orphaned auth identity is
   * caught even if its public profile was removed previously.
   */
  for (
    let page = 1;
    page <= 100;
    page += 1
  ) {
    const {
      data,
      error,
    } =
      await admin.auth.admin.listUsers({
        page,
        perPage:
          1000,
      });

    if (error) {
      throw new Error(
        `Could not inspect Auth users: ${error.message}`,
      );
    }

    const users =
      data.users ??
      [];

    for (
      const user
      of users
    ) {
      const email =
        String(
          user.email ??
            "",
        )
          .trim()
          .toLowerCase();

      if (
        email &&
        plannedEmails.has(
          email,
        )
      ) {
        matches.push(
          email,
        );
      }
    }

    if (
      users.length <
      1000
    ) {
      break;
    }

    if (
      page === 100
    ) {
      throw new Error(
        "Auth collision scan exceeded 100,000 users. Update the preview scanner before provisioning.",
      );
    }
  }

  return [
    ...new Set(
      matches,
    ),
  ].sort();
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

    /*
     * This performs the full deterministic generation and all
     * local Phase 1D integrity checks.
     */
    const population =
      buildInitialAgentPopulation();

    const summary =
      buildInitialPopulationSummary(
        population,
      );

    const plannedCodes =
      new Set(
        population.map(
          (agent) =>
            agent.agentCode
              .toLowerCase(),
        ),
      );

    const plannedHandles =
      new Set(
        population.map(
          (agent) =>
            agent.internalHandle
              .toLowerCase(),
        ),
      );

    const plannedUsernames =
      new Set(
        population.map(
          (agent) =>
            agent.username
              .toLowerCase(),
        ),
      );

    const plannedEmails =
      new Set(
        population.map(
          (agent) =>
            agent.email
              .toLowerCase(),
        ),
      );

    const [
      existingAgentsResult,
      existingProfilesResult,
      authEmailCollisions,
    ] =
      await Promise.all([
        admin
          .from(
            "agent_profiles",
          )
          .select(
            "agent_code,internal_handle",
          ),

        admin
          .from(
            "profiles",
          )
          .select(
            "id,username",
          )
          .not(
            "username",
            "is",
            null,
          ),

        findAuthEmailCollisions(
          admin,
          plannedEmails,
        ),
      ]);

    if (
      existingAgentsResult.error
    ) {
      throw new Error(
        `Could not inspect existing agents: ${existingAgentsResult.error.message}`,
      );
    }

    if (
      existingProfilesResult.error
    ) {
      throw new Error(
        `Could not inspect existing usernames: ${existingProfilesResult.error.message}`,
      );
    }

    const agentCodeCollisions =
      (
        existingAgentsResult.data ??
        []
      )
        .map(
          (row) =>
            String(
              row.agent_code ??
                "",
            ),
        )
        .filter(
          (value) =>
            plannedCodes.has(
              value.toLowerCase(),
            ),
        )
        .sort();

    const internalHandleCollisions =
      (
        existingAgentsResult.data ??
        []
      )
        .map(
          (row) =>
            String(
              row.internal_handle ??
                "",
            ),
        )
        .filter(
          (value) =>
            plannedHandles.has(
              value.toLowerCase(),
            ),
        )
        .sort();

    const usernameCollisions =
      (
        existingProfilesResult.data ??
        []
      )
        .map(
          (row) =>
            String(
              row.username ??
                "",
            ),
        )
        .filter(
          (value) =>
            plannedUsernames.has(
              value.toLowerCase(),
            ),
        )
        .sort();

    const collisionCount =
      agentCodeCollisions.length +
      internalHandleCollisions.length +
      usernameCollisions.length +
      authEmailCollisions.length;

    return json({
      ok: true,

      populationVersion:
        summary.version,

      readyForFutureProvisioning:
        collisionCount ===
        0,

      summary,

      collisions: {
        total:
          collisionCount,

        agentCodes:
          agentCodeCollisions,

        internalHandles:
          internalHandleCollisions,

        usernames:
          usernameCollisions,

        emails:
          authEmailCollisions,
      },

      /*
       * Safe to return because this endpoint is admin-only.
       *
       * Passwords do not exist in the population specification.
       * Phase 1C creates and immediately discards those later.
       */
      agents:
        population.map(
          (
            agent,
            index,
          ) => ({
            number:
              index + 1,

            ...agent,

            lifecycleStatus:
              "dormant",
          }),
        ),
    });
  } catch (error) {
    console.error(
      "Agent population preview error:",
      error,
    );

    return json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Agent population preview failed.",
      },
      500,
    );
  }
}