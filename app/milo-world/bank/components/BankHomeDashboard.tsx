"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { BankSection, BankScreenMode } from "../lib/bank-types";

type AccountSnapshot = {
  available: number;
  savings: number;
  bonds: number;
};

type Props = {
  account: AccountSnapshot;
  loading: boolean;
  screenMode: BankScreenMode;
  unlockedCount: number;
  totalMilestones: number;
  milestoneProgress: number;
  foundationCompleted: number;
  foundationTotal: number;
  onOpenSection: (section: BankSection) => void;
};

type DashboardCard = {
  section: BankSection;
  eyebrow: string;
  title: string;
  description: string;
  footer: string;
  icon: string;
  accent: string;
  border: string;
  glow: string;
};

const DASHBOARD_CARDS: DashboardCard[] = [
  {
    section: "learn",
    eyebrow: "Financial Learning",
    title: "Learn",
    description: "Courses in money, banking, markets, decisions and enterprise.",
    footer: "Foundations · 5 courses",
    icon: "▦",
    accent: "#8ee8ff",
    border: "rgba(126,232,255,0.22)",
    glow: "rgba(83,215,255,0.13)",
  },
  {
    section: "practise",
    eyebrow: "Decision Studio",
    title: "Practise",
    description: "Apply ideas through simulations, cases and financial decisions.",
    footer: "Simulations & cases",
    icon: "◇",
    accent: "#b9a7ff",
    border: "rgba(185,167,255,0.22)",
    glow: "rgba(150,123,255,0.12)",
  },
  {
    section: "money",
    eyebrow: "Personal Finance",
    title: "My Money",
    description: "Your DT wallet, savings goals, Bank Bonds and statements.",
    footer: "Wallet · savings · bonds",
    icon: "◆",
    accent: "#9fffd2",
    border: "rgba(159,255,210,0.22)",
    glow: "rgba(99,255,190,0.11)",
  },
  {
    section: "progress",
    eyebrow: "Financial Development",
    title: "My Progress",
    description: "See course progress, skill evidence, history and milestones.",
    footer: "Skills & milestones",
    icon: "◎",
    accent: "#ffd18a",
    border: "rgba(255,209,138,0.22)",
    glow: "rgba(255,185,92,0.11)",
  },
];

function money(value: number) {
  return `${Math.max(0, Math.round(Number(value || 0))).toLocaleString("en-SG")} DT`;
}

function safeRatio(completed: number, total: number) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
}

function DashboardCardButton({
  card,
  onClick,
  compact,
}: {
  card: DashboardCard;
  onClick: () => void;
  compact: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        minWidth: 0,
        minHeight: compact ? "150px" : 0,
        height: "100%",
        overflow: "hidden",
        borderRadius: compact ? "18px" : "22px",
        border: `1px solid ${hovered ? card.accent : card.border}`,
        background: hovered
          ? `radial-gradient(circle at 94% 7%, ${card.glow}, transparent 30%), linear-gradient(145deg, rgba(8,25,46,0.94), rgba(4,12,30,0.94))`
          : `radial-gradient(circle at 94% 7%, ${card.glow}, transparent 30%), linear-gradient(145deg, rgba(6,21,40,0.86), rgba(3,11,28,0.9))`,
        boxShadow: hovered
          ? `0 18px 44px rgba(0,0,0,0.34), 0 0 28px ${card.glow}`
          : "0 14px 34px rgba(0,0,0,0.22)",
        color: "white",
        padding: compact ? "18px" : "clamp(18px, 2.1vh, 26px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "space-between",
        gap: "12px",
        textAlign: "left",
        cursor: "pointer",
        fontFamily: "inherit",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition:
          "transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease, background 160ms ease",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(115deg, rgba(255,255,255,0.025), transparent 44%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: card.accent,
              fontSize: compact ? "9px" : "10px",
              fontWeight: 900,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
            }}
          >
            {card.eyebrow}
          </div>

          <h2
            style={{
              margin: compact ? "5px 0 0" : "7px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: compact ? "24px" : "clamp(25px, 2.1vw, 34px)",
              fontWeight: 400,
              lineHeight: 1,
              color: "white",
            }}
          >
            {card.title}
          </h2>
        </div>

        <span
          aria-hidden="true"
          style={{
            flex: "0 0 auto",
            width: compact ? "34px" : "38px",
            height: compact ? "34px" : "38px",
            borderRadius: "12px",
            border: `1px solid ${card.border}`,
            background: card.glow,
            color: card.accent,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: compact ? "14px" : "16px",
            fontWeight: 900,
          }}
        >
          {card.icon}
        </span>
      </div>

      <p
        style={{
          position: "relative",
          zIndex: 1,
          margin: 0,
          maxWidth: "680px",
          color: "rgba(255,255,255,0.58)",
          fontSize: compact ? "11px" : "clamp(11px, 0.88vw, 13px)",
          lineHeight: 1.45,
        }}
      >
        {card.description}
      </p>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginTop: "auto",
        }}
      >
        <span
          style={{
            color: "rgba(255,255,255,0.38)",
            fontSize: compact ? "8px" : "9px",
            fontWeight: 850,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {card.footer}
        </span>

        <span
          aria-hidden="true"
          style={{
            color: card.accent,
            fontSize: "16px",
            lineHeight: 1,
            transform: hovered ? "translateX(3px)" : "translateX(0)",
            transition: "transform 160ms ease",
          }}
        >
          →
        </span>
      </div>
    </button>
  );
}

export default function BankHomeDashboard({
  account,
  loading,
  screenMode,
  unlockedCount,
  totalMilestones,
  milestoneProgress,
  foundationCompleted,
  foundationTotal,
  onOpenSection,
}: Props) {
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";

  const totalMoney =
    Number(account.available || 0) +
    Number(account.savings || 0) +
    Number(account.bonds || 0);

  const journeyPercent = Math.max(
    0,
    Math.min(100, Math.round(Number(milestoneProgress || 0))),
  );

  const shellStyle: CSSProperties = {
    width: "100%",
    height: isDesktop ? "100%" : undefined,
    minHeight: isDesktop ? 0 : undefined,
    display: "grid",
    gridTemplateRows: isDesktop
      ? "minmax(142px, 0.78fr) minmax(0, 1.65fr)"
      : undefined,
    gap: isDesktop ? "10px" : isMobile ? "10px" : "12px",
  };

  return (
    <div style={shellStyle}>
      <section
        style={{
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: isDesktop
            ? "minmax(0, 1.2fr) minmax(430px, 0.9fr)"
            : "1fr",
          gap: isDesktop ? "10px" : "12px",
        }}
      >
        <div
          style={{
            minWidth: 0,
            borderRadius: isMobile ? "18px" : "22px",
            border: "1px solid rgba(126,232,255,0.14)",
            background:
              "radial-gradient(circle at 8% 18%, rgba(83,215,255,0.09), transparent 30%), linear-gradient(145deg, rgba(7,28,50,0.82), rgba(5,15,34,0.74))",
            boxShadow: "0 16px 42px rgba(0,0,0,0.2)",
            padding: isMobile ? "18px" : "clamp(18px, 2.2vh, 26px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              color: "#8ee8ff",
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            At a glance
          </span>

          <h1
            style={{
              margin: "8px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "26px" : "clamp(27px, 2.25vw, 39px)",
              fontWeight: 400,
              lineHeight: 1.04,
              color: "white",
            }}
          >
            Your money, learning and progress in one place.
          </h1>

          <div
            style={{
              marginTop: isDesktop ? "12px" : "15px",
              display: "flex",
              flexWrap: "wrap",
              gap: "7px",
            }}
          >
            {[
              `Foundations ${foundationCompleted}/${foundationTotal} complete`,
              `Milestones ${unlockedCount}/${totalMilestones} unlocked`,
              `Journey ${journeyPercent}%`,
            ].map((label) => (
              <span
                key={label}
                style={{
                  padding: "5px 8px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.045)",
                  color: "rgba(255,255,255,0.54)",
                  fontSize: "8px",
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div
          style={{
            minWidth: 0,
            borderRadius: isMobile ? "18px" : "22px",
            border: "1px solid rgba(255,209,138,0.18)",
            background:
              "linear-gradient(145deg, rgba(4,12,29,0.92), rgba(6,9,25,0.9))",
            boxShadow: "0 16px 42px rgba(0,0,0,0.24)",
            padding: isMobile ? "18px" : "clamp(18px, 2.1vh, 24px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.38)",
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Financial snapshot
          </span>

          <strong
            style={{
              marginTop: "7px",
              color: "#ffd18a",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "28px" : "clamp(30px, 2.65vw, 43px)",
              lineHeight: 1,
              fontWeight: 700,
            }}
          >
            {loading ? "—" : money(totalMoney)}
          </strong>

          <div
            style={{
              marginTop: isDesktop ? "13px" : "16px",
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(3, minmax(0, 1fr))",
              gap: "8px",
            }}
          >
            {[
              ["Available", loading ? "—" : money(account.available)],
              ["Savings", loading ? "—" : money(account.savings)],
              ["Bonds", loading ? "—" : money(account.bonds)],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  minWidth: 0,
                  borderRadius: "13px",
                  border: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.035)",
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    color: "rgba(255,255,255,0.35)",
                    fontSize: "8px",
                    fontWeight: 850,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    marginTop: "5px",
                    color: "#ffd18a",
                    fontSize: "11px",
                    fontWeight: 900,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        aria-label="Milo Bank sections"
        style={{
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : "repeat(2, minmax(0, 1fr))",
          gridTemplateRows: isDesktop ? "repeat(2, minmax(0, 1fr))" : undefined,
          gap: isDesktop ? "10px" : "12px",
        }}
      >
        {DASHBOARD_CARDS.map((card) => (
          <DashboardCardButton
            key={card.section}
            card={card}
            compact={!isDesktop}
            onClick={() => onOpenSection(card.section)}
          />
        ))}
      </section>
    </div>
  );
}
