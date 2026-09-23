"use client";

import type { BankScreenMode, BankTab } from "../lib/bank-types";

const TABS: Array<{ id: BankTab; label: string; shortLabel: string; icon: string }> = [
  { id: "wallet", label: "Wallet", shortLabel: "Wallet", icon: "✦" },
  { id: "savings", label: "Savings Goals", shortLabel: "Savings", icon: "◎" },
  { id: "bonds", label: "Bank Bonds", shortLabel: "Bonds", icon: "◆" },
  { id: "learn", label: "Money Lab", shortLabel: "Learn", icon: "▦" },
];

export default function BankNavigation({
  activeTab,
  onChange,
  screenMode,
}: {
  activeTab: BankTab;
  onChange: (tab: BankTab) => void;
  screenMode: BankScreenMode;
}) {
  const isMobile = screenMode === "mobile";

  return (
    <nav
      aria-label="Milo’s Bank sections"
      style={{
        marginTop: "14px",
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: isMobile ? "6px" : "10px",
        padding: isMobile ? "6px" : "8px",
        borderRadius: isMobile ? "18px" : "22px",
        border: "1px solid rgba(126,232,255,0.12)",
        background: "rgba(4,14,30,0.72)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
    >
      {TABS.map((tab) => {
        const active = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            aria-pressed={active}
            style={{
              minHeight: isMobile ? "54px" : "58px",
              padding: isMobile ? "7px 5px" : "0 14px",
              borderRadius: isMobile ? "13px" : "16px",
              border: active
                ? "1px solid rgba(142,232,255,0.54)"
                : "1px solid transparent",
              background: active
                ? "linear-gradient(135deg, rgba(83,215,255,0.16), rgba(92,80,210,0.13))"
                : "transparent",
              color: active ? "white" : "rgba(255,255,255,0.56)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: isMobile ? "10px" : "12px",
              fontWeight: 850,
              letterSpacing: isMobile ? "0.01em" : "0.04em",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: isMobile ? "4px" : "8px",
              flexDirection: isMobile ? "column" : "row",
              boxShadow: active ? "0 10px 28px rgba(83,215,255,0.08)" : "none",
              transition: "background 180ms ease, border-color 180ms ease, color 180ms ease",
            }}
          >
            <span aria-hidden="true" style={{ color: active ? "#8ee8ff" : "inherit" }}>
              {tab.icon}
            </span>
            <span>{isMobile ? tab.shortLabel : tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
