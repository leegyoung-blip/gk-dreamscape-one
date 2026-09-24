"use client";

import type { BankScreenMode } from "../lib/bank-types";

export default function BankJourneyBar({
  screenMode,
  unlockedCount,
  totalCount,
  progressPercent,
  loading,
  onOpenAchievements,
  onOpenGuide,
}: {
  screenMode: BankScreenMode;
  unlockedCount: number;
  totalCount: number;
  progressPercent: number;
  loading: boolean;
  onOpenAchievements: () => void;
  onOpenGuide: () => void;
}) {
  const isMobile = screenMode === "mobile";

  return (
    <section
      aria-label="Bank journey progress"
      style={{
        marginTop: "12px",
        borderRadius: isMobile ? "18px" : "20px",
        border: "1px solid rgba(255,209,138,0.13)",
        background:
          "linear-gradient(135deg, rgba(255,209,138,0.055), rgba(83,215,255,0.045))",
        padding: isMobile ? "13px" : "14px 16px",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) auto",
        gap: isMobile ? "12px" : "18px",
        alignItems: "center",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div>
            <div
              style={{
                color: "#ffd18a",
                fontSize: "9px",
                fontWeight: 900,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
              }}
            >
              Financial Journey
            </div>
            <strong
              style={{
                display: "block",
                marginTop: "4px",
                fontSize: isMobile ? "14px" : "15px",
              }}
            >
              {loading ? "Loading milestones…" : `${unlockedCount} of ${totalCount} milestones unlocked`}
            </strong>
          </div>
          <strong style={{ color: "#8ee8ff", fontSize: "13px" }}>
            {loading ? "—" : `${progressPercent}%`}
          </strong>
        </div>

        <div
          style={{
            marginTop: "9px",
            height: "6px",
            borderRadius: "999px",
            overflow: "hidden",
            background: "rgba(255,255,255,0.065)",
          }}
        >
          <div
            style={{
              width: `${loading ? 0 : progressPercent}%`,
              height: "100%",
              borderRadius: "999px",
              background: "linear-gradient(90deg, #58d8ff, #ffd18a)",
              transition: "width 220ms ease",
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0,1fr))",
          gap: "8px",
          minWidth: isMobile ? undefined : "244px",
        }}
      >
        <button
          type="button"
          onClick={onOpenAchievements}
          style={actionStyle}
        >
          ★ Milestones
        </button>
        <button type="button" onClick={onOpenGuide} style={actionStyle}>
          ? Bank Guide
        </button>
      </div>
    </section>
  );
}

const actionStyle = {
  minHeight: "40px",
  padding: "0 12px",
  borderRadius: "12px",
  border: "1px solid rgba(126,232,255,0.14)",
  background: "rgba(3,12,29,0.40)",
  color: "rgba(255,255,255,0.78)",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "10px",
  fontWeight: 850,
  letterSpacing: "0.035em",
} as const;
