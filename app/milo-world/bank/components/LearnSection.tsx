"use client";

import { FINANCIAL_LEARNING_PATHWAYS } from "../lib/financial-learning";
import type { BankScreenMode } from "../lib/bank-types";
import MoneyLabPanel from "./MoneyLabPanel";
import MiloFinanceBadge from "./MiloFinanceBadge";

export default function LearnSection({
  screenMode,
  isLoggedIn,
  hasMiloFinanceAccess,
  accessLoading,
  onOpenUpgrade,
}: {
  screenMode: BankScreenMode;
  isLoggedIn: boolean;
  hasMiloFinanceAccess: boolean;
  accessLoading: boolean;
  onOpenUpgrade: () => void;
}) {
  const isMobile = screenMode === "mobile";
  const compact = screenMode !== "desktop";

  return (
    <div style={{ marginTop: "18px" }}>
      <section
        style={{
          borderRadius: isMobile ? "22px" : "26px",
          border: "1px solid rgba(126,232,255,0.14)",
          background:
            "linear-gradient(145deg, rgba(7,25,47,0.82), rgba(5,10,27,0.92))",
          padding: isMobile ? "19px" : "22px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "14px",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p style={eyebrowStyle}>Financial Learning</p>
            <h2
              style={{
                margin: "7px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "38px" : "48px",
                lineHeight: 0.98,
                fontWeight: 500,
                letterSpacing: "-0.035em",
              }}
            >
              Learn
            </h2>
          </div>
          {!accessLoading && hasMiloFinanceAccess && <MiloFinanceBadge active />}
        </div>

        <p
          style={{
            margin: "11px 0 0",
            maxWidth: "790px",
            color: "rgba(255,255,255,0.54)",
            fontSize: "12px",
            lineHeight: 1.65,
          }}
        >
          Build financial understanding in structured pathways, then apply it across Milo’s Bank,
          Exchange and Business Builder. Financial Foundations stays free; advanced pathways sit
          inside Milo Finance.
        </p>
      </section>

      <section style={{ marginTop: "14px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "14px",
            flexWrap: "wrap",
            marginBottom: "10px",
          }}
        >
          <div>
            <p style={{ ...eyebrowStyle, color: "rgba(255,255,255,0.38)" }}>Learning pathways</p>
            <h3
              style={{
                margin: "5px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: "28px",
                fontWeight: 500,
              }}
            >
              Start with the fundamentals. Go deeper over time.
            </h3>
          </div>
          <span
            style={{
              color: "rgba(255,255,255,0.34)",
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            1 pathway available
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : compact
                ? "repeat(2, minmax(0,1fr))"
                : "repeat(5, minmax(0,1fr))",
            gap: "9px",
          }}
        >
          {FINANCIAL_LEARNING_PATHWAYS.map((pathway) => {
            const available = pathway.status === "available";
            const premium = pathway.accessTier === "milo_finance";
            const locked = premium && !hasMiloFinanceAccess;

            return (
              <article
                key={pathway.id}
                style={{
                  minHeight: compact ? "172px" : "190px",
                  borderRadius: "18px",
                  border: available
                    ? `1px solid ${pathway.accent}38`
                    : locked
                      ? "1px solid rgba(255,209,138,0.13)"
                      : "1px solid rgba(255,255,255,0.06)",
                  background: available
                    ? `linear-gradient(145deg, ${pathway.accent}0f, rgba(4,13,29,0.78))`
                    : locked
                      ? "linear-gradient(145deg, rgba(255,209,138,0.04), rgba(4,13,29,0.66))"
                      : "rgba(4,13,29,0.58)",
                  padding: "15px",
                  display: "flex",
                  flexDirection: "column",
                  opacity: available || premium ? 1 : 0.68,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "8px",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      color: available ? pathway.accent : "rgba(255,255,255,0.30)",
                      fontSize: "8px",
                      fontWeight: 900,
                      letterSpacing: "0.11em",
                      textTransform: "uppercase",
                    }}
                  >
                    Course {String(pathway.order).padStart(2, "0")} · {available ? "Available" : "Planned"}
                  </span>
                  {premium && <MiloFinanceBadge active={hasMiloFinanceAccess} compact />}
                </div>

                <strong
                  style={{
                    display: "block",
                    marginTop: "8px",
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: "20px",
                    lineHeight: 1.08,
                    fontWeight: 500,
                  }}
                >
                  {pathway.title}
                </strong>
                <p
                  style={{
                    margin: "9px 0 0",
                    color: "rgba(255,255,255,0.44)",
                    fontSize: "10px",
                    lineHeight: 1.5,
                  }}
                >
                  {pathway.description}
                </p>

                <div style={{ marginTop: "auto", paddingTop: "12px" }}>
                  {locked ? (
                    <button
                      type="button"
                      onClick={onOpenUpgrade}
                      disabled={accessLoading}
                      style={{
                        minHeight: "32px",
                        padding: "0 10px",
                        borderRadius: "10px",
                        border: "1px solid rgba(255,209,138,0.22)",
                        background: "rgba(255,190,90,0.055)",
                        color: "#ffd18a",
                        cursor: accessLoading ? "wait" : "pointer",
                        fontFamily: "inherit",
                        fontSize: "8px",
                        fontWeight: 900,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      {accessLoading ? "Checking access…" : "Explore Milo Finance →"}
                    </button>
                  ) : (
                    <span
                      style={{
                        color: available ? pathway.accent : "rgba(255,255,255,0.32)",
                        fontSize: "8px",
                        fontWeight: 850,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {premium && hasMiloFinanceAccess ? "Included with Milo Finance · " : ""}
                      {pathway.meta}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <MoneyLabPanel screenMode={screenMode} isLoggedIn={isLoggedIn} />
    </div>
  );
}

const eyebrowStyle = {
  margin: 0,
  color: "#8ee8ff",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
} as const;
