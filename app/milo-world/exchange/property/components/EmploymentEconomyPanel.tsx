"use client";

import type { CSSProperties } from "react";
import {
  formatNumber,
  getResidentAvatarSrc,
  type MiloEmploymentDashboard,
} from "./propertyExchangeShared";

type Props = {
  dashboard: MiloEmploymentDashboard;
  connectedResidentIds: string[];
  isMobile: boolean;
  isCompact: boolean;
  actionLoading: boolean;
  glassPanel: CSSProperties;
  secondaryButton: CSSProperties;
  onRefresh: () => void;
};

function statusLabel(value: string) {
  if (value === "expanding") return "Expanding";
  if (value === "hiring") return "Hiring";
  if (value === "steady") return "Steady";
  if (value === "cautious") return "Cautious";
  if (value === "contracting") return "Contracting";
  return "Steady";
}

function statusAccent(value: string) {
  if (value === "expanding") return "#79f2ce";
  if (value === "hiring") return "#8ee8ff";
  if (value === "cautious") return "#ffd18a";
  if (value === "contracting") return "#ff9292";
  return "rgba(255,255,255,0.72)";
}

function employerKindLabel(value: string | null) {
  if (value === "listed_company") return "Listed company";
  if (value === "private_business") return "Private employer";
  if (value === "community") return "Community role";
  if (value === "self_employed") return "Self-employed";
  if (value === "study") return "Studying";
  if (value === "unemployed") return "Between jobs";
  return "Work";
}

export default function EmploymentEconomyPanel({
  dashboard,
  connectedResidentIds,
  isMobile,
  isCompact,
  actionLoading,
  glassPanel,
  secondaryButton,
  onRefresh,
}: Props) {
  const connected = new Set(connectedResidentIds);
  const relatedResidents = dashboard.residents.filter((resident) =>
    connected.has(resident.resident_id)
  );

  return (
    <section
      data-milo-guide="property-employment-economy"
      style={{
        ...glassPanel,
        padding: isMobile ? "16px" : "20px",
        border: "1px solid rgba(142,232,255,0.16)",
        background:
          "radial-gradient(circle at 10% 0%, rgba(142,232,255,0.09), transparent 30%), linear-gradient(145deg, rgba(14,38,72,0.2), rgba(5,13,28,0.78))",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: isMobile ? "stretch" : "flex-end",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "#8ee8ff",
              fontSize: "10px",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
            }}
          >
            Jobs & Income
          </p>
          <h2
            style={{
              margin: "7px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "29px" : "34px",
              fontWeight: 500,
            }}
          >
            Work can change what residents can afford
          </h2>
          <p
            style={{
              margin: "8px 0 0",
              color: "rgba(255,255,255,0.54)",
              fontSize: "12px",
              lineHeight: 1.5,
              maxWidth: "860px",
            }}
          >
            Some residents work for Stock Exchange companies. Others work for private businesses,
            community organisations, themselves, or are still studying.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={actionLoading}
          style={{
            ...secondaryButton,
            minHeight: "38px",
            padding: "0 15px",
            opacity: actionLoading ? 0.55 : 1,
          }}
        >
          {actionLoading ? "Checking..." : "↻ Update Jobs"}
        </button>
      </div>

      <div
        style={{
          marginTop: "14px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))",
          gap: "8px",
        }}
      >
        {[
          ["Listed Companies", dashboard.stats.listed_companies],
          ["Listed-company Workers", dashboard.stats.listed_company_workers],
          ["Other Workers", dashboard.stats.private_or_community_workers + dashboard.stats.self_employed],
          ["Between Jobs", dashboard.stats.between_jobs],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            style={{
              borderRadius: "13px",
              padding: "10px 11px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <small style={{ color: "rgba(255,255,255,0.42)", fontSize: "9px" }}>{label}</small>
            <strong style={{ display: "block", marginTop: "3px", fontSize: "17px" }}>{value}</strong>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "14px",
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : isCompact
            ? "repeat(2,minmax(0,1fr))"
            : "repeat(auto-fit,minmax(170px,1fr))",
          gap: "8px",
        }}
      >
        {dashboard.companies.map((company) => (
          <article
            key={company.symbol}
            style={{
              borderRadius: "14px",
              padding: "11px 12px",
              background: "rgba(255,255,255,0.035)",
              border: "1px solid rgba(255,255,255,0.07)",
              minWidth: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
              <strong style={{ fontSize: "13px" }}>{company.symbol}</strong>
              <span style={{ color: statusAccent(company.hiring_status), fontSize: "9px", fontWeight: 900 }}>
                {statusLabel(company.hiring_status)}
              </span>
            </div>
            <span
              style={{
                display: "block",
                marginTop: "4px",
                color: "rgba(255,255,255,0.54)",
                fontSize: "10px",
                lineHeight: 1.3,
              }}
            >
              {company.company_name}
            </span>
            <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between", gap: "8px" }}>
              <small style={{ color: "rgba(255,255,255,0.36)" }}>Company health</small>
              <strong style={{ fontSize: "10px" }}>{company.health_score}/100</strong>
            </div>
            <div
              style={{
                marginTop: "5px",
                height: "5px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.07)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.max(0, Math.min(100, company.health_score))}%`,
                  height: "100%",
                  borderRadius: "999px",
                  background: "linear-gradient(90deg,rgba(142,232,255,.65),rgba(121,242,206,.85))",
                }}
              />
            </div>
          </article>
        ))}
      </div>

      {relatedResidents.length > 0 && (
        <div style={{ marginTop: "16px" }}>
          <p
            style={{
              margin: 0,
              color: "rgba(255,255,255,0.46)",
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Residents connected to your properties
          </p>
          <div
            style={{
              marginTop: "8px",
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit,minmax(230px,1fr))",
              gap: "8px",
            }}
          >
            {relatedResidents.map((resident) => {
              const avatar = getResidentAvatarSrc(resident.avatar_key);
              return (
                <article
                  key={resident.resident_id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px minmax(0,1fr) auto",
                    gap: "9px",
                    alignItems: "center",
                    padding: "9px 10px",
                    borderRadius: "13px",
                    background: "rgba(255,255,255,0.035)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      background: "rgba(142,232,255,0.08)",
                      border: "1px solid rgba(142,232,255,0.18)",
                    }}
                  >
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={resident.display_name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 28%" }}
                      />
                    ) : null}
                  </div>
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ display: "block", fontSize: "11px" }}>{resident.display_name}</strong>
                    <small
                      style={{
                        display: "block",
                        marginTop: "3px",
                        color: "rgba(255,255,255,0.44)",
                        fontSize: "9px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {resident.employer_name || employerKindLabel(resident.employer_kind)}
                      {resident.employer_stock_symbol ? ` · ${resident.employer_stock_symbol}` : ""}
                    </small>
                  </span>
                  <span style={{ textAlign: "right" }}>
                    <small style={{ display: "block", color: "rgba(255,255,255,0.35)", fontSize: "8px" }}>
                      Income
                    </small>
                    <strong style={{ fontSize: "10px", whiteSpace: "nowrap" }}>
                      {formatNumber(resident.monthly_income)} DT
                    </strong>
                  </span>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
