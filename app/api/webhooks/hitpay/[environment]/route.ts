import { NextResponse } from "next/server";
import { createBillingServiceClient } from "@/lib/gkpBillingServer";
import { sendGkpBillingEmail } from "@/lib/gkpBillingEmail";
import {
  getHitPayWebhookSalt,
  isHitPayEnvironment,
  validateHitPayWebhookSignature,
} from "@/lib/hitpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function stringValue(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ environment: string }> },
) {
  const { environment } = await context.params;

  if (!isHitPayEnvironment(environment)) {
    return json({ error: "Invalid HitPay environment." }, 404);
  }

  const rawBody = await request.text();
  const signature = request.headers.get("hitpay-signature") || "";

  if (!signature) {
    return json({ error: "Missing HitPay signature." }, 401);
  }

  try {
    const salt = getHitPayWebhookSalt(environment);
    const valid = validateHitPayWebhookSignature({
      rawBody,
      signature,
      salt,
    });

    if (!valid) {
      return json({ error: "Invalid HitPay signature." }, 401);
    }

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const eventType = stringValue(
      request.headers.get("hitpay-event-type") || "completed",
    ).toLowerCase();
    const objectType = stringValue(
      request.headers.get("hitpay-event-object") || "payment_request",
    ).toLowerCase();
    const requestId = stringValue(payload.id);
    const requestStatus = stringValue(payload.status).toLowerCase();

    if (
      objectType !== "payment_request" ||
      eventType !== "completed" ||
      requestStatus !== "completed"
    ) {
      return json({ received: true, ignored: true });
    }

    const payments = Array.isArray(payload.payments)
      ? (payload.payments as Record<string, unknown>[])
      : [];
    const succeededPayment = payments.find(
      (payment) => stringValue(payment.status).toLowerCase() === "succeeded",
    );

    if (!requestId || !succeededPayment) {
      return json({ error: "Completed payment payload is incomplete." }, 422);
    }

    const paymentId = stringValue(succeededPayment.id);
    const amount = Number(succeededPayment.amount ?? payload.amount);
    const currency = stringValue(
      succeededPayment.currency || payload.currency,
    ).toUpperCase();
    const paymentMethod = stringValue(
      succeededPayment.payment_type ||
        (Array.isArray(payload.payment_methods)
          ? payload.payment_methods[0]
          : "paynow_online"),
    );
    const paidAt = stringValue(
      succeededPayment.updated_at ||
        succeededPayment.created_at ||
        payload.updated_at,
    );
    const referenceNumber = stringValue(payload.reference_number);

    if (!paymentId || !Number.isFinite(amount) || amount <= 0 || !currency) {
      return json({ error: "Payment details are incomplete." }, 422);
    }

    const eventKey = `${requestId}:${paymentId}:${eventType}`;
    const client = createBillingServiceClient();
    const { error } = await client.rpc("gkp_apply_hitpay_payment", {
      p_environment: environment,
      p_event_key: eventKey,
      p_event_type: eventType,
      p_object_type: objectType,
      p_payment_request_id: requestId,
      p_payment_id: paymentId,
      p_reference_number: referenceNumber,
      p_amount: amount,
      p_currency: currency,
      p_payment_method: paymentMethod,
      p_paid_at: paidAt || new Date().toISOString(),
      p_payload: payload,
    });

    if (error) {
      console.error("HitPay webhook database processing failed", error);
      return json({ error: error.message }, 500);
    }

    try {
      const { data: paymentRequest } = await client
        .from("gkp_billing_payment_requests")
        .select("invoice_id")
        .eq("provider", "hitpay")
        .eq("provider_request_id", requestId)
        .maybeSingle();

      if (paymentRequest?.invoice_id) {
        await sendGkpBillingEmail({
          invoiceId: paymentRequest.invoice_id,
          emailType: "payment_received",
          origin: new URL(request.url).origin,
          paymentId,
        });
      }
    } catch (emailError) {
      // Payment processing must remain successful even if email delivery fails.
      console.error(
        "HitPay payment was recorded, but the paid-invoice email failed",
        emailError,
      );
    }

    return json({ received: true });
  } catch (error) {
    console.error("HitPay webhook processing failed", error);
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Webhook processing failed.",
      },
      500,
    );
  }
}
