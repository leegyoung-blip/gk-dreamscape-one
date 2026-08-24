import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  createDreamscapeStripePaymentMethodPortal,
  getDreamscapeStripeSubscription,
  getStripePriceId,
  getStripeSubscriptionPeriod,
  isStripeEnvironment,
  pauseDreamscapeStripeSubscription,
  releaseDreamscapeStripePlanSchedule,
  resumeDreamscapeStripeSubscription,
  scheduleDreamscapeStripePlanChange,
  setDreamscapeStripeCancelAtPeriodEnd,
} from "@/lib/stripe";
import {
  keepNovaAccessUntilPeriodEnd,
} from "@/lib/dreamscape-subscriptions";
import {
  activateDreamscapeStripeTrialAccess,
  getDreamscapeStripeTrialWindow,
} from "@/lib/dreamscape-trials";
import {
  sendDreamscapeSubscriptionEmail,
} from "@/lib/dreamscapeSubscriptionEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MembershipAction =
  | "payment_method"
  | "change_plan"
  | "cancel_plan_change"
  | "cancel_period_end"
  | "keep_subscription"
  | "pause_membership"
  | "resume_membership"
  | "cancel_trial"
  | "keep_trial";

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

function siteUrlFromRequest(
  request: Request,
) {
  return (
    process.env
      .NEXT_PUBLIC_SITE_URL ||
    new URL(request.url).origin
  ).replace(/\/+$/, "");
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
    createClient(url, key, {
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
    });

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

const liveStatuses =
  new Set([
    "active",
    "payment_issue",
    "cancel_at_period_end",
    "suspended",
    "setup_pending",
  ]);

function isIntroTrialContract(
  contract: Record<string, any>,
) {
  return (
    String(contract.provider || "").toLowerCase() === "stripe" &&
    Boolean(contract.intro_trial_eligible) &&
    Number(contract.intro_trial_days || 0) > 0 &&
    String(contract.provider_status || "").toLowerCase() === "trialing" &&
    Boolean(contract.trial_redeemed_at) &&
    !contract.first_paid_at
  );
}

function contractPriority(
  contract: Record<
    string,
    any
  >,
) {
  const status =
    String(
      contract.status || "",
    ).toLowerCase();

  if (status === "active") {
    return 1;
  }

  if (
    status ===
    "payment_issue"
  ) {
    return 2;
  }

  if (
    status ===
    "cancel_at_period_end"
  ) {
    return 3;
  }

  if (
    status === "suspended"
  ) {
    return 4;
  }

  if (
    status ===
    "setup_pending"
  ) {
    return 5;
  }

  return 20;
}

async function loadMembership(
  userId: string,
) {
  const {
    data: contracts,
    error: contractError,
  } = await supabaseAdmin
    .from(
      "dreamscape_subscription_contracts",
    )
    .select("*")
    .eq(
      "learner_user_id",
      userId,
    )
    .order(
      "updated_at",
      {
        ascending: false,
      },
    )
    .limit(12);

  if (contractError) {
    throw contractError;
  }

  if (
    !contracts ||
    contracts.length === 0
  ) {
    return null;
  }

  const sorted =
    [...contracts].sort(
      (a, b) => {
        const rank =
          contractPriority(a) -
          contractPriority(b);

        if (rank !== 0) {
          return rank;
        }

        return (
          new Date(
            b.updated_at ||
              b.created_at,
          ).getTime() -
          new Date(
            a.updated_at ||
              a.created_at,
          ).getTime()
        );
      },
    );

  const activeCandidate =
    sorted.find((row) =>
      liveStatuses.has(
        String(
          row.status || "",
        ).toLowerCase(),
      ),
    );

  const contract =
    activeCandidate ||
    sorted[0];

  const {
    data: plan,
    error: planError,
  } = await supabaseAdmin
    .from(
      "dreamscape_subscription_plans",
    )
    .select("*")
    .eq(
      "id",
      contract.plan_id,
    )
    .single();

  if (planError) {
    throw planError;
  }

  let pendingPlan:
    | Record<string, any>
    | null = null;

  if (
    contract.pending_plan_id
  ) {
    const {
      data,
      error,
    } = await supabaseAdmin
      .from(
        "dreamscape_subscription_plans",
      )
      .select(
        "id,display_name,plan_key,plan_code,billing_cycle,amount,currency",
      )
      .eq(
        "id",
        contract.pending_plan_id,
      )
      .maybeSingle();

    if (error) {
      throw error;
    }

    pendingPlan = data;
  }

  const {
    data: payments,
    error: paymentError,
  } = await supabaseAdmin
    .from(
      "dreamscape_subscription_payments",
    )
    .select(
      "id,amount,currency,status,paid_at,created_at,refund_amount",
    )
    .eq(
      "contract_id",
      contract.id,
    )
    .order(
      "paid_at",
      {
        ascending: false,
        nullsFirst: false,
      },
    )
    .limit(12);

  if (paymentError) {
    throw paymentError;
  }

  let availablePlans:
    Array<
      Record<string, any>
    > = [];

  if (
    contract.provider ===
      "stripe" &&
    isStripeEnvironment(
      contract.provider_environment,
    )
  ) {
    const {
      data,
      error,
    } = await supabaseAdmin
      .from(
        "dreamscape_subscription_plans",
      )
      .select(
        "id,display_name,plan_key,plan_code,billing_cycle,amount,currency,stripe_test_price_id,stripe_live_price_id",
      )
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
      .order(
        "amount",
      );

    if (error) {
      throw error;
    }

    availablePlans =
      (data || [])
        .filter(
          (row) =>
            row.id !==
            contract.plan_id,
        )
        .filter((row) =>
          Boolean(
            contract
              .provider_environment ===
            "production"
              ? row
                  .stripe_live_price_id
              : row
                  .stripe_test_price_id,
          ),
        );
  }

  return {
    contract,
    plan,
    pendingPlan,
    payments:
      payments || [],
    availablePlans,
  };
}

function rawStripePeriod(
  subscription:
    Record<string, any>,
) {
  const item =
    subscription.items
      ?.data?.[0];

  function asDate(
    value: unknown,
  ) {
    if (
      typeof value !==
        "number" ||
      !Number.isFinite(value)
    ) {
      return null;
    }

    const date =
      new Date(
        value * 1000,
      );

    return Number.isFinite(
      date.getTime(),
    )
      ? date
      : null;
  }

  return {
    start: asDate(
      item?.current_period_start,
    ),
    end: asDate(
      item?.current_period_end,
    ),
  };
}

async function syncNovaPaused(
  contract:
    Record<string, any>,
  pausedAt: string,
  periodEnd?:
    Date | null,
) {
  if (
    !contract
      .learner_user_id
  ) {
    return;
  }

  const {
    error,
  } = await supabaseAdmin
    .from(
      "nova_subscriptions",
    )
    .update({
      status: "paused",
      billing_status:
        "paused",
      access_until:
        pausedAt,
      current_period_end:
        periodEnd?.toISOString() ||
        pausedAt,
      next_billing_at:
        null,
      grace_until: null,
      updated_at:
        pausedAt,
    })
    .eq(
      "user_id",
      contract
        .learner_user_id,
    )
    .eq(
      "dreamscape_contract_id",
      contract.id,
    );

  if (error) {
    throw error;
  }
}

async function syncNovaActive(
  contract:
    Record<string, any>,
  period: {
    start: Date | null;
    end: Date | null;
  },
) {
  if (
    !contract
      .learner_user_id ||
    !period.end
  ) {
    return;
  }

  const nowIso =
    new Date().toISOString();

  const {
    error,
  } = await supabaseAdmin
    .from(
      "nova_subscriptions",
    )
    .update({
      status: "active",
      billing_status:
        "active",
      access_started_at:
        period.start?.toISOString() ||
        nowIso,
      access_until:
        period.end.toISOString(),
      current_period_start:
        period.start?.toISOString() ||
        nowIso,
      current_period_end:
        period.end.toISOString(),
      next_billing_at:
        period.end.toISOString(),
      grace_until: null,
      revoked_at: null,
      revoke_reason: null,
      updated_at:
        nowIso,
    })
    .eq(
      "user_id",
      contract
        .learner_user_id,
    )
    .eq(
      "dreamscape_contract_id",
      contract.id,
    );

  if (error) {
    throw error;
  }
}

export async function GET(
  request: Request,
) {
  try {
    const user =
      await requireCurrentUser(
        request,
      );

    const loaded =
      await loadMembership(
        user.id,
      );

    if (!loaded) {
      return json({
        membership: null,
        availablePlans: [],
        payments: [],
      });
    }

    const {
      contract,
      plan,
      pendingPlan,
      payments,
      availablePlans,
    } = loaded;

    const isStripe =
      contract.provider ===
      "stripe";

    const isPaused =
      contract.status ===
        "suspended" ||
      contract.provider_status ===
        "paused";

    const isTrial =
      isIntroTrialContract(
        contract,
      );

    const isLive =
      liveStatuses.has(
        String(
          contract.status ||
            "",
        ).toLowerCase(),
      );

    return json({
      membership: {
        contractId:
          contract.id,
        provider:
          contract.provider,
        providerEnvironment:
          contract
            .provider_environment ||
          null,

        planId: plan.id,
        planName:
          plan.display_name,
        planCode:
          plan.plan_code,
        billingCycle:
          plan.billing_cycle,
        amount: Number(
          plan.amount || 0,
        ),
        currency:
          plan.currency,

        status:
          contract.status,
        providerStatus:
          contract
            .provider_status ||
          null,

        currentPeriodEnd:
          contract
            .current_period_end ||
          null,
        nextBillingAt:
          contract
            .next_billing_at ||
          null,
        graceUntil:
          contract
            .grace_until ||
          null,
        pausedAt:
          contract.paused_at ||
          null,

        isTrial,
        trialStartedAt:
          contract
            .trial_started_at ||
          null,
        trialEndsAt:
          contract
            .trial_ends_at ||
          null,
        firstBillingAt:
          isTrial
            ? contract
                .trial_ends_at ||
              contract
                .next_billing_at ||
              null
            : null,

        cancelAtPeriodEnd:
          Boolean(
            contract
              .cancel_at_period_end,
          ),

        canUpdatePaymentMethod:
          isStripe &&
          Boolean(
            contract
              .provider_subscription_id,
          ),

        canChangePlan:
          isStripe &&
          !isTrial &&
          contract.status ===
            "active" &&
          !contract
            .cancel_at_period_end &&
          !contract
            .grace_until &&
          !contract
            .pending_plan_id &&
          Boolean(
            contract
              .current_period_end,
          ),

        canPause:
          isStripe &&
          !isTrial &&
          contract.status ===
            "active" &&
          !contract
            .cancel_at_period_end &&
          !contract
            .grace_until &&
          !contract
            .pending_plan_id,

        canResume:
          isStripe &&
          isPaused,

        canCancelAtPeriodEnd:
          isStripe &&
          !isTrial &&
          [
            "active",
            "payment_issue",
          ].includes(
            String(
              contract.status,
            ),
          ) &&
          !contract
            .cancel_at_period_end,

        canKeepSubscription:
          isStripe &&
          !isTrial &&
          Boolean(
            contract
              .cancel_at_period_end,
          ),

        canCancelTrial:
          isStripe &&
          isTrial &&
          !contract
            .cancel_at_period_end,

        canKeepTrial:
          isStripe &&
          isTrial &&
          Boolean(
            contract
              .cancel_at_period_end,
          ),

        isLive,
        isPaused,

        pendingPlan:
          pendingPlan
            ? {
                id:
                  pendingPlan.id,
                name:
                  pendingPlan
                    .display_name,
                planCode:
                  pendingPlan
                    .plan_code,
                billingCycle:
                  pendingPlan
                    .billing_cycle,
                amount:
                  Number(
                    pendingPlan
                      .amount ||
                      0,
                  ),
                currency:
                  pendingPlan
                    .currency,
                effectiveAt:
                  contract
                    .plan_change_effective_at ||
                  null,
                status:
                  contract
                    .plan_change_status ||
                  null,
              }
            : null,
      },

      availablePlans:
        availablePlans.map(
          (row) => ({
            id: row.id,
            name:
              row.display_name,
            planCode:
              row.plan_code,
            billingCycle:
              row.billing_cycle,
            amount:
              Number(
                row.amount ||
                  0,
              ),
            currency:
              row.currency,
          }),
        ),

      payments,
    });
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
      "Dreamscape profile membership load failed",
      error,
    );

    return json(
      {
        error: message,
      },
      500,
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const user =
      await requireCurrentUser(
        request,
      );

    const loaded =
      await loadMembership(
        user.id,
      );

    if (!loaded) {
      return json(
        {
          error:
            "No Dreamscape membership is linked to this account.",
        },
        404,
      );
    }

    const {
      contract,
      plan,
    } = loaded;

    const body =
      (await request.json()) as {
        action?:
          MembershipAction;
        targetPlanId?:
          string;
      };

    const action =
      body.action;

    if (!action) {
      return json(
        {
          error:
            "Membership action is required.",
        },
        400,
      );
    }

    if (
      contract.provider !==
      "stripe"
    ) {
      return json(
        {
          error:
            contract.provider ===
            "gkp_billing"
              ? "This membership is managed through Guru Kids Pro billing."
              : "This legacy membership is not managed through Stripe.",
        },
        409,
      );
    }

    if (
      !contract
        .provider_subscription_id ||
      !isStripeEnvironment(
        contract
          .provider_environment,
      )
    ) {
      return json(
        {
          error:
            "The Stripe subscription is not ready for management.",
        },
        409,
      );
    }

    const environment =
      contract
        .provider_environment;

    const subscriptionId =
      contract
        .provider_subscription_id;

    const isTrial =
      isIntroTrialContract(
        contract,
      );

    if (
      action ===
      "payment_method"
    ) {
      const subscription =
        await getDreamscapeStripeSubscription(
          environment,
          subscriptionId,
        );

      const customerId =
        contract
          .provider_customer_id ||
        (typeof subscription.customer ===
        "string"
          ? subscription.customer
          : subscription.customer
              ?.id ||
            "");

      if (!customerId) {
        return json(
          {
            error:
              "Stripe did not return a customer record for this membership.",
          },
          409,
        );
      }

      if (
        customerId !==
        contract
          .provider_customer_id
      ) {
        await supabaseAdmin
          .from(
            "dreamscape_subscription_contracts",
          )
          .update({
            provider_customer_id:
              customerId,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            contract.id,
          );
      }

      const portal =
        await createDreamscapeStripePaymentMethodPortal({
          environment,
          customerId,
          returnUrl:
            `${siteUrlFromRequest(
              request,
            )}/profile`,
        });

      return json({
        ok: true,
        redirectUrl:
          portal.url,
      });
    }

    if (
      action ===
      "cancel_trial"
    ) {
      if (!isTrial) {
        return json(
          {
            error:
              "This membership is not currently in its introductory trial.",
          },
          409,
        );
      }

      if (
        contract
          .cancel_at_period_end
      ) {
        return json({
          ok: true,
          status:
            "trial_cancel_at_period_end",
          accessUntil:
            contract
              .trial_ends_at ||
            contract
              .current_period_end ||
            null,
        });
      }

      const current =
        await getDreamscapeStripeSubscription(
          environment,
          subscriptionId,
        );

      if (
        current.status !==
        "trialing"
      ) {
        return json(
          {
            error:
              "Stripe no longer reports this membership as trialing. Refresh the page and try again.",
          },
          409,
        );
      }

      const trial =
        getDreamscapeStripeTrialWindow(
          current,
        );

      const trialEnd =
        trial.end ||
        (contract
          .trial_ends_at
          ? new Date(
              contract
                .trial_ends_at,
            )
          : null);

      if (
        !trialEnd ||
        !Number.isFinite(
          trialEnd.getTime(),
        ) ||
        trialEnd.getTime() <=
          Date.now()
      ) {
        return json(
          {
            error:
              "The trial end date is unavailable.",
          },
          409,
        );
      }

      const subscription =
        await setDreamscapeStripeCancelAtPeriodEnd({
          environment,
          subscriptionId,
          cancelAtPeriodEnd:
            true,
        });

      const requestedAt =
        new Date().toISOString();

      const {
        error,
      } = await supabaseAdmin
        .from(
          "dreamscape_subscription_contracts",
        )
        .update({
          status:
            "cancel_at_period_end",
          provider_status:
            subscription.status,
          cancel_at_period_end:
            true,
          cancellation_mode:
            "trial_end",
          cancellation_requested_at:
            requestedAt,
          current_period_end:
            trialEnd.toISOString(),
          trial_ends_at:
            trialEnd.toISOString(),
          next_billing_at:
            null,
          provider_data:
            subscription,
          last_provider_sync_at:
            requestedAt,
          updated_at:
            requestedAt,
        })
        .eq(
          "id",
          contract.id,
        );

      if (error) {
        throw error;
      }

      await keepNovaAccessUntilPeriodEnd({
        contract: {
          ...contract,
          cancel_at_period_end:
            true,
          cancellation_requested_at:
            requestedAt,
        },
        periodEnd:
          trialEnd,
      });

      if (
        contract
          .learner_user_id
      ) {
        await supabaseAdmin
          .from(
            "nova_subscriptions",
          )
          .update({
            billing_status:
              "trial_cancel_at_period_end",
            next_billing_at:
              null,
            updated_at:
              requestedAt,
          })
          .eq(
            "user_id",
            contract
              .learner_user_id,
          )
          .eq(
            "dreamscape_contract_id",
            contract.id,
          );
      }

      await sendDreamscapeSubscriptionEmail({
        contractId:
          contract.id,
        emailType:
          "trial_cancelled",
        origin:
          siteUrlFromRequest(
            request,
          ),
        eventKey:
          `profile-stripe-trial-cancel:${subscription.id}`,
      }).catch(
        (emailError: unknown) =>
          console.error(
            "Stripe trial cancellation email failed",
            emailError,
          ),
      );

      return json({
        ok: true,
        status:
          "trial_cancel_at_period_end",
        accessUntil:
          trialEnd.toISOString(),
      });
    }

    if (
      action ===
      "keep_trial"
    ) {
      if (
        !isTrial ||
        !contract
          .cancel_at_period_end
      ) {
        return json(
          {
            error:
              "This trial is already set to continue normally.",
          },
          409,
        );
      }

      const subscription =
        await setDreamscapeStripeCancelAtPeriodEnd({
          environment,
          subscriptionId,
          cancelAtPeriodEnd:
            false,
        });

      if (
        subscription.status !==
        "trialing"
      ) {
        return json(
          {
            error:
              "Stripe no longer reports this membership as an active trial.",
          },
          409,
        );
      }

      const refreshed =
        await activateDreamscapeStripeTrialAccess({
          contract,
          plan,
          subscription,
        });

      return json({
        ok: true,
        status:
          "trialing",
        trialEndsAt:
          refreshed
            .trialEndsAt,
      });
    }

    if (
      action ===
      "change_plan"
    ) {
      if (
        isTrial ||
        contract.status !==
          "active" ||
        contract
          .cancel_at_period_end ||
        contract.grace_until ||
        contract
          .pending_plan_id
      ) {
        return json(
          {
            error:
              "This membership cannot change plan in its current state.",
          },
          409,
        );
      }

      const targetPlanId =
        String(
          body.targetPlanId ||
            "",
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
        data:
          targetPlan,
        error:
          targetError,
      } = await supabaseAdmin
        .from(
          "dreamscape_subscription_plans",
        )
        .select("*")
        .eq(
          "id",
          targetPlanId,
        )
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
          error,
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
                "profile",
            },
          );

        if (error) {
          throw error;
        }

        transitionId =
          String(
            data || "",
          );

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
              targetPlan
                .plan_key,
            targetPriceId,
          });

        scheduleId =
          scheduled
            .schedule.id;

        const nowIso =
          new Date().toISOString();

        const {
          error:
            scheduleError,
        } = await supabaseAdmin
          .from(
            "dreamscape_subscription_contracts",
          )
          .update({
            provider_schedule_id:
              scheduleId,
            provider_data: {
              subscription:
                scheduled
                  .subscription,
              subscription_schedule:
                scheduled
                  .schedule,
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

        if (
          scheduleError
        ) {
          throw scheduleError;
        }

        const {
          error:
            confirmError,
        } =
          await supabaseAdmin.rpc(
            "gkp_confirm_dreamscape_plan_change",
            {
              p_transition_id:
                transitionId,
              p_provider_response:
                scheduled
                  .schedule,
            },
          );

        if (
          confirmError
        ) {
          await releaseDreamscapeStripePlanSchedule({
            environment,
            subscriptionId,
            scheduleId,
          }).catch(
            () => null,
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
                confirmError
                  .message,
            },
          );

          throw confirmError;
        }

        return json({
          ok: true,
          status:
            "scheduled",
          nextPlan:
            targetPlan
              .display_name,
          effectiveAt:
            scheduled
              .effectiveAt
              .toISOString(),
        });
      } catch (error) {
        if (
          transitionId
        ) {
          try {
            await supabaseAdmin.rpc(
              "gkp_fail_dreamscape_plan_change",
              {
                p_transition_id:
                  transitionId,
                p_error:
                  error instanceof
                  Error
                    ? error.message
                    : String(
                        error,
                      ),
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
      action ===
      "cancel_plan_change"
    ) {
      if (
        !contract
          .pending_plan_id ||
        !contract
          .pending_transition_id
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
          contract
            .provider_schedule_id ||
          null,
      });

      const {
        error,
      } =
        await supabaseAdmin.rpc(
          "gkp_cancel_dreamscape_plan_change",
          {
            p_contract_id:
              contract.id,
            p_requested_by:
              null,
            p_reason:
              "Cancelled from My Profile before effective date",
          },
        );

      if (error) {
        throw error;
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

    if (
      action ===
      "cancel_period_end"
    ) {
      if (isTrial) {
        return json(
          {
            error:
              "Use Cancel Trial while the introductory trial is active.",
          },
          409,
        );
      }

      if (
        contract
          .pending_plan_id
      ) {
        return json(
          {
            error:
              "Cancel the pending plan change before stopping renewal.",
          },
          409,
        );
      }

      if (
        ![
          "active",
          "payment_issue",
        ].includes(
          String(
            contract.status,
          ),
        )
      ) {
        return json(
          {
            error:
              "This membership cannot be scheduled for cancellation.",
          },
          409,
        );
      }

      const current =
        await getDreamscapeStripeSubscription(
          environment,
          subscriptionId,
        );

      const currentPeriod =
        getStripeSubscriptionPeriod(
          current,
        );

      if (
        !currentPeriod.end ||
        currentPeriod.end.getTime() <=
          Date.now()
      ) {
        return json(
          {
            error:
              "The paid-through date is unavailable.",
          },
          409,
        );
      }

      const subscription =
        await setDreamscapeStripeCancelAtPeriodEnd({
          environment,
          subscriptionId,
          cancelAtPeriodEnd:
            true,
        });

      const period =
        getStripeSubscriptionPeriod(
          subscription,
        );

      const periodEnd =
        period.end ||
        currentPeriod.end;

      const requestedAt =
        new Date().toISOString();

      const {
        error,
      } = await supabaseAdmin
        .from(
          "dreamscape_subscription_contracts",
        )
        .update({
          status:
            "cancel_at_period_end",
          provider_status:
            subscription.status,
          cancel_at_period_end:
            true,
          cancellation_mode:
            "period_end",
          cancellation_requested_at:
            requestedAt,
          paused_at: null,
          grace_until: null,
          current_period_end:
            periodEnd.toISOString(),
          next_billing_at:
            null,
          provider_data:
            subscription,
          last_provider_sync_at:
            requestedAt,
          updated_at:
            requestedAt,
        })
        .eq(
          "id",
          contract.id,
        );

      if (error) {
        throw error;
      }

      await keepNovaAccessUntilPeriodEnd({
        contract: {
          ...contract,
          cancel_at_period_end:
            true,
          cancellation_requested_at:
            requestedAt,
        },
        periodEnd,
      });

      await sendDreamscapeSubscriptionEmail({
        contractId:
          contract.id,
        emailType:
          "cancellation_scheduled",
        origin:
          siteUrlFromRequest(
            request,
          ),
        eventKey:
          `profile-stripe-cancel:${requestedAt}`,
      }).catch(
        (emailError: unknown) =>
          console.error(
            "Stripe profile cancellation email failed",
            emailError,
          ),
      );

      return json({
        ok: true,
        status:
          "cancel_at_period_end",
        accessUntil:
          periodEnd.toISOString(),
      });
    }

    if (
      action ===
      "keep_subscription"
    ) {
      if (isTrial) {
        return json(
          {
            error:
              "Use Keep Trial while the introductory trial is active.",
          },
          409,
        );
      }

      if (
        !contract
          .cancel_at_period_end
      ) {
        return json(
          {
            error:
              "This membership is already set to renew.",
          },
          409,
        );
      }

      const subscription =
        await setDreamscapeStripeCancelAtPeriodEnd({
          environment,
          subscriptionId,
          cancelAtPeriodEnd:
            false,
        });

      const period =
        getStripeSubscriptionPeriod(
          subscription,
        );

      const nowIso =
        new Date().toISOString();

      const {
        error,
      } = await supabaseAdmin
        .from(
          "dreamscape_subscription_contracts",
        )
        .update({
          status: "active",
          provider_status:
            subscription.status,
          cancel_at_period_end:
            false,
          cancellation_mode:
            null,
          cancellation_requested_at:
            null,
          paused_at: null,
          current_period_start:
            period.start?.toISOString() ||
            null,
          current_period_end:
            period.end?.toISOString() ||
            contract
              .current_period_end,
          next_billing_at:
            period.end?.toISOString() ||
            contract
              .current_period_end,
          provider_data:
            subscription,
          last_provider_sync_at:
            nowIso,
          updated_at:
            nowIso,
        })
        .eq(
          "id",
          contract.id,
        );

      if (error) {
        throw error;
      }

      if (period.end) {
        await syncNovaActive(
          contract,
          period,
        );
      }

      return json({
        ok: true,
        status: "active",
      });
    }

    if (
      action ===
      "pause_membership"
    ) {
      if (
        isTrial ||
        contract.status !==
          "active" ||
        contract
          .cancel_at_period_end ||
        contract.grace_until ||
        contract
          .pending_plan_id
      ) {
        return json(
          {
            error:
              "This membership cannot be paused in its current state.",
          },
          409,
        );
      }

      const paused =
        await pauseDreamscapeStripeSubscription({
          environment,
          subscriptionId,
        });

      const period =
        rawStripePeriod(
          paused,
        );

      const pausedAt =
        new Date().toISOString();

      const {
        error,
      } = await supabaseAdmin
        .from(
          "dreamscape_subscription_contracts",
        )
        .update({
          status:
            "suspended",
          provider_status:
            "paused",
          paused_at:
            pausedAt,
          cancel_at_period_end:
            false,
          cancellation_mode:
            null,
          cancellation_requested_at:
            null,
          grace_until: null,
          current_period_start:
            period.start?.toISOString() ||
            contract
              .current_period_start,
          current_period_end:
            period.end?.toISOString() ||
            pausedAt,
          next_billing_at:
            null,
          provider_data:
            paused,
          last_provider_sync_at:
            pausedAt,
          updated_at:
            pausedAt,
        })
        .eq(
          "id",
          contract.id,
        );

      if (error) {
        throw error;
      }

      await syncNovaPaused(
        contract,
        pausedAt,
        period.end,
      );

      return json({
        ok: true,
        status: "paused",
        pausedAt,
      });
    }

    if (
      action ===
      "resume_membership"
    ) {
      if (
        contract.status !==
          "suspended" &&
        contract
          .provider_status !==
          "paused"
      ) {
        return json(
          {
            error:
              "This membership is not paused.",
          },
          409,
        );
      }

      const resumed =
        await resumeDreamscapeStripeSubscription({
          environment,
          subscriptionId,
        });

      if (
        String(
          resumed.status ||
            "",
        ).toLowerCase() !==
        "active"
      ) {
        return json(
          {
            error:
              "Stripe has not restored the membership yet. Please check the payment method and try again.",
          },
          409,
        );
      }

      const period =
        rawStripePeriod(
          resumed,
        );

      if (!period.end) {
        return json(
          {
            error:
              "Stripe restored the subscription but did not return the new paid-through date.",
          },
          409,
        );
      }

      const nowIso =
        new Date().toISOString();

      const {
        error,
      } = await supabaseAdmin
        .from(
          "dreamscape_subscription_contracts",
        )
        .update({
          status: "active",
          provider_status:
            "active",
          paused_at: null,
          cancel_at_period_end:
            false,
          cancellation_mode:
            null,
          cancellation_requested_at:
            null,
          grace_until: null,
          current_period_start:
            period.start?.toISOString() ||
            nowIso,
          current_period_end:
            period.end.toISOString(),
          next_billing_at:
            period.end.toISOString(),
          provider_data:
            resumed,
          last_provider_sync_at:
            nowIso,
          updated_at:
            nowIso,
        })
        .eq(
          "id",
          contract.id,
        );

      if (error) {
        throw error;
      }

      await syncNovaActive(
        contract,
        period,
      );

      return json({
        ok: true,
        status: "active",
        accessUntil:
          period.end.toISOString(),
      });
    }

    return json(
      {
        error:
          "Unknown membership action.",
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
      "Dreamscape profile membership action failed",
      error,
    );

    return json(
      {
        error: message,
      },
      500,
    );
  }
}
