"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import type { BankScreenMode } from "../lib/bank-types";

export default function BankHeader({
  screenMode,
  available,
  loading,
}: {
  screenMode: BankScreenMode;
  available: number;
  loading: boolean;
}) {
  const isMobile = screenMode === "mobile";

  const buttonStyle: CSSProperties = {
    minHeight: isMobile ? "40px" : "44px",
    padding: isMobile ? "0 13px" : "0 18px",
    borderRadius: "999px",
    border: "1px solid rgba(126,232,255,0.24)",
    background: "rgba(3,12,29,0.74)",
    color: "white",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    fontSize: isMobile ? "11px" : "12px",
    fontWeight: 850,
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow: "0 14px 34px rgba(0,0,0,0.28)",
    whiteSpace: "nowrap",
  };

  return (
    <header
      style={{
        position: "relative",
        zIndex: 20,
        width: "100%",
        maxWidth: "1440px",
        margin: "0 auto",
        padding: isMobile ? "12px 14px" : "18px 28px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <Link href="/milo-world" style={buttonStyle}>
        <span>←</span>
        {isMobile ? "Milo’s World" : "Back to Milo’s World"}
      </Link>

      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <div
          style={{
            ...buttonStyle,
            border: "1px solid rgba(83,215,255,0.34)",
            color: "#bdf6ff",
          }}
        >
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
          <strong>{loading ? "..." : Math.round(available).toLocaleString("en-SG")}</strong>
        </div>

        {!isMobile && (
          <Link href="/profile" style={buttonStyle}>
            My Account
          </Link>
        )}
      </div>
    </header>
  );
}
