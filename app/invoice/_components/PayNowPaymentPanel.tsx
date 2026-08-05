"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { invoiceCurrency } from "../_lib/invoiceFormat";

type PaymentState = "idle" | "loading" | "pending" | "waiting" | "paid" | "error";

type PaymentRequestResult = {
  state: "pending" | "waiting" | "paid";
  environment?: "sandbox" | "production";
  paymentRequestId?: string;
  amount?: number;
  currency?: string;
  qrDataUrl?: string;
  checkoutUrl?: string | null;
  sandboxDirectUrl?: string | null;
  expiresAt?: string;
  canGenerateAfter?: string;
  retryAfterSeconds?: number;
  message?: string;
  error?: string;
};

type StatusResult = {
  invoiceStatus: string;
  amountPaid: number;
  balanceDue: number;
  paidAt: string | null;
  hitpayStatus: string | null;
  qrExpiresAt: string | null;
  canGenerateAfter: string | null;
  error?: string;
};

function secondsUntil(value: string | null | undefined) {
  if (!value) return 0;
  const seconds = Math.ceil((new Date(value).getTime() - Date.now()) / 1000);
  return Math.max(0, seconds);
}

function countdownLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export default function PayNowPaymentPanel({
  publicToken,
  invoiceNumber,
  balanceDue,
  currency,
}: {
  publicToken: string;
  invoiceNumber: string;
  balanceDue: number;
  currency: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<PaymentState>("idle");
  const [message, setMessage] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [sandboxDirectUrl, setSandboxDirectUrl] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "production" | "">("");
  const [expiresAt, setExpiresAt] = useState("");
  const [canGenerateAfter, setCanGenerateAfter] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [retrySeconds, setRetrySeconds] = useState(0);

  const qrExpired = state === "pending" && secondsLeft <= 0;
  const canGenerate = state === "idle" || state === "error" || (state === "waiting" && retrySeconds <= 0);

  const checkStatus = useCallback(async () => {
    const response = await fetch(
      `/api/billing/hitpay/status?token=${encodeURIComponent(publicToken)}`,
      { cache: "no-store" },
    );
    const result = (await response.json()) as StatusResult;

    if (!response.ok) return;

    if (result.invoiceStatus === "paid" || result.balanceDue <= 0) {
      setState("paid");
      setMessage("Payment received. The invoice has been marked as paid.");
      router.refresh();
      return;
    }

    if (result.canGenerateAfter) {
      setCanGenerateAfter(result.canGenerateAfter);
    }
  }, [publicToken, router]);

  useEffect(() => {
    if (state !== "pending" && state !== "waiting") return;

    const statusTimer = window.setInterval(() => {
      void checkStatus();
    }, 3000);

    return () => window.clearInterval(statusTimer);
  }, [checkStatus, state]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft(secondsUntil(expiresAt));
      setRetrySeconds(secondsUntil(canGenerateAfter));
    }, 1000);

    setSecondsLeft(secondsUntil(expiresAt));
    setRetrySeconds(secondsUntil(canGenerateAfter));

    return () => window.clearInterval(timer);
  }, [expiresAt, canGenerateAfter]);

  async function generateQr() {
    setState("loading");
    setMessage("");

    try {
      const response = await fetch("/api/billing/hitpay/payment-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicToken }),
        cache: "no-store",
      });
      const result = (await response.json()) as PaymentRequestResult;

      if (result.state === "paid") {
        setState("paid");
        setMessage("Payment has already been received.");
        router.refresh();
        return;
      }

      if (result.state === "waiting") {
        setState("waiting");
        setMessage(
          result.message ||
            "Please wait before generating a new PayNow QR.",
        );
        setCanGenerateAfter(result.canGenerateAfter || "");
        setRetrySeconds(result.retryAfterSeconds || 0);
        return;
      }

      if (!response.ok || result.error || !result.qrDataUrl) {
        throw new Error(result.error || "Could not create the PayNow QR.");
      }

      setState("pending");
      setQrDataUrl(result.qrDataUrl);
      setCheckoutUrl(result.checkoutUrl || "");
      setSandboxDirectUrl(result.sandboxDirectUrl || "");
      setEnvironment(result.environment || "");
      setExpiresAt(result.expiresAt || "");
      setCanGenerateAfter(result.canGenerateAfter || "");
      setMessage("Scan the QR using your banking app and complete the payment.");
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not create the PayNow QR.",
      );
    }
  }

  const amountLabel = useMemo(
    () => invoiceCurrency(balanceDue, currency),
    [balanceDue, currency],
  );

  if (state === "paid") {
    return (
      <section className="payment-live-panel rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
          Payment received
        </p>
        <p className="mt-3 text-sm leading-6 text-emerald-900">{message}</p>
      </section>
    );
  }

  return (
    <section className="payment-live-panel rounded-2xl border border-[#d9c49a] bg-[#fff9eb] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#94671f]">
            Pay securely with PayNow
          </p>
          <p className="mt-2 text-sm text-[#6e5a38]">
            Invoice {invoiceNumber} · Amount due <strong>{amountLabel}</strong>
          </p>
        </div>
        {environment === "sandbox" && (
          <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-violet-700">
            Sandbox test
          </span>
        )}
      </div>

      {state === "idle" || state === "error" || state === "waiting" ? (
        <div className="mt-5">
          <p className="text-sm leading-6 text-[#6e5a38]">
            {message ||
              "Generate a QR for the exact outstanding amount. The invoice is marked paid only after the bank payment is confirmed."}
          </p>
          {state === "waiting" && retrySeconds > 0 && (
            <p className="mt-2 text-xs font-bold text-[#94671f]">
              New QR available in {countdownLabel(retrySeconds)}
            </p>
          )}
          <button
            type="button"
            onClick={() => void generateQr()}
            disabled={!canGenerate}
            className="mt-4 min-h-11 rounded-full bg-[#15233b] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state === "waiting" ? "Generate new PayNow QR" : "Generate PayNow QR"}
          </button>
        </div>
      ) : state === "loading" ? (
        <p className="mt-5 text-sm font-semibold text-[#6e5a38]">
          Creating a secure PayNow request…
        </p>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-[240px_minmax(0,1fr)] sm:items-center">
          <div className="rounded-2xl border border-[#dfd4c1] bg-white p-3 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt={`PayNow QR for invoice ${invoiceNumber}`}
              className="mx-auto h-auto w-full"
            />
          </div>

          <div>
            <p className="text-lg font-semibold text-[#17233a]">
              Pay {amountLabel}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#6e5a38]">{message}</p>
            <p className="mt-3 text-xs font-bold text-[#94671f]">
              {secondsLeft > 0
                ? `QR expires in ${countdownLabel(secondsLeft)}`
                : "This QR has expired. Do not pay from a saved screenshot."}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {checkoutUrl && (
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center rounded-full bg-[#15233b] px-4 text-xs font-bold text-white"
                >
                  Open HitPay payment page
                </a>
              )}
              {environment === "sandbox" && sandboxDirectUrl && (
                <a
                  href={sandboxDirectUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center rounded-full border border-violet-200 bg-violet-50 px-4 text-xs font-bold text-violet-700"
                >
                  Complete sandbox test
                </a>
              )}
            </div>

            {qrExpired && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                <p>
                  The QR has expired. We will keep checking for a delayed bank
                  confirmation.
                </p>
                {retrySeconds > 0 ? (
                  <p className="mt-2 font-bold">
                    New QR available in {countdownLabel(retrySeconds)}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => void generateQr()}
                    className="mt-3 min-h-10 rounded-full bg-[#15233b] px-4 text-xs font-bold text-white"
                  >
                    Generate new PayNow QR
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
