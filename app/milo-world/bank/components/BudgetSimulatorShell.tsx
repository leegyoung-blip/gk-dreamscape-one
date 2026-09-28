"use client";

import type { BankScreenMode } from "../lib/bank-types";
import {
  BUDGET_STAGES,
  getBudgetDifficulty,
  getBudgetScenario,
} from "../lib/budget-simulator-scenarios";
import type { BudgetSimulationRun } from "../lib/budget-simulator-types";

export default function BudgetSimulatorShell({
  run,
  screenMode,
  saving,
  error,
  onExit,
  onAbandon,
}: {
  run: BudgetSimulationRun;
  screenMode: BankScreenMode;
  saving: boolean;
  error: string | null;
  onExit: () => void;
  onAbandon: () => Promise<void>;
}) {
  const isMobile = screenMode === "mobile";
  const scenario = getBudgetScenario(run.scenarioKey);
  const difficulty = getBudgetDifficulty(run.difficulty);
  const activeIndex = Math.max(
    0,
    BUDGET_STAGES.findIndex((stage) => stage.id === run.currentStage),
  );

  async function abandon() {
    const confirmed = window.confirm(
      "End this Budget Simulator run? You will not be able to resume it.",
    );
    if (!confirmed) return;
    await onAbandon();
  }

  return (
    <section style={{ marginTop: isMobile ? "10px" : "12px" }}>
      <div
        style={{
          borderRadius: "22px",
          border: "1px solid rgba(126,232,255,0.18)",
          background: "rgba(4,12,30,0.82)",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            padding: isMobile ? "13px" : "14px 18px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "center",
            justifyContent: "space-between",
            gap: "10px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  color: "#8ee8ff",
                  fontSize: "8px",
                  fontWeight: 950,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Budget Simulator
              </span>
              <span style={badgeStyle}>{difficulty.title}</span>
              <span style={badgeStyle}>{scenario.title}</span>
            </div>
            <h2
              style={{
                margin: "5px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontWeight: 500,
                fontSize: isMobile ? "24px" : "30px",
              }}
            >
              Build a Budget That Survives
            </h2>
          </div>

          <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
            <button type="button" onClick={onExit} style={secondaryButtonStyle}>
              Exit & save
            </button>
            <button
              type="button"
              onClick={() => void abandon()}
              disabled={saving}
              style={{
                ...secondaryButtonStyle,
                borderColor: "rgba(255,130,130,0.16)",
                color: "rgba(255,190,190,0.72)",
              }}
            >
              End run
            </button>
          </div>
        </header>

        <div
          aria-label="Budget Simulator stages"
          style={{
            padding: isMobile ? "9px" : "10px 14px",
            display: "grid",
            gridTemplateColumns: isMobile
              ? "repeat(7, minmax(42px, 1fr))"
              : "repeat(7, minmax(0, 1fr))",
            gap: "5px",
            overflowX: isMobile ? "auto" : "visible",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {BUDGET_STAGES.map((stage, index) => {
            const active = index === activeIndex;
            const complete = index < activeIndex;
            return (
              <div
                key={stage.id}
                style={{
                  minWidth: isMobile ? "48px" : 0,
                  borderRadius: "11px",
                  border: active
                    ? "1px solid rgba(126,232,255,0.36)"
                    : "1px solid rgba(255,255,255,0.055)",
                  background: active
                    ? "rgba(83,215,255,0.09)"
                    : complete
                      ? "rgba(99,255,183,0.05)"
                      : "rgba(255,255,255,0.018)",
                  padding: "7px 5px",
                  textAlign: "center",
                }}
              >
                <strong
                  style={{
                    display: "block",
                    color: active
                      ? "#a9f1ff"
                      : complete
                        ? "#a9ffd4"
                        : "rgba(255,255,255,0.28)",
                    fontSize: "8px",
                  }}
                >
                  {stage.number}
                </strong>
                <span
                  style={{
                    display: "block",
                    marginTop: "2px",
                    color: active
                      ? "rgba(255,255,255,0.82)"
                      : "rgba(255,255,255,0.34)",
                    fontSize: isMobile ? "6px" : "7px",
                    fontWeight: 850,
                    whiteSpace: "nowrap",
                  }}
                >
                  {isMobile ? stage.shortLabel : stage.label}
                </span>
              </div>
            );
          })}
        </div>

        <div
          style={{
            minHeight: isMobile ? "310px" : "360px",
            padding: isMobile ? "18px 14px" : "28px",
            display: "grid",
            placeItems: "center",
          }}
        >
          <div style={{ maxWidth: "680px", textAlign: "center" }}>
            <div
              style={{
                width: "58px",
                height: "58px",
                margin: "0 auto",
                borderRadius: "18px",
                border: "1px solid rgba(126,232,255,0.2)",
                background:
                  "radial-gradient(circle at 35% 30%, rgba(126,232,255,0.22), rgba(83,100,255,0.06) 55%, rgba(0,0,0,0.06))",
                display: "grid",
                placeItems: "center",
                color: "#a9f1ff",
                fontSize: "24px",
              }}
            >
              ◇
            </div>
            <p
              style={{
                margin: "14px 0 0",
                color: "#8ee8ff",
                fontSize: "8px",
                fontWeight: 950,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
              }}
            >
              Stage 1 · Briefing
            </p>
            <h3
              style={{
                margin: "6px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "26px" : "33px",
                fontWeight: 500,
              }}
            >
              Your simulation run is ready.
            </h3>
            <p
              style={{
                margin: "10px auto 0",
                maxWidth: "540px",
                color: "rgba(255,255,255,0.46)",
                fontSize: "11px",
                lineHeight: 1.6,
              }}
            >
              This run has its own persistent scenario seed and checkpoint. You can
              leave now and resume the same month later. The interactive financial
              briefing and planning desk are added in 4A-2.
            </p>

            <div
              style={{
                marginTop: "17px",
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(3, minmax(0,1fr))",
                gap: "8px",
              }}
            >
              <FoundationMetric label="Current day" value={`Day ${run.currentDay}`} />
              <FoundationMetric label="Difficulty" value={difficulty.title} />
              <FoundationMetric label="Checkpoint" value={`v${run.checkpointVersion}`} />
            </div>

            {error && (
              <p
                role="alert"
                style={{
                  margin: "12px 0 0",
                  color: "#ffc1c1",
                  fontSize: "9px",
                }}
              >
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FoundationMetric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: "14px",
        border: "1px solid rgba(255,255,255,0.065)",
        background: "rgba(255,255,255,0.022)",
        padding: "10px 12px",
      }}
    >
      <span
        style={{
          display: "block",
          color: "rgba(255,255,255,0.32)",
          fontSize: "7px",
          fontWeight: 900,
          letterSpacing: "0.09em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <strong style={{ display: "block", marginTop: "4px", fontSize: "12px" }}>
        {value}
      </strong>
    </div>
  );
}

const badgeStyle = {
  minHeight: "20px",
  padding: "0 7px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.035)",
  color: "rgba(255,255,255,0.5)",
  display: "inline-flex",
  alignItems: "center",
  fontSize: "7px",
  fontWeight: 900,
  letterSpacing: "0.07em",
  textTransform: "uppercase" as const,
};

const secondaryButtonStyle = {
  minHeight: "34px",
  padding: "0 11px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.035)",
  color: "rgba(255,255,255,0.62)",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "7px",
  fontWeight: 900,
  letterSpacing: "0.07em",
  textTransform: "uppercase" as const,
};
