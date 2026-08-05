"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AccessStatus = "checking" | "allowed" | "locked" | "error";

type PhaseStatusRow = {
  accounts: number | null;
  students: number | null;
  programmes: number | null;
  enrolments: number | null;
  invoices: number | null;
  payments: number | null;
  business_name: string | null;
  is_gst_registered: boolean | null;
};

type BillingSettings = {
  business_name: string;
  currency: string;
  timezone: string;
  default_due_days: number;
  is_gst_registered: boolean;
};

type InvoiceStatus =
  | "draft"
  | "review"
  | "issued"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "void";

type InvoiceRow = {
  id: string;
  invoice_number: string;
  account_id: string;
  invoice_kind: string;
  billing_period: string | null;
  invoice_date: string;
  due_date: string;
  currency: string;
  status: InvoiceStatus;
  total_amount: number | string;
  amount_paid: number | string;
  balance_due: number | string;
  created_at: string;
};

type AccountRow = {
  id: string;
  payer_name: string;
  billing_email: string;
};

type RecentInvoice = InvoiceRow & {
  payer_name: string;
  billing_email: string;
};

type DashboardSummary = {
  totalInvoiced: number;
  collected: number;
  outstanding: number;
  overdueCount: number;
  draftCount: number;
};

const EMPTY_PHASE_STATUS: PhaseStatusRow = {
  accounts: 0,
  students: 0,
  programmes: 0,
  enrolments: 0,
  invoices: 0,
  payments: 0,
  business_name: "Guru Kids Pro",
  is_gst_registered: false,
};

const EMPTY_SUMMARY: DashboardSummary = {
  totalInvoiced: 0,
  collected: 0,
  outstanding: 0,
  overdueCount: 0,
  draftCount: 0,
};

function numberValue(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function singaporeToday() {
  const parts = new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function formatCurrency(amount: number, currency = "SGD") {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(`${value.slice(0, 10)}T12:00:00+08:00`);

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatStatus(status: InvoiceStatus) {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function statusClasses(status: InvoiceStatus) {
  switch (status) {
    case "paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "partially_paid":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "issued":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "overdue":
      return "border-red-200 bg-red-50 text-red-700";
    case "review":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "void":
      return "border-slate-200 bg-slate-100 text-slate-500";
    default:
      return "border-[#dfd5c1] bg-[#f7f4ed] text-[#6b6253]";
  }
}

export default function BillingDashboardClient() {
  const router = useRouter();

  const [accessStatus, setAccessStatus] =
    useState<AccessStatus>("checking");
  const [roleLabel, setRoleLabel] = useState("Billing staff");
  const [userEmail, setUserEmail] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [phaseStatus, setPhaseStatus] =
    useState<PhaseStatusRow>(EMPTY_PHASE_STATUS);
  const [settings, setSettings] = useState<BillingSettings>({
    business_name: "Guru Kids Pro",
    currency: "SGD",
    timezone: "Asia/Singapore",
    default_due_days: 7,
    is_gst_registered: false,
  });
  const [summary, setSummary] =
    useState<DashboardSummary>(EMPTY_SUMMARY);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);

  const loadBillingDashboard = useCallback(
    async (showRefreshState = false) => {
      if (showRefreshState) {
        setIsRefreshing(true);
      }

      setLoadError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setAccessStatus("error");
        setLoadError(userError.message);
        setIsRefreshing(false);
        return;
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      setUserEmail(user.email ?? "");

      const [accessResult, profileResult] = await Promise.all([
        supabase.rpc("gkp_is_billing_staff"),
        supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      if (accessResult.error) {
        setAccessStatus("error");
        setLoadError(
          `Billing access check failed: ${accessResult.error.message}. Confirm that Phase 1 SQL was run successfully.`,
        );
        setIsRefreshing(false);
        return;
      }

      if (!Boolean(accessResult.data)) {
        setAccessStatus("locked");
        setIsRefreshing(false);
        return;
      }

      const profileRole = String(profileResult.data?.role || "")
        .trim()
        .toLowerCase()
        .replaceAll("_", " ")
        .replaceAll("-", " ");

      setRoleLabel(
        profileRole === "admin"
          ? "Administrator"
          : profileRole
            ? profileRole.replace(/\b\w/g, (letter) => letter.toUpperCase())
            : "Billing staff",
      );

      setAccessStatus("allowed");

      const [phaseResult, settingsResult, invoicesResult] = await Promise.all([
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
            "id,invoice_number,account_id,invoice_kind,billing_period,invoice_date,due_date,currency,status,total_amount,amount_paid,balance_due,created_at",
          )
          .order("created_at", { ascending: false }),
      ]);

      const firstError =
        phaseResult.error || settingsResult.error || invoicesResult.error;

      if (firstError) {
        setLoadError(
          `Billing data could not be loaded: ${firstError.message}`,
        );
        setIsRefreshing(false);
        return;
      }

      const loadedPhaseStatus =
        (phaseResult.data as PhaseStatusRow | null) ?? EMPTY_PHASE_STATUS;

      const loadedSettings =
        (settingsResult.data as BillingSettings | null) ?? settings;

      const invoices = (invoicesResult.data || []) as InvoiceRow[];
      const accountIds = Array.from(
        new Set(invoices.map((invoice) => invoice.account_id)),
      );

      let accounts: AccountRow[] = [];

      if (accountIds.length > 0) {
        const accountsResult = await supabase
          .from("gkp_billing_accounts")
          .select("id,payer_name,billing_email")
          .in("id", accountIds);

        if (accountsResult.error) {
          setLoadError(
            `Invoices loaded, but billing account names could not be loaded: ${accountsResult.error.message}`,
          );
        } else {
          accounts = (accountsResult.data || []) as AccountRow[];
        }
      }

      const accountMap = new Map(
        accounts.map((account) => [account.id, account]),
      );

      const issuedInvoices = invoices.filter(
        (invoice) =>
          invoice.status !== "draft" &&
          invoice.status !== "review" &&
          invoice.status !== "void",
      );

      const today = singaporeToday();

      const computedSummary = issuedInvoices.reduce<DashboardSummary>(
        (current, invoice) => {
          const totalAmount = numberValue(invoice.total_amount);
          const amountPaid = numberValue(invoice.amount_paid);
          const balanceDue = numberValue(invoice.balance_due);

          return {
            totalInvoiced: current.totalInvoiced + totalAmount,
            collected: current.collected + amountPaid,
            outstanding: current.outstanding + balanceDue,
            overdueCount:
              current.overdueCount +
              (invoice.due_date < today &&
              invoice.status !== "paid" &&
              balanceDue > 0
                ? 1
                : 0),
            draftCount: current.draftCount,
          };
        },
        {
          ...EMPTY_SUMMARY,
          draftCount: invoices.filter(
            (invoice) =>
              invoice.status === "draft" || invoice.status === "review",
          ).length,
        },
      );

      const latestInvoices = invoices.slice(0, 7).map((invoice) => {
        const account = accountMap.get(invoice.account_id);

        return {
          ...invoice,
          payer_name: account?.payer_name || "Billing account",
          billing_email: account?.billing_email || "",
        };
      });

      setPhaseStatus(loadedPhaseStatus);
      setSettings(loadedSettings);
      setSummary(computedSummary);
      setRecentInvoices(latestInvoices);
      setIsRefreshing(false);
    },
    [router],
  );

  useEffect(() => {
    void loadBillingDashboard();
  }, [loadBillingDashboard]);

  const collectionRate = useMemo(() => {
    if (summary.totalInvoiced <= 0) return 0;

    return Math.min(
      100,
      Math.round((summary.collected / summary.totalInvoiced) * 100),
    );
  }, [summary.collected, summary.totalInvoiced]);

  if (accessStatus === "checking") {
    return <FullPageMessage text="Checking GKP billing access…" />;
  }

  if (accessStatus === "locked") {
    return (
      <main className="min-h-screen bg-[#f5f2ea] p-6 text-[#15233b]">
        <div className="mx-auto mt-16 max-w-xl rounded-[2rem] border border-[#dfd5c1] bg-white p-8 shadow-[0_24px_70px_rgba(21,35,59,0.08)]">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#a27627]">
            Guru Kids Pro Billing
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Access restricted</h1>
          <p className="mt-4 leading-7 text-[#667085]">
            This dashboard is available only to Dreamscape administrators and
            active billing staff.
          </p>
          <Link
            href="/profile"
            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[#15233b] px-6 text-sm font-bold text-white"
          >
            Return to profile
          </Link>
        </div>
      </main>
    );
  }

  if (accessStatus === "error") {
    return (
      <main className="min-h-screen bg-[#f5f2ea] p-6 text-[#15233b]">
        <div className="mx-auto mt-16 max-w-2xl rounded-[2rem] border border-red-200 bg-white p-8 shadow-[0_24px_70px_rgba(21,35,59,0.08)]">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-red-600">
            Billing setup error
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            The billing dashboard could not open
          </h1>
          <p className="mt-4 break-words leading-7 text-[#667085]">
            {loadError || "An unexpected access error occurred."}
          </p>
          <button
            type="button"
            onClick={() => void loadBillingDashboard(true)}
            className="mt-7 min-h-12 rounded-full bg-[#15233b] px-6 text-sm font-bold text-white"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f2ea] text-[#15233b]">
      <header className="sticky top-0 z-40 border-b border-[#ded5c4] bg-[#f5f2ea]/95 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex min-h-14 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#15233b] text-sm font-black text-[#e8c474]">
              GKP
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black">Guru Kids Pro Billing</p>
              <p className="truncate text-xs text-[#7b756a]">
                {userEmail || roleLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadBillingDashboard(true)}
              disabled={isRefreshing}
              className="hidden min-h-10 items-center rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold text-[#50483b] transition hover:border-[#b8934d] disabled:cursor-wait disabled:opacity-60 sm:inline-flex"
            >
              {isRefreshing ? "Refreshing…" : "Refresh"}
            </button>
            <Link
              href="/profile"
              className="inline-flex min-h-10 items-center rounded-full bg-[#15233b] px-4 text-xs font-bold text-white"
            >
              Profile
            </Link>
          </div>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-81px)] lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="border-b border-[#ded5c4] bg-[#ebe4d8] px-4 py-4 lg:border-b-0 lg:border-r lg:px-3 lg:py-5">
          <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:sticky lg:top-[101px] lg:grid-cols-1">
            <SidebarItem label="Overview" icon="▦" active />

            <SidebarItem
              label="Billing Accounts"
              icon="◎"
              phase="Phase 3"
              disabled
            />

            <SidebarItem
              label="Programmes"
              icon="▤"
              phase="Phase 3"
              disabled
            />

            <SidebarItem
              label="Invoices"
              icon="□"
              phase="Phase 4"
              disabled
            />

            <SidebarItem
              label="Payments"
              icon="$"
              phase="Phase 6"
              disabled
            />

            <SidebarItem
              label="Settings"
              icon="⚙"
              phase="Later"
              disabled
            />

            <div className="col-span-2 mt-2 hidden rounded-2xl border border-[#d8c9ad] bg-white/65 p-4 text-xs leading-5 text-[#6f675a] sm:col-span-3 lg:col-span-1 lg:block">
              <strong className="block text-[#15233b]">Phase 2</strong>
              Protected dashboard shell and live Supabase overview.
            </div>
          </nav>
        </aside>

        <section className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1500px]">
            <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#a27627]">
                  Billing administration
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                  Overview
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6f6a61] sm:text-base">
                  Manage prepaid tuition invoices, family accounts and payment
                  records from one Guru Kids Pro workspace.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <StatusPill
                  label={`${roleLabel} access`}
                  tone="success"
                />
                <StatusPill
                  label={
                    settings.is_gst_registered
                      ? "GST billing enabled"
                      : "Non-GST invoices"
                  }
                  tone="neutral"
                />
              </div>
            </div>

            {loadError && (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                {loadError}
              </div>
            )}

            <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                eyebrow="Issued invoices"
                value={formatCurrency(
                  summary.totalInvoiced,
                  settings.currency,
                )}
                supporting={`${numberValue(phaseStatus.invoices)} total invoice records`}
                accent="gold"
              />
              <MetricCard
                eyebrow="Collected"
                value={formatCurrency(
                  summary.collected,
                  settings.currency,
                )}
                supporting={`${collectionRate}% collection rate`}
                accent="green"
              />
              <MetricCard
                eyebrow="Outstanding"
                value={formatCurrency(
                  summary.outstanding,
                  settings.currency,
                )}
                supporting={`${summary.overdueCount} overdue invoice${summary.overdueCount === 1 ? "" : "s"}`}
                accent={summary.overdueCount > 0 ? "red" : "navy"}
              />
              <MetricCard
                eyebrow="Draft review"
                value={String(summary.draftCount)}
                supporting="Draft and review invoices"
                accent="navy"
              />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
              <section className="overflow-hidden rounded-[2rem] border border-[#ded5c4] bg-white shadow-[0_20px_60px_rgba(21,35,59,0.055)]">
                <div className="flex items-center justify-between gap-4 border-b border-[#ebe5da] px-5 py-5 sm:px-6">
                  <div>
                    <h2 className="text-xl font-semibold">Recent invoices</h2>
                    <p className="mt-1 text-sm text-[#81796d]">
                      Live records from Supabase
                    </p>
                  </div>
                  <span className="rounded-full bg-[#f1eadc] px-3 py-2 text-xs font-black text-[#8a682c]">
                    {numberValue(phaseStatus.invoices)} total
                  </span>
                </div>

                {recentInvoices.length === 0 ? (
                  <EmptyInvoices />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-left">
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
                            className="border-b border-[#f0ece4] last:border-b-0"
                          >
                            <td className="px-6 py-4">
                              <p className="font-bold text-[#15233b]">
                                {invoice.invoice_number}
                              </p>
                              <p className="mt-1 text-xs text-[#928a7d]">
                                {formatDate(invoice.invoice_date)}
                              </p>
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-medium">
                                {invoice.payer_name}
                              </p>
                              <p className="mt-1 max-w-[220px] truncate text-xs text-[#928a7d]">
                                {invoice.billing_email || "No email"}
                              </p>
                            </td>
                            <td className="px-4 py-4 text-sm">
                              {formatDate(invoice.due_date)}
                            </td>
                            <td className="px-4 py-4 font-bold">
                              {formatCurrency(
                                numberValue(invoice.total_amount),
                                invoice.currency || settings.currency,
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${statusClasses(
                                  invoice.status,
                                )}`}
                              >
                                {formatStatus(invoice.status)}
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
                    Database foundation
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold">
                    Phase 1 connected
                  </h2>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <DatabaseCount
                      label="Families"
                      value={numberValue(phaseStatus.accounts)}
                    />
                    <DatabaseCount
                      label="Students"
                      value={numberValue(phaseStatus.students)}
                    />
                    <DatabaseCount
                      label="Programmes"
                      value={numberValue(phaseStatus.programmes)}
                    />
                    <DatabaseCount
                      label="Enrolments"
                      value={numberValue(phaseStatus.enrolments)}
                    />
                    <DatabaseCount
                      label="Invoices"
                      value={numberValue(phaseStatus.invoices)}
                    />
                    <DatabaseCount
                      label="Payments"
                      value={numberValue(phaseStatus.payments)}
                    />
                  </div>
                </section>

                <section className="rounded-[2rem] border border-[#ded5c4] bg-white p-6 shadow-[0_20px_60px_rgba(21,35,59,0.055)]">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a27627]">
                    Billing configuration
                  </p>
                  <dl className="mt-5 grid gap-4 text-sm">
                    <SettingsRow
                      label="Business"
                      value={settings.business_name}
                    />
                    <SettingsRow
                      label="Currency"
                      value={settings.currency}
                    />
                    <SettingsRow
                      label="Timezone"
                      value={settings.timezone}
                    />
                    <SettingsRow
                      label="Default due period"
                      value={`${settings.default_due_days} days`}
                    />
                    <SettingsRow
                      label="Document type"
                      value={
                        settings.is_gst_registered
                          ? "GST tax invoice"
                          : "Standard invoice"
                      }
                    />
                  </dl>
                </section>
              </div>
            </div>

            <section className="mt-6 rounded-[2rem] border border-[#ded5c4] bg-white p-5 shadow-[0_20px_60px_rgba(21,35,59,0.045)] sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a27627]">
                    Next build phase
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    Family, student and programme management
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#777065]">
                    Phase 3 will make the sidebar records editable without using
                    SQL manually.
                  </p>
                </div>
                <span className="inline-flex w-fit rounded-full border border-[#d9c49a] bg-[#f8f1e3] px-4 py-2 text-xs font-black text-[#8b6829]">
                  Phase 3
                </span>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function SidebarItem({
  label,
  icon,
  active = false,
  disabled = false,
  phase,
}: {
  label: string;
  icon: string;
  active?: boolean;
  disabled?: boolean;
  phase?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-current={active ? "page" : undefined}
      className={`min-h-12 rounded-2xl border px-3 py-2 text-left transition ${
        active
          ? "border-[#15233b] bg-[#15233b] text-white"
          : "border-transparent bg-white/45 text-[#4f4a42]"
      } ${disabled ? "cursor-not-allowed opacity-70" : "hover:bg-white"}`}
    >
      <span className="flex items-center gap-3">
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-black ${
            active
              ? "bg-white/10 text-[#e8c474]"
              : "bg-[#e8dfcf] text-[#7d6234]"
          }`}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block truncate text-sm">{label}</strong>
          {phase && (
            <small className="block truncate text-[10px] font-bold uppercase tracking-[0.1em] opacity-60">
              {phase}
            </small>
          )}
        </span>
      </span>
    </button>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "neutral";
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-2 text-xs font-bold ${
        tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-[#d7c9ae] bg-white text-[#6e6351]"
      }`}
    >
      {label}
    </span>
  );
}

function MetricCard({
  eyebrow,
  value,
  supporting,
  accent,
}: {
  eyebrow: string;
  value: string;
  supporting: string;
  accent: "gold" | "green" | "red" | "navy";
}) {
  const accentClass = {
    gold: "bg-[#c39743]",
    green: "bg-emerald-500",
    red: "bg-red-500",
    navy: "bg-[#15233b]",
  }[accent];

  return (
    <article className="relative overflow-hidden rounded-[1.75rem] border border-[#ded5c4] bg-white p-5 shadow-[0_18px_50px_rgba(21,35,59,0.045)]">
      <span
        className={`absolute left-0 top-0 h-full w-1.5 ${accentClass}`}
        aria-hidden="true"
      />
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#857d70]">
        {eyebrow}
      </p>
      <strong className="mt-3 block break-words text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
        {value}
      </strong>
      <p className="mt-3 text-xs leading-5 text-[#8a8378]">{supporting}</p>
    </article>
  );
}

function DatabaseCount({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <strong className="block text-2xl text-[#f3d38c]">{value}</strong>
      <span className="mt-1 block text-xs text-white/60">{label}</span>
    </div>
  );
}

function SettingsRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#eee9df] pb-4 last:border-b-0 last:pb-0">
      <dt className="text-[#827b70]">{label}</dt>
      <dd className="max-w-[55%] text-right font-bold text-[#15233b]">
        {value}
      </dd>
    </div>
  );
}

function EmptyInvoices() {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f1eadc] text-xl font-black text-[#a27627]">
        0
      </div>
      <h3 className="mt-4 text-lg font-semibold">No invoices yet</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#81796d]">
        This is correct for a new billing database. Family accounts and
        enrolments will be added in Phase 3 before monthly invoices are
        generated.
      </p>
    </div>
  );
}

function FullPageMessage({ text }: { text: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f2ea] p-6 text-[#15233b]">
      <div className="rounded-3xl border border-[#dfd5c1] bg-white px-7 py-6 text-sm font-bold shadow-[0_20px_60px_rgba(21,35,59,0.08)]">
        {text}
      </div>
    </main>
  );
}
