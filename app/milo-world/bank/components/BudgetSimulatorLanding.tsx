"use client";

import { useMemo, useState } from "react";
import type { BankScreenMode } from "../lib/bank-types";
import { BUDGET_SIMULATOR_ASSETS } from "../lib/budget-simulator-assets";
import {
  BUDGET_DIFFICULTIES,
  BUDGET_SCENARIOS,
  createBudgetScenarioSeed,
  getBudgetDifficulty,
  getBudgetScenario,
} from "../lib/budget-simulator-scenarios";
import type {
  BudgetDifficulty,
  BudgetScenarioKey,
  BudgetSimulationRun,
} from "../lib/budget-simulator-types";

export default function BudgetSimulatorLanding({
  screenMode,
  isLoggedIn,
  run,
  loading,
  saving,
  error,
  onContinue,
  onStart,
}: {
  screenMode: BankScreenMode;
  isLoggedIn: boolean;
  run: BudgetSimulationRun | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  onContinue: () => void;
  onStart: (input: {
    scenarioKey: BudgetScenarioKey;
    difficulty: BudgetDifficulty;
    scenarioSeed: number;
  }) => Promise<boolean>;
}) {
  const isMobile = screenMode === "mobile";
  const [difficulty, setDifficulty] = useState<BudgetDifficulty>("standard");
  const [scenarioKey, setScenarioKey] = useState<BudgetScenarioKey>("starter");

  const activeScenario = useMemo(
    () => getBudgetScenario(scenarioKey),
    [scenarioKey],
  );

  const resumeScenario = run ? getBudgetScenario(run.scenarioKey) : null;
  const resumeDifficulty = run ? getBudgetDifficulty(run.difficulty) : null;

  async function start() {
    if (!isLoggedIn) {
      if (typeof window !== "undefined") window.location.href = "/login";
      return;
    }

    if (run) {
      const confirmed = window.confirm(
        "Start a new Budget Simulator run? Your current active run will be archived.",
      );
      if (!confirmed) return;
    }

    await onStart({
      scenarioKey,
      difficulty,
      scenarioSeed: createBudgetScenarioSeed(),
    });
  }

  return (
    <div style={{ marginTop: isMobile ? "10px" : "12px" }}>
      {run && resumeScenario && resumeDifficulty && (
        <section
          style={{
            borderRadius: "22px",
            border: "1px solid rgba(126,232,255,0.24)",
            background:
              "linear-gradient(135deg, rgba(10,35,59,0.84), rgba(5,12,29,0.90))",
            padding: isMobile ? "15px" : "18px 20px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "center",
            justifyContent: "space-between",
            gap: "14px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: "#8ee8ff",
                fontSize: "8px",
                fontWeight: 950,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Continue active run
            </div>
            <div
              style={{
                marginTop: "5px",
                display: "flex",
                flexWrap: "wrap",
                gap: "7px",
                alignItems: "baseline",
              }}
            >
              <strong style={{ fontSize: isMobile ? "19px" : "22px" }}>
                {resumeScenario.title}
              </strong>
              <span style={{ color: "rgba(255,255,255,0.42)", fontSize: "10px" }}>
                {resumeDifficulty.title} · Day {run.currentDay} · {run.currentStage.replaceAll("_", " ")}
              </span>
            </div>
          </div>

          <button type="button" onClick={onContinue} style={primaryButtonStyle}>
            Continue →
          </button>
        </section>
      )}

      <section
        style={{
          marginTop: run ? "12px" : 0,
          borderRadius: "24px",
          border: "1px solid rgba(184,168,255,0.15)",
          backgroundImage: `linear-gradient(180deg,rgba(2,8,20,.72),rgba(2,8,20,.90)), url(${BUDGET_SIMULATOR_ASSETS.background})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: "rgba(4,12,30,0.88)",
          padding: isMobile ? "16px" : "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: isMobile ? "stretch" : "flex-end",
          }}
        >
          <div>
            <p style={eyebrowStyle}>Budget Simulator</p>
            <h2
              style={{
                margin: "5px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "27px" : "34px",
                lineHeight: 1.05,
                fontWeight: 500,
              }}
            >
              Build a budget that survives the month.
            </h2>
          </div>
          <span
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            35–45 min · Replayable
          </span>
        </div>

        <div style={{ marginTop: "18px" }}>
          <p style={sectionLabelStyle}>1 · Choose difficulty</p>
          <div
            style={{
              marginTop: "8px",
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(3, minmax(0, 1fr))",
              gap: "8px",
            }}
          >
            {BUDGET_DIFFICULTIES.map((item) => {
              const active = difficulty === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDifficulty(item.id)}
                  aria-pressed={active}
                  style={{
                    minHeight: "78px",
                    padding: "12px 13px",
                    borderRadius: "16px",
                    border: active
                      ? "1px solid rgba(126,232,255,0.48)"
                      : "1px solid rgba(255,255,255,0.08)",
                    background: active
                      ? "rgba(83,215,255,0.10)"
                      : "rgba(255,255,255,0.025)",
                    color: "white",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                  }}
                >
                  <strong style={{ display: "block", fontSize: "13px" }}>
                    {item.title}
                  </strong>
                  <span
                    style={{
                      display: "block",
                      marginTop: "4px",
                      color: "rgba(255,255,255,0.42)",
                      fontSize: "9px",
                      lineHeight: 1.45,
                    }}
                  >
                    {item.decisionRange}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: "18px" }}>
          <p style={sectionLabelStyle}>2 · Choose the month</p>
          <div
            style={{
              marginTop: "8px",
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : screenMode === "compact"
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(4, minmax(0, 1fr))",
              gap: "8px",
            }}
          >
            {BUDGET_SCENARIOS.map((scenario) => {
              const active = scenarioKey === scenario.id;
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => setScenarioKey(scenario.id)}
                  aria-pressed={active}
                  style={{
                    minHeight: "92px",
                    padding: "12px 13px",
                    borderRadius: "16px",
                    border: active
                      ? "1px solid rgba(184,168,255,0.42)"
                      : "1px solid rgba(255,255,255,0.075)",
                    background: active
                      ? "rgba(184,168,255,0.09)"
                      : "rgba(255,255,255,0.022)",
                    color: "white",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                  }}
                >
                  <span
                    style={{
                      color: active ? "#cfc5ff" : "rgba(255,255,255,0.35)",
                      fontSize: "7px",
                      fontWeight: 950,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    {scenario.emphasis}
                  </span>
                  <strong
                    style={{ display: "block", marginTop: "5px", fontSize: "12px" }}
                  >
                    {scenario.title}
                  </strong>
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            marginTop: "14px",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(0,0,0,0.16)",
            padding: "12px 14px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div>
            <strong style={{ fontSize: "12px" }}>{activeScenario.title}</strong>
            <p
              style={{
                margin: "4px 0 0",
                maxWidth: "760px",
                color: "rgba(255,255,255,0.44)",
                fontSize: "10px",
                lineHeight: 1.5,
              }}
            >
              {activeScenario.shortDescription}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void start()}
            disabled={saving || loading}
            style={{
              ...primaryButtonStyle,
              opacity: saving || loading ? 0.55 : 1,
              cursor: saving || loading ? "wait" : "pointer",
            }}
          >
            {!isLoggedIn
              ? "Sign in to start →"
              : saving
                ? "Starting…"
                : run
                  ? "Start new run →"
                  : "Start simulation →"}
          </button>
        </div>

        {error && (
          <p
            role="alert"
            style={{
              margin: "10px 0 0",
              borderRadius: "13px",
              border: "1px solid rgba(255,120,120,0.18)",
              background: "rgba(255,80,80,0.07)",
              padding: "9px 11px",
              color: "#ffc1c1",
              fontSize: "9px",
              lineHeight: 1.45,
            }}
          >
            {error}
          </p>
        )}
      </section>
    </div>
  );
}

const eyebrowStyle = {
  margin: 0,
  color: "#8ee8ff",
  fontSize: "8px",
  fontWeight: 950,
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
};

const sectionLabelStyle = {
  margin: 0,
  color: "rgba(255,255,255,0.55)",
  fontSize: "8px",
  fontWeight: 950,
  letterSpacing: "0.11em",
  textTransform: "uppercase" as const,
};

const primaryButtonStyle = {
  minHeight: "38px",
  flexShrink: 0,
  padding: "0 14px",
  borderRadius: "11px",
  border: "1px solid rgba(126,232,255,0.28)",
  background: "rgba(83,215,255,0.12)",
  color: "#bff6ff",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "8px",
  fontWeight: 950,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};
