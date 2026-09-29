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
    border: "rgba(103,232,249,0.34)",
    selectedBorder: "rgba(103,232,249,0.82)",
    background: "linear-gradient(135deg,rgba(6,32,52,.88),rgba(7,27,35,.84))",
    selectedBackground: "linear-gradient(135deg,rgba(6,86,104,.92),rgba(8,47,54,.90))",
    glow: "0 0 30px rgba(34,211,238,.15)",
    label: "Clearer planning",
  },
  complex: {
    accent: "#c4b5fd",
    border: "rgba(196,181,253,0.34)",
    selectedBorder: "rgba(196,181,253,0.82)",
    background: "linear-gradient(135deg,rgba(41,31,74,.88),rgba(22,25,57,.84))",
    selectedBackground: "linear-gradient(135deg,rgba(88,62,145,.92),rgba(48,46,105,.90))",
    glow: "0 0 30px rgba(139,92,246,.16)",
    label: "Competing pressures",
  },
  strategic: {
    accent: "#fbbf24",
    border: "rgba(251,191,36,0.36)",
    selectedBorder: "rgba(251,191,36,0.84)",
    background: "linear-gradient(135deg,rgba(72,47,13,.88),rgba(48,30,13,.84))",
    selectedBackground: "linear-gradient(135deg,rgba(121,79,15,.94),rgba(78,43,13,.90))",
    glow: "0 0 30px rgba(251,191,36,.16)",
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
    "Standard keeps the pressure clearer so you can focus on planning and learning how the simulator reacts.",
  complex:
    "Complex adds more overlapping bills, goals and decisions, so your first plan is less likely to survive unchanged.",
  strategic:
    "Strategic gives you the least certainty, more delayed consequences and the toughest trade-offs.",
};

const SCENARIO_GUIDANCE: Record<BudgetScenarioKey, string> = {
  starter: "Starter Month gives you a balanced first run.",
  tight_month: "Tight Month tests whether you can stay liquid when there is very little spare cash.",
  goal_conflict: "Goal Conflict makes several worthwhile goals compete for the same money.",
  opportunity_month: "Opportunity Month tests whether attractive offers are actually affordable.",
  uncertain_income: "Uncertain Income tests resilience when the timing of money coming in becomes less predictable.",
  high_commitments: "High Commitments leaves less room for weak forecasting or impulsive changes.",
  random_month: "Random Month mixes pressures and opportunities for a less predictable replay.",
};

const GAME_OBJECTIVE =
  "Your mission: reach the end of the month with your important bills covered and enough flexibility for surprises. Choose a challenge level on the left and a month on the right. Then you will build a plan, stress-test it, face changing events, rebalance when needed and compare your final choices with your first plan. There is no single perfect budget.";

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
    }, 10);

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
  const compact = screenMode === "compact";
  const [difficulty, setDifficulty] = useState<BudgetDifficulty>("standard");
  const [scenarioKey, setScenarioKey] = useState<BudgetScenarioKey>("starter");

  const activeScenario = useMemo(() => getBudgetScenario(scenarioKey), [scenarioKey]);
  const activeDifficulty = useMemo(() => getBudgetDifficulty(difficulty), [difficulty]);
  const selectionMessage = useMemo(
    () => `${GAME_OBJECTIVE}\n\nYou selected ${activeDifficulty.title} + ${activeScenario.title}. ${DIFFICULTY_GUIDANCE[difficulty]} ${SCENARIO_GUIDANCE[scenarioKey]}`,
    [activeDifficulty.title, activeScenario.title, difficulty, scenarioKey],
  );
  const typedGuideMessage = useTypewriter(selectionMessage);

  const resumeScenario = run ? getBudgetScenario(run.scenarioKey) : null;
  const resumeDifficulty = run ? getBudgetDifficulty(run.difficulty) : null;

  async function start() {
    if (!isLoggedIn) {
      if (typeof window !== "undefined") window.location.href = "/login";
      return;
    }

    if (run) {
      const confirmed = window.confirm(
        "Start a new Money Under Pressure run? Your current active run will be archived.",
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
    <div style={{ flex: 1, minHeight: 0, height: "100%", display: "flex", flexDirection: "column" }}>
      {run && resumeScenario && resumeDifficulty && (
        <section
          style={{
            marginBottom: "10px",
            borderRadius: "18px",
            border: "1px solid rgba(126,232,255,0.28)",
            background: "linear-gradient(135deg, rgba(8,31,54,0.95), rgba(4,11,27,0.96))",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "14px",
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "#8ee8ff", fontSize: "14px", fontWeight: 950, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Continue active run
            </div>
            <div style={{ marginTop: "3px", display: "flex", flexWrap: "wrap", gap: "7px", alignItems: "baseline" }}>
              <strong style={{ fontSize: "19px" }}>{resumeScenario.title}</strong>
              <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "15px" }}>
                {resumeDifficulty.title} · Day {run.currentDay} · {run.currentStage.replaceAll("_", " ")}
              </span>
            </div>
          </div>
          <button type="button" onClick={onContinue} style={primaryButtonStyle}>Continue →</button>
        </section>
      )}

      <section
        style={{
          borderRadius: "22px",
          border: "1px solid rgba(184,168,255,0.18)",
          backgroundImage: `linear-gradient(180deg,rgba(2,8,20,.58),rgba(2,8,20,.76)), url(${BUDGET_SIMULATOR_ASSETS.background})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: "#04101f",
          padding: compact ? "16px" : "18px 20px",
          flex: 1,
          minHeight: 0,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "16px", flexShrink: 0 }}>
          <div>
            <p style={eyebrowStyle}>Budget challenge</p>
            <h2 style={{ margin: "3px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: compact ? "30px" : "36px", lineHeight: 1, fontWeight: 500 }}>
              Money Under Pressure
            </h2>
            <p style={{ margin: "7px 0 0", color: "rgba(255,255,255,.72)", fontSize: "17px", fontWeight: 700 }}>
              Plan your month. Handle surprises. Stay in control.
            </p>
          </div>
          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "15px", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            35–45 min · Replayable
          </span>
        </div>

        <section
          style={{
            marginTop: "12px",
            display: "grid",
            gridTemplateColumns: compact ? "92px minmax(0,1fr)" : "104px minmax(0,1fr)",
            gap: "14px",
            alignItems: "center",
            borderRadius: "18px",
            border: "1px solid rgba(126,232,255,.24)",
            background: "linear-gradient(135deg,rgba(3,17,35,.94),rgba(6,13,29,.94))",
            boxShadow: "0 16px 32px rgba(0,0,0,.18)",
            overflow: "hidden",
            minHeight: compact ? "120px" : "132px",
            flexShrink: 0,
          }}
        >
          <div style={{ alignSelf: "stretch", display: "flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden" }}>
            <img
              src={BUDGET_SIMULATOR_ASSETS.advisor}
              alt="Milo finance adviser"
              style={{ display: "block", width: compact ? "88px" : "100px", height: compact ? "124px" : "142px", objectFit: "contain", objectPosition: "bottom center" }}
            />
          </div>
          <div style={{ padding: "12px 16px 12px 0", minWidth: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#8ee8ff", fontSize: "15px", fontWeight: 950, letterSpacing: ".12em", textTransform: "uppercase" }}>Milo's guide</span>
              <span style={{ borderRadius: "999px", border: `1px solid ${DIFFICULTY_TONES[difficulty].border}`, background: "rgba(255,255,255,.055)", color: DIFFICULTY_TONES[difficulty].accent, padding: "4px 8px", fontSize: "13px", fontWeight: 900, letterSpacing: ".06em", textTransform: "uppercase" }}>
                {activeDifficulty.title} · {activeScenario.title}
              </span>
            </div>
            <p aria-live="polite" style={{ margin: "7px 0 0", minHeight: "68px", maxWidth: "1200px", color: "rgba(255,255,255,.84)", fontSize: compact ? "14px" : "15px", lineHeight: 1.48, whiteSpace: "pre-line" }}>
              {typedGuideMessage}
              <span aria-hidden="true" style={{ display: "inline-block", width: "1px", height: "1em", marginLeft: "2px", verticalAlign: "-2px", background: "#8ee8ff", opacity: typedGuideMessage.length < selectionMessage.length ? 0.9 : 0.22 }} />
            </p>
          </div>
        </section>

        <div
          style={{
            marginTop: "12px",
            display: "grid",
            gridTemplateColumns: compact ? "minmax(250px,.78fr) minmax(0,1.22fr)" : "minmax(290px,.72fr) minmax(0,1.28fr)",
            gap: "14px",
            flex: 1,
            minHeight: 0,
          }}
        >
          <section style={choiceColumnStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px", flexShrink: 0 }}>
              <p style={sectionLabelStyle}>Choose your challenge</p>
              <BudgetInfoButton title="Challenge levels">Standard is the clearest starting point. Complex adds more competing pressures. Strategic gives you the most uncertainty and delayed consequences.</BudgetInfoButton>
            </div>
            <div style={{ marginTop: "9px", display: "grid", gridTemplateRows: "repeat(3,minmax(0,1fr))", gap: "8px", flex: 1, minHeight: 0 }}>
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
                      minHeight: 0,
                      padding: compact ? "12px 13px" : "13px 15px",
                      borderRadius: "16px",
                      border: active ? `1px solid ${tone.selectedBorder}` : `1px solid ${tone.border}`,
                      borderLeft: `5px solid ${tone.accent}`,
                      background: active ? tone.selectedBackground : tone.background,
                      boxShadow: active ? tone.glow : "0 10px 22px rgba(0,0,0,.16)",
                      color: "white",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                      transition: "border-color .18s ease, background .18s ease, box-shadow .18s ease, transform .18s ease",
                      transform: active ? "translateX(2px)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                      <strong style={{ display: "block", fontSize: compact ? "18px" : "20px" }}>{item.title}</strong>
                      {active && <span style={{ borderRadius: "999px", background: tone.accent, color: "#07111f", padding: "3px 7px", fontSize: "12px", fontWeight: 950, letterSpacing: ".07em", textTransform: "uppercase" }}>Selected</span>}
                    </div>
                    <span style={{ display: "block", marginTop: "5px", color: tone.accent, fontSize: "13px", fontWeight: 900, letterSpacing: ".05em", textTransform: "uppercase" }}>
                      {tone.label} · {item.decisionRange}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section style={choiceColumnStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px", flexShrink: 0 }}>
              <p style={sectionLabelStyle}>Choose the month</p>
              <BudgetInfoButton title="Month scenarios">Each month changes the kind of pressure you face: tight cash flow, competing goals, opportunities, uncertain income, heavy commitments or a random mix.</BudgetInfoButton>
            </div>
            <div
              style={{
                marginTop: "9px",
                display: "grid",
                gridTemplateColumns: compact ? "repeat(2,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))",
                gridAutoRows: "minmax(62px,1fr)",
                gap: "8px",
                flex: 1,
                minHeight: 0,
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
                      minHeight: 0,
                      padding: "10px 12px",
                      borderRadius: "15px",
                      border: active ? `1px solid ${accent}` : `1px solid ${accent}42`,
                      borderTop: `3px solid ${active ? accent : `${accent}80`}`,
                      background: active
                        ? `linear-gradient(135deg,${accent}36,rgba(4,13,30,.94))`
                        : "linear-gradient(145deg,rgba(5,14,31,.90),rgba(4,10,24,.94))",
                      boxShadow: active ? `0 0 24px ${accent}18` : "0 8px 18px rgba(0,0,0,.15)",
                      color: "white",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                    }}
                  >
                    <span style={{ color: active ? accent : "rgba(255,255,255,0.52)", fontSize: "12px", fontWeight: 950, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {scenario.emphasis}
                    </span>
                    <strong style={{ display: "block", marginTop: "3px", fontSize: compact ? "15px" : "17px" }}>{scenario.title}</strong>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div
          style={{
            marginTop: "10px",
            borderRadius: "15px",
            border: `1px solid ${SCENARIO_ACCENTS[scenarioKey]}4a`,
            background: "rgba(2,8,20,.92)",
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span aria-hidden="true" style={{ width: "8px", height: "8px", borderRadius: "999px", background: SCENARIO_ACCENTS[scenarioKey], boxShadow: `0 0 14px ${SCENARIO_ACCENTS[scenarioKey]}` }} />
              <strong style={{ fontSize: "16px" }}>{activeDifficulty.title} · {activeScenario.title}</strong>
              <BudgetInfoButton title={activeScenario.title}>{activeScenario.shortDescription}</BudgetInfoButton>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void start()}
            disabled={saving || loading}
            style={{
              ...primaryButtonStyle,
              borderColor: `${DIFFICULTY_TONES[difficulty].accent}72`,
              background: `linear-gradient(135deg,${DIFFICULTY_TONES[difficulty].accent}30,rgba(5,20,36,.88))`,
              color: DIFFICULTY_TONES[difficulty].accent,
              opacity: saving || loading ? 0.55 : 1,
              cursor: saving || loading ? "wait" : "pointer",
            }}
          >
            {!isLoggedIn ? "Sign in to start →" : saving ? "Starting…" : run ? "Start a new month →" : "Start the month →"}
          </button>
        </div>

        {error && (
          <p role="alert" style={{ margin: "8px 0 0", borderRadius: "12px", border: "1px solid rgba(255,120,120,0.28)", background: "rgba(55,10,18,.90)", padding: "8px 11px", color: "#ffc1c1", fontSize: "14px", lineHeight: 1.4, flexShrink: 0 }}>
            {error}
          </p>
        )}
      </section>
    </div>
  );
}

const choiceColumnStyle = {
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column" as const,
  borderRadius: "18px",
  border: "1px solid rgba(255,255,255,.09)",
  background: "rgba(2,9,23,.78)",
  padding: "12px",
  backdropFilter: "blur(10px)",
};

const eyebrowStyle = {
  margin: 0,
  color: "#8ee8ff",
  fontSize: "14px",
  fontWeight: 950,
  letterSpacing: "0.13em",
  textTransform: "uppercase" as const,
};

const sectionLabelStyle = {
  margin: 0,
  color: "rgba(255,255,255,0.78)",
  fontSize: "15px",
  fontWeight: 950,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};

const primaryButtonStyle = {
  minHeight: "40px",
  flexShrink: 0,
  padding: "0 15px",
  borderRadius: "11px",
  border: "1px solid rgba(126,232,255,0.32)",
  background: "rgba(83,215,255,0.14)",
  color: "#bff6ff",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "14px",
  fontWeight: 950,
  letterSpacing: "0.07em",
  textTransform: "uppercase" as const,
};
