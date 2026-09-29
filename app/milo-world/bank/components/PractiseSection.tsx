"use client";

import type { BankScreenMode } from "../lib/bank-types";
import type { MiloFinanceAccessTier } from "../lib/milo-finance-access";
import { useState } from "react";
import BudgetSimulator from "./BudgetSimulator";
import DesktopLearningNotice from "./DesktopLearningNotice";

const ACTIVITIES: Array<{
  title: string;
  description: string;
  tag: string;
  accessTier: MiloFinanceAccessTier;
}> = [
  {
    title: "Money Under Pressure",
    description:
      "Plan your month, handle surprises and adapt your strategy without losing control.",
    tag: "Budgeting",
    accessTier: "free",
  },
  {
    title: "30-Day Money Challenge",
    description:
      "Manage income, goals, opportunities and unexpected costs across a simulated month.",
    tag: "Decision-making",
    accessTier: "milo_finance",
  },
  {
    title: "Interest Explorer",
    description:
      "Change amount, time and return to see how money can grow under different conditions.",
    tag: "Growth",
    accessTier: "free",
  },
  {
    title: "Risk Lab",
    description:
      "Allocate simulated capital across cash, Bonds, stocks and property, then examine the outcome.",
    tag: "Risk & return",
    accessTier: "milo_finance",
  },
  {
    title: "Financial Cases",
    description:
      "Work through realistic choices where there may be more than one reasonable answer.",
    tag: "Reasoning",
    accessTier: "milo_finance",
  },
];

function PracticeAccessLabel({ premium }: { premium: boolean }) {
  return (
    <span
      style={{
        minHeight: "24px",
        padding: "0 8px",
        borderRadius: "999px",
        border: premium
          ? "1px solid rgba(255,209,138,0.28)"
          : "1px solid rgba(159,255,210,0.26)",
        background: premium
          ? "rgba(255,190,90,0.075)"
          : "rgba(96,255,182,0.07)",
        color: premium ? "#ffd18a" : "#a9ffd4",
        display: "inline-flex",
        alignItems: "center",
        whiteSpace: "nowrap",
        fontSize: "7px",
        fontWeight: 950,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {premium ? "Paid · Milo Finance" : "Free for all"}
    </span>
  );
}

export default function PractiseSection({
  screenMode,
  hasMiloFinanceAccess,
  accessLoading,
  onOpenUpgrade,
  isLoggedIn,
}: {
  screenMode: BankScreenMode;
  hasMiloFinanceAccess: boolean;
  accessLoading: boolean;
  onOpenUpgrade: () => void;
  isLoggedIn: boolean;
}) {
  const isMobile = screenMode === "mobile";
  const [activeSimulation, setActiveSimulation] = useState<"budget" | null>(null);

  if (isMobile) {
    return <DesktopLearningNotice kind="simulation" />;
  }

  if (activeSimulation === "budget") {
    return (
      <BudgetSimulator
        screenMode={screenMode}
        isLoggedIn={isLoggedIn}
        onExit={() => setActiveSimulation(null)}
      />
    );
  }

  return (
    <section
      aria-label="Practice simulations"
      style={{
        marginTop: isMobile ? "9px" : "12px",
        display: "grid",
        gridTemplateColumns: isMobile
          ? "1fr"
          : screenMode === "compact"
            ? "repeat(2, minmax(0,1fr))"
            : "repeat(3, minmax(0,1fr))",
        gap: "12px",
      }}
    >
      {ACTIVITIES.map((activity, index) => {
        const premium = activity.accessTier === "milo_finance";
        const locked = premium && !hasMiloFinanceAccess;

        return (
          <article
            key={activity.title}
            style={{
              minHeight: "196px",
              borderRadius: "21px",
              border: locked
                ? "1px solid rgba(255,209,138,0.13)"
                : "1px solid rgba(184,168,255,0.12)",
              background: locked
                ? "linear-gradient(145deg, rgba(255,209,138,0.035), rgba(5,10,27,0.88))"
                : "linear-gradient(145deg, rgba(11,21,43,0.78), rgba(5,10,27,0.88))",
              padding: "18px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                alignItems: "flex-start",
              }}
            >
              <span
                style={{
                  color: "#b8a8ff",
                  fontSize: "9px",
                  fontWeight: 900,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                {activity.tag}
              </span>

              <div
                style={{
                  display: "flex",
                  gap: "7px",
                  alignItems: "center",
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <PracticeAccessLabel premium={premium} />
                <span
                  style={{
                    color: "rgba(255,255,255,0.24)",
                    fontSize: "9px",
                    fontWeight: 900,
                  }}
                >
                  0{index + 1}
                </span>
              </div>
            </div>

            <h3
              style={{
                margin: "10px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: "25px",
                lineHeight: 1.05,
                fontWeight: 500,
              }}
            >
              {activity.title}
            </h3>

            <p
              style={{
                margin: "11px 0 0",
                color: "rgba(255,255,255,0.48)",
                fontSize: "11px",
                lineHeight: 1.58,
              }}
            >
              {activity.description}
            </p>

            <div style={{ marginTop: "auto", paddingTop: "15px" }}>
              {index === 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!isLoggedIn) {
                      if (typeof window !== "undefined") window.location.href = "/login";
                      return;
                    }
                    setActiveSimulation("budget");
                  }}
                  style={{
                    minHeight: "34px",
                    padding: "0 11px",
                    borderRadius: "10px",
                    border: "1px solid rgba(126,232,255,0.24)",
                    background: "rgba(83,215,255,0.08)",
                    color: "#a9f1ff",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: "8px",
                    fontWeight: 900,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                  }}
                >
                  {isLoggedIn ? "Start challenge →" : "Sign in to start →"}
                </button>
              ) : locked ? (
                <button
                  type="button"
                  onClick={onOpenUpgrade}
                  disabled={accessLoading}
                  style={{
                    minHeight: "34px",
                    padding: "0 11px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,209,138,0.22)",
                    background: "rgba(255,190,90,0.055)",
                    color: "#ffd18a",
                    cursor: accessLoading ? "wait" : "pointer",
                    fontFamily: "inherit",
                    fontSize: "8px",
                    fontWeight: 900,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                  }}
                >
                  {accessLoading ? "Checking access…" : "Unlock Milo Finance →"}
                </button>
              ) : (
                <span
                  style={{
                    minHeight: "29px",
                    padding: "0 10px",
                    borderRadius: "999px",
                    border: "1px solid rgba(184,168,255,0.16)",
                    background: "rgba(184,168,255,0.055)",
                    color: "rgba(219,211,255,0.68)",
                    display: "inline-flex",
                    alignItems: "center",
                    fontSize: "8px",
                    fontWeight: 900,
                    letterSpacing: "0.09em",
                    textTransform: "uppercase",
                  }}
                >
                  {premium
                    ? "Included with Milo Finance · Planned"
                    : "Free for all · Planned"}
                </span>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
