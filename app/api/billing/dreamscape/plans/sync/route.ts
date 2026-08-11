import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  createHitPaySubscriptionPlan,
  getHitPayEnvironment,
} from "@/lib/hitpay";

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

  if (userError || !user) throw new Error("AUTH_REQUIRED");

  const { data: allowed, error } = await client.rpc(
    "gkp_is_billing_staff",
  );

  if (error || !allowed) throw new Error("ACCESS_DENIED");

  return user;
}

export async function POST(request: Request) {
  try {
    await requireBillingStaff(request);

    const environment = getHitPayEnvironment();

    const { data: plans, error } = await supabaseAdmin
      .from("dreamscape_subscription_plans")
      .select("*")
      .eq("provider", "hitpay")
      .eq("audience", "public")
      .eq("is_available", true)
      .eq("is_coming_soon", false)
      .order("plan_key");

    if (error) throw error;

    const results = [];

    for (const plan of plans || []) {
      if (
        plan.hitpay_plan_id &&
        plan.hitpay_environment === environment
      ) {
        results.push({
          planKey: plan.plan_key,
          status: "already_synced",
          hitpayPlanId: plan.hitpay_plan_id,
        });
        continue;
      }

      const created = await createHitPaySubscriptionPlan({
        name: plan.display_name,
        description:
          `Dreamscape One ${plan.display_name} student access`,
        amount: Number(plan.amount),
        currency: plan.currency,
        cycle:
          plan.billing_cycle === "annual" ? "yearly" : "monthly",
        reference: `dreamscape_${plan.plan_key}`,
        environment,
      });

      if (!created.id) {
        throw new Error(
          `HitPay did not return a plan ID for ${plan.plan_key}.`,
        );
      }

      const { error: updateError } = await supabaseAdmin
        .from("dreamscape_subscription_plans")
        .update({
          hitpay_plan_id: created.id,
          hitpay_environment: environment,
          hitpay_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", plan.id);

      if (updateError) throw updateError;

      results.push({
        planKey: plan.plan_key,
        status: "created",
        hitpayPlanId: created.id,
      });
    }

    return json({
      ok: true,
      environment,
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    if (message === "AUTH_REQUIRED") {
      return json({ error: "Please sign in again." }, 401);
    }

    if (message === "ACCESS_DENIED") {
      return json({ error: "Billing staff access required." }, 403);
    }

    console.error("Dreamscape HitPay plan sync failed", error);
    return json({ error: message }, 500);
  }
}
