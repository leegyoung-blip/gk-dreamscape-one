"use client";

import type { BondHolding } from "../lib/bond-types";

function formatDt(value: number) {
  return `${Math.round(value).toLocaleString("en-SG")} DT`;
}

export default function BondSettlementCelebration({
  holding,
  open,
  onClose,
}: {
  holding: BondHolding | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open || !holding) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 195,
        padding: "18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Bond return collected"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(500px, 100%)",
          overflow: "hidden",
          borderRadius: "30px",
          border: "1px solid rgba(255,209,138,0.36)",
          background:
            "radial-gradient(circle at 50% 10%, rgba(255,225,145,0.22), transparent 32%), linear-gradient(145deg, rgba(38,27,23,0.995), rgba(7,9,23,0.998))",
          boxShadow: "0 38px 130px rgba(0,0,0,0.72), 0 0 60px rgba(255,195,84,0.10)",
          color: "white",
          padding: "34px 28px 28px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            margin: "0 auto",
            borderRadius: "26px",
            border: "1px solid rgba(255,209,138,0.40)",
            background: "rgba(255,209,138,0.09)",
            color: "#ffd18a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "34px",
            boxShadow: "0 0 38px rgba(255,209,138,0.10)",
          }}
        >
          ✦
        </div>
        <p
          style={{
            margin: "20px 0 0",
            color: "#ffd18a",
            fontSize: "10px",
            fontWeight: 900,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          Bond Complete
        </p>
        <h2
          style={{
            margin: "8px 0 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: "42px",
            lineHeight: 0.98,
            fontWeight: 500,
            letterSpacing: "-0.045em",
          }}
        >
          Your DT grew.
        </h2>
        <p
          style={{
            margin: "15px auto 0",
            color: "rgba(255,255,255,0.56)",
            fontSize: "12px",
            lineHeight: 1.6,
            maxWidth: "390px",
          }}
        >
          {holding.bondName} has been settled. Your original principal is available again and your interest has been added to your Wallet.
        </p>

        <div
          style={{
            margin: "22px auto 0",
            width: "min(320px, 100%)",
            borderRadius: "20px",
            border: "1px solid rgba(93,255,181,0.17)",
            background: "rgba(93,255,181,0.05)",
            padding: "18px",
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.38)",
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
            }}
          >
            Interest earned
          </span>
          <strong
            style={{
              display: "block",
              marginTop: "7px",
              color: "#9fffd2",
              fontSize: "34px",
              lineHeight: 1,
              letterSpacing: "-0.04em",
            }}
          >
            +{formatDt(holding.interestAmount)}
          </strong>
        </div>

        <button
          type="button"
          onClick={onClose}
          autoFocus
          style={{
            marginTop: "22px",
            width: "100%",
            minHeight: "50px",
            borderRadius: "14px",
            border: "1px solid rgba(255,209,138,0.38)",
            background: "linear-gradient(135deg, rgba(255,190,90,0.20), rgba(190,117,44,0.18))",
            color: "white",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "10px",
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Back to Bank Bonds
        </button>
      </section>
    </div>
  );
}
