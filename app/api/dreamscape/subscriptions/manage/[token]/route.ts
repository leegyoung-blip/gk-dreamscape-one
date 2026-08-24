import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  cancelHitPayRecurringBilling,
  getHitPayRecurringBilling,
  isHitPayEnvironment,
  updateHitPayRecurringBilling,
} from "@/lib/hitpay";
import {
  createDreamscapeStripePaymentMethodPortal,
  getDreamscapeStripeSubscription,
  getStripeSubscriptionPeriod,
  isStripeEnvironment,
  setDreamscapeStripeCancelAtPeriodEnd,
  scheduleDreamscapeStripePlanChange,
  releaseDreamscapeStripePlanSchedule,
  getStripePriceId,
} from "@/lib/stripe";
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

function siteUrlFromRequest(request: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  ).replace(/\/+$/, "");
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

  const planFields =
    "id,display_name,plan_key,plan_code,billing_cycle,amount,currency,provider,hitpay_plan_id,hitpay_environment,stripe_test_price_id,stripe_live_price_id";

  const [{ data: plan, error: planError }, paymentsResult] =
    await Promise.all([
      supabaseAdmin
        .from("dreamscape_subscription_plans")
        .select(planFields)
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

  let pendingPlan = null;

  if (contract.pending_plan_id) {
    const { data, error: pendingError } = await supabaseAdmin
      .from("dreamscape_subscription_plans")
      .select("id,display_name,plan_key,plan_code,billing_cycle,amount,currency")
      .eq("id", contract.pending_plan_id)
      .maybeSingle();

    if (pendingError) throw pendingError;
    pendingPlan = data;
  }

  let availablePlans: Array<Record<string, unknown>> = [];

  if (
    contract.provider === "hitpay" ||
    contract.provider === "stripe"
  ) {
    const { data, error: plansError } = await supabaseAdmin
      .from("dreamscape_subscription_plans")
      .select(planFields)
      .eq("audience", "public")
      .eq("is_available", true)
      .eq("is_coming_soon", false)
      .order("amount");

    if (plansError) throw plansError;

    availablePlans = (data || [])
      .filter(
        (item) =>
          item.id !== contract.plan_id,
      )
      .filter((item) => {
        if (contract.provider === "hitpay") {
          return Boolean(
            item.hitpay_plan_id,
          );
        }

        if (
          !isStripeEnvironment(
            contract.provider_environment,
          )
        ) {
          return false;
        }

        return Boolean(
          contract.provider_environment === "production"
            ? item.stripe_live_price_id
            : item.stripe_test_price_id,
        );
      });
  }

  return {
    contract,
    plan,
    pendingPlan,
    availablePlans,
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

    const { contract, plan, pendingPlan, availablePlans, payments } = loaded;

    const isStripe = contract.provider === "stripe";
    const isHitPay = contract.provider === "hitpay";

    return json({
      subscription: {
        learnerName: contract.learner_name,
        learnerEmail: contract.learner_email,
        parentName: contract.parent_name,
        planId: plan.id,
        planName: plan.display_name,
        planCode: plan.plan_code,
        billingCycle: plan.billing_cycle,
        amount: Number(plan.amount || 0),
        currency: plan.currency,
        provider: contract.provider,
        status: contract.status,
        providerStatus: contract.provider_status,
        currentPeriodEnd: contract.current_period_end,
        nextBillingAt: contract.next_billing_at,
        graceUntil: contract.grace_until,
        cancelAtPeriodEnd: Boolean(contract.cancel_at_period_end),
        canCancelAtPeriodEnd: ["active", "payment_issue"].includes(
          String(contract.status),
        ),
        canUpdatePaymentMethod:
          (isStripe &&
            Boolean(
              contract.provider_customer_id ||
                contract.provider_subscription_id,
            )) ||
          (isHitPay &&
            Boolean(
              contract.provider_subscription_id &&
                contract.provider_environment,
            )),
        canChangePlan:
          (isHitPay || isStripe) &&
          contract.status === "active" &&
          !contract.cancel_at_period_end &&
          !contract.grace_until &&
          Number(contract.failed_charge_count || 0) === 0 &&
          !contract.pending_plan_id &&
          Boolean(contract.current_period_end),
        pendingPlan: pendingPlan
          ? {
              id: pendingPlan.id,
              name: pendingPlan.display_name,
              planCode: pendingPlan.plan_code,
              billingCycle: pendingPlan.billing_cycle,
              amount: Number(pendingPlan.amount || 0),
              currency: pendingPlan.currency,
              effectiveAt: contract.plan_change_effective_at,
              status: contract.plan_change_status,
            }
          : null,
      },
      availablePlans: availablePlans.map((item) => ({
        id: item.id,
        name: item.display_name,
        planCode: item.plan_code,
        billingCycle: item.billing_cycle,
        amount: Number(item.amount || 0),
        currency: item.currency,
      })),
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

    const { contract, plan } = loaded;
    const body = (await request.json()) as {
      action?:
        | "cancel_period_end"
        | "payment_method"
        | "change_plan"
        | "cancel_plan_change";
      targetPlanId?: string;
    };

    if (contract.provider === "stripe") {
      if (
        !contract.provider_subscription_id ||
        !isStripeEnvironment(contract.provider_environment)
      ) {
        return json(
          { error: "The Stripe subscription is not ready." },
          409,
        );
      }

      const environment = contract.provider_environment;
      const subscriptionId = contract.provider_subscription_id;

      if (body.action === "payment_method") {
        const subscription = await getDreamscapeStripeSubscription(
          environment,
          subscriptionId,
        );

        const customerId =
          contract.provider_customer_id ||
          (typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id || "");

        if (!customerId) {
          return json(
            {
              error:
                "Stripe did not return a customer record for this subscription.",
            },
            409,
          );
        }

        if (customerId !== contract.provider_customer_id) {
          await supabaseAdmin
            .from("dreamscape_subscription_contracts")
            .update({
              provider_customer_id: customerId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", contract.id);
        }

        const returnUrl = `${siteUrlFromRequest(
          request,
        )}/dreamscape/subscription/${encodeURIComponent(token)}`;

        const portal = await createDreamscapeStripePaymentMethodPortal({
          environment,
          customerId,
          returnUrl,
        });

        return json({
          ok: true,
          redirectUrl: portal.url,
        });
      }

      if (body.action === "change_plan") {
        const targetPlanId =
          String(
            body.targetPlanId || "",
          ).trim();

        if (!targetPlanId) {
          return json(
            {
              error:
                "Choose the new plan.",
            },
            400,
          );
        }

        const {
          data: targetPlan,
          error: targetError,
        } = await supabaseAdmin
          .from(
            "dreamscape_subscription_plans",
          )
          .select("*")
          .eq("id", targetPlanId)
          .eq(
            "audience",
            "public",
          )
          .eq(
            "is_available",
            true,
          )
          .eq(
            "is_coming_soon",
            false,
          )
          .maybeSingle();

        if (targetError) {
          throw targetError;
        }

        if (!targetPlan) {
          return json(
            {
              error:
                "The selected plan is not available.",
            },
            409,
          );
        }

        const targetPriceId =
          getStripePriceId(
            targetPlan,
            environment,
          );

        let transitionId:
          | string
          | null = null;

        let scheduleId:
          | string
          | null = null;

        try {
          const {
            data,
            error: beginError,
          } =
            await supabaseAdmin.rpc(
              "gkp_begin_dreamscape_plan_change",
              {
                p_contract_id:
                  contract.id,
                p_target_plan_id:
                  targetPlan.id,
                p_requested_by:
                  null,
                p_source:
                  "parent",
              },
            );

          if (beginError) {
            throw beginError;
          }

          transitionId =
            String(data || "");

          if (!transitionId) {
            throw new Error(
              "The plan change could not be scheduled.",
            );
          }

          const scheduled =
            await scheduleDreamscapeStripePlanChange({
              environment,
              subscriptionId,
              contractId:
                contract.id,
              targetPlanId:
                targetPlan.id,
              targetPlanKey:
                targetPlan.plan_key,
              targetPriceId,
            });

          scheduleId =
            scheduled.schedule.id;

          const nowIso =
            new Date().toISOString();

          const {
            error:
              scheduleStateError,
          } = await supabaseAdmin
            .from(
              "dreamscape_subscription_contracts",
            )
            .update({
              provider_schedule_id:
                scheduleId,
              provider_data: {
                subscription:
                  scheduled.subscription,
                subscription_schedule:
                  scheduled.schedule,
              },
              last_provider_sync_at:
                nowIso,
              updated_at:
                nowIso,
            })
            .eq(
              "id",
              contract.id,
            );

          if (scheduleStateError) {
            throw scheduleStateError;
          }

          const {
            error: confirmError,
          } =
            await supabaseAdmin.rpc(
              "gkp_confirm_dreamscape_plan_change",
              {
                p_transition_id:
                  transitionId,
                p_provider_response:
                  scheduled.schedule,
              },
            );

          if (confirmError) {
            await releaseDreamscapeStripePlanSchedule({
              environment,
              subscriptionId,
              scheduleId,
            }).catch(
              (releaseError) =>
                console.error(
                  "Could not release Stripe schedule after parent plan-change confirmation failure",
                  releaseError,
                ),
            );

            await supabaseAdmin
              .from(
                "dreamscape_subscription_contracts",
              )
              .update({
                provider_schedule_id:
                  null,
                updated_at:
                  new Date().toISOString(),
              })
              .eq(
                "id",
                contract.id,
              );

            await supabaseAdmin.rpc(
              "gkp_fail_dreamscape_plan_change",
              {
                p_transition_id:
                  transitionId,
                p_error:
                  confirmError.message,
              },
            );

            throw confirmError;
          }

          return json({
            ok: true,
            status:
              "scheduled",
            nextPlan:
              targetPlan.display_name,
            effectiveAt:
              scheduled.effectiveAt.toISOString(),
          });
        } catch (error) {
          if (transitionId) {
            try {
              await supabaseAdmin.rpc(
                "gkp_fail_dreamscape_plan_change",
                {
                  p_transition_id:
                    transitionId,
                  p_error:
                    error instanceof Error
                      ? error.message
                      : String(error),
                },
              );
            } catch {
              // Preserve the original error.
            }
          }

          throw error;
        }
      }

      if (
        body.action ===
        "cancel_plan_change"
      ) {
        if (
          !contract.pending_plan_id ||
          !contract.pending_transition_id
        ) {
          return json(
            {
              error:
                "There is no pending plan change.",
            },
            409,
          );
        }

        await releaseDreamscapeStripePlanSchedule({
          environment,
          subscriptionId,
          scheduleId:
            contract.provider_schedule_id ||
            null,
        });

        const {
          error: cancelError,
        } =
          await supabaseAdmin.rpc(
            "gkp_cancel_dreamscape_plan_change",
            {
              p_contract_id:
                contract.id,
              p_requested_by:
                null,
              p_reason:
                "Cancelled by parent before effective date",
            },
          );

        if (cancelError) {
          throw cancelError;
        }

        await supabaseAdmin
          .from(
            "dreamscape_subscription_contracts",
          )
          .update({
            provider_schedule_id:
              null,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            contract.id,
          );

        return json({
          ok: true,
          status:
            "plan_change_cancelled",
        });
      }

      if (body.action === "cancel_period_end") {
        if (contract.pending_plan_id) {
          return json(
            {
              error:
                "Cancel the pending plan change first, then schedule subscription cancellation.",
            },
            409,
          );
        }

        if (!["active", "payment_issue"].includes(contract.status)) {
          return json(
            {
              error:
                "This subscription cannot be scheduled for cancellation.",
            },
            409,
          );
        }

        const current = await getDreamscapeStripeSubscription(
          environment,
          subscriptionId,
        );
        const currentPeriod = getStripeSubscriptionPeriod(current);

        if (
          !currentPeriod.end ||
          currentPeriod.end.getTime() <= Date.now()
        ) {
          return json(
            {
              error:
                "The paid-through date is unavailable. Please contact Guru Kids Pro before cancelling.",
            },
            409,
          );
        }

        const subscription = await setDreamscapeStripeCancelAtPeriodEnd({
          environment,
          subscriptionId,
          cancelAtPeriodEnd: true,
        });

        const period = getStripeSubscriptionPeriod(subscription);
        const periodEnd = period.end || currentPeriod.end;
        const requestedAt = new Date().toISOString();

        const { error: stateError } = await supabaseAdmin
          .from("dreamscape_subscription_contracts")
          .update({
            status: "cancel_at_period_end",
            provider_status: subscription.status,
            cancel_at_period_end: true,
            cancellation_mode: "period_end",
            cancellation_requested_at: requestedAt,
            grace_until: null,
            current_period_end: periodEnd.toISOString(),
            next_billing_at: null,
            provider_data: subscription,
            last_provider_sync_at: requestedAt,
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

        await sendDreamscapeSubscriptionEmail({
          contractId: contract.id,
          emailType: "cancellation_scheduled",
          origin: siteUrlFromRequest(request),
          eventKey: `parent-stripe-cancel:${requestedAt}`,
        }).catch((error) =>
          console.error("Stripe cancellation email failed", error),
        );

        return json({
          ok: true,
          status: "cancel_at_period_end",
          accessUntil: periodEnd.toISOString(),
        });
      }

      return json({ error: "Unknown management action." }, 400);
    }

    if (contract.provider !== "hitpay") {
      return json(
        { error: "This subscription provider is not supported." },
        409,
      );
    }

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

    if (body.action === "change_plan") {
      const targetPlanId = String(body.targetPlanId || "").trim();

      if (!targetPlanId) {
        return json({ error: "Choose the new plan." }, 400);
      }

      const { data: targetPlan, error: targetError } = await supabaseAdmin
        .from("dreamscape_subscription_plans")
        .select("*")
        .eq("id", targetPlanId)
        .eq("audience", "public")
        .eq("provider", "hitpay")
        .eq("is_available", true)
        .eq("is_coming_soon", false)
        .maybeSingle();

      if (targetError) throw targetError;

      if (!targetPlan?.hitpay_plan_id) {
        return json({ error: "The selected plan is not available." }, 409);
      }

      let transitionId: string | null = null;

      try {
        const { data, error: beginError } = await supabaseAdmin.rpc(
          "gkp_begin_dreamscape_plan_change",
          {
            p_contract_id: contract.id,
            p_target_plan_id: targetPlan.id,
            p_requested_by: null,
            p_source: "parent",
          },
        );

        if (beginError) throw beginError;
        transitionId = String(data || "");

        if (!transitionId) {
          throw new Error("The plan change could not be scheduled.");
        }

        const providerResult = await updateHitPayRecurringBilling({
          environment: contract.provider_environment,
          recurringBillingId: contract.provider_subscription_id,
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
          if (plan.hitpay_plan_id) {
            await updateHitPayRecurringBilling({
              environment: contract.provider_environment,
              recurringBillingId: contract.provider_subscription_id,
              planId: plan.hitpay_plan_id,
              sendEmail: false,
            }).catch((revertError) =>
              console.error("Could not revert parent plan change", revertError),
            );
          }
          throw confirmError;
        }

        return json({
          ok: true,
          status: "scheduled",
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

    if (body.action === "cancel_plan_change") {
      if (!contract.pending_plan_id) {
        return json({ error: "There is no pending plan change." }, 409);
      }

      if (!plan.hitpay_plan_id) {
        return json(
          { error: "The current plan is not mapped to HitPay." },
          409,
        );
      }

      await updateHitPayRecurringBilling({
        environment: contract.provider_environment,
        recurringBillingId: contract.provider_subscription_id,
        planId: plan.hitpay_plan_id,
        sendEmail: false,
      });

      const { error } = await supabaseAdmin.rpc(
        "gkp_cancel_dreamscape_plan_change",
        {
          p_contract_id: contract.id,
          p_requested_by: null,
          p_reason: "Cancelled by parent before effective date",
        },
      );

      if (error) throw error;

      return json({ ok: true, status: "plan_change_cancelled" });
    }

    if (body.action === "cancel_period_end") {
      if (contract.pending_plan_id) {
        return json(
          {
            error:
              "Cancel the pending plan change first, then schedule subscription cancellation.",
          },
          409,
        );
      }

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
        origin: siteUrlFromRequest(request),
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
