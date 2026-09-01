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

import {
  deriveAgentMemoryFromSnapshot,
} from "@/lib/agents/memory/derive";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

function json(
  body:
    unknown,

  status =
    200,
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
  request:
    Request,
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

    let agentUserId =
      String(
        body.userId ||
        "",
      ).trim();

    if (
      !agentCode &&
      !agentUserId
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
            `
            user_id,
            agent_code
          `,
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
     * Read world.
     */
    const observation =
      await captureAgentWorldObservation({
        admin,

        agentUserId,

        initiatedBy:
          access.user.id,

        triggerType:
          "admin",
      });

    /*
     * Convert observation into durable memory.
     */
    const memory =
      await deriveAgentMemoryFromSnapshot({
        admin,

        agentUserId,

        snapshotId:
          observation.snapshotId,

        createdBy:
          access.user.id,
      });

    return json({
      ok: true,

      executionOccurred:
        false,

      observation: {
        snapshotId:
          observation.snapshotId,

        agentCode:
          observation.agentCode,

        observedAt:
          observation.observedAt,
      },

      memory: {
        memoryCount:
          memory.memoryCount,

        memoryIds:
          memory.memoryIds,

        checkpointId:
          memory.checkpointId,

        checkpointStateHash:
          memory.checkpointStateHash,

        summary:
          memory.summary,
      },
    });

  } catch (
    error
  ) {
    console.error(
      "Agent memory refresh error:",
      error,
    );

    return json(
      {
        ok: false,

        executionOccurred:
          false,

        error:
          error instanceof Error
            ? error.message
            : "Agent memory refresh failed.",
      },
      500,
    );
  }
}