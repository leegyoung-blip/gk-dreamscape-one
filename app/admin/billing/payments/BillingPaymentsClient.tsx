"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import BillingAdminShell from "../_components/BillingAdminShell";
import BillingModal from "../_components/BillingModal";
import type {
  BillingInvoiceOverview,
  BillingPaymentOverview,
  BillingRefund,
} from "../_lib/billingTypes";
import {
  errorMessage,
  formatCurrency,
  numberValue,
} from "../_lib/billingUtils";

type ManualPaymentForm = {
  invoice_id: string;
  amount: string;
  payment_method: string;
  paid_at: string;
  reference: string;
  notes: string;
};

type RefundForm = {
  amount: string;
  refunded_at: string;
  reason: string;
  provider_refund_id: string;
  external_refund_completed: boolean;
};

type ProviderEvent = {
  id: string;
  provider: string;
  environment: string;
  event_type: string;
  invoice_id: string | null;
  provider_request_id: string | null;
  provider_payment_id: string | null;
  processing_status: string;
  error_message: string | null;
  received_at: string;
};

const DEFAULT_MANUAL_PAYMENT: ManualPaymentForm = {
  invoice_id: "",
  amount: "",
  payment_method: "bank_transfer",
  paid_at: localDateTimeNow(),
  reference: "",
  notes: "",
};

const DEFAULT_REFUND: RefundForm = {
  amount: "",
  refunded_at: localDateTimeNow(),
  reason: "",
  provider_refund_id: "",
  external_refund_completed: false,
};

export default function BillingPaymentsClient() {
  const [payments, setPayments] = useState<BillingPaymentOverview[]>([]);
  const [refunds, setRefunds] = useState<BillingRefund[]>([]);
  const [openInvoices, setOpenInvoices] = useState<BillingInvoiceOverview[]>([]);
  const [reviewEvents, setReviewEvents] = useState<ProviderEvent[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);

  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");

  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualForm, setManualForm] =
    useState<ManualPaymentForm>(DEFAULT_MANUAL_PAYMENT);

  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundPayment, setRefundPayment] =
    useState<BillingPaymentOverview | null>(null);
  const [refundForm, setRefundForm] =
    useState<RefundForm>(DEFAULT_REFUND);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    const [
      paymentResult,
      refundResult,
      invoiceResult,
      requestResult,
      eventResult,
    ] = await Promise.all([
      supabase
        .from("gkp_billing_payment_admin_overview")
        .select("*")
        .order("paid_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("gkp_billing_refunds")
        .select("*")
        .order("refunded_at", { ascending: false }),
      supabase
        .from("gkp_billing_invoice_admin_overview")
        .select("*")
        .in("status", ["issued", "partially_paid", "overdue"])
        .gt("balance_due", 0)
        .order("due_date", { ascending: true }),
      supabase
        .from("gkp_billing_payment_requests")
        .select("id", { count: "exact", head: true })
        .eq("provider_status", "pending"),
      supabase
        .from("gkp_billing_provider_events")
        .select(
          "id,provider,environment,event_type,invoice_id,provider_request_id,provider_payment_id,processing_status,error_message,received_at",
        )
        .or("invoice_id.is.null,processing_status.neq.processed")
        .order("received_at", { ascending: false })
        .limit(20),
    ]);

    const firstError =
      paymentResult.error ||
      refundResult.error ||
      invoiceResult.error ||
      requestResult.error ||
      eventResult.error;

    if (firstError) {
      setLoadError(firstError.message);
      setLoading(false);
      return;
    }

    setPayments((paymentResult.data || []) as BillingPaymentOverview[]);
    setRefunds((refundResult.data || []) as BillingRefund[]);
    setOpenInvoices(
      (invoiceResult.data || []) as BillingInvoiceOverview[],
    );
    setPendingRequests(requestResult.count || 0);
    setReviewEvents((eventResult.data || []) as ProviderEvent[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payments.filter((payment) => {
      if (
        providerFilter !== "all" &&
        payment.provider !== providerFilter
      ) {
        return false;
      }

      if (
        statusFilter !== "all" &&
        payment.payment_status !== statusFilter
      ) {
        return false;
      }

      if (!query) return true;

      return [
        payment.invoice_number,
        payment.account_code,
        payment.payer_name,
        payment.billing_email,
        payment.student_names,
        payment.provider_reference,
        payment.provider_payment_id,
        payment.payment_method,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [payments, providerFilter, search, statusFilter]);

  const totalNetCollected = payments.reduce(
    (sum, payment) => sum + numberValue(payment.net_amount),
    0,
  );

  const hitpayNet = payments
    .filter((payment) => payment.provider === "hitpay")
    .reduce(
      (sum, payment) => sum + numberValue(payment.net_amount),
      0,
    );

  const manualNet = payments
    .filter((payment) => payment.provider === "manual")
    .reduce(
      (sum, payment) => sum + numberValue(payment.net_amount),
      0,
    );

  const totalRefunded = refunds.reduce(
    (sum, refund) => sum + numberValue(refund.amount),
    0,
  );

  const overpaidInvoiceCount = new Set(
    payments
      .filter((payment) => numberValue(payment.invoice_overpayment) > 0)
      .map((payment) => payment.invoice_id),
  ).size;

  function openManualPayment() {
    const first = openInvoices[0];
    setManualForm({
      ...DEFAULT_MANUAL_PAYMENT,
      invoice_id: first?.id || "",
      amount: first
        ? String(numberValue(first.balance_due).toFixed(2))
        : "",
      paid_at: localDateTimeNow(),
    });
    setLoadError("");
    setManualModalOpen(true);
  }

  function chooseManualInvoice(invoiceId: string) {
    const invoice = openInvoices.find((item) => item.id === invoiceId);

    setManualForm((current) => ({
      ...current,
      invoice_id: invoiceId,
      amount: invoice
        ? String(numberValue(invoice.balance_due).toFixed(2))
        : current.amount,
    }));
  }

  async function saveManualPayment() {
    if (!manualForm.invoice_id) {
      setLoadError("Select an invoice.");
      return;
    }

    const amount = Number(manualForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setLoadError("Enter a valid payment amount.");
      return;
    }

    setWorking(true);
    setLoadError("");
    setNotice("");

    const { error } = await supabase.rpc("gkp_record_manual_payment", {
      p_invoice_id: manualForm.invoice_id,
      p_amount: amount,
      p_payment_method: manualForm.payment_method,
      p_paid_at: new Date(manualForm.paid_at).toISOString(),
      p_reference: manualForm.reference.trim() || null,
      p_notes: manualForm.notes.trim() || null,
    });

    if (error) {
      setLoadError(error.message);
    } else {
      setNotice("Manual payment recorded and invoice balance recalculated.");
      setManualModalOpen(false);
      await loadPayments();
    }

    setWorking(false);
  }

  function openRefund(payment: BillingPaymentOverview) {
    const refundable = Math.max(
      numberValue(payment.gross_amount) -
        numberValue(payment.refund_total),
      0,
    );

    setRefundPayment(payment);
    setRefundForm({
      ...DEFAULT_REFUND,
      amount: refundable.toFixed(2),
      refunded_at: localDateTimeNow(),
      external_refund_completed: payment.provider !== "hitpay",
    });
    setLoadError("");
    setRefundModalOpen(true);
  }

  async function saveRefund() {
    if (!refundPayment) return;

    const amount = Number(refundForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setLoadError("Enter a valid refund amount.");
      return;
    }

    if (!refundForm.reason.trim()) {
      setLoadError("Enter a reason for the refund.");
      return;
    }

    if (
      refundPayment.provider === "hitpay" &&
      !refundForm.external_refund_completed
    ) {
      setLoadError(
        "Complete the actual refund in HitPay first, then tick the confirmation box.",
      );
      return;
    }

    setWorking(true);
    setLoadError("");
    setNotice("");

    const { error } = await supabase.rpc("gkp_record_refund", {
      p_payment_id: refundPayment.id,
      p_amount: amount,
      p_reason: refundForm.reason.trim(),
      p_refunded_at: new Date(refundForm.refunded_at).toISOString(),
      p_provider_refund_id:
        refundForm.provider_refund_id.trim() || null,
      p_external_refund_completed:
        refundForm.external_refund_completed,
    });

    if (error) {
      setLoadError(error.message);
    } else {
      setNotice(
        "Refund recorded. The invoice payment balance has been recalculated.",
      );
      setRefundModalOpen(false);
      await loadPayments();
    }

    setWorking(false);
  }

  return (
    <BillingAdminShell
      eyebrow="Billing administration"
      title="Payments"
      description="Reconcile HitPay and manual receipts, review exceptions, and record refunds without losing the invoice audit trail."
      actions={
        <>
          <button
            type="button"
            onClick={() => void loadPayments()}
            disabled={loading}
            className="min-h-11 rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold text-[#554d40]"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={openManualPayment}
            disabled={openInvoices.length === 0}
            className="min-h-11 rounded-full bg-[#15233b] px-5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Record manual payment
          </button>
        </>
      }
    >
      {loadError && <Alert tone="error">{loadError}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Net collected" value={formatCurrency(totalNetCollected)} detail="After recorded refunds" />
        <Metric label="HitPay" value={formatCurrency(hitpayNet)} detail="Net HitPay receipts" />
        <Metric label="Manual" value={formatCurrency(manualNet)} detail="Bank transfer, cash, static QR" />
        <Metric label="Refunded" value={formatCurrency(totalRefunded)} detail={`${refunds.length} refund record${refunds.length === 1 ? "" : "s"}`} />
        <Metric
          label="Needs attention"
          value={String(reviewEvents.length + overpaidInvoiceCount)}
          detail={`${pendingRequests} pending QR request${pendingRequests === 1 ? "" : "s"}`}
          danger={reviewEvents.length + overpaidInvoiceCount > 0}
        />
      </div>

      {(reviewEvents.length > 0 || overpaidInvoiceCount > 0) && (
        <section className="mt-6 rounded-[2rem] border border-amber-200 bg-amber-50 p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-800">
            Reconciliation warnings
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {overpaidInvoiceCount > 0 && (
              <WarningCard
                title={`${overpaidInvoiceCount} overpaid invoice${overpaidInvoiceCount === 1 ? "" : "s"}`}
                text="Review the related transaction before issuing a credit or refund."
              />
            )}
            {reviewEvents.slice(0, 4).map((event) => (
              <WarningCard
                key={event.id}
                title={`${event.provider.toUpperCase()} · ${event.event_type}`}
                text={
                  event.error_message ||
                  `Provider event received ${formatDateTime(event.received_at)} and needs review.`
                }
              />
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 rounded-[2rem] border border-[#ded5c4] bg-white shadow-[0_20px_60px_rgba(21,35,59,0.05)]">
        <div className="border-b border-[#ebe5da] p-5 sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_190px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search invoice, parent, student, reference…"
              className="min-h-11 rounded-2xl border border-[#d9cfbd] bg-[#fbfaf7] px-4 text-sm outline-none focus:border-[#b38a40]"
            />
            <select
              value={providerFilter}
              onChange={(event) => setProviderFilter(event.target.value)}
              className="min-h-11 rounded-2xl border border-[#d9cfbd] bg-[#fbfaf7] px-3 text-sm"
            >
              <option value="all">All providers</option>
              <option value="hitpay">HitPay</option>
              <option value="manual">Manual</option>
              <option value="shopify">Shopify</option>
              <option value="other">Other</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="min-h-11 rounded-2xl border border-[#d9cfbd] bg-[#fbfaf7] px-3 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="succeeded">Succeeded</option>
              <option value="partially_refunded">Partially refunded</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-[#81796d]">
            Loading payments…
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center">
            <h2 className="text-lg font-semibold">No matching payments</h2>
            <p className="mt-2 text-sm text-[#81796d]">
              HitPay receipts will appear automatically after validated webhooks.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#ebe5da] bg-[#fbfaf7] text-[10px] font-black uppercase tracking-[0.13em] text-[#8a8378]">
                  <th className="px-5 py-4">Payment</th>
                  <th className="px-4 py-4">Family / student</th>
                  <th className="px-4 py-4">Provider</th>
                  <th className="px-4 py-4">Gross</th>
                  <th className="px-4 py-4">Refunded</th>
                  <th className="px-4 py-4">Net</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => {
                  const refundable = Math.max(
                    numberValue(payment.gross_amount) -
                      numberValue(payment.refund_total),
                    0,
                  );

                  return (
                    <tr
                      key={payment.id}
                      className="border-b border-[#f0ece4] last:border-b-0"
                    >
                      <td className="px-5 py-4 align-top">
                        <Link
                          href={`/admin/billing/invoices/${payment.invoice_id}/preview`}
                          className="font-black text-[#15233b] underline decoration-[#d3b775] underline-offset-4"
                        >
                          {payment.invoice_number}
                        </Link>
                        <span className="mt-1 block text-xs text-[#8a8378]">
                          {formatDateTime(payment.paid_at || payment.created_at)}
                        </span>
                        {payment.provider_reference && (
                          <span className="mt-1 block max-w-[220px] truncate text-[11px] text-[#9a9287]">
                            Ref: {payment.provider_reference}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <strong className="block text-sm">{payment.payer_name}</strong>
                        <span className="mt-1 block text-xs text-[#8a8378]">
                          {payment.student_names || "No student line"}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span className="font-bold capitalize">{payment.provider}</span>
                        <span className="mt-1 block text-xs text-[#8a8378]">
                          {paymentMethodLabel(payment.payment_method)}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top font-bold">
                        {formatCurrency(numberValue(payment.gross_amount), payment.currency)}
                      </td>
                      <td className="px-4 py-4 align-top">
                        {formatCurrency(numberValue(payment.refund_total), payment.currency)}
                      </td>
                      <td className="px-4 py-4 align-top font-black text-[#15233b]">
                        {formatCurrency(numberValue(payment.net_amount), payment.currency)}
                        {numberValue(payment.invoice_overpayment) > 0 && (
                          <span className="mt-1 block text-[10px] font-black uppercase text-amber-700">
                            Overpaid {formatCurrency(numberValue(payment.invoice_overpayment), payment.currency)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <StatusPill status={payment.payment_status} />
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/billing/invoices/${payment.invoice_id}/preview`}
                            className="inline-flex min-h-9 items-center rounded-full border border-[#d7c9ae] bg-white px-3 text-[11px] font-bold"
                          >
                            Open invoice
                          </Link>
                          {refundable > 0 &&
                            ["succeeded", "partially_refunded"].includes(
                              payment.payment_status,
                            ) && (
                              <button
                                type="button"
                                onClick={() => openRefund(payment)}
                                className="min-h-9 rounded-full border border-red-200 bg-red-50 px-3 text-[11px] font-bold text-red-700"
                              >
                                Record refund
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <BillingModal
        open={manualModalOpen}
        title="Record manual payment"
        description="Use this only after Guru Kids Pro has actually received the money."
        onClose={() => !working && setManualModalOpen(false)}
      >
        <div className="grid gap-4">
          <Field label="Invoice">
            <select
              value={manualForm.invoice_id}
              onChange={(event) => chooseManualInvoice(event.target.value)}
              className={inputClass}
            >
              <option value="">Select invoice</option>
              {openInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoice_number} · {invoice.payer_name} · {formatCurrency(numberValue(invoice.balance_due), invoice.currency)}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount received">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={manualForm.amount}
                onChange={(event) =>
                  setManualForm((current) => ({
                    ...current,
                    amount: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="Payment date & time">
              <input
                type="datetime-local"
                value={manualForm.paid_at}
                onChange={(event) =>
                  setManualForm((current) => ({
                    ...current,
                    paid_at: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Payment method">
            <select
              value={manualForm.payment_method}
              onChange={(event) =>
                setManualForm((current) => ({
                  ...current,
                  payment_method: event.target.value,
                }))
              }
              className={inputClass}
            >
              <option value="bank_transfer">Bank transfer</option>
              <option value="paynow_static">Static PayNow QR</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </Field>

          <Field label="Reference (optional)">
            <input
              value={manualForm.reference}
              onChange={(event) =>
                setManualForm((current) => ({
                  ...current,
                  reference: event.target.value,
                }))
              }
              placeholder="Bank reference / cheque number"
              className={inputClass}
            />
          </Field>

          <Field label="Internal notes (optional)">
            <textarea
              value={manualForm.notes}
              onChange={(event) =>
                setManualForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              rows={3}
              className={inputClass}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setManualModalOpen(false)}
              disabled={working}
              className="min-h-11 rounded-full border border-[#d7c9ae] bg-white px-5 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void saveManualPayment()}
              disabled={working}
              className="min-h-11 rounded-full bg-[#15233b] px-5 text-xs font-bold text-white"
            >
              {working ? "Saving…" : "Record payment"}
            </button>
          </div>
        </div>
      </BillingModal>

      <BillingModal
        open={refundModalOpen}
        title="Record refund"
        description={
          refundPayment?.provider === "hitpay"
            ? "Complete the actual refund in HitPay first. This form records it in GKP billing and recalculates the invoice."
            : "Record money that has actually been returned to the payer."
        }
        onClose={() => !working && setRefundModalOpen(false)}
      >
        {refundPayment && (
          <div className="grid gap-4">
            <div className="rounded-2xl border border-[#ded5c4] bg-[#fbfaf7] p-4 text-sm">
              <strong>{refundPayment.invoice_number}</strong>
              <span className="mt-1 block text-[#81796d]">
                {refundPayment.payer_name} · Gross{" "}
                {formatCurrency(numberValue(refundPayment.gross_amount), refundPayment.currency)}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Refund amount">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={refundForm.amount}
                  onChange={(event) =>
                    setRefundForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Refund date & time">
                <input
                  type="datetime-local"
                  value={refundForm.refunded_at}
                  onChange={(event) =>
                    setRefundForm((current) => ({
                      ...current,
                      refunded_at: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Reason">
              <textarea
                value={refundForm.reason}
                onChange={(event) =>
                  setRefundForm((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
                rows={3}
                placeholder="e.g. Duplicate payment"
                className={inputClass}
              />
            </Field>

            <Field label="Provider refund reference (optional)">
              <input
                value={refundForm.provider_refund_id}
                onChange={(event) =>
                  setRefundForm((current) => ({
                    ...current,
                    provider_refund_id: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </Field>

            {refundPayment.provider === "hitpay" && (
              <label className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                <input
                  type="checkbox"
                  checked={refundForm.external_refund_completed}
                  onChange={(event) =>
                    setRefundForm((current) => ({
                      ...current,
                      external_refund_completed: event.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4"
                />
                <span>
                  I confirm the actual refund has already been completed in HitPay.
                </span>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRefundModalOpen(false)}
                disabled={working}
                className="min-h-11 rounded-full border border-[#d7c9ae] bg-white px-5 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveRefund()}
                disabled={working}
                className="min-h-11 rounded-full bg-red-600 px-5 text-xs font-bold text-white"
              >
                {working ? "Saving…" : "Record refund"}
              </button>
            </div>
          </div>
        )}
      </BillingModal>
    </BillingAdminShell>
  );
}

function Metric({
  label,
  value,
  detail,
  danger = false,
}: {
  label: string;
  value: string;
  detail: string;
  danger?: boolean;
}) {
  return (
    <article
      className={`rounded-[1.7rem] border bg-white p-5 shadow-[0_18px_50px_rgba(21,35,59,0.04)] ${
        danger ? "border-amber-300" : "border-[#ded5c4]"
      }`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">
        {label}
      </p>
      <strong className="mt-3 block text-2xl">{value}</strong>
      <p className="mt-2 text-xs text-[#8a8378]">{detail}</p>
    </article>
  );
}

function WarningCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-white/70 p-4">
      <strong className="text-sm text-amber-950">{title}</strong>
      <p className="mt-1 text-xs leading-5 text-amber-900/75">{text}</p>
    </div>
  );
}

function StatusPill({
  status,
}: {
  status: BillingPaymentOverview["payment_status"];
}) {
  const classes =
    status === "succeeded"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "refunded"
        ? "border-slate-200 bg-slate-100 text-slate-600"
        : status === "partially_refunded"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : status === "failed"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-sky-200 bg-sky-50 text-sky-700";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.07em] ${classes}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

function Alert({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`mb-5 rounded-2xl border p-4 text-sm ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-[#766d5f]">
        {label}
      </span>
      {children}
    </label>
  );
}

function paymentMethodLabel(value: string | null) {
  if (!value) return "—";
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value: string | null) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function localDateTimeNow() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

const inputClass =
  "min-h-11 w-full rounded-2xl border border-[#d9cfbd] bg-[#fbfaf7] px-4 py-3 text-sm text-[#15233b] outline-none focus:border-[#b38a40]";
