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

const COURSE_COVER_IMAGES: Record<string, string> = {
  "financial-foundations":
    "/milo-world/bank/learn/financial-foundations.png",
  "banking-growth":
    "/milo-world/bank/learn/banking-growth.png",
  "markets-investing":
    "/milo-world/bank/learn/markets-investing.png",
  "money-decisions":
    "/milo-world/bank/learn/money-decisions.png",
  "business-enterprise":
    "/milo-world/bank/learn/business-enterprise.png",
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
  const [selectedCourseId, setSelectedCourseId] = useState(
    "financial-foundations",
  );
  const [hoveredCourseId, setHoveredCourseId] = useState<string | null>(null);

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
            const hovered = hoveredCourseId === pathway.id;
            const coverImage = COURSE_COVER_IMAGES[pathway.id];

            const accessText = premium
              ? hasMiloFinanceAccess
                ? "Milo Finance · Included"
                : "Milo Finance · Paid"
              : isLoggedIn
                ? "Free"
                : "Free · Log in";

            const baseOverlay = selected
              ? "rgba(3,11,28,0.66)"
              : locked
                ? "rgba(6,11,25,0.75)"
                : hovered
                  ? "rgba(3,11,28,0.62)"
                  : "rgba(3,11,28,0.70)";

            const edgeOverlay = selected
              ? "rgba(3,11,28,0.24)"
              : locked
                ? "rgba(3,11,28,0.45)"
                : hovered
                  ? "rgba(3,11,28,0.20)"
                  : "rgba(3,11,28,0.30)";

            return (
              <button
                type="button"
                key={pathway.id}
                onClick={() => available && selectCourse(pathway.id, premium)}
                onMouseEnter={() => setHoveredCourseId(pathway.id)}
                onMouseLeave={() =>
                  setHoveredCourseId((current) =>
                    current === pathway.id ? null : current,
                  )
                }
                disabled={!available || loadingLock}
                aria-pressed={selected}
                aria-label={`${pathway.order}. ${pathway.title}. ${
                  premium ? "Milo Finance paid course" : "Free course"
                }`}
                style={{
                  position: "relative",
                  isolation: "isolate",
                  minHeight: isMobile ? "132px" : compact ? "148px" : "166px",
                  overflow: "hidden",
                  borderRadius: "18px",
                  border: selected
                    ? `1px solid ${pathway.accent}96`
                    : locked
                      ? "1px solid rgba(255,209,138,0.24)"
                      : hovered
                        ? `1px solid ${pathway.accent}68`
                        : `1px solid ${pathway.accent}35`,
                  backgroundColor: "#04101f",
                  backgroundImage: coverImage
                    ? `linear-gradient(90deg, ${baseOverlay} 0%, rgba(3,11,28,0.62) 48%, ${edgeOverlay} 100%), linear-gradient(180deg, rgba(2,8,19,0.08) 0%, rgba(2,8,19,0.30) 100%), url("${coverImage}")`
                    : selected
                      ? `linear-gradient(145deg, ${pathway.accent}19, rgba(4,13,29,0.90))`
                      : locked
                        ? "linear-gradient(145deg, rgba(255,190,90,0.055), rgba(4,13,29,0.86))"
                        : `linear-gradient(145deg, ${pathway.accent}0d, rgba(4,13,29,0.82))`,
                  backgroundSize: hovered && available ? "108% auto" : "103% auto",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  padding: isMobile ? "14px 15px" : "15px",
                  display: "flex",
                  flexDirection: "column",
                  color: "white",
                  textAlign: "left",
                  cursor: !available
                    ? "default"
                    : loadingLock
                      ? "wait"
                      : "pointer",
                  fontFamily: "inherit",
                  opacity: available ? 1 : 0.55,
                  boxShadow: selected
                    ? `0 0 32px ${pathway.accent}18, inset 0 0 0 1px ${pathway.accent}12`
                    : hovered && available
                      ? "0 14px 30px rgba(0,0,0,0.24)"
                      : "none",
                  transform:
                    hovered && available && !loadingLock
                      ? "translateY(-2px)"
                      : "translateY(0)",
                  transition:
                    "transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, background-size 420ms ease, filter 180ms ease",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: -1,
                    pointerEvents: "none",
                    background: selected
                      ? `radial-gradient(circle at 82% 20%, ${pathway.accent}18, transparent 42%)`
                      : locked
                        ? "linear-gradient(180deg, rgba(255,190,90,0.02), rgba(0,0,0,0.12))"
                        : "linear-gradient(180deg, rgba(255,255,255,0.025), rgba(0,0,0,0.06))",
                  }}
                />

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
                      textShadow: "0 3px 18px rgba(0,0,0,0.58)",
                    }}
                  >
                    {pathway.order}
                  </span>

                  <span
                    style={{
                      minHeight: "24px",
                      borderRadius: "999px",
                      border: premium
                        ? "1px solid rgba(255,209,138,0.32)"
                        : "1px solid rgba(159,255,210,0.32)",
                      background: premium
                        ? "rgba(22,18,18,0.72)"
                        : "rgba(8,28,25,0.72)",
                      boxShadow: "0 5px 16px rgba(0,0,0,0.20)",
                      color: premium ? "#ffd18a" : "#a9ffd4",
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "0 8px",
                      whiteSpace: "nowrap",
                      fontSize: "7px",
                      fontWeight: 950,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                    }}
                  >
                    {locked ? "🔒 " : ""}
                    {accessText}
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
                    textShadow: "0 4px 18px rgba(0,0,0,0.82)",
                  }}
                >
                  {pathway.title}
                </strong>

                <p
                  style={{
                    margin: "7px 0 0",
                    maxWidth: "95%",
                    color: "rgba(255,255,255,0.72)",
                    fontSize: "10px",
                    lineHeight: 1.45,
                    textShadow: "0 3px 14px rgba(0,0,0,0.92)",
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
                    color: selected
                      ? pathway.accent
                      : "rgba(255,255,255,0.62)",
                    fontSize: "8px",
                    fontWeight: 850,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    textShadow: "0 3px 12px rgba(0,0,0,0.88)",
                  }}
                >
                  <span>{pathway.meta}</span>
                  <span>
                    {selected ? "Selected" : locked ? "Unlock →" : "Open →"}
                  </span>
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
