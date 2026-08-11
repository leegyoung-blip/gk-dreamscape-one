"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import BillingAdminShell from "@/app/admin/billing/_components/BillingAdminShell";
import { supabase } from "@/lib/supabase";

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
  hitpay_plan_id: string | null;
  hitpay_environment: string | null;
  hitpay_synced_at: string | null;
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
  hitpay_send_receipts: boolean;
  updated_at: string;
};

function money(value: number | string, currency = "SGD") {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function date(value: string | null) {
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

export default function DreamscapeBillingClient() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const [plansResult, contractsResult, metricsResult, settingsResult] =
      await Promise.all([
        supabase.rpc("gkp_get_dreamscape_subscription_plans"),
        supabase.rpc(
          "gkp_get_dreamscape_subscription_contracts",
          { p_limit: 300 },
        ),
        supabase.rpc("gkp_get_dreamscape_subscription_metrics"),
        supabase.rpc("gkp_get_dreamscape_billing_settings"),
      ]);

    const firstError =
      plansResult.error ||
      contractsResult.error ||
      metricsResult.error ||
      settingsResult.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setPlans((plansResult.data || []) as Plan[]);
    setContracts((contractsResult.data || []) as Contract[]);
    setMetrics(
      ((metricsResult.data || [])[0] || null) as Metrics | null,
    );
    setSettings(
      ((settingsResult.data || [])[0] || null) as Settings | null,
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function syncPlans() {
    setWorking(true);
    setMessage("");
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Please sign in again.");
      }

      const response = await fetch(
        "/api/billing/dreamscape/plans/sync",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            results?: Array<{
              status: string;
              planKey: string;
            }>;
          }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error || "Could not sync HitPay plans.",
        );
      }

      const created =
        payload?.results?.filter(
          (row) => row.status === "created",
        ).length || 0;

      setMessage(
        created > 0
          ? `${created} Dreamscape HitPay plan${
              created === 1 ? "" : "s"
            } created and mapped.`
          : "All public Dreamscape plans were already synced.",
      );

      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not sync HitPay plans.",
      );
    }

    setWorking(false);
  }

  async function togglePublicCheckout() {
    if (!settings) return;

    const next = !settings.public_checkout_enabled;

    if (
      next &&
      !window.confirm(
        "Enable public Dreamscape subscription checkout? " +
          "Only do this after the four HitPay plans and webhook have been tested.",
      )
    ) {
      return;
    }

    setWorking(true);
    setMessage("");
    setError("");

    const { error: rpcError } = await supabase.rpc(
      "gkp_set_dreamscape_public_checkout_enabled",
      { p_enabled: next },
    );

    if (rpcError) {
      setError(rpcError.message);
    } else {
      setMessage(
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
        contract.parent_name,
        contract.parent_email,
        contract.learner_name,
        contract.learner_email,
        contract.display_name,
        contract.status,
        contract.provider_status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [contracts, search]);

  const allPublicPlansSynced =
    plans
      .filter(
        (plan) =>
          plan.audience === "public" &&
          plan.provider === "hitpay" &&
          !plan.is_coming_soon,
      )
      .every((plan) => Boolean(plan.hitpay_plan_id));

  return (
    <BillingAdminShell
      eyebrow="Dreamscape"
      title="Dreamscape Subscriptions"
      description="Manage Dreamscape public subscription plans, HitPay recurring setup, learner access projection and subscription status without Shopify."
      actions={
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || working}
          className="min-h-11 rounded-full border border-[#d7c9ae] bg-white px-5 text-xs font-bold"
        >
          Refresh
        </button>
      }
    >
      {(message || error) && (
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Active"
          value={
            loading
              ? "…"
              : String(Number(metrics?.active_count || 0))
          }
        />
        <Metric
          label="Setup Pending"
          value={
            loading
              ? "…"
              : String(Number(metrics?.setup_pending_count || 0))
          }
        />
        <Metric
          label="Payment Issue"
          value={
            loading
              ? "…"
              : String(Number(metrics?.payment_issue_count || 0))
          }
        />
        <Metric
          label="Monthly MRR"
          value={
            loading
              ? "…"
              : money(metrics?.monthly_recurring_revenue || 0)
          }
        />
        <Metric
          label="Annual Contracts"
          value={
            loading
              ? "…"
              : money(metrics?.annual_contract_value || 0)
          }
        />
      </section>

      <section className="mt-6 rounded-[28px] border border-[#ded5c4] bg-white p-6 shadow-[0_20px_60px_rgba(21,35,59,0.05)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">
              Launch controls
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#15233b]">
              HitPay recurring setup
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#81796d]">
              Sync creates only missing public Core and Full plans.
              Public checkout remains disabled until you explicitly enable it.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void syncPlans()}
              disabled={working}
              className="min-h-11 rounded-full border border-[#c9b27d] bg-[#fff9eb] px-5 text-xs font-black text-[#6c5420]"
            >
              {working ? "Working…" : "Sync HitPay Plans"}
            </button>

            <button
              type="button"
              onClick={() => void togglePublicCheckout()}
              disabled={
                working ||
                (!settings?.public_checkout_enabled &&
                  !allPublicPlansSynced)
              }
              className={`min-h-11 rounded-full border px-5 text-xs font-black ${
                settings?.public_checkout_enabled
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              } disabled:cursor-not-allowed disabled:opacity-45`}
            >
              {settings?.public_checkout_enabled
                ? "Disable Public Checkout"
                : "Enable Public Checkout"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <StatusBox
            label="Public checkout"
            value={
              settings?.public_checkout_enabled
                ? "ENABLED"
                : "DISABLED"
            }
            detail="Keep disabled during Phase 1 testing."
          />
          <StatusBox
            label="Grace period"
            value={`${settings?.failed_payment_grace_days || 7} DAYS`}
            detail="HitPay also documents a 7-day failed-card recovery window."
          />
          <StatusBox
            label="Plan mapping"
            value={allPublicPlansSynced ? "READY" : "NOT SYNCED"}
            detail="All four public monthly/annual plans must have HitPay IDs."
          />
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-[#ded5c4] bg-white p-6 shadow-[0_20px_60px_rgba(21,35,59,0.05)]">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">
          Plan mapping
        </p>
        <h2 className="mt-2 text-xl font-semibold text-[#15233b]">
          Dreamscape plans
        </h2>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#ebe5da] bg-[#fbfaf7] text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Audience</th>
                <th className="px-4 py-3">Billing</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">HitPay mapping</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => (
                <tr
                  key={plan.id}
                  className="border-b border-[#f0ece4] last:border-b-0"
                >
                  <td className="px-4 py-4">
                    <strong className="block text-sm text-[#15233b]">
                      {plan.display_name}
                    </strong>
                    <span className="mt-1 block text-[11px] text-[#8a8378]">
                      {plan.plan_key}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm capitalize">
                    {plan.audience}
                  </td>
                  <td className="px-4 py-4 text-sm capitalize">
                    {plan.billing_cycle}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold">
                    {money(plan.amount, plan.currency)}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    {plan.provider === "hitpay"
                      ? "HitPay Recurring"
                      : "GKP Billing"}
                  </td>
                  <td className="px-4 py-4 text-xs">
                    {plan.provider !== "hitpay"
                      ? "Not required"
                      : plan.hitpay_plan_id
                        ? `${plan.hitpay_environment || ""} · ${plan.hitpay_plan_id}`
                        : "Not synced"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-[#ded5c4] bg-white p-6 shadow-[0_20px_60px_rgba(21,35,59,0.05)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">
              Subscription directory
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[#15233b]">
              Public Dreamscape contracts
            </h2>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search learner, parent, plan or status"
            className="min-h-11 w-full rounded-xl border border-[#d9cfbd] bg-white px-4 text-sm outline-none sm:max-w-sm"
          />
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-[#81796d]">
            Loading subscriptions…
          </p>
        ) : filteredContracts.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-[#fbfaf7] p-6 text-sm text-[#81796d]">
            No Dreamscape subscription contracts yet.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1120px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#ebe5da] bg-[#fbfaf7] text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">
                  <th className="px-4 py-3">Learner</th>
                  <th className="px-4 py-3">Parent</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Access until</th>
                  <th className="px-4 py-3">Next billing</th>
                  <th className="px-4 py-3">Provider</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className="border-b border-[#f0ece4] last:border-b-0"
                  >
                    <td className="px-4 py-4">
                      <strong className="block text-sm text-[#15233b]">
                        {contract.learner_name}
                      </strong>
                      <span className="mt-1 block text-xs text-[#81796d]">
                        {contract.learner_email}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <strong className="block text-sm">
                        {contract.parent_name}
                      </strong>
                      <span className="mt-1 block text-xs text-[#81796d]">
                        {contract.parent_email}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {contract.display_name}
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill status={contract.status} />
                      {contract.grace_until && (
                        <span className="mt-1 block text-[10px] text-amber-700">
                          Grace until {date(contract.grace_until)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {date(contract.current_period_end)}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {date(contract.next_billing_at)}
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <span className="block">
                        {contract.provider_environment || "—"}
                      </span>
                      <span className="mt-1 block max-w-[220px] truncate text-[#81796d]">
                        {contract.provider_subscription_id || "Not attached"}
                      </span>
                    </td>
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

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-[#ded5c4] bg-white p-5 shadow-[0_18px_50px_rgba(21,35,59,0.045)]">
      <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#8a8378]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-[#15233b]">
        {value}
      </p>
    </div>
  );
}

function StatusBox({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[#ebe5da] bg-[#fbfaf7] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">
        {label}
      </p>
      <strong className="mt-2 block text-sm text-[#15233b]">
        {value}
      </strong>
      <p className="mt-1 text-[11px] leading-5 text-[#81796d]">
        {detail}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const value = String(status || "unknown").toLowerCase();

  const classes =
    value === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : value === "payment_issue"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : value === "setup_pending"
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : value === "suspended" || value === "failed"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-[#ded5c4] bg-[#fbfaf7] text-[#81796d]";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${classes}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
