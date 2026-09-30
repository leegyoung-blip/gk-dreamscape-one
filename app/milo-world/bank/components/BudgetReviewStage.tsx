"use client";

import { useState } from "react";
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
import { BUDGET_SIMULATOR_ASSETS } from "../lib/budget-simulator-assets";
import { calculateBudgetFinalScore } from "../lib/budget-simulator-score";
import BudgetWhatIfPanel from "./BudgetWhatIfPanel";
import BudgetInfoButton from "./BudgetInfoButton";

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
  const [reviewPage, setReviewPage] = useState<0 | 1 | 2>(0);
  const maxValue = Math.max(
    1,
    ...ROWS.flatMap((row) => [firstPlan[row.key], result.finalAllocation[row.key]]),
  );
  const finalScore = calculateBudgetFinalScore({ profile, result, summary });

  return (
    <div className="budget-review-root" style={{ width: "100%", height: "100%", minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "10px", alignItems: "end", flexShrink: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <p style={eyebrowStyle}>Stage 7 · Review</p>
            <BudgetInfoButton title="Review your month">Your score is out of 100. Use the three review pages to see the result, compare a different path and inspect the financial evidence from your decisions.</BudgetInfoButton>
          </div>
          <h3 style={{ margin: "3px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "29px", fontWeight: 500 }}>
            See what your decisions changed
          </h3>
        </div>
        <span style={{ height: "fit-content", borderRadius: "999px", border: `1px solid ${completed ? "rgba(128,239,184,.24)" : "rgba(255,209,138,.18)"}`, background: completed ? "rgba(128,239,184,.07)" : "rgba(255,209,138,.055)", padding: "7px 9px", color: completed ? "#aef7d2" : "#ffd18a", fontSize: "14px", fontWeight: 900 }}>
          {completed ? "Simulation completed" : "Month complete"}
        </span>
      </div>

      <div style={{ marginTop: "8px", display: "flex", gap: "6px", flexShrink: 0 }}>
        {[
          { id: 0 as const, label: "Score & outcome" },
          { id: 1 as const, label: "What if?" },
          { id: 2 as const, label: "Evidence & finish" },
        ].map((page) => (
          <button
            key={page.id}
            type="button"
            onClick={() => setReviewPage(page.id)}
            aria-pressed={reviewPage === page.id}
            style={{
              minHeight: "34px",
              borderRadius: "999px",
              border: reviewPage === page.id ? "1px solid rgba(126,232,255,.30)" : "1px solid rgba(255,255,255,.07)",
              background: reviewPage === page.id ? "rgba(126,232,255,.09)" : "rgba(255,255,255,.018)",
              padding: "0 11px",
              color: reviewPage === page.id ? "#bdf6ff" : "rgba(255,255,255,.48)",
              fontFamily: "inherit",
              fontSize: "14px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {page.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: "8px", flex: 1, minHeight: 0, overflow: "hidden" }}>
        {reviewPage === 0 ? (
          <div style={{ height: "100%", minHeight: 0, display: "grid", gridTemplateRows: "auto auto minmax(0,1fr)", gap: "8px" }}>
            <section
              className="budget-review-enter"
              style={{
                borderRadius: "16px",
                border: "1px solid rgba(255,209,102,.22)",
                background: "linear-gradient(135deg,rgba(83,56,9,.26),rgba(5,15,33,.82))",
                padding: "9px 11px",
                display: "grid",
                gridTemplateColumns: "160px minmax(0,1fr)",
                gap: "10px",
                alignItems: "center",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <p style={{ ...eyebrowStyle, color: "#ffd166" }}>Final score</p>
                <strong style={{ display: "block", marginTop: "2px", color: "#ffd166", fontSize: "42px", lineHeight: 1 }}>
                  {finalScore.total}<span style={{ color: "rgba(255,255,255,.38)", fontSize: "18px" }}>/100</span>
                </strong>
                <span style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,.72)", fontSize: "14px", fontWeight: 850 }}>{finalScore.label}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: "5px" }}>
                {finalScore.breakdown.map((item) => (
                  <div key={item.key} style={{ borderRadius: "11px", border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.024)", padding: "7px 8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "5px", alignItems: "center" }}>
                      <span style={{ color: "rgba(255,255,255,.58)", fontSize: "12px", fontWeight: 850 }}>{item.label}</span>
                      <BudgetInfoButton title={item.label} accent="#ffd166">{item.detail}</BudgetInfoButton>
                    </div>
                    <strong style={{ display: "block", marginTop: "3px", color: "#ffd166", fontSize: "17px" }}>{item.points}/{item.maxPoints}</strong>
                    <div style={{ marginTop: "4px", height: "4px", borderRadius: "999px", background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
                      <div style={{ width: `${(item.points / item.maxPoints) * 100}%`, height: "100%", borderRadius: "inherit", background: "linear-gradient(90deg,#f6c453,#ffe4a0)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="budget-review-enter" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "6px" }}>
              <Metric label="Available at end" value={`$${result.endingAvailable.toLocaleString()}`} accent="#8ee8ff" detail="Accessible after known payments" />
              <Metric label="Set aside" value={`$${result.endingProtected.toLocaleString()}`} accent="#c8bcff" detail="Savings, reserve, investing and goals" />
              <Metric label="Bills paid" value={`$${result.finalCommitmentsPaid.toLocaleString()}`} accent="#ffd18a" detail="Known bills settled" />
              <Metric label="Missed commitments" value={`${result.commitmentsMissed}`} accent={result.commitmentsMissed === 0 ? "#80efb8" : "#ffaaaa"} detail="Missed commitments reduce the Bills covered part of your final score." />
            </section>

            <section className="budget-review-enter" style={{ ...panelStyle, minHeight: 0, overflow: "hidden", display: "grid", gridTemplateRows: "auto minmax(0,1fr)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                <div>
                  <p style={eyebrowStyle}>Day 1 plan → Day 30 position</p>
                  <h4 style={{ margin: "2px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "23px", fontWeight: 500 }}>Where the money ended up</h4>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "13px", color: "rgba(255,255,255,.38)" }}>
                  <span><i style={{ ...legendDot, background: "rgba(126,232,255,.42)" }} />Day 1</span>
                  <span><i style={{ ...legendDot, background: "rgba(184,168,255,.72)" }} />Day 30</span>
                </div>
              </div>
              <div style={{ marginTop: "7px", display: "grid", gap: "5px", alignContent: "center" }}>
                {ROWS.map((row) => {
                  const before = firstPlan[row.key];
                  const after = result.finalAllocation[row.key];
                  const delta = after - before;
                  return (
                    <div key={row.key} style={{ display: "grid", gridTemplateColumns: "105px minmax(0,1fr) 82px", gap: "7px", alignItems: "center" }}>
                      <span style={{ color: "rgba(255,255,255,.5)", fontSize: "13px", fontWeight: 850 }}>{row.label}</span>
                      <div style={{ display: "grid", gap: "2px" }}>
                        <Bar width={(before / maxValue) * 100} tone="first" />
                        <Bar width={(after / maxValue) * 100} tone="final" />
                      </div>
                      <span style={{ textAlign: "right", color: delta > 0 ? "#80efb8" : delta < 0 ? "#ffd18a" : "rgba(255,255,255,.28)", fontSize: "13px", fontWeight: 900 }}>
                        {delta > 0 ? "+" : ""}{`$${delta.toLocaleString()}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        ) : reviewPage === 1 ? (
          <div style={{ height: "100%", minHeight: 0, display: "grid", gridTemplateRows: "auto minmax(0,1fr)", gap: "8px" }}>
            <section className="budget-review-enter" style={{ ...panelStyle, display: "grid", gridTemplateColumns: "118px minmax(0,1fr)", gap: "10px", alignItems: "center" }}>
              <div style={{ display: "grid", placeItems: "center" }}>
                <img src={BUDGET_SIMULATOR_ASSETS.advisor} alt="Milo, your finance adviser" style={{ width: "96px", height: "116px", objectFit: "contain", objectPosition: "center bottom", filter: "drop-shadow(0 10px 18px rgba(0,0,0,.28))" }} />
                <span style={{ marginTop: "-3px", color: "#ffd18a", fontSize: "13px", fontWeight: 950, textTransform: "uppercase" }}>Milo's view</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "6px" }}>
                {summary.miloInsights.slice(0, 3).map((insight, index) => (
                  <div key={`${index}-${insight.slice(0, 18)}`} style={{ borderRadius: "12px", border: "1px solid rgba(255,209,138,.09)", background: "rgba(255,209,138,.035)", padding: "8px 9px", color: "rgba(255,255,255,.66)", fontSize: "14px", lineHeight: 1.42 }}>
                    {insight}
                  </div>
                ))}
              </div>
            </section>
            <div style={{ minHeight: 0, overflow: "hidden" }}>
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
            </div>
          </div>
        ) : (
          <div style={{ height: "100%", minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gridTemplateRows: "minmax(0,1fr) auto", gap: "8px" }}>
            <section className="budget-review-enter" style={{ ...panelStyle, minHeight: 0, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <p style={eyebrowStyle}>Financial skill evidence</p>
                <BudgetInfoButton title="Skill evidence">These levels describe what the simulation showed. They are evidence from this run, not permanent grades or mastery percentages.</BudgetInfoButton>
              </div>
              <div style={{ marginTop: "8px", display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "6px" }}>
                {summary.skills.map((item) => (
                  <div key={item.skillKey} style={{ borderRadius: "12px", border: "1px solid rgba(126,232,255,.08)", background: "rgba(126,232,255,.025)", padding: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "6px", alignItems: "center" }}>
                      <strong style={{ fontSize: "15px" }}>{item.title}</strong>
                      <span style={{ borderRadius: "999px", border: "1px solid rgba(126,232,255,.13)", background: "rgba(126,232,255,.05)", padding: "4px 6px", color: "#9defff", fontSize: "12px", fontWeight: 950, textTransform: "uppercase" }}>{item.level}</span>
                    </div>
                    <div style={{ marginTop: "6px" }}><BudgetInfoButton title={item.title}>{item.reason}</BudgetInfoButton></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="budget-review-enter" style={{ ...panelStyle, minHeight: 0, overflow: "hidden" }}>
              <p style={eyebrowStyle}>Decision patterns</p>
              <div style={{ marginTop: "7px", display: "grid", gap: "5px" }}>
                {summary.patterns.map((pattern) => (
                  <div key={pattern.key} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "6px", borderRadius: "11px", background: "rgba(255,255,255,.018)", padding: "7px 8px", alignItems: "center" }}>
                    <strong style={{ color: "rgba(255,255,255,.72)", fontSize: "15px" }}>{pattern.label}</strong>
                    <BudgetInfoButton title={pattern.label}>{pattern.observation}</BudgetInfoButton>
                  </div>
                ))}
              </div>
            </section>

            <div style={{ gridColumn: "1 / -1" }}>
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
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .budget-review-enter { animation: budgetReviewEnter 260ms ease-out both; }
        @keyframes budgetReviewEnter { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .budget-review-enter { animation: none; } }
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
            <h4 style={{ margin: "4px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "27px", fontWeight: 500 }}>Save the completed month to your Financial Profile</h4>
            <div style={{ marginTop: "7px" }}><BudgetInfoButton title="Finish this run" accent="#aef7d2">Finishing closes this run and saves its skill evidence. The first Money Under Pressure completion earns 10 Dream Tokens once. The first {difficulty === "standard" ? "Complex or Strategic" : difficulty === "complex" ? "Complex" : "Strategic"} completion can also earn a one-time 5 Dream Token difficulty reward. Replays do not repeat those rewards.</BudgetInfoButton></div>
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
          <h4 style={{ margin: "4px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: "28px", fontWeight: 500 }}>Your evidence is saved.</h4>
          <div style={{ marginTop: "7px" }}>
            <BudgetInfoButton title="Completion saved" accent="#aef7d2">
              {completion?.rewardDt
                ? `${completion.rewardDt.toLocaleString()} Dream Tokens were added as a one-time completion reward for this qualifying milestone.`
                : "This replay added fresh decision evidence but no repeat Dream Token reward."}
            </BudgetInfoButton>
          </div>
          {completion?.rewardDt ? (
            <div style={{ marginTop: "7px", display: "inline-flex", alignItems: "center", gap: "6px", borderRadius: "999px", border: "1px solid rgba(255,209,138,.18)", background: "rgba(255,209,138,.06)", padding: "6px 9px", color: "#ffd18a", fontSize: "15px", fontWeight: 950 }}>
              +{completion.rewardDt.toLocaleString()} Dream Tokens
              <span style={{ color: "rgba(255,255,255,.32)", fontSize: "15px", fontWeight: 700 }}>{completion.rewardLabel}</span>
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
    <div style={{ borderRadius: "14px", border: "1px solid rgba(255,255,255,.065)", background: "rgba(255,255,255,.018)", padding: "12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <span style={{ display: "block", color: "rgba(255,255,255,.4)", fontSize: "14px", fontWeight: 900, textTransform: "uppercase" }}>{label}</span>
        <BudgetInfoButton title={label} accent={accent}>{detail}</BudgetInfoButton>
      </div>
      <strong style={{ display: "block", marginTop: "5px", color: accent, fontSize: "24px" }}>{value}</strong>
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
  fontSize: "14px",
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
  fontSize: "14px",
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
  fontSize: "14px",
  fontWeight: 900,
  cursor: "pointer",
};
