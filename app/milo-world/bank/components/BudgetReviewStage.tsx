"use client";

import type { BankScreenMode } from "../lib/bank-types";
import type {
  BudgetAllocation,
  BudgetCompletionInfo,
  BudgetDifficulty,
  BudgetFinalWeekResult,
  BudgetFinancialProfile,
  BudgetLiveMonthState,
  BudgetResultsSummary,
  BudgetScenarioKey,
} from "../lib/budget-simulator-types";
import BudgetWhatIfPanel from "./BudgetWhatIfPanel";

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
  profile,
  liveMonth,
  scenarioSeed,
  scenarioKey,
  difficulty,
  screenMode,
  completed,
  completion,
  saving,
  onComplete,
  onReplaySameMonth,
  onReplayFreshMonth,
  onExit,
}: {
  firstPlan: BudgetAllocation;
  result: BudgetFinalWeekResult;
  summary: BudgetResultsSummary;
  profile: BudgetFinancialProfile;
  liveMonth: BudgetLiveMonthState;
  scenarioSeed: number;
  scenarioKey: BudgetScenarioKey;
  difficulty: BudgetDifficulty;
  screenMode: BankScreenMode;
  completed: boolean;
  completion?: BudgetCompletionInfo;
  saving: boolean;
  onComplete: () => Promise<boolean>;
  onReplaySameMonth: () => Promise<boolean>;
  onReplayFreshMonth: () => Promise<boolean>;
  onExit: () => void;
}) {
  const isMobile = screenMode === "mobile";
  const maxValue = Math.max(
    1,
    ...ROWS.flatMap((row) => [firstPlan[row.key], result.finalAllocation[row.key]]),
  );

  return (
    <div className="budget-review-root" style={{ width: "100%" }}>
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
        <span style={{ height: "fit-content", borderRadius: "999px", border: `1px solid ${completed ? "rgba(128,239,184,.24)" : "rgba(255,209,138,.18)"}`, background: completed ? "rgba(128,239,184,.07)" : "rgba(255,209,138,.055)", padding: "7px 9px", color: completed ? "#aef7d2" : "#ffd18a", fontSize: "7px", fontWeight: 900 }}>
          {completed ? "Simulation completed" : "Month complete · review open"}
        </span>
      </div>

      <section className="budget-review-enter" style={{ marginTop: "11px", display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: "7px" }}>
        <Metric label="Ending liquid" value={`${result.endingAvailable.toLocaleString()} DT`} accent="#8ee8ff" detail="Accessible after known payments" />
        <Metric label="Protected" value={`${result.endingProtected.toLocaleString()} DT`} accent="#c8bcff" detail="Savings, reserve, investing and goals" />
        <Metric label="Final-week payments" value={`${result.finalCommitmentsPaid.toLocaleString()} DT`} accent="#ffd18a" detail="Known commitments settled" />
        <Metric label="Missed commitments" value={`${result.commitmentsMissed}`} accent={result.commitmentsMissed === 0 ? "#80efb8" : "#ffaaaa"} detail="No automatic score attached" />
      </section>

      <section className="budget-review-enter" style={{ ...panelStyle, marginTop: "10px" }}>
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

      <section className="budget-review-enter" style={{ ...panelStyle, marginTop: "10px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "150px minmax(0,1fr)", gap: "12px", alignItems: "center" }}>
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

      <BudgetWhatIfPanel
        profile={profile}
        liveMonth={liveMonth}
        decisionAllocation={result.decisionAllocation}
        actualResult={result}
        scenarioSeed={scenarioSeed}
        scenarioKey={scenarioKey}
        difficulty={difficulty}
        screenMode={screenMode}
      />

      <section className="budget-review-enter" style={{ ...panelStyle, marginTop: "10px" }}>
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

      <section className="budget-review-enter" style={{ ...panelStyle, marginTop: "10px" }}>
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

      <CompletionPanel
        completed={completed}
        completion={completion}
        difficulty={difficulty}
        isMobile={isMobile}
        saving={saving}
        onComplete={onComplete}
        onReplaySameMonth={onReplaySameMonth}
        onReplayFreshMonth={onReplayFreshMonth}
        onExit={onExit}
      />

      <style jsx>{`
        .budget-review-enter {
          animation: budgetReviewEnter 320ms ease-out both;
        }
        @keyframes budgetReviewEnter {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .budget-review-enter { animation: none; }
        }
      `}</style>
    </div>
  );
}

function CompletionPanel({
  completed,
  completion,
  difficulty,
  isMobile,
  saving,
  onComplete,
  onReplaySameMonth,
  onReplayFreshMonth,
  onExit,
}: {
  completed: boolean;
  completion?: BudgetCompletionInfo;
  difficulty: BudgetDifficulty;
  isMobile: boolean;
  saving: boolean;
  onComplete: () => Promise<boolean>;
  onReplaySameMonth: () => Promise<boolean>;
  onReplayFreshMonth: () => Promise<boolean>;
  onExit: () => void;
}) {
  if (!completed) {
    return (
      <section style={{ marginTop: "10px", borderRadius: "18px", border: "1px solid rgba(128,239,184,.14)", background: "linear-gradient(135deg,rgba(20,72,61,.15),rgba(4,12,30,.62))", padding: isMobile ? "12px" : "14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) auto", gap: "10px", alignItems: "center" }}>
          <div>
            <p style={{ ...eyebrowStyle, color: "#aef7d2" }}>Finish this run</p>
            <h4 style={{ margin: "4px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "21px", fontWeight: 500 }}>Save the completed month to your Financial Profile</h4>
            <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,.38)", fontSize: "7px", lineHeight: 1.55, maxWidth: "760px" }}>
              Finishing closes this run and keeps its skill evidence. The first Budget Simulator completion earns 10 DT once. The first {difficulty === "standard" ? "Complex or Strategic" : difficulty === "complex" ? "Complex" : "Strategic"} completion can also earn a one-time 5 DT difficulty reward. Replays do not farm repeated rewards.
            </p>
          </div>
          <button type="button" disabled={saving} onClick={() => void onComplete()} style={{ ...primaryButtonStyle, opacity: saving ? 0.5 : 1 }}>
            {saving ? "Finishing…" : "Finish simulation"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="budget-review-enter" style={{ marginTop: "10px", borderRadius: "18px", border: "1px solid rgba(128,239,184,.20)", background: "radial-gradient(circle at 85% 10%,rgba(128,239,184,.10),transparent 30%),linear-gradient(135deg,rgba(20,72,61,.18),rgba(4,12,30,.74))", padding: isMobile ? "13px" : "15px" }}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) auto", gap: "12px", alignItems: "center" }}>
        <div>
          <p style={{ ...eyebrowStyle, color: "#aef7d2" }}>Run completed</p>
          <h4 style={{ margin: "4px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "22px", fontWeight: 500 }}>Your evidence is saved.</h4>
          <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,.4)", fontSize: "7px", lineHeight: 1.55 }}>
            {completion?.rewardDt
              ? `${completion.rewardDt.toLocaleString()} DT was added as a one-time completion reward for this qualifying milestone.`
              : "This replay added fresh decision evidence but no repeat DT reward."}
          </p>
          {completion?.rewardDt ? (
            <div style={{ marginTop: "7px", display: "inline-flex", alignItems: "center", gap: "6px", borderRadius: "999px", border: "1px solid rgba(255,209,138,.18)", background: "rgba(255,209,138,.06)", padding: "6px 9px", color: "#ffd18a", fontSize: "8px", fontWeight: 950 }}>
              +{completion.rewardDt.toLocaleString()} DT
              <span style={{ color: "rgba(255,255,255,.32)", fontSize: "6px", fontWeight: 700 }}>{completion.rewardLabel}</span>
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "6px", alignItems: "stretch" }}>
          <button type="button" disabled={saving} onClick={() => void onReplaySameMonth()} style={secondaryButtonStyle}>Replay same month</button>
          <button type="button" disabled={saving} onClick={() => void onReplayFreshMonth()} style={secondaryButtonStyle}>New version</button>
          <button type="button" onClick={onExit} style={primaryButtonStyle}>Back to Practice</button>
        </div>
      </div>
    </section>
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

const primaryButtonStyle = {
  minHeight: "38px",
  borderRadius: "11px",
  border: "1px solid rgba(126,232,255,.26)",
  background: "linear-gradient(135deg,rgba(52,190,216,.18),rgba(107,90,226,.18))",
  padding: "0 13px",
  color: "white",
  fontFamily: "inherit",
  fontSize: "7px",
  fontWeight: 950,
  letterSpacing: ".06em",
  textTransform: "uppercase" as const,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  minHeight: "38px",
  borderRadius: "11px",
  border: "1px solid rgba(255,255,255,.09)",
  background: "rgba(255,255,255,.025)",
  padding: "0 12px",
  color: "rgba(255,255,255,.58)",
  fontFamily: "inherit",
  fontSize: "7px",
  fontWeight: 900,
  cursor: "pointer",
};
