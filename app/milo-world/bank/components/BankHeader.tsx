"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import type { BankScreenMode } from "../lib/bank-types";

export default function BankHeader({
  screenMode,
  available,
  loading,
  onOpenGuide,
  onOpenAchievements,
}: {
  screenMode: BankScreenMode;
  available: number;
  loading: boolean;
  onOpenGuide: () => void;
  onOpenAchievements: () => void;
}) {
  const isMobile = screenMode === "mobile";

  const buttonStyle: CSSProperties = {
    minHeight: isMobile ? "40px" : "44px",
    padding: isMobile ? "0 12px" : "0 17px",
    borderRadius: "999px",
    border: "1px solid rgba(126,232,255,0.24)",
    background: "rgba(3,12,29,0.78)",
    color: "white",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: isMobile ? "10px" : "12px",
    fontWeight: 850,
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow: "0 14px 34px rgba(0,0,0,0.28)",
    whiteSpace: "nowrap",
  };

  const iconButtonStyle: CSSProperties = {
    ...buttonStyle,
    width: isMobile ? "40px" : "auto",
    padding: isMobile ? 0 : "0 14px",
    cursor: "pointer",
    fontFamily: "inherit",
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        width: "100%",
        borderBottom: "1px solid rgba(126,232,255,0.055)",
        background:
          "linear-gradient(180deg, rgba(2,8,19,0.93), rgba(2,8,19,0.76))",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "none",
          margin: "0 auto",
          padding: isMobile ? "8px 10px" : "12px 22px",
          boxSizing: "border-box",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <Link href="/milo-world" style={buttonStyle}>
          <span>←</span>
          {isMobile ? "World" : "Back to Milo’s World"}
        </Link>

        <div
          style={{
            display: "flex",
            gap: isMobile ? "5px" : "8px",
            alignItems: "center",
          }}
        >
          <div
            style={{
              ...buttonStyle,
              padding: isMobile ? "0 10px" : "0 16px",
              border: "1px solid rgba(83,215,255,0.34)",
              color: "#bdf6ff",
            }}
          >
            {!isMobile && (
              <span
                aria-hidden="true"
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "999px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(83,215,255,0.12)",
                  fontSize: "10px",
                  fontWeight: 950,
                }}
              >
                DT
              </span>
            )}
            <strong>
              {loading ? "..." : Math.round(available).toLocaleString("en-SG")}
              {isMobile ? " DT" : ""}
            </strong>
          </div>

          <button
            type="button"
            onClick={onOpenGuide}
            style={iconButtonStyle}
            title="Bank guide"
            aria-label="Open Bank guide"
          >
            <span aria-hidden="true">?</span>
            {!isMobile && <span>Guide</span>}
          </button>

          <button
            type="button"
            onClick={onOpenAchievements}
            style={iconButtonStyle}
            title="Bank milestones"
            aria-label="Open Bank milestones"
          >
            <span aria-hidden="true">★</span>
            {!isMobile && <span>Milestones</span>}
          </button>

          {!isMobile && (
            <Link href="/profile" style={buttonStyle}>
              My Account
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
