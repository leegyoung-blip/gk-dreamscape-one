"use client";

import { useState } from "react";
import { useBudgetSimulation } from "../hooks/useBudgetSimulation";
import type { BankScreenMode } from "../lib/bank-types";
import type {
  BudgetDifficulty,
  BudgetScenarioKey,
} from "../lib/budget-simulator-types";
import BudgetSimulatorLanding from "./BudgetSimulatorLanding";
import BudgetSimulatorShell from "./BudgetSimulatorShell";

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

  if (insideRun && simulation.run) {
    return (
      <BudgetSimulatorShell
        run={simulation.run}
        screenMode={screenMode}
        saving={simulation.saving}
        error={simulation.error}
        onExit={() => {
          setInsideRun(false);
          onExit();
        }}
        onAbandon={async () => {
          const success = await simulation.abandon();
          if (success) setInsideRun(false);
        }}
      />
    );
  }

  return (
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
  );
}
