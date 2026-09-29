"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useBudgetSimulation } from "../hooks/useBudgetSimulation";
import type { BankScreenMode } from "../lib/bank-types";
import { createBudgetScenarioSeed } from "../lib/budget-simulator-scenarios";
import type {
  BudgetDifficulty,
  BudgetScenarioKey,
} from "../lib/budget-simulator-types";
import BudgetSimulatorLanding from "./BudgetSimulatorLanding";
import BudgetSimulatorShell from "./BudgetSimulatorShell";
import DesktopLearningNotice from "./DesktopLearningNotice";

export default function BudgetSimulator({
  screenMode,
  isLoggedIn,
  onExit,
}: {
  screenMode: BankScreenMode;
  isLoggedIn: boolean;
  onExit: () => void;
}) {
  const simulation = useBudgetSimulation(isLoggedIn);
  const [insideRun, setInsideRun] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (screenMode === "mobile") return;

    const measure = () => {
      const node = viewportRef.current;
      if (!node) return;
      const top = node.getBoundingClientRect().top;
      setViewportHeight(Math.max(0, Math.floor(window.innerHeight - top - 8)));
    };

    measure();
    const id = window.requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("resize", measure);
    };
  }, [screenMode, insideRun, simulation.run?.currentStage, simulation.run?.id]);

  async function start(input: {
    scenarioKey: BudgetScenarioKey;
    difficulty: BudgetDifficulty;
    scenarioSeed: number;
  }) {
    const run = await simulation.start(input);
    if (!run) return false;
    setInsideRun(true);
    return true;
  }

  if (screenMode === "mobile") {
    return <DesktopLearningNotice kind="simulation" />;
  }

  const simulatorViewportStyle = {
    width: "100%",
    height: viewportHeight ? `${viewportHeight}px` : "calc(100dvh - 210px)",
    minHeight: 0,
    overflow: "hidden" as const,
    display: "flex",
    flexDirection: "column" as const,
  };

  if (insideRun && simulation.run) {
    return (
      <div ref={viewportRef} style={simulatorViewportStyle}>
        <BudgetSimulatorShell
          run={simulation.run}
          screenMode={screenMode}
          saving={simulation.saving}
          error={simulation.error}
          onSaveCheckpoint={simulation.saveCheckpoint}
          onRecordEvidence={simulation.recordEvidence}
          onCompleteRun={async () => Boolean(await simulation.complete())}
          onReplaySameMonth={async () => {
            const current = simulation.run;
            if (!current) return false;
            return Boolean(await simulation.start({
              scenarioKey: current.scenarioKey,
              difficulty: current.difficulty,
              scenarioSeed: current.scenarioSeed,
            }));
          }}
          onReplayFreshMonth={async () => {
            const current = simulation.run;
            if (!current) return false;
            return Boolean(await simulation.start({
              scenarioKey: current.scenarioKey,
              difficulty: current.difficulty,
              scenarioSeed: createBudgetScenarioSeed(),
            }));
          }}
          onExit={() => {
            setInsideRun(false);
            onExit();
          }}
          onAbandon={async () => {
            const success = await simulation.abandon();
            if (success) setInsideRun(false);
          }}
        />
      </div>
    );
  }

  return (
    <div ref={viewportRef} style={simulatorViewportStyle}>
      <BudgetSimulatorLanding
        screenMode={screenMode}
        isLoggedIn={isLoggedIn}
        run={simulation.run}
        loading={simulation.loading}
        saving={simulation.saving}
        error={simulation.error}
        onContinue={() => setInsideRun(true)}
        onStart={start}
      />
    </div>
  );
}
