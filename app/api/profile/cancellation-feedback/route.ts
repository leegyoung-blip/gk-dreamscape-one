import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REASONS = {
  too_expensive: "It costs too much",
  not_using_enough: "We are not using it enough",
  learning_needs_changed: "It no longer fits the learner’s needs",
  technical_issues: "We had technical problems",
  taking_break: "We are taking a break",
  switching_plan: "We want a different plan",
  other: "Other reason",
} as const;

type ReasonCode = keyof typeof REASONS;

type CancellationAction =
  | "cancel_period_end"
  | "cancel_trial";

type FeedbackOutcome =
  | "completed"
  | "failed";

function json(
  body: unknown,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

async function requireCurrentUser(
  request: Request,
) {
  const authHeader =
    request.headers.get(
      "authorization",
    ) || "";

  const token =
    authHeader.startsWith(
      "Bearer ",
    )
      ? authHeader
          .slice(7)
          .trim()
      : "";

  if (!token) {
    throw new Error(
      "AUTH_REQUIRED",
    );
  }

  const url =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const key =
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env
      .SUPABASE_ANON_KEY ||
    process.env
      .SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_AUTH_CONFIG_MISSING",
    );
  }

  const client =
    createClient(
      url,
      key,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        },
      },
    );

  const {
    data: { user },
    error,
  } =
    await client.auth.getUser(
      token,
    );

  if (error || !user) {
    throw new Error(
      "AUTH_REQUIRED",
    );
  }

  return user;
}

function cleanComments(
  value: unknown,
) {
  const comments =
    String(
      value || "",
    )
      .trim()
      .slice(0, 1000);

  return comments || null;
}

function cleanFailureMessage(
  value: unknown,
) {
  const message =
    String(
      value || "",
    )
      .trim()
      .slice(0, 500);

  return message || null;
}

export async function POST(
  request: Request,
) {
  try {
    const user =
      await requireCurrentUser(
        request,
      );

    const body =
      (await request.json()) as
        | {
            mode?: "create";
            contractId?: string;
            cancellationAction?: CancellationAction;
            reasonCode?: ReasonCode;
            comments?: string;
          }
        | {
            mode?: "resolve";
            feedbackId?: string;
            outcome?: FeedbackOutcome;
            failureMessage?: string;
          };

    if (body.mode === "create") {
      const contractId =
        String(
          body.contractId || "",
        ).trim();

      const cancellationAction =
        body.cancellationAction;

      const reasonCode =
        body.reasonCode;

      if (
        !contractId ||
        !cancellationAction ||
        ![
          "cancel_period_end",
          "cancel_trial",
        ].includes(
          cancellationAction,
        ) ||
        !reasonCode ||
        !(reasonCode in REASONS)
      ) {
        return json(
          {
            error:
              "A valid contract, cancellation action and reason are required.",
          },
          400,
        );
      }

      /*
       * Ownership check: the signed-in learner must own the contract.
       */
      const {
        data: contract,
        error: contractError,
      } =
        await supabaseAdmin
          .from(
            "dreamscape_subscription_contracts",
          )
          .select(
            "id,learner_user_id,plan_id,provider,provider_environment",
          )
          .eq(
            "id",
            contractId,
          )
          .eq(
            "learner_user_id",
            user.id,
          )
          .maybeSingle();

      if (contractError) {
        throw contractError;
      }

      if (!contract) {
        return json(
          {
            error:
              "This membership contract could not be found.",
          },
          404,
        );
      }

      const {
        data: plan,
        error: planError,
      } =
        await supabaseAdmin
          .from(
            "dreamscape_subscription_plans",
          )
          .select(
            "id,plan_key,plan_code,billing_cycle",
          )
          .eq(
            "id",
            contract.plan_id,
          )
          .maybeSingle();

      if (planError) {
        throw planError;
      }

      const {
        data: feedback,
        error: feedbackError,
      } =
        await supabaseAdmin
          .from(
            "dreamscape_cancellation_feedback",
          )
          .insert({
            contract_id:
              contract.id,

            learner_user_id:
              user.id,

            plan_id:
              plan?.id ||
              contract.plan_id ||
              null,

            plan_key:
              plan?.plan_key ||
              null,

            plan_code:
              plan?.plan_code ||
              null,

            billing_cycle:
              plan?.billing_cycle ||
              null,

            provider:
              contract.provider ||
              null,

            provider_environment:
              contract
                .provider_environment ||
              null,

            cancellation_action:
              cancellationAction,

            reason_code:
              reasonCode,

            reason_label:
              REASONS[
                reasonCode
              ],

            comments:
              cleanComments(
                body.comments,
              ),

            outcome:
              "submitted",
          })
          .select("id")
          .single();

      if (feedbackError) {
        throw feedbackError;
      }

      return json({
        ok: true,
        id: feedback.id,
      });
    }

    if (body.mode === "resolve") {
      const feedbackId =
        String(
          body.feedbackId || "",
        ).trim();

      const outcome =
        body.outcome;

      if (
        !feedbackId ||
        !outcome ||
        ![
          "completed",
          "failed",
        ].includes(
          outcome,
        )
      ) {
        return json(
          {
            error:
              "A valid feedback record and outcome are required.",
          },
          400,
        );
      }

      /*
       * Ownership check prevents one signed-in learner from resolving
       * another learner's feedback row.
       */
      const {
        data: existing,
        error: existingError,
      } =
        await supabaseAdmin
          .from(
            "dreamscape_cancellation_feedback",
          )
          .select("id")
          .eq(
            "id",
            feedbackId,
          )
          .eq(
            "learner_user_id",
            user.id,
          )
          .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (!existing) {
        return json(
          {
            error:
              "Cancellation feedback record not found.",
          },
          404,
        );
      }

      const {
        error: updateError,
      } =
        await supabaseAdmin
          .from(
            "dreamscape_cancellation_feedback",
          )
          .update({
            outcome,

            failure_message:
              outcome === "failed"
                ? cleanFailureMessage(
                    body.failureMessage,
                  )
                : null,

            resolved_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            feedbackId,
          );

      if (updateError) {
        throw updateError;
      }

      return json({
        ok: true,
        id: feedbackId,
        outcome,
      });
    }

    return json(
      {
        error:
          "Invalid cancellation feedback request.",
      },
      400,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    if (
      message ===
      "AUTH_REQUIRED"
    ) {
      return json(
        {
          error:
            "Please sign in again.",
        },
        401,
      );
    }

    console.error(
      "Dreamscape cancellation feedback failed",
      error,
    );

    return json(
      {
        error:
          "Cancellation feedback could not be saved.",
      },
      500,
    );
  }
}
