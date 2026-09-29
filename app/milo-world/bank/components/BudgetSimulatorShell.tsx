"use client";

import { useEffect, useMemo, useState } from "react";
import type { BankScreenMode } from "../lib/bank-types";
import {
  createInitialBudgetAllocation,
  generateBudgetFinancialProfile,
  normaliseBudgetAllocation,
} from "../lib/budget-simulator-financial-model";
import { createInitialLiveMonthState } from "../lib/budget-simulator-live-month";
import { BUDGET_SIMULATOR_ASSETS } from "../lib/budget-simulator-assets";
import { buildBudgetResultsSummary } from "../lib/budget-simulator-results";
import {
  BUDGET_STAGES,
  getBudgetDifficulty,
  getBudgetScenario,
} from "../lib/budget-simulator-scenarios";
import type {
  BudgetAllocation,
  BudgetFinalWeekResult,
  BudgetSimulationRun,
  BudgetSimulationState,
  BudgetStageKey,
  BudgetStressTestKey,
} from "../lib/budget-simulator-types";
import BudgetBriefingStage from "./BudgetBriefingStage";
import BudgetFinancialDeskStage from "./BudgetFinancialDeskStage";
import BudgetBuildStage from "./BudgetBuildStage";
import BudgetForecastStage from "./BudgetForecastStage";
import BudgetLiveMonthStage from "./BudgetLiveMonthStage";
import BudgetFinalWeekStage from "./BudgetFinalWeekStage";
import BudgetReviewStage from "./BudgetReviewStage";

export default function BudgetSimulatorShell({
  run,
  screenMode,
  saving,
  error,
  onExit,
  onAbandon,
  onSaveCheckpoint,
  onRecordEvidence,
  onCompleteRun,
  onReplaySameMonth,
  onReplayFreshMonth,
}: {
  run: BudgetSimulationRun;
  screenMode: BankScreenMode;
  saving: boolean;
  error: string | null;
  onExit: () => void;
  onAbandon: () => Promise<void>;
  onSaveCheckpoint: (input: {
    currentStage: BudgetStageKey;
    currentDay: number;
    state: BudgetSimulationState;
  }) => Promise<BudgetSimulationRun | null>;
  onRecordEvidence: (runId: string) => Promise<boolean>;
  onCompleteRun: () => Promise<boolean>;
  onReplaySameMonth: () => Promise<boolean>;
  onReplayFreshMonth: () => Promise<boolean>;
}) {
  const isMobile = screenMode === "mobile";
  const scenario = getBudgetScenario(run.scenarioKey);
  const difficulty = getBudgetDifficulty(run.difficulty);
  const profile = useMemo(
    () =>
      generateBudgetFinancialProfile({
        scenarioKey: run.scenarioKey,
        difficulty: run.difficulty,
        scenarioSeed: run.scenarioSeed,
      }),
    [run.scenarioKey, run.difficulty, run.scenarioSeed],
  );

  const [draftState, setDraftState] = useState<BudgetSimulationState>(() =>
    hydrateState(run, profile),
  );

  useEffect(() => {
    setDraftState(hydrateState(run, profile));
  }, [run.id, run.checkpointVersion, profile]);

  const activeIndex = Math.max(
    0,
    BUDGET_STAGES.findIndex((stage) => stage.id === run.currentStage),
  );

  const inspectedItems = draftState.data.inspectedItems ?? [];
  const pinnedItems = draftState.data.pinnedItems ?? [];
  const allocation = normaliseBudgetAllocation(
    draftState.data.allocation,
    profile,
  );

  function patchData(patch: Partial<BudgetSimulationState["data"]>) {
    setDraftState((current) => ({
      ...current,
      data: {
        ...current.data,
        ...patch,
      },
    }));
  }

  async function advance(
    nextStage: BudgetStageKey,
    extra?: Partial<BudgetSimulationState["data"]>,
    nextDay = draftState.currentDay,
  ) {
    const nextState: BudgetSimulationState = {
      ...draftState,
      stage: nextStage,
      currentDay: nextDay,
      completedStages: uniqueStages([
        ...draftState.completedStages,
        run.currentStage,
      ]),
      data: {
        ...draftState.data,
        ...extra,
      },
    };

    const saved = await onSaveCheckpoint({
      currentStage: nextStage,
      currentDay: nextDay,
      state: nextState,
    });
    if (saved) setDraftState(saved.state);
  }

  async function saveCurrent() {
    const currentState: BudgetSimulationState = {
      ...draftState,
      stage: run.currentStage,
      currentDay: draftState.currentDay,
    };
    return onSaveCheckpoint({
      currentStage: run.currentStage,
      currentDay: draftState.currentDay,
      state: currentState,
    });
  }

  async function exitAndSave() {
    const saved = await saveCurrent();
    if (saved) onExit();
  }

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
          backgroundImage: `linear-gradient(180deg,rgba(2,8,20,.74),rgba(2,8,20,.90)), url(${BUDGET_SIMULATOR_ASSETS.background})`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
          backgroundColor: "rgba(4,12,30,0.92)",
          boxShadow: "0 28px 80px rgba(0,0,0,.34)",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            padding: isMobile ? "12px" : "13px 16px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "center",
            justifyContent: "space-between",
            gap: "9px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(2,8,20,.58)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
              <span style={eyebrowStyle}>Budget Simulator</span>
              <span style={badgeStyle}>{difficulty.title}</span>
              <span style={badgeStyle}>{scenario.title}</span>
            </div>
            <h2
              style={{
                margin: "4px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontWeight: 500,
                fontSize: isMobile ? "22px" : "28px",
              }}
            >
              Build a Budget That Survives
            </h2>
          </div>

          <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
            {run.status === "completed" ? (
              <button type="button" onClick={onExit} style={secondaryButtonStyle}>
                Back to Practice
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void exitAndSave()}
                  disabled={saving}
                  style={secondaryButtonStyle}
                >
                  {saving ? "Saving..." : "Exit & save"}
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
              </>
            )}
          </div>
        </header>

        <div
          aria-label="Budget Simulator stages"
          style={{
            padding: isMobile ? "8px" : "9px 12px",
            display: "grid",
            gridTemplateColumns: isMobile
              ? "repeat(7, minmax(42px, 1fr))"
              : "repeat(7, minmax(0, 1fr))",
            gap: "5px",
            overflowX: isMobile ? "auto" : "visible",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(2,8,20,.46)",
            backdropFilter: "blur(12px)",
          }}
        >
          {BUDGET_STAGES.map((stage, index) => {
            const active = index === activeIndex;
            const complete = draftState.completedStages.includes(stage.id) || index < activeIndex;
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
                  padding: "6px 5px",
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
                  {complete && !active ? "✓" : stage.number}
                </strong>
                <span
                  style={{
                    display: "block",
                    marginTop: "2px",
                    color: active ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.34)",
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

        <div style={{ padding: isMobile ? "13px" : "16px", background: "linear-gradient(180deg,rgba(2,8,20,.28),rgba(2,8,20,.56))" }}>
          {run.currentStage === "briefing" ? (
            <BudgetBriefingStage
              run={run}
              profile={profile}
              screenMode={screenMode}
              saving={saving}
              onContinue={() => advance("financial_desk")}
            />
          ) : run.currentStage === "financial_desk" ? (
            <BudgetFinancialDeskStage
              profile={profile}
              screenMode={screenMode}
              inspectedItems={inspectedItems}
              pinnedItems={pinnedItems}
              saving={saving}
              onInspectedChange={(next) => patchData({ inspectedItems: next })}
              onPinnedChange={(next) => patchData({ pinnedItems: next })}
              onContinue={() => advance("build_budget", { allocation })}
            />
          ) : run.currentStage === "build_budget" ? (
            <BudgetBuildStage
              profile={profile}
              screenMode={screenMode}
              allocation={allocation}
              pinnedItems={pinnedItems}
              saving={saving}
              onAllocationChange={(next: BudgetAllocation) => patchData({ allocation: next })}
              onPinnedChange={(next) => patchData({ pinnedItems: next })}
              onContinue={() =>
                advance("forecast", {
                  allocation,
                  firstPlan: { ...allocation },
                  forecastViewedDay: 1,
                  stressTestsRun: [],
                  forecastConfirmed: false,
                })
              }
            />
          ) : run.currentStage === "forecast" ? (
            <BudgetForecastStage
              profile={profile}
              allocation={draftState.data.firstPlan ?? allocation}
              screenMode={screenMode}
              selectedDay={draftState.data.forecastViewedDay ?? 1}
              stressTestsRun={draftState.data.stressTestsRun ?? []}
              saving={saving}
              onSelectedDayChange={(day) => patchData({ forecastViewedDay: day })}
              onStressTestsChange={(next: BudgetStressTestKey[]) => patchData({ stressTestsRun: next })}
              onAdjustPlan={async () => {
                const nextState: BudgetSimulationState = {
                  ...draftState,
                  stage: "build_budget",
                  currentDay: 1,
                  completedStages: draftState.completedStages.filter(
                    (stage) => !["forecast", "live_month", "final_week", "review"].includes(stage),
                  ),
                  data: {
                    ...draftState.data,
                    forecastViewedDay: 1,
                    stressTestsRun: [],
                    forecastConfirmed: false,
                  },
                };
                const saved = await onSaveCheckpoint({
                  currentStage: "build_budget",
                  currentDay: 1,
                  state: nextState,
                });
                if (saved) setDraftState(saved.state);
              }}
              onConfirm={() =>
                advance(
                  "live_month",
                  { forecastConfirmed: true },
                  1,
                )
              }
            />
          ) : run.currentStage === "live_month" ? (
            <BudgetLiveMonthStage
              profile={profile}
              firstPlan={draftState.data.firstPlan ?? allocation}
              liveState={
                draftState.data.liveMonth ??
                createInitialLiveMonthState({
                  profile,
                  scenarioKey: run.scenarioKey,
                  difficulty: run.difficulty,
                  scenarioSeed: run.scenarioSeed,
                  allocation: draftState.data.firstPlan ?? allocation,
                })
              }
              currentDay={draftState.currentDay}
              scenarioSeed={run.scenarioSeed}
              screenMode={screenMode}
              saving={saving}
              onStateChange={(next) => patchData({ liveMonth: next })}
              onCheckpoint={async (next, day) => {
                const nextState: BudgetSimulationState = {
                  ...draftState,
                  stage: "live_month",
                  currentDay: day,
                  data: {
                    ...draftState.data,
                    liveMonth: next,
                  },
                };
                const saved = await onSaveCheckpoint({
                  currentStage: "live_month",
                  currentDay: day,
                  state: nextState,
                });
                if (saved) setDraftState(saved.state);
                return Boolean(saved);
              }}
              onComplete={async (next) => {
                await advance(
                  "final_week",
                  {
                    liveMonth: next,
                    liveMonthCompleted: true,
                    finalWeekOpeningAllocation: { ...next.allocation },
                    finalWeekAllocation: { ...next.allocation },
                    finalWeekDecisionFactors: [],
                    finalWeekConfidence: 65,
                  },
                  25,
                );
              }}
            />
          ) : run.currentStage === "final_week" && draftState.data.liveMonth ? (
            <BudgetFinalWeekStage
              profile={profile}
              liveMonth={draftState.data.liveMonth}
              openingAllocation={
                draftState.data.finalWeekOpeningAllocation ??
                draftState.data.liveMonth.allocation
              }
              allocation={
                draftState.data.finalWeekAllocation ??
                draftState.data.finalWeekOpeningAllocation ??
                draftState.data.liveMonth.allocation
              }
              selectedChoiceId={draftState.data.finalWeekChoiceId ?? null}
              selectedFactors={draftState.data.finalWeekDecisionFactors ?? []}
              confidence={draftState.data.finalWeekConfidence ?? 65}
              scenarioSeed={run.scenarioSeed}
              scenarioKey={run.scenarioKey}
              difficulty={run.difficulty}
              screenMode={screenMode}
              saving={saving}
              onAllocationChange={(next) => patchData({ finalWeekAllocation: next })}
              onChoiceChange={(next) => patchData({ finalWeekChoiceId: next })}
              onFactorsChange={(next) => patchData({ finalWeekDecisionFactors: next })}
              onConfidenceChange={(next) => patchData({ finalWeekConfidence: next })}
              onComplete={async (result: BudgetFinalWeekResult) => {
                const finalData = {
                  ...draftState.data,
                  finalWeekAllocation: { ...result.decisionAllocation },
                  finalWeekChoiceId: result.choiceId,
                  finalWeekDecisionFactors: result.selectedFactors,
                  finalWeekConfidence: result.confidence,
                  finalWeekResult: result,
                  finalWeekCompleted: true,
                };
                const summary = buildBudgetResultsSummary({
                  data: finalData,
                  result,
                });
                const nextState: BudgetSimulationState = {
                  ...draftState,
                  stage: "review",
                  currentDay: 30,
                  completedStages: uniqueStages([
                    ...draftState.completedStages,
                    "final_week",
                  ]),
                  data: {
                    ...finalData,
                    resultsSummary: summary,
                  },
                };
                const saved = await onSaveCheckpoint({
                  currentStage: "review",
                  currentDay: 30,
                  state: nextState,
                });
                if (saved) {
                  setDraftState(saved.state);
                  await onRecordEvidence(saved.id);
                }
              }}
            />
          ) : run.currentStage === "review" && draftState.data.finalWeekResult && draftState.data.resultsSummary && draftState.data.liveMonth ? (
            <BudgetReviewStage
              firstPlan={
                draftState.data.firstPlan ??
                draftState.data.finalWeekResult.openingAllocation
              }
              result={draftState.data.finalWeekResult}
              summary={draftState.data.resultsSummary}
              profile={profile}
              liveMonth={draftState.data.liveMonth}
              scenarioSeed={run.scenarioSeed}
              scenarioKey={run.scenarioKey}
              difficulty={run.difficulty}
              screenMode={screenMode}
              completed={run.status === "completed"}
              completion={draftState.data.completion}
              saving={saving}
              onComplete={onCompleteRun}
              onReplaySameMonth={onReplaySameMonth}
              onReplayFreshMonth={onReplayFreshMonth}
              onExit={onExit}
            />
          ) : (
            <ComingNextStage
              stage={run.currentStage}
              screenMode={screenMode}
              allocation={
                draftState.data.finalWeekOpeningAllocation ??
                draftState.data.liveMonth?.allocation ??
                draftState.data.firstPlan ??
                allocation
              }
            />
          )}

          {error && (
            <p
              role="alert"
              style={{
                margin: "10px 0 0",
                borderRadius: "12px",
                border: "1px solid rgba(255,130,130,.15)",
                background: "rgba(255,90,90,.05)",
                padding: "9px 11px",
                color: "#ffc1c1",
                fontSize: "8px",
              }}
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function ComingNextStage({
  stage,
  screenMode,
  allocation,
}: {
  stage: BudgetStageKey;
  screenMode: BankScreenMode;
  allocation: BudgetAllocation;
}) {
  const isMobile = screenMode === "mobile";
  const stageLabel = BUDGET_STAGES.find((item) => item.id === stage)?.label ?? "Next stage";
  return (
    <div
      style={{
        minHeight: isMobile ? "280px" : "330px",
        display: "grid",
        placeItems: "center",
        borderRadius: "20px",
        border: "1px solid rgba(184,168,255,.12)",
        background: "radial-gradient(circle at 50% 35%,rgba(184,168,255,.10),transparent 38%),rgba(5,11,27,.68)",
        padding: "20px",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: "620px" }}>
        <p style={{ ...eyebrowStyle, color: "#c3b5ff" }}>First budget saved</p>
        <h3
          style={{
            margin: "6px 0 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: isMobile ? "27px" : "34px",
            fontWeight: 500,
          }}
        >
          {stage === "final_week" ? "Live Month complete." : `${stageLabel} is ready.`}
        </h3>
        <p style={{ margin: "9px auto 0", color: "rgba(255,255,255,.42)", fontSize: "9px", lineHeight: 1.6 }}>
          {stage === "final_week"
            ? "Your decisions, rebalancing and linked consequences are saved. Phase 4A-5 will build the final multi-factor challenge from this position."
            : "Your saved allocation and simulation state will carry into the next stage."}
        </p>
        <div style={{ marginTop: "14px", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px" }}>
          {Object.entries(allocation).map(([key, value]) => (
            <span key={key} style={miniAllocationStyle}>
              {key.replaceAll("_", " ")} · {Number(value).toLocaleString()} DT
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function hydrateState(run: BudgetSimulationRun, profile: ReturnType<typeof generateBudgetFinancialProfile>) {
  return {
    ...run.state,
    stage: run.currentStage,
    currentDay: run.currentDay,
    data: {
      ...run.state.data,
      inspectedItems: run.state.data.inspectedItems ?? [],
      pinnedItems: run.state.data.pinnedItems ?? [],
      allocation: normaliseBudgetAllocation(
        run.state.data.allocation ?? createInitialBudgetAllocation(profile),
        profile,
      ),
      forecastViewedDay: run.state.data.forecastViewedDay ?? 1,
      stressTestsRun: run.state.data.stressTestsRun ?? [],
      forecastConfirmed: run.state.data.forecastConfirmed ?? false,
      liveMonth:
        run.state.data.liveMonth ??
        (run.currentStage === "live_month" || run.currentStage === "final_week" || run.currentStage === "review"
          ? createInitialLiveMonthState({
              profile,
              scenarioKey: run.scenarioKey,
              difficulty: run.difficulty,
              scenarioSeed: run.scenarioSeed,
              allocation:
                run.state.data.firstPlan ??
                normaliseBudgetAllocation(
                  run.state.data.allocation ?? createInitialBudgetAllocation(profile),
                  profile,
                ),
            })
          : undefined),
      liveMonthCompleted: run.state.data.liveMonthCompleted ?? false,
      finalWeekOpeningAllocation: run.state.data.finalWeekOpeningAllocation,
      finalWeekAllocation:
        run.state.data.finalWeekAllocation ??
        run.state.data.finalWeekOpeningAllocation ??
        run.state.data.liveMonth?.allocation,
      finalWeekChoiceId: run.state.data.finalWeekChoiceId,
      finalWeekDecisionFactors: run.state.data.finalWeekDecisionFactors ?? [],
      finalWeekConfidence: run.state.data.finalWeekConfidence ?? 65,
      finalWeekResult: run.state.data.finalWeekResult,
      finalWeekCompleted: run.state.data.finalWeekCompleted ?? false,
      resultsSummary: run.state.data.resultsSummary,
      completion: run.state.data.completion,
    },
  } satisfies BudgetSimulationState;
}

function uniqueStages(items: BudgetStageKey[]) {
  return Array.from(new Set(items));
}

const eyebrowStyle = {
  color: "#8ee8ff",
  fontSize: "7px",
  fontWeight: 950,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
};

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

const miniAllocationStyle = {
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,.07)",
  background: "rgba(255,255,255,.02)",
  padding: "6px 8px",
  color: "rgba(255,255,255,.46)",
  fontSize: "7px",
  textTransform: "capitalize" as const,
};
