"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import BillingAdminShell from "../_components/BillingAdminShell";
import { supabase } from "@/lib/supabase";

type DreamscapeView =
  | "overview"
  | "subscribers"
  | "plans"
  | "payments"
  | "settings";

type Plan = {
  id: string;
  plan_key: string;
  display_name: string;
  plan_code: string;
  billing_cycle: string;
  audience: string;
  amount: number | string;
  currency: string;
  provider: string;
  is_available: boolean;
  is_coming_soon: boolean;
  stripe_test_price_id?: string | null;
  stripe_live_price_id?: string | null;
  hitpay_plan_id?: string | null;
  provider_environment?: string | null;
};

type Contract = {
  id: string;
  reference: string;
  plan_key: string;
  display_name: string;
  plan_code: string;
  billing_cycle: string;
  amount: number | string;
  currency: string;
  parent_name: string;
  parent_email: string;
  learner_name: string;
  learner_email: string;
  learner_user_id: string | null;
  provider: string;
  provider_environment: string | null;
  provider_subscription_id: string | null;
  provider_status: string | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  next_billing_at: string | null;
  grace_until: string | null;
  last_successful_charge_at: string | null;
  failed_charge_count: number;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
};

type Metrics = {
  active_count: number;
  setup_pending_count: number;
  payment_issue_count: number;
  cancelling_count: number;
  suspended_count: number;
  monthly_recurring_revenue: number | string;
  annual_contract_value: number | string;
};

type Settings = {
  public_checkout_enabled: boolean;
  failed_payment_grace_days: number;
  updated_at: string;
};

type Payment = {
  id: string;
  provider_charge_id?: string | null;
  provider_invoice_id?: string | null;
  amount: number | string;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
};

type AddonWarning = {
  addon_id: string;
  student_name: string;
  payer_name: string;
  warning_message: string;
};

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown, currency = "SGD") {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(numberValue(value));
}

function date(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function firstRow<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T | undefined) || null;
  return (value as T | null) || null;
}

export default function DreamscapeWorkspaceClient({
  view = "overview",
}: {
  view?: DreamscapeView;
}) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [warnings, setWarnings] = useState<AddonWarning[]>([]);
  const [search, setSearch] = useState("");
  const [selectedContractId, setSelectedContractId] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const [plansResult, contractsResult, metricsResult, settingsResult, warningsResult] =
      await Promise.all([
        supabase.rpc("gkp_get_dreamscape_subscription_plans_v2"),
        supabase.rpc("gkp_get_dreamscape_subscription_contracts", {
          p_limit: 500,
        }),
        supabase.rpc("gkp_get_dreamscape_subscription_metrics"),
        supabase.rpc("gkp_get_dreamscape_billing_settings"),
        supabase.rpc("gkp_get_gkp_dreamscape_addon_warnings"),
      ]);

    const firstError =
      plansResult.error ||
      contractsResult.error ||
      metricsResult.error ||
      settingsResult.error ||
      warningsResult.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setPlans((plansResult.data || []) as Plan[]);
    setContracts((contractsResult.data || []) as Contract[]);
    setMetrics(firstRow<Metrics>(metricsResult.data));
    setSettings(firstRow<Settings>(settingsResult.data));
    setWarnings((warningsResult.data || []) as AddonWarning[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadPayments(contractId: string) {
    setSelectedContractId(contractId);
    setPayments([]);
    setError("");

    if (!contractId) return;

    const { data, error: paymentError } = await supabase.rpc(
      "gkp_get_dreamscape_subscription_payments",
      { p_contract_id: contractId },
    );

    if (paymentError) {
      setError(paymentError.message);
      return;
    }

    setPayments((data || []) as Payment[]);
  }

  async function togglePublicCheckout() {
    if (!settings) return;

    const next = !settings.public_checkout_enabled;
    if (
      next &&
      !window.confirm(
        "Enable public Dreamscape checkout? Confirm the live Stripe prices, webhook and checkout flow have been tested first.",
      )
    ) {
      return;
    }

    setWorking(true);
    setError("");
    setNotice("");

    const { error: rpcError } = await supabase.rpc(
      "gkp_set_dreamscape_public_checkout_enabled",
      { p_enabled: next },
    );

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setNotice(
        next
          ? "Public Dreamscape checkout enabled."
          : "Public Dreamscape checkout disabled.",
      );
      await load();
    }

    setWorking(false);
  }

  const filteredContracts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contracts;
    return contracts.filter((contract) =>
      [
        contract.reference,
        contract.learner_name,
        contract.learner_email,
        contract.parent_name,
        contract.parent_email,
        contract.display_name,
        contract.status,
        contract.provider,
        contract.provider_status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [contracts, search]);

  const selectedContract =
    contracts.find((contract) => contract.id === selectedContractId) || null;

  if (view === "subscribers") {
    return (
      <BillingAdminShell
        eyebrow="Dreamscape One subscriptions"
        title="Subscribers"
        description="View Dreamscape subscriber records, current plans, provider status and renewal dates from the Dreamscape workspace."
        actions={<RefreshButton loading={loading} working={working} onClick={load} />}
      >
        <Messages error={error} notice={notice} />
        <section className="rounded-[2rem] border border-[#ded5c4] bg-white p-5 shadow-[0_20px_60px_rgba(21,35,59,0.045)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">Subscriber directory</p>
              <h2 className="mt-2 text-xl font-semibold">{contracts.length} subscription records</h2>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search learner, parent, plan or status"
              className="min-h-11 w-full rounded-xl border border-[#d9cfbd] bg-white px-4 text-sm outline-none sm:max-w-sm"
            />
          </div>
          {loading ? (
            <p className="mt-6 text-sm text-[#81796d]">Loading subscribers…</p>
          ) : filteredContracts.length === 0 ? (
            <Empty text="No Dreamscape subscription records match this view." />
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse text-left">
                <thead><tr className="border-b border-[#ebe5da] bg-[#fbfaf7] text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]"><th className="px-4 py-3">Learner</th><th className="px-4 py-3">Parent</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Paid through</th><th className="px-4 py-3">Next billing</th><th className="px-4 py-3">Provider</th></tr></thead>
                <tbody>
                  {filteredContracts.map((contract) => (
                    <tr key={contract.id} className="border-b border-[#f0ece4] last:border-0">
                      <td className="px-4 py-4"><strong className="block text-sm">{contract.learner_name}</strong><span className="mt-1 block text-xs text-[#81796d]">{contract.learner_email}</span></td>
                      <td className="px-4 py-4"><strong className="block text-sm">{contract.parent_name}</strong><span className="mt-1 block text-xs text-[#81796d]">{contract.parent_email}</span></td>
                      <td className="px-4 py-4 text-sm">{contract.display_name}<span className="mt-1 block text-xs capitalize text-[#81796d]">{contract.billing_cycle}</span></td>
                      <td className="px-4 py-4"><StatusPill status={contract.status} /></td>
                      <td className="px-4 py-4 text-sm">{date(contract.current_period_end)}</td>
                      <td className="px-4 py-4 text-sm">{date(contract.next_billing_at)}</td>
                      <td className="px-4 py-4 text-xs"><strong className="capitalize">{contract.provider || "—"}</strong><span className="mt-1 block text-[#81796d]">{contract.provider_status || "—"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </BillingAdminShell>
    );
  }

  if (view === "plans") {
    return (
      <BillingAdminShell
        eyebrow="Dreamscape One subscriptions"
        title="Plans"
        description="Review Dreamscape subscription products and their current billing-provider mappings."
        actions={<RefreshButton loading={loading} working={working} onClick={load} />}
      >
        <Messages error={error} notice={notice} />
        <section className="rounded-[2rem] border border-[#ded5c4] bg-white p-5 shadow-[0_20px_60px_rgba(21,35,59,0.045)] sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">Subscription catalogue</p><h2 className="mt-2 text-xl font-semibold">Dreamscape plans</h2></div>
            <span className="rounded-full border border-[#ded5c4] bg-[#fbfaf7] px-3 py-2 text-xs font-bold">{plans.length} plans</span>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead><tr className="border-b border-[#ebe5da] bg-[#fbfaf7] text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]"><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Audience</th><th className="px-4 py-3">Billing</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Provider</th><th className="px-4 py-3">Availability</th></tr></thead>
              <tbody>{plans.map((plan) => <tr key={plan.id} className="border-b border-[#f0ece4] last:border-0"><td className="px-4 py-4"><strong className="block text-sm">{plan.display_name}</strong><span className="mt-1 block text-xs text-[#81796d]">{plan.plan_key}</span></td><td className="px-4 py-4 text-sm capitalize">{plan.audience}</td><td className="px-4 py-4 text-sm capitalize">{plan.billing_cycle}</td><td className="px-4 py-4 text-sm font-bold">{money(plan.amount, plan.currency)}</td><td className="px-4 py-4 text-sm capitalize">{plan.provider || "—"}</td><td className="px-4 py-4"><StatusPill status={plan.is_coming_soon ? "coming soon" : plan.is_available ? "available" : "inactive"} /></td></tr>)}</tbody>
            </table>
          </div>
          <p className="mt-4 text-xs leading-5 text-[#81796d]">Phase 3 keeps the existing Stripe subscription engine untouched. Provider-product creation and price-ID maintenance remain handled by the current Dreamscape Stripe integration.</p>
        </section>
      </BillingAdminShell>
    );
  }

  if (view === "payments") {
    return (
      <BillingAdminShell
        eyebrow="Dreamscape One finance"
        title="Payments & Refunds"
        description="Inspect subscription payment history by subscriber. Company-level totals now flow into Dreamscape Accounting separately from Guru Kids Pro."
        actions={<RefreshButton loading={loading} working={working} onClick={load} />}
      >
        <Messages error={error} notice={notice} />
        <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="rounded-[2rem] border border-[#ded5c4] bg-white p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">Subscriber</p>
            <select value={selectedContractId} onChange={(event) => void loadPayments(event.target.value)} className="mt-3 min-h-12 w-full rounded-xl border border-[#d9cfbd] bg-white px-4 text-sm font-bold">
              <option value="">Choose subscriber</option>
              {contracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.learner_name} · {contract.display_name}</option>)}
            </select>
            {selectedContract && <div className="mt-4 rounded-2xl bg-[#fbfaf7] p-4 text-sm"><strong className="block">{selectedContract.learner_name}</strong><span className="mt-1 block text-xs text-[#81796d]">{selectedContract.parent_name} · {selectedContract.parent_email}</span><span className="mt-3 block text-xs font-bold capitalize">{selectedContract.provider} · {selectedContract.status}</span></div>}
          </div>
          <div className="rounded-[2rem] border border-[#ded5c4] bg-white p-5">
            <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">Payment history</p><h2 className="mt-2 text-xl font-semibold">Subscription transactions</h2></div><span className="rounded-full border border-[#ded5c4] bg-[#fbfaf7] px-3 py-2 text-xs font-bold">{payments.length}</span></div>
            {!selectedContractId ? <Empty text="Choose a subscriber to view payment history." /> : payments.length === 0 ? <Empty text="No payment records were returned for this subscriber." /> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead><tr className="border-b border-[#ebe5da] bg-[#fbfaf7] text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]"><th className="px-4 py-3">Date</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Provider reference</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id} className="border-b border-[#f0ece4] last:border-0"><td className="px-4 py-4 text-sm">{date(payment.paid_at || payment.created_at)}</td><td className="px-4 py-4 text-sm font-bold">{money(payment.amount, payment.currency)}</td><td className="px-4 py-4"><StatusPill status={payment.status} /></td><td className="px-4 py-4 text-xs text-[#81796d]">{payment.provider_charge_id || payment.provider_invoice_id || "—"}</td></tr>)}</tbody></table></div>}
          </div>
        </section>
      </BillingAdminShell>
    );
  }

  if (view === "settings") {
    return (
      <BillingAdminShell
        eyebrow="Dreamscape One system"
        title="Settings"
        description="Dreamscape-specific billing controls. GKP tuition settings remain isolated in the Guru Kids Pro workspace."
        actions={<RefreshButton loading={loading} working={working} onClick={load} />}
      >
        <Messages error={error} notice={notice} />
        <section className="rounded-[2rem] border border-[#ded5c4] bg-white p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">Public subscriptions</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Info label="Public checkout" value={settings?.public_checkout_enabled ? "Enabled" : "Disabled"} />
            <Info label="Failed-payment grace" value={`${numberValue(settings?.failed_payment_grace_days || 7)} days`} />
            <Info label="Last updated" value={date(settings?.updated_at)} />
          </div>
          <button type="button" onClick={() => void togglePublicCheckout()} disabled={working || loading} className={`mt-5 min-h-11 rounded-full border px-5 text-xs font-black ${settings?.public_checkout_enabled ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"} disabled:opacity-50`}>
            {settings?.public_checkout_enabled ? "Disable public checkout" : "Enable public checkout"}
          </button>
          <p className="mt-4 max-w-3xl text-xs leading-5 text-[#81796d]">Stripe keys, webhook secrets and price identifiers remain server-side and are intentionally not editable from this page.</p>
        </section>
      </BillingAdminShell>
    );
  }

  return (
    <BillingAdminShell
      eyebrow="Dreamscape One billing"
      title="Overview"
      description="Subscription billing, subscriber status and Dreamscape-only financial indicators in a workspace separate from Guru Kids Pro."
      actions={<RefreshButton loading={loading} working={working} onClick={load} />}
    >
      <Messages error={error} notice={notice} />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Active subscribers" value={loading ? "…" : String(numberValue(metrics?.active_count))} detail="Current active contracts" />
        <Metric label="Payment issues" value={loading ? "…" : String(numberValue(metrics?.payment_issue_count))} detail="Requires review" />
        <Metric label="Setup pending" value={loading ? "…" : String(numberValue(metrics?.setup_pending_count))} detail="Not fully activated" />
        <Metric label="Monthly MRR" value={loading ? "…" : money(metrics?.monthly_recurring_revenue)} detail="Dreamscape only" />
        <Metric label="Annual value" value={loading ? "…" : money(metrics?.annual_contract_value)} detail="Dreamscape contracts" />
      </section>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <section className="rounded-[2rem] border border-[#ded5c4] bg-white p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">Workspace status</p>
          <h2 className="mt-2 text-xl font-semibold">Dreamscape subscription billing</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Info label="Subscription records" value={String(contracts.length)} />
            <Info label="Configured plans" value={String(plans.length)} />
            <Info label="Public checkout" value={settings?.public_checkout_enabled ? "Enabled" : "Disabled"} />
            <Info label="Suspended" value={String(numberValue(metrics?.suspended_count))} />
          </div>
        </section>
        <section className="rounded-[2rem] border border-[#ded5c4] bg-[#15233b] p-6 text-white">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#e8c474]">Review queue</p>
          <strong className="mt-4 block text-4xl text-[#f3d38c]">{warnings.length}</strong>
          <p className="mt-2 text-sm leading-6 text-white/65">GKP-priced Dreamscape add-ons that may need review because the learner no longer has an active GKP programme.</p>
          {warnings.slice(0, 3).map((warning) => <div key={warning.addon_id} className="mt-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3"><strong className="block text-sm">{warning.student_name}</strong><span className="mt-1 block text-xs text-white/55">{warning.payer_name}</span></div>)}
        </section>
      </div>
    </BillingAdminShell>
  );
}

function RefreshButton({ loading, working, onClick }: { loading: boolean; working: boolean; onClick: () => Promise<void> }) {
  return <button type="button" onClick={() => void onClick()} disabled={loading || working} className="inline-flex min-h-11 items-center rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold text-[#554d40] disabled:opacity-60">{loading ? "Refreshing…" : "Refresh"}</button>;
}

function Messages({ error, notice }: { error: string; notice: string }) {
  if (!error && !notice) return null;
  return <div className={`mb-5 rounded-2xl border px-5 py-4 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error || notice}</div>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="rounded-[1.7rem] border border-[#ded5c4] bg-white p-5"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#887f72]">{label}</p><strong className="mt-3 block text-2xl font-semibold">{value}</strong><span className="mt-2 block text-xs text-[#8a8378]">{detail}</span></article>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-[#fbfaf7] p-4"><span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">{label}</span><strong className="mt-2 block text-sm">{value}</strong></div>;
}

function Empty({ text }: { text: string }) {
  return <p className="mt-5 rounded-2xl bg-[#fbfaf7] p-5 text-sm text-[#81796d]">{text}</p>;
}

function StatusPill({ status }: { status: string }) {
  const normalised = String(status || "unknown").toLowerCase();
  const className = normalised.includes("active") || normalised === "available" || normalised === "paid"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : normalised.includes("issue") || normalised.includes("pending") || normalised.includes("trial") || normalised.includes("coming")
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : normalised.includes("cancel") || normalised.includes("failed") || normalised.includes("inactive") || normalised.includes("suspend")
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-slate-200 bg-slate-50 text-slate-700";
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${className}`}>{normalised.replaceAll("_", " ")}</span>;
}
