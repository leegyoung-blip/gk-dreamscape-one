import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStripeEnvironment } from "@/lib/stripe";
import { retrieveAndApplyActivityLabStripeSession } from "@/lib/activity-lab/stripeCredits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function requireUser(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) throw new Error("AUTH_REQUIRED");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) throw new Error("SUPABASE_AUTH_CONFIG_MISSING");

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);

  if (error || !user) throw new Error("AUTH_REQUIRED");
  return user;
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = (await request.json()) as { sessionId?: string };
    const sessionId = String(body.sessionId || "").trim();

    if (!sessionId || !sessionId.startsWith("cs_")) {
      return json({ error: "A valid Stripe Checkout Session is required." }, 400);
    }

    const result = await retrieveAndApplyActivityLabStripeSession({
      sessionId,
      environment: getStripeEnvironment(),
      expectedUserId: user.id,
    });

    const { data: wallet } = await supabaseAdmin
      .from("activity_lab_credit_wallet")
      .select("balance_credits,lifetime_purchased_credits,lifetime_redeemed_credits")
      .eq("user_id", user.id)
      .maybeSingle();

    return json(
      {
        ok: true,
        pending: result.pending,
        applied: result.applied,
        credits: result.credits,
        paymentStatus: result.paymentStatus,
        wallet: wallet
          ? {
              balanceCredits: Number(wallet.balance_credits || 0),
              lifetimePurchasedCredits: Number(
                wallet.lifetime_purchased_credits || 0,
              ),
              lifetimeRedeemedCredits: Number(
                wallet.lifetime_redeemed_credits || 0,
              ),
            }
          : null,
      },
      result.pending ? 202 : 200,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not confirm checkout.";

    if (message === "AUTH_REQUIRED") {
      return json({ error: "Please log in to confirm this purchase." }, 401);
    }

    console.error("Activity Lab Stripe return confirmation failed", error);
    return json({ error: message }, 400);
  }
}
