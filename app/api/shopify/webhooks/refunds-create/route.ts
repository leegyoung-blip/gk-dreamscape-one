import { NextResponse } from "next/server";
import {
  beginShopifyWebhookEvent,
  completeShopifyWebhookEvent,
  failShopifyWebhookEvent,
  ShopifyWebhookError,
  verifyShopifyWebhookRequest,
} from "@/lib/shopify-webhook";
import { revokeShopifyAccessForOrder } from "@/lib/shopify-access-revocation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RefundPayload = {
  id: number | string;
  order_id: number | string;
  refund_line_items?: Array<{
    line_item_id?: number | string | null;
  }> | null;
};

export async function POST(request: Request) {
  let webhookId = "";

  try {
    const webhook = await verifyShopifyWebhookRequest(
      request,
      ["refunds/create"],
    );

    webhookId = webhook.webhookId;

    const event = await beginShopifyWebhookEvent(webhook);

    if (event.duplicate) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
      });
    }

    const refund = JSON.parse(
      webhook.rawBody,
    ) as RefundPayload;

    const orderId = String(refund.order_id || "");
    const refundId = String(refund.id || "");

    if (!orderId || !refundId) {
      throw new Error(
        "Refund webhook is missing order_id or refund id.",
      );
    }

    const lineItemIds = Array.from(
      new Set(
        (refund.refund_line_items || [])
          .map((item) =>
            String(item.line_item_id || "").trim(),
          )
          .filter(Boolean),
      ),
    );

    const result = await revokeShopifyAccessForOrder({
      orderId,
      lineItemIds:
        lineItemIds.length > 0 ? lineItemIds : undefined,
      reason: "refund",
      refundId,
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
      refundId,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown refund webhook error.";

    if (webhookId) {
      await failShopifyWebhookEvent(
        webhookId,
        message,
      );
    }

    console.error(
      "Shopify refunds/create webhook failed:",
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
