"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import BillingAdminShell from "../_components/BillingAdminShell";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  account_code?: string | null;
  payer_name?: string | null;
  status: string;
  invoice_kind?: string | null;
  billing_period?: string | null;
  invoice_date?: string | null;
  issued_at?: string | null;
  due_date?: string | null;
  currency?: string | null;
  total_amount?: number | string | null;
  amount_paid?: number | string | null;
  balance_due?: number | string | null;
  created_at?: string | null;
};

type PaymentRow = {
  id: string;
  invoice_id: string;
  invoice_number?: string | null;
  account_code?: string | null;
  payer_name?: string | null;
  student_names?: string | null;
  provider?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  gross_amount?: number | string | null;
  refund_total?: number | string | null;
  net_amount?: number | string | null;
  currency?: string | null;
  provider_reference?: string | null;
  provider_payment_id?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
};

type RefundRow = {
  id: string;
  payment_id: string;
  amount: number | string;
  refunded_at: string | null;
  reason?: string | null;
  provider_refund_id?: string | null;
  created_at?: string | null;
};

type CategorySummary = {
  category_code: string;
  category_label: string;
  accounting_class: "revenue" | "contra_revenue" | "liability" | string;
  gross_amount: number | string;
  reductions: number | string;
  classified_amount: number | string;
  line_count: number | string;
};

type ProgrammeRevenue = {
  programme_code: string;
  programme_name: string;
  invoice_count: number | string;
  student_count: number | string;
  gross_amount: number | string;
  discounts: number | string;
  net_amount: number | string;
};

type ReceivableRow = {
  invoice_id: string;
  invoice_number: string;
  account_code: string;
  payer_name: string;
  billing_period: string | null;
  invoice_date: string;
  due_date: string;
  currency: string;
  invoice_total: number | string;
  net_paid_as_of: number | string;
  outstanding_as_of: number | string;
  days_overdue: number | string;
  ageing_bucket: "current" | "1_30" | "31_60" | "61_90" | "90_plus";
};

type DepositSummary = {
  deposits_invoiced: number | string;
  deposits_on_fully_settled_invoices: number | string;
  deposits_on_part_paid_invoices: number | string;
  deposits_on_unpaid_invoices: number | string;
  deposit_invoice_count: number | string;
};

type DreamscapeSummary = {
  gkp_addon_billed: number | string;
  gkp_addon_line_count: number | string;
  public_gross_collected: number | string;
  public_refunds: number | string;
  public_net_collected: number | string;
};

type LedgerRow = {
  id: string;
  date: string;
  type: "invoice" | "payment" | "refund";
  invoiceId: string | null;
  invoiceNumber: string;
  payer: string;
  students: string;
  description: string;
  provider: string;
  debit: number;
  credit: number;
  refund: number;
  currency: string;
  status: string;
  reference: string;
};

type PeriodOption = {
  value: string;
  label: string;
};

const ISSUE_STATUSES = new Set([
  "issued",
  "partially_paid",
  "paid",
  "overdue",
]);

const AGEING_LABELS: Record<ReceivableRow["ageing_bucket"], string> = {
  current: "Current",
  "1_30": "1–30 days",
  "31_60": "31–60 days",
  "61_90": "61–90 days",
  "90_plus": "90+ days",
};

export default function AccountingPage() {
  const [period, setPeriod] = useState(currentMonthValue());

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [refunds, setRefunds] = useState<RefundRow[]>([]);

  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [programmeRevenue, setProgrammeRevenue] =
    useState<ProgrammeRevenue[]>([]);
  const [receivables, setReceivables] = useState<ReceivableRow[]>([]);
  const [depositSummary, setDepositSummary] =
    useState<DepositSummary | null>(null);
  const [dreamscapeSummary, setDreamscapeSummary] =
    useState<DreamscapeSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [ledgerType, setLedgerType] = useState("all");

  const loadAccounting = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    const monthDate = `${period}-01`;
    const asOfDate = monthEndDate(period);

    const [
      invoiceResult,
      paymentResult,
      refundResult,
      categoryResult,
      programmeResult,
      receivableResult,
      depositResult,
      dreamscapeResult,
    ] = await Promise.all([
      supabase
        .from("gkp_billing_invoice_admin_overview")
        .select("*")
        .order("billing_period", { ascending: false })
        .order("created_at", { ascending: false }),

      supabase
        .from("gkp_billing_payment_admin_overview")
        .select("*")
        .order("paid_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),

      supabase
        .from("gkp_billing_refunds")
        .select("*")
        .order("refunded_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),

      supabase.rpc("gkp_get_accounting_category_summary", {
        p_month: monthDate,
      }),

      supabase.rpc("gkp_get_accounting_programme_revenue", {
        p_month: monthDate,
      }),

      supabase.rpc("gkp_get_accounting_receivables", {
        p_as_of: asOfDate,
      }),

      supabase.rpc("gkp_get_accounting_deposit_summary", {
        p_as_of: asOfDate,
      }),

      supabase.rpc("gkp_get_accounting_dreamscape_summary", {
        p_month: monthDate,
      }),
    ]);

    const firstError =
      invoiceResult.error ||
      paymentResult.error ||
      refundResult.error ||
      categoryResult.error ||
      programmeResult.error ||
      receivableResult.error ||
      depositResult.error ||
      dreamscapeResult.error;

    if (firstError) {
      setLoadError(firstError.message);
      setLoading(false);
      return;
    }

    setInvoices((invoiceResult.data || []) as InvoiceRow[]);
    setPayments((paymentResult.data || []) as PaymentRow[]);
    setRefunds((refundResult.data || []) as RefundRow[]);
    setCategories((categoryResult.data || []) as CategorySummary[]);
    setProgrammeRevenue(
      (programmeResult.data || []) as ProgrammeRevenue[],
    );
    setReceivables((receivableResult.data || []) as ReceivableRow[]);

    const depositRows = (depositResult.data || []) as DepositSummary[];
    setDepositSummary(depositRows[0] || null);

    const dreamscapeRows =
      (dreamscapeResult.data || []) as DreamscapeSummary[];
    setDreamscapeSummary(dreamscapeRows[0] || null);

    setLoading(false);
  }, [period]);

  useEffect(() => {
    void loadAccounting();
  }, [loadAccounting]);

  const periodOptions = useMemo(
    () => buildPeriodOptions(invoices, payments, refunds),
    [invoices, payments, refunds],
  );

  const periodInvoices = useMemo(
    () =>
      invoices.filter((invoice) => invoicePeriodValue(invoice) === period),
    [invoices, period],
  );

  const periodPayments = useMemo(
    () =>
      payments.filter(
        (payment) =>
          monthValue(payment.paid_at || payment.created_at) === period,
      ),
    [payments, period],
  );

  const periodRefunds = useMemo(
    () =>
      refunds.filter(
        (refund) =>
          monthValue(refund.refunded_at || refund.created_at) === period,
      ),
    [refunds, period],
  );

  const grossInvoiced = periodInvoices
    .filter((invoice) => ISSUE_STATUSES.has(normalise(invoice.status)))
    .reduce((sum, invoice) => sum + numberValue(invoice.total_amount), 0);

  const netCollected = periodPayments
    .filter((payment) =>
      ["succeeded", "partially_refunded", "refunded"].includes(
        normalise(payment.payment_status),
      ),
    )
    .reduce((sum, payment) => sum + numberValue(payment.net_amount), 0);

  const refunded = periodRefunds.reduce(
    (sum, refund) => sum + numberValue(refund.amount),
    0,
  );

  const revenueCategories = categories.filter(
    (row) => row.accounting_class === "revenue",
  );

  const contraCategories = categories.filter(
    (row) => row.accounting_class === "contra_revenue",
  );

  const liabilityCategories = categories.filter(
    (row) => row.accounting_class === "liability",
  );

  const classifiedRevenue = revenueCategories.reduce(
    (sum, row) => sum + numberValue(row.classified_amount),
    0,
  );

  const contraRevenue = contraCategories.reduce(
    (sum, row) => sum + Math.abs(numberValue(row.classified_amount)),
    0,
  );

  const netClassifiedRevenue = classifiedRevenue - contraRevenue;

  const depositLiabilityBilled = liabilityCategories.reduce(
    (sum, row) => sum + numberValue(row.classified_amount),
    0,
  );

  const receivablesTotal = receivables.reduce(
    (sum, row) => sum + numberValue(row.outstanding_as_of),
    0,
  );

  const ageingSummary = useMemo(() => {
    const buckets: Record<ReceivableRow["ageing_bucket"], number> = {
      current: 0,
      "1_30": 0,
      "31_60": 0,
      "61_90": 0,
      "90_plus": 0,
    };

    for (const row of receivables) {
      buckets[row.ageing_bucket] += numberValue(row.outstanding_as_of);
    }

    return buckets;
  }, [receivables]);

  const paymentByProvider = useMemo(() => {
    const map = new Map<string, number>();

    for (const payment of periodPayments) {
      if (
        !["succeeded", "partially_refunded", "refunded"].includes(
          normalise(payment.payment_status),
        )
      ) {
        continue;
      }

      const provider = normalise(payment.provider) || "other";

      map.set(
        provider,
        (map.get(provider) || 0) + numberValue(payment.net_amount),
      );
    }

    return Array.from(map.entries())
      .map(([provider, amount]) => ({ provider, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [periodPayments]);

  const ledger = useMemo(() => {
    const paymentMap = new Map(
      payments.map((payment) => [payment.id, payment]),
    );

    const rows: LedgerRow[] = [];

    for (const invoice of periodInvoices) {
      if (!ISSUE_STATUSES.has(normalise(invoice.status))) continue;

      rows.push({
        id: `invoice:${invoice.id}`,
        date:
          invoice.invoice_date ||
          invoice.issued_at ||
          invoice.billing_period ||
          invoice.created_at ||
          "",
        type: "invoice",
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number || "—",
        payer: invoice.payer_name || invoice.account_code || "—",
        students: "",
        description:
          normalise(invoice.invoice_kind) === "monthly"
            ? "Monthly invoice issued"
            : `${titleCase(invoice.invoice_kind || "Invoice")} issued`,
        provider: "—",
        debit: numberValue(invoice.total_amount),
        credit: 0,
        refund: 0,
        currency: (invoice.currency || "SGD").toUpperCase(),
        status: invoice.status || "—",
        reference: "",
      });
    }

    for (const payment of periodPayments) {
      rows.push({
        id: `payment:${payment.id}`,
        date: payment.paid_at || payment.created_at || "",
        type: "payment",
        invoiceId: payment.invoice_id || null,
        invoiceNumber: payment.invoice_number || "—",
        payer: payment.payer_name || payment.account_code || "—",
        students: payment.student_names || "",
        description: `${titleCase(
          payment.payment_method || "Payment",
        )} received`,
        provider: titleCase(payment.provider || "Other"),
        debit: 0,
        credit: numberValue(payment.gross_amount),
        refund: 0,
        currency: (payment.currency || "SGD").toUpperCase(),
        status: payment.payment_status || "—",
        reference:
          payment.provider_reference ||
          payment.provider_payment_id ||
          "",
      });
    }

    for (const refund of periodRefunds) {
      const payment = paymentMap.get(refund.payment_id);

      rows.push({
        id: `refund:${refund.id}`,
        date: refund.refunded_at || refund.created_at || "",
        type: "refund",
        invoiceId: payment?.invoice_id || null,
        invoiceNumber: payment?.invoice_number || "—",
        payer: payment?.payer_name || payment?.account_code || "—",
        students: payment?.student_names || "",
        description: refund.reason
          ? `Refund · ${refund.reason}`
          : "Refund recorded",
        provider: titleCase(payment?.provider || "Other"),
        debit: 0,
        credit: 0,
        refund: numberValue(refund.amount),
        currency: (payment?.currency || "SGD").toUpperCase(),
        status: "refunded",
        reference:
          refund.provider_refund_id ||
          payment?.provider_reference ||
          "",
      });
    }

    return rows.sort((a, b) => dateValue(b.date) - dateValue(a.date));
  }, [payments, periodInvoices, periodPayments, periodRefunds]);

  const filteredLedger = useMemo(() => {
    const query = search.trim().toLowerCase();

    return ledger.filter((row) => {
      if (ledgerType !== "all" && row.type !== ledgerType) {
        return false;
      }

      if (!query) return true;

      return [
        row.invoiceNumber,
        row.payer,
        row.students,
        row.description,
        row.provider,
        row.reference,
        row.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [ledger, ledgerType, search]);

  return (
    <BillingAdminShell
      eyebrow="Financial reporting"
      title="Accounting"
      description="Classify revenue and liabilities, review programme performance, reconstruct month-end receivables, and reconcile cash movement from the existing GKP billing records."
      actions={
        <>
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="min-h-11 rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold text-[#554d40]"
            aria-label="Accounting period"
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void loadAccounting()}
            disabled={loading}
            className="min-h-11 rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold text-[#554d40] disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </>
      }
    >
      {loadError && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {loadError}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Gross invoiced"
          value={formatCurrency(grossInvoiced)}
          detail={`Issued invoice value for ${periodLabel(period)}`}
        />
        <Metric
          label="Classified net revenue"
          value={formatCurrency(netClassifiedRevenue)}
          detail="Revenue lines less discounts and credits; deposits excluded"
        />
        <Metric
          label="Net cash collected"
          value={formatCurrency(netCollected)}
          detail="Successful GKP receipts after recorded refunds"
        />
        <Metric
          label="Receivables at month-end"
          value={formatCurrency(receivablesTotal)}
          detail={`Reconstructed as at ${formatDate(monthEndDate(period))}`}
          danger={receivablesTotal > 0}
        />
      </section>

      <section className="mt-6 rounded-[2rem] border border-[#ded5c4] bg-white shadow-[0_20px_60px_rgba(21,35,59,0.05)]">
        <div className="border-b border-[#ebe5da] p-5 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">
            Revenue classification
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#15233b]">
            Revenue & liability breakdown
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[#81796d]">
            Invoice lines are classified from the existing item type and
            metadata. Refundable deposits are kept outside revenue.
          </p>
        </div>

        {categories.length === 0 ? (
          <div className="p-8 text-sm text-[#81796d]">
            No issued accounting lines for this billing period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#ebe5da] bg-[#fbfaf7] text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">
                  <th className="px-5 py-4">Category</th>
                  <th className="px-4 py-4">Class</th>
                  <th className="px-4 py-4">Gross</th>
                  <th className="px-4 py-4">Reductions</th>
                  <th className="px-4 py-4">Classified amount</th>
                  <th className="px-5 py-4">Lines</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((row) => (
                  <tr
                    key={row.category_code}
                    className="border-b border-[#f0ece4] last:border-b-0"
                  >
                    <td className="px-5 py-4">
                      <strong className="text-sm text-[#15233b]">
                        {row.category_label}
                      </strong>
                    </td>
                    <td className="px-4 py-4">
                      <AccountingClassPill value={row.accounting_class} />
                    </td>
                    <td className="px-4 py-4 font-bold">
                      {formatCurrency(numberValue(row.gross_amount))}
                    </td>
                    <td className="px-4 py-4 font-bold text-amber-700">
                      {numberValue(row.reductions) > 0
                        ? formatCurrency(numberValue(row.reductions))
                        : "—"}
                    </td>
                    <td
                      className={`px-4 py-4 font-black ${
                        row.accounting_class === "contra_revenue"
                          ? "text-red-700"
                          : "text-[#15233b]"
                      }`}
                    >
                      {formatCurrency(numberValue(row.classified_amount))}
                    </td>
                    <td className="px-5 py-4 text-sm text-[#81796d]">
                      {numberValue(row.line_count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid gap-3 border-t border-[#ebe5da] p-5 sm:grid-cols-3 sm:p-6">
          <MiniMetric
            label="Revenue before contra items"
            value={formatCurrency(classifiedRevenue)}
          />
          <MiniMetric
            label="Discounts / credits"
            value={formatCurrency(contraRevenue)}
          />
          <MiniMetric
            label="Refundable deposits billed"
            value={formatCurrency(depositLiabilityBilled)}
          />
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <section className="rounded-[2rem] border border-[#ded5c4] bg-white shadow-[0_20px_60px_rgba(21,35,59,0.05)]">
          <div className="border-b border-[#ebe5da] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">
              Tuition
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#15233b]">
              Programme revenue
            </h2>
          </div>

          {programmeRevenue.length === 0 ? (
            <div className="p-8 text-sm text-[#81796d]">
              No issued programme-fee lines for this period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#ebe5da] bg-[#fbfaf7] text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">
                    <th className="px-5 py-4">Programme</th>
                    <th className="px-4 py-4">Students</th>
                    <th className="px-4 py-4">Gross</th>
                    <th className="px-4 py-4">Discounts</th>
                    <th className="px-5 py-4">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {programmeRevenue.map((row) => (
                    <tr
                      key={`${row.programme_code}:${row.programme_name}`}
                      className="border-b border-[#f0ece4] last:border-b-0"
                    >
                      <td className="px-5 py-4">
                        <strong className="block text-sm">
                          {row.programme_name}
                        </strong>
                        <span className="mt-1 block text-[11px] text-[#8a8378]">
                          {row.programme_code}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {numberValue(row.student_count)}
                      </td>
                      <td className="px-4 py-4 font-bold">
                        {formatCurrency(numberValue(row.gross_amount))}
                      </td>
                      <td className="px-4 py-4 font-bold text-amber-700">
                        {formatCurrency(numberValue(row.discounts))}
                      </td>
                      <td className="px-5 py-4 font-black text-[#15233b]">
                        {formatCurrency(numberValue(row.net_amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-[#ded5c4] bg-white p-5 shadow-[0_20px_60px_rgba(21,35,59,0.05)] sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">
            Dreamscape
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#15233b]">
            Dreamscape reporting
          </h2>

          <div className="mt-5 grid gap-3">
            <DetailLine
              label="GKP add-ons billed"
              value={formatCurrency(
                numberValue(dreamscapeSummary?.gkp_addon_billed),
              )}
            />
            <DetailLine
              label="GKP add-on lines"
              value={String(
                numberValue(dreamscapeSummary?.gkp_addon_line_count),
              )}
            />
            <DetailLine
              label="Public subscriptions collected"
              value={formatCurrency(
                numberValue(dreamscapeSummary?.public_gross_collected),
              )}
            />
            <DetailLine
              label="Public Dreamscape refunds"
              value={formatCurrency(
                numberValue(dreamscapeSummary?.public_refunds),
              )}
            />
            <DetailLine
              label="Public Dreamscape net cash"
              value={formatCurrency(
                numberValue(dreamscapeSummary?.public_net_collected),
              )}
              strong
            />
          </div>

          <p className="mt-4 text-[11px] leading-5 text-[#81796d]">
            GKP add-ons are shown on a service-period billed basis. Public
            Dreamscape is shown on a cash-collected basis because it is charged
            directly through HitPay recurring subscriptions.
          </p>
        </section>
      </div>

      <section className="mt-6 rounded-[2rem] border border-[#ded5c4] bg-white shadow-[0_20px_60px_rgba(21,35,59,0.05)]">
        <div className="border-b border-[#ebe5da] p-5 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">
            Accounts receivable
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#15233b]">
            Receivables ageing as at {formatDate(monthEndDate(period))}
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#81796d]">
            Historical balance is reconstructed from invoice totals, payments
            and refunds recorded up to the selected month-end.
          </p>
        </div>

        <div className="grid gap-3 border-b border-[#ebe5da] p-5 sm:grid-cols-2 xl:grid-cols-5 sm:p-6">
          {(Object.keys(AGEING_LABELS) as ReceivableRow["ageing_bucket"][]).map(
            (bucket) => (
              <MiniMetric
                key={bucket}
                label={AGEING_LABELS[bucket]}
                value={formatCurrency(ageingSummary[bucket])}
                danger={bucket !== "current" && ageingSummary[bucket] > 0}
              />
            ),
          )}
        </div>

        {receivables.length === 0 ? (
          <div className="p-8 text-sm text-[#81796d]">
            No outstanding receivables at this month-end.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#ebe5da] bg-[#fbfaf7] text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">
                  <th className="px-5 py-4">Invoice</th>
                  <th className="px-4 py-4">Parent</th>
                  <th className="px-4 py-4">Due</th>
                  <th className="px-4 py-4">Invoice total</th>
                  <th className="px-4 py-4">Paid as at</th>
                  <th className="px-4 py-4">Outstanding</th>
                  <th className="px-5 py-4">Ageing</th>
                </tr>
              </thead>
              <tbody>
                {receivables.map((row) => (
                  <tr
                    key={row.invoice_id}
                    className="border-b border-[#f0ece4] last:border-b-0"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/billing/invoices/${row.invoice_id}/preview`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-black text-[#15233b] underline decoration-[#d3b775] underline-offset-4"
                      >
                        {row.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <strong className="block text-sm">{row.payer_name}</strong>
                      <span className="mt-1 block text-[11px] text-[#8a8378]">
                        {row.account_code}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-[#81796d]">
                      {formatDate(row.due_date)}
                    </td>
                    <td className="px-4 py-4 font-bold">
                      {formatCurrency(
                        numberValue(row.invoice_total),
                        row.currency,
                      )}
                    </td>
                    <td className="px-4 py-4 font-bold text-emerald-700">
                      {formatCurrency(
                        numberValue(row.net_paid_as_of),
                        row.currency,
                      )}
                    </td>
                    <td className="px-4 py-4 font-black text-[#15233b]">
                      {formatCurrency(
                        numberValue(row.outstanding_as_of),
                        row.currency,
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-bold">
                        {AGEING_LABELS[row.ageing_bucket]}
                      </span>
                      {numberValue(row.days_overdue) > 0 && (
                        <span className="mt-1 block text-[10px] text-amber-700">
                          {numberValue(row.days_overdue)} days overdue
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="rounded-[2rem] border border-[#ded5c4] bg-white shadow-[0_20px_60px_rgba(21,35,59,0.05)]">
          <div className="border-b border-[#ebe5da] p-5 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">
              Collections
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#15233b]">
              Collection mix
            </h2>
          </div>

          {paymentByProvider.length === 0 ? (
            <div className="p-8 text-sm text-[#81796d]">
              No successful payments recorded for this period.
            </div>
          ) : (
            <div className="grid gap-3 p-5 sm:p-6">
              {paymentByProvider.map((item) => {
                const percent =
                  netCollected > 0
                    ? Math.min((item.amount / netCollected) * 100, 100)
                    : 0;

                return (
                  <div
                    key={item.provider}
                    className="rounded-2xl border border-[#ebe5da] bg-[#fbfaf7] p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <strong className="text-sm capitalize text-[#15233b]">
                        {item.provider.replaceAll("_", " ")}
                      </strong>
                      <strong className="text-sm text-[#15233b]">
                        {formatCurrency(item.amount)}
                      </strong>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e9e2d6]">
                      <div
                        className="h-full rounded-full bg-[#15233b]"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-[#8a8378]">
                      {percent.toFixed(1)}% of net collections
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-[2rem] border border-[#ded5c4] bg-white p-5 shadow-[0_20px_60px_rgba(21,35,59,0.05)] sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">
            Refundable deposits
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#15233b]">
            Deposit tracking
          </h2>

          <div className="mt-5 grid gap-3">
            <DetailLine
              label="Deposits invoiced to date"
              value={formatCurrency(
                numberValue(depositSummary?.deposits_invoiced),
              )}
            />
            <DetailLine
              label="On fully settled invoices"
              value={formatCurrency(
                numberValue(
                  depositSummary?.deposits_on_fully_settled_invoices,
                ),
              )}
              strong
            />
            <DetailLine
              label="On part-paid invoices"
              value={formatCurrency(
                numberValue(
                  depositSummary?.deposits_on_part_paid_invoices,
                ),
              )}
            />
            <DetailLine
              label="On unpaid invoices"
              value={formatCurrency(
                numberValue(
                  depositSummary?.deposits_on_unpaid_invoices,
                ),
              )}
            />
          </div>

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[11px] leading-5 text-amber-900">
            Deposits are correctly classified as liabilities rather than
            revenue. Exact outstanding deposit liability after a specific
            deposit return cannot yet be inferred from a generic invoice-level
            refund. Deposit-return tagging will be added with the accounting
            export/close workflow.
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-[2rem] border border-[#ded5c4] bg-white shadow-[0_20px_60px_rgba(21,35,59,0.05)]">
        <div className="border-b border-[#ebe5da] p-5 sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search invoice, parent, student, reference…"
              className="min-h-11 rounded-2xl border border-[#d9cfbd] bg-[#fbfaf7] px-4 text-sm outline-none focus:border-[#b38a40]"
            />
            <select
              value={ledgerType}
              onChange={(event) => setLedgerType(event.target.value)}
              className="min-h-11 rounded-2xl border border-[#d9cfbd] bg-[#fbfaf7] px-3 text-sm"
            >
              <option value="all">All ledger entries</option>
              <option value="invoice">Invoices</option>
              <option value="payment">Payments</option>
              <option value="refund">Refunds</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-b border-[#ebe5da] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#8a8378]">
              Transaction ledger
            </p>
            <p className="mt-1 text-xs text-[#81796d]">
              Invoice debits, receipts and refunds for {periodLabel(period)}.
            </p>
          </div>
          <span className="text-xs font-bold text-[#81796d]">
            {filteredLedger.length} entr
            {filteredLedger.length === 1 ? "y" : "ies"}
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-[#81796d]">
            Loading accounting records…
          </div>
        ) : filteredLedger.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#81796d]">
            No ledger entries match this period and filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1220px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#ebe5da] bg-[#fbfaf7] text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">
                  <th className="px-5 py-4">Date</th>
                  <th className="px-4 py-4">Type</th>
                  <th className="px-4 py-4">Invoice</th>
                  <th className="px-4 py-4">Family / student</th>
                  <th className="px-4 py-4">Description</th>
                  <th className="px-4 py-4">Debit</th>
                  <th className="px-4 py-4">Payment</th>
                  <th className="px-4 py-4">Refund</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-5 py-4">Reference</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#f0ece4] last:border-b-0"
                  >
                    <td className="px-5 py-4 align-top text-xs text-[#81796d]">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <TypePill type={row.type} />
                    </td>
                    <td className="px-4 py-4 align-top">
                      {row.invoiceId ? (
                        <Link
                          href={`/admin/billing/invoices/${row.invoiceId}/preview`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-black text-[#15233b] underline decoration-[#d3b775] underline-offset-4"
                        >
                          {row.invoiceNumber}
                        </Link>
                      ) : (
                        <strong>{row.invoiceNumber}</strong>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <strong className="block text-sm">{row.payer}</strong>
                      {row.students && (
                        <span className="mt-1 block max-w-[220px] text-xs text-[#8a8378]">
                          {row.students}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top text-sm text-[#665f55]">
                      {row.description}
                      {row.provider !== "—" && (
                        <span className="mt-1 block text-[11px] text-[#9a9287]">
                          {row.provider}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top font-bold">
                      {row.debit > 0
                        ? formatCurrency(row.debit, row.currency)
                        : "—"}
                    </td>
                    <td className="px-4 py-4 align-top font-bold text-emerald-700">
                      {row.credit > 0
                        ? formatCurrency(row.credit, row.currency)
                        : "—"}
                    </td>
                    <td className="px-4 py-4 align-top font-bold text-red-700">
                      {row.refund > 0
                        ? formatCurrency(row.refund, row.currency)
                        : "—"}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span className="text-xs font-bold capitalize text-[#665f55]">
                        {row.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="max-w-[220px] px-5 py-4 align-top text-xs text-[#81796d]">
                      <span className="break-all">
                        {row.reference || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-6 rounded-[2rem] border border-cyan-200 bg-cyan-50 p-5 text-sm leading-6 text-cyan-950">
        <strong>Accounting Phase 3 next:</strong> accountant-ready CSV/Excel
        exports, one-click monthly accounting pack, period close/lock,
        post-close adjustment reporting, and explicit refundable-deposit return
        tagging.
      </div>
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
      <p className="mt-2 text-xs leading-5 text-[#8a8378]">{detail}</p>
    </article>
  );
}

function MiniMetric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <article
      className={`rounded-2xl border bg-[#fbfaf7] p-4 ${
        danger ? "border-amber-300" : "border-[#ded5c4]"
      }`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#8a8378]">
        {label}
      </p>
      <strong className="mt-2 block text-lg text-[#15233b]">
        {value}
      </strong>
    </article>
  );
}

function DetailLine({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#f0ece4] pb-3 last:border-b-0 last:pb-0">
      <span className="text-xs leading-5 text-[#81796d]">{label}</span>
      <strong
        className={`text-right text-sm ${
          strong ? "text-[#15233b]" : "text-[#554d40]"
        }`}
      >
        {value}
      </strong>
    </div>
  );
}

function AccountingClassPill({
  value,
}: {
  value: string;
}) {
  const classes =
    value === "revenue"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : value === "liability"
        ? "border-violet-200 bg-violet-50 text-violet-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.07em] ${classes}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

function TypePill({
  type,
}: {
  type: LedgerRow["type"];
}) {
  const classes =
    type === "invoice"
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : type === "payment"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-red-200 bg-red-50 text-red-700";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.07em] ${classes}`}
    >
      {type}
    </span>
  );
}

function numberValue(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalise(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function monthValue(value: string | null | undefined) {
  if (!value) return "";

  if (/^\d{4}-\d{2}/.test(value)) {
    return value.slice(0, 7);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(parsed);

  const map = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${map.year}-${map.month}`;
}

function invoicePeriodValue(invoice: InvoiceRow) {
  return (
    monthValue(invoice.billing_period) ||
    monthValue(invoice.invoice_date) ||
    monthValue(invoice.issued_at) ||
    monthValue(invoice.created_at)
  );
}

function currentMonthValue() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const map = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${map.year}-${map.month}`;
}

function monthEndDate(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);

  if (!match) {
    return new Date().toISOString().slice(0, 10);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  const end = new Date(
    Date.UTC(year, month, 0),
  );

  return end.toISOString().slice(0, 10);
}

function periodLabel(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);

  if (!match) return value;

  const date = new Date(
    `${match[1]}-${match[2]}-01T00:00:00+08:00`,
  );

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    month: "long",
    year: "numeric",
  }).format(date);
}

function buildPeriodOptions(
  invoices: InvoiceRow[],
  payments: PaymentRow[],
  refunds: RefundRow[],
): PeriodOption[] {
  const values = new Set<string>([currentMonthValue()]);

  for (const invoice of invoices) {
    const value = invoicePeriodValue(invoice);
    if (value) values.add(value);
  }

  for (const payment of payments) {
    const value = monthValue(payment.paid_at || payment.created_at);
    if (value) values.add(value);
  }

  for (const refund of refunds) {
    const value = monthValue(refund.refunded_at || refund.created_at);
    if (value) values.add(value);
  }

  return Array.from(values)
    .sort((a, b) => b.localeCompare(a))
    .map((value) => ({
      value,
      label: periodLabel(value),
    }));
}

function formatCurrency(
  value: number,
  currency = "SGD",
) {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: currency || "SGD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function dateValue(value: string) {
  const parsed = new Date(value);

  return Number.isFinite(parsed.getTime())
    ? parsed.getTime()
    : 0;
}

function formatDate(value: string) {
  if (!value) return "—";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}
