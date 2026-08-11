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
  | "reactivate";

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

async function loadContract(contractId: string) {
  const { data: contract, error } = await supabaseAdmin
    .from("dreamscape_subscription_contracts")
    .select("*")
    .eq("id", contractId)
    .single();

  if (error) throw error;

  const { data: plan, error: planError } = await supabaseAdmin
    .from("dreamscape_subscription_plans")
    .select("*")
    .eq("id", contract.plan_id)
    .single();

  if (planError) throw planError;

  return {
    contract: contract as DreamscapeContractRow & {
      plan_id: string;
      provider_environment: string | null;
    },
    plan: plan as DreamscapePlanRow,
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

export async function POST(request: Request) {
  try {
    await requireBillingStaff(request);

    const body = (await request.json()) as {
      contractId?: string;
      action?: SubscriptionAction;
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

    if (action === "refresh") {
      const providerResult = await getHitPayRecurringBilling(
        provider.environment,
        provider.id,
      );

      const providerStatus = String(
        providerResult.status || "",
      )
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

      const cancellationRequestedAt =
        new Date().toISOString();

      // Set the paid-through cancellation state BEFORE calling HitPay.
      // This prevents a fast provider webhook from being interpreted as
      // an immediate cancellation.
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
        // Provider cancellation did not complete, so restore the local
        // subscription to Active rather than falsely presenting it as
        // scheduled for cancellation.
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
