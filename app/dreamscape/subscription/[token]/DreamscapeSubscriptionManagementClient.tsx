"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Subscription = {
  learnerName: string;
  learnerEmail: string;
  parentName: string;
  planName: string;
  planCode: string;
  billingCycle: string;
  amount: number;
  currency: string;
  status: string;
  providerStatus: string | null;
  currentPeriodEnd: string | null;
  nextBillingAt: string | null;
  graceUntil: string | null;
  cancelAtPeriodEnd: boolean;
  canCancelAtPeriodEnd: boolean;
  canUpdatePaymentMethod: boolean;
};

type Payment = {
  amount: number | string;
  currency: string;
  status: string;
  paid_at: string | null;
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

export default function DreamscapeSubscriptionManagementClient({
  token,
}: {
  token: string;
}) {
  const [subscription, setSubscription] =
    useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/dreamscape/subscriptions/manage/${encodeURIComponent(
          token,
        )}`,
        { cache: "no-store" },
      );

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            subscription?: Subscription;
            payments?: Payment[];
          }
        | null;

      if (!response.ok || !payload?.subscription) {
        throw new Error(
          payload?.error || "Subscription could not be loaded.",
        );
      }

      setSubscription(payload.subscription);
      setPayments(payload.payments || []);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Subscription could not be loaded.",
      );
    }

    setLoading(false);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function action(
    name: "cancel_period_end" | "payment_method",
  ) {
    if (
      name === "cancel_period_end" &&
      !window.confirm(
        "Stop future Dreamscape renewals? The learner will keep access through the current paid period.",
      )
    ) {
      return;
    }

    setWorking(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/dreamscape/subscriptions/manage/${encodeURIComponent(
          token,
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: name }),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            redirectUrl?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error || "The action could not be completed.",
        );
      }

      if (name === "payment_method" && payload?.redirectUrl) {
        window.location.assign(payload.redirectUrl);
        return;
      }

      setMessage(
        "Future renewal has been stopped. Paid access remains available through the current period.",
      );
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The action could not be completed.",
      );
    }

    setWorking(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020813] px-5 text-white">
        Loading Dreamscape subscription…
      </main>
    );
  }

  if (!subscription) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020813] px-5 text-white">
        <section className="max-w-lg rounded-[30px] border border-red-200/20 bg-white/[0.05] p-8 text-center">
          <h1 className="text-3xl font-black">Subscription unavailable</h1>
          <p className="mt-4 text-sm leading-6 text-white/60">
            {error || "This secure management link is unavailable."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020813] px-5 py-8 text-white sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="rounded-full border border-cyan-200/25 bg-white/[0.05] px-5 py-3 text-sm font-bold text-white no-underline"
          >
            Dreamscape One
          </Link>

          <span className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
            Secure Subscription Management
          </span>
        </div>

        <section className="mt-10 grid gap-7 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[30px] border border-cyan-200/20 bg-white/[0.05] p-7 shadow-[0_28px_90px_rgba(0,0,0,0.38)] sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8ee8ff]">
              {subscription.learnerName}
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.05em]">
              {subscription.planName}
            </h1>
            <p className="mt-2 text-sm text-white/52">
              {money(subscription.amount, subscription.currency)} ·{" "}
              {subscription.billingCycle === "annual"
                ? "per year"
                : "per month"}
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Info
                label="Subscription status"
                value={subscription.status.replaceAll("_", " ")}
              />
              <Info
                label="Paid through"
                value={date(subscription.currentPeriodEnd)}
              />
              <Info
                label="Next billing"
                value={date(subscription.nextBillingAt)}
              />
              <Info
                label="Payment recovery"
                value={
                  subscription.graceUntil
                    ? `Until ${date(subscription.graceUntil)}`
                    : "No active issue"
                }
              />
            </div>

            {(subscription.status === "payment_issue" ||
              subscription.graceUntil) && (
              <div className="mt-5 rounded-2xl border border-amber-200/20 bg-amber-300/10 p-5 text-sm leading-6 text-amber-50">
                There is a payment-method issue. Dreamscape access remains
                available during the recovery period. Update the payment
                method below before the grace period ends.
              </div>
            )}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {subscription.canUpdatePaymentMethod && (
                <button
                  type="button"
                  onClick={() => void action("payment_method")}
                  disabled={working}
                  className="min-h-12 flex-1 rounded-full bg-gradient-to-r from-cyan-300 to-violet-300 px-5 text-sm font-black text-[#160729] disabled:opacity-50"
                >
                  Update Payment Method
                </button>
              )}

              {subscription.canCancelAtPeriodEnd && (
                <button
                  type="button"
                  onClick={() => void action("cancel_period_end")}
                  disabled={working}
                  className="min-h-12 flex-1 rounded-full border border-white/16 bg-white/[0.05] px-5 text-sm font-black text-white disabled:opacity-50"
                >
                  Cancel at Period End
                </button>
              )}
            </div>

            {subscription.cancelAtPeriodEnd && (
              <div className="mt-5 rounded-2xl border border-cyan-200/18 bg-cyan-300/[0.06] p-5 text-sm leading-6 text-white/70">
                Future renewal has been stopped. Existing paid access remains
                available through {date(subscription.currentPeriodEnd)}.
              </div>
            )}

            {(error || message) && (
              <div
                className={`mt-5 rounded-2xl border p-4 text-sm ${
                  error
                    ? "border-red-200/20 bg-red-400/10 text-red-100"
                    : "border-emerald-200/20 bg-emerald-400/10 text-emerald-100"
                }`}
              >
                {error || message}
              </div>
            )}
          </div>

          <aside className="rounded-[30px] border border-violet-200/20 bg-white/[0.05] p-7 shadow-[0_28px_90px_rgba(0,0,0,0.38)] sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-200">
              Payment History
            </p>

            <div className="mt-5 grid gap-3">
              {payments.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-6 text-white/52">
                  No recurring payment records are available yet.
                </p>
              ) : (
                payments.map((payment, index) => (
                  <div
                    key={`${payment.paid_at || payment.created_at}-${index}`}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <strong className="text-sm">
                        {money(payment.amount, payment.currency)}
                      </strong>
                      <span className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-200">
                        {payment.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-white/42">
                      {date(payment.paid_at || payment.created_at)}
                    </p>
                  </div>
                ))
              )}
            </div>

            <p className="mt-6 text-xs leading-5 text-white/38">
              For billing questions, contact Guru Kids Pro. This private
              management link should not be forwarded to others.
            </p>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/38">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold capitalize text-white/86">
        {value}
      </p>
    </div>
  );
}
