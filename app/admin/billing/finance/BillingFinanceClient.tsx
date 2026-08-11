"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import BillingAdminShell from "@/app/admin/billing/_components/BillingAdminShell";
import { supabase } from "@/lib/supabase";

type Dashboard = {
  month_start: string;
  month_end: string;
  gkp_invoiced: number | string;
  gkp_collected: number | string;
  gkp_refunds: number | string;
  gkp_net_revenue: number | string;
  gkp_outstanding: number | string;
  dreamscape_gross_revenue: number | string;
  dreamscape_refunds: number | string;
  dreamscape_net_revenue: number | string;
  combined_net_revenue: number | string;
  affiliate_attributed_revenue: number | string;
  affiliate_commission_accrued: number | string;
  affiliate_commission_released: number | string;
  affiliate_commission_paid: number | string;
  public_net_after_affiliate_accrual: number | string;
  current_public_mrr: number | string;
  current_gkp_addon_mrr: number | string;
  current_total_dreamscape_mrr: number | string;
  current_dreamscape_arr_run_rate: number | string;
  active_public_subscriptions: number | string;
  active_gkp_addons: number | string;
  new_public_subscriptions: number | string;
  cancellations_requested: number | string;
  current_payment_issues: number | string;
  active_core: number | string;
  active_complete: number | string;
  cross_source_conflicts: number | string;
  reconciliation_errors: number | string;
  reconciliation_warnings: number | string;
};

type MonthlyRow = {
  month_start: string;
  gkp_collected: number | string;
  gkp_refunds: number | string;
  gkp_net_revenue: number | string;
  dreamscape_gross_revenue: number | string;
  dreamscape_refunds: number | string;
  dreamscape_net_revenue: number | string;
  affiliate_commission_accrued: number | string;
  affiliate_commission_paid: number | string;
  combined_net_revenue: number | string;
};

type PlanRow = {
  plan_id: string;
  plan_name: string;
  plan_code: string;
  billing_cycle: string;
  current_active_contracts: number | string;
  payment_count: number | string;
  gross_revenue: number | string;
  refunds: number | string;
  net_revenue: number | string;
  affiliate_attributed_revenue: number | string;
  affiliate_commission_accrued: number | string;
};

type ExceptionRow = {
  severity: "error" | "warning" | string;
  exception_type: string;
  source: string;
  record_id: string;
  reference: string;
  event_at: string | null;
  detail: string;
};

function numeric(value: unknown) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function money(value: unknown, currency = "SGD") {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(numeric(value));
}

function monthLabel(value: string) {
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00+08:00`);
  if (!Number.isFinite(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-SG", {
    month: "short",
    year: "numeric",
    timeZone: "Asia/Singapore",
  }).format(parsed);
}

function dateTime(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Singapore",
  }).format(parsed);
}

function currentMonthInput() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}`;
}

function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    throw new Error("There are no rows to export for this month.");
  }

  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  const csv = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function BillingFinanceClient() {
  const [month, setMonth] = useState(currentMonthInput());
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [monthly, setMonthly] = useState<MonthlyRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedDate = `${month}-01`;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const [dashboardResult, monthlyResult, planResult, exceptionResult] =
      await Promise.all([
        supabase.rpc("gkp_get_finance_dashboard", {
          p_month: selectedDate,
        }),
        supabase.rpc("gkp_get_finance_monthly_breakdown", {
          p_months: 12,
        }),
        supabase.rpc("gkp_get_finance_subscription_breakdown", {
          p_month: selectedDate,
        }),
        supabase.rpc("gkp_get_finance_reconciliation_exceptions"),
      ]);

    const firstError =
      dashboardResult.error ||
      monthlyResult.error ||
      planResult.error ||
      exceptionResult.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setDashboard(((dashboardResult.data || [])[0] || null) as Dashboard | null);
    setMonthly((monthlyResult.data || []) as MonthlyRow[]);
    setPlans((planResult.data || []) as PlanRow[]);
    setExceptions((exceptionResult.data || []) as ExceptionRow[]);
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const errorCount = useMemo(
    () => exceptions.filter((row) => row.severity === "error").length,
    [exceptions],
  );
  const warningCount = useMemo(
    () => exceptions.filter((row) => row.severity === "warning").length,
    [exceptions],
  );

  async function exportRows(
    rpc:
      | "gkp_export_finance_revenue"
      | "gkp_export_finance_refunds"
      | "gkp_export_finance_affiliate",
    label: string,
  ) {
    setWorking(true);
    setError("");
    setMessage("");

    try {
      const result = await supabase.rpc(rpc, {
        p_month: selectedDate,
      });

      if (result.error) throw result.error;

      downloadCsv(
        `gkp-${label}-${month}.csv`,
        (result.data || []) as Record<string, unknown>[],
      );
      setMessage(`${label.replaceAll("-", " ")} CSV prepared.`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not prepare CSV export.",
      );
    }

    setWorking(false);
  }

  function exportReconciliation() {
    setError("");
    setMessage("");

    try {
      downloadCsv(
        `gkp-reconciliation-${month}.csv`,
        exceptions as unknown as Record<string, unknown>[],
      );
      setMessage("Reconciliation CSV prepared.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not prepare CSV export.",
      );
    }
  }

  return (
    <BillingAdminShell
      eyebrow="Finance & reconciliation"
      title="Financial Reporting"
      description="Review GKP collections, Dreamscape subscription revenue, affiliate costs, recurring revenue and reconciliation exceptions from one billing workspace."
      actions={
        <>
          <Link
            href="/admin/affiliates/finance"
            className="inline-flex min-h-11 items-center rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold text-[#554d40]"
          >
            Affiliate finance
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || working}
            className="inline-flex min-h-11 items-center rounded-full bg-[#15233b] px-5 text-xs font-bold text-white disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </>
      }
    >
      {(error || message) && (
        <div
          className={`mb-5 rounded-2xl border px-5 py-4 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {error || message}
        </div>
      )}

      <section className="rounded-[28px] border border-[#ded5c4] bg-white p-5 shadow-[0_20px_60px_rgba(21,35,59,0.05)] sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">
              Reporting period
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#15233b]">
              {monthLabel(selectedDate)}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#81796d]">
              Cash revenue is recognised from successful payment dates and refund
              dates. MRR/ARR cards show the current recurring run-rate.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="min-h-11 rounded-xl border border-[#d9cfbd] bg-white px-4 text-sm outline-none"
            />
            <button
              type="button"
              disabled={working}
              onClick={() => void exportRows("gkp_export_finance_revenue", "revenue")}
              className="min-h-11 rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold"
            >
              Revenue CSV
            </button>
            <button
              type="button"
              disabled={working}
              onClick={() => void exportRows("gkp_export_finance_refunds", "refunds")}
              className="min-h-11 rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold"
            >
              Refunds CSV
            </button>
            <button
              type="button"
              disabled={working}
              onClick={() => void exportRows("gkp_export_finance_affiliate", "affiliate-finance")}
              className="min-h-11 rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold"
            >
              Affiliate CSV
            </button>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="GKP net revenue" value={loading ? "…" : money(dashboard?.gkp_net_revenue)} detail={`${money(dashboard?.gkp_collected)} collected · ${money(dashboard?.gkp_refunds)} refunded`} />
        <Metric label="Dreamscape net revenue" value={loading ? "…" : money(dashboard?.dreamscape_net_revenue)} detail={`${money(dashboard?.dreamscape_gross_revenue)} gross · ${money(dashboard?.dreamscape_refunds)} refunded`} />
        <Metric label="Combined net revenue" value={loading ? "…" : money(dashboard?.combined_net_revenue)} detail={`Selected month · before non-affiliate operating costs`} />
        <Metric label="Current Dreamscape MRR" value={loading ? "…" : money(dashboard?.current_total_dreamscape_mrr)} detail={`${money(dashboard?.current_dreamscape_arr_run_rate)} annual run-rate`} />
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Affiliate-attributed revenue" value={loading ? "…" : money(dashboard?.affiliate_attributed_revenue)} detail={`${money(dashboard?.affiliate_commission_accrued)} commission accrued`} />
        <Metric label="Affiliate paid" value={loading ? "…" : money(dashboard?.affiliate_commission_paid)} detail={`${money(dashboard?.affiliate_commission_released)} released in period`} />
        <Metric label="GKP outstanding" value={loading ? "…" : money(dashboard?.gkp_outstanding)} detail={`${money(dashboard?.gkp_invoiced)} issued in selected month`} />
        <Metric label="Reconciliation" value={loading ? "…" : errorCount === 0 ? "CLEAR" : `${errorCount} ERROR${errorCount === 1 ? "" : "S"}`} detail={`${warningCount} operational warning${warningCount === 1 ? "" : "s"}`} danger={errorCount > 0} />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <section className="rounded-[28px] border border-[#ded5c4] bg-white p-6 shadow-[0_20px_60px_rgba(21,35,59,0.05)]">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">
            12-month cash trend
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[#15233b]">
            Revenue and affiliate cost
          </h2>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#ebe5da] bg-[#fbfaf7] text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">GKP net</th>
                  <th className="px-4 py-3">Dreamscape net</th>
                  <th className="px-4 py-3">Combined</th>
                  <th className="px-4 py-3">Commission accrued</th>
                  <th className="px-4 py-3">Affiliate paid</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((row) => (
                  <tr key={row.month_start} className="border-b border-[#f0ece4] last:border-b-0">
                    <td className="px-4 py-4 text-sm font-bold">{monthLabel(row.month_start)}</td>
                    <td className="px-4 py-4 text-sm">{money(row.gkp_net_revenue)}</td>
                    <td className="px-4 py-4 text-sm">{money(row.dreamscape_net_revenue)}</td>
                    <td className="px-4 py-4 text-sm font-bold">{money(row.combined_net_revenue)}</td>
                    <td className="px-4 py-4 text-sm">{money(row.affiliate_commission_accrued)}</td>
                    <td className="px-4 py-4 text-sm">{money(row.affiliate_commission_paid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid content-start gap-6">
          <section className="rounded-[28px] border border-[#ded5c4] bg-[#15233b] p-6 text-white shadow-[0_20px_60px_rgba(21,35,59,0.12)]">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#e8c474]">
              Current Dreamscape run-rate
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Count label="Public subscriptions" value={dashboard?.active_public_subscriptions} />
              <Count label="GKP add-ons" value={dashboard?.active_gkp_addons} />
              <Count label="Core" value={dashboard?.active_core} />
              <Count label="Complete" value={dashboard?.active_complete} />
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs text-white/60">Public MRR</p>
              <strong className="mt-1 block text-xl text-[#f3d38c]">{money(dashboard?.current_public_mrr)}</strong>
              <p className="mt-3 text-xs text-white/60">GKP add-on MRR</p>
              <strong className="mt-1 block text-xl text-[#f3d38c]">{money(dashboard?.current_gkp_addon_mrr)}</strong>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#ded5c4] bg-white p-6 shadow-[0_20px_60px_rgba(21,35,59,0.05)]">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">
              Subscription movement
            </p>
            <div className="mt-4 grid gap-3">
              <StatusLine label="New paid subscriptions" value={dashboard?.new_public_subscriptions} />
              <StatusLine label="Cancellation requests" value={dashboard?.cancellations_requested} />
              <StatusLine label="Current payment issues" value={dashboard?.current_payment_issues} />
              <StatusLine label="GKP/public conflicts" value={dashboard?.cross_source_conflicts} danger={numeric(dashboard?.cross_source_conflicts) > 0} />
            </div>
          </section>
        </div>
      </div>

      <section className="mt-6 rounded-[28px] border border-[#ded5c4] bg-white p-6 shadow-[0_20px_60px_rgba(21,35,59,0.05)]">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">
          Public subscription breakdown
        </p>
        <h2 className="mt-2 text-xl font-semibold text-[#15233b]">
          Plans · {monthLabel(selectedDate)}
        </h2>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#ebe5da] bg-[#fbfaf7] text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Current active</th>
                <th className="px-4 py-3">Payments</th>
                <th className="px-4 py-3">Gross</th>
                <th className="px-4 py-3">Refunds</th>
                <th className="px-4 py-3">Net</th>
                <th className="px-4 py-3">Affiliate revenue</th>
                <th className="px-4 py-3">Commission</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr key={plan.plan_id} className="border-b border-[#f0ece4] last:border-b-0">
                  <td className="px-4 py-4">
                    <strong className="block text-sm text-[#15233b]">{plan.plan_name}</strong>
                    <span className="mt-1 block text-[11px] capitalize text-[#81796d]">{plan.plan_code} · {plan.billing_cycle}</span>
                  </td>
                  <td className="px-4 py-4 text-sm">{numeric(plan.current_active_contracts)}</td>
                  <td className="px-4 py-4 text-sm">{numeric(plan.payment_count)}</td>
                  <td className="px-4 py-4 text-sm">{money(plan.gross_revenue)}</td>
                  <td className="px-4 py-4 text-sm">{money(plan.refunds)}</td>
                  <td className="px-4 py-4 text-sm font-bold">{money(plan.net_revenue)}</td>
                  <td className="px-4 py-4 text-sm">{money(plan.affiliate_attributed_revenue)}</td>
                  <td className="px-4 py-4 text-sm">{money(plan.affiliate_commission_accrued)}</td>
                </tr>
              ))}
              {!plans.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-[#81796d]">
                    No public plan data is available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-[#ded5c4] bg-white p-6 shadow-[0_20px_60px_rgba(21,35,59,0.05)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">
              Reconciliation
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#15233b]">
              Exceptions requiring review
            </h2>
            <p className="mt-2 text-sm text-[#81796d]">
              Errors must be resolved before the Phase 6 validator passes. Warnings are operational follow-ups and do not block completion.
            </p>
          </div>
          <button
            type="button"
            onClick={exportReconciliation}
            className="min-h-11 rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold"
          >
            Reconciliation CSV
          </button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#ebe5da] bg-[#fbfaf7] text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Detected from</th>
                <th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map((row, index) => (
                <tr key={`${row.exception_type}:${row.record_id}:${index}`} className="border-b border-[#f0ece4] last:border-b-0">
                  <td className="px-4 py-4"><Severity value={row.severity} /></td>
                  <td className="px-4 py-4 text-xs font-bold">{row.exception_type.replaceAll("_", " ")}</td>
                  <td className="px-4 py-4 text-xs">{row.source.replaceAll("_", " ")}</td>
                  <td className="px-4 py-4 text-xs">{row.reference || row.record_id}</td>
                  <td className="px-4 py-4 text-xs">{dateTime(row.event_at)}</td>
                  <td className="px-4 py-4 text-xs leading-5 text-[#6f685e]">{row.detail}</td>
                </tr>
              ))}
              {!exceptions.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-emerald-700">
                    No reconciliation exceptions detected.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
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
    <article className={`rounded-[1.75rem] border bg-white p-5 shadow-[0_18px_50px_rgba(21,35,59,0.04)] ${danger ? "border-red-200" : "border-[#ded5c4]"}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#857d70]">{label}</p>
      <strong className={`mt-3 block break-words text-2xl font-semibold tracking-[-0.025em] sm:text-3xl ${danger ? "text-red-700" : "text-[#15233b]"}`}>{value}</strong>
      <p className="mt-3 text-xs leading-5 text-[#8a8378]">{detail}</p>
    </article>
  );
}

function Count({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <strong className="block text-2xl text-[#f3d38c]">{numeric(value)}</strong>
      <span className="mt-1 block text-xs text-white/60">{label}</span>
    </div>
  );
}

function StatusLine({ label, value, danger = false }: { label: string; value: unknown; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#ebe5da] bg-[#fbfaf7] p-4">
      <span className="text-sm text-[#6f685e]">{label}</span>
      <strong className={danger ? "text-red-700" : "text-[#15233b]"}>{numeric(value)}</strong>
    </div>
  );
}

function Severity({ value }: { value: string }) {
  const error = value === "error";
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${error ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
      {value}
    </span>
  );
}
