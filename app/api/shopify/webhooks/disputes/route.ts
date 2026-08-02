import { NextResponse } from "next/server";
import {
  beginShopifyWebhookEvent,
  completeShopifyWebhookEvent,
  failShopifyWebhookEvent,
  ShopifyWebhookError,
  verifyShopifyWebhookRequest,
} from "@/lib/shopify-webhook";
import {
  restoreWonChargeback,
  revokeShopifyAccessForOrder,
  updateDisputeStatus,
} from "@/lib/shopify-access-revocation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DisputePayload = {
  id: number | string;
  order_id: number | string;
  type?: string | null;
  status?: string | null;
};

export async function POST(request: Request) {
  let webhookId = "";

  try {
    const webhook = await verifyShopifyWebhookRequest(
      request,
      ["disputes/create", "disputes/update"],
    );

    webhookId = webhook.webhookId;

    const event = await beginShopifyWebhookEvent(webhook);

    if (event.duplicate) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
      });
    }

    const dispute = JSON.parse(
      webhook.rawBody,
    ) as DisputePayload;

    const disputeId = String(dispute.id || "");
    const orderId = String(dispute.order_id || "");
    const disputeType = String(
      dispute.type || "",
    ).toLowerCase();
    const disputeStatus = String(
      dispute.status || "",
    ).toLowerCase();

    if (!disputeId || !orderId) {
      throw new Error(
        "Dispute webhook is missing the dispute or order id.",
      );
    }

    let result: unknown;

    if (disputeStatus === "won") {
      result = await restoreWonChargeback({
        orderId,
        disputeId,
      });
    } else if (disputeType === "chargeback") {
      /*
       * Revoke immediately when the dispute has become a chargeback.
       * Inquiry-only disputes do not revoke access.
       */
      result = await revokeShopifyAccessForOrder({
        orderId,
        reason: "chargeback",
        disputeId,
        disputeStatus:
          disputeStatus || "needs_response",
      });
    } else {
      await updateDisputeStatus({
        disputeId,
        status:
          disputeStatus ||
          `${disputeType || "inquiry"}-open`,
      });

      result = {
        ignored: true,
        reason:
          "The dispute is still an inquiry and has not become a chargeback.",
      };
    }

    const ignored =
      typeof result === "object" &&
      result !== null &&
      "ignored" in result &&
      Boolean(
        (result as { ignored?: boolean }).ignored,
      );

    await completeShopifyWebhookEvent({
      webhookId,
      orderId,
      result,
      ignored,
    });

    return NextResponse.json({
      ok: true,
      orderId,
      disputeId,
      disputeType,
      disputeStatus,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown dispute webhook error.";

    if (webhookId) {
      await failShopifyWebhookEvent(
        webhookId,
        message,
      );
    }

    console.error(
      "Shopify dispute webhook failed:",
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
