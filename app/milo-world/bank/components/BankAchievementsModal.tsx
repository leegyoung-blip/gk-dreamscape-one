"use client";

import { useEffect } from "react";
import type { BankAchievement } from "../lib/bank-achievements";
import type { BankScreenMode } from "../lib/bank-types";

export default function BankAchievementsModal({
  open,
  onClose,
  screenMode,
  achievements,
  unlockedCount,
  totalCount,
  loading,
  error,
  isLoggedIn,
  onRetry,
}: {
  open: boolean;
  onClose: () => void;
  screenMode: BankScreenMode;
  achievements: BankAchievement[];
  unlockedCount: number;
  totalCount: number;
  loading: boolean;
  error: string | null;
  isLoggedIn: boolean;
  onRetry: () => void;
}) {
  const isMobile = screenMode === "mobile";

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bank milestones"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
        padding: isMobile ? 0 : "24px",
        background: "rgba(1,5,14,0.72)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          width: isMobile ? "100%" : "min(760px, 100%)",
          maxHeight: isMobile ? "88dvh" : "min(760px, 88dvh)",
          overflowY: "auto",
          borderRadius: isMobile ? "26px 26px 0 0" : "28px",
          border: "1px solid rgba(126,232,255,0.18)",
          background:
            "radial-gradient(circle at 85% 0%, rgba(255,209,138,0.10), transparent 32%), linear-gradient(145deg, rgba(8,28,49,0.98), rgba(4,9,24,0.99))",
          boxShadow: "0 36px 100px rgba(0,0,0,0.58)",
          padding: isMobile ? "20px 18px 26px" : "26px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#ffd18a",
                fontSize: "9px",
                fontWeight: 900,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              Financial Journey
            </p>
            <h2
              style={{
                margin: "7px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "32px" : "40px",
                fontWeight: 500,
                lineHeight: 1,
              }}
            >
              Your Milestones
            </h2>
            <p
              style={{
                margin: "9px 0 0",
                color: "rgba(255,255,255,0.48)",
                fontSize: "12px",
                lineHeight: 1.55,
              }}
            >
              Milestones reflect things you have already done in Milo’s Bank. They do not spend DT and do not need to be claimed.
            </p>
          </div>

          <button type="button" onClick={onClose} aria-label="Close milestones" style={closeStyle}>
            ×
          </button>
        </div>

        <div
          style={{
            marginTop: "18px",
            borderRadius: "16px",
            border: "1px solid rgba(255,209,138,0.13)",
            background: "rgba(255,209,138,0.04)",
            padding: "13px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <strong style={{ fontSize: "13px" }}>
            {loading ? "Checking your progress…" : `${unlockedCount} / ${totalCount} unlocked`}
          </strong>
          <span style={{ color: "#ffd18a", fontSize: "18px" }}>★</span>
        </div>

        {!isLoggedIn ? (
          <div style={messageBoxStyle}>
            Log in to track your Bank milestones across Savings, Bonds and Financial Foundations.
          </div>
        ) : error ? (
          <div style={messageBoxStyle}>
            <div>{error}</div>
            <button type="button" onClick={onRetry} style={retryStyle}>
              Try Again
            </button>
          </div>
        ) : (
          <div
            style={{
              marginTop: "14px",
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))",
              gap: "10px",
            }}
          >
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                style={{
                  minHeight: "104px",
                  borderRadius: "17px",
                  border: achievement.unlocked
                    ? "1px solid rgba(159,255,210,0.18)"
                    : "1px solid rgba(255,255,255,0.07)",
                  background: achievement.unlocked
                    ? "linear-gradient(135deg, rgba(63,174,128,0.11), rgba(83,215,255,0.045))"
                    : "rgba(255,255,255,0.025)",
                  padding: "14px",
                  display: "grid",
                  gridTemplateColumns: "42px minmax(0,1fr)",
                  gap: "12px",
                  alignItems: "center",
                  opacity: loading ? 0.58 : 1,
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "14px",
                    border: achievement.unlocked
                      ? "1px solid rgba(159,255,210,0.24)"
                      : "1px solid rgba(255,255,255,0.08)",
                    background: achievement.unlocked
                      ? "rgba(93,255,181,0.08)"
                      : "rgba(255,255,255,0.025)",
                    color: achievement.unlocked ? "#9fffd2" : "rgba(255,255,255,0.28)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    fontWeight: 900,
                  }}
                >
                  {achievement.unlocked ? achievement.icon : "·"}
                </div>
                <div>
                  <div
                    style={{
                      color: achievement.unlocked ? "#9fffd2" : "rgba(255,255,255,0.32)",
                      fontSize: "8px",
                      fontWeight: 900,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                    }}
                  >
                    {achievement.unlocked ? "Unlocked" : "Locked"}
                  </div>
                  <strong
                    style={{
                      display: "block",
                      marginTop: "4px",
                      color: achievement.unlocked ? "white" : "rgba(255,255,255,0.54)",
                      fontSize: "14px",
                    }}
                  >
                    {achievement.title}
                  </strong>
                  <p
                    style={{
                      margin: "5px 0 0",
                      color: "rgba(255,255,255,0.40)",
                      fontSize: "10px",
                      lineHeight: 1.45,
                    }}
                  >
                    {achievement.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const closeStyle = {
  width: "38px",
  height: "38px",
  flexShrink: 0,
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  cursor: "pointer",
  fontSize: "22px",
  lineHeight: 1,
} as const;

const messageBoxStyle = {
  marginTop: "14px",
  borderRadius: "16px",
  border: "1px solid rgba(126,232,255,0.11)",
  background: "rgba(255,255,255,0.025)",
  padding: "18px",
  color: "rgba(255,255,255,0.52)",
  fontSize: "12px",
  lineHeight: 1.55,
  textAlign: "center",
} as const;

const retryStyle = {
  marginTop: "12px",
  minHeight: "38px",
  padding: "0 14px",
  borderRadius: "11px",
  border: "1px solid rgba(126,232,255,0.24)",
  background: "rgba(83,215,255,0.08)",
  color: "white",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "10px",
  fontWeight: 850,
} as const;
