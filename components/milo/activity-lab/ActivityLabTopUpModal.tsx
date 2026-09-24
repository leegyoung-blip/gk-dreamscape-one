"use client";

import { useEffect, useRef, useState } from "react";
import { useActivityLabCredits } from "@/hooks/useActivityLabCredits";

type Props = {
  mobile: boolean;
  userId: string;
  open: boolean;
  onClose: () => void;
  onBatteryRefresh: () => Promise<unknown> | unknown;
};

const BOLT_REDEMPTIONS = [
  { bolts: 100, credits: 15 },
  { bolts: 200, credits: 30 },
  { bolts: 500, credits: 75 },
] as const;

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function cleanCheckoutParams() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("credits");
  url.searchParams.delete("session_id");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export default function ActivityLabTopUpModal({
  mobile,
  userId,
  open,
  onClose,
  onBatteryRefresh,
}: Props) {
  const credits = useActivityLabCredits(userId);
  const [message, setMessage] = useState<string | null>(null);
  const confirmedSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !userId) return;
    void credits.refresh();
  }, [open, userId]);

  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;

    const params = new URLSearchParams(window.location.search);
    const status = params.get("credits");

    if (status === "cancelled") {
      setMessage("Checkout cancelled. No Play Credits were purchased.");
      cleanCheckoutParams();
      return;
    }

    if (status !== "success") return;

    const sessionId = String(params.get("session_id") || "").trim();
    if (!sessionId || confirmedSessionRef.current === sessionId) return;
    confirmedSessionRef.current = sessionId;

    let cancelled = false;

    async function confirmWithStripe() {
      setMessage("Confirming your Stripe payment…");

      for (let attempt = 0; attempt < 4; attempt += 1) {
        const result = await credits.confirmCheckout(sessionId);
        if (cancelled) return;

        if (result && !result.pending) {
          await credits.refresh();
          if (cancelled) return;
          setMessage(
            result.applied
              ? `Payment confirmed. ${result.credits} Play Credits were added to your wallet.`
              : `Payment confirmed. Your ${result.credits} Play Credits were already added.`,
          );
          cleanCheckoutParams();
          return;
        }

        if (!result) {
          setMessage("Stripe payment confirmation could not be completed. Please try reopening Get More Bolts.");
          return;
        }

        setMessage("Stripe has the payment, but it is still processing. Checking again…");
        await new Promise((resolve) => window.setTimeout(resolve, 1800 + attempt * 1200));
      }

      if (!cancelled) {
        setMessage("Payment is still processing. Your Play Credits will appear automatically when Stripe confirms it.");
        cleanCheckoutParams();
      }
    }

    void confirmWithStripe();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!open) return null;

  const balance = credits.wallet?.balanceCredits ?? 0;

  async function redeem(option: (typeof BOLT_REDEMPTIONS)[number]) {
    setMessage(null);
    const result = await credits.redeem(option.credits);
    if (!result) return;

    if (!result.accepted) {
      setMessage(`You need ${option.credits} Play Credits for ${option.bolts} Bolts.`);
      return;
    }

    await onBatteryRefresh();
    setMessage(`Added ${result.boltsAdded} reserve Bolts to your Activity Lab battery.`);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 310,
        display: "grid",
        placeItems: "center",
        padding: 16,
        background: "rgba(0,4,12,.84)",
        backdropFilter: "blur(10px)",
      }}
    >
      <section
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(780px,100%)",
          maxHeight: "90dvh",
          overflowY: "auto",
          borderRadius: 26,
          border: "1px solid rgba(126,232,255,.2)",
          background: "linear-gradient(145deg,rgba(7,25,45,.99),rgba(3,9,24,.995))",
          boxShadow: "0 30px 90px rgba(0,0,0,.55)",
          padding: mobile ? 18 : 24,
          color: "white",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <p style={{ margin: 0, color: "#9feeff", fontSize: 9, fontWeight: 950, letterSpacing: ".16em" }}>
              ACTIVITY LAB · BOLTS & PLAY CREDITS
            </p>
            <h2 style={{ margin: "6px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile ? 30 : 38, fontWeight: 400 }}>
              Get more Bolts
            </h2>
            <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,.5)", fontSize: 11, lineHeight: 1.5 }}>
              Your rechargeable battery holds 100 Bolts. Each Activity Lab run costs 5 Bolts. Play Credits can be exchanged for reserve Bolts that sit above the rechargeable battery.
            </p>
          </div>

          <button type="button" onClick={onClose} style={{ width: 38, height: 38, borderRadius: 999, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "white", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        {!userId ? (
          <div style={{ marginTop: 18, padding: 14, borderRadius: 16, border: "1px solid rgba(255,214,111,.18)", background: "rgba(255,214,111,.05)", color: "rgba(255,255,255,.65)", fontSize: 11 }}>
            Log in before buying or using Play Credits.
          </div>
        ) : (
          <>
            <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: 16, border: "1px solid rgba(126,232,255,.16)", background: "rgba(83,215,255,.045)", padding: 14 }}>
              <span style={{ color: "rgba(255,255,255,.52)", fontSize: 10, fontWeight: 850 }}>YOUR PLAY CREDITS</span>
              <strong style={{ color: "#9fffd2", fontSize: 22 }}>{credits.loading || credits.confirming ? "…" : balance}</strong>
            </div>

            <h3 style={{ margin: "20px 0 0", fontSize: 14 }}>Exchange Credits for Bolts</h3>
            <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,.4)", fontSize: 10 }}>Reserve Bolts do not disappear when the rechargeable 100-Bolt battery refills.</p>
            <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 8 }}>
              {BOLT_REDEMPTIONS.map((option) => {
                const enough = balance >= option.credits;
                return (
                  <button
                    key={option.bolts}
                    type="button"
                    disabled={!enough || credits.redeeming || credits.confirming}
                    onClick={() => void redeem(option)}
                    style={{
                      minHeight: 86,
                      borderRadius: 16,
                      border: enough ? "1px solid rgba(132,239,178,.22)" : "1px solid rgba(255,255,255,.07)",
                      background: enough ? "rgba(132,239,178,.055)" : "rgba(255,255,255,.025)",
                      color: enough ? "white" : "rgba(255,255,255,.35)",
                      cursor: enough ? "pointer" : "not-allowed",
                    }}
                  >
                    <strong style={{ display: "block", fontSize: 18 }}>+{option.bolts} Bolts</strong>
                    <span style={{ display: "block", marginTop: 5, fontSize: 10, color: enough ? "#9fffd2" : "rgba(255,255,255,.3)" }}>
                      {option.credits} Play Credits
                    </span>
                  </button>
                );
              })}
            </div>

            <h3 style={{ margin: "22px 0 0", fontSize: 14 }}>Buy Play Credits</h3>
            <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: mobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 8 }}>
              {credits.packs.map((pack) => (
                <div key={pack.packKey} style={{ minWidth: 0, borderRadius: 17, border: "1px solid rgba(126,232,255,.13)", background: "rgba(255,255,255,.025)", padding: 13 }}>
                  <strong style={{ display: "block", fontSize: 15 }}>{pack.title}</strong>
                  <span style={{ display: "block", marginTop: 4, color: "rgba(255,255,255,.42)", fontSize: 9, lineHeight: 1.4 }}>{pack.description}</span>

                  <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", gap: 7 }}>
                    {pack.compareAtPriceCents && pack.compareAtPriceCents > pack.priceCents && (
                      <span style={{ color: "rgba(255,255,255,.35)", fontSize: 11, textDecoration: "line-through" }}>
                        {money(pack.compareAtPriceCents, pack.currency)}
                      </span>
                    )}
                    <strong style={{ color: "#ffd66f", fontSize: 18 }}>{money(pack.priceCents, pack.currency)}</strong>
                  </div>

                  <button
                    type="button"
                    disabled={Boolean(credits.buyingPackKey) || credits.confirming}
                    onClick={() => void credits.buyPack(pack.packKey)}
                    style={{ width: "100%", minHeight: 39, marginTop: 10, borderRadius: 12, border: "1px solid rgba(255,209,106,.3)", background: "linear-gradient(135deg,#ffd16a,#f5a73f)", color: "#211300", fontSize: 10, fontWeight: 950, cursor: credits.buyingPackKey ? "wait" : "pointer" }}
                  >
                    {credits.buyingPackKey === pack.packKey ? "Opening Stripe…" : "Buy with Stripe"}
                  </button>
                </div>
              ))}
            </div>

            {(message || credits.error) && (
              <div style={{ marginTop: 14, borderRadius: 14, border: `1px solid ${credits.error ? "rgba(255,113,135,.2)" : "rgba(132,239,178,.18)"}`, background: credits.error ? "rgba(255,113,135,.05)" : "rgba(132,239,178,.045)", padding: 11, color: credits.error ? "#ff9ca7" : "#baffd6", fontSize: 10, lineHeight: 1.45 }}>
                {credits.error || message}
              </div>
            )}

            <p style={{ margin: "16px 0 0", color: "rgba(255,255,255,.3)", fontSize: 8.5, lineHeight: 1.5 }}>
              Stripe handles payment-card details. Dreamscape stores the order, payment status and resulting Play Credit transaction, not full card details. Real-money purchases should be completed by an authorised payer where required.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
