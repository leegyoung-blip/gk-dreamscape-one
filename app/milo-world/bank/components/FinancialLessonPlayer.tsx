"use client";

import type { BankScreenMode } from "../lib/bank-types";
import type { MiloFinanceLessonSummary } from "../lib/financial-learning-content-types";
import MiloFinanceBadge from "./MiloFinanceBadge";

export default function FinancialLessonCard({
  lesson,
  completed,
  loading,
  locked = false,
  screenMode,
  onOpen,
  onLocked,
}: {
  lesson: MiloFinanceLessonSummary;
  completed: boolean;
  loading: boolean;
  locked?: boolean;
  screenMode: BankScreenMode;
  onOpen: () => void;
  onLocked?: () => void;
}) {
  const isMobile = screenMode === "mobile";

  return (
    <button
      type="button"
      onClick={locked ? onLocked : onOpen}
      disabled={loading}
      style={{
        width: "100%",
        minHeight: isMobile ? "176px" : "194px",
        textAlign: "left",
        borderRadius: "19px",
        border: completed
          ? "1px solid rgba(113,236,176,0.20)"
          : locked
            ? "1px solid rgba(255,209,138,0.16)"
            : "1px solid rgba(126,232,255,0.12)",
        background: completed
          ? "linear-gradient(145deg, rgba(69,207,142,0.07), rgba(4,13,29,0.82))"
          : locked
            ? "linear-gradient(145deg, rgba(255,190,90,0.045), rgba(4,13,29,0.82))"
            : "linear-gradient(145deg, rgba(83,215,255,0.055), rgba(4,13,29,0.82))",
        padding: "16px",
        color: "white",
        cursor: loading ? "wait" : "pointer",
        fontFamily: "inherit",
        opacity: loading ? 0.72 : 1,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
        <span style={{ color: completed ? "#9af3c3" : locked ? "#ffd18a" : "#8ee8ff", fontSize: "8px", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Lesson {String(lesson.sortOrder).padStart(2, "0")}
        </span>
        {lesson.accessTier === "milo_finance" ? (
          <MiloFinanceBadge active={!locked} compact />
        ) : (
          <span style={{ color: completed ? "#9af3c3" : "rgba(255,255,255,0.38)", fontSize: "8px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {completed ? "Completed" : `${lesson.durationMinutes} min`}
          </span>
        )}
      </div>

      <strong style={{ display: "block", marginTop: "11px", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "22px" : "23px", lineHeight: 1.08, fontWeight: 500, letterSpacing: "-0.025em" }}>
        {lesson.title}
      </strong>

      <p style={{ margin: "9px 0 0", color: "rgba(255,255,255,0.46)", fontSize: "10px", lineHeight: 1.5 }}>
        {lesson.description}
      </p>

      <div style={{ marginTop: "11px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {lesson.concepts.slice(0, 3).map((concept) => (
          <span key={concept} style={{ borderRadius: "999px", border: "1px solid rgba(255,255,255,0.075)", background: "rgba(255,255,255,0.025)", padding: "5px 8px", color: "rgba(255,255,255,0.42)", fontSize: "8px", fontWeight: 750 }}>
            {concept}
          </span>
        ))}
      </div>

      <div style={{ marginTop: "auto", paddingTop: "13px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
        <span style={{ color: "#ffd18a", fontSize: "9px", fontWeight: 900 }}>+{lesson.rewardDt} DT first completion</span>
        <span style={{ color: locked ? "#ffd18a" : completed ? "#9af3c3" : "#8ee8ff", fontSize: "9px", fontWeight: 900 }}>
          {locked ? "Unlock →" : completed ? "Review →" : "Begin →"}
        </span>
      </div>
    </button>
  );
}
