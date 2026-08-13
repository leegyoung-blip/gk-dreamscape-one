import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  getHitPayPaymentRequest,
  type HitPayEnvironment,
} from "@/lib/hitpay";

export type GkpHitPayReconciliationSource =
  | "admin_refresh"
  | "manual_reconcile"
  | "webhook";

export type GkpHitPayReconciliationStatus =
  | "reconciled"
  | "already_reconciled"
  | "provider_not_completed"
  | "needs_attention";

export type GkpHitPayReconciliationResult = {
  ok: boolean;
  status: GkpHitPayReconciliationStatus;
  invoiceId: string;
  invoiceNumber: string;
  providerRequestId: string;
  providerPaymentId: string | null;
  amount: number | null;
  currency: string;
  providerStatus: string;
  reason?: string;
};

type LocalPaymentRequest = {
  id: string;
  invoice_id: string;
  provider: string;
  environment: string;
  provider_request_id: string;
  provider_status: string;
  requested_amount: number | string;
  currency: string;
  payment_method: string | null;
  is_current: boolean;
  completed_at: string | null;
};

type LocalInvoice = {
  id: string;
  invoice_number: string;
  account_id: string;
  status: string;
  currency: string;
  total_amount: number | string;
  amount_paid: number | string;
  balance_due: number | string | null;
  hitpay_payment_request_id: string | null;
  hitpay_payment_status: string | null;
  hitpay_payment_environment: string | null;
  hitpay_last_webhook_at: string | null;
};

type ProviderPayment = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  paymentType: string | null;
  paidAt: string;
  raw: Record<string, unknown>;
};

type ReconcileInput = {
  environment: HitPayEnvironment;
  providerRequestId: string;
  source: GkpHitPayReconciliationSource;
  actorUserId?: string | null;

  /*
   * Pass the already-validated webhook JSON here in Phase 2.
   * If omitted, reconciliation independently verifies current
   * provider state using HitPay's GET payment-request endpoint.
   */
  providerPayload?: Record<string, unknown> | null;
};

const MONEY_TOLERANCE = 0.005;

function record(value: unknown): Record<string, unknown> | null {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function numberValue(value: unknown) {
  const valueAsNumber =
    typeof value === "number"
      ? value
      : Number(
          typeof value === "string"
            ? value.trim()
            : value,
        );

  return Number.isFinite(valueAsNumber)
    ? valueAsNumber
    : NaN;
}

function upperCurrency(value: unknown) {
  return text(value).toUpperCase();
}

function lowerStatus(value: unknown) {
  return text(value).toLowerCase();
}

function moneyMatches(
  left: number,
  right: number,
) {
  return (
    Number.isFinite(left) &&
    Number.isFinite(right) &&
    Math.abs(left - right) <
      MONEY_TOLERANCE
  );
}

function timestampOrNow(
  ...values: unknown[]
) {
  for (const value of values) {
    const candidate = text(value);

    if (!candidate) {
      continue;
    }

    const parsed =
      new Date(candidate);

    if (
      Number.isFinite(
        parsed.getTime(),
      )
    ) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

function postgresCode(
  error: unknown,
) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error
  ) {
    return String(
      (error as { code?: unknown })
        .code || "",
    );
  }

  return "";
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
      text(value.message),
      text(value.details)
        ? `Details: ${text(
            value.details,
          )}`
        : "",
      text(value.hint)
        ? `Hint: ${text(
            value.hint,
          )}`
        : "",
      text(value.code)
        ? `Code: ${text(
            value.code,
          )}`
        : "",
    ].filter(Boolean);

    if (parts.length) {
      return parts.join(" | ");
    }

    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown reconciliation error.";
    }
  }

  return String(error);
}

function needsAttention(input: {
  invoice: LocalInvoice;
  paymentRequest: LocalPaymentRequest;
  providerStatus: string;
  reason: string;
  providerPaymentId?: string | null;
  amount?: number | null;
}) {
  return {
    ok: false,
    status: "needs_attention",
    invoiceId:
      input.invoice.id,
    invoiceNumber:
      input.invoice.invoice_number,
    providerRequestId:
      input.paymentRequest
        .provider_request_id,
    providerPaymentId:
      input.providerPaymentId ??
      null,
    amount:
      input.amount ?? null,
    currency:
      String(
        input.invoice.currency ||
          input.paymentRequest
            .currency ||
          "SGD",
      ).toUpperCase(),
    providerStatus:
      input.providerStatus,
    reason: input.reason,
  } satisfies
    GkpHitPayReconciliationResult;
}

function extractSuccessfulPayment(
  payload: Record<string, unknown>,
  expectedAmount: number,
  expectedCurrency: string,
): {
  payment: ProviderPayment | null;
  reason?: string;
} {
  const rawPayments =
    Array.isArray(payload.payments)
      ? payload.payments
      : [];

  const successful =
    rawPayments
      .map((item) => record(item))
      .filter(
        (
          item,
        ): item is Record<
          string,
          unknown
        > => Boolean(item),
      )
      .filter((item) => {
        const status =
          lowerStatus(item.status);

        return (
          status === "succeeded" ||
          status === "completed" ||
          status === "success"
        );
      });

  if (successful.length === 0) {
    return {
      payment: null,
      reason:
        "HitPay reports the payment request as completed, but no successful payment object was returned.",
    };
  }

  const exactMatches =
    successful.filter((item) => {
      const amount =
        numberValue(item.amount);

      const currency =
        upperCurrency(item.currency);

      return (
        moneyMatches(
          amount,
          expectedAmount,
        ) &&
        currency ===
          expectedCurrency
      );
    });

  if (exactMatches.length !== 1) {
    return {
      payment: null,
      reason:
        exactMatches.length === 0
          ? "No successful HitPay payment exactly matches the locally requested amount and currency."
          : "More than one successful HitPay payment matches this payment request. Automatic reconciliation was stopped to prevent duplicate collection.",
    };
  }

  const raw =
    exactMatches[0];

  const id =
    text(raw.id);

  if (!id) {
    return {
      payment: null,
      reason:
        "The successful HitPay payment does not contain a payment ID.",
    };
  }

  const amount =
    numberValue(raw.amount);

  const currency =
    upperCurrency(raw.currency);

  return {
    payment: {
      id,
      status:
        lowerStatus(raw.status),
      amount,
      currency,
      paymentType:
        text(
          raw.payment_type,
        ) ||
        null,
      paidAt:
        timestampOrNow(
          raw.updated_at,
          raw.created_at,
          payload.updated_at,
        ),
      raw,
    },
  };
}

async function markProviderState(
  input: {
    paymentRequest:
      LocalPaymentRequest;
    invoice: LocalInvoice;
    providerPayload:
      Record<string, unknown>;
    providerStatus: string;
    source:
      GkpHitPayReconciliationSource;
  },
) {
  const now =
    new Date().toISOString();

  const requestUpdate:
    Record<string, unknown> = {
      provider_status:
        input.providerStatus ||
        input.paymentRequest
          .provider_status,
      provider_status_checked_at:
        now,
      raw_status_response:
        input.providerPayload,
      updated_at: now,
    };

  if (
    input.providerStatus ===
    "completed"
  ) {
    requestUpdate.completed_at =
      input.paymentRequest
        .completed_at ||
      timestampOrNow(
        input.providerPayload
          .updated_at,
      );
  }

  if (
    input.source === "webhook"
  ) {
    requestUpdate.last_webhook_at =
      now;
    requestUpdate.raw_latest_webhook =
      input.providerPayload;
  }

  const {
    error: requestUpdateError,
  } = await supabaseAdmin
    .from(
      "gkp_billing_payment_requests",
    )
    .update(requestUpdate)
    .eq(
      "id",
      input.paymentRequest.id,
    );

  if (requestUpdateError) {
    throw requestUpdateError;
  }

  const invoiceUpdate:
    Record<string, unknown> = {
      hitpay_payment_status:
        input.providerStatus ||
        input.invoice
          .hitpay_payment_status,
      updated_at: now,
    };

  if (
    input.source === "webhook"
  ) {
    invoiceUpdate.hitpay_last_webhook_at =
      now;
  }

  const {
    error: invoiceUpdateError,
  } = await supabaseAdmin
    .from(
      "gkp_billing_invoices",
    )
    .update(invoiceUpdate)
    .eq("id", input.invoice.id);

  if (invoiceUpdateError) {
    throw invoiceUpdateError;
  }
}

async function finaliseCompletedRequest(
  input: {
    paymentRequestId: string;
    providerPayload:
      Record<string, unknown>;
    source:
      GkpHitPayReconciliationSource;
  },
) {
  const now =
    new Date().toISOString();

  const update:
    Record<string, unknown> = {
      provider_status:
        "completed",
      provider_status_checked_at:
        now,
      completed_at:
        timestampOrNow(
          input.providerPayload
            .updated_at,
      ),
      raw_status_response:
        input.providerPayload,
      is_current: false,
      updated_at: now,
    };

  if (
    input.source === "webhook"
  ) {
    update.last_webhook_at =
      now;
    update.raw_latest_webhook =
      input.providerPayload;
  }

  const { error } =
    await supabaseAdmin
      .from(
        "gkp_billing_payment_requests",
      )
      .update(update)
      .eq(
        "id",
        input.paymentRequestId,
      );

  if (error) {
    throw error;
  }
}

async function recalculateInvoice(
  invoiceId: string,
) {
  const { error } =
    await supabaseAdmin.rpc(
      "gkp_recalculate_invoice",
      {
        p_invoice_id:
          invoiceId,
      },
    );

  if (error) {
    throw error;
  }
}

async function recordAuditEvent(
  input: {
    invoice: LocalInvoice;
    source:
      GkpHitPayReconciliationSource;
    actorUserId?:
      string | null;
    providerRequestId:
      string;
    providerPaymentId:
      string;
    amount: number;
    currency: string;
    result:
      | "reconciled"
      | "already_reconciled";
  },
) {
  const {
    error: auditError,
  } = await supabaseAdmin
    .from("gkp_billing_events")
    .insert({
      invoice_id:
        input.invoice.id,
      account_id:
        input.invoice.account_id,
      event_type:
        input.result ===
        "reconciled"
          ? "hitpay_payment_reconciled"
          : "hitpay_payment_reconciliation_confirmed",
      actor_user_id:
        input.actorUserId ||
        null,
      details: {
        source:
          input.source,
        provider:
          "hitpay",
        provider_request_id:
          input.providerRequestId,
        provider_payment_id:
          input.providerPaymentId,
        amount:
          Number(
            input.amount.toFixed(
              2,
            ),
          ),
        currency:
          input.currency,
        result:
          input.result,
      },
    });

  /*
   * Do not make successful payment reconciliation fail only
   * because an auxiliary audit insert failed. The primary
   * financial records have already been safely written.
   */
  if (auditError) {
    console.error(
      "Could not write GKP HitPay reconciliation audit event",
      auditError,
    );
  }
}

export async function reconcileGkpHitPayPayment(
  input: ReconcileInput,
): Promise<GkpHitPayReconciliationResult> {
  const providerRequestId =
    String(
      input.providerRequestId ||
        "",
    ).trim();

  if (!providerRequestId) {
    throw new Error(
      "providerRequestId is required.",
    );
  }

  const {
    data: paymentRequestData,
    error: paymentRequestError,
  } = await supabaseAdmin
    .from(
      "gkp_billing_payment_requests",
    )
    .select(
      "id,invoice_id,provider,environment,provider_request_id,provider_status,requested_amount,currency,payment_method,is_current,completed_at",
    )
    .eq("provider", "hitpay")
    .eq(
      "environment",
      input.environment,
    )
    .eq(
      "provider_request_id",
      providerRequestId,
    )
    .maybeSingle();

  if (paymentRequestError) {
    throw paymentRequestError;
  }

  if (!paymentRequestData) {
    throw new Error(
      "No local GKP HitPay payment request matches this provider request ID and environment.",
    );
  }

  const paymentRequest =
    paymentRequestData as LocalPaymentRequest;

  const {
    data: invoiceData,
    error: invoiceError,
  } = await supabaseAdmin
    .from("gkp_billing_invoices")
    .select(
      "id,invoice_number,account_id,status,currency,total_amount,amount_paid,balance_due,hitpay_payment_request_id,hitpay_payment_status,hitpay_payment_environment,hitpay_last_webhook_at",
    )
    .eq(
      "id",
      paymentRequest.invoice_id,
    )
    .single();

  if (invoiceError) {
    throw invoiceError;
  }

  const invoice =
    invoiceData as LocalInvoice;

  if (
    invoice.status === "void"
  ) {
    return needsAttention({
      invoice,
      paymentRequest,
      providerStatus:
        paymentRequest.provider_status,
      reason:
        "The linked GKP invoice is void. Automatic payment reconciliation is blocked.",
    });
  }

  const providerPayload =
    input.providerPayload
      ? input.providerPayload
      : (await getHitPayPaymentRequest(
          input.environment,
          providerRequestId,
        )) as Record<
          string,
          unknown
        >;

  const responseRequestId =
    text(providerPayload.id);

  if (
    responseRequestId !==
    providerRequestId
  ) {
    return needsAttention({
      invoice,
      paymentRequest,
      providerStatus:
        lowerStatus(
          providerPayload.status,
        ),
      reason:
        "The HitPay response request ID does not match the local payment request ID.",
    });
  }

  const providerStatus =
    lowerStatus(
      providerPayload.status,
    );

  await markProviderState({
    paymentRequest,
    invoice,
    providerPayload,
    providerStatus,
    source: input.source,
  });

  if (
    providerStatus !==
    "completed"
  ) {
    return {
      ok: true,
      status:
        "provider_not_completed",
      invoiceId:
        invoice.id,
      invoiceNumber:
        invoice.invoice_number,
      providerRequestId,
      providerPaymentId:
        null,
      amount: null,
      currency:
        String(
          paymentRequest.currency ||
            invoice.currency ||
            "SGD",
        ).toUpperCase(),
      providerStatus,
      reason:
        `HitPay payment request status is "${providerStatus || "unknown"}". No local payment was recorded.`,
    };
  }

  const expectedAmount =
    numberValue(
      paymentRequest
        .requested_amount,
    );

  const requestAmount =
    numberValue(
      providerPayload.amount,
    );

  const invoiceTotal =
    numberValue(
      invoice.total_amount,
    );

  const invoicePaid =
    numberValue(
      invoice.amount_paid,
    );

  const localCurrency =
    upperCurrency(
      paymentRequest.currency ||
        invoice.currency,
    );

  const providerCurrency =
    upperCurrency(
      providerPayload.currency,
    );

  if (
    !Number.isFinite(
      expectedAmount,
    ) ||
    expectedAmount <= 0
  ) {
    return needsAttention({
      invoice,
      paymentRequest,
      providerStatus,
      reason:
        "The local payment request has an invalid requested amount.",
    });
  }

  if (
    !moneyMatches(
      requestAmount,
      expectedAmount,
    )
  ) {
    return needsAttention({
      invoice,
      paymentRequest,
      providerStatus,
      reason:
        `HitPay request amount ${requestAmount} does not match local requested amount ${expectedAmount}.`,
    });
  }

  if (
    !localCurrency ||
    !providerCurrency ||
    localCurrency !==
      providerCurrency
  ) {
    return needsAttention({
      invoice,
      paymentRequest,
      providerStatus,
      reason:
        `HitPay currency "${providerCurrency || "unknown"}" does not match local currency "${localCurrency || "unknown"}".`,
    });
  }

  const referenceNumber =
    text(
      providerPayload
        .reference_number,
    );

  if (
    referenceNumber !==
    invoice.invoice_number
  ) {
    return needsAttention({
      invoice,
      paymentRequest,
      providerStatus,
      reason:
        `HitPay reference "${referenceNumber || "blank"}" does not match invoice "${invoice.invoice_number}".`,
    });
  }

  const {
    payment,
    reason:
      paymentExtractReason,
  } = extractSuccessfulPayment(
    providerPayload,
    expectedAmount,
    localCurrency,
  );

  if (!payment) {
    return needsAttention({
      invoice,
      paymentRequest,
      providerStatus,
      reason:
        paymentExtractReason ||
        "A successful HitPay payment could not be safely identified.",
    });
  }

  const {
    data: existingPayment,
    error:
      existingPaymentError,
  } = await supabaseAdmin
    .from("gkp_billing_payments")
    .select(
      "id,invoice_id,amount,currency,status,provider_payment_id",
    )
    .eq("provider", "hitpay")
    .eq(
      "provider_payment_id",
      payment.id,
    )
    .maybeSingle();

  if (existingPaymentError) {
    throw existingPaymentError;
  }

  if (existingPayment) {
    const sameInvoice =
      String(
        existingPayment.invoice_id,
      ) === invoice.id;

    const sameAmount =
      moneyMatches(
        numberValue(
          existingPayment.amount,
        ),
        payment.amount,
      );

    const sameCurrency =
      upperCurrency(
        existingPayment.currency,
      ) === payment.currency;

    if (
      !sameInvoice ||
      !sameAmount ||
      !sameCurrency
    ) {
      return needsAttention({
        invoice,
        paymentRequest,
        providerStatus,
        providerPaymentId:
          payment.id,
        amount:
          payment.amount,
        reason:
          "This HitPay payment ID already exists locally but is linked to different financial data. Automatic reconciliation was stopped.",
      });
    }

    await finaliseCompletedRequest({
      paymentRequestId:
        paymentRequest.id,
      providerPayload,
      source:
        input.source,
    });

    await recalculateInvoice(
      invoice.id,
    );

    await recordAuditEvent({
      invoice,
      source:
        input.source,
      actorUserId:
        input.actorUserId,
      providerRequestId,
      providerPaymentId:
        payment.id,
      amount:
        payment.amount,
      currency:
        payment.currency,
      result:
        "already_reconciled",
    });

    return {
      ok: true,
      status:
        "already_reconciled",
      invoiceId:
        invoice.id,
      invoiceNumber:
        invoice.invoice_number,
      providerRequestId,
      providerPaymentId:
        payment.id,
      amount:
        payment.amount,
      currency:
        payment.currency,
      providerStatus,
    };
  }

  /*
   * Stale QR / overpayment protection:
   *
   * If other payments were recorded after this QR was created,
   * do not blindly add a full HitPay payment that would push
   * collections above the current invoice total.
   */
  if (
    Number.isFinite(
      invoiceTotal,
    ) &&
    Number.isFinite(
      invoicePaid,
    ) &&
    invoicePaid +
      payment.amount >
      invoiceTotal +
        MONEY_TOLERANCE
  ) {
    return needsAttention({
      invoice,
      paymentRequest,
      providerStatus,
      providerPaymentId:
        payment.id,
      amount:
        payment.amount,
      reason:
        `Recording this HitPay payment would exceed the invoice total. Current local paid amount is ${invoicePaid.toFixed(2)}, HitPay payment is ${payment.amount.toFixed(2)}, and invoice total is ${invoiceTotal.toFixed(2)}.`,
    });
  }

  const paymentInsert = {
    invoice_id:
      invoice.id,
    provider:
      "hitpay",
    provider_payment_id:
      payment.id,
    provider_reference:
      referenceNumber,
    payment_method:
      payment.paymentType ||
      paymentRequest.payment_method ||
      "paynow_online",
    status: "succeeded",
    amount:
      Number(
        payment.amount.toFixed(
          2,
        ),
      ),
    currency:
      payment.currency,
    paid_at:
      payment.paidAt,
    recorded_by:
      input.actorUserId ||
      null,
    raw_payload: {
      reconciliation_source:
        input.source,
      environment:
        input.environment,
      provider_request:
        providerPayload,
      provider_payment:
        payment.raw,
    },
  };

  const {
    error: insertError,
  } = await supabaseAdmin
    .from("gkp_billing_payments")
    .insert(paymentInsert);

  if (insertError) {
    /*
     * A concurrent webhook/admin reconciliation may have inserted
     * the same provider payment a few milliseconds earlier.
     *
     * The Phase 1 unique index turns that race into a safe 23505.
     */
    if (
      postgresCode(
        insertError,
      ) === "23505"
    ) {
      const {
        data: racedPayment,
        error:
          racedPaymentError,
      } = await supabaseAdmin
        .from(
          "gkp_billing_payments",
        )
        .select(
          "id,invoice_id,amount,currency",
        )
        .eq(
          "provider",
          "hitpay",
        )
        .eq(
          "provider_payment_id",
          payment.id,
        )
        .maybeSingle();

      if (
        racedPaymentError
      ) {
        throw racedPaymentError;
      }

      if (
        racedPayment &&
        String(
          racedPayment.invoice_id,
        ) === invoice.id &&
        moneyMatches(
          numberValue(
            racedPayment.amount,
          ),
          payment.amount,
        ) &&
        upperCurrency(
          racedPayment.currency,
        ) ===
          payment.currency
      ) {
        await finaliseCompletedRequest(
          {
            paymentRequestId:
              paymentRequest.id,
            providerPayload,
            source:
              input.source,
          },
        );

        await recalculateInvoice(
          invoice.id,
        );

        return {
          ok: true,
          status:
            "already_reconciled",
          invoiceId:
            invoice.id,
          invoiceNumber:
            invoice.invoice_number,
          providerRequestId,
          providerPaymentId:
            payment.id,
          amount:
            payment.amount,
          currency:
            payment.currency,
          providerStatus,
        };
      }
    }

    throw new Error(
      `Could not record the HitPay payment: ${readableError(
        insertError,
      )}`,
    );
  }

  await finaliseCompletedRequest({
    paymentRequestId:
      paymentRequest.id,
    providerPayload,
    source:
      input.source,
  });

  /*
   * A payment trigger may already call this function.
   * Calling it explicitly is intentional and idempotent:
   * it guarantees the invoice is refreshed even if the
   * trigger is ever disabled or changed.
   */
  await recalculateInvoice(
    invoice.id,
  );

  await recordAuditEvent({
    invoice,
    source:
      input.source,
    actorUserId:
      input.actorUserId,
    providerRequestId,
    providerPaymentId:
      payment.id,
    amount:
      payment.amount,
    currency:
      payment.currency,
    result:
      "reconciled",
  });

  return {
    ok: true,
    status: "reconciled",
    invoiceId:
      invoice.id,
    invoiceNumber:
      invoice.invoice_number,
    providerRequestId,
    providerPaymentId:
      payment.id,
    amount:
      payment.amount,
    currency:
      payment.currency,
    providerStatus,
  };
}
