"use client";

import { useState } from "react";
import { FINANCIAL_LEARNING_PATHWAYS } from "../lib/financial-learning";
import type { BankScreenMode } from "../lib/bank-types";
import FinancialCoursePanel from "./FinancialCoursePanel";
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
  const [selectedCourseId, setSelectedCourseId] = useState("financial-foundations");
  const availablePathways = FINANCIAL_LEARNING_PATHWAYS.filter((pathway) => pathway.status === "available").length;

  return (
    <div style={{ marginTop: "18px" }}>
      <section style={{ borderRadius: isMobile ? "22px" : "26px", border: "1px solid rgba(126,232,255,0.14)", background: "linear-gradient(145deg, rgba(7,25,47,0.82), rgba(5,10,27,0.92))", padding: isMobile ? "19px" : "22px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", alignItems: "flex-start", flexWrap: "wrap" }}>
          <div>
            <p style={eyebrowStyle}>Financial Learning</p>
            <h2 style={{ margin: "7px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "38px" : "48px", lineHeight: 0.98, fontWeight: 500, letterSpacing: "-0.035em" }}>Learn</h2>
          </div>
          {!accessLoading && hasMiloFinanceAccess && <MiloFinanceBadge active />}
        </div>
        <p style={{ margin: "11px 0 0", maxWidth: "820px", color: "rgba(255,255,255,0.54)", fontSize: "12px", lineHeight: 1.65 }}>
          Learn finance through decisions, calculations and simulations inside Dreamscape. Financial Foundations and the opening Money Decisions lessons are free; Banking & Growth and Markets & Investing extend into Milo Finance.
        </p>
      </section>

      <section style={{ marginTop: "14px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "14px", flexWrap: "wrap", marginBottom: "10px" }}>
          <div>
            <p style={{ ...eyebrowStyle, color: "rgba(255,255,255,0.38)" }}>Learning pathways</p>
            <h3 style={{ margin: "5px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "28px", fontWeight: 500 }}>Start with the fundamentals. Go deeper over time.</h3>
          </div>
          <span style={{ color: "rgba(255,255,255,0.34)", fontSize: "9px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{availablePathways} pathways available</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : compact ? "repeat(2, minmax(0,1fr))" : "repeat(5, minmax(0,1fr))", gap: "9px" }}>
          {FINANCIAL_LEARNING_PATHWAYS.map((pathway) => {
            const available = pathway.status === "available";
            const selected = selectedCourseId === pathway.id;
            const premiumOnly = pathway.accessTier === "milo_finance";
            const showFinanceBadge = premiumOnly || pathway.includesPremium;

            return (
              <button
                type="button"
                key={pathway.id}
                onClick={() => available && setSelectedCourseId(pathway.id)}
                disabled={!available}
                style={{ minHeight: compact ? "172px" : "190px", borderRadius: "18px", border: selected ? `1px solid ${pathway.accent}66` : available ? `1px solid ${pathway.accent}38` : "1px solid rgba(255,255,255,0.06)", background: selected ? `linear-gradient(145deg, ${pathway.accent}17, rgba(4,13,29,0.86))` : available ? `linear-gradient(145deg, ${pathway.accent}0f, rgba(4,13,29,0.78))` : "rgba(4,13,29,0.58)", padding: "15px", display: "flex", flexDirection: "column", opacity: available ? 1 : 0.62, color: "white", textAlign: "left", cursor: available ? "pointer" : "default", fontFamily: "inherit" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start", flexWrap: "wrap" }}>
                  <span style={{ color: available ? pathway.accent : "rgba(255,255,255,0.30)", fontSize: "8px", fontWeight: 900, letterSpacing: "0.11em", textTransform: "uppercase" }}>Course {String(pathway.order).padStart(2, "0")} · {available ? "Available" : "Planned"}</span>
                  {showFinanceBadge && <MiloFinanceBadge active={hasMiloFinanceAccess} compact />}
                </div>
                <strong style={{ display: "block", marginTop: "8px", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "20px", lineHeight: 1.08, fontWeight: 500 }}>{pathway.title}</strong>
                <p style={{ margin: "9px 0 0", color: "rgba(255,255,255,0.44)", fontSize: "10px", lineHeight: 1.5 }}>{pathway.description}</p>
                <div style={{ marginTop: "auto", paddingTop: "12px", color: selected ? pathway.accent : "rgba(255,255,255,0.36)", fontSize: "8px", fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {selected ? "Viewing course · " : ""}{pathway.meta}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <FinancialCoursePanel courseId={selectedCourseId} screenMode={screenMode} isLoggedIn={isLoggedIn} hasMiloFinanceAccess={hasMiloFinanceAccess} onOpenUpgrade={onOpenUpgrade} />
    </div>
  );
}

const eyebrowStyle = { margin: 0, color: "#8ee8ff", fontSize: "9px", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" } as const;
