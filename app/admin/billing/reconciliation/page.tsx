"use client";

import {
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

type ReconcileResult = {
  paymentRequestId: string;
  invoiceId: string;
  result: {
    status:
      | "reconciled"
      | "already_reconciled"
      | "provider_not_completed"
      | "needs_attention";
    invoiceNumber: string;
    providerStatus: string;
    amount: number | null;
    currency: string;
    reason?: string;
  } | null;
  error: string | null;
};

type BatchPayload = {
  ok?: boolean;
  scanned?: number;
  reconciled?: number;
  alreadyReconciled?: number;
  pending?: number;
  needsAttention?: number;
  results?: ReconcileResult[];
  error?: string;
};

export default function BillingReconciliationPage() {
  const [
    working,
    setWorking,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    results,
    setResults,
  ] =
    useState<
      ReconcileResult[]
    >([]);

  async function runScan() {
    setWorking(true);
    setError("");
    setMessage("");

    try {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (
        !session?.access_token
      ) {
        throw new Error(
          "Please sign in again.",
        );
      }

      const response =
        await fetch(
          "/api/billing/hitpay/reconcile-pending",
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              limit: 25,
            }),
          },
        );

      const payload =
        (await response
          .json()
          .catch(() => null)) as
          | BatchPayload
          | null;

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "The reconciliation scan could not be completed.",
        );
      }

      setResults(
        payload?.results || [],
      );

      setMessage(
        [
          `Scanned ${payload?.scanned || 0}.`,
          `${payload?.reconciled || 0} recovered.`,
          `${payload?.alreadyReconciled || 0} already reconciled.`,
          `${payload?.pending || 0} still pending at HitPay.`,
          `${payload?.needsAttention || 0} need attention.`,
        ].join(" "),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The reconciliation scan failed.",
      );
    }

    setWorking(false);
  }

  return (
    <main className="min-h-screen bg-[#f6f2e9] px-4 py-8 text-[#15233b] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[30px] border border-[#ded5c4] bg-white p-6 shadow-[0_22px_70px_rgba(21,35,59,0.06)] sm:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#9a7440]">
            GKP Billing
          </p>

          <h1 className="mt-2 text-3xl font-semibold">
            HitPay Reconciliation
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#756d62]">
            This recovery tool checks recent GKP PayNow requests directly
            against HitPay. Completed payments are recorded locally only
            after the request ID, invoice reference, amount, currency and
            successful provider payment all match. Existing payments are
            never duplicated.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={working}
              onClick={() =>
                void runScan()
              }
              className="rounded-full bg-[#15233b] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {working
                ? "Checking HitPay..."
                : "Reconcile Recent PayNow Requests"}
            </button>

            <a
              href="/admin/billing/payments"
              className="rounded-full border border-[#d8cbb6] bg-white px-5 py-3 text-sm font-bold text-[#15233b]"
            >
              Back to Payments
            </a>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              {message}
            </div>
          )}
        </section>

        {results.length > 0 && (
          <section className="mt-6 overflow-hidden rounded-[30px] border border-[#ded5c4] bg-white shadow-[0_22px_70px_rgba(21,35,59,0.05)]">
            <div className="border-b border-[#eee5d7] px-6 py-5">
              <h2 className="text-lg font-semibold">
                Scan Results
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#fbf9f4] text-[10px] font-black uppercase tracking-[0.13em] text-[#8a8378]">
                  <tr>
                    <th className="px-5 py-4">
                      Invoice
                    </th>
                    <th className="px-5 py-4">
                      HitPay
                    </th>
                    <th className="px-5 py-4">
                      Result
                    </th>
                    <th className="px-5 py-4">
                      Amount
                    </th>
                    <th className="px-5 py-4">
                      Detail
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {results.map(
                    (row) => {
                      const status =
                        row.result?.status ||
                        "error";

                      return (
                        <tr
                          key={
                            row.paymentRequestId
                          }
                          className="border-t border-[#f0e8dc]"
                        >
                          <td className="px-5 py-4 font-semibold">
                            {row.result
                              ?.invoiceNumber ||
                              row.invoiceId}
                          </td>

                          <td className="px-5 py-4 text-[#756d62]">
                            {row.result
                              ?.providerStatus ||
                              "—"}
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-full border border-[#d8cbb6] bg-[#fbf9f4] px-3 py-1 text-xs font-bold">
                              {status}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            {row.result
                              ?.amount !==
                              null &&
                            row.result
                              ?.amount !==
                              undefined
                              ? `${row.result.currency} ${row.result.amount.toFixed(2)}`
                              : "—"}
                          </td>

                          <td className="max-w-xl px-5 py-4 text-[#756d62]">
                            {row.error ||
                              row.result
                                ?.reason ||
                              (status ===
                              "reconciled"
                                ? "Payment recovered and invoice recalculated."
                                : status ===
                                    "already_reconciled"
                                  ? "Payment was already recorded; no duplicate was created."
                                  : "No further action required.")}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
