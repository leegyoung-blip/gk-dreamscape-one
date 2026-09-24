import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStripeClient, getStripeEnvironment } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } }); }

async function requireUser(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) throw new Error("AUTH_REQUIRED");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_AUTH_CONFIG_MISSING");
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) throw new Error("AUTH_REQUIRED");
  return user;
}

export async function POST(request: Request) {
  let orderId = "";
  try {
    const user = await requireUser(request);
    const body = await request.json() as { packKey?: string };
    const packKey = String(body.packKey || "").trim();
    if (!packKey) return json({ error: "packKey is required." }, 400);

    const { data: pack, error: packError } = await supabaseAdmin.from("activity_lab_credit_packs").select("*").eq("pack_key", packKey).eq("enabled", true).single();
    if (packError || !pack) return json({ error: "Play Credit pack is unavailable." }, 404);

    const environment = getStripeEnvironment();
    const { data: order, error: orderError } = await supabaseAdmin.from("activity_lab_credit_orders").insert({
      user_id: user.id, pack_key: pack.pack_key, credits: pack.credits, price_cents: pack.price_cents, currency: pack.currency,
      status: "pending", provider: "stripe", provider_environment: environment,
    }).select("id").single();
    if (orderError || !order) throw orderError || new Error("Could not create Play Credit order.");
    orderId = order.id;

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
    const stripe = getStripeClient(environment);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: order.id,
      customer_email: user.email || undefined,
      line_items: [{ quantity: 1, price_data: { currency: String(pack.currency).toLowerCase(), unit_amount: Number(pack.price_cents), product_data: { name: String(pack.title), description: String(pack.description || "Dreamscape Activity Lab Play Credits"), metadata: { dreamscape_activity_credit_pack: String(pack.pack_key) } } } }],
      success_url: `${siteUrl}/milo-world/activity-lab?credits=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/milo-world/activity-lab?credits=cancelled`,
      metadata: { dreamscape_kind: "activity_lab_credits", dreamscape_activity_credit_order_id: order.id, dreamscape_user_id: user.id, dreamscape_pack_key: String(pack.pack_key), dreamscape_credits: String(pack.credits) },
      payment_intent_data: { metadata: { dreamscape_kind: "activity_lab_credits", dreamscape_activity_credit_order_id: order.id, dreamscape_user_id: user.id } },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });
    if (!session.id || !session.url) throw new Error("Stripe did not return a checkout URL.");

    const { error: updateError } = await supabaseAdmin.from("activity_lab_credit_orders").update({ status: "checkout_open", stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() }).eq("id", order.id);
    if (updateError) throw updateError;
    return json({ url: session.url });
  } catch (error) {
    if (orderId) {
      try {
        await supabaseAdmin.from("activity_lab_credit_orders").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", orderId);
      } catch {
        // Preserve the original checkout error.
      }
    }
    const message = error instanceof Error ? error.message : "Could not start checkout.";
    if (message === "AUTH_REQUIRED") return json({ error: "Please log in before purchasing Play Credits." }, 401);
    console.error("Activity Lab credit checkout failed", error);
    return json({ error: message }, 500);
  }
}
