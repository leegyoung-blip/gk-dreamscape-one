"use client";

import { useEffect, useMemo, useState } from "react";
import type { BondProduct, BondHolding } from "../lib/bond-types";
import { bondReturnPercent, calculateBondInterest } from "../lib/bond-api";

function formatDt(value: number) {
  return `${Math.round(value).toLocaleString("en-SG")} DT`;
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "Could not purchase this Bond.";
}

export default function BondPurchaseModal({
  product,
  eligibleDt,
  open,
  loading,
  onClose,
  onPurchase,
}: {
  product: BondProduct | null;
  eligibleDt: number;
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onPurchase: (productId: string, amount: number) => Promise<BondHolding>;
}) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"amount" | "confirm">("amount");

  useEffect(() => {
    if (!open || !product) return;
    setAmount(String(product.minInvestment));
    setError(null);
    setStep("amount");
  }, [open, product]);

  const numericAmount = Math.floor(Number(amount || 0));
  const maxAllowed = product
    ? Math.max(0, Math.min(product.maxInvestment, Math.floor(eligibleDt)))
    : 0;
  const interest = product
    ? calculateBondInterest(numericAmount, product.returnRateBps)
    : 0;
  const payout = numericAmount + interest;
  const valid = Boolean(
    product &&
      numericAmount >= product.minInvestment &&
      numericAmount <= maxAllowed,
  );

  const maturityText = useMemo(() => {
    if (!product) return "";
    const date = new Date();
    date.setDate(date.getDate() + product.termDays);
    return new Intl.DateTimeFormat("en-SG", {
      timeZone: "Asia/Singapore",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  }, [product]);

  if (!open || !product) return null;

  function choosePreset(value: number) {
    setAmount(String(Math.max(product.minInvestment, Math.min(maxAllowed, value))));
    setError(null);
  }

  async function confirmPurchase() {
    if (!valid || loading) return;
    setError(null);
    try {
      await onPurchase(product.id, numericAmount);
      onClose();
    } catch (caught) {
      setError(messageFrom(caught));
      setStep("amount");
    }
  }

  return (
    <div
      role="presentation"
      onClick={() => !loading && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 190,
        padding: "18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.74)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Buy ${product.name}`}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(560px, 100%)",
          maxHeight: "calc(100dvh - 36px)",
          overflowY: "auto",
          borderRadius: "28px",
          border: "1px solid rgba(126,232,255,0.24)",
          background:
            "radial-gradient(circle at 88% 0%, rgba(83,215,255,0.12), transparent 34%), linear-gradient(145deg, rgba(6,25,47,0.997), rgba(6,8,24,0.997))",
          boxShadow: "0 38px 120px rgba(0,0,0,0.68)",
          padding: "26px",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
          <div
            style={{
              width: "54px",
              height: "54px",
              flexShrink: 0,
              borderRadius: "18px",
              border: "1px solid rgba(126,232,255,0.22)",
              background: "rgba(83,215,255,0.08)",
              color: "#8ee8ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
            }}
          >
            ◆
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: "9px",
                fontWeight: 900,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              {step === "confirm" ? "Confirm Investment" : `${product.termDays}-Day Bank Bond`}
            </p>
            <h2
              style={{
                margin: "6px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: "34px",
                lineHeight: 1,
                fontWeight: 500,
                letterSpacing: "-0.04em",
              }}
            >
              {product.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close bond purchase"
            style={{
              width: "38px",
              height: "38px",
              flexShrink: 0,
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              color: "white",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "20px",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            marginTop: "20px",
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0,1fr))",
            gap: "8px",
          }}
        >
          {[
            ["Term", `${product.termDays} days`],
            ["Return", `${bondReturnPercent(product.returnRateBps)}%`],
            ["Eligible DT", formatDt(eligibleDt)],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.07)",
                background: "rgba(255,255,255,0.03)",
                padding: "12px",
              }}
            >
              <span
                style={{
                  display: "block",
                  color: "rgba(255,255,255,0.36)",
                  fontSize: "8px",
                  fontWeight: 850,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </span>
              <strong
                style={{
                  display: "block",
                  marginTop: "6px",
                  color: label === "Return" ? "#9fffd2" : "white",
                  fontSize: "14px",
                }}
              >
                {value}
              </strong>
            </div>
          ))}
        </div>

        {step === "amount" ? (
          <>
            <label style={{ display: "block", marginTop: "20px" }}>
              <span
                style={{
                  color: "rgba(255,255,255,0.62)",
                  fontSize: "11px",
                  fontWeight: 850,
                }}
              >
                How much DT do you want to invest?
              </span>
              <div style={{ position: "relative", marginTop: "8px" }}>
                <input
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value.replace(/[^0-9]/g, ""));
                    setError(null);
                  }}
                  inputMode="numeric"
                  autoFocus
                  style={{
                    width: "100%",
                    height: "58px",
                    borderRadius: "15px",
                    border: valid
                      ? "1px solid rgba(126,232,255,0.20)"
                      : "1px solid rgba(255,160,130,0.30)",
                    background: "rgba(255,255,255,0.045)",
                    color: "white",
                    outline: "none",
                    padding: "0 58px 0 16px",
                    fontFamily: "inherit",
                    fontSize: "24px",
                    fontWeight: 900,
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    right: "16px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#8ee8ff",
                    fontSize: "11px",
                    fontWeight: 900,
                  }}
                >
                  DT
                </span>
              </div>
            </label>

            <div
              style={{
                marginTop: "9px",
                display: "flex",
                flexWrap: "wrap",
                gap: "7px",
              }}
            >
              {[
                product.minInvestment,
                Math.floor(maxAllowed * 0.5),
                Math.floor(maxAllowed * 0.75),
                maxAllowed,
              ]
                .filter((value, index, values) => value >= product.minInvestment && values.indexOf(value) === index)
                .map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => choosePreset(value)}
                    style={{
                      minHeight: "34px",
                      padding: "0 11px",
                      borderRadius: "10px",
                      border: "1px solid rgba(126,232,255,0.12)",
                      background: "rgba(83,215,255,0.05)",
                      color: "rgba(255,255,255,0.70)",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: "9px",
                      fontWeight: 850,
                    }}
                  >
                    {value === maxAllowed ? "Max" : formatDt(value)}
                  </button>
                ))}
            </div>

            <p
              style={{
                margin: "10px 0 0",
                color: "rgba(255,255,255,0.36)",
                fontSize: "10px",
                lineHeight: 1.45,
              }}
            >
              Investment range: {formatDt(product.minInvestment)}–{formatDt(product.maxInvestment)}. Only eligible earned/reward DT can be placed into Bank Bonds.
            </p>

            <div
              style={{
                marginTop: "18px",
                borderRadius: "17px",
                border: "1px solid rgba(93,255,181,0.14)",
                background: "rgba(93,255,181,0.045)",
                padding: "15px",
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0,1fr))",
                gap: "10px",
              }}
            >
              {[
                ["Principal", formatDt(numericAmount)],
                ["Interest", `+${formatDt(interest)}`],
                ["At maturity", formatDt(payout)],
              ].map(([label, value]) => (
                <div key={label}>
                  <span
                    style={{
                      display: "block",
                      color: "rgba(255,255,255,0.38)",
                      fontSize: "8px",
                      fontWeight: 850,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {label}
                  </span>
                  <strong
                    style={{
                      display: "block",
                      marginTop: "5px",
                      color: label === "Interest" ? "#9fffd2" : "white",
                      fontSize: "14px",
                    }}
                  >
                    {value}
                  </strong>
                </div>
              ))}
            </div>

            {!valid && (
              <p
                style={{
                  margin: "12px 0 0",
                  color: "#ffc0a0",
                  fontSize: "11px",
                  lineHeight: 1.45,
                }}
              >
                Enter an amount between {formatDt(product.minInvestment)} and {formatDt(maxAllowed)}.
              </p>
            )}
          </>
        ) : (
          <div
            style={{
              marginTop: "20px",
              borderRadius: "19px",
              border: "1px solid rgba(255,209,138,0.18)",
              background: "rgba(255,209,138,0.05)",
              padding: "18px",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#ffd18a",
                fontSize: "9px",
                fontWeight: 900,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Review before buying
            </p>
            <h3
              style={{
                margin: "8px 0 0",
                fontSize: "26px",
                letterSpacing: "-0.035em",
              }}
            >
              {formatDt(numericAmount)} → {formatDt(payout)}
            </h3>
            <p
              style={{
                margin: "11px 0 0",
                color: "rgba(255,255,255,0.58)",
                fontSize: "12px",
                lineHeight: 1.6,
              }}
            >
              {formatDt(numericAmount)} will be locked until approximately <strong style={{ color: "white" }}>{maturityText}</strong>. At maturity, collect the Bond to unlock your principal and receive <strong style={{ color: "#9fffd2" }}>+{formatDt(interest)}</strong> in interest.
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            style={{
              marginTop: "14px",
              borderRadius: "13px",
              border: "1px solid rgba(255,160,130,0.22)",
              background: "rgba(255,120,90,0.07)",
              padding: "11px 12px",
              color: "#ffc0a0",
              fontSize: "11px",
              lineHeight: 1.45,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            marginTop: "20px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "9px",
          }}
        >
          <button
            type="button"
            onClick={() => (step === "confirm" ? setStep("amount") : onClose())}
            disabled={loading}
            style={{
              minHeight: "48px",
              borderRadius: "13px",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.70)",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            {step === "confirm" ? "Back" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={() => (step === "amount" ? setStep("confirm") : confirmPurchase())}
            disabled={!valid || loading}
            style={{
              minHeight: "48px",
              borderRadius: "13px",
              border: valid
                ? "1px solid rgba(126,232,255,0.42)"
                : "1px solid rgba(255,255,255,0.08)",
              background: valid
                ? "linear-gradient(135deg, rgba(83,215,255,0.20), rgba(92,80,210,0.18))"
                : "rgba(255,255,255,0.03)",
              color: valid ? "white" : "rgba(255,255,255,0.30)",
              cursor: valid && !loading ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            {loading ? "Processing…" : step === "amount" ? "Review Bond →" : "Confirm Purchase"}
          </button>
        </div>
      </section>
    </div>
  );
}
