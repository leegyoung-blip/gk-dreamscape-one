"use client";

import type { BankScreenMode } from "../lib/bank-types";
import { MILO_FINANCE_MEMBERSHIP_HREF } from "../lib/milo-finance-access";

const BENEFITS = [
  "Advanced financial-learning pathways",
  "Full simulation and financial-case suite",
  "Advanced Bank Bond products",
  "Advanced Exchange tools and Business Builder access",
  "Deeper Financial Skills analytics and future certificates",
];

export default function MiloFinanceUpgradeModal({
  open,
  onClose,
  screenMode,
}: {
  open: boolean;
  onClose: () => void;
  screenMode: BankScreenMode;
}) {
  if (!open) return null;
  const isMobile = screenMode === "mobile";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Milo Finance access"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1500,
        background: "rgba(0,5,14,0.84)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "18px",
      }}
    >
      <div
        style={{
          width: "min(620px, 100%)",
          maxHeight: "calc(100dvh - 32px)",
          overflowY: "auto",
          borderRadius: isMobile ? "24px" : "28px",
          border: "1px solid rgba(255,209,138,0.24)",
          background:
            "radial-gradient(circle at 86% 0%, rgba(255,209,138,0.10), transparent 32%), linear-gradient(145deg, rgba(12,24,43,0.995), rgba(5,8,22,0.995))",
          boxShadow: "0 38px 120px rgba(0,0,0,0.66)",
          padding: isMobile ? "21px" : "26px",
          color: "white",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
          <div>
            <p
              style={{
                margin: 0,
                color: "#ffd18a",
                fontSize: "9px",
                fontWeight: 900,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              Milo Finance
            </p>
            <h2
              style={{
                margin: "8px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "36px" : "44px",
                lineHeight: 0.98,
                fontWeight: 500,
                letterSpacing: "-0.035em",
              }}
            >
              Go deeper with money, markets and business.
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: "38px",
              height: "38px",
              flexShrink: 0,
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              color: "white",
              cursor: "pointer",
              fontSize: "20px",
            }}
          >
            ×
          </button>
        </div>

        <p
          style={{
            margin: "15px 0 0",
            color: "rgba(255,255,255,0.58)",
            fontSize: "13px",
            lineHeight: 1.7,
          }}
        >
          The free Bank remains useful for every learner. Milo Finance unlocks the advanced
          learning, simulation and enterprise layer across Milo’s World.
        </p>

        <div style={{ marginTop: "20px", display: "grid", gap: "8px" }}>
          {BENEFITS.map((benefit) => (
            <div
              key={benefit}
              style={{
                minHeight: "44px",
                borderRadius: "13px",
                border: "1px solid rgba(255,255,255,0.065)",
                background: "rgba(255,255,255,0.028)",
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "rgba(255,255,255,0.70)",
                fontSize: "11px",
              }}
            >
              <span style={{ color: "#ffd18a", fontWeight: 900 }}>◆</span>
              {benefit}
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "19px",
            borderRadius: "15px",
            border: "1px solid rgba(126,232,255,0.10)",
            background: "rgba(83,215,255,0.035)",
            padding: "12px 13px",
            color: "rgba(255,255,255,0.48)",
            fontSize: "10px",
            lineHeight: 1.55,
          }}
        >
          Milo Finance is separate from NOVA / NOVA+ access. Existing free Bank tools and
          Financial Foundations remain available without this entitlement.
        </div>

        <div
          style={{
            marginTop: "20px",
            display: "flex",
            justifyContent: "flex-end",
            gap: "9px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              minHeight: "46px",
              padding: "0 17px",
              borderRadius: "13px",
              border: "1px solid rgba(255,255,255,0.09)",
              background: "rgba(255,255,255,0.035)",
              color: "rgba(255,255,255,0.66)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            Not now
          </button>
          <a
            href={MILO_FINANCE_MEMBERSHIP_HREF}
            style={{
              minHeight: "46px",
              padding: "0 18px",
              borderRadius: "13px",
              border: "1px solid rgba(255,209,138,0.34)",
              background:
                "linear-gradient(135deg, rgba(255,209,138,0.18), rgba(176,120,255,0.12))",
              color: "white",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            View Milo Finance →
          </a>
        </div>
      </div>
    </div>
  );
}
