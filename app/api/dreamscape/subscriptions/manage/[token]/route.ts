import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  cancelHitPayRecurringBilling,
  getHitPayRecurringBilling,
  isHitPayEnvironment,
} from "@/lib/hitpay";
import { keepNovaAccessUntilPeriodEnd } from "@/lib/dreamscape-subscriptions";
import { sendDreamscapeSubscriptionEmail } from "@/lib/dreamscapeSubscriptionEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ token: string }>;
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function loadByToken(token: string) {
  const { data: contract, error } = await supabaseAdmin
    .from("dreamscape_subscription_contracts")
    .select("*")
    .eq("management_token", token)
    .eq("management_link_enabled", true)
    .maybeSingle();

  if (error) throw error;
  if (!contract) return null;

  const [{ data: plan, error: planError }, paymentsResult] =
    await Promise.all([
      supabaseAdmin
        .from("dreamscape_subscription_plans")
        .select(
          "display_name,plan_code,billing_cycle,amount,currency",
        )
        .eq("id", contract.plan_id)
        .single(),
      supabaseAdmin
        .from("dreamscape_subscription_payments")
        .select("amount,currency,status,paid_at,created_at")
        .eq("contract_id", contract.id)
        .order("paid_at", { ascending: false, nullsFirst: false })
        .limit(12),
    ]);

  if (planError) throw planError;
  if (paymentsResult.error) throw paymentsResult.error;

  return {
    contract,
    plan,
    payments: paymentsResult.data || [],
  };
}

export async function GET(
  request: Request,
  context: Params,
) {
  try {
    const { token } = await context.params;
    const loaded = await loadByToken(token);

    if (!loaded) {
      return json({ error: "Subscription link not found." }, 404);
    }

    const { contract, plan, payments } = loaded;

    return json({
      subscription: {
        learnerName: contract.learner_name,
        learnerEmail: contract.learner_email,
        parentName: contract.parent_name,
        planName: plan.display_name,
        planCode: plan.plan_code,
        billingCycle: plan.billing_cycle,
        amount: Number(plan.amount || 0),
        currency: plan.currency,
        status: contract.status,
        providerStatus: contract.provider_status,
        currentPeriodEnd: contract.current_period_end,
        nextBillingAt: contract.next_billing_at,
        graceUntil: contract.grace_until,
        cancelAtPeriodEnd: Boolean(contract.cancel_at_period_end),
        canCancelAtPeriodEnd: ["active", "payment_issue"].includes(
          String(contract.status),
        ),
        canUpdatePaymentMethod: Boolean(
          contract.provider_subscription_id &&
            contract.provider_environment,
        ),
      },
      payments,
    });
  } catch (error) {
    console.error("Dreamscape parent management load failed", error);
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load subscription.",
      },
      500,
    );
  }
}

export async function POST(
  request: Request,
  context: Params,
) {
  try {
    const { token } = await context.params;
    const loaded = await loadByToken(token);

    if (!loaded) {
      return json({ error: "Subscription link not found." }, 404);
    }

    const { contract } = loaded;
    const body = (await request.json()) as {
      action?: "cancel_period_end" | "payment_method";
    };

    if (
      !contract.provider_subscription_id ||
      !isHitPayEnvironment(contract.provider_environment)
    ) {
      return json(
        { error: "The HitPay subscription is not ready." },
        409,
      );
    }

    if (body.action === "payment_method") {
      const provider = await getHitPayRecurringBilling(
        contract.provider_environment,
        contract.provider_subscription_id,
      );

      const url = String(provider.url || "").trim();

      if (!url) {
        return json(
          {
            error:
              "HitPay did not return a secure payment-method management URL. Please contact Guru Kids Pro.",
          },
          409,
        );
      }

      return json({ ok: true, redirectUrl: url });
    }

    if (body.action === "cancel_period_end") {
      if (!["active", "payment_issue"].includes(contract.status)) {
        return json(
          { error: "This subscription cannot be scheduled for cancellation." },
          409,
        );
      }

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
              "The paid-through date is unavailable. Please contact Guru Kids Pro before cancelling.",
          },
          409,
        );
      }

      const requestedAt = new Date().toISOString();

      const { error: stateError } = await supabaseAdmin
        .from("dreamscape_subscription_contracts")
        .update({
          status: "cancel_at_period_end",
          cancel_at_period_end: true,
          cancellation_mode: "period_end",
          cancellation_requested_at: requestedAt,
          grace_until: null,
          updated_at: requestedAt,
        })
        .eq("id", contract.id);

      if (stateError) throw stateError;

      await keepNovaAccessUntilPeriodEnd({
        contract: {
          ...contract,
          cancel_at_period_end: true,
          cancellation_requested_at: requestedAt,
        },
        periodEnd,
      });

      try {
        await cancelHitPayRecurringBilling(
          contract.provider_environment,
          contract.provider_subscription_id,
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
        eventKey: `parent-cancel:${requestedAt}`,
      }).catch((error) =>
        console.error("Cancellation email failed", error),
      );

      return json({
        ok: true,
        status: "cancel_at_period_end",
        accessUntil: periodEnd.toISOString(),
      });
    }

    return json({ error: "Unknown management action." }, 400);
  } catch (error) {
    console.error("Dreamscape parent management action failed", error);
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The subscription action could not be completed.",
      },
      500,
    );
  }
}
