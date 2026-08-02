import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type VerifiedShopifyWebhook = {
  rawBody: string;
  webhookId: string;
  topic: string;
  shopDomain: string;
};

function hmacMatches(
  rawBody: string,
  receivedHmac: string,
  secret: string,
) {
  const expectedHmac = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  const expected = Buffer.from(expectedHmac, "utf8");
  const received = Buffer.from(receivedHmac, "utf8");

  return (
    expected.length === received.length &&
    timingSafeEqual(expected, received)
  );
}

function configuredWebhookSecrets() {
  return Array.from(
    new Set(
      [
        process.env.SHOPIFY_WEBHOOK_SECRET,
        process.env.SHOPIFY_APP_WEBHOOK_SECRET,
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
}

export async function verifyShopifyWebhookRequest(
  request: Request,
  allowedTopics: string[],
): Promise<VerifiedShopifyWebhook> {
  const rawBody = await request.text();
  const receivedHmac =
    request.headers.get("x-shopify-hmac-sha256") || "";
  const webhookId =
    request.headers.get("x-shopify-webhook-id") || "";
  const topic =
    request.headers.get("x-shopify-topic") || "";
  const shopDomain =
    request.headers.get("x-shopify-shop-domain") || "";

  if (!receivedHmac) {
    throw new ShopifyWebhookError(
      "Missing Shopify HMAC signature.",
      401,
    );
  }

  const secrets = configuredWebhookSecrets();

  if (secrets.length === 0) {
    throw new ShopifyWebhookError(
      "No Shopify webhook secret is configured.",
      500,
    );
  }

  if (
    !secrets.some((secret) =>
      hmacMatches(rawBody, receivedHmac, secret),
    )
  ) {
    throw new ShopifyWebhookError(
      "Invalid Shopify signature.",
      401,
    );
  }

  if (!webhookId) {
    throw new ShopifyWebhookError(
      "Missing Shopify webhook ID.",
      400,
    );
  }

  if (!allowedTopics.includes(topic)) {
    throw new ShopifyWebhookError(
      `Unexpected Shopify webhook topic: ${topic || "(missing)"}.`,
      400,
    );
  }

  const expectedShop = String(
    process.env.SHOPIFY_STORE_DOMAIN || "",
  )
    .trim()
    .toLowerCase();

  if (
    expectedShop &&
    shopDomain.trim().toLowerCase() !== expectedShop
  ) {
    throw new ShopifyWebhookError(
      "Unexpected Shopify store.",
      401,
    );
  }

  return {
    rawBody,
    webhookId,
    topic,
    shopDomain,
  };
}

export class ShopifyWebhookError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ShopifyWebhookError";
    this.status = status;
  }
}

export async function beginShopifyWebhookEvent(
  webhook: VerifiedShopifyWebhook,
) {
  const { data: existingEvent, error: existingError } =
    await supabaseAdmin
      .from("shopify_webhook_events")
      .select("status")
      .eq("webhook_id", webhook.webhookId)
      .maybeSingle();

  if (existingError) {
    throw new Error(
      `Could not check webhook event: ${existingError.message}`,
    );
  }

  if (
    existingEvent?.status === "processed" ||
    existingEvent?.status === "ignored"
  ) {
    return { duplicate: true as const };
  }

  const { error: upsertError } = await supabaseAdmin
    .from("shopify_webhook_events")
    .upsert(
      {
        webhook_id: webhook.webhookId,
        topic: webhook.topic,
        shop_domain: webhook.shopDomain || null,
        status: "processing",
        received_at: new Date().toISOString(),
        error_message: null,
      },
      { onConflict: "webhook_id" },
    );

  if (upsertError) {
    throw new Error(
      `Could not record webhook event: ${upsertError.message}`,
    );
  }

  return { duplicate: false as const };
}

export async function completeShopifyWebhookEvent({
  webhookId,
  orderId,
  result,
  ignored = false,
}: {
  webhookId: string;
  orderId?: string | null;
  result: unknown;
  ignored?: boolean;
}) {
  const { error } = await supabaseAdmin
    .from("shopify_webhook_events")
    .update({
      status: ignored ? "ignored" : "processed",
      order_id: orderId || null,
      processed_at: new Date().toISOString(),
      result_json: result,
      error_message: null,
    })
    .eq("webhook_id", webhookId);

  if (error) {
    throw new Error(
      `Could not complete webhook event: ${error.message}`,
    );
  }
}

export async function failShopifyWebhookEvent(
  webhookId: string,
  message: string,
) {
  await supabaseAdmin
    .from("shopify_webhook_events")
    .update({
      status: "failed",
      processed_at: new Date().toISOString(),
      error_message: message,
    })
    .eq("webhook_id", webhookId);
}
