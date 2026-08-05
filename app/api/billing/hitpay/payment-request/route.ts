import { NextResponse } from "next/server";
import {
  createHitPayPayNowRequest,
  hitPayQrDataUrl,
} from "@/lib/hitpay";
import {
  createBillingServiceClient,
  isInvoicePublicToken,
} from "@/lib/gkpBillingServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAYABLE_STATUSES = ["issued", "partially_paid", "overdue"];
const QR_LIFETIME_MS = 5 * 60 * 1000;
const REQUEST_SAFETY_WINDOW_MS = 15 * 60 * 1000;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

function dateValue(value: unknown) {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { publicToken?: string };
    const publicToken = String(body.publicToken || "").trim();

    if (!isInvoicePublicToken(publicToken)) {
      return json({ error: "Invalid invoice link." }, 400);
    }

    const client = createBillingServiceClient();
    const { data: invoice, error: invoiceError } = await client
      .from("gkp_billing_invoices")
      .select(
        "id,invoice_number,account_id,status,currency,balance_due,amount_paid,paid_at,public_link_enabled,hitpay_payment_status",
      )
      .eq("public_token", publicToken)
      .eq("public_link_enabled", true)
      .maybeSingle();

    if (invoiceError) throw invoiceError;
    if (!invoice) return json({ error: "Invoice not found." }, 404);

    const balanceDue = Number(invoice.balance_due || 0);

    if (invoice.status === "paid" || balanceDue <= 0) {
      return json({
        state: "paid",
        invoiceStatus: invoice.status,
        amountPaid: Number(invoice.amount_paid || 0),
        balanceDue: 0,
        paidAt: invoice.paid_at,
      });
    }

    if (!PAYABLE_STATUSES.includes(invoice.status)) {
      return json({ error: "This invoice is not currently payable." }, 409);
    }

    const { data: account, error: accountError } = await client
      .from("gkp_billing_accounts")
      .select("payer_name,billing_email,phone")
      .eq("id", invoice.account_id)
      .maybeSingle();

    if (accountError) throw accountError;
    if (!account) return json({ error: "Billing account not found." }, 404);

    const { data: currentRequest, error: requestError } = await client
      .from("gkp_billing_payment_requests")
      .select(
        "id,environment,provider_request_id,provider_status,requested_amount,currency,checkout_url,qr_payload,qr_expires_at,reuse_until,created_at",
      )
      .eq("invoice_id", invoice.id)
      .eq("provider", "hitpay")
      .eq("is_current", true)
      .maybeSingle();

    if (requestError) throw requestError;

    const now = new Date();

    if (currentRequest?.provider_status === "pending") {
      const expiresAt =
        dateValue(currentRequest.qr_expires_at) ||
        new Date(
          (dateValue(currentRequest.created_at)?.getTime() || now.getTime()) +
            QR_LIFETIME_MS,
        );
      const reuseUntil =
        dateValue(currentRequest.reuse_until) ||
        new Date(
          (dateValue(currentRequest.created_at)?.getTime() || now.getTime()) +
            REQUEST_SAFETY_WINDOW_MS,
        );

      if (
        currentRequest.qr_payload &&
        expiresAt.getTime() > now.getTime()
      ) {
        return json({
          state: "pending",
          environment: currentRequest.environment,
          paymentRequestId: currentRequest.provider_request_id,
          amount: Number(currentRequest.requested_amount),
          currency: currentRequest.currency,
          qrDataUrl: await hitPayQrDataUrl(currentRequest.qr_payload),
          checkoutUrl: currentRequest.checkout_url,
          sandboxDirectUrl: currentRequest.qr_payload.startsWith("http")
            ? currentRequest.qr_payload
            : null,
          expiresAt: expiresAt.toISOString(),
          canGenerateAfter: reuseUntil.toISOString(),
          reused: true,
        });
      }

      if (reuseUntil.getTime() > now.getTime()) {
        return json(
          {
            state: "waiting",
            message:
              "The previous PayNow QR has expired, but the bank may still be processing a scan. Please wait before creating another QR.",
            retryAfterSeconds: Math.ceil(
              (reuseUntil.getTime() - now.getTime()) / 1000,
            ),
            canGenerateAfter: reuseUntil.toISOString(),
          },
          409,
        );
      }
    }

    const created = await createHitPayPayNowRequest({
      amount: balanceDue,
      currency: invoice.currency || "SGD",
      invoiceNumber: invoice.invoice_number,
      invoiceId: invoice.id,
      accountId: invoice.account_id,
      payerName: account.payer_name,
      email: account.billing_email,
      phone: account.phone,
    });

    const createdAt = now;
    const hitPayExpiry = dateValue(
      created.request.qr_code_data?.qr_code_expiry,
    );
    const expiresAt =
      hitPayExpiry || new Date(createdAt.getTime() + QR_LIFETIME_MS);
    const reuseUntil = new Date(
      createdAt.getTime() + REQUEST_SAFETY_WINDOW_MS,
    );

    const { error: storeError } = await client.rpc(
      "gkp_store_hitpay_payment_request",
      {
        p_invoice_id: invoice.id,
        p_environment: created.environment,
        p_provider_request_id: created.request.id,
        p_requested_amount: balanceDue,
        p_currency: invoice.currency || "SGD",
        p_checkout_url: created.request.url || null,
        p_qr_payload: created.qrPayload,
        p_qr_expiry: expiresAt.toISOString(),
        p_reuse_until: reuseUntil.toISOString(),
        p_raw_response: created.request,
      },
    );

    if (storeError) throw storeError;

    return json({
      state: "pending",
      environment: created.environment,
      paymentRequestId: created.request.id,
      amount: balanceDue,
      currency: invoice.currency || "SGD",
      qrDataUrl: await hitPayQrDataUrl(created.qrPayload),
      checkoutUrl: created.request.url || null,
      sandboxDirectUrl: created.qrPayload.startsWith("http")
        ? created.qrPayload
        : null,
      expiresAt: expiresAt.toISOString(),
      canGenerateAfter: reuseUntil.toISOString(),
      reused: false,
    });
  } catch (error) {
    console.error("HitPay payment-request creation failed", error);
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create the PayNow payment request.",
      },
      500,
    );
  }
}
