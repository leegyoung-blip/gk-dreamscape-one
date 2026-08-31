import {
  randomUUID,
} from "crypto";

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
  validateAgentAction,
} from "@/lib/agents/actions/validate";

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

        actionKey?:
          string;

        actionVersion?:
          number;

        parameters?:
          Record<
            string,
            unknown
          >;

        snapshotId?:
          string;

        refreshObservation?:
          boolean;
      };

    const cleanAgentCode =
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

    const actionKey =
      String(
        body.actionKey ||
        "",
      )
        .trim()
        .toLowerCase();

    if (
      !cleanAgentCode &&
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

    if (
      !actionKey
    ) {
      return json(
        {
          ok: false,

          error:
            "Action key is required.",
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
            `
            user_id,
            agent_code
          `,
          )
          .eq(
            "agent_code",
            cleanAgentCode,
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
              `Agent ${cleanAgentCode} was not found.`,
          },
          404,
        );
      }

      agentUserId =
        String(
          data.user_id,
        );
    }

    let snapshotId =
      String(
        body.snapshotId ||
        "",
      ).trim();

    /*
     * Admin testing may request a fresh read-only observation.

     * The validator itself still consumes a real stored snapshot.
     */
    if (
      body.refreshObservation !==
        false ||
      !snapshotId
    ) {
      const observation =
        await captureAgentWorldObservation({
          admin,

          agentUserId,

          initiatedBy:
            access.user.id,

          triggerType:
            "test",
        });

      snapshotId =
        observation.snapshotId;
    }

    const result =
      await validateAgentAction({
        admin,

        agentUserId,

        actionKey,

        actionVersion:
          Number.isInteger(
            body.actionVersion,
          )
            ? body.actionVersion
            : 1,

        snapshotId,

        parameters:
          (
            body.parameters &&
            typeof body.parameters ===
              "object" &&
            !Array.isArray(
              body.parameters,
            )
          )
            ? body.parameters
            : {},

        requestSource:
          "test",

        requestedMode:
          "dry_run",

        createdBy:
          access.user.id,

        idempotencyKey:
          `admin-validation:${randomUUID()}`,
      });

    return json(
      {
        ok:
          result.ok,

        validation:
          result,

        executionOccurred:
          false,
      },

      result.ok
        ? 200
        : 422,
    );

  } catch (
    error
  ) {
    console.error(
      "Agent action validation route error:",
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
            : "Agent action validation failed.",
      },
      500,
    );
  }
}