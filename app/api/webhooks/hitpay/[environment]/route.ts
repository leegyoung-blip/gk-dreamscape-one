import { NextResponse } from "next/server";
import { sendGkpBillingEmail } from "@/lib/gkpBillingEmail";
import {
  reconcileGkpHitPayPayment,
} from "@/lib/gkp-hitpay-reconciliation";
import {
  getHitPayWebhookSalt,
  isHitPayEnvironment,
  validateHitPayWebhookSignature,
} from "@/lib/hitpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(
  body: unknown,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function stringValue(
  value: unknown,
) {
  return value === null ||
    value === undefined
    ? ""
    : String(value);
}

function readableError(
  error: unknown,
) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object"
  ) {
    const value =
      error as {
        message?: unknown;
        details?: unknown;
        hint?: unknown;
        code?: unknown;
      };

    const parts = [
      typeof value.message === "string"
        ? value.message
        : "",
      typeof value.details === "string" &&
      value.details
        ? `Details: ${value.details}`
        : "",
      typeof value.hint === "string" &&
      value.hint
        ? `Hint: ${value.hint}`
        : "",
      typeof value.code === "string" &&
      value.code
        ? `Code: ${value.code}`
        : "",
    ].filter(Boolean);

    if (parts.length) {
      return parts.join(" | ");
    }

    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown webhook processing error.";
    }
  }

  return String(error);
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      environment: string;
    }>;
  },
) {
  const { environment } =
    await context.params;

  if (
    !isHitPayEnvironment(
      environment,
    )
  ) {
    return json(
      {
        error:
          "Invalid HitPay environment.",
      },
      404,
    );
  }

  /*
   * IMPORTANT:
   * Signature validation must use the exact raw request body.
   * Do not call request.json() before validating.
   */
  const rawBody =
    await request.text();

  const signature =
    request.headers.get(
      "hitpay-signature",
    ) || "";

  if (!signature) {
    return json(
      {
        error:
          "Missing HitPay signature.",
      },
      401,
    );
  }

  try {
    // =========================================================
    // 1. VERIFY HITPAY SIGNATURE
    // =========================================================

    const salt =
      getHitPayWebhookSalt(
        environment,
      );

    const valid =
      validateHitPayWebhookSignature(
        {
          rawBody,
          signature,
          salt,
        },
      );

    if (!valid) {
      return json(
        {
          error:
            "Invalid HitPay signature.",
        },
        401,
      );
    }

    // =========================================================
    // 2. PARSE VERIFIED WEBHOOK
    // =========================================================

    const payload =
      JSON.parse(
        rawBody,
      ) as Record<
        string,
        unknown
      >;

    const eventType =
      stringValue(
        request.headers.get(
          "hitpay-event-type",
        ) || "completed",
      ).toLowerCase();

    const objectType =
      stringValue(
        request.headers.get(
          "hitpay-event-object",
        ) || "payment_request",
      ).toLowerCase();

    const requestId =
      stringValue(
        payload.id,
      ).trim();

    const requestStatus =
      stringValue(
        payload.status,
      )
        .trim()
        .toLowerCase();

    // =========================================================
    // 3. IGNORE EVENTS THIS ENDPOINT DOES NOT APPLY
    // =========================================================

    if (
      objectType !==
        "payment_request" ||
      eventType !==
        "completed" ||
      requestStatus !==
        "completed"
    ) {
      return json({
        received: true,
        ignored: true,
        objectType,
        eventType,
        requestStatus,
      });
    }

    if (!requestId) {
      return json(
        {
          error:
            "Completed payment payload is missing the payment request ID.",
        },
        422,
      );
    }

    // =========================================================
    // 4. APPLY THROUGH THE SHARED RECONCILIATION ENGINE
    // =========================================================
    //
    // This replaces the old direct call to:
    //
    //   gkp_apply_hitpay_payment(...)
    //
    // The old RPC contains the pre-existing ON CONFLICT
    // mismatch that produced PostgreSQL 42P10 and caused the
    // production webhook to return HTTP 500.
    //
    // The shared engine now performs:
    //
    //   - local payment-request lookup
    //   - provider request ID verification
    //   - amount verification
    //   - currency verification
    //   - invoice reference verification
    //   - successful payment extraction
    //   - provider payment ID idempotency
    //   - overpayment protection
    //   - payment insertion
    //   - invoice recalculation
    //   - audit logging
    //
    // Because the payload has already passed HMAC signature
    // validation, it can be safely supplied directly instead
    // of making a second GET request to HitPay.

    const result =
      await reconcileGkpHitPayPayment(
        {
          environment,
          providerRequestId:
            requestId,
          source: "webhook",
          actorUserId: null,
          providerPayload:
            payload,
        },
      );

    // =========================================================
    // 5. DO NOT SILENTLY ACCEPT FINANCIAL MISMATCHES
    // =========================================================

    if (
      result.status ===
      "needs_attention"
    ) {
      console.error(
        "HitPay webhook needs financial review",
        {
          requestId,
          invoiceId:
            result.invoiceId,
          invoiceNumber:
            result.invoiceNumber,
          reason:
            result.reason,
          result,
        },
      );

      return json(
        {
          error:
            result.reason ||
            "HitPay payment requires manual review.",
          reconciliation:
            result,
        },
        409,
      );
    }

    if (
      result.status ===
      "provider_not_completed"
    ) {
      /*
       * This should not normally happen because the verified
       * webhook itself says payment_request.completed.
       * Treat it as an inconsistent provider payload.
       */
      console.error(
        "HitPay completed webhook produced a non-completed reconciliation state",
        {
          requestId,
          result,
        },
      );

      return json(
        {
          error:
            result.reason ||
            "HitPay payment state is inconsistent.",
          reconciliation:
            result,
        },
        409,
      );
    }

    // =========================================================
    // 6. SEND PAID-INVOICE EMAIL ONLY FOR A NEWLY RECORDED PAYMENT
    // =========================================================
    //
    // HitPay may retry the same webhook.
    //
    // "already_reconciled" must still return 200, but we do not
    // send another payment-received email for the duplicate.

    if (
      result.status ===
      "reconciled"
    ) {
      try {
        await sendGkpBillingEmail({
          invoiceId:
            result.invoiceId,
          emailType:
            "payment_received",
          origin:
            new URL(
              request.url,
            ).origin,
          paymentId:
            result.providerPaymentId ||
            undefined,
        });
      } catch (emailError) {
        /*
         * Payment processing must remain successful even if
         * email delivery fails.
         */
        console.error(
          "HitPay payment was recorded, but the paid-invoice email failed",
          emailError,
        );
      }
    }

    // =========================================================
    // 7. SUCCESS / IDEMPOTENT RETRY
    // =========================================================

    return json({
      received: true,
      reconciliation:
        result.status,
      invoiceId:
        result.invoiceId,
      invoiceNumber:
        result.invoiceNumber,
      providerPaymentId:
        result.providerPaymentId,
    });
  } catch (error) {
    const message =
      readableError(error);

    console.error(
      "HitPay webhook processing failed",
      {
        environment,
        message,
        rawError: error,
      },
    );

    return json(
      {
        error: message,
      },
      500,
    );
  }
}
