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
    if (!eventByResident.has(event.resident_id)) eventByResident.set(event.resident_id, event);
  }

  return (
    <section
      data-milo-guide="property-resident-life"
      style={{
        ...glassPanel,
        padding: isMobile ? "18px" : "26px",
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
          gap: "16px",
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
            Residents & Tenants
          </p>
          <h2
            style={{
              margin: "8px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "31px" : "40px",
              fontWeight: 500,
            }}
          >
            Meet the people behind your properties
          </h2>
          <p
            style={{
              margin: "10px 0 0",
              color: "rgba(255,255,255,0.58)",
              fontSize: "13px",
              lineHeight: 1.6,
              maxWidth: "920px",
            }}
          >
            Residents have careers, savings, households and plans of their own. Their lives
            can change what they can afford, what kind of home they want and whether they
            choose to stay with you.
          </p>
        </div>

        <div style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onOpenMessages}
            style={{ ...secondaryButton, minHeight: "42px" }}
          >
            Messages
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
            {actionLoading ? "Checking..." : "↻ Check for Updates"}
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: "18px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5,minmax(0,1fr))",
          gap: "10px",
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
              borderRadius: "16px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.09)",
              padding: "14px",
            }}
          >
            <small style={{ color: "rgba(255,255,255,0.48)" }}>{label}</small>
            <strong
              style={{
                display: "block",
                marginTop: "5px",
                fontSize: "22px",
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
            marginTop: "18px",
            minHeight: "140px",
            display: "grid",
            placeItems: "center",
            borderRadius: "18px",
            border: "1px dashed rgba(121,242,206,0.2)",
            background: "rgba(255,255,255,0.025)",
            color: "rgba(255,255,255,0.52)",
            textAlign: "center",
            padding: "24px",
          }}
        >
          Once residents apply, rent from you or make an offer, their stories will appear here.
        </div>
      ) : (
        <div
          style={{
            marginTop: "18px",
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : isCompact
              ? `repeat(${Math.min(2, Math.max(1, residents.length))},minmax(0,1fr))`
              : `repeat(${Math.min(4, Math.max(1, residents.length))},minmax(0,1fr))`,
            gap: "13px",
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
                  overflow: "hidden",
                  borderRadius: "20px",
                  border: resident.move_intent
                    ? "1px solid rgba(255,209,138,0.28)"
                    : "1px solid rgba(255,255,255,0.09)",
                  background: resident.move_intent
                    ? "linear-gradient(145deg, rgba(255,209,138,0.075), rgba(255,255,255,0.035))"
                    : "rgba(255,255,255,0.045)",
                }}
              >
                <div style={{ position: "relative", height: isMobile ? "175px" : "150px", background: "rgba(121,242,206,0.06)" }}>
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={resident.display_name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: "42px", fontWeight: 950, color: "#0b5d4d", background: "linear-gradient(145deg,#d8fff2,#8fe7ca)" }}>
                      {resident.display_name.slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <span
                    style={{
                      position: "absolute",
                      left: "12px",
                      bottom: "12px",
                      borderRadius: "999px",
                      padding: "6px 9px",
                      background: "rgba(3,12,21,0.82)",
                      backdropFilter: "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      color: "white",
                      fontSize: "10px",
                      fontWeight: 900,
                    }}
                  >
                    {relationshipLabel(resident.relationship_to_user)}
                  </span>

                  {resident.move_intent && (
                    <span
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "12px",
                        borderRadius: "999px",
                        padding: "6px 9px",
                        background: "rgba(255,209,138,0.92)",
                        color: "#3d2607",
                        fontSize: "9px",
                        fontWeight: 950,
                      }}
                    >
                      Thinking of moving
                    </span>
                  )}
                </div>

                <div style={{ padding: "15px" }}>
                  <strong style={{ display: "block", fontSize: "16px" }}>{resident.display_name}</strong>
                  <small style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.5)" }}>
                    {resident.occupation} · {titleCase(resident.life_stage) || "Resident"}
                  </small>

                  <div
                    style={{
                      marginTop: "13px",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                    }}
                  >
                    {[
                      [householdLabel, resident.household_size],
                      ["Income / month", `${formatNumber(resident.monthly_income)} DT`],
                      ["Savings", `${formatNumber(resident.savings)} DT`],
                      ["Max rent", `${formatNumber(resident.max_weekly_rent)} DT/wk`],
                    ].map(([label, value]) => (
                      <div
                        key={String(label)}
                        style={{
                          borderRadius: "12px",
                          background: "rgba(255,255,255,0.04)",
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

                  <div
                    style={{
                      marginTop: "9px",
                      borderRadius: "12px",
                      padding: "10px",
                      background: "rgba(255,255,255,0.035)",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <small style={{ color: "rgba(255,255,255,0.42)" }}>Budget health</small>
                    <strong style={{ color: financialAccent(resident.financial_pressure), fontSize: "12px" }}>
                      {pressureLabel(resident.financial_pressure)}
                    </strong>
                  </div>

                  {(resident.property_name || resident.current_weekly_rent) && (
                    <div
                      style={{
                        marginTop: "9px",
                        padding: "10px 11px",
                        borderRadius: "12px",
                        background: "rgba(121,242,206,0.055)",
                        color: "rgba(255,255,255,0.66)",
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
                    </div>
                  )}

                  {resident.move_intent && resident.move_reason && (
                    <p style={{ margin: "10px 0 0", color: "#ffd18a", fontSize: "11px", lineHeight: 1.45 }}>
                      Why they may move: {titleCase(resident.move_reason)}
                    </p>
                  )}

                  {latest && (
                    <div style={{ marginTop: "11px", paddingTop: "11px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                      <small style={{ color: "#79f2ce", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Latest update
                      </small>
                      <strong style={{ display: "block", marginTop: "5px", fontSize: "12px" }}>{latest.title}</strong>
                      <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.48)", fontSize: "10px", lineHeight: 1.45 }}>
                        {latest.description}
                      </p>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {events.length > 0 && (
        <div style={{ marginTop: "22px" }}>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.48)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 900 }}>
            What&apos;s been happening
          </p>
          <div
            className="milo-scrollbar"
            style={{
              marginTop: "9px",
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))",
              gap: "8px",
              maxHeight: "320px",
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
                    gridTemplateColumns: "38px minmax(0,1fr) auto",
                    gap: "10px",
                    alignItems: "center",
                    borderRadius: "14px",
                    border: "1px solid rgba(255,255,255,0.07)",
                    background: "rgba(255,255,255,0.035)",
                    padding: "10px",
                  }}
                >
                  {avatar ? (
                    <img src={avatar} alt="" style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ width: "38px", height: "38px", borderRadius: "50%", display: "grid", placeItems: "center", background: "rgba(121,242,206,0.15)", color: "#79f2ce", fontWeight: 900 }}>
                      {(resident?.display_name || "D").slice(0, 1)}
                    </span>
                  )}
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ display: "block", fontSize: "11px" }}>
                      {resident?.display_name || "Dreamscape resident"} · {event.title}
                    </strong>
                    <small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>
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
