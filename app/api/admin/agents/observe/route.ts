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
        agentCode?:
          string;

        userId?:
          string;
      };

    const agentCode =
      String(
        body.agentCode ||
        "",
      )
        .trim()
        .toUpperCase();

    const suppliedUserId =
      String(
        body.userId ||
        "",
      ).trim();

    if (
      !agentCode &&
      !suppliedUserId
    ) {
      return json(
        {
          ok: false,

          error:
            "Provide agentCode or userId.",
        },
        400,
      );
    }

    const admin =
      createAdminClient();

    let agentUserId =
      suppliedUserId;

    if (
      !agentUserId
    ) {
      const {
        data,
        error,
      } =
        await admin
          .from(
            "agent_profiles",
          )
          .select(
            "user_id,agent_code,lifecycle_status",
          )
          .eq(
            "agent_code",
            agentCode,
          )
          .maybeSingle();

      if (error) {
        throw new Error(
          error.message,
        );
      }

      if (!data) {
        return json(
          {
            ok: false,

            error:
              `Agent ${agentCode} was not found.`,
          },
          404,
        );
      }

      agentUserId =
        String(
          data.user_id,
        );
    }

    /*
     * Phase 2A is intentionally allowed for dormant agents because
     * observation itself is read-only.
     */
    const result =
      await captureAgentWorldObservation({
        admin,

        agentUserId,

        initiatedBy:
          access.user.id,

        triggerType:
          "admin",
      });

    return json({
      ok: true,

      snapshot: {
        snapshotId:
          result.snapshotId,

        runId:
          result.runId,

        agentUserId:
          result.agentUserId,

        agentCode:
          result.agentCode,

        observedAt:
          result.observedAt,

        stateHash:
          result.stateHash,

        summary:
          result.summary,

        sourceKeys:
          result.sections.map(
            (
              section,
            ) =>
              section.source_key,
          ),
      },
    });

  } catch (
    error
  ) {
    console.error(
      "Agent observation route error:",
      error,
    );

    return json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Agent observation failed.",
      },
      500,
    );
  }
}