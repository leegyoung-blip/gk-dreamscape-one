"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  EMPTY_BANK_ACHIEVEMENTS,
  type BankAchievement,
  type BankAchievementSnapshot,
} from "../lib/bank-achievements";
import { MONEY_LAB_LESSONS } from "../lib/money-lab-content";

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "Could not load Bank milestones.";
}

export function useBankAchievements(isLoggedIn: boolean) {
  const [snapshot, setSnapshot] = useState<BankAchievementSnapshot>(
    EMPTY_BANK_ACHIEVEMENTS,
  );
  const [loading, setLoading] = useState(isLoggedIn);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setSnapshot(EMPTY_BANK_ACHIEVEMENTS);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSnapshot(EMPTY_BANK_ACHIEVEMENTS);
        setLoading(false);
        return;
      }

      const [goalsResult, bondsResult, labResult] = await Promise.all([
        supabase
          .from("milo_bank_savings_goals")
          .select("status,completed_at")
          .eq("user_id", user.id),
        supabase
          .from("milo_bank_bond_holdings")
          .select("status")
          .eq("user_id", user.id),
        supabase
          .from("milo_bank_money_lab_progress")
          .select("lesson_key")
          .eq("user_id", user.id),
      ]);

      if (goalsResult.error) throw goalsResult.error;
      if (bondsResult.error) throw bondsResult.error;
      if (labResult.error) throw labResult.error;

      const goals = (goalsResult.data || []) as Array<{
        status: string;
        completed_at: string | null;
      }>;
      const bonds = (bondsResult.data || []) as Array<{ status: string }>;
      const lab = (labResult.data || []) as Array<{ lesson_key: string }>;

      const hasGoal = goals.length > 0;
      const reachedGoal = goals.some((goal) => Boolean(goal.completed_at));
      const hasBond = bonds.length > 0;
      const collectedReturn = bonds.some((bond) => bond.status === "settled");
      const labStarted = lab.length > 0;
      const labMastered = lab.length >= MONEY_LAB_LESSONS.length;

      const unlocks: Record<string, boolean> = {
        "goal-setter": hasGoal,
        "goal-reached": reachedGoal,
        "first-bond": hasBond,
        "return-collector": collectedReturn,
        "lab-starter": labStarted,
        "money-master": labMastered,
      };

      const achievements: BankAchievement[] =
        EMPTY_BANK_ACHIEVEMENTS.achievements.map((achievement) => ({
          ...achievement,
          unlocked: Boolean(unlocks[achievement.id]),
        }));

      setSnapshot({
        achievements,
        unlockedCount: achievements.filter((item) => item.unlocked).length,
        totalCount: achievements.length,
      });
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    refresh();

    if (typeof window === "undefined") return;

    const events = [
      "milo-bank-savings-updated",
      "milo-bank-bonds-updated",
      "milo-bank-money-lab-updated",
      "dream-tokens-updated",
    ];

    for (const eventName of events) {
      window.addEventListener(eventName, refresh);
    }

    return () => {
      for (const eventName of events) {
        window.removeEventListener(eventName, refresh);
      }
    };
  }, [refresh]);

  const progressPercent = useMemo(
    () =>
      snapshot.totalCount === 0
        ? 0
        : Math.round((snapshot.unlockedCount / snapshot.totalCount) * 100),
    [snapshot.totalCount, snapshot.unlockedCount],
  );

  return {
    ...snapshot,
    progressPercent,
    loading,
    error,
    refresh,
  };
}
