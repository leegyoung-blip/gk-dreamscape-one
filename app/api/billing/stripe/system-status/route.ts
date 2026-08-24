import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
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
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
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
}

function keyPresent(
  environment: "sandbox" | "production",
) {
  const value =
    environment === "production"
      ? process.env.STRIPE_LIVE_SECRET_KEY ||
        process.env.STRIPE_SECRET_KEY
      : process.env.STRIPE_TEST_SECRET_KEY ||
        process.env.STRIPE_SECRET_KEY;

  return Boolean(
    value?.trim() &&
      value.startsWith(
        environment === "production"
          ? "sk_live_"
          : "sk_test_",
      ),
  );
}

function webhookPresent(
  environment: "sandbox" | "production",
) {
  const value =
    environment === "production"
      ? process.env.STRIPE_DREAMSCAPE_LIVE_WEBHOOK_SECRET
      : process.env.STRIPE_DREAMSCAPE_TEST_WEBHOOK_SECRET;

  return Boolean(
    value?.trim() &&
      value.startsWith("whsec_"),
  );
}

export async function GET(request: Request) {
  try {
    await requireBillingStaff(request);

    const stripeEnvironment =
      getStripeEnvironment();

    const { data: plans, error: planError } =
      await supabaseAdmin
        .from("dreamscape_subscription_plans")
        .select(
          "plan_key,stripe_test_price_id,stripe_live_price_id",
        )
        .eq("audience", "public")
        .in("plan_key", [
          "core_monthly",
          "core_annual",
          "complete_monthly",
          "complete_annual",
        ]);

    if (planError) throw planError;

    const rows = plans || [];
    const publicPlanCount = rows.length;

    const testMappedPlanCount =
      rows.filter((row) =>
        Boolean(row.stripe_test_price_id),
      ).length;

    const liveMappedPlanCount =
      rows.filter((row) =>
        Boolean(row.stripe_live_price_id),
      ).length;

    const testMappingReady =
      publicPlanCount === 4 &&
      testMappedPlanCount === 4;

    const liveMappingReady =
      publicPlanCount === 4 &&
      liveMappedPlanCount === 4;

    const activeMappingReady =
      stripeEnvironment === "production"
        ? liveMappingReady
        : testMappingReady;

    const activeMappedPlanCount =
      stripeEnvironment === "production"
        ? liveMappedPlanCount
        : testMappedPlanCount;

    const testSecretKeyPresent =
      keyPresent("sandbox");

    const liveSecretKeyPresent =
      keyPresent("production");

    const testWebhookSecretPresent =
      webhookPresent("sandbox");

    const liveWebhookSecretPresent =
      webhookPresent("production");

    const activeSecretKeyPresent =
      stripeEnvironment === "production"
        ? liveSecretKeyPresent
        : testSecretKeyPresent;

    const activeWebhookSecretPresent =
      stripeEnvironment === "production"
        ? liveWebhookSecretPresent
        : testWebhookSecretPresent;

    const stripeConfigured =
      activeSecretKeyPresent &&
      activeWebhookSecretPresent &&
      activeMappingReady;

    return json({
      ok: true,
      stripeConfigured,
      stripeEnvironment,
      activeSecretKeyPresent,
      activeWebhookSecretPresent,
      testSecretKeyPresent,
      liveSecretKeyPresent,
      testWebhookSecretPresent,
      liveWebhookSecretPresent,
      testMappingReady,
      liveMappingReady,
      activeMappingReady,
      publicPlanCount,
      testMappedPlanCount,
      liveMappedPlanCount,
      activeMappedPlanCount,
      siteUrlPresent: Boolean(
        process.env.NEXT_PUBLIC_SITE_URL,
      ),
      checkedAt: new Date().toISOString(),
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
      "Stripe system status check failed",
      error,
    );

    return json({ error: message }, 500);
  }
}
