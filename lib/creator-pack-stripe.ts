import type Stripe from "stripe";
import {
  getStripeClient,
  type DreamscapeStripeEnvironment,
} from "@/lib/stripe";

export function getCreatorPackStripeEnvironment(): DreamscapeStripeEnvironment {
  return "production";
}

function getCreatorPackWebhookSecret() {
  const secret = String(
    process.env.STRIPE_CREATOR_PACK_LIVE_WEBHOOK_SECRET || "",
  ).trim();

  if (!secret) {
    throw new Error(
      "Missing STRIPE_CREATOR_PACK_LIVE_WEBHOOK_SECRET.",
    );
  }

  if (!secret.startsWith("whsec_")) {
    throw new Error(
      "Invalid STRIPE_CREATOR_PACK_LIVE_WEBHOOK_SECRET.",
    );
  }

  return secret;
}

export async function createCreatorPackStripeCheckout(input: {
  orderId: string;
  packId: string;
  packTitle: string;
  creatorDisplayName?: string | null;
  clubSlug: string;
  packSlug: string;
  userId: string;
  customerEmail: string;
  currency: string;
  priceCents: number;
  successUrl: string;
  cancelUrl: string;
}) {
  const stripe = getStripeClient("production");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: input.orderId,
    customer_email: input.customerEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: input.priceCents,
          product_data: {
            name: input.packTitle,
            description: input.creatorDisplayName
              ? `Dreamscape Creator Quiz Pack by ${input.creatorDisplayName}`
              : "Dreamscape Creator Quiz Pack",
            metadata: {
              dreamscape_creator_pack_id: input.packId,
            },
          },
        },
      },
    ],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      dreamscape_kind: "creator_pack",
      dreamscape_creator_pack_order_id: input.orderId,
      dreamscape_creator_pack_id: input.packId,
      dreamscape_creator_pack_slug: input.packSlug,
      dreamscape_creator_club_slug: input.clubSlug,
      dreamscape_user_id: input.userId,
    },
    payment_intent_data: {
      metadata: {
        dreamscape_kind: "creator_pack",
        dreamscape_creator_pack_order_id: input.orderId,
        dreamscape_creator_pack_id: input.packId,
        dreamscape_user_id: input.userId,
      },
    },
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  });

  if (!session.id || !session.url) {
    throw new Error(
      "Stripe created a Checkout Session but did not return a checkout URL.",
    );
  }

  return session;
}

export async function constructCreatorPackStripeEvent(input: {
  rawBody: string;
  signature: string;
}) {
  const stripe = getStripeClient("production");
  const secret = getCreatorPackWebhookSecret();

  const event = stripe.webhooks.constructEvent(
    input.rawBody,
    input.signature,
    secret,
  );

  return {
    event,
    environment: "production" as const,
  };
}

export function expandableId(
  value:
    | string
    | { id?: string | null }
    | null
    | undefined,
) {
  if (typeof value === "string") return value;
  return String(value?.id || "").trim();
}

export async function getPaymentIntentChargeId(input: {
  environment: DreamscapeStripeEnvironment;
  paymentIntentId: string;
}) {
  if (!input.paymentIntentId) return "";

  const stripe = getStripeClient("production");
  const paymentIntent = await stripe.paymentIntents.retrieve(
    input.paymentIntentId,
  );

  return expandableId(
    (paymentIntent as Stripe.PaymentIntent & {
      latest_charge?: string | Stripe.Charge | null;
    }).latest_charge,
  );
}

export async function getChargeForDispute(input: {
  environment: DreamscapeStripeEnvironment;
  chargeId: string;
}) {
  if (!input.chargeId) return null;

  return getStripeClient("production").charges.retrieve(
    input.chargeId,
  );
}
