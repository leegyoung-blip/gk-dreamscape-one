"use client";

import type { BankScreenMode } from "../lib/bank-types";
import type { MiloFinanceAccessTier } from "../lib/milo-finance-access";
import MiloFinanceBadge from "./MiloFinanceBadge";

const ACTIVITIES: Array<{
  title: string;
  description: string;
  tag: string;
  accessTier: MiloFinanceAccessTier;
}> = [
  {
    title: "Budget Simulator",
    description:
      "Build a budget, make trade-offs and see what happens when the month does not go exactly to plan.",
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

export default function PractiseSection({
  screenMode,
  hasMiloFinanceAccess,
  accessLoading,
  onOpenUpgrade,
}: {
  screenMode: BankScreenMode;
  hasMiloFinanceAccess: boolean;
  accessLoading: boolean;
  onOpenUpgrade: () => void;
}) {
  const isMobile = screenMode === "mobile";

  return (
    <div style={{ marginTop: "18px" }}>
      <section
        style={{
          borderRadius: isMobile ? "22px" : "26px",
          border: "1px solid rgba(184,168,255,0.16)",
          background:
            "linear-gradient(145deg, rgba(14,19,49,0.86), rgba(5,10,27,0.92))",
          padding: isMobile ? "19px" : "22px 24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, color: "#b8a8ff", fontSize: "9px", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>
              Decision Studio
            </p>
            <h2 style={{ margin: "7px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "38px" : "48px", lineHeight: 0.98, fontWeight: 500, letterSpacing: "-0.035em" }}>
              Practise
            </h2>
          </div>
          {!accessLoading && hasMiloFinanceAccess && <MiloFinanceBadge active />}
        </div>
        <p style={{ margin: "11px 0 0", maxWidth: "780px", color: "rgba(255,255,255,0.52)", fontSize: "12px", lineHeight: 1.65 }}>
          Financial ideas become decisions here. Core practice remains free; deeper simulations and case work are part of Milo Finance.
        </p>
      </section>

      <section style={{ marginTop: "14px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : screenMode === "compact" ? "repeat(2, minmax(0,1fr))" : "repeat(3, minmax(0,1fr))", gap: "12px" }}>
        {ACTIVITIES.map((activity, index) => {
          const premium = activity.accessTier === "milo_finance";
          const locked = premium && !hasMiloFinanceAccess;
          return (
            <article
              key={activity.title}
              style={{
                minHeight: "196px",
                borderRadius: "21px",
                border: locked ? "1px solid rgba(255,209,138,0.13)" : "1px solid rgba(184,168,255,0.12)",
                background: locked
                  ? "linear-gradient(145deg, rgba(255,209,138,0.035), rgba(5,10,27,0.88))"
                  : "linear-gradient(145deg, rgba(11,21,43,0.78), rgba(5,10,27,0.88))",
                padding: "18px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
                <span style={{ color: "#b8a8ff", fontSize: "9px", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>{activity.tag}</span>
                {premium ? <MiloFinanceBadge active={hasMiloFinanceAccess} compact /> : <span style={{ color: "rgba(255,255,255,0.24)", fontSize: "10px", fontWeight: 900 }}>0{index + 1}</span>}
              </div>
              <h3 style={{ margin: "10px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "25px", lineHeight: 1.05, fontWeight: 500 }}>{activity.title}</h3>
              <p style={{ margin: "11px 0 0", color: "rgba(255,255,255,0.48)", fontSize: "11px", lineHeight: 1.58 }}>{activity.description}</p>
              <div style={{ marginTop: "auto", paddingTop: "15px" }}>
                {locked ? (
                  <button
                    type="button"
                    onClick={onOpenUpgrade}
                    disabled={accessLoading}
                    style={{ minHeight: "34px", padding: "0 11px", borderRadius: "10px", border: "1px solid rgba(255,209,138,0.22)", background: "rgba(255,190,90,0.055)", color: "#ffd18a", cursor: accessLoading ? "wait" : "pointer", fontFamily: "inherit", fontSize: "8px", fontWeight: 900, letterSpacing: "0.07em", textTransform: "uppercase" }}
                  >
                    {accessLoading ? "Checking access…" : "Milo Finance access →"}
                  </button>
                ) : (
                  <span style={{ minHeight: "29px", padding: "0 10px", borderRadius: "999px", border: "1px solid rgba(184,168,255,0.16)", background: "rgba(184,168,255,0.055)", color: "rgba(219,211,255,0.68)", display: "inline-flex", alignItems: "center", fontSize: "8px", fontWeight: 900, letterSpacing: "0.09em", textTransform: "uppercase" }}>
                    {premium ? "Included · Planned" : "Free · Planned"}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
