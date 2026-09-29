"use client";

import { useEffect, useMemo, useState } from "react";
import type { BankScreenMode } from "../lib/bank-types";
import { BUDGET_SIMULATOR_ASSETS } from "../lib/budget-simulator-assets";
import BudgetInfoButton from "./BudgetInfoButton";
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

type DifficultyTone = {
  accent: string;
  border: string;
  selectedBorder: string;
  background: string;
  selectedBackground: string;
  glow: string;
  label: string;
};

const DIFFICULTY_TONES: Record<BudgetDifficulty, DifficultyTone> = {
  standard: {
    accent: "#67e8f9",
    border: "rgba(103,232,249,0.20)",
    selectedBorder: "rgba(103,232,249,0.68)",
    background:
      "linear-gradient(135deg,rgba(6,182,212,.10),rgba(15,118,110,.035))",
    selectedBackground:
      "linear-gradient(135deg,rgba(6,182,212,.22),rgba(15,118,110,.10))",
    glow: "0 0 34px rgba(34,211,238,.12)",
    label: "Clearer planning",
  },
  complex: {
    accent: "#c4b5fd",
    border: "rgba(196,181,253,0.20)",
    selectedBorder: "rgba(196,181,253,0.68)",
    background:
      "linear-gradient(135deg,rgba(139,92,246,.10),rgba(79,70,229,.04))",
    selectedBackground:
      "linear-gradient(135deg,rgba(139,92,246,.22),rgba(79,70,229,.11))",
    glow: "0 0 34px rgba(139,92,246,.13)",
    label: "Competing pressures",
  },
  strategic: {
    accent: "#fbbf24",
    border: "rgba(251,191,36,0.22)",
    selectedBorder: "rgba(251,191,36,0.70)",
    background:
      "linear-gradient(135deg,rgba(245,158,11,.10),rgba(234,88,12,.035))",
    selectedBackground:
      "linear-gradient(135deg,rgba(245,158,11,.22),rgba(234,88,12,.10))",
    glow: "0 0 34px rgba(251,191,36,.12)",
    label: "Maximum uncertainty",
  },
};

const SCENARIO_ACCENTS: Record<BudgetScenarioKey, string> = {
  starter: "#67e8f9",
  tight_month: "#fbbf24",
  goal_conflict: "#c4b5fd",
  opportunity_month: "#6ee7b7",
  uncertain_income: "#f0abfc",
  high_commitments: "#fb923c",
  random_month: "#93c5fd",
};

const DIFFICULTY_GUIDANCE: Record<BudgetDifficulty, string> = {
  standard:
    "Standard is the clearest place to begin. Income is steadier and fewer pressures overlap, so you can focus on building a sensible plan before the month starts changing.",
  complex:
    "Complex asks you to juggle more commitments and competing goals. Choose it when you are ready to rebalance your plan instead of relying on your first allocation.",
  strategic:
    "Strategic gives you less certainty, more delayed consequences and more overlapping decisions. Choose it when you are comfortable acting without seeing every outcome in advance.",
};

const SCENARIO_GUIDANCE: Record<BudgetScenarioKey, string> = {
  starter:
    "Starter Month is a balanced baseline and is a good first scenario if you want to learn the controls before facing heavier pressure.",
  tight_month:
    "Tight Month tests liquidity. Most of your DT already has a job, so one extra expense can force a real trade-off.",
  goal_conflict:
    "Goal Conflict is about prioritisation. Several worthwhile goals compete for the same limited pool of DT.",
  opportunity_month:
    "Opportunity Month gives you attractive offers while commitments still need protection. The challenge is deciding when an opportunity is actually affordable.",
  uncertain_income:
    "Uncertain Income tests resilience. Timing becomes less predictable, so keeping flexibility can matter as much as chasing growth.",
  high_commitments:
    "High Commitments is a cash-flow challenge. Fixed obligations leave less room for impulsive changes or weak forecasting.",
  random_month:
    "Random Month combines pressures and opportunities from several scenario types. It is best when you already understand the simulator and want a fresh replay.",
};

function useTypewriter(text: string) {
  const [visible, setVisible] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      setVisible(text);
      return;
    }

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setVisible(text);
      return;
    }

    setVisible("");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setVisible(text.slice(0, index));
      if (index >= text.length) window.clearInterval(timer);
    }, 14);

    return () => window.clearInterval(timer);
  }, [text]);

  return visible;
}

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

  const activeDifficulty = useMemo(
    () => getBudgetDifficulty(difficulty),
    [difficulty],
  );

  const guideMessage = useMemo(
    () => `${DIFFICULTY_GUIDANCE[difficulty]} ${SCENARIO_GUIDANCE[scenarioKey]}`,
    [difficulty, scenarioKey],
  );
  const typedGuideMessage = useTypewriter(guideMessage);

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
    <div style={{ marginTop: isMobile ? "10px" : "12px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
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
                fontSize: "15px",
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
              <span style={{ color: "rgba(255,255,255,0.42)", fontSize: "17px" }}>
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
          backgroundImage: `linear-gradient(180deg,rgba(2,8,20,.69),rgba(2,8,20,.91)), url(${BUDGET_SIMULATOR_ASSETS.background})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: "rgba(4,12,30,0.88)",
          padding: isMobile ? "18px" : "24px",
          flex: 1,
          minHeight: isMobile ? "calc(100dvh - 200px)" : "calc(100dvh - 220px)",
          display: "flex",
          flexDirection: "column",
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
              Build a budget that can handle surprises.
            </h2>
          </div>
          <span
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: "16px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            35–45 min · Replayable
          </span>
        </div>

        <section
          style={{
            marginTop: "16px",
            display: "grid",
            gridTemplateColumns: isMobile ? "82px minmax(0,1fr)" : "110px minmax(0,1fr)",
            gap: isMobile ? "10px" : "14px",
            alignItems: "end",
            borderRadius: "18px",
            border: "1px solid rgba(126,232,255,.14)",
            background:
              "linear-gradient(135deg,rgba(4,19,38,.82),rgba(9,14,33,.76))",
            overflow: "hidden",
            minHeight: isMobile ? "128px" : "142px",
          }}
        >
          <div
            style={{
              alignSelf: "stretch",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <img
              src={BUDGET_SIMULATOR_ASSETS.advisor}
              alt="Milo finance adviser"
              style={{
                display: "block",
                width: isMobile ? "78px" : "104px",
                height: isMobile ? "118px" : "146px",
                objectFit: "contain",
                objectPosition: "bottom center",
              }}
            />
          </div>

          <div style={{ padding: isMobile ? "13px 13px 13px 0" : "16px 18px 16px 0" }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "7px",
              }}
            >
              <span
                style={{
                  color: "#8ee8ff",
                  fontSize: "15px",
                  fontWeight: 950,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                }}
              >
                Milo's guide
              </span>
              <span
                style={{
                  borderRadius: "999px",
                  border: `1px solid ${DIFFICULTY_TONES[difficulty].border}`,
                  background: "rgba(255,255,255,.035)",
                  color: DIFFICULTY_TONES[difficulty].accent,
                  padding: "3px 7px",
                  fontSize: "14px",
                  fontWeight: 900,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                }}
              >
                {activeDifficulty.title} · {activeScenario.title}
              </span>
            </div>

            <p
              aria-live="polite"
              style={{
                margin: "8px 0 0",
                minHeight: isMobile ? "64px" : "50px",
                maxWidth: "980px",
                color: "rgba(255,255,255,.78)",
                fontSize: isMobile ? "11px" : "12px",
                lineHeight: 1.6,
              }}
            >
              {typedGuideMessage}
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: "1px",
                  height: "1em",
                  marginLeft: "2px",
                  verticalAlign: "-2px",
                  background: "#8ee8ff",
                  opacity: typedGuideMessage.length < guideMessage.length ? 0.9 : 0.25,
                }}
              />
            </p>
          </div>
        </section>

        <div style={{ marginTop: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <p style={sectionLabelStyle}>1 · Choose your challenge</p>
            <BudgetInfoButton title="Challenge levels">Standard keeps the month clearer while you learn the system. Complex adds more competing commitments. Strategic adds the most uncertainty, delayed consequences and overlapping decisions.</BudgetInfoButton>
          </div>
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
              const tone = DIFFICULTY_TONES[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDifficulty(item.id)}
                  aria-pressed={active}
                  style={{
                    position: "relative",
                    minHeight: isMobile ? "88px" : "102px",
                    padding: "13px 14px 12px 17px",
                    borderRadius: "17px",
                    border: active
                      ? `1px solid ${tone.selectedBorder}`
                      : `1px solid ${tone.border}`,
                    borderLeft: `4px solid ${tone.accent}`,
                    background: active ? tone.selectedBackground : tone.background,
                    boxShadow: active ? tone.glow : "none",
                    color: "white",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    transition: "border-color .18s ease, background .18s ease, box-shadow .18s ease, transform .18s ease",
                    transform: active ? "translateY(-1px)" : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                    }}
                  >
                    <strong style={{ display: "block", fontSize: "20px" }}>
                      {item.title}
                    </strong>
                    {active && (
                      <span
                        style={{
                          borderRadius: "999px",
                          background: tone.accent,
                          color: "#07111f",
                          padding: "3px 7px",
                          fontSize: "15px",
                          fontWeight: 950,
                          letterSpacing: ".08em",
                          textTransform: "uppercase",
                        }}
                      >
                        Selected
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      display: "block",
                      marginTop: "5px",
                      color: tone.accent,
                      fontSize: "15px",
                      fontWeight: 900,
                      letterSpacing: ".06em",
                      textTransform: "uppercase",
                    }}
                  >
                    {tone.label} · {item.decisionRange}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <p style={sectionLabelStyle}>2 · Choose the month</p>
            <BudgetInfoButton title="Scenario types">Each month changes the pressure you face. Choose the situation you want to practise: tight cash flow, competing goals, opportunities, uncertain income, heavy commitments or a random mix.</BudgetInfoButton>
          </div>
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
              const accent = SCENARIO_ACCENTS[scenario.id];
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
                      ? `1px solid ${accent}`
                      : "1px solid rgba(255,255,255,0.075)",
                    borderTop: `3px solid ${active ? accent : `${accent}66`}`,
                    background: active
                      ? `linear-gradient(135deg,${accent}20,rgba(7,14,31,.72))`
                      : "rgba(255,255,255,0.022)",
                    boxShadow: active ? `0 0 26px ${accent}16` : "none",
                    color: "white",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    transition: "border-color .18s ease, background .18s ease, box-shadow .18s ease",
                  }}
                >
                  <span
                    style={{
                      color: active ? accent : "rgba(255,255,255,0.35)",
                      fontSize: "14px",
                      fontWeight: 950,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    {scenario.emphasis}
                  </span>
                  <strong
                    style={{ display: "block", marginTop: "5px", fontSize: "18px" }}
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
            border: `1px solid ${SCENARIO_ACCENTS[scenarioKey]}30`,
            background: "rgba(0,0,0,0.18)",
            padding: "12px 14px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <span
                aria-hidden="true"
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "999px",
                  background: SCENARIO_ACCENTS[scenarioKey],
                  boxShadow: `0 0 14px ${SCENARIO_ACCENTS[scenarioKey]}`,
                }}
              />
              <strong style={{ fontSize: "18px" }}>{activeScenario.title}</strong>
            </div>
            <div style={{ marginTop: "8px", marginLeft: "15px" }}>
              <BudgetInfoButton title={activeScenario.title}>{activeScenario.shortDescription}</BudgetInfoButton>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void start()}
            disabled={saving || loading}
            style={{
              ...primaryButtonStyle,
              borderColor: `${DIFFICULTY_TONES[difficulty].accent}66`,
              background: `linear-gradient(135deg,${DIFFICULTY_TONES[difficulty].accent}24,rgba(83,215,255,.08))`,
              color: DIFFICULTY_TONES[difficulty].accent,
              opacity: saving || loading ? 0.55 : 1,
              cursor: saving || loading ? "wait" : "pointer",
            }}
          >
            {!isLoggedIn
              ? "Sign in to start →"
              : saving
                ? "Starting…"
                : run
                  ? "Start a new month →"
                  : "Start month →"}
          </button>
        </div>

        {error && (
          <p
            role="alert"
            style={{
              margin: "10px 0 0",
              borderRadius: "13px",
              border: "1px solid rgba(255,120,120,0.22)",
              background: "rgba(255,80,80,0.085)",
              padding: "10px 12px",
              color: "#ffc1c1",
              fontSize: "16px",
              lineHeight: 1.5,
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
  fontSize: "15px",
  fontWeight: 950,
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
};

const sectionLabelStyle = {
  margin: 0,
  color: "rgba(255,255,255,0.55)",
  fontSize: "15px",
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
  fontSize: "15px",
  fontWeight: 950,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};
