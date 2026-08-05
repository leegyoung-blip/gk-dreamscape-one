"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import BillingAdminShell from "./_components/BillingAdminShell";
import { formatCurrency, formatDate, numberValue, singaporeToday } from "./_lib/billingUtils";

type PhaseStatus = {
  accounts: number | null;
  students: number | null;
  programmes: number | null;
  enrolments: number | null;
  invoices: number | null;
  payments: number | null;
  business_name: string | null;
  is_gst_registered: boolean | null;
};

type Settings = {
  business_name: string;
  currency: string;
  timezone: string;
  default_due_days: number;
  is_gst_registered: boolean;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  account_id: string;
  invoice_date: string;
  due_date: string;
  currency: string;
  status: string;
  total_amount: number | string;
  amount_paid: number | string;
  balance_due: number | string;
  created_at: string;
};

type AccountName = {
  id: string;
  payer_name: string;
  billing_email: string;
};

type RecentInvoice = InvoiceRow & {
  payer_name: string;
  billing_email: string;
};

const DEFAULT_STATUS: PhaseStatus = {
  accounts: 0,
  students: 0,
  programmes: 0,
  enrolments: 0,
  invoices: 0,
  payments: 0,
  business_name: "Guru Kids Pro",
  is_gst_registered: false,
};

const DEFAULT_SETTINGS: Settings = {
  business_name: "Guru Kids Pro",
  currency: "SGD",
  timezone: "Asia/Singapore",
  default_due_days: 7,
  is_gst_registered: false,
};

export default function BillingDashboardClient() {
  const [phaseStatus, setPhaseStatus] =
    useState<PhaseStatus>(DEFAULT_STATUS);
  const [settings, setSettings] =
    useState<Settings>(DEFAULT_SETTINGS);
  const [allInvoices, setAllInvoices] =
    useState<InvoiceRow[]>([]);
  const [recentInvoices, setRecentInvoices] =
    useState<RecentInvoice[]>([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    const [statusResult, settingsResult, invoicesResult] =
      await Promise.all([
        supabase
          .from("gkp_billing_phase1_status")
          .select("*")
          .maybeSingle(),
        supabase
          .from("gkp_billing_settings")
          .select(
            "business_name,currency,timezone,default_due_days,is_gst_registered",
          )
          .eq("id", true)
          .maybeSingle(),
        supabase
          .from("gkp_billing_invoices")
          .select(
            "id,invoice_number,account_id,invoice_date,due_date,currency,status,total_amount,amount_paid,balance_due,created_at",
          )
          .order("created_at", { ascending: false }),
      ]);

    const firstError =
      statusResult.error ||
      settingsResult.error ||
      invoicesResult.error;

    if (firstError) {
      setLoadError(firstError.message);
      setLoading(false);
      return;
    }

    const invoices = (invoicesResult.data || []) as InvoiceRow[];
    const accountIds = Array.from(
      new Set(invoices.map((invoice) => invoice.account_id)),
    );

    let accounts: AccountName[] = [];

    if (accountIds.length > 0) {
      const accountResult = await supabase
        .from("gkp_billing_accounts")
        .select("id,payer_name,billing_email")
        .in("id", accountIds);

      if (accountResult.error) {
        setLoadError(accountResult.error.message);
      } else {
        accounts = (accountResult.data || []) as AccountName[];
      }
    }

    const accountMap = new Map(
      accounts.map((account) => [account.id, account]),
    );

    setPhaseStatus(
      (statusResult.data as PhaseStatus | null) ?? DEFAULT_STATUS,
    );
    setSettings(
      (settingsResult.data as Settings | null) ?? DEFAULT_SETTINGS,
    );
    setAllInvoices(invoices);
    setRecentInvoices(
      invoices.slice(0, 7).map((invoice) => ({
        ...invoice,
        payer_name:
          accountMap.get(invoice.account_id)?.payer_name ||
          "Billing account",
        billing_email:
          accountMap.get(invoice.account_id)?.billing_email || "",
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const summary = useMemo(() => {
    const today = singaporeToday();

    return allInvoices.reduce(
      (current, invoice) => {
        const total = numberValue(invoice.total_amount);
        const paid = numberValue(invoice.amount_paid);
        const balance = numberValue(invoice.balance_due);
        const included = !["draft", "review", "void"].includes(
          invoice.status,
        );

        return {
          totalInvoiced:
            current.totalInvoiced + (included ? total : 0),
          collected: current.collected + (included ? paid : 0),
          outstanding:
            current.outstanding + (included ? balance : 0),
          overdue:
            current.overdue +
            (included &&
            invoice.status !== "paid" &&
            invoice.due_date < today &&
            balance > 0
              ? 1
              : 0),
        };
      },
      {
        totalInvoiced: 0,
        collected: 0,
        outstanding: 0,
        overdue: 0,
      },
    );
  }, [allInvoices]);

  return (
    <BillingAdminShell
      eyebrow="Billing administration"
      title="Overview"
      description="Manage prepaid tuition billing, family accounts, programme fees and payment records from one Guru Kids Pro workspace."
      actions={
        <>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading}
            className="inline-flex min-h-11 items-center rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold text-[#554d40] disabled:opacity-60"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <Link
            href="/admin/billing/accounts"
            className="inline-flex min-h-11 items-center rounded-full bg-[#15233b] px-5 text-xs font-bold text-white"
          >
            Add family
          </Link>
        </>
      }
    >
      {loadError && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {loadError}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Issued invoices"
          value={formatCurrency(
            summary.totalInvoiced,
            settings.currency,
          )}
          detail={`${numberValue(phaseStatus.invoices)} invoice records`}
        />
        <MetricCard
          label="Collected"
          value={formatCurrency(summary.collected, settings.currency)}
          detail={`${numberValue(phaseStatus.payments)} payment records`}
        />
        <MetricCard
          label="Outstanding"
          value={formatCurrency(
            summary.outstanding,
            settings.currency,
          )}
          detail={`${summary.overdue} overdue`}
        />
        <MetricCard
          label="Active families"
          value={String(numberValue(phaseStatus.accounts))}
          detail={`${numberValue(phaseStatus.students)} students`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.7fr)]">
        <section className="overflow-hidden rounded-[2rem] border border-[#ded5c4] bg-white shadow-[0_20px_60px_rgba(21,35,59,0.05)]">
          <div className="flex items-center justify-between gap-4 border-b border-[#ebe5da] px-5 py-5 sm:px-6">
            <div>
              <h2 className="text-xl font-semibold">Recent invoices</h2>
              <p className="mt-1 text-sm text-[#81796d]">
                Invoice creation begins in Phase 4.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-sm text-[#81796d]">
              Loading billing records…
            </div>
          ) : recentInvoices.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f1eadc] text-xl font-black text-[#a27627]">
                0
              </div>
              <h3 className="mt-4 text-lg font-semibold">
                No invoices yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#81796d]">
                Create family accounts, students and enrolments now.
                Monthly invoices will be generated in Phase 4.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-[#eee8dd] bg-[#fbfaf7] text-[11px] font-black uppercase tracking-[0.13em] text-[#8a8378]">
                    <th className="px-6 py-4">Invoice</th>
                    <th className="px-4 py-4">Payer</th>
                    <th className="px-4 py-4">Due</th>
                    <th className="px-4 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-[#f0ece4] last:border-0"
                    >
                      <td className="px-6 py-4">
                        <strong>{invoice.invoice_number}</strong>
                        <span className="mt-1 block text-xs text-[#928a7d]">
                          {formatDate(invoice.invoice_date)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <strong>{invoice.payer_name}</strong>
                        <span className="mt-1 block text-xs text-[#928a7d]">
                          {invoice.billing_email}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {formatDate(invoice.due_date)}
                      </td>
                      <td className="px-4 py-4 font-bold">
                        {formatCurrency(
                          numberValue(invoice.total_amount),
                          invoice.currency,
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-full border border-[#dfd5c1] bg-[#f7f4ed] px-3 py-1.5 text-xs font-bold capitalize">
                          {invoice.status.replaceAll("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="grid content-start gap-6">
          <section className="rounded-[2rem] border border-[#ded5c4] bg-[#15233b] p-6 text-white shadow-[0_20px_60px_rgba(21,35,59,0.12)]">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e8c474]">
              Phase 3 records
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Count label="Families" value={numberValue(phaseStatus.accounts)} />
              <Count label="Students" value={numberValue(phaseStatus.students)} />
              <Count label="Programmes" value={numberValue(phaseStatus.programmes)} />
              <Count label="Enrolments" value={numberValue(phaseStatus.enrolments)} />
            </div>
          </section>

          <section className="rounded-[2rem] border border-[#ded5c4] bg-white p-6 shadow-[0_20px_60px_rgba(21,35,59,0.05)]">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a27627]">
              Start here
            </p>
            <h2 className="mt-3 text-xl font-semibold">
              Set up billing records
            </h2>
            <div className="mt-4 grid gap-3">
              <Link
                href="/admin/billing/programmes"
                className="rounded-2xl border border-[#ded5c4] bg-[#fbfaf7] p-4 text-sm font-bold transition hover:border-[#bd9650]"
              >
                1. Add programmes and standard fees
              </Link>
              <Link
                href="/admin/billing/accounts"
                className="rounded-2xl border border-[#ded5c4] bg-[#fbfaf7] p-4 text-sm font-bold transition hover:border-[#bd9650]"
              >
                2. Add families, students and enrolments
              </Link>
            </div>
          </section>
        </div>
      </div>
    </BillingAdminShell>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-[1.75rem] border border-[#ded5c4] bg-white p-5 shadow-[0_18px_50px_rgba(21,35,59,0.04)]">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#857d70]">
        {label}
      </p>
      <strong className="mt-3 block break-words text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
        {value}
      </strong>
      <p className="mt-3 text-xs leading-5 text-[#8a8378]">
        {detail}
      </p>
    </article>
  );
}

function Count({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <strong className="block text-2xl text-[#f3d38c]">
        {value}
      </strong>
      <span className="mt-1 block text-xs text-white/60">
        {label}
      </span>
    </div>
  );
}
