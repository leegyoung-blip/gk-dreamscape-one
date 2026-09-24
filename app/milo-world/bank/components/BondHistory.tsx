"use client";

import type { BankScreenMode } from "../lib/bank-types";
import type { BondHolding } from "../lib/bond-types";

function formatDt(value: number) {
  return `${Math.round(value).toLocaleString("en-SG")} DT`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function BondHistory({
  holdings,
  screenMode,
}: {
  holdings: BondHolding[];
  screenMode: BankScreenMode;
}) {
  const isMobile = screenMode === "mobile";
  const settled = holdings.filter((holding) => holding.status === "settled");

  return (
    <section
      style={{
        marginTop: "18px",
        borderRadius: isMobile ? "22px" : "26px",
        border: "1px solid rgba(126,232,255,0.12)",
        background: "linear-gradient(145deg, rgba(6,22,41,0.74), rgba(5,9,23,0.82))",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: isMobile ? "18px" : "21px 23px",
          borderBottom: "1px solid rgba(126,232,255,0.09)",
        }}
      >
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
          Bond History
        </p>
        <h3 style={{ margin: "6px 0 0", fontSize: "22px", letterSpacing: "-0.025em" }}>
          Completed Bonds
        </h3>
      </div>

      {settled.length === 0 ? (
        <div
          style={{
            padding: "28px 20px",
            textAlign: "center",
            color: "rgba(255,255,255,0.42)",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          Completed Bonds will appear here after you collect their returns.
        </div>
      ) : (
        <div>
          {settled.map((holding, index) => (
            <div
              key={holding.id}
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr auto" : "minmax(0,1.35fr) 0.7fr 0.7fr 0.8fr",
                gap: isMobile ? "8px 14px" : "14px",
                alignItems: "center",
                padding: isMobile ? "15px 18px" : "15px 23px",
                borderTop: index === 0 ? "none" : "1px solid rgba(255,255,255,0.055)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <strong
                  style={{
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: "12px",
                  }}
                >
                  {holding.bondName}
                </strong>
                <span
                  style={{
                    display: "block",
                    marginTop: "4px",
                    color: "rgba(255,255,255,0.36)",
                    fontSize: "9px",
                  }}
                >
                  Settled {formatDate(holding.settledAt)}
                </span>
              </div>
              <strong style={{ color: "white", fontSize: "11px", textAlign: "right" }}>
                {formatDt(holding.principal)}
              </strong>
              {!isMobile && (
                <strong style={{ color: "#9fffd2", fontSize: "11px", textAlign: "right" }}>
                  +{formatDt(holding.interestAmount)}
                </strong>
              )}
              {!isMobile && (
                <strong style={{ color: "rgba(255,255,255,0.68)", fontSize: "11px", textAlign: "right" }}>
                  {formatDt(holding.payoutAmount)}
                </strong>
              )}
              {isMobile && (
                <span
                  style={{
                    gridColumn: "1 / -1",
                    color: "#9fffd2",
                    fontSize: "10px",
                  }}
                >
                  +{formatDt(holding.interestAmount)} interest earned
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
