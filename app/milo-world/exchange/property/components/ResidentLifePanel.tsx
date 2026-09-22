"use client";

import type { CSSProperties } from "react";
import {
  formatDateTime,
  formatNumber,
  getResidentAvatarSrc,
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
  if (value >= 75) return "Under pressure";
  if (value >= 55) return "Tight budget";
  if (value >= 30) return "Steady";
  return "Comfortable";
}

function relationshipLabel(value: string) {
  if (value === "tenant") return "Your tenant";
  if (value === "applicant") return "Applied to rent";
  if (value === "purchase_interest") return "Interested in buying";
  return "Property contact";
}

function financialAccent(value: number) {
  if (value >= 75) return "#ff9292";
  if (value >= 55) return "#ffd18a";
  return "#79f2ce";
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
    if (!eventByResident.has(event.resident_id)) {
      eventByResident.set(event.resident_id, event);
    }
  }

  const residentColumns = isMobile
    ? "1fr"
    : isCompact
    ? `repeat(${Math.min(2, Math.max(1, residents.length))}, minmax(0,1fr))`
    : `repeat(${Math.min(5, Math.max(1, residents.length))}, minmax(0,1fr))`;

  return (
    <section
      data-milo-guide="property-resident-life"
      style={{
        ...glassPanel,
        padding: isMobile ? "16px" : "20px",
        border: "1px solid rgba(121,242,206,0.18)",
        background:
          "radial-gradient(circle at 9% 0%, rgba(121,242,206,0.11), transparent 28%), linear-gradient(145deg, rgba(15,67,60,0.2), rgba(5,13,28,0.78))",
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
              fontSize: "10px",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.17em",
            }}
          >
            Residents & Tenants
          </p>
          <h2
            style={{
              margin: "7px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "29px" : "34px",
              fontWeight: 500,
              lineHeight: 1.05,
            }}
          >
            Meet the people behind your properties
          </h2>
          <p
            style={{
              margin: "8px 0 0",
              color: "rgba(255,255,255,0.56)",
              fontSize: "12px",
              lineHeight: 1.55,
              maxWidth: "860px",
            }}
          >
            See who is renting, applying, planning a move or keeping an eye on your properties.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onOpenMessages}
            style={{ ...secondaryButton, minHeight: "38px", padding: "0 16px" }}
          >
            Messages
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={actionLoading}
            style={{
              ...secondaryButton,
              minHeight: "38px",
              padding: "0 16px",
              opacity: actionLoading ? 0.55 : 1,
            }}
          >
            {actionLoading ? "Checking..." : "↻ Check for Updates"}
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: "14px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5,minmax(0,1fr))",
          gap: "8px",
        }}
      >
        {[
          ["People You Know", stats.connected_residents],
          ["Current Tenants", stats.active_tenants],
          ["Planning a Move", stats.considering_move],
          ["Budget Watch", stats.financial_pressure],
          ["Recent Updates", stats.recent_life_events],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            style={{
              borderRadius: "14px",
              background: "rgba(255,255,255,0.045)",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "11px 12px",
            }}
          >
            <small style={{ color: "rgba(255,255,255,0.45)", fontSize: "10px" }}>{label}</small>
            <strong
              style={{
                display: "block",
                marginTop: "3px",
                fontSize: "18px",
                color:
                  label === "Planning a Move" && Number(value) > 0
                    ? "#ffd18a"
                    : label === "Budget Watch" && Number(value) > 0
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
            marginTop: "14px",
            minHeight: "120px",
            display: "grid",
            placeItems: "center",
            borderRadius: "16px",
            border: "1px dashed rgba(121,242,206,0.2)",
            background: "rgba(255,255,255,0.025)",
            color: "rgba(255,255,255,0.52)",
            textAlign: "center",
            padding: "20px",
          }}
        >
          Once residents apply, rent from you or make an offer, they will appear here.
        </div>
      ) : (
        <div
          style={{
            marginTop: "14px",
            display: "grid",
            gridTemplateColumns: residentColumns,
            gap: "10px",
          }}
        >
          {residents.map((resident) => {
            const latest = eventByResident.get(resident.resident_id);
            const avatar = getResidentAvatarSrc(resident.avatar_key);
            const householdLabel = resident.resident_kind === "business" ? "Team" : "Household";

            return (
              <article
                key={resident.resident_id}
                style={{
                  borderRadius: "16px",
                  border: resident.move_intent
                    ? "1px solid rgba(255,209,138,0.28)"
                    : "1px solid rgba(255,255,255,0.08)",
                  background: resident.move_intent
                    ? "linear-gradient(145deg, rgba(255,209,138,0.07), rgba(255,255,255,0.035))"
                    : "rgba(255,255,255,0.038)",
                  padding: "12px",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "72px minmax(0,1fr)",
                    gap: "11px",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: "72px",
                      height: "72px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: "2px solid rgba(121,242,206,0.28)",
                      boxShadow: "0 8px 20px rgba(0,0,0,0.24)",
                      background: "rgba(121,242,206,0.06)",
                      flexShrink: 0,
                    }}
                  >
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={resident.display_name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "center 28%",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "grid",
                          placeItems: "center",
                          fontSize: "26px",
                          fontWeight: 950,
                          color: "#0b5d4d",
                          background: "linear-gradient(145deg,#d8fff2,#8fe7ca)",
                        }}
                      >
                        {resident.display_name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "15px", lineHeight: 1.2 }}>{resident.display_name}</strong>
                      {resident.move_intent && (
                        <span
                          style={{
                            borderRadius: "999px",
                            padding: "3px 6px",
                            background: "rgba(255,209,138,0.9)",
                            color: "#3d2607",
                            fontSize: "8px",
                            fontWeight: 950,
                          }}
                        >
                          May move
                        </span>
                      )}
                    </div>
                    <small
                      style={{
                        display: "block",
                        marginTop: "3px",
                        color: "rgba(255,255,255,0.46)",
                        fontSize: "10px",
                        lineHeight: 1.35,
                      }}
                    >
                      {resident.occupation} · {titleCase(resident.life_stage) || "Resident"}
                    </small>
                    {resident.employer_name && (
                      <small
                        style={{
                          display: "block",
                          marginTop: "3px",
                          color: resident.employer_stock_symbol ? "#8ee8ff" : "rgba(255,255,255,0.38)",
                          fontSize: "9px",
                          lineHeight: 1.3,
                        }}
                      >
                        {resident.employer_name}
                        {resident.employer_stock_symbol ? ` · ${resident.employer_stock_symbol}` : ""}
                      </small>
                    )}
                    <span
                      style={{
                        display: "inline-flex",
                        marginTop: "7px",
                        borderRadius: "999px",
                        padding: "4px 7px",
                        background: "rgba(3,12,21,0.72)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.82)",
                        fontSize: "9px",
                        fontWeight: 800,
                      }}
                    >
                      {relationshipLabel(resident.relationship_to_user)}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "10px",
                    display: "grid",
                    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                    gap: "6px",
                  }}
                >
                  {[
                    [householdLabel, resident.household_size],
                    ["Income", `${formatNumber(resident.monthly_income)} DT/mo`],
                    ["Savings", `${formatNumber(resident.savings)} DT`],
                    ["Max rent", `${formatNumber(resident.max_weekly_rent)} DT/wk`],
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      style={{
                        borderRadius: "10px",
                        background: "rgba(255,255,255,0.032)",
                        padding: "7px 8px",
                        minWidth: 0,
                      }}
                    >
                      <small style={{ color: "rgba(255,255,255,0.36)", fontSize: "9px" }}>{label}</small>
                      <strong
                        style={{
                          display: "block",
                          marginTop: "2px",
                          fontSize: "10px",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {value}
                      </strong>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: "7px",
                    borderRadius: "10px",
                    padding: "7px 8px",
                    background: "rgba(255,255,255,0.028)",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "8px",
                    alignItems: "center",
                  }}
                >
                  <small style={{ color: "rgba(255,255,255,0.38)", fontSize: "9px" }}>Budget</small>
                  <strong style={{ color: financialAccent(resident.financial_pressure), fontSize: "10px" }}>
                    {pressureLabel(resident.financial_pressure)}
                  </strong>
                </div>

                {(resident.property_name || resident.current_weekly_rent != null) && (
                  <div
                    style={{
                      marginTop: "7px",
                      padding: "7px 8px",
                      borderRadius: "10px",
                      background: "rgba(121,242,206,0.05)",
                      color: "rgba(255,255,255,0.6)",
                      fontSize: "9px",
                      lineHeight: 1.4,
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
                  </div>
                )}

                {latest && (
                  <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    <small style={{ color: "#79f2ce", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "8px" }}>
                      Latest update
                    </small>
                    <strong style={{ display: "block", marginTop: "3px", fontSize: "10px" }}>{latest.title}</strong>
                    <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.42)", fontSize: "9px", lineHeight: 1.35 }}>
                      {latest.description}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {events.length > 0 && (
        <div style={{ marginTop: "18px" }}>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.45)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.13em", fontWeight: 900 }}>
            Recent resident activity
          </p>
          <div
            className="milo-scrollbar"
            style={{
              marginTop: "8px",
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))",
              gap: "7px",
              maxHeight: "260px",
              overflowY: "auto",
              paddingRight: "3px",
            }}
          >
            {events.slice(0, 14).map((event) => {
              const resident = residents.find((item) => item.resident_id === event.resident_id);
              const avatar = getResidentAvatarSrc(resident?.avatar_key);
              return (
                <div
                  key={event.event_id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "34px minmax(0,1fr) auto",
                    gap: "9px",
                    alignItems: "center",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(255,255,255,0.03)",
                    padding: "8px",
                  }}
                >
                  {avatar ? (
                    <img
                      src={avatar}
                      alt=""
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        objectPosition: "center 28%",
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(121,242,206,0.15)",
                        color: "#79f2ce",
                        fontWeight: 900,
                        fontSize: "11px",
                      }}
                    >
                      {(resident?.display_name || "D").slice(0, 1)}
                    </span>
                  )}
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ display: "block", fontSize: "10px" }}>
                      {resident?.display_name || "Dreamscape resident"} · {event.title}
                    </strong>
                    <small style={{ display: "block", marginTop: "2px", color: "rgba(255,255,255,0.4)", lineHeight: 1.35, fontSize: "9px" }}>
                      {event.description}
                    </small>
                  </span>
                  <small style={{ color: "rgba(255,255,255,0.32)", whiteSpace: "nowrap", fontSize: "8px" }}>
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
