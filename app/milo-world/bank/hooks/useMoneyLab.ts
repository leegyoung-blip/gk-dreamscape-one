"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  completeMoneyLabLesson,
  listMoneyLabProgress,
} from "../lib/money-lab-api";
import type {
  MoneyLabCompletionResult,
  MoneyLabLessonKey,
  MoneyLabProgress,
} from "../lib/money-lab-types";

function messageFrom(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = (error as { message: string }).message;

    if (
      /milo_bank_money_lab_progress|milo_bank_money_lab_lessons|complete_milo_bank_money_lab_lesson/i.test(
        message,
      )
    ) {
      return "Money Lab setup is missing. Run PHASE-4A-MONEY-LAB.sql and refresh the page.";
    }

    if (/permission denied|row-level security|rls/i.test(message)) {
      return "Money Lab could not access your progress. Check the Phase 4A Money Lab RLS policies and refresh the page.";
    }

    return message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return "Money Lab could not be loaded.";
}

export function useMoneyLab(isLoggedIn: boolean) {
  const [progress, setProgress] = useState<MoneyLabProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setProgress([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setProgress(await listMoneyLabProgress());
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const completedKeys = useMemo(
    () => new Set(progress.map((item) => item.lessonKey)),
    [progress],
  );

  const totalRewardEarned = useMemo(
    () => progress.reduce((sum, item) => sum + item.rewardAmount, 0),
    [progress],
  );

  const completeLesson = useCallback(
    async (lessonKey: MoneyLabLessonKey): Promise<MoneyLabCompletionResult> => {
      setActionLoading(true);
      setError(null);
      try {
        const result = await completeMoneyLabLesson(lessonKey);
        setProgress((current) => {
          const without = current.filter(
            (item) => item.lessonKey !== result.lessonKey,
          );
          return [...without, result].sort(
            (a, b) =>
              new Date(a.completedAt).getTime() -
              new Date(b.completedAt).getTime(),
          );
        });

        if (result.newlyCompleted) {
          window.dispatchEvent(new Event("dream-tokens-updated"));
          window.dispatchEvent(new Event("milo-bank-money-lab-updated"));
        }

        return result;
      } catch (caught) {
        const message = messageFrom(caught);
        setError(message);
        throw caught instanceof Error ? caught : new Error(message);
      } finally {
        setActionLoading(false);
      }
    },
    [],
  );

  return {
    progress,
    completedKeys,
    completedCount: progress.length,
    totalRewardEarned,
    loading,
    actionLoading,
    error,
    refresh,
    completeLesson,
  };
}
