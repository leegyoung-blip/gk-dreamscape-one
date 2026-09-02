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
  runAgentOrchestratorTick,
} from "@/lib/agents/orchestrator/orchestrator";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  60;

type JsonObject = Record<
  string,
  unknown
>;

function objectValue(
  value: unknown,
): JsonObject {
  return value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value,
    )
    ? value as JsonObject
    : {};
}

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

async function loadStatus() {
  const admin =
    createAdminClient();

  const [
    {
      data:
        statusData,
      error:
        statusError,
    },
    {
      data:
        ticks,
      error:
        tickError,
    },
  ] =
    await Promise.all([
      admin.rpc(
        "agent_get_phase3f_status",
      ),

      admin
        .from(
          "agent_orchestrator_ticks",
        )
        .select(
          `
          id,
          trigger_source,
          shard_index,
          shard_count,
          simulation_day_index,
          minute_in_simulation_day,
          status,
          agents_considered,
          sessions_claimed,
          sessions_completed,
          decisions_attempted,
          decisions_completed,
          decisions_failed,
          error_message,
          started_at,
          finished_at
        `,
        )
        .order(
          "started_at",
          {
            ascending:
              false,
          },
        )
        .limit(
          40,
        ),
    ]);

  if (statusError) {
    throw new Error(
      statusError.message,
    );
  }

  if (tickError) {
    throw new Error(
      tickError.message,
    );
  }

  return {
    status:
      objectValue(
        statusData,
      ),
    ticks:
      ticks || [],
  };
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
    const result =
      await loadStatus();

    return json({
      ok: true,
      ...result,
    });
  } catch (
    error
  ) {
    return json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Phase 3F status could not be loaded.",
      },
      500,
    );
  }
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

  const admin =
    createAdminClient();

  try {
    const body =
      objectValue(
        await request.json(),
      );

    const action =
      String(
        body.action ||
        "",
      );

    if (
      action ===
      "activate_full_100"
    ) {
      if (
        String(
          body.confirmation ||
          "",
        ) !==
        "ACTIVATE ALL 100 AGENTS"
      ) {
        return json(
          {
            ok: false,
            error:
              "Type ACTIVATE ALL 100 AGENTS exactly to confirm.",
          },
          400,
        );
      }

      const {
        error,
      } =
        await admin.rpc(
          "agent_activate_full_100",
          {
            p_actor:
              access.user.id,
          },
        );

      if (error) {
        return json(
          {
            ok: false,
            error:
              error.message,
          },
          409,
        );
      }
    } else if (
      action ===
      "stop_full_100"
    ) {
      const {
        error,
      } =
        await admin.rpc(
          "agent_stop_full_100",
          {
            p_reason:
              String(
                body.reason ||
                "Stopped from Phase 3F admin control.",
              ),
            p_actor:
              access.user.id,
          },
        );

      if (error) {
        return json(
          {
            ok: false,
            error:
              error.message,
          },
          409,
        );
      }
    } else if (
      action ===
      "resume_full_100"
    ) {
      const {
        error,
      } =
        await admin.rpc(
          "agent_resume_full_100",
          {
            p_reason:
              String(
                body.reason ||
                "Resumed from Phase 3F admin control.",
              ),
            p_actor:
              access.user.id,
          },
        );

      if (error) {
        return json(
          {
            ok: false,
            error:
              error.message,
          },
          409,
        );
      }
    } else if (
      action ===
      "rollback_full_100"
    ) {
      if (
        String(
          body.confirmation ||
          "",
        ) !==
        "ROLL BACK ALL 100 TO DORMANT"
      ) {
        return json(
          {
            ok: false,
            error:
              "Type ROLL BACK ALL 100 TO DORMANT exactly to confirm.",
          },
          400,
        );
      }

      const {
        error,
      } =
        await admin.rpc(
          "agent_rollback_full_100_to_dormant",
          {
            p_reason:
              String(
                body.reason ||
                "Rolled back from Phase 3F admin control.",
              ),
            p_actor:
              access.user.id,
          },
        );

      if (error) {
        return json(
          {
            ok: false,
            error:
              error.message,
          },
          409,
        );
      }
    } else if (
      action ===
      "run_test_shard"
    ) {
      const summary =
        await runAgentOrchestratorTick({
          admin,
          triggerSource:
            "admin",
          maxDecisionsPerTick:
            1,
          shardIndex:
            0,
          shardCount:
            10,
        });

      const status =
        await loadStatus();

      return json({
        ok:
          summary.ok,
        tick:
          summary,
        ...status,
      },
      summary.ok
        ? 200
        : 500);
    } else {
      return json(
        {
          ok: false,
          error:
            "Unknown Phase 3F control action.",
        },
        400,
      );
    }

    const status =
      await loadStatus();

    return json({
      ok: true,
      ...status,
    });
  } catch (
    error
  ) {
    return json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Phase 3F control failed.",
      },
      500,
    );
  }
}
