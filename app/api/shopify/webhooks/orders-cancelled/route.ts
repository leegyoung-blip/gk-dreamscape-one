import { NextResponse } from "next/server";
import {
  beginShopifyWebhookEvent,
  completeShopifyWebhookEvent,
  failShopifyWebhookEvent,
  ShopifyWebhookError,
  verifyShopifyWebhookRequest,
} from "@/lib/shopify-webhook";
import { markOrderCancelledAtPeriodEnd } from "@/lib/shopify-access-revocation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CancelledOrderPayload = {
  id: number | string;
  cancelled_at?: string | null;
};

export async function POST(request: Request) {
  let webhookId = "";

  try {
    const webhook = await verifyShopifyWebhookRequest(
      request,
      ["orders/cancelled"],
    );

    webhookId = webhook.webhookId;

    const event = await beginShopifyWebhookEvent(webhook);

    if (event.duplicate) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
      });
    }

    const order = JSON.parse(
      webhook.rawBody,
    ) as CancelledOrderPayload;

    const orderId = String(order.id || "");

    if (!orderId) {
      throw new Error(
        "Cancelled-order webhook is missing the order id.",
      );
    }

    /*
     * Do not revoke immediately. The learner keeps the paid period.
     * The existing access_until date remains unchanged, and the access
     * gate blocks the learner automatically after that timestamp.
     */
    const result = await markOrderCancelledAtPeriodEnd({
      orderId,
      cancelledAt: order.cancelled_at,
    });

    await completeShopifyWebhookEvent({
      webhookId,
      orderId,
      result,
      ignored: result.ignored,
    });

    return NextResponse.json({
      ok: true,
      orderId,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown cancellation webhook error.";

    if (webhookId) {
      await failShopifyWebhookEvent(
        webhookId,
        message,
      );
    }

    console.error(
      "Shopify orders/cancelled webhook failed:",
      message,
    );

    return NextResponse.json(
      { ok: false, error: message },
      {
        status:
          error instanceof ShopifyWebhookError
            ? error.status
            : 500,
      },
    );
  }
}
