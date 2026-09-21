"use client";

import type { CSSProperties } from "react";
import {
  formatDateTime,
  formatNumber,
  type PropertyResidentLifeEvent,
  type PropertyResidentLifeProfile,
  type PropertyResidentLifeStats,
} from "./propertyExchangeShared";

type Props = {
  residents: PropertyResidentLifeProfile[];
  events: PropertyResidentLifeEvent[];
  stats: PropertyResidentLifeStats;
  isMobile: boolean;
  isCompact: boolean;
  actionLoading: boolean;
  glassPanel: CSSProperties;
  secondaryButton: CSSProperties;
  onRefresh: () => void;
  onOpenMessages: () => void;
};

function titleCase(value: string | null | undefined) {
  return String(value || "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function pressureLabel(value: number) {
  if (value >= 75) return "High pressure";
  if (value >= 55) return "Watch closely";
  if (value >= 30) return "Stable";
  return "Comfortable";
}

function relationshipLabel(value: string) {
  if (value === "tenant") return "Current tenant";
  if (value === "applicant") return "Rental applicant";
  if (value === "purchase_interest") return "Purchase interest";
  return "Property contact";
}

export default function ResidentLifePanel({
  residents,
  events,
  stats,
  isMobile,
  isCompact,
  actionLoading,
  glassPanel,
  secondaryButton,
  onRefresh,
  onOpenMessages,
}: Props) {
  const eventByResident = new Map<string, PropertyResidentLifeEvent>();
  for (const event of events) {
    if (!eventByResident.has(event.resident_id)) eventByResident.set(event.resident_id, event);
  }

  return (
    <section
      data-milo-guide="property-resident-life"
      style={{
        ...glassPanel,
        padding: isMobile ? "18px" : "24px",
        border: "1px solid rgba(121,242,206,0.16)",
        background:
          "linear-gradient(145deg, rgba(26,101,83,0.16), rgba(5,13,28,0.76))",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "flex-end",
          gap: "14px",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "#79f2ce",
              fontSize: "11px",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
            }}
          >
            Persistent Resident Life
          </p>
          <h2
            style={{
              margin: "8px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "31px" : "39px",
              fontWeight: 500,
            }}
          >
            Dreamscape residents keep living
          </h2>
          <p
            style={{
              margin: "10px 0 0",
              maxWidth: "880px",
              color: "rgba(255,255,255,0.52)",
              fontSize: "13px",
              lineHeight: 1.55,
            }}
          >
            Careers, household size, savings and financial pressure now evolve over time.
            Those changes can alter a resident&apos;s budget, make them consider moving, or
            change whether they want to renew a lease.
          </p>
        </div>

        <div style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onOpenMessages}
            style={{ ...secondaryButton, minHeight: "42px" }}
          >
            Open Messages
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={actionLoading}
            style={{
              ...secondaryButton,
              minHeight: "42px",
              opacity: actionLoading ? 0.55 : 1,
            }}
          >
            {actionLoading ? "Updating..." : "↻ Resident Life"}
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: "17px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5,minmax(0,1fr))",
          gap: "10px",
        }}
      >
        {[
          ["Connected Residents", stats.connected_residents],
          ["Active Tenants", stats.active_tenants],
          ["Considering Move", stats.considering_move],
          ["Budget Pressure", stats.financial_pressure],
          ["Life Events · 30d", stats.recent_life_events],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            style={{
              borderRadius: "16px",
              background: "rgba(255,255,255,0.045)",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "14px",
            }}
          >
            <small style={{ color: "rgba(255,255,255,0.45)" }}>{label}</small>
            <strong
              style={{
                display: "block",
                marginTop: "5px",
                fontSize: "22px",
                color:
                  label === "Considering Move" && Number(value) > 0
                    ? "#ffd18a"
                    : label === "Budget Pressure" && Number(value) > 0
                    ? "#ffb0b0"
                    : "white",
              }}
            >
              {value}
            </strong>
          </div>
        ))}
      </div>

      {residents.length === 0 ? (
        <div
          style={{
            marginTop: "18px",
            minHeight: "120px",
            display: "grid",
            placeItems: "center",
            borderRadius: "18px",
            border: "1px dashed rgba(121,242,206,0.2)",
            color: "rgba(255,255,255,0.5)",
            textAlign: "center",
            padding: "20px",
          }}
        >
          Residents connected to your properties will appear here as they apply, rent,
          negotiate or make purchase offers.
        </div>
      ) : (
        <div
          style={{
            marginTop: "18px",
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : isCompact
              ? "repeat(2,minmax(0,1fr))"
              : "repeat(3,minmax(0,1fr))",
            gap: "12px",
          }}
        >
          {residents.map((resident) => {
            const latest = eventByResident.get(resident.resident_id);
            return (
              <article
                key={resident.resident_id}
                style={{
                  borderRadius: "19px",
                  border: resident.move_intent
                    ? "1px solid rgba(255,209,138,0.25)"
                    : "1px solid rgba(255,255,255,0.09)",
                  background: resident.move_intent
                    ? "linear-gradient(145deg, rgba(255,209,138,0.07), rgba(255,255,255,0.035))"
                    : "rgba(255,255,255,0.04)",
                  padding: "16px",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "42px minmax(0,1fr) auto",
                    gap: "10px",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      background: "linear-gradient(145deg,#d8fff2,#8fe7ca)",
                      color: "#0b5d4d",
                      fontWeight: 950,
                      fontSize: "16px",
                    }}
                  >
                    {resident.display_name.slice(0, 1).toUpperCase()}
                  </span>

                  <span style={{ minWidth: 0 }}>
                    <strong style={{ display: "block", fontSize: "14px" }}>
                      {resident.display_name}
                    </strong>
                    <small
                      style={{
                        display: "block",
                        marginTop: "3px",
                        color: "rgba(255,255,255,0.48)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {resident.occupation} · {relationshipLabel(resident.relationship_to_user)}
                    </small>
                  </span>

                  {resident.move_intent && (
                    <span
                      style={{
                        borderRadius: "999px",
                        padding: "5px 8px",
                        background: "rgba(255,209,138,0.1)",
                        color: "#ffd18a",
                        fontSize: "9px",
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Considering move
                    </span>
                  )}
                </div>

                <div
                  style={{
                    marginTop: "14px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                  }}
                >
                  {[
                    ["Life stage", titleCase(resident.life_stage) || "—"],
                    ["Household / team", resident.household_size],
                    ["Monthly income", `${formatNumber(resident.monthly_income)} DT`],
                    ["Savings", `${formatNumber(resident.savings)} DT`],
                    ["Rent budget", `${formatNumber(resident.max_weekly_rent)} DT/wk`],
                    ["Financial state", pressureLabel(resident.financial_pressure)],
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      style={{
                        borderRadius: "13px",
                        background: "rgba(255,255,255,0.035)",
                        padding: "10px",
                      }}
                    >
                      <small style={{ color: "rgba(255,255,255,0.4)" }}>{label}</small>
                      <strong style={{ display: "block", marginTop: "4px", fontSize: "12px" }}>
                        {value}
                      </strong>
                    </div>
                  ))}
                </div>

                {(resident.property_name || resident.current_weekly_rent) && (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "10px 11px",
                      borderRadius: "13px",
                      background: "rgba(121,242,206,0.055)",
                      color: "rgba(255,255,255,0.62)",
                      fontSize: "11px",
                      lineHeight: 1.45,
                    }}
                  >
                    {resident.property_name && (
                      <span>
                        {resident.property_name}
                        {resident.unit_number ? ` · Unit ${resident.unit_number}` : ""}
                      </span>
                    )}
                    {resident.current_weekly_rent != null && (
                      <span> · {formatNumber(resident.current_weekly_rent)} DT/week</span>
                    )}
                    {resident.lease_end_date && (
                      <span> · lease ends {new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short" }).format(new Date(`${resident.lease_end_date}T00:00:00`))}</span>
                    )}
                  </div>
                )}

                {resident.move_intent && resident.move_reason && (
                  <p
                    style={{
                      margin: "10px 0 0",
                      color: "#ffd18a",
                      fontSize: "11px",
                      lineHeight: 1.45,
                    }}
                  >
                    Move reason: {titleCase(resident.move_reason)}
                  </p>
                )}

                {latest && (
                  <div
                    style={{
                      marginTop: "11px",
                      paddingTop: "11px",
                      borderTop: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <small
                      style={{
                        color: "#79f2ce",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Latest life event
                    </small>
                    <strong style={{ display: "block", marginTop: "5px", fontSize: "12px" }}>
                      {latest.title}
                    </strong>
                    <p
                      style={{
                        margin: "4px 0 0",
                        color: "rgba(255,255,255,0.48)",
                        fontSize: "10px",
                        lineHeight: 1.45,
                      }}
                    >
                      {latest.description} · {formatDateTime(latest.occurred_at)}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {events.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <p
            style={{
              margin: 0,
              color: "rgba(255,255,255,0.42)",
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              fontWeight: 900,
            }}
          >
            Recent resident timeline
          </p>
          <div
            className="milo-scrollbar"
            style={{
              marginTop: "9px",
              display: "grid",
              gap: "8px",
              maxHeight: "260px",
              overflowY: "auto",
              paddingRight: "3px",
            }}
          >
            {events.slice(0, 14).map((event) => {
              const resident = residents.find((item) => item.resident_id === event.resident_id);
              return (
                <div
                  key={event.event_id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0,1fr) auto",
                    gap: "12px",
                    alignItems: "center",
                    borderRadius: "14px",
                    border: "1px solid rgba(255,255,255,0.07)",
                    background: "rgba(255,255,255,0.035)",
                    padding: "11px 12px",
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ display: "block", fontSize: "11px" }}>
                      {resident?.display_name || "Dreamscape resident"} · {event.title}
                    </strong>
                    <small
                      style={{
                        display: "block",
                        marginTop: "3px",
                        color: "rgba(255,255,255,0.45)",
                        lineHeight: 1.4,
                      }}
                    >
                      {event.description}
                    </small>
                  </span>
                  <small style={{ color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap" }}>
                    {formatDateTime(event.occurred_at)}
                  </small>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
