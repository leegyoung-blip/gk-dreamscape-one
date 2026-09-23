"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type JsonRecord = Record<string, unknown>;

type HistoryPoint = {
  date: string;
  economy_state: string;
  district_score: number;
  company_health: number;
  stock_move_bps: number;
};

function rec(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function arr(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? (value.filter((item) => item && typeof item === "object") as JsonRecord[])
    : [];
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value ? value : fallback;
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDate(value: unknown) {
  const raw = text(value);
  if (!raw) return "—";
  try {
    return new Intl.DateTimeFormat("en-SG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(raw));
  } catch {
    return raw;
  }
}

function signedPercent(value: number) {
  const absolute = Math.abs(value).toFixed(1);
  if (value > 0) return `+${absolute}%`;
  if (value < 0) return `−${absolute}%`;
  return "0.0%";
}

function signedBps(value: number) {
  if (value > 0) return `+${value} bps`;
  if (value < 0) return `−${Math.abs(value)} bps`;
  return "0 bps";
}

function prettyPropertyType(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function economyLabel(value: string) {
  if (value === "growing") return "Growing";
  if (value === "cooling") return "Cooling";
  return "Steady";
}

function TrendLine({ points }: { points: HistoryPoint[] }) {
  if (points.length < 2) {
    return (
      <div
        style={{
          minHeight: "150px",
          display: "grid",
          placeItems: "center",
          color: "rgba(255,255,255,0.42)",
          fontSize: "13px",
        }}
      >
        More daily snapshots are needed before a trend appears.
      </div>
    );
  }

  const width = 900;
  const height = 220;
  const left = 36;
  const right = 18;
  const top = 16;
  const bottom = 34;
  const values = points.map((point) => point.district_score);
  const min = Math.min(30, ...values) - 3;
  const max = Math.max(70, ...values) + 3;
  const span = Math.max(1, max - min);

  const x = (index: number) =>
    left + (index / Math.max(1, points.length - 1)) * (width - left - right);
  const y = (value: number) =>
    top + ((max - value) / span) * (height - top - bottom);
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(point.district_score)}`)
    .join(" ");

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Living City district economy trend"
        style={{ width: "100%", minWidth: "620px", height: "auto", display: "block" }}
      >
        {[40, 50, 60, 70].map((value) => (
          <g key={value}>
            <line
              x1={left}
              x2={width - right}
              y1={y(value)}
              y2={y(value)}
              stroke="rgba(255,255,255,0.09)"
            />
            <text
              x={4}
              y={y(value) + 4}
              fill="rgba(255,255,255,0.42)"
              fontSize="11"
              fontWeight="700"
            >
              {value}
            </text>
          </g>
        ))}
        <path
          d={path}
          fill="none"
          stroke="#8ee8ff"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point, index) => {
          const show = index === 0 || index === points.length - 1 || index % 5 === 0;
          if (!show) return null;
          return (
            <g key={`${point.date}-${index}`}>
              <circle cx={x(index)} cy={y(point.district_score)} r="4" fill="#8ee8ff" />
              <text
                x={x(index)}
                y={height - 10}
                fill="rgba(255,255,255,0.42)"
                fontSize="10"
                textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
              >
                {point.date.slice(5)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function MiloCityPulsePage() {
  const [pulse, setPulse] = useState<JsonRecord>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  async function loadPulse(firstLoad = false) {
    if (firstLoad) setLoading(true);
    else setRefreshing(true);
    setError("");

    const { data, error: rpcError } = await supabase.rpc("get_milo_city_pulse");
    if (rpcError) {
      setError(rpcError.message);
    } else {
      setPulse(rec(data));
    }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    void loadPulse(true);

    const check = () => setIsMobile(window.innerWidth <= 760);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const metrics = rec(pulse.headline_metrics);
  const jobs = rec(metrics.jobs);
  const residential = rec(metrics.residential_demand);
  const commercial = rec(metrics.commercial_demand);
  const business = rec(metrics.business_confidence);
  const stocksMetric = rec(metrics.stock_market);
  const propertyMetric = rec(metrics.property_market);
  const counts = rec(pulse.city_counts);
  const events = arr(pulse.active_city_events);
  const districts = arr(pulse.districts);
  const stocks = arr(pulse.stocks);
  const stories = arr(pulse.stories);
  const history: HistoryPoint[] = useMemo(
    () =>
      arr(pulse.history).map((row) => ({
        date: text(row.date),
        economy_state: text(row.economy_state, "steady"),
        district_score: num(row.district_score, 50),
        company_health: num(row.company_health, 60),
        stock_move_bps: num(row.stock_move_bps, 0),
      })),
    [pulse.history]
  );

  const page: CSSProperties = {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 12% 0%, rgba(27,107,143,0.24), transparent 35%), radial-gradient(circle at 88% 12%, rgba(145,94,20,0.17), transparent 34%), #020817",
    color: "white",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  };

  const panel: CSSProperties = {
    borderRadius: "24px",
    border: "1px solid rgba(132,218,255,0.16)",
    background: "rgba(5,13,28,0.72)",
    boxShadow: "0 26px 80px rgba(0,0,0,0.34)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
  };

  const headlineMetrics = [
    ["Jobs", text(jobs.label, "Steady"), `Hiring score ${Math.round(num(jobs.score, 50))}`],
    ["Residential Demand", text(residential.label, "Balanced"), `Demand ${Math.round(num(residential.score, 50))}/100`],
    ["Commercial Demand", text(commercial.label, "Balanced"), `Demand ${Math.round(num(commercial.score, 50))}/100`],
    ["Business Confidence", text(business.label, "Steady"), `${Math.round(num(business.businesses_hiring))} businesses hiring`],
    ["Stock Market · 7d", signedPercent(num(stocksMetric.seven_day_pct)), text(stocksMetric.label, "Mixed")],
    ["Property Market · 30d", signedPercent(num(propertyMetric.thirty_day_pct)), text(propertyMetric.label, "Stable")],
  ];

  return (
    <main style={page}>
      <div
        style={{
          width: "min(1700px, calc(100% - 28px))",
          margin: "0 auto",
          padding: "24px 0 70px",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/milo-world/exchange"
            style={{ color: "#8ee8ff", textDecoration: "none", fontWeight: 900 }}
          >
            ← Exchange Home
          </Link>
          <button
            type="button"
            onClick={() => void loadPulse(false)}
            disabled={refreshing}
            style={{
              minHeight: "40px",
              padding: "0 15px",
              borderRadius: "999px",
              border: "1px solid rgba(132,218,255,0.22)",
              background: "rgba(83,215,255,0.1)",
              color: "white",
              fontWeight: 900,
              cursor: refreshing ? "not-allowed" : "pointer",
              opacity: refreshing ? 0.6 : 1,
            }}
          >
            {refreshing ? "Refreshing…" : "Refresh Pulse"}
          </button>
        </header>

        <section style={{ marginTop: "26px" }}>
          <p
            style={{
              margin: 0,
              color: "#8ee8ff",
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            Milo’s Exchange · Living City
          </p>
          <h1
            style={{
              margin: "9px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: "clamp(44px, 7vw, 78px)",
              fontWeight: 500,
              lineHeight: 0.98,
            }}
          >
            City Pulse
          </h1>
          <p
            style={{
              margin: "14px 0 0",
              maxWidth: "850px",
              color: "rgba(255,255,255,0.58)",
              lineHeight: 1.6,
            }}
          >
            See how jobs, residents, businesses, property and fictional stock markets are moving together across Dreamscape.
          </p>
        </section>

        {error && (
          <div style={{ ...panel, marginTop: "20px", padding: "16px", color: "#ffb0b0" }}>
            Could not load City Pulse: {error}
          </div>
        )}

        <section
          style={{
            ...panel,
            marginTop: "22px",
            padding: isMobile ? "20px" : "26px",
            display: "flex",
            justifyContent: "space-between",
            gap: "18px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <small style={{ color: "rgba(255,255,255,0.44)", fontWeight: 900, letterSpacing: "0.12em" }}>
              OVERALL ECONOMY
            </small>
            <strong
              style={{
                display: "block",
                marginTop: "6px",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: "38px",
                fontWeight: 500,
              }}
            >
              {loading ? "Loading…" : economyLabel(text(pulse.economy_state, "steady"))}
            </strong>
            <span style={{ display: "block", marginTop: "5px", color: "rgba(255,255,255,0.44)", fontSize: "12px" }}>
              Pulse date {formatDate(pulse.pulse_date)}
              {Boolean(pulse.stale) ? " · update pending" : ""}
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {[
              ["Residents", counts.residents],
              ["Tenants", counts.active_tenants],
              ["Business Spaces", counts.active_business_spaces],
              ["Stock Agents", counts.active_stock_agents],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                style={{
                  minWidth: "112px",
                  borderRadius: "15px",
                  padding: "11px 13px",
                  background: "rgba(255,255,255,0.045)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <small style={{ display: "block", color: "rgba(255,255,255,0.4)", fontWeight: 800 }}>{label}</small>
                <strong style={{ display: "block", marginTop: "4px", fontSize: "18px" }}>
                  {Math.round(num(value)).toLocaleString()}
                </strong>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            marginTop: "14px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "10px",
          }}
        >
          {headlineMetrics.map(([label, value, note]) => (
            <article key={label} style={{ ...panel, padding: "16px" }}>
              <small
                style={{
                  display: "block",
                  color: "rgba(255,255,255,0.42)",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </small>
              <strong style={{ display: "block", marginTop: "7px", fontSize: "22px" }}>
                {loading ? "—" : value}
              </strong>
              <span style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.42)", fontSize: "12px" }}>
                {note}
              </span>
            </article>
          ))}
        </section>

        {events.length > 0 && (
          <section style={{ ...panel, marginTop: "14px", padding: "20px" }}>
            <p style={{ margin: 0, color: "#ffd18a", fontSize: "11px", fontWeight: 900, letterSpacing: "0.16em" }}>
              ACTIVE CITY DEVELOPMENT
            </p>
            <div style={{ marginTop: "12px", display: "grid", gap: "9px" }}>
              {events.map((event) => (
                <article
                  key={text(event.id, text(event.title))}
                  style={{
                    borderRadius: "16px",
                    padding: "14px",
                    background: "rgba(255,209,138,0.055)",
                    border: "1px solid rgba(255,209,138,0.14)",
                  }}
                >
                  <strong>{text(event.title, "City development")}</strong>
                  <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.54)", fontSize: "13px", lineHeight: 1.45 }}>
                    {text(event.summary)}
                  </p>
                  <small style={{ display: "block", marginTop: "7px", color: "rgba(255,255,255,0.36)" }}>
                    {formatDate(event.starts_on)} – {formatDate(event.ends_on)}
                  </small>
                </article>
              ))}
            </div>
          </section>
        )}

        <section
          style={{
            marginTop: "14px",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
            gap: "14px",
          }}
        >
          <article style={{ ...panel, padding: "20px", minWidth: 0 }}>
            <p style={{ margin: 0, color: "#8ee8ff", fontSize: "11px", fontWeight: 900, letterSpacing: "0.16em" }}>
              30-DAY ECONOMY TREND
            </p>
            <h2 style={{ margin: "7px 0 12px", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "30px", fontWeight: 500 }}>
              District economy score
            </h2>
            <TrendLine points={history} />
          </article>

          <article style={{ ...panel, padding: "20px" }}>
            <p style={{ margin: 0, color: "#ffd18a", fontSize: "11px", fontWeight: 900, letterSpacing: "0.16em" }}>
              WHAT IS MOVING THE CITY
            </p>
            <div style={{ marginTop: "12px", display: "grid", gap: "9px" }}>
              {stories.length === 0 ? (
                <p style={{ color: "rgba(255,255,255,0.44)", fontSize: "13px" }}>
                  No major city stories yet.
                </p>
              ) : (
                stories.slice(0, 6).map((story) => (
                  <article
                    key={text(story.id, `${text(story.title)}-${text(story.happened_at)}`)}
                    style={{
                      borderRadius: "15px",
                      padding: "12px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <strong style={{ fontSize: "13px" }}>{text(story.title, "Living City update")}</strong>
                    {text(story.summary) && (
                      <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,0.48)", fontSize: "12px", lineHeight: 1.4 }}>
                        {text(story.summary)}
                      </p>
                    )}
                  </article>
                ))
              )}
            </div>
          </article>
        </section>

        <section style={{ ...panel, marginTop: "14px", padding: "20px" }}>
          <p style={{ margin: 0, color: "#8ee8ff", fontSize: "11px", fontWeight: 900, letterSpacing: "0.16em" }}>
            DISTRICT CONDITIONS
          </p>
          <div
            style={{
              marginTop: "13px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: "10px",
            }}
          >
            {districts.map((district) => (
              <article
                key={`${text(district.district_slug)}-${text(district.property_type)}`}
                style={{
                  borderRadius: "16px",
                  padding: "14px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <small style={{ color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 900 }}>
                  {text(district.district_slug).replace(/-/g, " ")}
                </small>
                <strong style={{ display: "block", marginTop: "5px", fontSize: "18px" }}>
                  {prettyPropertyType(text(district.property_type))} · {text(district.outlook, "balanced")}
                </strong>
                <span style={{ display: "block", marginTop: "5px", color: "#ffd18a", fontSize: "13px", fontWeight: 800 }}>
                  Demand {Math.round(num(district.demand_score, 50))}/100 · Value {signedBps(num(district.value_effect_bps))}
                </span>
                <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.48)", fontSize: "12px", lineHeight: 1.45 }}>
                  {text(district.driver_text, "Market conditions are balanced.")}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section style={{ ...panel, marginTop: "14px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: 0, color: "#8ee8ff", fontSize: "11px", fontWeight: 900, letterSpacing: "0.16em" }}>
                STOCK MARKET SNAPSHOT
              </p>
              <h2 style={{ margin: "7px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "30px", fontWeight: 500 }}>
                Seven listed companies
              </h2>
            </div>
            <Link href="/milo-world/exchange/stocks" style={{ color: "#8ee8ff", textDecoration: "none", fontWeight: 900, fontSize: "13px" }}>
              Open Stock Exchange →
            </Link>
          </div>
          <div
            style={{
              marginTop: "13px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))",
              gap: "9px",
            }}
          >
            {stocks.map((stock) => (
              <article
                key={text(stock.symbol)}
                style={{
                  borderRadius: "15px",
                  padding: "13px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                  <strong>{text(stock.symbol)}</strong>
                  <span style={{ color: num(stock.daily_change_bps) >= 0 ? "#8ee8ff" : "#ffb0b0", fontSize: "12px", fontWeight: 900 }}>
                    {signedPercent(num(stock.daily_change_bps) / 100)}
                  </span>
                </div>
                <span style={{ display: "block", marginTop: "5px", color: "#ffd18a", fontWeight: 900 }}>
                  {Math.round(num(stock.price)).toLocaleString()} DT
                </span>
                <small style={{ display: "block", marginTop: "5px", color: "rgba(255,255,255,0.42)" }}>
                  {text(stock.market_mood, "steady")}
                </small>
              </article>
            ))}
          </div>
        </section>

        <section
          style={{
            marginTop: "14px",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: "14px",
          }}
        >
          <Link
            href="/milo-world/exchange/property"
            style={{ ...panel, padding: "20px", color: "white", textDecoration: "none" }}
          >
            <small style={{ color: "#ffd18a", fontWeight: 900 }}>PROPERTY EXCHANGE</small>
            <strong style={{ display: "block", marginTop: "7px", fontSize: "24px" }}>Explore district markets →</strong>
          </Link>
          <Link
            href="/milo-world/exchange/stocks"
            style={{ ...panel, padding: "20px", color: "white", textDecoration: "none" }}
          >
            <small style={{ color: "#8ee8ff", fontWeight: 900 }}>STOCK EXCHANGE</small>
            <strong style={{ display: "block", marginTop: "7px", fontSize: "24px" }}>Study companies and prices →</strong>
          </Link>
        </section>
      </div>
    </main>
  );
}
