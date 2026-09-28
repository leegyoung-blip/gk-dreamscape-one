"use client";

import type { BankScreenMode } from "../lib/bank-types";
import type {
  BudgetAllocation,
  BudgetFinalWeekResult,
  BudgetResultsSummary,
} from "../lib/budget-simulator-types";

const ROWS: Array<{ key: keyof BudgetAllocation; label: string }> = [
  { key: "essentials", label: "Essentials" },
  { key: "savings", label: "Savings" },
  { key: "emergency", label: "Emergency" },
  { key: "investing", label: "Investing" },
  { key: "goals", label: "Goals" },
  { key: "lifestyle", label: "Lifestyle" },
  { key: "unallocated", label: "Available" },
];

export default function BudgetReviewStage({
  firstPlan,
  result,
  summary,
  screenMode,
}: {
  firstPlan: BudgetAllocation;
  result: BudgetFinalWeekResult;
  summary: BudgetResultsSummary;
  screenMode: BankScreenMode;
}) {
  const isMobile = screenMode === "mobile";
  const maxValue = Math.max(
    1,
    ...ROWS.flatMap((row) => [firstPlan[row.key], result.finalAllocation[row.key]]),
  );

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) auto",
          gap: "10px",
          alignItems: "end",
        }}
      >
        <div>
          <p style={eyebrowStyle}>Stage 7 · Review</p>
          <h3
            style={{
              margin: "4px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "25px" : "31px",
              fontWeight: 500,
            }}
          >
            Your month, without a score
          </h3>
          <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,.42)", fontSize: "8px", lineHeight: 1.55, maxWidth: "780px" }}>
            The useful question is not whether one number was high. It is how your plan changed, what you protected, and what trade-offs you accepted when the month stopped behaving exactly as expected.
          </p>
        </div>
        <span style={{ height: "fit-content", borderRadius: "999px", border: "1px solid rgba(128,239,184,.17)", background: "rgba(128,239,184,.06)", padding: "7px 9px", color: "#aef7d2", fontSize: "7px", fontWeight: 900 }}>
          Month completed
        </span>
      </div>

      <section style={{ marginTop: "11px", display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: "7px" }}>
        <Metric label="Ending liquid" value={`${result.endingAvailable.toLocaleString()} DT`} accent="#8ee8ff" detail="Accessible after known payments" />
        <Metric label="Protected" value={`${result.endingProtected.toLocaleString()} DT`} accent="#c8bcff" detail="Savings, reserve, investing and goals" />
        <Metric label="Final-week payments" value={`${result.finalCommitmentsPaid.toLocaleString()} DT`} accent="#ffd18a" detail="Known commitments settled" />
        <Metric label="Missed commitments" value={`${result.commitmentsMissed}`} accent={result.commitmentsMissed === 0 ? "#80efb8" : "#ffaaaa"} detail="No automatic score attached" />
      </section>

      <section style={{ ...panelStyle, marginTop: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
          <div>
            <p style={eyebrowStyle}>Day 1 plan → Day 30 position</p>
            <h4 style={{ margin: "4px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "22px", fontWeight: 500 }}>
              Where the DT actually ended up
            </h4>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "7px", color: "rgba(255,255,255,.38)" }}>
            <span><i style={{ ...legendDot, background: "rgba(126,232,255,.42)" }} />Day 1</span>
            <span><i style={{ ...legendDot, background: "rgba(184,168,255,.72)" }} />Day 30</span>
          </div>
        </div>

        <div style={{ marginTop: "11px", display: "grid", gap: "8px" }}>
          {ROWS.map((row) => {
            const before = firstPlan[row.key];
            const after = result.finalAllocation[row.key];
            const delta = after - before;
            return (
              <div key={row.key} style={{ display: "grid", gridTemplateColumns: isMobile ? "86px minmax(0,1fr)" : "110px minmax(0,1fr) 84px", gap: "8px", alignItems: "center" }}>
                <span style={{ color: "rgba(255,255,255,.5)", fontSize: "7px", fontWeight: 850 }}>{row.label}</span>
                <div style={{ display: "grid", gap: "3px" }}>
                  <Bar width={(before / maxValue) * 100} tone="first" />
                  <Bar width={(after / maxValue) * 100} tone="final" />
                </div>
                {!isMobile && (
                  <span style={{ textAlign: "right", color: delta > 0 ? "#80efb8" : delta < 0 ? "#ffd18a" : "rgba(255,255,255,.28)", fontSize: "7px", fontWeight: 900 }}>
                    {delta > 0 ? "+" : ""}{delta.toLocaleString()} DT
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ ...panelStyle, marginTop: "10px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "150px minmax(0,1fr)", gap: "12px", alignItems: "center" }}>
        <div style={{ display: "grid", placeItems: "center" }}>
          <img
            src="/milo-world/milo-character.png"
            alt="Milo"
            style={{ width: isMobile ? "92px" : "118px", height: isMobile ? "110px" : "140px", objectFit: "contain", objectPosition: "center bottom" }}
          />
          <span style={{ marginTop: "-4px", color: "#ffd18a", fontSize: "7px", fontWeight: 950, textTransform: "uppercase" }}>Milo's view</span>
        </div>
        <div style={{ display: "grid", gap: "7px" }}>
          {summary.miloInsights.map((insight, index) => (
            <div key={`${index}-${insight.slice(0, 18)}`} style={{ borderRadius: "13px", border: "1px solid rgba(255,209,138,.09)", background: "rgba(255,209,138,.035)", padding: "9px 10px", color: "rgba(255,255,255,.58)", fontSize: "8px", lineHeight: 1.55 }}>
              {insight}
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...panelStyle, marginTop: "10px" }}>
        <p style={eyebrowStyle}>Financial skill evidence</p>
        <h4 style={{ margin: "4px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "21px", fontWeight: 500 }}>
          What this run showed
        </h4>
        <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,.34)", fontSize: "7px", lineHeight: 1.5 }}>
          These are evidence levels from this simulation, not permanent grades or mastery percentages.
        </p>
        <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: "7px" }}>
          {summary.skills.map((item) => (
            <div key={item.skillKey} style={{ borderRadius: "14px", border: "1px solid rgba(126,232,255,.08)", background: "rgba(126,232,255,.025)", padding: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "center" }}>
                <strong style={{ fontSize: "9px" }}>{item.title}</strong>
                <span style={{ borderRadius: "999px", border: "1px solid rgba(126,232,255,.13)", background: "rgba(126,232,255,.05)", padding: "5px 7px", color: "#9defff", fontSize: "6px", fontWeight: 950, textTransform: "uppercase" }}>
                  {item.level}
                </span>
              </div>
              <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,.39)", fontSize: "7px", lineHeight: 1.5 }}>{item.reason}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...panelStyle, marginTop: "10px" }}>
        <p style={eyebrowStyle}>Decision patterns</p>
        <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
          {summary.patterns.map((pattern) => (
            <div key={pattern.key} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "150px minmax(0,1fr)", gap: "7px", borderRadius: "12px", background: "rgba(255,255,255,.018)", padding: "8px 9px" }}>
              <strong style={{ color: "rgba(255,255,255,.72)", fontSize: "8px" }}>{pattern.label}</strong>
              <span style={{ color: "rgba(255,255,255,.37)", fontSize: "7px", lineHeight: 1.5 }}>{pattern.observation}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: "10px", borderRadius: "15px", border: "1px solid rgba(184,168,255,.11)", background: "rgba(184,168,255,.035)", padding: "10px" }}>
        <p style={{ margin: 0, color: "rgba(255,255,255,.43)", fontSize: "7px", lineHeight: 1.55 }}>
          <strong style={{ color: "#d6ceff" }}>Next in 4A-6:</strong> replay one major decision using the same scenario seed, compare the alternative path, add completion rewards and finish/replay controls.
        </p>
      </section>
    </div>
  );
}

function Bar({ width, tone }: { width: number; tone: "first" | "final" }) {
  return (
    <div style={{ height: "8px", borderRadius: "999px", background: "rgba(255,255,255,.035)", overflow: "hidden" }}>
      <div
        style={{
          width: `${Math.max(0, Math.min(100, width))}%`,
          height: "100%",
          borderRadius: "inherit",
          background: tone === "first" ? "rgba(126,232,255,.42)" : "linear-gradient(90deg,#9f8cff,#c6baff)",
        }}
      />
    </div>
  );
}

function Metric({ label, value, accent, detail }: { label: string; value: string; accent: string; detail: string }) {
  return (
    <div style={{ borderRadius: "14px", border: "1px solid rgba(255,255,255,.065)", background: "rgba(255,255,255,.018)", padding: "10px" }}>
      <span style={{ display: "block", color: "rgba(255,255,255,.28)", fontSize: "6px", fontWeight: 900, textTransform: "uppercase" }}>{label}</span>
      <strong style={{ display: "block", marginTop: "3px", color: accent, fontSize: "16px" }}>{value}</strong>
      <span style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,.29)", fontSize: "6px", lineHeight: 1.4 }}>{detail}</span>
    </div>
  );
}

const legendDot = {
  display: "inline-block",
  width: "7px",
  height: "7px",
  borderRadius: "50%",
  marginRight: "4px",
};

const panelStyle = {
  borderRadius: "18px",
  border: "1px solid rgba(255,255,255,.07)",
  background: "rgba(255,255,255,.018)",
  padding: "12px",
};

const eyebrowStyle = {
  margin: 0,
  color: "#8ee8ff",
  fontSize: "7px",
  fontWeight: 950,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
};
