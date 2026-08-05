import { NextResponse } from "next/server";
import {
  createBillingServiceClient,
  isInvoicePublicToken,
} from "@/lib/gkpBillingServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const publicToken = String(url.searchParams.get("token") || "").trim();

    if (!isInvoicePublicToken(publicToken)) {
      return json({ error: "Invalid invoice link." }, 400);
    }

    const client = createBillingServiceClient();
    const { data: invoice, error } = await client
      .from("gkp_billing_invoices")
      .select(
        "id,status,currency,total_amount,amount_paid,balance_due,paid_at,public_link_enabled,hitpay_payment_status,hitpay_payment_request_created_at,hitpay_qr_expiry",
      )
      .eq("public_token", publicToken)
      .eq("public_link_enabled", true)
      .maybeSingle();

    if (error) throw error;
    if (!invoice) return json({ error: "Invoice not found." }, 404);

    const { data: currentRequest, error: currentError } = await client
      .from("gkp_billing_payment_requests")
      .select("provider_status,qr_expires_at,reuse_until,created_at")
      .eq("invoice_id", invoice.id)
      .eq("provider", "hitpay")
      .eq("is_current", true)
      .maybeSingle();

    if (currentError) throw currentError;

    return json({
      invoiceStatus: invoice.status,
      currency: invoice.currency,
      totalAmount: Number(invoice.total_amount || 0),
      amountPaid: Number(invoice.amount_paid || 0),
      balanceDue: Number(invoice.balance_due || 0),
      paidAt: invoice.paid_at,
      hitpayStatus:
        currentRequest?.provider_status || invoice.hitpay_payment_status || null,
      qrExpiresAt:
        currentRequest?.qr_expires_at || invoice.hitpay_qr_expiry || null,
      canGenerateAfter:
        currentRequest?.reuse_until ||
        (currentRequest?.created_at
          ? new Date(
              new Date(currentRequest.created_at).getTime() + 15 * 60 * 1000,
            ).toISOString()
          : null),
    });
  } catch (error) {
    console.error("HitPay payment-status lookup failed", error);
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not check payment status.",
      },
      500,
    );
  }
}
