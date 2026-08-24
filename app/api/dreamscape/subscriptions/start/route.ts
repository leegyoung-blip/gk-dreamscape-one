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

const ALLOWED_PLAN_KEYS = new Set([
  "core_monthly",
  "core_annual",
  "complete_monthly",
  "complete_annual",
]);

const STANDARD_INTRO_TRIAL_DAYS = 7;

type IntroTrialEligibility = {
  eligible?: boolean;
  trial_days?: number;
  reason?: string;
  identity_hash?: string;
};

function json(body: unknown, status = 200) {
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

function safeTrialDays(input: IntroTrialEligibility | null) {
  if (!input?.eligible) return 0;

  const value = Number(input.trial_days || STANDARD_INTRO_TRIAL_DAYS);

  if (!Number.isInteger(value) || value <= 0 || value > 30) {
    return STANDARD_INTRO_TRIAL_DAYS;
  }

  return value;
}

export async function POST(request: Request) {
  let contractId: string | null = null;

  try {
    const body = (await request.json()) as {
      planKey?: string;
      parentName?: string;
      parentEmail?: string;
      learnerName?: string;
      learnerEmail?: string;
      guardianAuthorised?: boolean;
      website?: string;
    };

    if (String(body.website || "").trim()) {
      return json(
        {
          error: "Unable to start subscription.",
        },
        400,
      );
    }

    const planKey = normaliseText(body.planKey, 80);
    const parentName = normaliseText(body.parentName, 160);
    const parentEmail = normaliseEmail(body.parentEmail);
    const learnerName = normaliseText(body.learnerName, 160);
    const learnerEmail = normaliseEmail(body.learnerEmail);
    const guardianAuthorised = Boolean(body.guardianAuthorised);

    if (!ALLOWED_PLAN_KEYS.has(planKey)) {
      return json(
        {
          error: "Invalid Dreamscape plan.",
        },
        400,
      );
    }

    if (
      !parentName ||
      !learnerName ||
      !validEmail(parentEmail) ||
      !validEmail(learnerEmail)
    ) {
      return json(
        {
          error: "Complete all parent and learner details.",
        },
        400,
      );
    }

    if (!guardianAuthorised) {
      return json(
        {
          error: "Parent/guardian authorisation must be confirmed.",
        },
        400,
      );
    }

    /*
     * Existing active/setup public or GKP access still blocks a second
     * checkout. This also prevents two concurrent trial checkouts for the
     * same learner identity.
     */
    const { data: conflict, error: conflictError } =
      await supabaseAdmin.rpc("gkp_check_dreamscape_checkout_conflict", {
        p_learner_email: learnerEmail,
      });

    if (conflictError) {
      throw conflictError;
    }

    if (conflict?.blocked) {
      const source = String(conflict.source || "");

      return json(
        {
          error:
            source === "gkp"
              ? "This learner already has Guru Kids Pro Dreamscape access. Please contact Guru Kids Pro before starting a separate public subscription."
              : "This learner already has a Dreamscape subscription or subscription setup in progress.",
          code: "EXISTING_DREAMSCAPE_ACCESS",
          source,
        },
        409,
      );
    }

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("dreamscape_billing_settings")
      .select("public_checkout_enabled")
      .eq("id", true)
      .maybeSingle();

    if (settingsError) {
      throw settingsError;
    }

    if (!settings?.public_checkout_enabled) {
      return json(
        {
          error: "Dreamscape public subscriptions are not open yet.",
          code: "PUBLIC_CHECKOUT_DISABLED",
        },
        403,
      );
    }

    /*
     * Phase 1 trial eligibility is server-authoritative.
     * A pricing-page label cannot grant a trial by itself.
     */
    const { data: trialEligibilityData, error: trialEligibilityError } =
      await supabaseAdmin.rpc(
        "gkp_get_dreamscape_intro_trial_eligibility",
        {
          p_learner_email: learnerEmail,
        },
      );

    if (trialEligibilityError) {
      throw trialEligibilityError;
    }

    const trialEligibility =
      (trialEligibilityData || null) as IntroTrialEligibility | null;

    const trialDays = safeTrialDays(trialEligibility);
    const introTrialEligible = trialDays > 0;
    const introTrialReason = String(
      trialEligibility?.reason ||
        (introTrialEligible ? "eligible_first_time_user" : "not_eligible"),
    );

    const { data: plan, error: planError } = await supabaseAdmin
      .from("dreamscape_subscription_plans")
      .select("*")
      .eq("plan_key", planKey)
      .eq("audience", "public")
      .eq("is_available", true)
      .eq("is_coming_soon", false)
      .maybeSingle();

    if (planError) {
      throw planError;
    }

    if (!plan) {
      return json(
        {
          error: "This subscription plan is not available.",
        },
        404,
      );
    }

    const typedPlan = plan as DreamscapePlanRow;
    const environment = getStripeEnvironment();
    const priceId = getStripePriceId(typedPlan, environment);
    const reference = `DSUB-${crypto.randomUUID()}`;
    const nowIso = new Date().toISOString();

    /*
     * Store the eligibility decision before opening Stripe.
     * intro_trial_identity_hash is a one-way server-generated identifier from
     * the SQL eligibility function. It lets DREAMSCAPE enforce the one-trial
     * rule even if a historical account is later anonymised.
     *
     * Phase 2 will populate trial_started_at / trial_ends_at /
     * trial_redeemed_at only after Stripe confirms the trial actually began.
     */
    const { data: contract, error: contractError } = await supabaseAdmin
      .from("dreamscape_subscription_contracts")
      .insert({
        reference,
        plan_id: typedPlan.id,
        parent_name: parentName,
        parent_email: parentEmail,
        learner_name: learnerName,
        learner_email: learnerEmail,
        guardian_authorised: true,
        provider: "stripe",
        provider_environment: environment,
        provider_status: "checkout_pending",
        status: "setup_pending",
        intro_trial_eligible: introTrialEligible,
        intro_trial_days: trialDays,
        intro_trial_offered_at: introTrialEligible ? nowIso : null,
        intro_trial_identity_hash:
          trialEligibility?.identity_hash || null,
      })
      .select("*")
      .single();

    if (contractError) {
      throw contractError;
    }

    contractId = contract.id;

    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
    ).replace(/\/$/, "");

    const successUrl =
      `${siteUrl}` +
      `/dreamscape/subscribe/complete` +
      `?contract=${encodeURIComponent(contract.id)}` +
      `&session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl =
      `${siteUrl}` +
      `/pricing` +
      `?checkout=cancelled` +
      `&plan=${encodeURIComponent(planKey)}`;

    try {
      const session = await createDreamscapeStripeCheckout({
        contractId: contract.id,
        reference,
        planId: typedPlan.id,
        planKey: typedPlan.plan_key,
        priceId,
        parentEmail,
        successUrl,
        cancelUrl,
        trialDays,
        environment,
      });

      const providerCustomerId =
        typeof session.customer === "string" ? session.customer : null;

      const { error: updateError } = await supabaseAdmin
        .from("dreamscape_subscription_contracts")
        .update({
          provider_status: session.status || "open",
          provider_customer_id: providerCustomerId,
          provider_data: {
            checkout_session_id: session.id,
            checkout_status: session.status,
            payment_status: session.payment_status,
            price_id: priceId,
            livemode: session.livemode,
            intro_trial_eligible: introTrialEligible,
            intro_trial_days: trialDays,
            intro_trial_reason: introTrialReason,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", contract.id);

      if (updateError) {
        throw updateError;
      }

      return json({
        ok: true,
        contractId: contract.id,
        reference,
        redirectUrl: session.url,
        provider: "stripe",
        environment,
        introTrial: {
          eligible: introTrialEligible,
          days: trialDays,
          reason: introTrialReason,
        },
      });
    } catch (error) {
      await supabaseAdmin
        .from("dreamscape_subscription_contracts")
        .update({
          status: "failed",
          provider_status: "checkout_failed",
          provider_data: {
            setup_error:
              error instanceof Error ? error.message : String(error),
            intro_trial_eligible: introTrialEligible,
            intro_trial_days: trialDays,
            intro_trial_reason: introTrialReason,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", contract.id);

      throw error;
    }
  } catch (error) {
    console.error("Dreamscape Stripe subscription start failed", {
      contractId,
      error: error instanceof Error ? error.message : String(error),
    });

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
