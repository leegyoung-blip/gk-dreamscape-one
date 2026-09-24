import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStripeEnvironment } from "@/lib/stripe";
import { createActivityLabStripeCheckout } from "@/lib/activity-lab/stripeCredits";

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
  let orderId = "";

  try {
    const user = await requireUser(request);
    const body = (await request.json()) as { packKey?: string };
    const packKey = String(body.packKey || "").trim();

    if (!packKey) return json({ error: "packKey is required." }, 400);

    const { data: pack, error: packError } = await supabaseAdmin
      .from("activity_lab_credit_packs")
      .select("pack_key,title,description,credits,price_cents,currency,enabled")
      .eq("pack_key", packKey)
      .eq("enabled", true)
      .single();

    if (packError || !pack) {
      return json({ error: "Play Credit pack is unavailable." }, 404);
    }

    const environment = getStripeEnvironment();

    const { data: order, error: orderError } = await supabaseAdmin
      .from("activity_lab_credit_orders")
      .insert({
        user_id: user.id,
        pack_key: pack.pack_key,
        credits: pack.credits,
        price_cents: pack.price_cents,
        currency: pack.currency,
        status: "pending",
        provider: "stripe",
        provider_environment: environment,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      throw orderError || new Error("Could not create Play Credit order.");
    }

    orderId = String(order.id);

    const siteUrl = (
      process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
    ).replace(/\/$/, "");

    const session = await createActivityLabStripeCheckout({
      orderId,
      userId: user.id,
      customerEmail: user.email,
      packKey: String(pack.pack_key),
      packTitle: String(pack.title),
      packDescription: pack.description ? String(pack.description) : null,
      credits: Number(pack.credits),
      priceCents: Number(pack.price_cents),
      currency: String(pack.currency),
      successUrl:
        `${siteUrl}/milo-world/activity-lab` +
        `?credits=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${siteUrl}/milo-world/activity-lab?credits=cancelled`,
      environment,
    });

    const { error: updateError } = await supabaseAdmin
      .from("activity_lab_credit_orders")
      .update({
        status: "checkout_open",
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) throw updateError;

    return json({
      url: session.url,
      sessionId: session.id,
      orderId,
      environment,
    });
  } catch (error) {
    if (orderId) {
      try {
        await supabaseAdmin
          .from("activity_lab_credit_orders")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", orderId)
          .neq("status", "paid");
      } catch {
        // Preserve the original checkout error.
      }
    }

    const message =
      error instanceof Error ? error.message : "Could not start checkout.";

    if (message === "AUTH_REQUIRED") {
      return json(
        { error: "Please log in before purchasing Play Credits." },
        401,
      );
    }

    console.error("Activity Lab credit checkout failed", error);
    return json({ error: message }, 500);
  }
}
