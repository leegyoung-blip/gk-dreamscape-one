"use client";

import type { BankScreenMode } from "../lib/bank-types";
import type { MoneyLabLesson } from "../lib/money-lab-types";

export default function MoneyLessonCard({
  lesson,
  completed,
  locked,
  screenMode,
  onOpen,
}: {
  lesson: MoneyLabLesson;
  completed: boolean;
  locked: boolean;
  screenMode: BankScreenMode;
  onOpen: () => void;
}) {
  const isMobile = screenMode === "mobile";

  return (
    <article
      style={{
        borderRadius: "22px",
        border: completed
          ? "1px solid rgba(113,236,176,0.28)"
          : "1px solid rgba(126,232,255,0.13)",
        background: completed
          ? "linear-gradient(145deg, rgba(17,60,54,0.68), rgba(5,14,29,0.94))"
          : "linear-gradient(145deg, rgba(9,31,54,0.78), rgba(5,11,27,0.94))",
        padding: isMobile ? "18px" : "20px",
        display: "flex",
        flexDirection: "column",
        minHeight: isMobile ? "250px" : "270px",
        boxShadow: "0 18px 50px rgba(0,0,0,0.14)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div
          aria-hidden="true"
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "15px",
            border: completed
              ? "1px solid rgba(113,236,176,0.30)"
              : "1px solid rgba(126,232,255,0.22)",
            background: completed ? "rgba(69,207,142,0.10)" : "rgba(83,215,255,0.08)",
            color: completed ? "#8ff2bd" : "#8ee8ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "22px",
            fontWeight: 900,
          }}
        >
          {completed ? "✓" : lesson.icon}
        </div>
        <span
          style={{
            borderRadius: "999px",
            padding: "6px 9px",
            border: "1px solid rgba(255,209,138,0.20)",
            background: "rgba(255,190,90,0.07)",
            color: "#ffd18a",
            fontSize: "10px",
            fontWeight: 900,
          }}
        >
          +{lesson.rewardDt} DT
        </span>
      </div>

      <p style={{ margin: "16px 0 0", color: "rgba(255,255,255,0.38)", fontSize: "10px", fontWeight: 900, letterSpacing: "0.13em", textTransform: "uppercase" }}>
        Lesson {lesson.order} · {lesson.duration}
      </p>
      <h3 style={{ margin: "7px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: isMobile ? "27px" : "29px", lineHeight: 1.05, fontWeight: 500, letterSpacing: "-0.025em" }}>
        {lesson.title}
      </h3>
      <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.54)", fontSize: "12px", lineHeight: 1.55 }}>
        {lesson.description}
      </p>

      <div style={{ marginTop: "13px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {lesson.concepts.map((concept) => (
          <span key={concept} style={{ borderRadius: "999px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.035)", padding: "5px 8px", color: "rgba(255,255,255,0.46)", fontSize: "9px", fontWeight: 800 }}>
            {concept}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={onOpen}
        disabled={locked}
        style={{
          marginTop: "auto",
          minHeight: "43px",
          borderRadius: "12px",
          border: completed
            ? "1px solid rgba(113,236,176,0.25)"
            : "1px solid rgba(126,232,255,0.30)",
          background: completed ? "rgba(69,207,142,0.09)" : "rgba(83,215,255,0.10)",
          color: completed ? "#a8f3ca" : "white",
          cursor: locked ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          fontSize: "10px",
          fontWeight: 900,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          opacity: locked ? 0.55 : 1,
        }}
      >
        {completed ? "Review Lesson" : "Start Lesson"}
      </button>
    </article>
  );
}
