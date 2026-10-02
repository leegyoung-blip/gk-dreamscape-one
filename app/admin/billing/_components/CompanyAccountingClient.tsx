"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import BillingAdminShell from "./BillingAdminShell";
import { supabase } from "@/lib/supabase";

type CompanyCode = "gkp" | "dreamscape";

type AccountingSummary = {
  company_code: CompanyCode;
  period_start: string;
  period_end: string;
  billed_amount: number | string;
  gross_collected: number | string;
  refunds: number | string;
  net_collected: number | string;
  outstanding: number | string;
  payroll_accrued: number | string;
  payroll_paid: number | string;
  payroll_pending: number | string;
  manual_expense_accrued: number | string;
  manual_expense_paid: number | string;
  manual_expense_pending: number | string;
  affiliate_paid: number | string;
  cash_expenses: number | string;
  cash_result: number | string;
  active_subscribers: number;
  payment_issue_count: number;
  mrr: number | string;
  arr: number | string;
  refund_tracking_available: boolean;
};

type YearSummary = {
  company_code: CompanyCode;
  report_year: number;
  through_month: number;
  gross_collected: number | string;
  refunds: number | string;
  net_collected: number | string;
  payroll_paid: number | string;
  other_expenses_paid: number | string;
  affiliate_paid: number | string;
  cash_expenses: number | string;
  cash_result: number | string;
};

type ExpenseRow = {
  id: string;
  company_code: CompanyCode;
  expense_date: string;
  category: string;
  description: string;
  vendor: string | null;
  amount: number | string;
  status: "pending" | "paid" | "void";
  paid_at: string | null;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type RoleCostRow = {
  staff_category: string;
  staff_count: number;
  payment_count: number;
  base_pay: number | string;
  bonus: number | string;
  allowances: number | string;
  deductions: number | string;
  other_adjustment: number | string;
  total_amount: number | string;
  pending_amount: number | string;
  paid_amount: number | string;
};

type PlanRevenueRow = {
  plan_id: string;
  plan_key: string;
  plan_name: string;
  billing_cycle: string;
  payment_count: number;
  gross_collected: number | string;
  refunds: number | string;
  net_collected: number | string;
};

type DreamscapeRefundRow = {
  id: string;
  payment_id: string;
  contract_id: string;
  contract_reference: string;
  learner_name: string;
  plan_name: string | null;
  provider: string;
  provider_environment: string | null;
  provider_charge_id: string | null;
  provider_event_id: string | null;
  amount: number | string;
  currency: string;
  refunded_at: string;
  source: string;
};

type ExpenseForm = {
  expense_date: string;
  category: string;
  description: string;
  vendor: string;
  amount: string;
  status: "pending" | "paid";
  paid_at: string;
  payment_method: string;
  reference: string;
  notes: string;
};

const CATEGORY_OPTIONS: Array<[string, string]> = [
  ["rent", "Rent"],
  ["software", "Software / subscriptions"],
  ["marketing", "Marketing / advertising"],
  ["professional_fees", "Professional fees"],
  ["utilities", "Utilities"],
  ["materials", "Materials / supplies"],
  ["equipment", "Equipment"],
  ["travel", "Travel / transport"],
  ["bank_fees", "Bank / payment fees"],
  ["contractor_other", "Other contractor cost"],
  ["affiliate_other", "Affiliate-related other cost"],
  ["other", "Other"],
];

function singaporeMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value || "2026";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  return `${year}-${month}`;
}

function firstDay(month: string) {
  return `${month}-01`;
}

function monthEnd(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const end = new Date(Date.UTC(year, monthNumber, 0));
  return `${year}-${String(monthNumber).padStart(2, "0")}-${String(end.getUTCDate()).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-SG", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function money(value: unknown, currency = "SGD") {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function amount(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function shortDate(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value.includes("T") ? value : `${value}T00:00:00+08:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Singapore",
  }).format(parsed);
}

function categoryLabel(value: string) {
  return CATEGORY_OPTIONS.find(([key]) => key === value)?.[1] || value.replaceAll("_", " ");
}

function roleLabel(value: string) {
  const labels: Record<string, string> = {
    management: "Management",
    full_time: "Full-time staff",
    part_time: "Part-time staff",
    teacher: "Teachers",
    assistant_teacher: "Assistant teachers",
    contractor: "Contractors",
    other: "Other",
  };
  return labels[value] || value.replaceAll("_", " ");
}

function defaultExpenseForm(month: string): ExpenseForm {
  return {
    expense_date: firstDay(month),
    category: "other",
    description: "",
    vendor: "",
    amount: "0",
    status: "pending",
    paid_at: "",
    payment_method: "",
    reference: "",
    notes: "",
  };
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const body = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function CompanyAccountingClient({
  companyCode,
}: {
  companyCode: CompanyCode;
}) {
  const [selectedMonth, setSelectedMonth] = useState(singaporeMonth());
  const [summary, setSummary] = useState<AccountingSummary | null>(null);
  const [trend, setTrend] = useState<AccountingSummary[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [roleCosts, setRoleCosts] = useState<RoleCostRow[]>([]);
  const [yearSummary, setYearSummary] = useState<YearSummary | null>(null);
  const [previousYearSummary, setPreviousYearSummary] = useState<YearSummary | null>(null);
  const [planRevenue, setPlanRevenue] = useState<PlanRevenueRow[]>([]);
  const [dreamscapeRefunds, setDreamscapeRefunds] = useState<DreamscapeRefundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(() =>
    defaultExpenseForm(singaporeMonth()),
  );

  const companyName = companyCode === "gkp" ? "Guru Kids Pro" : "Dreamscape One";
  const staffPaymentsHref = `/admin/billing/${companyCode}/staff-payments`;

  const load = useCallback(async () => {
    if (!allowed) return;

    setLoading(true);
    setError("");

    const months = Array.from({ length: 12 }, (_, index) =>
      shiftMonth(selectedMonth, index - 11),
    );
    const [yearText, monthText] = selectedMonth.split("-");
    const reportYear = Number(yearText);
    const throughMonth = Number(monthText);

    const [summaryResult, expensesResult, roleCostResult, yearResult, previousYearResult, ...trendResults] =
      await Promise.all([
        supabase.rpc("billing_accounting_month_summary", {
          p_company_code: companyCode,
          p_month: firstDay(selectedMonth),
        }),
        supabase.rpc("billing_company_expenses_list", {
          p_company_code: companyCode,
          p_period_start: firstDay(selectedMonth),
          p_period_end: monthEnd(selectedMonth),
        }),
        supabase.rpc("billing_staff_role_cost_summary", {
          p_company_code: companyCode,
          p_period_start: firstDay(selectedMonth),
          p_period_end: monthEnd(selectedMonth),
        }),
        supabase.rpc("billing_accounting_year_summary", {
          p_company_code: companyCode,
          p_year: reportYear,
          p_through_month: throughMonth,
        }),
        supabase.rpc("billing_accounting_year_summary", {
          p_company_code: companyCode,
          p_year: reportYear - 1,
          p_through_month: throughMonth,
        }),
        ...months.map((month) =>
          supabase.rpc("billing_accounting_month_summary", {
            p_company_code: companyCode,
            p_month: firstDay(month),
          }),
        ),
      ]);

    const firstError =
      summaryResult.error ||
      expensesResult.error ||
      roleCostResult.error ||
      yearResult.error ||
      previousYearResult.error ||
      trendResults.find((result) => result.error)?.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setSummary(((summaryResult.data || [])[0] || null) as AccountingSummary | null);
    setExpenses((expensesResult.data || []) as ExpenseRow[]);
    setRoleCosts((roleCostResult.data || []) as RoleCostRow[]);
    setYearSummary(((yearResult.data || [])[0] || null) as YearSummary | null);
    setPreviousYearSummary(((previousYearResult.data || [])[0] || null) as YearSummary | null);
    setTrend(
      trendResults
        .map((result) => ((result.data || [])[0] || null) as AccountingSummary | null)
        .filter(Boolean) as AccountingSummary[],
    );

    if (companyCode === "dreamscape") {
      const [planResult, refundResult] = await Promise.all([
        supabase.rpc("billing_dreamscape_plan_revenue_summary", {
          p_period_start: firstDay(selectedMonth),
          p_period_end: monthEnd(selectedMonth),
        }),
        supabase.rpc("billing_dreamscape_refunds_list", {
          p_period_start: firstDay(selectedMonth),
          p_period_end: monthEnd(selectedMonth),
        }),
      ]);

      if (planResult.error || refundResult.error) {
        setError((planResult.error || refundResult.error)?.message || "Dreamscape reporting could not be loaded.");
        setPlanRevenue([]);
        setDreamscapeRefunds([]);
      } else {
        setPlanRevenue((planResult.data || []) as PlanRevenueRow[]);
        setDreamscapeRefunds((refundResult.data || []) as DreamscapeRefundRow[]);
      }
    } else {
      setPlanRevenue([]);
      setDreamscapeRefunds([]);
    }

    setLoading(false);
  }, [allowed, companyCode, selectedMonth]);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      const { data, error: accessError } = await supabase.rpc("billing_is_payroll_admin");
      if (!active) return;
      if (accessError) {
        setError(accessError.message);
        setAllowed(false);
      } else {
        setAllowed(Boolean(data));
      }
      setAccessChecked(true);
    }

    void checkAccess();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (accessChecked && allowed) void load();
  }, [accessChecked, allowed, load]);

  const maxTrend = useMemo(
    () => Math.max(1, ...trend.map((row) => Math.abs(amount(row.net_collected)))),
    [trend],
  );

  const expenseBreakdown = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const expense of expenses) {
      if (expense.status === "void") continue;
      grouped.set(expense.category, (grouped.get(expense.category) || 0) + amount(expense.amount));
    }
    return Array.from(grouped.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  const maxExpenseCategory = useMemo(
    () => Math.max(1, ...expenseBreakdown.map((row) => row.total)),
    [expenseBreakdown],
  );

  const ytdNet = amount(yearSummary?.net_collected);
  const previousYtdNet = amount(previousYearSummary?.net_collected);
  const yoyDifference = ytdNet - previousYtdNet;
  const yoyPercent = previousYtdNet === 0 ? null : (yoyDifference / Math.abs(previousYtdNet)) * 100;

  function openNewExpense() {
    setEditingExpenseId(null);
    setExpenseForm({
      ...defaultExpenseForm(selectedMonth),
      expense_date: firstDay(selectedMonth),
    });
    setExpenseModalOpen(true);
    setError("");
  }

  function openEditExpense(expense: ExpenseRow) {
    if (expense.status === "void") return;
    setEditingExpenseId(expense.id);
    setExpenseForm({
      expense_date: expense.expense_date,
      category: expense.category,
      description: expense.description,
      vendor: expense.vendor || "",
      amount: String(amount(expense.amount)),
      status: expense.status === "paid" ? "paid" : "pending",
      paid_at: expense.paid_at || "",
      payment_method: expense.payment_method || "",
      reference: expense.reference || "",
      notes: expense.notes || "",
    });
    setExpenseModalOpen(true);
    setError("");
  }

  async function saveExpense() {
    const numericAmount = Number(expenseForm.amount);
    if (!expenseForm.description.trim()) {
      setError("Enter an expense description.");
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      setError("Enter a valid expense amount.");
      return;
    }

    setWorking(true);
    setError("");
    setNotice("");

    const { error: saveError } = await supabase.rpc("billing_company_expense_save", {
      p_company_code: companyCode,
      p_expense_id: editingExpenseId,
      p_expense_date: expenseForm.expense_date,
      p_category: expenseForm.category,
      p_description: expenseForm.description.trim(),
      p_vendor: expenseForm.vendor.trim() || null,
      p_amount: numericAmount,
      p_status: expenseForm.status,
      p_paid_at:
        expenseForm.status === "paid"
          ? expenseForm.paid_at || expenseForm.expense_date
          : null,
      p_payment_method: expenseForm.payment_method.trim() || null,
      p_reference: expenseForm.reference.trim() || null,
      p_notes: expenseForm.notes.trim() || null,
    });

    if (saveError) {
      setError(saveError.message);
    } else {
      setExpenseModalOpen(false);
      setNotice(editingExpenseId ? "Expense updated." : "Expense added.");
      await load();
    }
    setWorking(false);
  }

  async function voidExpense(expense: ExpenseRow) {
    if (expense.status === "void") return;
    const confirmed = window.confirm(`Void “${expense.description}” for ${money(expense.amount)}?`);
    if (!confirmed) return;
    const reason = window.prompt("Reason for voiding this expense:", "Entered incorrectly");
    if (reason === null) return;

    setWorking(true);
    setError("");
    setNotice("");
    const { error: voidError } = await supabase.rpc("billing_company_expense_void", {
      p_expense_id: expense.id,
      p_reason: reason.trim() || null,
    });
    if (voidError) setError(voidError.message);
    else {
      setNotice("Expense voided. The audit record has been retained.");
      await load();
    }
    setWorking(false);
  }

  function exportAccountingCsv() {
    const rows: unknown[][] = [];
    rows.push([`${companyName} Accounting Export`]);
    rows.push(["Selected month", monthLabel(selectedMonth)]);
    rows.push(["Generated", new Date().toISOString()]);
    rows.push([]);

    rows.push(["MONTH SUMMARY"]);
    rows.push(["Metric", "Amount / value"]);
    rows.push(["Billed", amount(summary?.billed_amount)]);
    rows.push(["Gross collected", amount(summary?.gross_collected)]);
    rows.push(["Refunds", amount(summary?.refunds)]);
    rows.push(["Net collected", amount(summary?.net_collected)]);
    rows.push(["Outstanding", amount(summary?.outstanding)]);
    rows.push(["Payroll paid", amount(summary?.payroll_paid)]);
    rows.push(["Payroll pending", amount(summary?.payroll_pending)]);
    rows.push(["Other expenses paid", amount(summary?.manual_expense_paid)]);
    rows.push(["Other expenses pending", amount(summary?.manual_expense_pending)]);
    if (companyCode === "dreamscape") {
      rows.push(["Affiliate payouts paid", amount(summary?.affiliate_paid)]);
      rows.push(["Active subscribers", summary?.active_subscribers || 0]);
      rows.push(["Payment issues", summary?.payment_issue_count || 0]);
      rows.push(["MRR", amount(summary?.mrr)]);
      rows.push(["ARR", amount(summary?.arr)]);
    }
    rows.push(["Cash expenses", amount(summary?.cash_expenses)]);
    rows.push(["Cash result", amount(summary?.cash_result)]);
    rows.push([]);

    rows.push(["YTD COMPARISON"]);
    rows.push(["Metric", String(yearSummary?.report_year || ""), String(previousYearSummary?.report_year || "")]);
    rows.push(["Net collected", amount(yearSummary?.net_collected), amount(previousYearSummary?.net_collected)]);
    rows.push(["Refunds", amount(yearSummary?.refunds), amount(previousYearSummary?.refunds)]);
    rows.push(["Payroll paid", amount(yearSummary?.payroll_paid), amount(previousYearSummary?.payroll_paid)]);
    rows.push(["Other expenses paid", amount(yearSummary?.other_expenses_paid), amount(previousYearSummary?.other_expenses_paid)]);
    rows.push(["Affiliate paid", amount(yearSummary?.affiliate_paid), amount(previousYearSummary?.affiliate_paid)]);
    rows.push(["Cash result", amount(yearSummary?.cash_result), amount(previousYearSummary?.cash_result)]);
    rows.push([]);

    rows.push(["12-MONTH TREND"]);
    rows.push(["Month", "Gross collected", "Refunds", "Net collected", "Cash expenses", "Cash result"]);
    for (const row of trend) {
      rows.push([
        String(row.period_start).slice(0, 7),
        amount(row.gross_collected),
        amount(row.refunds),
        amount(row.net_collected),
        amount(row.cash_expenses),
        amount(row.cash_result),
      ]);
    }
    rows.push([]);

    rows.push(["PAYROLL BY ROLE"]);
    rows.push(["Role", "Staff", "Entries", "Base", "Bonus", "Allowances", "Deductions", "Adjustments", "Total", "Pending", "Paid"]);
    for (const row of roleCosts) {
      rows.push([
        roleLabel(row.staff_category), row.staff_count, row.payment_count,
        amount(row.base_pay), amount(row.bonus), amount(row.allowances), amount(row.deductions),
        amount(row.other_adjustment), amount(row.total_amount), amount(row.pending_amount), amount(row.paid_amount),
      ]);
    }
    rows.push([]);

    rows.push(["OTHER EXPENSES"]);
    rows.push(["Date", "Category", "Description", "Vendor", "Amount", "Status", "Paid date", "Payment method", "Reference", "Notes"]);
    for (const row of expenses) {
      rows.push([
        row.expense_date, categoryLabel(row.category), row.description, row.vendor || "", amount(row.amount), row.status,
        row.paid_at || "", row.payment_method || "", row.reference || "", row.notes || "",
      ]);
    }

    if (companyCode === "dreamscape") {
      rows.push([]);
      rows.push(["DREAMSCAPE REVENUE BY PLAN"]);
      rows.push(["Plan", "Billing cycle", "Payments", "Gross", "Refunds", "Net"]);
      for (const row of planRevenue) {
        rows.push([row.plan_name, row.billing_cycle, row.payment_count, amount(row.gross_collected), amount(row.refunds), amount(row.net_collected)]);
      }
      rows.push([]);
      rows.push(["DREAMSCAPE REFUND JOURNAL"]);
      rows.push(["Refunded at", "Contract", "Learner", "Plan", "Amount", "Provider", "Environment", "Charge / invoice", "Event", "Source"]);
      for (const row of dreamscapeRefunds) {
        rows.push([
          row.refunded_at, row.contract_reference, row.learner_name, row.plan_name || "", amount(row.amount), row.provider,
          row.provider_environment || "", row.provider_charge_id || "", row.provider_event_id || "", row.source,
        ]);
      }
    }

    downloadCsv(`${companyCode}-accounting-${selectedMonth}.csv`, rows);
  }

  const title = `${companyName} Accounting`;
  const description =
    companyCode === "gkp"
      ? "Company-only tuition billing, collections, refunds, staff costs, operating expenses and management reporting."
      : "Company-only subscription collections, refunds, MRR/ARR, plan revenue, affiliate payouts, staff costs and operating expenses.";

  return (
    <BillingAdminShell
      eyebrow={`${companyName} finance`}
      title={title}
      description={description}
      actions={
        allowed ? (
          <>
            <Link
              href={staffPaymentsHref}
              className="inline-flex min-h-11 items-center rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold text-[#554d40]"
            >
              Staff Payments
            </Link>
            <button
              type="button"
              onClick={exportAccountingCsv}
              disabled={loading || working}
              className="inline-flex min-h-11 items-center rounded-full border border-[#c8a45c] bg-[#fff9eb] px-4 text-xs font-black text-[#725719] disabled:opacity-60"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading || working}
              className="inline-flex min-h-11 items-center rounded-full bg-[#15233b] px-5 text-xs font-bold text-white disabled:opacity-60"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </>
        ) : undefined
      }
    >
      {!accessChecked ? (
        <PanelMessage>Checking accounting access…</PanelMessage>
      ) : !allowed ? (
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-7">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Restricted finance data</p>
          <h2 className="mt-3 text-xl font-semibold">Administrator access required</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-amber-900/75">
            Company Accounting includes aggregate payroll costs and is restricted to administrators, matching the Staff Payments privacy rule.
          </p>
        </section>
      ) : (
        <>
          {error && <Alert tone="error">{error}</Alert>}
          {notice && <Alert tone="success">{notice}</Alert>}

          <section className="rounded-[2rem] border border-[#ded5c4] bg-white p-5 shadow-[0_20px_60px_rgba(21,35,59,0.045)] sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a8378]">Reporting period</p>
                <h2 className="mt-2 text-xl font-semibold">{monthLabel(selectedMonth)}</h2>
                <p className="mt-2 text-sm text-[#81796d]">This page never combines Guru Kids Pro and Dreamscape One figures.</p>
              </div>
              <label className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.13em] text-[#8a8378]">Month</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="min-h-11 rounded-xl border border-[#d9cfbd] bg-white px-4 text-sm font-bold outline-none"
                />
              </label>
            </div>
          </section>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {companyCode === "gkp" ? (
              <>
                <Metric label="Billed" value={loading ? "…" : money(summary?.billed_amount)} detail="Issued monthly tuition invoices for this billing period" />
                <Metric label="Gross collected" value={loading ? "…" : money(summary?.gross_collected)} detail="Payments received during the selected month" />
                <Metric label="Refunds" value={loading ? "…" : money(summary?.refunds)} detail="Refunds recorded during the selected month" />
                <Metric label="Net collected" value={loading ? "…" : money(summary?.net_collected)} detail="Gross collections less recorded refunds" emphasis />
              </>
            ) : (
              <>
                <Metric label="Gross subscriptions" value={loading ? "…" : money(summary?.gross_collected)} detail="Successful public subscription payments recorded this month" />
                <Metric label="Stripe refunds" value={loading ? "…" : money(summary?.refunds)} detail={`${dreamscapeRefunds.length} refund journal entr${dreamscapeRefunds.length === 1 ? "y" : "ies"}`} />
                <Metric label="Net subscriptions" value={loading ? "…" : money(summary?.net_collected)} detail="Gross subscription collections less recorded refunds" emphasis />
                <Metric label="Active subscribers" value={loading ? "…" : String(summary?.active_subscribers || 0)} detail={`${summary?.payment_issue_count || 0} with payment issues`} />
              </>
            )}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {companyCode === "gkp" ? (
              <Metric label="Invoice outstanding" value={loading ? "…" : money(summary?.outstanding)} detail="Balance remaining on this billing period's issued invoices" />
            ) : (
              <Metric label="MRR / ARR" value={loading ? "…" : `${money(summary?.mrr)} / ${money(summary?.arr)}`} detail="Current MRR and annualised recurring revenue" />
            )}
            <Metric label="Payroll paid" value={loading ? "…" : money(summary?.payroll_paid)} detail={`${money(summary?.payroll_pending)} payroll still pending`} />
            {companyCode === "dreamscape" ? (
              <Metric label="Affiliate payouts" value={loading ? "…" : money(summary?.affiliate_paid)} detail="Paid Dreamscape affiliate payout batches" />
            ) : (
              <Metric label="Other expenses paid" value={loading ? "…" : money(summary?.manual_expense_paid)} detail={`${money(summary?.manual_expense_pending)} other expenses pending`} />
            )}
            <Metric label="Cash result" value={loading ? "…" : money(summary?.cash_result)} detail="Net collections less paid payroll, paid expenses and affiliate payouts" emphasis />
          </div>

          <section className="mt-6 rounded-[2rem] border border-[#ded5c4] bg-white p-5 shadow-[0_20px_60px_rgba(21,35,59,0.045)] sm:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">Year-to-date</p>
                <h2 className="mt-2 text-xl font-semibold">Comparable YTD performance</h2>
                <p className="mt-2 text-sm text-[#81796d]">Compares January through {monthLabel(selectedMonth).split(" ")[0]} for the selected year against the same months one year earlier.</p>
              </div>
              <span className={`rounded-full border px-4 py-2 text-xs font-black ${yoyDifference >= 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                Net collections {yoyDifference >= 0 ? "+" : ""}{money(yoyDifference)}{yoyPercent === null ? "" : ` · ${yoyPercent >= 0 ? "+" : ""}${yoyPercent.toFixed(1)}%`}
              </span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label={`${yearSummary?.report_year || "Current"} YTD net`} value={money(yearSummary?.net_collected)} detail={`Refunds ${money(yearSummary?.refunds)}`} />
              <Metric label={`${previousYearSummary?.report_year || "Previous"} comparable net`} value={money(previousYearSummary?.net_collected)} detail="Same months in the prior year" />
              <Metric label="YTD cash expenses" value={money(yearSummary?.cash_expenses)} detail={`Payroll ${money(yearSummary?.payroll_paid)} · Other ${money(yearSummary?.other_expenses_paid)}`} />
              <Metric label="YTD cash result" value={money(yearSummary?.cash_result)} detail="Management cash-result view" emphasis />
            </div>
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(330px,0.75fr)]">
            <section className="rounded-[2rem] border border-[#ded5c4] bg-white p-5 shadow-[0_20px_60px_rgba(21,35,59,0.045)] sm:p-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">12-month trend</p>
                <h2 className="mt-2 text-xl font-semibold">Collections and cash result</h2>
              </div>
              <div className="mt-6 grid gap-4">
                {trend.map((row) => {
                  const rowMonth = String(row.period_start).slice(0, 7);
                  const net = amount(row.net_collected);
                  const result = amount(row.cash_result);
                  const width = `${Math.max(2, Math.round((Math.abs(net) / maxTrend) * 100))}%`;
                  return (
                    <div key={row.period_start} className="grid gap-2 sm:grid-cols-[90px_minmax(0,1fr)_210px] sm:items-center">
                      <strong className="text-xs">{monthLabel(rowMonth)}</strong>
                      <div className="h-3 overflow-hidden rounded-full bg-[#eee8dd]">
                        <div className="h-full rounded-full bg-[#15233b]" style={{ width }} />
                      </div>
                      <div className="text-xs text-[#81796d] sm:text-right">
                        {money(net)} net · <strong className={result < 0 ? "text-red-600" : "text-emerald-700"}>{money(result)}</strong> result
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[2rem] border border-[#ded5c4] bg-[#15233b] p-6 text-white shadow-[0_20px_60px_rgba(21,35,59,0.12)]">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#e8c474]">Cost view</p>
              <h2 className="mt-2 text-xl font-semibold">{monthLabel(selectedMonth)} tracked costs</h2>
              <dl className="mt-6 grid gap-3">
                <CostRow label="Payroll accrued" value={money(summary?.payroll_accrued)} />
                <CostRow label="Payroll paid" value={money(summary?.payroll_paid)} />
                <CostRow label="Other expenses accrued" value={money(summary?.manual_expense_accrued)} />
                <CostRow label="Other expenses paid" value={money(summary?.manual_expense_paid)} />
                {companyCode === "dreamscape" && <CostRow label="Affiliate payouts paid" value={money(summary?.affiliate_paid)} />}
                <CostRow label="Cash expenses" value={money(summary?.cash_expenses)} strong />
              </dl>
              <p className="mt-5 text-xs leading-5 text-white/55">
                Cash result is a management view, not a statutory profit-and-loss statement. Tax, CPF, SDL and formal accounting adjustments are not automatically calculated here.
              </p>
            </section>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <section className="rounded-[2rem] border border-[#ded5c4] bg-white p-5 shadow-[0_20px_60px_rgba(21,35,59,0.045)] sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">Payroll reporting</p>
              <h2 className="mt-2 text-xl font-semibold">Staff cost by role</h2>
              {roleCosts.length === 0 ? (
                <p className="mt-5 text-sm text-[#81796d]">No payroll entries for this month.</p>
              ) : (
                <div className="mt-5 grid gap-3">
                  {roleCosts.map((row) => (
                    <div key={row.staff_category} className="rounded-2xl border border-[#ebe5da] bg-[#fbfaf7] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <strong className="text-sm">{roleLabel(row.staff_category)}</strong>
                          <p className="mt-1 text-xs text-[#81796d]">{row.staff_count} staff · {row.payment_count} payroll entr{row.payment_count === 1 ? "y" : "ies"}</p>
                        </div>
                        <strong className="text-sm">{money(row.total_amount)}</strong>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#81796d] sm:grid-cols-4">
                        <span>Base {money(row.base_pay)}</span>
                        <span>Bonus {money(row.bonus)}</span>
                        <span>Pending {money(row.pending_amount)}</span>
                        <span>Paid {money(row.paid_amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[2rem] border border-[#ded5c4] bg-white p-5 shadow-[0_20px_60px_rgba(21,35,59,0.045)] sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">Expense analysis</p>
              <h2 className="mt-2 text-xl font-semibold">Other costs by category</h2>
              {expenseBreakdown.length === 0 ? (
                <p className="mt-5 text-sm text-[#81796d]">No non-payroll expenses for this month.</p>
              ) : (
                <div className="mt-5 grid gap-4">
                  {expenseBreakdown.map((row) => (
                    <div key={row.category}>
                      <div className="mb-2 flex items-center justify-between gap-4 text-xs">
                        <strong>{categoryLabel(row.category)}</strong>
                        <span>{money(row.total)}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-[#eee8dd]">
                        <div className="h-full rounded-full bg-[#a9782d]" style={{ width: `${Math.max(3, Math.round((row.total / maxExpenseCategory) * 100))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {companyCode === "dreamscape" && (
            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <section className="overflow-hidden rounded-[2rem] border border-[#ded5c4] bg-white shadow-[0_20px_60px_rgba(21,35,59,0.045)]">
                <div className="border-b border-[#ebe5da] px-5 py-5 sm:px-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">Subscription mix</p>
                  <h2 className="mt-2 text-xl font-semibold">Revenue by plan</h2>
                </div>
                {planRevenue.length === 0 ? (
                  <p className="p-6 text-sm text-[#81796d]">No subscription collections or refunds for this month.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] border-collapse text-left">
                      <thead><tr className="border-b border-[#ebe5da] bg-[#fbfaf7] text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]"><th className="px-5 py-4">Plan</th><th className="px-4 py-4">Payments</th><th className="px-4 py-4">Gross</th><th className="px-4 py-4">Refunds</th><th className="px-5 py-4">Net</th></tr></thead>
                      <tbody>
                        {planRevenue.map((row) => (
                          <tr key={row.plan_id} className="border-b border-[#f0ece4] last:border-0">
                            <td className="px-5 py-4"><strong className="block text-sm">{row.plan_name}</strong><span className="mt-1 block text-xs text-[#81796d]">{row.billing_cycle}</span></td>
                            <td className="px-4 py-4 text-sm">{row.payment_count}</td>
                            <td className="px-4 py-4 text-sm">{money(row.gross_collected)}</td>
                            <td className="px-4 py-4 text-sm text-red-600">{money(row.refunds)}</td>
                            <td className="px-5 py-4 text-sm font-black">{money(row.net_collected)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="overflow-hidden rounded-[2rem] border border-[#ded5c4] bg-white shadow-[0_20px_60px_rgba(21,35,59,0.045)]">
                <div className="border-b border-[#ebe5da] px-5 py-5 sm:px-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">Stripe refund journal</p>
                  <h2 className="mt-2 text-xl font-semibold">Recorded refunds</h2>
                  <p className="mt-1 text-xs text-[#81796d]">New refund deltas are captured automatically from changes to Dreamscape subscription payment refund totals.</p>
                </div>
                {dreamscapeRefunds.length === 0 ? (
                  <p className="p-6 text-sm text-[#81796d]">No Dreamscape refunds recorded for this month.</p>
                ) : (
                  <div className="max-h-[420px] overflow-auto">
                    {dreamscapeRefunds.map((row) => (
                      <div key={row.id} className="border-b border-[#f0ece4] px-5 py-4 last:border-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <strong className="block text-sm">{row.learner_name}</strong>
                            <span className="mt-1 block text-xs text-[#81796d]">{row.contract_reference} · {row.plan_name || "Plan unavailable"}</span>
                            <span className="mt-1 block text-[11px] text-[#9a9285]">{shortDate(row.refunded_at)} · {row.provider_environment || row.provider}</span>
                          </div>
                          <strong className="text-sm text-red-600">−{money(row.amount, row.currency)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          <section className="mt-6 overflow-hidden rounded-[2rem] border border-[#ded5c4] bg-white shadow-[0_20px_60px_rgba(21,35,59,0.045)]">
            <div className="flex flex-col gap-4 border-b border-[#ebe5da] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">Company expense ledger</p>
                <h2 className="mt-2 text-xl font-semibold">Other operating expenses</h2>
                <p className="mt-1 text-sm text-[#81796d]">Payroll is pulled automatically from Staff Payments and should not be entered again here.</p>
              </div>
              <button
                type="button"
                onClick={openNewExpense}
                disabled={working}
                className="min-h-11 rounded-full bg-[#15233b] px-5 text-xs font-black text-white"
              >
                + Add expense
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-sm text-[#81796d]">Loading expenses…</div>
            ) : expenses.length === 0 ? (
              <div className="px-6 py-14 text-center text-sm text-[#81796d]">No other expenses recorded for {monthLabel(selectedMonth)}.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#ebe5da] bg-[#fbfaf7] text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">
                      <th className="px-5 py-4">Date</th><th className="px-4 py-4">Category</th><th className="px-4 py-4">Description</th><th className="px-4 py-4">Vendor</th><th className="px-4 py-4">Amount</th><th className="px-4 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense.id} className="border-b border-[#f0ece4] last:border-b-0">
                        <td className="px-5 py-4 text-sm">{shortDate(expense.expense_date)}</td>
                        <td className="px-4 py-4 text-xs font-bold">{categoryLabel(expense.category)}</td>
                        <td className="px-4 py-4"><strong className="block text-sm">{expense.description}</strong>{expense.reference && <span className="mt-1 block text-[11px] text-[#8a8378]">Ref: {expense.reference}</span>}</td>
                        <td className="px-4 py-4 text-sm">{expense.vendor || "—"}</td>
                        <td className="px-4 py-4 text-sm font-black">{money(expense.amount)}</td>
                        <td className="px-4 py-4"><StatusPill status={expense.status} /></td>
                        <td className="px-5 py-4"><div className="flex justify-end gap-2">{expense.status !== "void" && <><button type="button" onClick={() => openEditExpense(expense)} className="rounded-full border border-[#d7c9ae] bg-white px-3 py-2 text-[11px] font-bold">Edit</button><button type="button" onClick={() => void voidExpense(expense)} disabled={working} className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700">Void</button></>}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {expenseModalOpen && (
            <Modal title={editingExpenseId ? "Edit expense" : "Add expense"} onClose={() => !working && setExpenseModalOpen(false)}>
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Expense date"><input type="date" value={expenseForm.expense_date} onChange={(event) => setExpenseForm((current) => ({ ...current, expense_date: event.target.value }))} className={inputClass} /></Field>
                  <Field label="Category"><select value={expenseForm.category} onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value }))} className={inputClass}>{CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                </div>
                <Field label="Description"><input value={expenseForm.description} onChange={(event) => setExpenseForm((current) => ({ ...current, description: event.target.value }))} className={inputClass} placeholder="e.g. October Meta ads" /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Vendor / payee"><input value={expenseForm.vendor} onChange={(event) => setExpenseForm((current) => ({ ...current, vendor: event.target.value }))} className={inputClass} /></Field>
                  <Field label="Amount (SGD)"><input type="number" min="0" step="0.01" value={expenseForm.amount} onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))} className={inputClass} /></Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Status"><select value={expenseForm.status} onChange={(event) => setExpenseForm((current) => ({ ...current, status: event.target.value as "pending" | "paid", paid_at: event.target.value === "paid" ? current.paid_at || current.expense_date : "" }))} className={inputClass}><option value="pending">Pending</option><option value="paid">Paid</option></select></Field>
                  {expenseForm.status === "paid" && <Field label="Paid date"><input type="date" value={expenseForm.paid_at} onChange={(event) => setExpenseForm((current) => ({ ...current, paid_at: event.target.value }))} className={inputClass} /></Field>}
                </div>
                {expenseForm.status === "paid" && <div className="grid gap-4 sm:grid-cols-2"><Field label="Payment method"><input value={expenseForm.payment_method} onChange={(event) => setExpenseForm((current) => ({ ...current, payment_method: event.target.value }))} className={inputClass} placeholder="PayNow / card / bank transfer" /></Field><Field label="Reference"><input value={expenseForm.reference} onChange={(event) => setExpenseForm((current) => ({ ...current, reference: event.target.value }))} className={inputClass} /></Field></div>}
                <Field label="Notes"><textarea rows={3} value={expenseForm.notes} onChange={(event) => setExpenseForm((current) => ({ ...current, notes: event.target.value }))} className={inputClass} /></Field>
                <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setExpenseModalOpen(false)} disabled={working} className="min-h-11 rounded-full border border-[#d7c9ae] bg-white px-5 text-xs font-bold">Cancel</button><button type="button" onClick={() => void saveExpense()} disabled={working} className="min-h-11 rounded-full bg-[#15233b] px-5 text-xs font-black text-white disabled:opacity-60">{working ? "Saving…" : "Save expense"}</button></div>
              </div>
            </Modal>
          )}
        </>
      )}
    </BillingAdminShell>
  );
}

const inputClass = "min-h-11 w-full rounded-xl border border-[#d9cfbd] bg-white px-4 text-sm outline-none focus:border-[#b98d3f]";

function Metric({ label, value, detail, emphasis = false }: { label: string; value: string; detail: string; emphasis?: boolean }) {
  return <article className={`rounded-[1.65rem] border p-5 ${emphasis ? "border-[#15233b] bg-[#15233b] text-white" : "border-[#ded5c4] bg-white"}`}><p className={`text-[10px] font-black uppercase tracking-[0.14em] ${emphasis ? "text-[#e8c474]" : "text-[#8a8378]"}`}>{label}</p><strong className="mt-3 block text-2xl font-semibold">{value}</strong><p className={`mt-2 text-xs leading-5 ${emphasis ? "text-white/55" : "text-[#8a8378]"}`}>{detail}</p></article>;
}

function CostRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex items-center justify-between gap-4 rounded-2xl px-4 py-3 ${strong ? "bg-white/10" : "bg-white/[0.05]"}`}><dt className="text-xs text-white/60">{label}</dt><dd className={`text-sm ${strong ? "font-black text-[#f0cf87]" : "font-bold"}`}>{value}</dd></div>;
}

function StatusPill({ status }: { status: string }) {
  const value = String(status || "unknown").toLowerCase();
  const classes = value === "paid" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : value === "pending" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-100 text-slate-500";
  return <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${classes}`}>{value}</span>;
}

function Alert({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  return <div className={`mb-5 rounded-2xl border p-4 text-sm ${tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{children}</div>;
}

function PanelMessage({ children }: { children: ReactNode }) {
  return <div className="rounded-[2rem] border border-[#ded5c4] bg-white p-8 text-sm text-[#81796d]">{children}</div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2"><span className="text-[10px] font-black uppercase tracking-[0.13em] text-[#8a8378]">{label}</span>{children}</label>;
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label={title}><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-[#ded5c4] bg-[#f8f5ef] shadow-[0_30px_100px_rgba(0,0,0,0.3)]"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#ded5c4] bg-[#f8f5ef]/95 px-6 py-5 backdrop-blur"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#a27627]">Company accounting</p><h2 className="mt-1 text-xl font-semibold">{title}</h2></div><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-[#d7c9ae] bg-white text-xl">×</button></div><div className="p-6">{children}</div></div></div>;
}
