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

function signedDt(value: number) {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded.toLocaleString("en-SG")} DT`;
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
        PAD.top +
        innerHeight -
        (Math.max(0, valueFor(point)) / maxValue) * innerHeight;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function miloInsight(
  account: BankAccountSnapshot,
  points: MoneyTrendPoint[],
  range: MoneyTrendRange,
) {
  const total = Math.max(0, account.total);
  const available = Math.max(0, account.available);
  const savings = Math.max(0, account.savings);
  const bonds = Math.max(0, account.bonds);

  if (total <= 0) {
    return {
      title: "Start by building your base",
      body: "You do not have enough DT history yet for a useful pattern. Start with a savings goal, then I can compare how much stays available and how much is being put to work.",
    };
  }

  const availableRatio = available / total;
  const savingsRatio = savings / total;
  const bondsRatio = bonds / total;
  const first = points[0];
  const last = points[points.length - 1];
  const savingsChange = first && last ? last.savings - first.savings : 0;
  const availableChange = first && last ? last.available - first.available : 0;
  const rangeLabel = range === "30d" ? "30 days" : range === "90d" ? "90 days" : "year";
  const trend = points.length > 1
    ? ` Over the last ${rangeLabel}, savings changed by ${signedDt(savingsChange)} and available DT by ${signedDt(availableChange)}.`
    : "";

  if (availableRatio < 0.12) {
    return {
      title: "Keep more DT within reach",
      body: `Only about ${Math.round(availableRatio * 100)}% of your DT is currently available. I would rebuild some liquidity before locking more into Bonds or other longer-term uses.${trend}`,
    };
  }

  if (savingsRatio < 0.1 && availableRatio > 0.5) {
    return {
      title: "Give more of your DT a purpose",
      body: `Most of your DT is still sitting available while only about ${Math.round(savingsRatio * 100)}% is in Savings. I would strengthen a savings goal first, then consider investing DT you will not need soon.${trend}`,
    };
  }

  if (bondsRatio > 0.4 && savingsRatio < 0.15) {
    return {
      title: "Rebuild Savings before adding more Bonds",
      body: `A large share of your DT is locked in Bonds compared with your Savings balance. I would build a stronger savings buffer before increasing the amount you lock away.${trend}`,
    };
  }

  if (availableRatio > 0.65) {
    return {
      title: "You have a lot of DT sitting available",
      body: `About ${Math.round(availableRatio * 100)}% of your DT is still liquid. Keep what you need for near-term plans, then consider directing part of the rest toward a savings goal or a suitable Bank Bond.${trend}`,
    };
  }

  if (savingsRatio >= 0.25 && bondsRatio < 0.12 && availableRatio >= 0.2) {
    return {
      title: "Your savings base looks healthy",
      body: `You have meaningful Savings and still keep enough DT available. If part of that money is not needed soon, this may be a good time to explore putting a little more to work in Bonds rather than only adding to Savings.${trend}`,
    };
  }

  if (savingsChange > 0 && availableChange < 0 && availableRatio >= 0.18) {
    return {
      title: "Your saving momentum is moving in the right direction",
      body: `You have been shifting DT from available funds into longer-term goals without leaving yourself too tight. I would keep that balance rather than rushing to lock much more away.${trend}`,
    };
  }

  return {
    title: "Your balance is fairly well spread",
    body: `You currently have DT available for flexibility, money reserved in Savings, and some money working in Bonds. I would focus next on whichever goal has the clearest deadline rather than changing the mix just for the sake of it.${trend}`,
  };
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
      (max, point) =>
        Math.max(max, point.available, point.portfolio, point.savings),
      Math.max(account.available, account.savings + account.bonds, account.savings, 1),
    );
    return Math.max(1, highest * 1.12);
  }, [account.available, account.bonds, account.savings, points]);

  const availablePath = useMemo(
    () => linePath(points, (point) => point.available, maxValue),
    [maxValue, points],
  );
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

  const insight = useMemo(
    () => miloInsight(account, points, range),
    [account, points, range],
  );

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
            Available, savings & portfolio
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
          gridTemplateColumns: isMobile
            ? "1fr"
            : "repeat(3, minmax(0,1fr))",
          gap: "8px",
        }}
      >
        <MoneyMetric
          label="Available"
          value={account.available}
          color="#8ee8ff"
          border="rgba(126,232,255,0.14)"
          background="rgba(83,215,255,0.045)"
          isMobile={isMobile}
        />
        <MoneyMetric
          label="Savings"
          value={account.savings}
          color="#9fffd2"
          border="rgba(159,255,210,0.12)"
          background="rgba(93,255,181,0.045)"
          isMobile={isMobile}
        />
        <MoneyMetric
          label="Portfolio · savings + bonds"
          value={currentPortfolio}
          color="#ffd18a"
          border="rgba(255,209,138,0.14)"
          background="rgba(255,209,138,0.045)"
          isMobile={isMobile}
        />
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
          <ChartState text="Log in to view your trend." isMobile={isMobile} />
        ) : loading ? (
          <ChartState text="Loading trend…" isMobile={isMobile} />
        ) : error || points.length === 0 ? (
          <ChartState
            text={error ? "Trend data is unavailable." : "No history yet."}
            isMobile={isMobile}
          />
        ) : (
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label="Available Dream Tokens, Savings and Bank portfolio trend"
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              minHeight: isMobile ? "205px" : "235px",
            }}
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
                  textAnchor={
                    index === 0
                      ? "start"
                      : index === points.length - 1
                        ? "end"
                        : "middle"
                  }
                  fill="rgba(255,255,255,0.34)"
                  fontSize="11"
                >
                  {label}
                </text>
              );
            })}

            <path
              d={availablePath}
              fill="none"
              stroke="#8ee8ff"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
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
        <Legend color="#8ee8ff" label="Available" />
        <Legend color="#9fffd2" label="Savings" />
        <Legend color="#ffd18a" label="Portfolio" />
      </div>

      {isLoggedIn && !loading && !error && points.length > 0 && (
        <div
          style={{
            marginTop: "14px",
            display: "grid",
            gridTemplateColumns: isMobile ? "52px minmax(0,1fr)" : "64px minmax(0,1fr)",
            gap: isMobile ? "10px" : "14px",
            alignItems: "center",
            borderRadius: "18px",
            border: "1px solid rgba(255,209,138,0.15)",
            background:
              "linear-gradient(135deg, rgba(255,209,138,0.065), rgba(83,215,255,0.035))",
            padding: isMobile ? "12px" : "14px 16px",
          }}
        >
          <img
            src="/milo-world/milo-character.png"
            alt="Milo"
            style={{
              width: isMobile ? "52px" : "64px",
              height: isMobile ? "52px" : "64px",
              objectFit: "contain",
              filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.28))",
            }}
          />
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                color: "#ffd18a",
                fontSize: "9px",
                fontWeight: 900,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              Milo’s view
            </p>
            <strong
              style={{
                display: "block",
                marginTop: "4px",
                color: "white",
                fontSize: isMobile ? "13px" : "14px",
              }}
            >
              {insight.title}
            </strong>
            <p
              style={{
                margin: "5px 0 0",
                color: "rgba(255,255,255,0.58)",
                fontSize: isMobile ? "10px" : "11px",
                lineHeight: 1.55,
              }}
            >
              {insight.body}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function MoneyMetric({
  label,
  value,
  color,
  border,
  background,
  isMobile,
}: {
  label: string;
  value: number;
  color: string;
  border: string;
  background: string;
  isMobile: boolean;
}) {
  return (
    <div
      style={{
        borderRadius: "14px",
        border: `1px solid ${border}`,
        background,
        padding: "10px 12px",
      }}
    >
      <span style={{ color: "rgba(255,255,255,0.42)", fontSize: "9px" }}>
        {label}
      </span>
      <strong
        style={{
          display: "block",
          marginTop: "4px",
          color,
          fontSize: isMobile ? "16px" : "18px",
        }}
      >
        {formatDt(value)}
      </strong>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      <i
        style={{
          width: "16px",
          height: "2px",
          background: color,
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}

function ChartState({ text, isMobile }: { text: string; isMobile: boolean }) {
  return (
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
      {text}
    </div>
  );
}
