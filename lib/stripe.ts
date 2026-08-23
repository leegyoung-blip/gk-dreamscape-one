import Stripe from "stripe";

export type DreamscapeStripeEnvironment =
  | "sandbox"
  | "production";

export type StripeMappedPlan = {
  id: string;
  plan_key: string;
  stripe_test_price_id?: string | null;
  stripe_live_price_id?: string | null;
};

function normaliseStripeEnvironment(
  value: string | undefined,
): DreamscapeStripeEnvironment {
  const normalised = String(value || "")
    .trim()
    .toLowerCase();

  if (
    normalised === "production" ||
    normalised === "live"
  ) {
    return "production";
  }

  return "sandbox";
}

export function getStripeEnvironment(): DreamscapeStripeEnvironment {
  return normaliseStripeEnvironment(
    process.env.STRIPE_ENVIRONMENT,
  );
}

export function isStripeEnvironment(
  value: string | null | undefined,
): value is DreamscapeStripeEnvironment {
  return value === "sandbox" || value === "production";
}

function getStripeSecretKey(
  environment = getStripeEnvironment(),
) {
  const key =
    environment === "production"
      ? process.env.STRIPE_LIVE_SECRET_KEY ||
        process.env.STRIPE_SECRET_KEY
      : process.env.STRIPE_TEST_SECRET_KEY ||
        process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error(
      `Missing Stripe ${environment} secret key.`,
    );
  }

  if (
    environment === "sandbox" &&
    !key.startsWith("sk_test_")
  ) {
    throw new Error(
      "Stripe is configured for sandbox, but the secret key is not a test key.",
    );
  }

  if (
    environment === "production" &&
    !key.startsWith("sk_live_")
  ) {
    throw new Error(
      "Stripe is configured for production, but the secret key is not a live key.",
    );
  }

  return key;
}

export function getStripeClient(
  environment = getStripeEnvironment(),
) {
  return new Stripe(getStripeSecretKey(environment), {
    maxNetworkRetries: 2,
  });
}

export function getStripePriceId(
  plan: StripeMappedPlan,
  environment = getStripeEnvironment(),
) {
  const priceId =
    environment === "production"
      ? plan.stripe_live_price_id
      : plan.stripe_test_price_id;

  if (!priceId) {
    throw new Error(
      environment === "production"
        ? `Plan ${plan.plan_key} does not have a Stripe production Price ID.`
        : `Plan ${plan.plan_key} does not have a Stripe sandbox Price ID.`,
    );
  }

  if (!priceId.startsWith("price_")) {
    throw new Error(
      `Invalid Stripe Price ID for ${plan.plan_key}.`,
    );
  }

  return priceId;
}

export function getDreamscapeStripeWebhookSecret(
  environment: DreamscapeStripeEnvironment,
) {
  const secret =
    environment === "production"
      ? process.env.STRIPE_DREAMSCAPE_LIVE_WEBHOOK_SECRET
      : process.env.STRIPE_DREAMSCAPE_TEST_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error(
      `Missing Dreamscape Stripe ${environment} webhook secret.`,
    );
  }

  if (!secret.startsWith("whsec_")) {
    throw new Error(
      `Invalid Dreamscape Stripe ${environment} webhook secret.`,
    );
  }

  return secret;
}

export function constructDreamscapeStripeEvent(input: {
  rawBody: string;
  signature: string;
  environment: DreamscapeStripeEnvironment;
}) {
  const stripe = getStripeClient(input.environment);
  const secret = getDreamscapeStripeWebhookSecret(
    input.environment,
  );

  return stripe.webhooks.constructEvent(
    input.rawBody,
    input.signature,
    secret,
  );
}

export function stripeEnvironmentFromLivemode(
  livemode: boolean,
): DreamscapeStripeEnvironment {
  return livemode ? "production" : "sandbox";
}

export function stripeTimestampToDate(
  timestamp: number | null | undefined,
) {
  if (
    typeof timestamp !== "number" ||
    !Number.isFinite(timestamp)
  ) {
    return null;
  }

  const date = new Date(timestamp * 1000);

  return Number.isFinite(date.getTime()) ? date : null;
}

export async function createDreamscapeStripeCheckout(input: {
  contractId: string;
  reference: string;
  planId: string;
  planKey: string;
  priceId: string;
  parentEmail: string;
  successUrl: string;
  cancelUrl: string;
  environment?: DreamscapeStripeEnvironment;
}) {
  const environment =
    input.environment || getStripeEnvironment();

  const stripe = getStripeClient(environment);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price: input.priceId,
        quantity: 1,
      },
    ],
    customer_email: input.parentEmail,
    client_reference_id: input.contractId,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      dreamscape_contract_id: input.contractId,
      dreamscape_reference: input.reference,
      dreamscape_plan_id: input.planId,
      dreamscape_plan_key: input.planKey,
    },
    subscription_data: {
      metadata: {
        dreamscape_contract_id: input.contractId,
        dreamscape_reference: input.reference,
        dreamscape_plan_id: input.planId,
        dreamscape_plan_key: input.planKey,
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
