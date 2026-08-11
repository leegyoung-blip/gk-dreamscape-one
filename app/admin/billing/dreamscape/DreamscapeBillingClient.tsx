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

type AddonWarning = {
  addon_id: string;
  student_id: string;
  account_id: string;
  account_code: string;
  payer_name: string;
  student_code: string;
  student_name: string;
  learner_email: string;
  plan_code: string;
  monthly_fee: number | string;
  starts_on: string;
  warning_code: string;
  warning_message: string;
};

type SubscriptionEmailLog = {
  id: string;
  email_type: string;
  recipient_email: string;
  subject: string;
  status: string;
  resend_email_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
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
  const [selectedContractId, setSelectedContractId] = useState("");
  const [addonWarnings, setAddonWarnings] = useState<AddonWarning[]>([]);
  const [emailHistory, setEmailHistory] = useState<SubscriptionEmailLog[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<
    Array<{
      id: string;
      provider_charge_id: string | null;
      amount: number | string;
      currency: string;
      status: string;
      paid_at: string | null;
      created_at: string;
    }>
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const [
      plansResult,
      contractsResult,
      metricsResult,
      settingsResult,
      warningResult,
    ] = await Promise.all([
        supabase.rpc("gkp_get_dreamscape_subscription_plans"),
        supabase.rpc(
          "gkp_get_dreamscape_subscription_contracts",
          { p_limit: 300 },
        ),
        supabase.rpc("gkp_get_dreamscape_subscription_metrics"),
        supabase.rpc("gkp_get_dreamscape_billing_settings"),
        supabase.rpc("gkp_get_gkp_dreamscape_addon_warnings"),
      ]);

    const firstError =
      plansResult.error ||
      contractsResult.error ||
      metricsResult.error ||
      settingsResult.error ||
      warningResult.error;

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
    setAddonWarnings((warningResult.data || []) as AddonWarning[]);
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

  async function loadPaymentHistory(contractId: string) {
    if (!contractId) {
      setPaymentHistory([]);
      return;
    }

    const [paymentResult, emailResult] = await Promise.all([
      supabase.rpc(
        "gkp_get_dreamscape_subscription_payments",
        { p_contract_id: contractId },
      ),
      supabase.rpc(
        "gkp_get_dreamscape_subscription_email_history",
        { p_contract_id: contractId },
      ),
    ]);

    const firstError = paymentResult.error || emailResult.error;

    if (firstError) {
      setError(firstError.message);
      return;
    }

    setPaymentHistory((paymentResult.data || []) as typeof paymentHistory);
    setEmailHistory((emailResult.data || []) as SubscriptionEmailLog[]);
  }

  async function runSubscriptionAction(
    contract: Contract,
    action:
      | "refresh"
      | "cancel_period_end"
      | "cancel_immediate"
      | "reactivate",
  ) {
    if (
      action === "cancel_period_end" &&
      !window.confirm(
        `Stop future renewals for ${contract.learner_name}? ` +
          "The learner will keep access through the current paid period.",
      )
    ) {
      return;
    }

    if (
      action === "cancel_immediate" &&
      !window.confirm(
        `Cancel ${contract.learner_name}'s subscription immediately? ` +
          "This removes paid Dreamscape access now.",
      )
    ) {
      return;
    }

    if (
      action === "reactivate" &&
      !window.confirm(
        `Reactivate the HitPay subscription for ${contract.learner_name}?`,
      )
    ) {
      return;
    }

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
        "/api/billing/dreamscape/subscriptions/action",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contractId: contract.id,
            action,
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; status?: string; accessUntil?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "The subscription action could not be completed.",
        );
      }

      const actionLabel =
        action === "refresh"
          ? "Subscription refreshed"
          : action === "cancel_period_end"
            ? "Future renewals stopped; paid access retained to period end"
            : action === "cancel_immediate"
              ? "Subscription cancelled immediately"
              : "Subscription reactivation requested";

      setMessage(`${actionLabel}.`);
      await load();

      if (selectedContractId === contract.id) {
        await loadPaymentHistory(contract.id);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The subscription action could not be completed.",
      );
    }

    setWorking(false);
  }

  async function sendManagementEmail(contract: Contract) {
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
        "/api/billing/dreamscape/subscriptions/email",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ contractId: contract.id }),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; recipient?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error || "The management email could not be sent.",
        );
      }

      setMessage(
        `Secure subscription management link sent to ${
          payload?.recipient || contract.parent_email
        }.`,
      );

      if (selectedContractId === contract.id) {
        await loadPaymentHistory(contract.id);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The management email could not be sent.",
      );
    }

    setWorking(false);
  }

  const selectedContract =
    contracts.find(
      (contract) => contract.id === selectedContractId,
    ) || null;

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

      {addonWarnings.length > 0 && (
        <section className="mt-6 rounded-[28px] border border-amber-200 bg-amber-50 p-6 shadow-[0_20px_60px_rgba(21,35,59,0.05)]">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-700">
            GKP access review
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[#15233b]">
            {addonWarnings.length} GKP Dreamscape add-on
            {addonWarnings.length === 1 ? "" : "s"} need review
          </h2>
          <p className="mt-2 text-sm leading-6 text-amber-900/75">
            These students still have GKP-priced Dreamscape access but no
            active GKP programme enrolment. Review whether the add-on should
            end or move to a public Dreamscape subscription.
          </p>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {addonWarnings.map((warning) => (
              <div
                key={warning.addon_id}
                className="rounded-2xl border border-amber-200 bg-white p-4"
              >
                <strong className="text-sm text-[#15233b]">
                  {warning.student_name}
                </strong>
                <p className="mt-1 text-xs text-[#81796d]">
                  {warning.account_code} · {warning.payer_name}
                </p>
                <p className="mt-3 text-xs leading-5 text-amber-800">
                  {warning.warning_message}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

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
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className={`border-b border-[#f0ece4] last:border-b-0 ${
                      selectedContractId === contract.id
                        ? "bg-[#fbfaf7]"
                        : ""
                    }`}
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
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={working}
                          onClick={() => {
                            setSelectedContractId(contract.id);
                            void loadPaymentHistory(contract.id);
                          }}
                          className="rounded-full border border-[#d7c9ae] bg-white px-3 py-2 text-[10px] font-bold"
                        >
                          Details
                        </button>

                        <button
                          type="button"
                          disabled={working}
                          onClick={() => void sendManagementEmail(contract)}
                          className="rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-[10px] font-bold text-violet-700"
                        >
                          Email parent
                        </button>

                        <button
                          type="button"
                          disabled={working}
                          onClick={() =>
                            void runSubscriptionAction(
                              contract,
                              "refresh",
                            )
                          }
                          className="rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-[10px] font-bold text-sky-700"
                        >
                          Refresh
                        </button>

                        {["active", "payment_issue"].includes(
                          contract.status,
                        ) && (
                          <>
                            <button
                              type="button"
                              disabled={working}
                              onClick={() =>
                                void runSubscriptionAction(
                                  contract,
                                  "cancel_period_end",
                                )
                              }
                              className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-800"
                            >
                              Cancel at period end
                            </button>

                            <button
                              type="button"
                              disabled={working}
                              onClick={() =>
                                void runSubscriptionAction(
                                  contract,
                                  "cancel_immediate",
                                )
                              }
                              className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700"
                            >
                              Cancel now
                            </button>
                          </>
                        )}

                        {["cancelled", "suspended", "expired"].includes(
                          contract.status,
                        ) && (
                          <button
                            type="button"
                            disabled={working}
                            onClick={() =>
                              void runSubscriptionAction(
                                contract,
                                "reactivate",
                              )
                            }
                            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedContract && (
        <section className="mt-6 rounded-[28px] border border-[#ded5c4] bg-white p-6 shadow-[0_20px_60px_rgba(21,35,59,0.05)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#8a8378]">
                Subscriber detail
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#15233b]">
                {selectedContract.learner_name}
              </h2>
              <p className="mt-1 text-sm text-[#81796d]">
                {selectedContract.learner_email} · payer{" "}
                {selectedContract.parent_email}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedContractId("");
                setPaymentHistory([]);
                setEmailHistory([]);
              }}
              className="min-h-10 rounded-full border border-[#d7c9ae] bg-white px-4 text-xs font-bold"
            >
              Close
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatusBox
              label="Plan"
              value={selectedContract.display_name}
              detail={`${selectedContract.billing_cycle} · ${money(
                selectedContract.amount,
                selectedContract.currency,
              )}`}
            />
            <StatusBox
              label="Paid through"
              value={date(selectedContract.current_period_end)}
              detail={`Next billing ${date(
                selectedContract.next_billing_at,
              )}`}
            />
            <StatusBox
              label="Billing status"
              value={selectedContract.status
                .replaceAll("_", " ")
                .toUpperCase()}
              detail={`Provider: ${
                selectedContract.provider_status || "—"
              }`}
            />
            <StatusBox
              label="Payment recovery"
              value={
                selectedContract.grace_until
                  ? `UNTIL ${date(selectedContract.grace_until)}`
                  : "NO ACTIVE GRACE"
              }
              detail={`${Number(
                selectedContract.failed_charge_count || 0,
              )} recorded issue(s)`}
            />
          </div>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-[#ebe5da]">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#ebe5da] bg-[#fbfaf7] text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">HitPay charge</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-7 text-center text-sm text-[#81796d]"
                    >
                      No successful recurring charges recorded yet.
                    </td>
                  </tr>
                ) : (
                  paymentHistory.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b border-[#f0ece4] last:border-b-0"
                    >
                      <td className="px-4 py-4 text-sm">
                        {date(payment.paid_at || payment.created_at)}
                      </td>
                      <td className="px-4 py-4 text-sm font-bold">
                        {money(payment.amount, payment.currency)}
                      </td>
                      <td className="px-4 py-4">
                        <StatusPill status={payment.status} />
                      </td>
                      <td className="px-4 py-4 text-xs text-[#81796d]">
                        {payment.provider_charge_id || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-[#ebe5da]">
            <div className="border-b border-[#ebe5da] bg-[#fbfaf7] px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">
                Subscription email history
              </p>
            </div>
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#ebe5da] text-[10px] font-black uppercase tracking-[0.12em] text-[#8a8378]">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Sent</th>
                </tr>
              </thead>
              <tbody>
                {emailHistory.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-7 text-center text-sm text-[#81796d]"
                    >
                      No Dreamscape subscription emails recorded yet.
                    </td>
                  </tr>
                ) : (
                  emailHistory.map((email) => (
                    <tr
                      key={email.id}
                      className="border-b border-[#f0ece4] last:border-b-0"
                    >
                      <td className="px-4 py-4 text-xs font-bold">
                        {email.email_type.replaceAll("_", " ")}
                      </td>
                      <td className="px-4 py-4 text-xs">
                        {email.recipient_email}
                      </td>
                      <td className="px-4 py-4">
                        <StatusPill status={email.status} />
                      </td>
                      <td className="px-4 py-4 text-xs text-[#81796d]">
                        {date(email.sent_at || email.created_at)}
                        {email.error_message && (
                          <span className="mt-1 block max-w-[260px] text-red-600">
                            {email.error_message}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
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
