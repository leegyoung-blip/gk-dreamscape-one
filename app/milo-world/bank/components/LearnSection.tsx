"use client";

import { useState } from "react";
import { FINANCIAL_LEARNING_PATHWAYS } from "../lib/financial-learning";
import type { BankScreenMode } from "../lib/bank-types";
import FinancialCoursePanel from "./FinancialCoursePanel";
import DesktopLearningNotice from "./DesktopLearningNotice";

const COURSE_SUMMARIES: Record<string, string> = {
  "financial-foundations": "Saving, interest, bonds, priorities and risk.",
  "banking-growth": "Banking, liquidity, compounding and growth.",
  "markets-investing": "Investing, markets, diversification and risk.",
  "money-decisions": "Trade-offs, value, timing and financial choices.",
  "business-enterprise": "Revenue, costs, cash flow, pricing and growth.",
};

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

  if (isMobile) {
    return <DesktopLearningNotice kind="lesson" />;
  }

  function selectCourse(courseId: string, premium: boolean) {
    if (premium) {
      if (accessLoading) return;
      if (!hasMiloFinanceAccess) {
        onOpenUpgrade();
        return;
      }
    }
    setSelectedCourseId(courseId);
  }

  return (
    <div style={{ marginTop: isMobile ? "7px" : "9px" }}>
      <section aria-label="Milo Finance courses">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : compact
                ? "repeat(2, minmax(0,1fr))"
                : "repeat(5, minmax(0,1fr))",
            gap: "9px",
          }}
        >
          {FINANCIAL_LEARNING_PATHWAYS.map((pathway) => {
            const available = pathway.status === "available";
            const selected = selectedCourseId === pathway.id;
            const premium = pathway.accessTier === "milo_finance";
            const locked = premium && !accessLoading && !hasMiloFinanceAccess;
            const loadingLock = premium && accessLoading;

            const accessText = premium
              ? hasMiloFinanceAccess
                ? "Milo Finance · Included"
                : "Milo Finance · Paid"
              : isLoggedIn
                ? "Free"
                : "Free · Log in";

            return (
              <button
                type="button"
                key={pathway.id}
                onClick={() => available && selectCourse(pathway.id, premium)}
                disabled={!available || loadingLock}
                aria-pressed={selected}
                aria-label={`${pathway.order}. ${pathway.title}. ${premium ? "Milo Finance paid course" : "Free course"}`}
                style={{
                  minHeight: isMobile ? "132px" : compact ? "148px" : "166px",
                  borderRadius: "18px",
                  border: selected
                    ? `1px solid ${pathway.accent}78`
                    : locked
                      ? "1px solid rgba(255,209,138,0.20)"
                      : `1px solid ${pathway.accent}35`,
                  background: selected
                    ? `linear-gradient(145deg, ${pathway.accent}19, rgba(4,13,29,0.90))`
                    : locked
                      ? "linear-gradient(145deg, rgba(255,190,90,0.055), rgba(4,13,29,0.86))"
                      : `linear-gradient(145deg, ${pathway.accent}0d, rgba(4,13,29,0.82))`,
                  padding: isMobile ? "14px 15px" : "15px",
                  display: "flex",
                  flexDirection: "column",
                  color: "white",
                  textAlign: "left",
                  cursor: !available ? "default" : loadingLock ? "wait" : "pointer",
                  fontFamily: "inherit",
                  opacity: available ? 1 : 0.55,
                  boxShadow: selected ? `0 0 28px ${pathway.accent}10` : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      color: pathway.accent,
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontSize: isMobile ? "28px" : "32px",
                      lineHeight: 0.9,
                      fontWeight: 600,
                      letterSpacing: "-0.04em",
                    }}
                  >
                    {pathway.order}
                  </span>

                  <span
                    style={{
                      minHeight: "24px",
                      borderRadius: "999px",
                      border: premium
                        ? "1px solid rgba(255,209,138,0.26)"
                        : "1px solid rgba(159,255,210,0.26)",
                      background: premium
                        ? "rgba(255,190,90,0.075)"
                        : "rgba(96,255,182,0.07)",
                      color: premium ? "#ffd18a" : "#a9ffd4",
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "0 8px",
                      whiteSpace: "nowrap",
                      fontSize: "7px",
                      fontWeight: 950,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                    }}
                  >
                    {locked ? "🔒 " : ""}{accessText}
                  </span>
                </div>

                <strong
                  style={{
                    display: "block",
                    marginTop: "10px",
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: isMobile ? "21px" : "20px",
                    lineHeight: 1.06,
                    fontWeight: 500,
                  }}
                >
                  {pathway.title}
                </strong>

                <p
                  style={{
                    margin: "7px 0 0",
                    color: "rgba(255,255,255,0.46)",
                    fontSize: "10px",
                    lineHeight: 1.45,
                  }}
                >
                  {COURSE_SUMMARIES[pathway.id] ?? pathway.description}
                </p>

                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    color: selected ? pathway.accent : "rgba(255,255,255,0.34)",
                    fontSize: "8px",
                    fontWeight: 850,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  <span>{pathway.meta}</span>
                  <span>{selected ? "Selected" : locked ? "Unlock →" : "Open →"}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <FinancialCoursePanel
        courseId={selectedCourseId}
        screenMode={screenMode}
        isLoggedIn={isLoggedIn}
        hasMiloFinanceAccess={hasMiloFinanceAccess}
        onOpenUpgrade={onOpenUpgrade}
      />
    </div>
  );
}
