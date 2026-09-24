"use client";

import { useEffect, useMemo, useState } from "react";
import type { BankScreenMode } from "../lib/bank-types";
import type { BondHolding } from "../lib/bond-types";
import { bondReturnPercent } from "../lib/bond-api";

function formatDt(value: number) {
  return `${Math.round(value).toLocaleString("en-SG")} DT`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getRemaining(target: string, now: number) {
  const ms = Math.max(0, new Date(target).getTime() - now);
  const totalMinutes = Math.ceil(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return { ms, days, hours, minutes };
}

export default function BondHoldingCard({
  holding,
  screenMode,
  onCollect,
}: {
  holding: BondHolding;
  screenMode: BankScreenMode;
  onCollect: (holding: BondHolding) => void;
}) {
  const isMobile = screenMode === "mobile";
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (holding.status !== "active") return;
    const interval = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, [holding.status]);

  const remaining = useMemo(() => getRemaining(holding.maturesAt, now), [holding.maturesAt, now]);
  const purchased = new Date(holding.purchasedAt).getTime();
  const matures = new Date(holding.maturesAt).getTime();
  const progress = holding.status === "matured"
    ? 100
    : Math.max(0, Math.min(100, ((now - purchased) / Math.max(1, matures - purchased)) * 100));
  const matured = holding.status === "matured" || remaining.ms <= 0;

  return (
    <article
      style={{
        borderRadius: "22px",
        border: matured
          ? "1px solid rgba(255,209,138,0.34)"
          : "1px solid rgba(126,232,255,0.14)",
        background: matured
          ? "radial-gradient(circle at 92% 0%, rgba(255,209,138,0.12), transparent 34%), linear-gradient(145deg, rgba(33,27,31,0.94), rgba(8,12,27,0.96))"
          : "linear-gradient(145deg, rgba(7,26,47,0.92), rgba(5,10,26,0.96))",
        padding: isMobile ? "18px" : "20px",
        boxShadow: "0 18px 48px rgba(0,0,0,0.17)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "14px",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              color: matured ? "#ffd18a" : "#8ee8ff",
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: "0.13em",
              textTransform: "uppercase",
            }}
          >
            {matured ? "Ready to collect" : `${holding.termDays}-Day Bond`}
          </p>
          <h3
            style={{
              margin: "7px 0 0",
              fontSize: isMobile ? "24px" : "27px",
              lineHeight: 1,
              letterSpacing: "-0.035em",
            }}
          >
            {holding.bondName}
          </h3>
        </div>

        <span
          style={{
            minHeight: "29px",
            padding: "0 10px",
            borderRadius: "999px",
            border: matured
              ? "1px solid rgba(255,209,138,0.25)"
              : "1px solid rgba(126,232,255,0.18)",
            background: matured
              ? "rgba(255,209,138,0.07)"
              : "rgba(83,215,255,0.055)",
            color: matured ? "#ffd18a" : "#8ee8ff",
            display: "inline-flex",
            alignItems: "center",
            fontSize: "9px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            whiteSpace: "nowrap",
          }}
        >
          {matured ? "Matured" : "Active"}
        </span>
      </div>

      <div
        style={{
          marginTop: "18px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0,1fr))",
          gap: "8px",
        }}
      >
        {[
          ["Principal", formatDt(holding.principal)],
          ["Return", `${bondReturnPercent(holding.returnRateBps)}%`],
          ["Interest", `+${formatDt(holding.interestAmount)}`],
          ["Payout", formatDt(holding.payoutAmount)],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              borderRadius: "13px",
              border: "1px solid rgba(255,255,255,0.065)",
              background: "rgba(255,255,255,0.028)",
              padding: "10px",
            }}
          >
            <span
              style={{
                display: "block",
                color: "rgba(255,255,255,0.34)",
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
                marginTop: "5px",
                color: label === "Interest" ? "#9fffd2" : "white",
                fontSize: "13px",
              }}
            >
              {value}
            </strong>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "17px" }}>
        <div
          style={{
            height: "8px",
            overflow: "hidden",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.055)",
          }}
        >
          <div
            style={{
              width: `${matured ? 100 : progress}%`,
              height: "100%",
              borderRadius: "999px",
              background: matured
                ? "linear-gradient(90deg, rgba(255,190,90,0.82), rgba(255,226,158,0.96))"
                : "linear-gradient(90deg, rgba(83,215,255,0.72), rgba(115,102,255,0.84))",
              transition: "width 500ms ease",
            }}
          />
        </div>

        <div
          style={{
            marginTop: "9px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
            color: "rgba(255,255,255,0.42)",
            fontSize: "10px",
          }}
        >
          <span>{matured ? "Term complete" : `${remaining.days}d ${remaining.hours}h ${remaining.minutes}m remaining`}</span>
          <span>{formatDate(holding.maturesAt)}</span>
        </div>
      </div>

      {matured ? (
        <button
          type="button"
          onClick={() => onCollect(holding)}
          style={{
            marginTop: "17px",
            width: "100%",
            minHeight: "48px",
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
          Collect Return · +{formatDt(holding.interestAmount)}
        </button>
      ) : (
        <div
          style={{
            marginTop: "17px",
            borderRadius: "13px",
            border: "1px solid rgba(126,232,255,0.09)",
            background: "rgba(83,215,255,0.035)",
            padding: "11px 12px",
            color: "rgba(255,255,255,0.45)",
            fontSize: "10px",
            lineHeight: 1.45,
          }}
        >
          Your {formatDt(holding.principal)} principal is reserved until this Bond reaches maturity.
        </div>
      )}
    </article>
  );
}
