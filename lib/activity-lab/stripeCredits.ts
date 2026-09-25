import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  getStripeClient,
  type DreamscapeStripeEnvironment,
} from "@/lib/stripe";

type ActivityLabCreditOrder = {
  id: string;
  user_id: string;
  pack_key: string;
  credits: number;
  price_cents: number;
  currency: string;
  status: string;
  provider_environment: string | null;
  stripe_checkout_session_id: string | null;
};

function idOf(value: unknown) {
  if (typeof value === "string") return value;
  if (
    value &&
    typeof value === "object" &&
    "id" in value &&
    typeof (value as { id?: unknown }).id === "string"
  ) {
    return String((value as { id: string }).id);
  }
  return "";
}

function expectedLivemode(environment: DreamscapeStripeEnvironment) {
  return environment === "production";
}

async function loadOrder(orderId: string) {
  const { data, error } = await supabaseAdmin
    .from("activity_lab_credit_orders")
    .select(
      "id,user_id,pack_key,credits,price_cents,currency,status,provider_environment,stripe_checkout_session_id",
    )
    .eq("id", orderId)
    .single();

  if (error || !data) {
    throw error || new Error("Activity Lab credit order was not found.");
  }

  return data as ActivityLabCreditOrder;
}

export async function createActivityLabStripeCheckout(input: {
  orderId: string;
  userId: string;
  customerEmail?: string | null;
  packKey: string;
  packTitle: string;
  packDescription?: string | null;
  credits: number;
  priceCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  environment: DreamscapeStripeEnvironment;
}) {
  const stripe = getStripeClient(input.environment);

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",

      /*
       * Activity Lab Play Credits are sold as one-time digital purchases using
       * dynamic price_data. Stripe Managed Payments requires an eligible product
       * tax code for every Checkout product. We are not using Managed Payments
       * for this Activity Lab flow, so disable it for this Session explicitly.
       *
       * This keeps the existing Dreamscape Stripe account and live Checkout
       * flow unchanged while preventing Stripe from rejecting these inline
       * products for a missing Managed Payments tax code.
       */
      managed_payments: {
        enabled: false,
      },

      client_reference_id: input.orderId,
      customer_email: input.customerEmail || undefined,

      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: input.currency.toLowerCase(),
            unit_amount: input.priceCents,
            product_data: {
              name: input.packTitle,
              description:
                input.packDescription ||
                `${input.credits} Dreamscape Activity Lab Play Credits`,
              metadata: {
                dreamscape_activity_credit_pack: input.packKey,
              },
            },
          },
        },
      ],

      success_url: input.successUrl,
      cancel_url: input.cancelUrl,

      metadata: {
        dreamscape_kind: "activity_lab_credits",
        dreamscape_activity_credit_order_id: input.orderId,
        dreamscape_user_id: input.userId,
        dreamscape_pack_key: input.packKey,
        dreamscape_credits: String(input.credits),
      },

      payment_intent_data: {
        metadata: {
          dreamscape_kind: "activity_lab_credits",
          dreamscape_activity_credit_order_id: input.orderId,
          dreamscape_user_id: input.userId,
          dreamscape_pack_key: input.packKey,
        },
      },

      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    },
    {
      idempotencyKey: `activity-lab-credit-order:${input.orderId}`,
    },
  );

  if (!session.id || !session.url) {
    throw new Error(
      "Stripe created the Checkout Session but did not return a checkout URL.",
    );
  }

  return session;
}

export async function validateAndApplyActivityLabStripeSession(input: {
  session: Stripe.Checkout.Session;
  environment: DreamscapeStripeEnvironment;
  providerEventId: string;
  expectedUserId?: string | null;
}) {
  const { session, environment } = input;

  if (
    String(session.metadata?.dreamscape_kind || "") !== "activity_lab_credits"
  ) {
    throw new Error(
      "This Stripe Checkout Session is not an Activity Lab purchase.",
    );
  }

  if (session.livemode !== expectedLivemode(environment)) {
    throw new Error(
      "Stripe Checkout environment does not match the server environment.",
    );
  }

  if (session.mode !== "payment") {
    throw new Error(
      "Activity Lab credits require a one-time Stripe payment session.",
    );
  }

  const orderId = String(
    session.metadata?.dreamscape_activity_credit_order_id ||
      session.client_reference_id ||
      "",
  ).trim();

  if (!orderId) {
    throw new Error(
      "Activity Lab credit order id is missing from Stripe Checkout.",
    );
  }

  const order = await loadOrder(orderId);
  const sessionUserId = String(
    session.metadata?.dreamscape_user_id || "",
  ).trim();

  if (input.expectedUserId && order.user_id !== input.expectedUserId) {
    throw new Error(
      "This Activity Lab credit order belongs to another account.",
    );
  }

  if (
    input.expectedUserId &&
    sessionUserId &&
    sessionUserId !== input.expectedUserId
  ) {
    throw new Error(
      "Stripe Checkout user does not match the signed-in account.",
    );
  }

  if (
    order.provider_environment &&
    order.provider_environment !== environment
  ) {
    throw new Error(
      "Credit order Stripe environment does not match Checkout.",
    );
  }

  if (
    order.stripe_checkout_session_id &&
    order.stripe_checkout_session_id !== session.id
  ) {
    throw new Error(
      "Stripe Checkout Session does not match the stored credit order.",
    );
  }

  const stripeCurrency = String(session.currency || "").toLowerCase();
  const orderCurrency = String(order.currency || "").toLowerCase();

  if (stripeCurrency !== orderCurrency) {
    throw new Error(
      "Stripe Checkout currency does not match the credit order.",
    );
  }

  if (Number(session.amount_total || 0) !== Number(order.price_cents || 0)) {
    throw new Error(
      "Stripe Checkout total does not match the credit order amount.",
    );
  }

  const paid =
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required";

  if (!paid) {
    return {
      applied: false,
      pending: true,
      orderId: order.id,
      credits: order.credits,
      paymentStatus: session.payment_status,
    };
  }

  const { data, error } = await supabaseAdmin.rpc(
    "activity_lab_credit_apply_purchase",
    {
      p_order_id: order.id,
      p_provider_event_id: input.providerEventId,
      p_checkout_session_id: session.id,
      p_payment_intent_id: idOf(session.payment_intent),
    },
  );

  if (error) throw error;

  return {
    applied: Boolean(data),
    pending: false,
    orderId: order.id,
    credits: order.credits,
    paymentStatus: session.payment_status,
  };
}

export async function retrieveAndApplyActivityLabStripeSession(input: {
  sessionId: string;
  environment: DreamscapeStripeEnvironment;
  expectedUserId?: string | null;
}) {
  const stripe = getStripeClient(input.environment);
  const session = await stripe.checkout.sessions.retrieve(input.sessionId);

  return validateAndApplyActivityLabStripeSession({
    session,
    environment: input.environment,
    expectedUserId: input.expectedUserId,
    providerEventId: `return-confirm:${session.id}`,
  });
}
