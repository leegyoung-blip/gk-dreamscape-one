import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  getStripeClient,
  isStripeEnvironment,
  type DreamscapeStripeEnvironment,
} from "@/lib/stripe";
import { validateAndApplyActivityLabStripeSession } from "@/lib/activity-lab/stripeCredits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ environment: string }> };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function webhookSecret(environment: DreamscapeStripeEnvironment) {
  const secret =
    environment === "production"
      ? process.env.STRIPE_ACTIVITY_LAB_LIVE_WEBHOOK_SECRET
      : process.env.STRIPE_ACTIVITY_LAB_TEST_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error(
      `Missing Activity Lab Stripe ${environment} webhook secret.`,
    );
  }

  if (!secret.startsWith("whsec_")) {
    throw new Error(
      `Invalid Activity Lab Stripe ${environment} webhook secret.`,
    );
  }

  return secret;
}

async function markOrderFromSession(
  session: Stripe.Checkout.Session,
  status: "expired" | "failed",
  eventId: string,
) {
  if (String(session.metadata?.dreamscape_kind || "") !== "activity_lab_credits") {
    return;
  }

  const orderId = String(
    session.metadata?.dreamscape_activity_credit_order_id ||
      session.client_reference_id ||
      "",
  ).trim();

  if (!orderId) return;

  await supabaseAdmin
    .from("activity_lab_credit_orders")
    .update({
      status,
      provider_event_id: eventId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .neq("status", "paid");
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { environment: raw } = await params;

    if (!isStripeEnvironment(raw)) {
      return json({ error: "Invalid Stripe environment." }, 404);
    }

    const environment = raw as DreamscapeStripeEnvironment;
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return json({ error: "Missing Stripe signature." }, 401);
    }

    const rawBody = await request.text();
    const stripe = getStripeClient(environment);
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret(environment),
    );

    if (event.livemode !== (environment === "production")) {
      return json(
        { error: "Stripe event environment does not match this endpoint." },
        400,
      );
    }

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      await validateAndApplyActivityLabStripeSession({
        session: event.data.object as Stripe.Checkout.Session,
        environment,
        providerEventId: event.id,
      });
    } else if (event.type === "checkout.session.expired") {
      await markOrderFromSession(
        event.data.object as Stripe.Checkout.Session,
        "expired",
        event.id,
      );
    } else if (event.type === "checkout.session.async_payment_failed") {
      await markOrderFromSession(
        event.data.object as Stripe.Checkout.Session,
        "failed",
        event.id,
      );
    }

    return json({ ok: true, event: event.type });
  } catch (error) {
    console.error("Activity Lab credit webhook failed", error);
    return json(
      { error: error instanceof Error ? error.message : "Webhook failed." },
      400,
    );
  }
}
