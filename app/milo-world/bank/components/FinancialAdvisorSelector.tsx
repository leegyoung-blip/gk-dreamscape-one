"use client";

import { FINANCIAL_ADVISORS } from "../lib/financial-advisors";
import type { FinancialAdvisorId } from "../lib/financial-learning-engine-types";
import FinancialAdvisorAvatar from "./FinancialAdvisorAvatar";

export default function FinancialAdvisorSelector({
  value,
  onChange,
  saving = false,
  compact = false,
}: {
  value: FinancialAdvisorId;
  onChange: (advisor: FinancialAdvisorId) => void | Promise<void>;
  saving?: boolean;
  compact?: boolean;
}) {
  return (
    <section
      style={{
        borderRadius: compact ? "18px" : "22px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(145deg, rgba(7,22,41,0.82), rgba(5,10,25,0.88))",
        padding: compact ? "14px" : "17px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <div style={{ color: "#8ee8ff", fontSize: "9px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>Your lesson advisor</div>
          <div style={{ marginTop: "5px", color: "white", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: compact ? "22px" : "26px" }}>Choose who teaches you.</div>
        </div>
        <div style={{ color: "rgba(255,255,255,0.38)", fontSize: "10px" }}>{saving ? "Saving choice…" : "Change anytime"}</div>
      </div>

      <div style={{ marginTop: "13px", display: "grid", gridTemplateColumns: compact ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: "9px" }}>
        {(Object.keys(FINANCIAL_ADVISORS) as FinancialAdvisorId[]).map((advisorId) => {
          const advisor = FINANCIAL_ADVISORS[advisorId];
          const selected = value === advisorId;
          return (
            <button
              key={advisorId}
              type="button"
              aria-pressed={selected}
              disabled={saving}
              onClick={() => onChange(advisorId)}
              style={{
                minHeight: compact ? "76px" : "88px",
                borderRadius: "16px",
                border: selected ? `1px solid ${advisor.accent}66` : "1px solid rgba(255,255,255,0.07)",
                background: selected ? `linear-gradient(145deg, ${advisor.glow}, rgba(4,13,29,0.78))` : "rgba(255,255,255,0.025)",
                color: "white",
                cursor: saving ? "wait" : "pointer",
                padding: "11px",
                display: "flex",
                alignItems: "center",
                gap: "11px",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              <FinancialAdvisorAvatar advisorId={advisorId} size={compact ? 46 : 54} />
              <span style={{ minWidth: 0 }}>
                <strong style={{ display: "block", color: selected ? advisor.accent : "white", fontSize: "14px" }}>{advisor.name}</strong>
                <span style={{ display: "block", marginTop: "2px", color: "rgba(255,255,255,0.42)", fontSize: "9px", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>{advisor.role}</span>
                {!compact && <span style={{ display: "block", marginTop: "5px", color: "rgba(255,255,255,0.48)", fontSize: "10px", lineHeight: 1.4 }}>{advisor.description}</span>}
              </span>
              <span style={{ marginLeft: "auto", color: advisor.accent, fontSize: "16px", opacity: selected ? 1 : 0.22 }}>{selected ? "✓" : "○"}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
