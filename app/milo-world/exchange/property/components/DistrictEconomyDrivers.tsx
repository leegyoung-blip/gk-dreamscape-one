"use client";

import type { CSSProperties } from "react";

export type MiloCityDistrictEconomySegment = {
  district_slug: string;
  district_name: string;
  property_type: "apartment" | "landed" | "office" | "retail" | string;
  market_demand_score: number;
  final_demand_score: number;
  occupancy_score: number;
  employment_score: number;
  resident_pressure_score: number;
  business_pressure_score: number;
  supply_pressure_score: number;
  event_score: number;
  composite_score: number;
  city_pressure_bps: number;
  value_effect_bps: number;
  rent_effect_bps: number;
  outlook: "hot" | "strengthening" | "balanced" | "softening" | "cooling" | string;
  driver_text: string | null;
  drivers: Record<string, unknown>;
  last_settlement_date: string | null;
};

export type MiloCityDevelopmentEvent = {
  id: string;
  title: string;
  summary: string;
  category: string;
  target_district_slug: string | null;
  target_property_type: string | null;
  demand_delta?: number;
  starts_on: string;
  ends_on: string;
  status?: string;
};

export type MiloCityDistrictEconomyDashboard = {
  phase?: string;
  segments: MiloCityDistrictEconomySegment[];
  active_events: MiloCityDevelopmentEvent[];
  recent_events: MiloCityDevelopmentEvent[];
  last_updated: string | null;
};

type Props = {
  dashboard: MiloCityDistrictEconomyDashboard;
  isMobile: boolean;
  panelStyle?: CSSProperties;
};

const TYPE_LABELS: Record<string, string> = {
  apartment: "Apartments",
  landed: "Landed Homes",
  office: "Offices",
  retail: "Retail",
};

function scoreLabel(score: number) {
  if (score >= 72) return "Very strong";
  if (score >= 59) return "Strengthening";
  if (score >= 43) return "Balanced";
  if (score >= 32) return "Softening";
  return "Cooling";
}

function outlookText(outlook: string) {
  switch (outlook) {
    case "hot":
      return "Very strong";
    case "strengthening":
      return "Strengthening";
    case "softening":
      return "Softening";
    case "cooling":
      return "Cooling";
    default:
      return "Balanced";
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-SG", {
      day: "numeric",
      month: "short",
    }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
}

function DriverBar({ label, value }: { label: string; value: number }) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div style={{ display: "grid", gap: "5px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "8px",
          color: "rgba(255,255,255,0.52)",
          fontSize: "10px",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
        }}
      >
        <span>{label}</span>
        <span>{Math.round(safe)}</span>
      </div>
      <div
        style={{
          height: "5px",
          borderRadius: "999px",
          overflow: "hidden",
          background: "rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            width: `${safe}%`,
            height: "100%",
            borderRadius: "999px",
            background: "linear-gradient(90deg, rgba(142,232,255,0.72), rgba(255,209,138,0.82))",
          }}
        />
      </div>
    </div>
  );
}

export default function DistrictEconomyDrivers({ dashboard, isMobile, panelStyle }: Props) {
  const segments = dashboard?.segments || [];
  const activeEvents = dashboard?.active_events || [];

  if (segments.length === 0) return null;

  return (
    <section
      data-milo-guide="property-city-drivers"
      style={{
        ...(panelStyle || {}),
        padding: isMobile ? "16px" : "20px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "flex-end",
          gap: "12px",
        }}
      >
        <div>
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
            Living City Drivers
          </p>
          <h2
            style={{
              margin: "7px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "26px" : "31px",
              fontWeight: 500,
              lineHeight: 1.05,
            }}
          >
            Why each district is moving
          </h2>
          <p
            style={{
              margin: "8px 0 0",
              maxWidth: "820px",
              color: "rgba(255,255,255,0.53)",
              fontSize: "12px",
              lineHeight: 1.5,
            }}
          >
            Jobs, residents, business growth, available supply and occasional city developments now feed into the property market once each day.
          </p>
        </div>

        {dashboard.last_updated && (
          <span
            style={{
              color: "rgba(255,255,255,0.38)",
              fontSize: "10px",
              whiteSpace: "nowrap",
            }}
          >
            Updated {new Intl.DateTimeFormat("en-SG", { dateStyle: "medium" }).format(new Date(dashboard.last_updated))}
          </span>
        )}
      </div>

      {activeEvents.length > 0 && (
        <div
          style={{
            marginTop: "14px",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "9px",
          }}
        >
          {activeEvents.map((event) => (
            <article
              key={event.id}
              style={{
                borderRadius: "14px",
                padding: "11px 13px",
                border: "1px solid rgba(255,209,138,0.2)",
                background: "rgba(255,209,138,0.055)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                <strong style={{ fontSize: "12px", color: "#ffd18a" }}>{event.title}</strong>
                <small style={{ color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>
                  to {formatDate(event.ends_on)}
                </small>
              </div>
              <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,0.54)", fontSize: "11px", lineHeight: 1.4 }}>
                {event.summary}
              </p>
            </article>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: "15px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(225px, 1fr))",
          gap: "10px",
        }}
      >
        {segments.map((segment) => {
          const residential = segment.property_type === "apartment" || segment.property_type === "landed";
          return (
            <article
              key={`${segment.district_slug}-${segment.property_type}`}
              style={{
                minWidth: 0,
                borderRadius: "16px",
                padding: "13px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.085)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "9px", alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <small style={{ color: "rgba(255,255,255,0.4)", fontSize: "9px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {segment.district_name}
                  </small>
                  <strong style={{ display: "block", marginTop: "3px", fontSize: "14px" }}>
                    {TYPE_LABELS[segment.property_type] || segment.property_type}
                  </strong>
                </div>
                <span
                  title={`District score ${segment.composite_score}/100`}
                  style={{
                    flex: "0 0 auto",
                    borderRadius: "999px",
                    padding: "5px 8px",
                    background: segment.composite_score >= 59 ? "rgba(142,232,255,0.1)" : segment.composite_score < 43 ? "rgba(255,176,176,0.08)" : "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    color: segment.composite_score >= 59 ? "#8ee8ff" : segment.composite_score < 43 ? "#ffb0b0" : "rgba(255,255,255,0.68)",
                    fontSize: "10px",
                    fontWeight: 900,
                  }}
                >
                  {outlookText(segment.outlook)}
                </span>
              </div>

              <p style={{ margin: "9px 0 0", minHeight: isMobile ? 0 : "32px", color: "rgba(255,255,255,0.56)", fontSize: "11px", lineHeight: 1.4 }}>
                {segment.driver_text || `${scoreLabel(segment.composite_score)} market conditions.`}
              </p>

              <div style={{ marginTop: "11px", display: "grid", gap: "8px" }}>
                <DriverBar label="Jobs" value={segment.employment_score} />
                <DriverBar label={residential ? "Resident demand" : "Business demand"} value={residential ? segment.resident_pressure_score : segment.business_pressure_score} />
                <DriverBar label="Supply pressure" value={segment.supply_pressure_score} />
              </div>

              <div
                style={{
                  marginTop: "11px",
                  paddingTop: "9px",
                  borderTop: "1px solid rgba(255,255,255,0.07)",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "7px",
                  textAlign: "center",
                }}
              >
                <span>
                  <small style={{ display: "block", color: "rgba(255,255,255,0.35)", fontSize: "8px", textTransform: "uppercase" }}>Demand</small>
                  <strong style={{ display: "block", marginTop: "2px", fontSize: "12px" }}>{Math.round(segment.final_demand_score)}/100</strong>
                </span>
                <span>
                  <small style={{ display: "block", color: "rgba(255,255,255,0.35)", fontSize: "8px", textTransform: "uppercase" }}>Value push</small>
                  <strong style={{ display: "block", marginTop: "2px", fontSize: "12px" }}>
                    {segment.value_effect_bps >= 0 ? "+" : ""}{(segment.value_effect_bps / 100).toFixed(2)}%
                  </strong>
                </span>
                <span>
                  <small style={{ display: "block", color: "rgba(255,255,255,0.35)", fontSize: "8px", textTransform: "uppercase" }}>Rent push</small>
                  <strong style={{ display: "block", marginTop: "2px", fontSize: "12px" }}>
                    {segment.rent_effect_bps >= 0 ? "+" : ""}{(segment.rent_effect_bps / 100).toFixed(2)}%
                  </strong>
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
