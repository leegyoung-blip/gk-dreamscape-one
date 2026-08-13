import { NextResponse } from "next/server";
import {
  createBillingServiceClient,
  isInvoicePublicToken,
} from "@/lib/gkpBillingServer";
import {
  reconcileGkpHitPayPayment,
  type GkpHitPayReconciliationStatus,
} from "@/lib/gkp-hitpay-reconciliation";
import {
  isHitPayEnvironment,
  type HitPayEnvironment,
} from "@/lib/hitpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROVIDER_RECHECK_MS = 8_000;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

function shouldRecheckProvider(
  providerStatusCheckedAt: string | null,
) {
  if (!providerStatusCheckedAt) {
    return true;
  }

  const checkedAt = new Date(
    providerStatusCheckedAt,
  ).getTime();

  if (!Number.isFinite(checkedAt)) {
    return true;
  }

  return (
    Date.now() - checkedAt >=
    PROVIDER_RECHECK_MS
  );
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const publicToken = String(
      url.searchParams.get("token") || "",
    ).trim();

    if (!isInvoicePublicToken(publicToken)) {
      return json(
        {
          error: "Invalid invoice link.",
        },
        400,
      );
    }

    const client =
      createBillingServiceClient();

    async function loadInvoice() {
      const {
        data,
        error,
      } = await client
        .from("gkp_billing_invoices")
        .select(
          "id,status,currency,total_amount,amount_paid,balance_due,paid_at,public_link_enabled,hitpay_payment_status,hitpay_payment_request_created_at,hitpay_qr_expiry",
        )
        .eq(
          "public_token",
          publicToken,
        )
        .eq(
          "public_link_enabled",
          true,
        )
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    }

    async function loadCurrentRequest(
      invoiceId: string,
    ) {
      const {
        data,
        error,
      } = await client
        .from(
          "gkp_billing_payment_requests",
        )
        .select(
          "id,environment,provider_request_id,provider_status,provider_status_checked_at,qr_expires_at,reuse_until,created_at,is_current",
        )
        .eq(
          "invoice_id",
          invoiceId,
        )
        .eq(
          "provider",
          "hitpay",
        )
        .eq(
          "is_current",
          true,
        )
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    }

    let invoice =
      await loadInvoice();

    if (!invoice) {
      return json(
        {
          error: "Invoice not found.",
        },
        404,
      );
    }

    let currentRequest =
      await loadCurrentRequest(
        invoice.id,
      );

    let reconciliationStatus:
      | GkpHitPayReconciliationStatus
      | null = null;

    /*
     * Self-healing parent status polling.
     *
     * The public invoice token already grants read access to this
     * specific invoice. If there is an active HitPay request and
     * money is still outstanding, periodically verify the request
     * directly with HitPay.
     *
     * The shared reconciliation engine performs all financial
     * matching and idempotency checks before writing a payment.
     */
    const balanceDue =
      Number(
        invoice.balance_due || 0,
      );

    if (
      currentRequest?.provider_request_id &&
      balanceDue > 0 &&
      shouldRecheckProvider(
        currentRequest
          .provider_status_checked_at,
      )
    ) {
      const rawEnvironment =
        String(
          currentRequest.environment ||
            "",
        )
          .trim()
          .toLowerCase();

      if (
        isHitPayEnvironment(
          rawEnvironment,
        )
      ) {
        try {
          const result =
            await reconcileGkpHitPayPayment(
              {
                environment:
                  rawEnvironment as HitPayEnvironment,
                providerRequestId:
                  currentRequest
                    .provider_request_id,
                source:
                  "public_status_poll",
                actorUserId: null,
              },
            );

          reconciliationStatus =
            result.status;

          /*
           * Reload after reconciliation because a completed
           * payment may just have changed amount_paid, balance_due,
           * invoice status and current-request state.
           */
          invoice =
            await loadInvoice();

          if (!invoice) {
            return json(
              {
                error:
                  "Invoice not found.",
              },
              404,
            );
          }

          currentRequest =
            await loadCurrentRequest(
              invoice.id,
            );
        } catch (reconcileError) {
          /*
           * Payment polling should remain usable if HitPay is
           * temporarily unavailable. The normal webhook and the
           * staff reconciliation tools can still repair the record.
           */
          console.error(
            "Public HitPay payment reconciliation check failed",
            reconcileError,
          );
        }
      }
    }

    /*
     * loadInvoice() uses maybeSingle(), so its return type includes null.
     * The variable is reassigned inside the reconciliation branch, and
     * TypeScript does not preserve the earlier null narrowing across that
     * reassignment. Re-check immediately before building the response.
     */
    if (!invoice) {
      return json(
        {
          error: "Invoice not found.",
        },
        404,
      );
    }

    return json({
      invoiceStatus:
        invoice.status,
      currency:
        invoice.currency,
      totalAmount:
        Number(
          invoice.total_amount || 0,
        ),
      amountPaid:
        Number(
          invoice.amount_paid || 0,
        ),
      balanceDue:
        Number(
          invoice.balance_due || 0,
        ),
      paidAt:
        invoice.paid_at,
      hitpayStatus:
        currentRequest
          ?.provider_status ||
        invoice
          .hitpay_payment_status ||
        null,
      qrExpiresAt:
        currentRequest
          ?.qr_expires_at ||
        invoice
          .hitpay_qr_expiry ||
        null,
      canGenerateAfter:
        currentRequest
          ?.reuse_until ||
        (currentRequest
          ?.created_at
          ? new Date(
              new Date(
                currentRequest.created_at,
              ).getTime() +
                15 *
                  60 *
                  1000,
            ).toISOString()
          : null),
      reconciliationStatus,
    });
  } catch (error) {
    console.error(
      "HitPay payment-status lookup failed",
      error,
    );

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
