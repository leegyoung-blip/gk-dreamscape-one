"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type JsonRecord = Record<string, unknown>;

type Props = {
  isMobile: boolean;
  isAdmin?: boolean;
};

function rec(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function arr(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter((item) => item && typeof item === "object") as JsonRecord[]
    : [];
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value ? value : fallback;
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function signedPercent(value: number) {
  const rounded = Math.abs(value).toFixed(1);
  if (value > 0) return `+${rounded}%`;
  if (value < 0) return `−${rounded}%`;
  return "0.0%";
}

function stateLabel(state: string) {
  if (state === "growing") return "Growing";
  if (state === "cooling") return "Cooling";
  return "Steady";
}

export default function CityPulseHomeCard({ isMobile, isAdmin = false }: Props) {
  const [pulse, setPulse] = useState<JsonRecord>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data, error } = await supabase.rpc("get_milo_city_pulse");
      if (!active) return;
      if (!error) setPulse(rec(data));
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const metrics = rec(pulse.headline_metrics);
  const jobs = rec(metrics.jobs);
  const residential = rec(metrics.residential_demand);
  const commercial = rec(metrics.commercial_demand);
  const business = rec(metrics.business_confidence);
  const stocks = rec(metrics.stock_market);
  const property = rec(metrics.property_market);
  const events = arr(pulse.active_city_events);
  const stories = arr(pulse.stories);
  const economyState = text(pulse.economy_state, "steady");

  const panel: CSSProperties = {
    marginTop: "18px",
    borderRadius: isMobile ? "22px" : "30px",
    border: "1px solid rgba(132,218,255,0.2)",
    background:
      "linear-gradient(135deg, rgba(5,32,54,0.84), rgba(5,13,28,0.78) 52%, rgba(45,31,12,0.72))",
    boxShadow: "0 26px 80px rgba(0,0,0,0.34)",
    padding: isMobile ? "18px" : "24px",
    color: "white",
  };

  const chips = [
    ["Jobs", text(jobs.label, "Steady")],
    ["Homes", text(residential.label, "Balanced")],
    ["Business Space", text(commercial.label, "Balanced")],
    ["Business", text(business.label, "Steady")],
    ["Stocks · 7d", signedPercent(num(stocks.seven_day_pct))],
    ["Property · 30d", signedPercent(num(property.thirty_day_pct))],
  ];

  return (
    <section data-milo-guide="home-city-pulse" style={panel}>
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "flex-start",
          gap: "16px",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              color: "#8ee8ff",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Dreamscape City Pulse
          </p>
          <div
            style={{
              marginTop: "7px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "30px" : "37px",
                fontWeight: 500,
              }}
            >
              {loading ? "Reading the city…" : `${stateLabel(economyState)} economy`}
            </h2>
            {!loading && Boolean(pulse.stale) && (
              <span
                style={{
                  borderRadius: "999px",
                  padding: "5px 9px",
                  background: "rgba(255,209,138,0.12)",
                  border: "1px solid rgba(255,209,138,0.22)",
                  color: "#ffd18a",
                  fontSize: "10px",
                  fontWeight: 900,
                }}
              >
                Update pending
              </span>
            )}
          </div>
          <p
            style={{
              margin: "9px 0 0",
              color: "rgba(255,255,255,0.56)",
              fontSize: "13px",
              lineHeight: 1.5,
              maxWidth: "760px",
            }}
          >
            Jobs, residents, businesses, property and the stock market now feed into one Living City economy.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <Link
            href="/milo-world/exchange/city-pulse"
            style={{
              minHeight: "40px",
              padding: "0 15px",
              borderRadius: "999px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(132,218,255,0.28)",
              background: "rgba(83,215,255,0.12)",
              color: "white",
              textDecoration: "none",
              fontSize: "12px",
              fontWeight: 900,
            }}
          >
            Open City Pulse →
          </Link>
          {isAdmin && (
            <Link
              href="/admin/city-economy"
              style={{
                minHeight: "40px",
                padding: "0 15px",
                borderRadius: "999px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(255,209,138,0.24)",
                background: "rgba(255,209,138,0.08)",
                color: "#ffd18a",
                textDecoration: "none",
                fontSize: "12px",
                fontWeight: 900,
              }}
            >
              Economy Controls
            </Link>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: "18px",
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(6, minmax(0, 1fr))",
          gap: "8px",
        }}
      >
        {chips.map(([label, value]) => (
          <div
            key={label}
            style={{
              minWidth: 0,
              borderRadius: "14px",
              padding: "10px 11px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span
              style={{
                display: "block",
                color: "rgba(255,255,255,0.42)",
                fontSize: "9px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {label}
            </span>
            <strong style={{ display: "block", marginTop: "4px", fontSize: "14px" }}>
              {loading ? "—" : value}
            </strong>
          </div>
        ))}
      </div>

      {!loading && (events.length > 0 || stories.length > 0) && (
        <div
          style={{
            marginTop: "12px",
            display: "grid",
            gridTemplateColumns: !isMobile && events.length > 0 && stories.length > 0 ? "1fr 1fr" : "1fr",
            gap: "8px",
          }}
        >
          {events[0] && (
            <div
              style={{
                borderRadius: "14px",
                padding: "11px 12px",
                border: "1px solid rgba(255,209,138,0.14)",
                background: "rgba(255,209,138,0.055)",
              }}
            >
              <small style={{ color: "#ffd18a", fontWeight: 900 }}>CITY DEVELOPMENT</small>
              <strong style={{ display: "block", marginTop: "4px", fontSize: "13px" }}>
                {text(events[0].title, "City development")}
              </strong>
            </div>
          )}
          {stories[0] && (
            <div
              style={{
                borderRadius: "14px",
                padding: "11px 12px",
                border: "1px solid rgba(132,218,255,0.12)",
                background: "rgba(83,215,255,0.045)",
              }}
            >
              <small style={{ color: "#8ee8ff", fontWeight: 900 }}>LATEST CITY STORY</small>
              <strong style={{ display: "block", marginTop: "4px", fontSize: "13px" }}>
                {text(stories[0].title, "Living City update")}
              </strong>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
