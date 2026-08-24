import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getHitPayEnvironment } from "@/lib/hitpay";
import { getStripeEnvironment } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  if (userError || !user) {
    throw new Error("AUTH_REQUIRED");
  }

  const { data: allowed, error } = await client.rpc(
    "gkp_is_billing_staff",
  );

  if (error || !allowed) {
    throw new Error("ACCESS_DENIED");
  }

  return user;
}

function hasPrefix(
  value: string | undefined,
  prefix: string,
) {
  return Boolean(
    value?.trim() &&
      value.startsWith(prefix),
  );
}

function runtimeConfig() {
  /*
   * HitPay remains for GKP billing and any historical
   * Dreamscape HitPay subscriptions.
   */
  const hitpayEnvironment =
    getHitPayEnvironment();

  const hitpayApiKeyPresent =
    hitpayEnvironment === "production"
      ? Boolean(
          process.env.HITPAY_PRODUCTION_API_KEY ||
            process.env.HITPAY_API_KEY,
        )
      : Boolean(
          process.env.HITPAY_SANDBOX_API_KEY ||
            process.env.HITPAY_API_KEY,
        );

  const billingWebhookSaltPresent =
    hitpayEnvironment === "production"
      ? Boolean(
          process.env.HITPAY_PRODUCTION_WEBHOOK_SALT ||
            process.env.HITPAY_WEBHOOK_SALT,
        )
      : Boolean(
          process.env.HITPAY_SANDBOX_WEBHOOK_SALT ||
            process.env.HITPAY_WEBHOOK_SALT,
        );

  const legacyDreamscapeHitPayWebhookSaltPresent =
    hitpayEnvironment === "production"
      ? Boolean(
          process.env
            .HITPAY_DREAMSCAPE_PRODUCTION_WEBHOOK_SALT,
        )
      : Boolean(
          process.env
            .HITPAY_DREAMSCAPE_SANDBOX_WEBHOOK_SALT,
        );

  /*
   * New public Dreamscape subscriptions use Stripe.
   */
  const stripeEnvironment =
    getStripeEnvironment();

  const stripeTestKey =
    process.env.STRIPE_TEST_SECRET_KEY ||
    process.env.STRIPE_SECRET_KEY;

  const stripeLiveKey =
    process.env.STRIPE_LIVE_SECRET_KEY ||
    process.env.STRIPE_SECRET_KEY;

  const stripeTestSecretKeyPresent =
    hasPrefix(stripeTestKey, "sk_test_");

  const stripeLiveSecretKeyPresent =
    hasPrefix(stripeLiveKey, "sk_live_");

  const stripeTestWebhookSecretPresent =
    hasPrefix(
      process.env
        .STRIPE_DREAMSCAPE_TEST_WEBHOOK_SECRET,
      "whsec_",
    );

  const stripeLiveWebhookSecretPresent =
    hasPrefix(
      process.env
        .STRIPE_DREAMSCAPE_LIVE_WEBHOOK_SECRET,
      "whsec_",
    );

  return {
    siteUrlPresent: Boolean(
      process.env.NEXT_PUBLIC_SITE_URL,
    ),

    supabaseUrlPresent: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.SUPABASE_URL,
    ),

    supabaseServiceRolePresent: Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_SERVICE_KEY ||
        process.env.SUPABASE_SECRET_KEY,
    ),

    resendApiKeyPresent: Boolean(
      process.env.RESEND_API_KEY,
    ),

    stripeEnvironment,
    stripeEnvironmentExplicit: Boolean(
      process.env.STRIPE_ENVIRONMENT,
    ),

    stripeTestSecretKeyPresent,
    stripeLiveSecretKeyPresent,
    stripeTestWebhookSecretPresent,
    stripeLiveWebhookSecretPresent,

    stripeActiveSecretKeyPresent:
      stripeEnvironment === "production"
        ? stripeLiveSecretKeyPresent
        : stripeTestSecretKeyPresent,

    stripeActiveWebhookSecretPresent:
      stripeEnvironment === "production"
        ? stripeLiveWebhookSecretPresent
        : stripeTestWebhookSecretPresent,

    hitpayEnvironment,
    hitpayApiKeyPresent,
    billingWebhookSaltPresent,
    legacyDreamscapeHitPayWebhookSaltPresent,
  };
}

export async function GET(request: Request) {
  try {
    await requireBillingStaff(request);

    const [
      healthResult,
      securityResult,
      webhookResult,
    ] = await Promise.all([
      supabaseAdmin.rpc(
        "gkp_get_billing_system_health",
      ),
      supabaseAdmin.rpc(
        "gkp_get_billing_security_posture",
      ),
      supabaseAdmin.rpc(
        "gkp_get_billing_webhook_health",
      ),
    ]);

    const firstError =
      healthResult.error ||
      securityResult.error ||
      webhookResult.error;

    if (firstError) throw firstError;

    return json({
      ok: true,
      checkedAt: new Date().toISOString(),
      health: healthResult.data || [],
      security: securityResult.data || [],
      webhooks: webhookResult.data || [],
      config: runtimeConfig(),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    if (message === "AUTH_REQUIRED") {
      return json(
        { error: "Please sign in again." },
        401,
      );
    }

    if (message === "ACCESS_DENIED") {
      return json(
        { error: "Billing staff access required." },
        403,
      );
    }

    console.error(
      "Billing system health check failed",
      error,
    );

    return json({ error: message }, 500);
  }
}
