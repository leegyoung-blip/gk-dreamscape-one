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

export function getStripeSubscriptionPeriod(
  subscription: Stripe.Subscription,
) {
  const item = subscription.items.data[0];

  return {
    start: stripeTimestampToDate(item?.current_period_start),
    end: stripeTimestampToDate(item?.current_period_end),
  };
}

export async function getDreamscapeStripeSubscription(
  environment: DreamscapeStripeEnvironment,
  subscriptionId: string,
) {
  return getStripeClient(environment).subscriptions.retrieve(
    subscriptionId,
  );
}

export async function setDreamscapeStripeCancelAtPeriodEnd(input: {
  environment: DreamscapeStripeEnvironment;
  subscriptionId: string;
  cancelAtPeriodEnd: boolean;
}) {
  const stripe = getStripeClient(input.environment);

  return stripe.subscriptions.update(input.subscriptionId, {
    cancel_at_period_end: input.cancelAtPeriodEnd,
  });
}

export async function cancelDreamscapeStripeSubscriptionImmediately(input: {
  environment: DreamscapeStripeEnvironment;
  subscriptionId: string;
}) {
  const stripe = getStripeClient(input.environment);

  return stripe.subscriptions.cancel(input.subscriptionId, {
    invoice_now: false,
    prorate: false,
  });
}

export async function createDreamscapeStripePaymentMethodPortal(input: {
  environment: DreamscapeStripeEnvironment;
  customerId: string;
  returnUrl: string;
}) {
  const stripe = getStripeClient(input.environment);

  const session = await stripe.billingPortal.sessions.create({
    customer: input.customerId,
    return_url: input.returnUrl,
    flow_data: {
      type: "payment_method_update",
      after_completion: {
        type: "redirect",
        redirect: {
          return_url: input.returnUrl,
        },
      },
    },
  });

  if (!session.url) {
    throw new Error(
      "Stripe did not return a Customer Portal URL.",
    );
  }

  return session;
}


function expandableStripeId(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

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

export function getDreamscapeStripeScheduleId(
  subscription: Stripe.Subscription,
) {
  return expandableStripeId(
    (subscription as unknown as { schedule?: unknown }).schedule,
  );
}

function recurringDurationFromPrice(price: Stripe.Price) {
  const recurring = price.recurring;

  if (!recurring) {
    throw new Error(
      "The selected Stripe Price is not a recurring subscription price.",
    );
  }

  if (!["month", "year"].includes(recurring.interval)) {
    throw new Error(
      "Dreamscape plan changes currently support monthly and yearly Stripe prices only.",
    );
  }

  return {
    interval: recurring.interval,
    interval_count: Math.max(
      1,
      Number(recurring.interval_count || 1),
    ),
  };
}

export async function scheduleDreamscapeStripePlanChange(input: {
  environment: DreamscapeStripeEnvironment;
  subscriptionId: string;
  contractId: string;
  targetPlanId: string;
  targetPlanKey: string;
  targetPriceId: string;
}) {
  const stripe = getStripeClient(input.environment);

  const subscription =
    await stripe.subscriptions.retrieve(
      input.subscriptionId,
    );

  if (subscription.status === "canceled") {
    throw new Error(
      "A cancelled Stripe subscription cannot be changed.",
    );
  }

  if (subscription.cancel_at_period_end) {
    throw new Error(
      "Undo the scheduled cancellation before changing plan.",
    );
  }

  if (subscription.items.data.length !== 1) {
    throw new Error(
      "Dreamscape plan changes require a single Stripe subscription item.",
    );
  }

  const currentItem = subscription.items.data[0];
  const currentPriceId = currentItem.price?.id;

  if (!currentPriceId) {
    throw new Error(
      "Stripe did not return the current subscription Price ID.",
    );
  }

  if (currentPriceId === input.targetPriceId) {
    throw new Error(
      "The Stripe subscription is already using the selected price.",
    );
  }

  const period = getStripeSubscriptionPeriod(
    subscription,
  );

  if (
    !period.start ||
    !period.end ||
    period.end.getTime() <= Date.now()
  ) {
    throw new Error(
      "Stripe did not return a valid future billing period for this subscription.",
    );
  }

  const targetPrice =
    await stripe.prices.retrieve(
      input.targetPriceId,
    );

  if (!targetPrice.active) {
    throw new Error(
      "The selected Stripe Price is not active.",
    );
  }

  const targetDuration =
    recurringDurationFromPrice(
      targetPrice,
    );

  let scheduleId =
    getDreamscapeStripeScheduleId(
      subscription,
    );

  let schedule: Stripe.SubscriptionSchedule;

  if (scheduleId) {
    schedule =
      await stripe.subscriptionSchedules.retrieve(
        scheduleId,
      );
  } else {
    schedule =
      await stripe.subscriptionSchedules.create(
        {
          from_subscription:
            subscription.id,
        } as any,
      );

    scheduleId = schedule.id;
  }

  if (
    !["active", "not_started"].includes(
      String(schedule.status),
    )
  ) {
    throw new Error(
      `The Stripe subscription schedule is ${schedule.status} and cannot be updated.`,
    );
  }

  const currentStart =
    schedule.current_phase?.start_date ||
    Math.floor(
      period.start.getTime() / 1000,
    );

  const currentEnd =
    schedule.current_phase?.end_date ||
    Math.floor(
      period.end.getTime() / 1000,
    );

  /*
   * Stripe requires ALL current/future phases when a schedule
   * is updated. We intentionally keep the active subscription
   * on its current price until currentEnd, then start the new
   * price with no proration.
   *
   * The target phase lasts one target billing cycle and the
   * schedule then releases the subscription. The subscription
   * itself continues on the target price afterwards.
   */
  const updated =
    await stripe.subscriptionSchedules.update(
      scheduleId,
      {
        end_behavior: "release",
        proration_behavior: "none",
        phases: [
          {
            start_date: currentStart,
            end_date: currentEnd,
            items: [
              {
                price: currentPriceId,
                quantity:
                  currentItem.quantity || 1,
              },
            ],
            proration_behavior: "none",
            metadata: {
              ...subscription.metadata,
              dreamscape_contract_id:
                input.contractId,
            },
          },
          {
            start_date: currentEnd,
            duration: targetDuration,
            items: [
              {
                price:
                  input.targetPriceId,
                quantity:
                  currentItem.quantity || 1,
              },
            ],
            billing_cycle_anchor:
              "phase_start",
            proration_behavior: "none",
            metadata: {
              ...subscription.metadata,
              dreamscape_contract_id:
                input.contractId,
              dreamscape_plan_id:
                input.targetPlanId,
              dreamscape_plan_key:
                input.targetPlanKey,
            },
          },
        ],
      } as any,
    );

  return {
    subscription,
    schedule: updated,
    effectiveAt: new Date(
      currentEnd * 1000,
    ),
  };
}

export async function releaseDreamscapeStripePlanSchedule(input: {
  environment: DreamscapeStripeEnvironment;
  subscriptionId: string;
  scheduleId?: string | null;
}) {
  const stripe =
    getStripeClient(
      input.environment,
    );

  let scheduleId =
    String(
      input.scheduleId || "",
    ).trim();

  if (!scheduleId) {
    const subscription =
      await stripe.subscriptions.retrieve(
        input.subscriptionId,
      );

    scheduleId =
      getDreamscapeStripeScheduleId(
        subscription,
      );
  }

  if (!scheduleId) {
    return {
      released: false,
      scheduleId: null,
    };
  }

  const schedule =
    await stripe.subscriptionSchedules.retrieve(
      scheduleId,
    );

  if (
    ["released", "completed", "canceled"].includes(
      String(schedule.status),
    )
  ) {
    return {
      released: false,
      scheduleId,
    };
  }

  await stripe.subscriptionSchedules.release(
    scheduleId,
  );

  return {
    released: true,
    scheduleId,
  };
}
