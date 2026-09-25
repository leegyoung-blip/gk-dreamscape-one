"use client";

import type { BankScreenMode, BankSection } from "../lib/bank-types";

const SECTIONS: Array<{
  id: BankSection;
  label: string;
  shortLabel: string;
  kicker: string;
  icon: string;
}> = [
  { id: "learn", label: "Learn", shortLabel: "Learn", kicker: "Courses", icon: "▦" },
  { id: "practise", label: "Practise", shortLabel: "Practise", kicker: "Simulations", icon: "◇" },
  { id: "money", label: "My Money", shortLabel: "Money", kicker: "Wallet & tools", icon: "◆" },
  { id: "progress", label: "My Progress", shortLabel: "Progress", kicker: "Skills & milestones", icon: "◎" },
];

export default function BankNavigation({
  activeSection,
  onChange,
  screenMode,
}: {
  activeSection: BankSection | null;
  onChange: (section: BankSection) => void;
  screenMode: BankScreenMode;
}) {
  const isMobile = screenMode === "mobile";

  return (
    <nav
      aria-label="Milo’s Bank areas"
      style={{
        marginTop: "16px",
        display: "grid",
        gridTemplateColumns: isMobile
          ? "repeat(2, minmax(0, 1fr))"
          : "repeat(4, minmax(0, 1fr))",
        gap: isMobile ? "7px" : "10px",
        padding: isMobile ? "7px" : "8px",
        borderRadius: isMobile ? "18px" : "22px",
        border: "1px solid rgba(126,232,255,0.12)",
        background: "rgba(4,14,30,0.76)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow: "0 18px 50px rgba(0,0,0,0.18)",
      }}
    >
      {SECTIONS.map((section) => {
        const active = section.id === activeSection;

        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            aria-pressed={active}
            style={{
              minHeight: isMobile ? "54px" : "64px",
              padding: isMobile ? "7px 4px" : "9px 14px",
              borderRadius: isMobile ? "13px" : "16px",
              border: active
                ? "1px solid rgba(142,232,255,0.52)"
                : "1px solid transparent",
              background: active
                ? "linear-gradient(135deg, rgba(83,215,255,0.16), rgba(92,80,210,0.13))"
                : "transparent",
              color: active ? "white" : "rgba(255,255,255,0.58)",
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: isMobile ? "3px" : "9px",
              flexDirection: isMobile ? "column" : "row",
              boxShadow: active ? "0 10px 28px rgba(83,215,255,0.08)" : "none",
              transition: "background 180ms ease, border-color 180ms ease, color 180ms ease",
            }}
          >
            <span aria-hidden="true" style={{ color: active ? "#8ee8ff" : "inherit", fontSize: isMobile ? "13px" : "15px" }}>
              {section.icon}
            </span>
            <span style={{ textAlign: isMobile ? "center" : "left", minWidth: 0 }}>
              <strong style={{ display: "block", fontSize: isMobile ? "10px" : "12px", fontWeight: 900, letterSpacing: "0.035em" }}>
                {isMobile ? section.shortLabel : section.label}
              </strong>
              {!isMobile && (
                <small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.34)", fontSize: "8px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {section.kicker}
                </small>
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
