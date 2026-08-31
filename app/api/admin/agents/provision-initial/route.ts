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
  INITIAL_AGENT_POPULATION_SIZE,
} from "@/lib/agents/initialPopulation";

import {
  provisionAgent,
} from "@/lib/agents/provision";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

const DEFAULT_BATCH_SIZE = 5;
const MAX_BATCH_SIZE = 10;

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

function normaliseBatchSize(
  value: unknown,
) {
  const parsed =
    Number(value);

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    return DEFAULT_BATCH_SIZE;
  }

  return Math.min(
    MAX_BATCH_SIZE,
    Math.max(
      1,
      Math.floor(
        parsed,
      ),
    ),
  );
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
        await request.json()
      ) as {
        confirmation?:
          string;

        batchSize?:
          number;
      };


    if (
      body.confirmation !==
      "PROVISION_INITIAL_100"
    ) {
      return json(
        {
          ok: false,

          error:
            'Provisioning requires confirmation "PROVISION_INITIAL_100".',
        },
        400,
      );
    }


    const batchSize =
      normaliseBatchSize(
        body.batchSize,
      );


    const admin =
      createAdminClient();


    /* ===============================================================
       SAFETY STATE

       No agent identity may be created while the engine or any public
       visibility control is enabled.
       =============================================================== */

    const {
      data: settings,
      error:
        settingsError,
    } =
      await admin
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
        .maybeSingle();


    if (settingsError) {
      throw new Error(
        `Could not verify agent system state: ${settingsError.message}`,
      );
    }


    if (!settings) {
      throw new Error(
        "Global agent settings were not found.",
      );
    }


    if (
      settings.agents_enabled ||
      settings.public_visibility_enabled ||
      settings.leaderboard_visibility_enabled ||
      settings.exchange_visibility_enabled
    ) {
      return json(
        {
          ok: false,

          error:
            "Provisioning is blocked because the autonomous engine or public agent visibility is enabled. Turn all Phase 1 agent switches off first.",
        },
        409,
      );
    }


    /* ===============================================================
       DETERMINISTIC POPULATION
       =============================================================== */

    const population =
      buildInitialAgentPopulation();


    if (
      population.length !==
      INITIAL_AGENT_POPULATION_SIZE
    ) {
      throw new Error(
        `Initial population generator returned ${population.length} agents instead of ${INITIAL_AGENT_POPULATION_SIZE}.`,
      );
    }


    const plannedCodes =
      population.map(
        (agent) =>
          agent.agentCode,
      );


    const {
      data:
        existingAgentRows,
      error:
        existingAgentError,
    } =
      await admin
        .from(
          "agent_profiles",
        )
        .select(
          "agent_code,user_id,lifecycle_status",
        )
        .in(
          "agent_code",
          plannedCodes,
        );


    if (
      existingAgentError
    ) {
      throw new Error(
        `Could not inspect the current agent population: ${existingAgentError.message}`,
      );
    }


    const existingCodes =
      new Set(
        (
          existingAgentRows ||
          []
        ).map(
          (row) =>
            String(
              row.agent_code,
            ),
        ),
      );


    const missing =
      population.filter(
        (agent) =>
          !existingCodes.has(
            agent.agentCode,
          ),
      );


    /*
     * Already complete.
     */
    if (
      missing.length === 0
    ) {
      return json({
        ok: true,

        done: true,

        total:
          INITIAL_AGENT_POPULATION_SIZE,

        provisioned:
          INITIAL_AGENT_POPULATION_SIZE,

        remaining:
          0,

        batchProcessed:
          0,

        results:
          [],

        message:
          "The initial 100-agent population is already fully provisioned.",
      });
    }


    const thisBatch =
      missing.slice(
        0,
        batchSize,
      );


    const results:
      Array<{
        agentCode: string;

        ok: boolean;

        status: string;

        userId?:
          string;

        requestId:
          string;

        message:
          string;
      }> = [];


    /* ===============================================================
       PROVISION SEQUENTIALLY

       Sequential creation is deliberate:
       - lowers Supabase Auth pressure
       - makes failure attribution clear
       - keeps Vercel execution predictable
       =============================================================== */

    for (
      const specification
      of thisBatch
    ) {
      const result =
        await provisionAgent({
          admin,

          initiatedBy:
            access.user.id,

          spec:
            specification,
        });


      results.push({
        agentCode:
          specification.agentCode,

        ok:
          result.ok,

        status:
          result.status,

        userId:
          result.userId,

        requestId:
          result.requestId,

        message:
          result.message,
      });


      /*
       * Stop immediately on the first failure.
       *
       * Successful previous agents remain safely provisioned.
       * The endpoint is resumable.
       */
      if (!result.ok) {

        const {
          count:
            currentCount,
        } =
          await admin
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
            .in(
              "agent_code",
              plannedCodes,
            );


        return json(
          {
            ok: false,

            done: false,

            total:
              INITIAL_AGENT_POPULATION_SIZE,

            provisioned:
              currentCount ||
              0,

            remaining:
              Math.max(
                0,
                INITIAL_AGENT_POPULATION_SIZE -
                  (
                    currentCount ||
                    0
                  ),
              ),

            batchProcessed:
              results.length,

            failedAgent:
              specification.agentCode,

            results,

            error:
              result.message,
          },

          result.status ===
            "cleanup_required"
            ? 500
            : 422,
        );
      }
    }


    /* ===============================================================
       POST-BATCH COUNT
       =============================================================== */

    const {
      count:
        provisionedCount,

      error:
        countError,
    } =
      await admin
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
        .in(
          "agent_code",
          plannedCodes,
        );


    if (countError) {
      throw new Error(
        `Could not verify provisioned population count: ${countError.message}`,
      );
    }


    const provisioned =
      provisionedCount ||
      0;

    const remaining =
      Math.max(
        0,

        INITIAL_AGENT_POPULATION_SIZE -
          provisioned,
      );


    return json({
      ok: true,

      done:
        remaining === 0,

      total:
        INITIAL_AGENT_POPULATION_SIZE,

      provisioned,

      remaining,

      batchProcessed:
        results.length,

      results,

      message:
        remaining === 0
          ? "All 100 initial DREAMSCAPE agents are now provisioned and dormant."
          : `Provisioned this batch successfully. ${remaining} initial agents remain.`,
    });

  } catch (error) {
    console.error(
      "Initial population provisioning error:",
      error,
    );

    return json(
      {
        ok: false,

        done: false,

        error:
          error instanceof Error
            ? error.message
            : "Initial population provisioning failed.",
      },
      500,
    );
  }
}