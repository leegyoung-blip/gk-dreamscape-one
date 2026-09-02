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
    {
      data:
        sessions,
      error:
        sessionError,
    },
  ] =
    await Promise.all([
      admin.rpc(
        "agent_get_phase3e_status",
      ),

      admin
        .from(
          "agent_orchestrator_ticks",
        )
        .select(
          `
          id,
          trigger_source,
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
          20,
        ),

      admin
        .from(
          "agent_run_sessions",
        )
        .select(
          `
          id,
          agent_user_id,
          simulation_day_index,
          session_number,
          status,
          planned_decisions,
          attempted_decisions,
          completed_decisions,
          failed_decisions,
          started_at,
          ended_at
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
          30,
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

  if (sessionError) {
    throw new Error(
      sessionError.message,
    );
  }

  return {
    status:
      objectValue(
        statusData,
      ),
    ticks:
      ticks || [],
    sessions:
      sessions || [],
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
            : "Phase 3E status could not be loaded.",
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
      (
        await request
          .json()
          .catch(
            () => ({}),
          )
      ) as {
        action?: string;
        confirmation?: string;
        reason?: string;
      };

    const action =
      String(
        body.action ||
        "",
      );

    if (
      action ===
      "activate"
    ) {
      if (
        body.confirmation !==
        "ACTIVATE 10-AGENT PILOT"
      ) {
        return json(
          {
            ok: false,
            error:
              "Activation confirmation phrase is incorrect.",
          },
          409,
        );
      }

      const {
        data,
        error,
      } =
        await admin.rpc(
          "agent_activate_phase3_pilot",
          {
            p_actor:
              access.user.id,
          },
        );

      if (error) {
        throw new Error(
          error.message,
        );
      }

      return json({
        ok: true,
        action,
        status:
          objectValue(
            data,
          ),
      });
    }

    if (
      action ===
      "stop"
    ) {
      const {
        data,
        error,
      } =
        await admin.rpc(
          "agent_stop_phase3_pilot",
          {
            p_reason:
              body.reason ||
              "Stopped from Phase 3E Admin Control Centre.",
            p_actor:
              access.user.id,
          },
        );

      if (error) {
        throw new Error(
          error.message,
        );
      }

      return json({
        ok: true,
        action,
        status:
          objectValue(
            data,
          ),
      });
    }

    if (
      action ===
      "resume"
    ) {
      const {
        data,
        error,
      } =
        await admin.rpc(
          "agent_resume_phase3_pilot",
          {
            p_reason:
              body.reason ||
              "Resumed from Phase 3E Admin Control Centre.",
            p_actor:
              access.user.id,
          },
        );

      if (error) {
        throw new Error(
          error.message,
        );
      }

      return json({
        ok: true,
        action,
        status:
          objectValue(
            data,
          ),
      });
    }

    if (
      action ===
      "rollback"
    ) {
      if (
        body.confirmation !==
        "ROLL BACK PILOT TO DORMANT"
      ) {
        return json(
          {
            ok: false,
            error:
              "Rollback confirmation phrase is incorrect.",
          },
          409,
        );
      }

      const {
        data,
        error,
      } =
        await admin.rpc(
          "agent_rollback_phase3_pilot_to_dormant",
          {
            p_reason:
              body.reason ||
              "Rolled back from Phase 3E Admin Control Centre.",
            p_actor:
              access.user.id,
          },
        );

      if (error) {
        throw new Error(
          error.message,
        );
      }

      return json({
        ok: true,
        action,
        status:
          objectValue(
            data,
          ),
      });
    }

    if (
      action ===
      "run_tick_now"
    ) {
      const summary =
        await runAgentOrchestratorTick({
          admin,
          triggerSource:
            "admin",
          maxDecisionsPerTick:
            1,
        });

      return json(
        {
          ok:
            summary.ok,
          action,
          summary,
        },
        summary.ok
          ? 200
          : 500,
      );
    }

    return json(
      {
        ok: false,
        error:
          "Unsupported Phase 3E action.",
      },
      400,
    );

  } catch (
    error
  ) {
    return json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Phase 3E control action failed.",
      },
      500,
    );
  }
}
