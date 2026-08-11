import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  createHitPayRecurringBilling,
  getHitPayEnvironment,
} from "@/lib/hitpay";
import {
  normaliseEmail,
  normaliseText,
  singaporeDateString,
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

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
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

    // Honeypot.
    if (String(body.website || "").trim()) {
      return json({ error: "Unable to start subscription." }, 400);
    }

    const planKey = normaliseText(body.planKey, 80);
    const parentName = normaliseText(body.parentName, 160);
    const parentEmail = normaliseEmail(body.parentEmail);
    const learnerName = normaliseText(body.learnerName, 160);
    const learnerEmail = normaliseEmail(body.learnerEmail);
    const guardianAuthorised = Boolean(body.guardianAuthorised);

    if (!ALLOWED_PLAN_KEYS.has(planKey)) {
      return json({ error: "Invalid Dreamscape plan." }, 400);
    }

    if (
      !parentName ||
      !learnerName ||
      !validEmail(parentEmail) ||
      !validEmail(learnerEmail)
    ) {
      return json(
        { error: "Complete all parent and learner details." },
        400,
      );
    }

    if (!guardianAuthorised) {
      return json(
        {
          error:
            "Parent/guardian authorisation must be confirmed.",
        },
        400,
      );
    }

    const { data: settings, error: settingsError } =
      await supabaseAdmin
        .from("dreamscape_billing_settings")
        .select(
          "public_checkout_enabled,hitpay_send_receipts",
        )
        .eq("id", true)
        .maybeSingle();

    if (settingsError) throw settingsError;

    if (!settings?.public_checkout_enabled) {
      return json(
        {
          error:
            "Dreamscape public subscriptions are not open yet.",
          code: "PUBLIC_CHECKOUT_DISABLED",
        },
        403,
      );
    }

    const { data: plan, error: planError } =
      await supabaseAdmin
        .from("dreamscape_subscription_plans")
        .select("*")
        .eq("plan_key", planKey)
        .eq("audience", "public")
        .eq("provider", "hitpay")
        .eq("is_available", true)
        .eq("is_coming_soon", false)
        .maybeSingle();

    if (planError) throw planError;

    if (!plan) {
      return json(
        { error: "This subscription plan is not available." },
        404,
      );
    }

    const typedPlan = plan as DreamscapePlanRow;

    if (!typedPlan.hitpay_plan_id) {
      return json(
        {
          error:
            "This plan has not been synced to HitPay yet. Please contact Guru Kids Pro.",
        },
        409,
      );
    }

    const environment = getHitPayEnvironment();

    if (
      typedPlan.hitpay_environment &&
      typedPlan.hitpay_environment !== environment
    ) {
      return json(
        {
          error:
            "The Dreamscape plan is mapped to a different HitPay environment.",
        },
        409,
      );
    }

    const reference = `DSUB-${crypto.randomUUID()}`;

    const { data: contract, error: contractError } =
      await supabaseAdmin
        .from("dreamscape_subscription_contracts")
        .insert({
          reference,
          plan_id: typedPlan.id,
          parent_name: parentName,
          parent_email: parentEmail,
          learner_name: learnerName,
          learner_email: learnerEmail,
          guardian_authorised: true,
          provider: "hitpay",
          provider_environment: environment,
          status: "setup_pending",
        })
        .select("*")
        .single();

    if (contractError) throw contractError;

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      new URL(request.url).origin;

    const redirectUrl =
      `${siteUrl.replace(/\/$/, "")}` +
      `/dreamscape/subscribe/complete?contract=${encodeURIComponent(
        contract.id,
      )}`;

    try {
      const recurring = await createHitPayRecurringBilling({
        planId: typedPlan.hitpay_plan_id,
        customerEmail: parentEmail,
        customerName: parentName,
        startDate: singaporeDateString(),
        redirectUrl,
        reference,
        sendEmail: Boolean(settings.hitpay_send_receipts),
        environment,
      });

      if (!recurring.id || !recurring.url) {
        throw new Error(
          "HitPay did not return a recurring billing ID and checkout URL.",
        );
      }

      const { error: updateError } = await supabaseAdmin
        .from("dreamscape_subscription_contracts")
        .update({
          provider_subscription_id: recurring.id,
          provider_status: recurring.status || "pending",
          provider_customer_id: recurring.customer_id || null,
          provider_data: recurring,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contract.id);

      if (updateError) throw updateError;

      return json({
        ok: true,
        contractId: contract.id,
        reference,
        redirectUrl: recurring.url,
      });
    } catch (error) {
      await supabaseAdmin
        .from("dreamscape_subscription_contracts")
        .update({
          status: "failed",
          provider_status: "setup_failed",
          provider_data: {
            setup_error:
              error instanceof Error ? error.message : String(error),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", contract.id);

      throw error;
    }
  } catch (error) {
    console.error("Dreamscape subscription start failed", error);

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
