import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

import {
  createDreamscapeStripeCheckout,
  getStripeEnvironment,
  getStripePriceId,
} from "@/lib/stripe";

import {
  normaliseEmail,
  normaliseText,
  type DreamscapePlanRow,
} from "@/lib/dreamscape-subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STANDARD_TRIAL_DAYS = 7;

/*
 * Public DREAMSCAPE checkout:
 *
 * Core Monthly
 * Core Annual
 * NOVA+ Monthly
 * NOVA+ Annual
 *
 * Full Access remains Coming Soon and is deliberately excluded.
 * GKP-priced plans are also deliberately excluded.
 */
const ALLOWED_PLAN_KEYS = new Set([
  "core_monthly",
  "core_annual",
  "nova_monthly",
  "nova_annual",
]);

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

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/*
 * Introductory trial policy:
 *
 * - Core and NOVA+ both use the same 7-day introductory trial.
 * - The trial is account/learner-wide, not once per plan.
 * - A previous redeemed Dreamscape trial OR a previous successful
 *   Dreamscape payment removes first-time trial eligibility.
 * - An abandoned/expired Checkout Session by itself does not burn
 *   the learner's trial.
 */
async function getIntroTrialEligibility(
  learnerEmail: string,
) {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("dreamscape_subscription_contracts")
    .select(
      "id,trial_redeemed_at,first_paid_at",
    )
    .eq("learner_email", learnerEmail)
    .or(
      "trial_redeemed_at.not.is.null,first_paid_at.not.is.null",
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const eligible = !data;

  return {
    eligible,
    days: eligible
      ? STANDARD_TRIAL_DAYS
      : 0,
  };
}

export async function POST(
  request: Request,
) {
  let contractId: string | null = null;

  try {
    const body =
      (await request.json()) as {
        planKey?: string;
        parentName?: string;
        parentEmail?: string;
        learnerName?: string;
        learnerEmail?: string;
        guardianAuthorised?: boolean;

        /*
         * Honeypot.
         */
        website?: string;
      };

    if (
      String(
        body.website || "",
      ).trim()
    ) {
      return json(
        {
          error:
            "Unable to start subscription.",
        },
        400,
      );
    }

    const planKey =
      normaliseText(
        body.planKey,
        80,
      );

    const parentName =
      normaliseText(
        body.parentName,
        160,
      );

    const parentEmail =
      normaliseEmail(
        body.parentEmail,
      );

    const learnerName =
      normaliseText(
        body.learnerName,
        160,
      );

    const learnerEmail =
      normaliseEmail(
        body.learnerEmail,
      );

    const guardianAuthorised =
      Boolean(
        body.guardianAuthorised,
      );

    if (
      !ALLOWED_PLAN_KEYS.has(
        planKey,
      )
    ) {
      return json(
        {
          error:
            "Invalid Dreamscape plan.",
        },
        400,
      );
    }

    if (
      !parentName ||
      !learnerName ||
      !validEmail(
        parentEmail,
      ) ||
      !validEmail(
        learnerEmail,
      )
    ) {
      return json(
        {
          error:
            "Complete all parent and learner details.",
        },
        400,
      );
    }

    if (
      !guardianAuthorised
    ) {
      return json(
        {
          error:
            "Parent/guardian authorisation must be confirmed.",
        },
        400,
      );
    }

    /*
     * Prevent duplicate public/GKP Dreamscape billing.
     */
    const {
      data: conflict,
      error: conflictError,
    } =
      await supabaseAdmin.rpc(
        "gkp_check_dreamscape_checkout_conflict",
        {
          p_learner_email:
            learnerEmail,
        },
      );

    if (conflictError) {
      throw conflictError;
    }

    if (conflict?.blocked) {
      const source =
        String(
          conflict.source || "",
        );

      return json(
        {
          error:
            source === "gkp"
              ? "This learner already has Guru Kids Pro Dreamscape access. Please contact Guru Kids Pro before starting a separate public subscription."
              : "This learner already has a Dreamscape subscription or subscription setup in progress.",

          code:
            "EXISTING_DREAMSCAPE_ACCESS",

          source,
        },
        409,
      );
    }

    /*
     * Preserve the existing master public-checkout switch.
     */
    const {
      data: settings,
      error: settingsError,
    } =
      await supabaseAdmin
        .from(
          "dreamscape_billing_settings",
        )
        .select(
          "public_checkout_enabled",
        )
        .eq(
          "id",
          true,
        )
        .maybeSingle();

    if (settingsError) {
      throw settingsError;
    }

    if (
      !settings
        ?.public_checkout_enabled
    ) {
      return json(
        {
          error:
            "Dreamscape public subscriptions are not open yet.",

          code:
            "PUBLIC_CHECKOUT_DISABLED",
        },
        403,
      );
    }

    /*
     * Load only a currently purchasable PUBLIC plan.
     *
     * Full Access remains safe because:
     * - complete_* is not in ALLOWED_PLAN_KEYS
     * - its rows are unavailable / coming soon.
     *
     * We intentionally do not require plan.provider here because
     * the Stripe Price mapping determines checkout and legacy plan
     * rows may have historical provider metadata.
     */
    const {
      data: plan,
      error: planError,
    } =
      await supabaseAdmin
        .from(
          "dreamscape_subscription_plans",
        )
        .select("*")
        .eq(
          "plan_key",
          planKey,
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

    if (planError) {
      throw planError;
    }

    if (!plan) {
      return json(
        {
          error:
            "This subscription plan is not available.",
        },
        404,
      );
    }

    const typedPlan =
      plan as DreamscapePlanRow;

    const environment =
      getStripeEnvironment();

    /*
     * Production selects stripe_live_price_id.
     * Sandbox selects stripe_test_price_id.
     *
     * Your current NOVA+ setup is live-only, so Vercel Production
     * must use STRIPE_ENVIRONMENT=production.
     */
    const priceId =
      getStripePriceId(
        typedPlan,
        environment,
      );

    /*
     * Resolve the 7-day introductory trial BEFORE inserting the
     * new contract so this new setup_pending row cannot affect its
     * own eligibility check.
     */
    const introTrial =
      await getIntroTrialEligibility(
        learnerEmail,
      );

    const introTrialEligible =
      introTrial.eligible;

    const introTrialDays =
      introTrial.days;

    /*
     * Internal Dreamscape subscription reference.
     */
    const reference =
      `DSUB-${crypto.randomUUID()}`;

    /*
     * Create the local contract BEFORE opening Stripe Checkout.
     *
     * These trial fields are also used elsewhere in Dreamscape's
     * membership/webhook flow.
     */
    const {
      data: contract,
      error: contractError,
    } =
      await supabaseAdmin
        .from(
          "dreamscape_subscription_contracts",
        )
        .insert({
          reference,

          plan_id:
            typedPlan.id,

          parent_name:
            parentName,

          parent_email:
            parentEmail,

          learner_name:
            learnerName,

          learner_email:
            learnerEmail,

          guardian_authorised:
            true,

          intro_trial_eligible:
            introTrialEligible,

          intro_trial_days:
            introTrialDays,

          provider:
            "stripe",

          provider_environment:
            environment,

          provider_status:
            "checkout_pending",

          status:
            "setup_pending",
        })
        .select("*")
        .single();

    if (contractError) {
      throw contractError;
    }

    contractId =
      contract.id;

    const siteUrl =
      (
        process.env
          .NEXT_PUBLIC_SITE_URL ||
        new URL(
          request.url,
        ).origin
      ).replace(
        /\/$/,
        "",
      );

    /*
     * The webhook — not the return page — activates trial/paid
     * access after Stripe has created the Subscription.
     *
     * CHECKOUT_SESSION_ID is Stripe's literal placeholder.
     */
    const successUrl =
      `${siteUrl}` +
      `/dreamscape/subscribe/complete` +
      `?contract=${encodeURIComponent(
        contract.id,
      )}` +
      `&session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl =
      `${siteUrl}` +
      `/pricing` +
      `?checkout=cancelled` +
      `&plan=${encodeURIComponent(
        planKey,
      )}`;

    try {
      const session =
        await createDreamscapeStripeCheckout(
          {
            contractId:
              contract.id,

            reference,

            planId:
              typedPlan.id,

            planKey:
              typedPlan.plan_key,

            priceId,

            parentEmail,

            successUrl,

            cancelUrl,

            /*
             * IMPORTANT:
             * lib/stripe.ts expects the property name trialDays.
             */
            trialDays:
              introTrialDays,

            environment,
          },
        );

      const providerCustomerId =
        typeof session.customer ===
        "string"
          ? session.customer
          : null;

      /*
       * At this stage the Checkout Session exists.
       * The webhook will populate the real Stripe sub_... ID after
       * Checkout completes.
       */
      const {
        error: updateError,
      } =
        await supabaseAdmin
          .from(
            "dreamscape_subscription_contracts",
          )
          .update({
            provider_status:
              session.status ||
              "open",

            provider_customer_id:
              providerCustomerId,

            provider_data: {
              checkout_session_id:
                session.id,

              checkout_status:
                session.status,

              payment_status:
                session.payment_status,

              price_id:
                priceId,

              livemode:
                session.livemode,

              intro_trial_eligible:
                introTrialEligible,

              intro_trial_days:
                introTrialDays,
            },

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            contract.id,
          );

      if (updateError) {
        throw updateError;
      }

      return json({
        ok: true,

        contractId:
          contract.id,

        reference,

        redirectUrl:
          session.url,

        provider:
          "stripe",

        environment,

        planKey:
          typedPlan.plan_key,

        planCode:
          typedPlan.plan_code,

        introTrialEligible,

        introTrialDays,
      });
    } catch (error) {
      /*
       * Checkout failed before the buyer could complete Stripe.
       * This failed setup does NOT consume the learner's trial,
       * because trial_redeemed_at is not set here.
       */
      await supabaseAdmin
        .from(
          "dreamscape_subscription_contracts",
        )
        .update({
          status:
            "failed",

          provider_status:
            "checkout_failed",

          provider_data: {
            setup_error:
              error instanceof Error
                ? error.message
                : String(error),

            intro_trial_eligible:
              introTrialEligible,

            intro_trial_days:
              introTrialDays,
          },

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          contract.id,
        );

      throw error;
    }
  } catch (error) {
    console.error(
      "Dreamscape Stripe subscription start failed",
      {
        contractId,

        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
    );

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start the Dreamscape subscription.",
      },
      500,
    );
  }
}
