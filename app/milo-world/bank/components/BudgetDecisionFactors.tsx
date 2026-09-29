"use client";

import { FINAL_WEEK_FACTOR_OPTIONS } from "../lib/budget-simulator-results";
import type { BudgetDecisionFactorKey } from "../lib/budget-simulator-types";
import BudgetInfoButton from "./BudgetInfoButton";

export default function BudgetDecisionFactors({
  selected,
  onChange,
}: {
  selected: BudgetDecisionFactorKey[];
  onChange: (next: BudgetDecisionFactorKey[]) => void;
}) {
  function toggle(key: BudgetDecisionFactorKey) {
    if (selected.includes(key)) {
      onChange(selected.filter((item) => item !== key));
      return;
    }
    if (selected.length >= 2) return;
    onChange([...selected, key]);
  }

  return (
    <section
      style={{
        borderRadius: "17px",
        border: "1px solid rgba(184,168,255,.14)",
        background: "rgba(91,67,153,.055)",
        padding: "12px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <p style={eyebrowStyle}>Your reasoning</p>
            <BudgetInfoButton title="Choose two factors" accent="#c8bcff">There is no universal pair. Choose the two pieces of evidence you are actually relying on most for this decision.</BudgetInfoButton>
          </div>
          <strong style={{ display: "block", marginTop: "3px", fontSize: "19px" }}>
            What matters most?
          </strong>
        </div>
        <span
          style={{
            height: "fit-content",
            borderRadius: "999px",
            border: "1px solid rgba(184,168,255,.16)",
            background: "rgba(184,168,255,.07)",
            padding: "6px 8px",
            color: "#d4cbff",
            fontSize: "14px",
            fontWeight: 900,
          }}
        >
          {selected.length} / 2 selected
        </span>
      </div>

      <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "7px" }}>
        {FINAL_WEEK_FACTOR_OPTIONS.map((factor) => {
          const active = selected.includes(factor.key);
          const disabled = !active && selected.length >= 2;
          return (
            <button
              key={factor.key}
              type="button"
              onClick={() => toggle(factor.key)}
              disabled={disabled}
              aria-pressed={active}
              style={{
                minHeight: "86px",
                borderRadius: "14px",
                border: active
                  ? "1px solid rgba(184,168,255,.42)"
                  : "1px solid rgba(255,255,255,.07)",
                background: active
                  ? "rgba(184,168,255,.11)"
                  : "rgba(255,255,255,.018)",
                padding: "10px",
                color: "white",
                textAlign: "left",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.38 : 1,
                fontFamily: "inherit",
              }}
            >
              <strong style={{ display: "block", fontSize: "16px", color: active ? "#ded7ff" : "rgba(255,255,255,.76)" }}>
                {factor.label}
              </strong>
            </button>
          );
        })}
      </div>
    </section>
  );
}

const eyebrowStyle = {
  margin: 0,
  color: "#c8bcff",
  fontSize: "14px",
  fontWeight: 950,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
};
