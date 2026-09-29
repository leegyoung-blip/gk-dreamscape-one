"use client";

import { useCallback, useEffect, useState } from "react";
import {
  abandonBudgetSimulation,
  completeBudgetSimulation,
  loadActiveBudgetSimulation,
  recordBudgetSimulationEvidence,
  saveBudgetSimulationCheckpoint,
  startBudgetSimulation,
} from "../lib/budget-simulator-api";
import type {
  BudgetDifficulty,
  BudgetScenarioKey,
  BudgetSimulationRun,
  BudgetSimulationState,
  BudgetStageKey,
} from "../lib/budget-simulator-types";

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Something went wrong in the Budget Simulator.";
}

export function useBudgetSimulation(isLoggedIn: boolean) {
  const [run, setRun] = useState<BudgetSimulationRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setRun(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setRun(await loadActiveBudgetSimulation());
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const start = useCallback(
    async (input: {
      scenarioKey: BudgetScenarioKey;
      difficulty: BudgetDifficulty;
      scenarioSeed: number;
    }) => {
      if (!isLoggedIn) {
        setError("Sign in to start the Budget Simulator.");
        return null;
      }

      setSaving(true);
      setError(null);
      try {
        const nextRun = await startBudgetSimulation(input);
        setRun(nextRun);
        return nextRun;
      } catch (caught) {
        setError(errorMessage(caught));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [isLoggedIn],
  );

  const saveCheckpoint = useCallback(
    async (input: {
      currentStage: BudgetStageKey;
      currentDay: number;
      state: BudgetSimulationState;
    }) => {
      if (!run) return null;

      setSaving(true);
      setError(null);
      try {
        const nextRun = await saveBudgetSimulationCheckpoint({
          run,
          ...input,
        });
        setRun(nextRun);
        return nextRun;
      } catch (caught) {
        setError(errorMessage(caught));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [run],
  );


  const recordEvidence = useCallback(async (runId: string) => {
    setSaving(true);
    setError(null);
    try {
      await recordBudgetSimulationEvidence(runId);
      return true;
    } catch (caught) {
      setError(errorMessage(caught));
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const complete = useCallback(async () => {
    if (!run) return null;

    setSaving(true);
    setError(null);
    try {
      const completedRun = await completeBudgetSimulation(run.id);
      setRun(completedRun);
      return completedRun;
    } catch (caught) {
      setError(errorMessage(caught));
      return null;
    } finally {
      setSaving(false);
    }
  }, [run]);

  const abandon = useCallback(async () => {
    if (!run) return true;

    setSaving(true);
    setError(null);
    try {
      await abandonBudgetSimulation(run.id);
      setRun(null);
      return true;
    } catch (caught) {
      setError(errorMessage(caught));
      return false;
    } finally {
      setSaving(false);
    }
  }, [run]);

  return {
    run,
    loading,
    saving,
    error,
    refresh,
    start,
    saveCheckpoint,
    recordEvidence,
    complete,
    abandon,
  };
}
