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
  previewRuleBasedPolicyV1,
} from "@/lib/agents/policy/preview";

import {
  reportAgentFailure,
} from "@/lib/agents/runtime/failures";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  60;

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
        agentCode?:
          string;

        allPilot?:
          boolean;
      };

    if (
      body.allPilot ===
      true
    ) {
      const {
        data:
          pilotRows,

        error:
          pilotError,
      } =
        await admin
          .from(
            "agent_pilot_memberships",
          )
          .select(
            `
            agent_user_id,
            pilot_order,
            status
          `,
          )
          .eq(
            "pilot_key",
            "phase3-pilot-10",
          )
          .order(
            "pilot_order",
            {
              ascending:
                true,
            },
          );

      if (
        pilotError
      ) {
        throw new Error(
          pilotError.message,
        );
      }

      if (
        (
          pilotRows ||
          []
        ).length !==
        10
      ) {
        throw new Error(
          "Phase 3B expected exactly 10 pilot members.",
        );
      }

      const results:
        Array<
          Record<
            string,
            unknown
          >
        > =
        [];

      for (
        const pilot
        of pilotRows ||
          []
      ) {
        try {
          const result =
            await previewRuleBasedPolicyV1({
              admin,

              agentUserId:
                String(
                  pilot.agent_user_id,
                ),

              initiatedBy:
                access.user.id,

              decisionIndex:
                1,
            });

          results.push({
            ok: true,

            ...result,
          });

        } catch (
          agentError
        ) {
          const message =
            agentError instanceof Error
              ? agentError.message
              : "Agent policy preview failed.";

          const failure =
            await reportAgentFailure({
              admin,

              /*
               * Preview failures are framework/orchestrator failures.
               * Do not increment the dormant pilot agent's runtime
               * failure streak during non-executing Brain QA.
               */
              agentUserId:
                null,

              scope:
                "orchestrator",

              severity:
                "error",

              errorCode:
                "PHASE3B_POLICY_PREVIEW_FAILED",

              message,

              context: {
                phase:
                  "3B",

                pilotAgentUserId:
                  pilot
                    .agent_user_id,

                pilotOrder:
                  pilot
                    .pilot_order,

                previewOnly:
                  true,
              },

              idempotencyKey:
                `phase3b-preview:${pilot.agent_user_id}:${randomUUID()}`,

              createdBy:
                access.user.id,
            });

          results.push({
            ok: false,

            agentUserId:
              String(
                pilot
                  .agent_user_id,
              ),

            pilotOrder:
              Number(
                pilot
                  .pilot_order,
              ),

            error:
              message,

            failureId:
              failure
                .failureId,
          });
        }
      }

      const failures =
        results.filter(
          (
            result,
          ) =>
            result.ok !==
            true,
        );

      return json(
        {
          ok:
            failures.length ===
            0,

          previewOnly:
            true,

          executionOccurred:
            false,

          pilotSize:
            results.length,

          passed:
            results.length -
            failures.length,

          failed:
            failures.length,

          results,
        },

        failures.length ===
          0
          ? 200
          : 422,
      );
    }

    const agentCode =
      String(
        body.agentCode ||
        "DSBOT-0001",
      )
        .trim()
        .toUpperCase();

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
          "user_id",
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

    try {
      const result =
        await previewRuleBasedPolicyV1({
          admin,

          agentUserId:
            String(
              agent.user_id,
            ),

          initiatedBy:
            access.user.id,

          decisionIndex:
            1,
        });

      return json({
        ok: true,

        previewOnly:
          true,

        executionOccurred:
          false,

        result,
      });

    } catch (
      previewError
    ) {
      const message =
        previewError instanceof Error
          ? previewError.message
          : "Agent policy preview failed.";

      const failure =
        await reportAgentFailure({
          admin,

          agentUserId:
            null,

          scope:
            "orchestrator",

          severity:
            "error",

          errorCode:
            "PHASE3B_POLICY_PREVIEW_FAILED",

          message,

          context: {
            phase:
              "3B",

            agentCode,

            previewOnly:
              true,
          },

          idempotencyKey:
            `phase3b-preview:${agentCode}:${randomUUID()}`,

          createdBy:
            access.user.id,
        });

      return json(
        {
          ok: false,

          previewOnly:
            true,

          executionOccurred:
            false,

          error:
            message,

          failureId:
            failure.failureId,
        },
        500,
      );
    }

  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : "Phase 3B brain preview failed.";

    const failure =
      await reportAgentFailure({
        admin,

        agentUserId:
          null,

        scope:
          "orchestrator",

        severity:
          "critical",

        errorCode:
          "PHASE3B_BRAIN_ROUTE_FAILED",

        message,

        context: {
          phase:
            "3B",

          previewOnly:
            true,
        },

        idempotencyKey:
          `phase3b-route:${randomUUID()}`,

        createdBy:
          access.user.id,
      });

    return json(
      {
        ok: false,

        previewOnly:
          true,

        executionOccurred:
          false,

        error:
          message,

        failureId:
          failure.failureId,
      },
      500,
    );
  }
}
