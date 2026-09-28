"use client";

import type { BankScreenMode } from "../lib/bank-types";
import type { SavingsInterestSummary } from "../lib/savings-types";

function formatDt(value: number) {
  return `${Math.round(value).toLocaleString("en-SG")} DT`;
}

function formatRate(value: number) {
  return `${value.toFixed(2)}% p.a.`;
}

export default function SavingsRateCard({
  interest,
  screenMode,
  loading,
}: {
  interest: SavingsInterestSummary;
  screenMode: BankScreenMode;
  loading: boolean;
}) {
  const isMobile = screenMode === "mobile";

  return (
    <section
      style={{
        marginTop: "12px",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "minmax(0,0.72fr) minmax(0,1.28fr)",
        gap: "10px",
        alignItems: "stretch",
      }}
    >
      <div
        style={{
          borderRadius: "18px",
          border: "1px solid rgba(255,209,138,0.20)",
          background:
            "linear-gradient(145deg, rgba(91,63,19,0.22), rgba(4,16,34,0.82))",
          padding: isMobile ? "16px" : "17px 19px",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "rgba(255,255,255,0.42)",
            fontSize: "9px",
            fontWeight: 900,
            letterSpacing: "0.13em",
            textTransform: "uppercase",
          }}
        >
          Savings interest rate
        </p>

        <div
          style={{
            marginTop: "7px",
            display: "flex",
            alignItems: "baseline",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <strong
            style={{
              color: "#ffd18a",
              fontSize: isMobile ? "28px" : "32px",
              lineHeight: 1,
              letterSpacing: "-0.04em",
            }}
          >
            {loading ? "—" : formatRate(interest.annualRatePercent)}
          </strong>
          <span style={{ color: "rgba(255,255,255,0.42)", fontSize: "10px" }}>
            calculated daily · credited monthly
          </span>
        </div>

        <div
          style={{
            marginTop: "13px",
            display: "grid",
            gridTemplateColumns: "repeat(2,minmax(0,1fr))",
            gap: "8px",
          }}
        >
          <div
            style={{
              borderRadius: "12px",
              background: "rgba(255,255,255,0.035)",
              padding: "10px 11px",
            }}
          >
            <small style={{ display: "block", color: "rgba(255,255,255,0.35)", fontSize: "8px" }}>
              Interest this year
            </small>
            <strong style={{ display: "block", marginTop: "4px", color: "#ffd18a", fontSize: "13px" }}>
              {loading ? "—" : formatDt(interest.yearToDateInterest)}
            </strong>
          </div>
          <div
            style={{
              borderRadius: "12px",
              background: "rgba(255,255,255,0.035)",
              padding: "10px 11px",
            }}
          >
            <small style={{ display: "block", color: "rgba(255,255,255,0.35)", fontSize: "8px" }}>
              Total interest earned
            </small>
            <strong style={{ display: "block", marginTop: "4px", color: "white", fontSize: "13px" }}>
              {loading ? "—" : formatDt(interest.lifetimeInterest)}
            </strong>
          </div>
        </div>
      </div>

      <div
        style={{
          borderRadius: "18px",
          border: "1px solid rgba(126,232,255,0.15)",
          background: "rgba(4,17,35,0.72)",
          padding: isMobile ? "15px" : "16px 18px",
          display: "grid",
          gridTemplateColumns: "48px minmax(0,1fr)",
          gap: "13px",
          alignItems: "center",
        }}
      >
        <img
          src="/milo-world/milo-character.png"
          alt="Milo"
          style={{
            width: "46px",
            height: "46px",
            objectFit: "contain",
            filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.26))",
          }}
        />
        <div>
          <p
            style={{
              margin: 0,
              color: "#8ee8ff",
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Milo explains
          </p>
          <p
            style={{
              margin: "6px 0 0",
              color: "rgba(255,255,255,0.66)",
              fontSize: isMobile ? "11px" : "12px",
              lineHeight: 1.55,
            }}
          >
            Savings currently earns <strong style={{ color: "#ffd18a" }}>{formatRate(interest.annualRatePercent)}</strong>. The Bank uses each day&apos;s closing savings balance, then adds the interest to the same goal once a month. Savings can be moved back to your Wallet when you need it, so its rate stays lower than the fixed returns offered by Bank Bonds, where DT is locked for a term.
          </p>
        </div>
      </div>
    </section>
  );
}
