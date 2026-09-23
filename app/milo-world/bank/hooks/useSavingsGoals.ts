"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  archiveSavingsGoal,
  createSavingsGoal,
  depositToSavings,
  listSavingsGoals,
  listSavingsMovements,
  updateSavingsGoal,
  withdrawFromSavings,
} from "../lib/savings-api";
import type {
  CreateSavingsGoalInput,
  SavingsGoal,
  SavingsMovement,
  UpdateSavingsGoalInput,
} from "../lib/savings-types";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message || "Could not update savings.");
  }
  return "Could not update savings.";
}

export function useSavingsGoals(enabled = true) {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [movements, setMovements] = useState<SavingsMovement[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setGoals([]);
      setMovements([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [nextGoals, nextMovements] = await Promise.all([
        listSavingsGoals(),
        listSavingsMovements(),
      ]);
      setGoals(nextGoals);
      setMovements(nextMovements);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const runMutation = useCallback(
    async <T,>(operation: () => Promise<T>) => {
      if (!enabled) throw new Error("Log in to use savings goals.");

      setMutating(true);
      setError(null);

      try {
        const result = await operation();
        await refresh();

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("milo-bank-savings-updated"));
          window.dispatchEvent(new Event("dream-tokens-updated"));
        }

        return result;
      } catch (nextError) {
        setError(getErrorMessage(nextError));
        throw nextError;
      } finally {
        setMutating(false);
      }
    },
    [enabled, refresh],
  );

  const savingsTotal = useMemo(
    () =>
      goals
        .filter((goal) => goal.status !== "archived")
        .reduce((sum, goal) => sum + goal.savedAmount, 0),
    [goals],
  );

  const activeGoalCount = useMemo(
    () => goals.filter((goal) => goal.status === "active").length,
    [goals],
  );

  return {
    goals,
    movements,
    loading,
    mutating,
    error,
    savingsTotal,
    activeGoalCount,
    canCreateGoal: activeGoalCount < 3,
    refresh,
    createGoal: (input: CreateSavingsGoalInput) =>
      runMutation(() => createSavingsGoal(input)),
    updateGoal: (input: UpdateSavingsGoalInput) =>
      runMutation(() => updateSavingsGoal(input)),
    deposit: (goalId: string, amount: number) =>
      runMutation(() => depositToSavings(goalId, amount)),
    withdraw: (goalId: string, amount: number) =>
      runMutation(() => withdrawFromSavings(goalId, amount)),
    archive: (goalId: string) =>
      runMutation(() => archiveSavingsGoal(goalId)),
  };
}
