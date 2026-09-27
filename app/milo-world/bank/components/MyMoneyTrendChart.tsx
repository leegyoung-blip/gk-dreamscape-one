"use client";

import { useMemo, useState } from "react";
import type { BankAccountSnapshot, BankScreenMode } from "../lib/bank-types";
import {
  useMyMoneyTrend,
  type MoneyTrendPoint,
  type MoneyTrendRange,
} from "../hooks/useMyMoneyTrend";

const WIDTH = 900;
const HEIGHT = 260;
const PAD = { top: 24, right: 24, bottom: 38, left: 70 };

function formatDt(value: number) {
  return `${Math.round(value).toLocaleString("en-SG")} DT`;
}

function compactDt(value: number) {
  return new Intl.NumberFormat("en-SG", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.round(value));
}

function linePath(
  points: MoneyTrendPoint[],
  valueFor: (point: MoneyTrendPoint) => number,
  maxValue: number,
) {
  if (!points.length) return "";
  const innerWidth = WIDTH - PAD.left - PAD.right;
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;

  return points
    .map((point, index) => {
      const x =
        PAD.left +
        (points.length <= 1 ? 0 : (index / (points.length - 1)) * innerWidth);
      const y =
        PAD.top + innerHeight - (Math.max(0, valueFor(point)) / maxValue) * innerHeight;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export default function MyMoneyTrendChart({
  account,
  isLoggedIn,
  screenMode,
}: {
  account: BankAccountSnapshot;
  isLoggedIn: boolean;
  screenMode: BankScreenMode;
}) {
  const isMobile = screenMode === "mobile";
  const [range, setRange] = useState<MoneyTrendRange>("90d");
  const { points, loading, error } = useMyMoneyTrend(account, isLoggedIn, range);

  const maxValue = useMemo(() => {
    const highest = points.reduce(
      (max, point) => Math.max(max, point.portfolio, point.savings),
      Math.max(account.savings + account.bonds, account.savings, 1),
    );
    return Math.max(1, highest * 1.12);
  }, [account.bonds, account.savings, points]);

  const savingsPath = useMemo(
    () => linePath(points, (point) => point.savings, maxValue),
    [maxValue, points],
  );
  const portfolioPath = useMemo(
    () => linePath(points, (point) => point.portfolio, maxValue),
    [maxValue, points],
  );

  const labels = useMemo(() => {
    if (!points.length) return [];
    const indexes = [0, Math.floor((points.length - 1) / 2), points.length - 1];
    return indexes.map((index) => ({ index, label: points[index]?.label ?? "" }));
  }, [points]);

  const innerHeight = HEIGHT - PAD.top - PAD.bottom;
  const innerWidth = WIDTH - PAD.left - PAD.right;
  const currentPortfolio = account.savings + account.bonds;

  return (
    <section
      style={{
        minWidth: 0,
        borderRadius: isMobile ? "22px" : "26px",
        border: "1px solid rgba(126,232,255,0.16)",
        background:
          "linear-gradient(145deg, rgba(5,22,42,0.90), rgba(5,10,27,0.94))",
        padding: isMobile ? "16px" : "20px 22px",
        boxShadow: "0 22px 60px rgba(0,0,0,0.20)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div>
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
            Money over time
          </p>
          <h3
            style={{
              margin: "6px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "25px" : "30px",
              lineHeight: 1,
              fontWeight: 500,
              letterSpacing: "-0.025em",
            }}
          >
            Savings & portfolio
          </h3>
        </div>

        <div style={{ display: "flex", gap: "5px" }}>
          {(["30d", "90d", "1y"] as MoneyTrendRange[]).map((item) => {
            const active = item === range;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setRange(item)}
                aria-pressed={active}
                style={{
                  minHeight: "34px",
                  minWidth: "44px",
                  borderRadius: "999px",
                  border: active
                    ? "1px solid rgba(126,232,255,0.38)"
                    : "1px solid rgba(255,255,255,0.08)",
                  background: active
                    ? "rgba(83,215,255,0.12)"
                    : "rgba(255,255,255,0.025)",
                  color: active ? "#c9f7ff" : "rgba(255,255,255,0.48)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "9px",
                  fontWeight: 900,
                  textTransform: "uppercase",
                }}
              >
                {item === "1y" ? "1Y" : item.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          marginTop: "15px",
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0,1fr))",
          gap: "8px",
        }}
      >
        <div
          style={{
            borderRadius: "14px",
            border: "1px solid rgba(159,255,210,0.12)",
            background: "rgba(93,255,181,0.045)",
            padding: "10px 12px",
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.42)", fontSize: "9px" }}>
            Savings
          </span>
          <strong
            style={{
              display: "block",
              marginTop: "4px",
              color: "#9fffd2",
              fontSize: isMobile ? "16px" : "18px",
            }}
          >
            {formatDt(account.savings)}
          </strong>
        </div>
        <div
          style={{
            borderRadius: "14px",
            border: "1px solid rgba(255,209,138,0.14)",
            background: "rgba(255,209,138,0.045)",
            padding: "10px 12px",
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.42)", fontSize: "9px" }}>
            Portfolio · savings + bonds
          </span>
          <strong
            style={{
              display: "block",
              marginTop: "4px",
              color: "#ffd18a",
              fontSize: isMobile ? "16px" : "18px",
            }}
          >
            {formatDt(currentPortfolio)}
          </strong>
        </div>
      </div>

      <div
        style={{
          marginTop: "12px",
          minHeight: isMobile ? "205px" : "235px",
          borderRadius: "16px",
          border: "1px solid rgba(255,255,255,0.055)",
          background: "rgba(1,8,20,0.40)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {!isLoggedIn ? (
          <div
            style={{
              minHeight: isMobile ? "205px" : "235px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.40)",
              fontSize: "11px",
            }}
          >
            Log in to view your trend.
          </div>
        ) : loading ? (
          <div
            style={{
              minHeight: isMobile ? "205px" : "235px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.40)",
              fontSize: "11px",
            }}
          >
            Loading trend…
          </div>
        ) : error || points.length === 0 ? (
          <div
            style={{
              minHeight: isMobile ? "205px" : "235px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.40)",
              fontSize: "11px",
              textAlign: "center",
              padding: "20px",
            }}
          >
            {error ? "Trend data is unavailable." : "No history yet."}
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label="Savings and Bank portfolio trend"
            style={{ display: "block", width: "100%", height: "100%", minHeight: isMobile ? "205px" : "235px" }}
            preserveAspectRatio="none"
          >
            {[0, 1, 2, 3, 4].map((step) => {
              const y = PAD.top + (step / 4) * innerHeight;
              const value = maxValue * (1 - step / 4);
              return (
                <g key={step}>
                  <line
                    x1={PAD.left}
                    x2={WIDTH - PAD.right}
                    y1={y}
                    y2={y}
                    stroke="rgba(255,255,255,0.07)"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={PAD.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fill="rgba(255,255,255,0.34)"
                    fontSize="11"
                  >
                    {compactDt(value)}
                  </text>
                </g>
              );
            })}

            {labels.map(({ index, label }) => {
              const x =
                PAD.left +
                (points.length <= 1
                  ? 0
                  : (index / (points.length - 1)) * innerWidth);
              return (
                <text
                  key={`${index}-${label}`}
                  x={x}
                  y={HEIGHT - 12}
                  textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
                  fill="rgba(255,255,255,0.34)"
                  fontSize="11"
                >
                  {label}
                </text>
              );
            })}

            <path
              d={portfolioPath}
              fill="none"
              stroke="#ffd18a"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={savingsPath}
              fill="none"
              stroke="#9fffd2"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
      </div>

      <div
        style={{
          marginTop: "10px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          flexWrap: "wrap",
          color: "rgba(255,255,255,0.46)",
          fontSize: "9px",
          fontWeight: 800,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <i style={{ width: "16px", height: "2px", background: "#9fffd2", display: "inline-block" }} />
          Savings
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <i style={{ width: "16px", height: "2px", background: "#ffd18a", display: "inline-block" }} />
          Portfolio
        </span>
      </div>
    </section>
  );
}
