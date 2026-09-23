"use client";

import { useState } from "react";
import { TOKEN_PACKAGES } from "../lib/bank-config";
import { useBankResponsive } from "../hooks/useBankResponsive";
import { useBankShopper } from "../hooks/useBankShopper";
import TokenPackCard from "./TokenPackCard";
import TokenPurchaseGate from "./TokenPurchaseGate";

export default function TokenPurchasePanel() {
  const screenMode = useBankResponsive();
  const isMobile = screenMode === "mobile";
  const { userId, userEmail, loading, isLoggedIn } = useBankShopper();
  const [purchaseGateOpen, setPurchaseGateOpen] = useState(false);

  return (
    <section
      style={{
        width: "100%",
        borderRadius: isMobile ? "22px" : "28px",
        border: "1px solid rgba(126,232,255,0.16)",
        background:
          "linear-gradient(145deg, rgba(7,26,50,0.86), rgba(7,10,27,0.9))",
        boxShadow: "0 28px 80px rgba(0,0,0,0.28)",
        padding: isMobile ? "20px" : "28px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ maxWidth: "680px" }}>
          <p
            style={{
              margin: 0,
              color: "#8ee8ff",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Dream Token Store
          </p>

          <h2
            style={{
              margin: "9px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "32px" : "40px",
              lineHeight: 1,
              fontWeight: 500,
            }}
          >
            Add Dream Tokens
          </h2>

          <p
            style={{
              margin: "12px 0 0",
              color: "rgba(255,255,255,0.62)",
              fontSize: isMobile ? "13px" : "14px",
              lineHeight: 1.6,
            }}
          >
            Top up Dream Tokens for games, upgrades, customisation, and other Dreamscape experiences.
          </p>
        </div>

        <span
          style={{
            minHeight: "34px",
            padding: "0 13px",
            borderRadius: "999px",
            border: "1px solid rgba(126,232,255,0.2)",
            background: "rgba(83,215,255,0.07)",
            color: loading
              ? "rgba(255,255,255,0.58)"
              : isLoggedIn
                ? "#9fffd2"
                : "#ffd18a",
            display: "inline-flex",
            alignItems: "center",
            fontSize: "10px",
            fontWeight: 900,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {loading ? "Checking account" : isLoggedIn ? "Account connected" : "Login required"}
        </span>
      </div>

      <div
        style={{
          marginTop: "24px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
          gap: "18px",
        }}
      >
        {TOKEN_PACKAGES.map((tokenPackage) => (
          <TokenPackCard
            key={tokenPackage.tokens}
            tokenPackage={tokenPackage}
            userId={userId}
            userEmail={userEmail}
            isMobile={isMobile}
            onPurchaseBlocked={() => setPurchaseGateOpen(true)}
          />
        ))}
      </div>

      <div
        style={{
          marginTop: "18px",
          borderRadius: "16px",
          border: "1px solid rgba(126,232,255,0.12)",
          background: "rgba(83,215,255,0.045)",
          padding: "14px 16px",
          color: "rgba(255,255,255,0.48)",
          fontSize: "11px",
          lineHeight: 1.6,
        }}
      >
        Dream Tokens are digital in-platform credits for Dreamscape One. They
        are not cash and cannot be withdrawn. Savings Goals and Bank Bonds use separate in-platform systems and do not make Dream Tokens withdrawable for cash.
      </div>

      <TokenPurchaseGate
        open={purchaseGateOpen}
        onClose={() => setPurchaseGateOpen(false)}
      />
    </section>
  );
}
