import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  cancelHitPayRecurringBilling,
  getHitPayRecurringBilling,
  isHitPayEnvironment,
  updateHitPayRecurringBilling,
} from "@/lib/hitpay";
import { sendDreamscapeSubscriptionEmail } from "@/lib/dreamscapeSubscriptionEmail";
import {
  keepNovaAccessUntilPeriodEnd,
  projectContractToNovaAccess,
  singaporeDateString,
  suspendNovaAccess,
  type DreamscapeContractRow,
  type DreamscapePlanRow,
} from "@/lib/dreamscape-subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubscriptionAction =
  | "refresh"
  | "cancel_period_end"
  | "cancel_immediate"
  | "reactivate"
  | "change_plan"
  | "cancel_plan_change";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function requireBillingStaff(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) throw new Error("AUTH_REQUIRED");

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_AUTH_CONFIG_MISSING");
  }

  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser(token);

  if (userError || !user) throw new Error("AUTH_REQUIRED");

  const { data: allowed, error } = await client.rpc(
    "gkp_is_billing_staff",
  );

  if (error || !allowed) throw new Error("ACCESS_DENIED");

  return user;
}

async function loadPlan(planId: string) {
  const { data, error } = await supabaseAdmin
    .from("dreamscape_subscription_plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (error) throw error;
  return data as DreamscapePlanRow;
}

async function loadContract(contractId: string) {
  const { data: contract, error } = await supabaseAdmin
    .from("dreamscape_subscription_contracts")
    .select("*")
    .eq("id", contractId)
    .single();

  if (error) throw error;

  const plan = await loadPlan(contract.plan_id);

  return {
    contract: contract as DreamscapeContractRow & {
      plan_id: string;
      provider_environment: string | null;
    },
    plan,
  };
}

function requireProviderSubscription(
  contract: DreamscapeContractRow & {
    provider_environment: string | null;
  },
) {
  const subscriptionId = contract.provider_subscription_id;
  const environment = contract.provider_environment;

  if (!subscriptionId) {
    throw new Error(
      "This contract does not yet have a HitPay subscription ID.",
    );
  }

  if (!environment || !isHitPayEnvironment(environment)) {
    throw new Error(
      "This contract does not have a valid HitPay environment.",
    );
  }

  return {
    id: subscriptionId,
    environment,
  };
}

async function beginPlanChange(input: {
  contract: DreamscapeContractRow;
  targetPlanId: string;
  actorUserId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "gkp_begin_dreamscape_plan_change",
    {
      p_contract_id: input.contract.id,
      p_target_plan_id: input.targetPlanId,
      p_requested_by: input.actorUserId,
      p_source: "admin",
    },
  );

  if (error) throw error;
  if (!data) throw new Error("The plan-change transition could not be created.");

  return String(data);
}

export async function POST(request: Request) {
  try {
    const user = await requireBillingStaff(request);

    const body = (await request.json()) as {
      contractId?: string;
      action?: SubscriptionAction;
      targetPlanId?: string;
    };

    const contractId = String(body.contractId || "").trim();
    const action = body.action;

    if (!contractId || !action) {
      return json(
        { error: "contractId and action are required." },
        400,
      );
    }

    const { contract, plan } = await loadContract(contractId);
    const provider = requireProviderSubscription(contract);

    if (action === "change_plan") {
      const targetPlanId = String(body.targetPlanId || "").trim();

      if (!targetPlanId) {
        return json({ error: "Choose the new Dreamscape plan." }, 400);
      }

      const targetPlan = await loadPlan(targetPlanId);

      if (
        targetPlan.audience !== "public" ||
        targetPlan.provider !== "hitpay" ||
        !targetPlan.is_available ||
        targetPlan.is_coming_soon ||
        !targetPlan.hitpay_plan_id
      ) {
        return json(
          { error: "The selected Dreamscape plan is not currently available." },
          409,
        );
      }

      if (
        targetPlan.hitpay_environment &&
        targetPlan.hitpay_environment !== provider.environment
      ) {
        return json(
          { error: "The selected plan is mapped to a different HitPay environment." },
          409,
        );
      }

      let transitionId: string | null = null;

      try {
        transitionId = await beginPlanChange({
          contract,
          targetPlanId,
          actorUserId: user.id,
        });

        const providerResult = await updateHitPayRecurringBilling({
          environment: provider.environment,
          recurringBillingId: provider.id,
          planId: targetPlan.hitpay_plan_id,
          sendEmail: true,
        });

        const { error: confirmError } = await supabaseAdmin.rpc(
          "gkp_confirm_dreamscape_plan_change",
          {
            p_transition_id: transitionId,
            p_provider_response: providerResult,
          },
        );

        if (confirmError) {
          // The provider accepted the new plan but local confirmation failed.
          // Revert HitPay to the current plan before surfacing the error.
          if (plan.hitpay_plan_id) {
            await updateHitPayRecurringBilling({
              environment: provider.environment,
              recurringBillingId: provider.id,
              planId: plan.hitpay_plan_id,
              sendEmail: false,
            }).catch((revertError) =>
              console.error("Could not revert HitPay plan after local confirmation failure", revertError),
            );
          }

          await supabaseAdmin.rpc("gkp_fail_dreamscape_plan_change", {
            p_transition_id: transitionId,
            p_error: confirmError.message,
          });

          throw confirmError;
        }

        return json({
          ok: true,
          status: "scheduled",
          transitionId,
          currentPlan: plan.display_name,
          nextPlan: targetPlan.display_name,
          effectiveAt: contract.current_period_end,
        });
      } catch (error) {
        if (transitionId) {
          try {
            await supabaseAdmin.rpc("gkp_fail_dreamscape_plan_change", {
              p_transition_id: transitionId,
              p_error:
                error instanceof Error ? error.message : String(error),
            });
          } catch {
            // Preserve the original provider/local error.
          }
        }
        throw error;
      }
    }

    if (action === "cancel_plan_change") {
      if (!contract.pending_plan_id || !contract.pending_transition_id) {
        return json({ error: "This subscription has no pending plan change." }, 409);
      }

      if (!plan.hitpay_plan_id) {
        return json({ error: "The current Dreamscape plan is not mapped to HitPay." }, 409);
      }

      // Put HitPay back onto the current paid plan first.
      await updateHitPayRecurringBilling({
        environment: provider.environment,
        recurringBillingId: provider.id,
        planId: plan.hitpay_plan_id,
        sendEmail: false,
      });

      const { error: cancelError } = await supabaseAdmin.rpc(
        "gkp_cancel_dreamscape_plan_change",
        {
          p_contract_id: contract.id,
          p_requested_by: user.id,
          p_reason: "Cancelled by billing staff before effective date",
        },
      );

      if (cancelError) throw cancelError;

      return json({ ok: true, status: "plan_change_cancelled" });
    }

    if (action === "refresh") {
      const providerResult = await getHitPayRecurringBilling(
        provider.environment,
        provider.id,
      );

      const providerStatus = String(providerResult.status || "")
        .trim()
        .toLowerCase();

      await supabaseAdmin
        .from("dreamscape_subscription_contracts")
        .update({
          provider_status: providerStatus || null,
          provider_data: providerResult,
          last_provider_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", contract.id);

      if (providerStatus === "active") {
        await projectContractToNovaAccess({
          contract: {
            ...contract,
            provider_status: providerStatus,
          },
          plan,
          providerPayload: providerResult,
        });
      } else if (
        ["inactive", "paused", "expired"].includes(providerStatus)
      ) {
        await suspendNovaAccess({
          contract,
          reason: `HitPay subscription ${providerStatus}`,
          providerStatus,
        });
      }

      return json({
        ok: true,
        status: providerStatus || "unknown",
      });
    }

    if (
      ["cancel_period_end", "cancel_immediate", "reactivate"].includes(action) &&
      contract.pending_plan_id
    ) {
      return json(
        {
          error:
            "This subscription has a pending plan change. Cancel the pending plan change first, then perform the subscription action.",
        },
        409,
      );
    }

    if (action === "cancel_period_end") {
      const periodEnd = contract.current_period_end
        ? new Date(contract.current_period_end)
        : null;

      if (
        !periodEnd ||
        !Number.isFinite(periodEnd.getTime()) ||
        periodEnd.getTime() <= Date.now()
      ) {
        return json(
          {
            error:
              "Refresh the subscription first. A future paid-through period end is required before scheduling cancellation.",
          },
          409,
        );
      }

      const cancellationRequestedAt = new Date().toISOString();

      const { error: localStateError } = await supabaseAdmin
        .from("dreamscape_subscription_contracts")
        .update({
          status: "cancel_at_period_end",
          cancel_at_period_end: true,
          cancellation_mode: "period_end",
          cancellation_requested_at: cancellationRequestedAt,
          grace_until: null,
          updated_at: cancellationRequestedAt,
        })
        .eq("id", contract.id);

      if (localStateError) throw localStateError;

      await keepNovaAccessUntilPeriodEnd({
        contract: {
          ...contract,
          cancel_at_period_end: true,
          cancellation_requested_at: cancellationRequestedAt,
        },
        periodEnd,
      });

      try {
        await cancelHitPayRecurringBilling(
          provider.environment,
          provider.id,
        );
      } catch (providerError) {
        await supabaseAdmin
          .from("dreamscape_subscription_contracts")
          .update({
            status: "active",
            cancel_at_period_end: false,
            cancellation_mode: null,
            cancellation_requested_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", contract.id);

        if (contract.learner_user_id) {
          await supabaseAdmin
            .from("nova_subscriptions")
            .update({
              cancel_at_period_end: false,
              cancellation_requested_at: null,
              billing_status: "active",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", contract.learner_user_id)
            .eq("dreamscape_contract_id", contract.id);
        }

        throw providerError;
      }

      await supabaseAdmin
        .from("dreamscape_subscription_contracts")
        .update({
          provider_status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", contract.id);

      await sendDreamscapeSubscriptionEmail({
        contractId: contract.id,
        emailType: "cancellation_scheduled",
        origin: new URL(request.url).origin,
        eventKey: `admin-period-end:${cancellationRequestedAt}`,
      }).catch((emailError) =>
        console.error("Dreamscape cancellation email failed", emailError),
      );

      return json({
        ok: true,
        status: "cancel_at_period_end",
        accessUntil: periodEnd.toISOString(),
      });
    }

    if (action === "cancel_immediate") {
      await cancelHitPayRecurringBilling(
        provider.environment,
        provider.id,
      );

      await supabaseAdmin
        .from("dreamscape_subscription_contracts")
        .update({
          status: "cancelled",
          provider_status: "canceled",
          cancel_at_period_end: false,
          cancellation_mode: "immediate",
          cancellation_requested_at: new Date().toISOString(),
          cancelled_at: new Date().toISOString(),
          grace_until: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contract.id);

      await suspendNovaAccess({
        contract,
        reason: "Dreamscape subscription cancelled immediately",
        providerStatus: "canceled",
      });

      await sendDreamscapeSubscriptionEmail({
        contractId: contract.id,
        emailType: "subscription_ended",
        origin: new URL(request.url).origin,
        eventKey: `admin-immediate:${new Date().toISOString()}`,
      }).catch((emailError) =>
        console.error("Dreamscape ended email failed", emailError),
      );

      return json({
        ok: true,
        status: "cancelled",
      });
    }

    if (action === "reactivate") {
      if (!plan.hitpay_plan_id) {
        return json(
          { error: "The Dreamscape plan is not mapped to HitPay." },
          409,
        );
      }

      const result = await updateHitPayRecurringBilling({
        environment: provider.environment,
        recurringBillingId: provider.id,
        planId: plan.hitpay_plan_id,
        startDate: singaporeDateString(),
        sendEmail: true,
      });

      await supabaseAdmin
        .from("dreamscape_subscription_contracts")
        .update({
          status: "setup_pending",
          provider_status: result.status || "scheduled",
          cancel_at_period_end: false,
          cancellation_mode: null,
          cancellation_requested_at: null,
          cancelled_at: null,
          grace_until: null,
          reactivated_at: new Date().toISOString(),
          provider_data: result,
          last_provider_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", contract.id);

      return json({
        ok: true,
        status: result.status || "scheduled",
      });
    }

    return json({ error: "Unknown subscription action." }, 400);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    if (message === "AUTH_REQUIRED") {
      return json({ error: "Please sign in again." }, 401);
    }

    if (message === "ACCESS_DENIED") {
      return json({ error: "Billing staff access required." }, 403);
    }

    console.error("Dreamscape subscription action failed", error);
    return json({ error: message }, 500);
  }
}
