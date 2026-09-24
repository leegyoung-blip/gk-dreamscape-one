"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MONEY_LAB_LESSONS } from "../lib/money-lab-content";
import {
  EMPTY_FINANCIAL_PROGRESS,
  type FinancialProgressEvent,
  type FinancialProgressSnapshot,
  type FinancialSkillEvidence,
} from "../lib/financial-progress-types";

function messageFrom(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "Could not load your financial progress.";
}

function lessonTitle(key: string) {
  return MONEY_LAB_LESSONS.find((lesson) => lesson.key === key)?.title ?? "Financial Foundations lesson";
}

export function useFinancialProgress(isLoggedIn: boolean) {
  const [snapshot, setSnapshot] = useState<FinancialProgressSnapshot>(EMPTY_FINANCIAL_PROGRESS);
  const [loading, setLoading] = useState(isLoggedIn);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setSnapshot(EMPTY_FINANCIAL_PROGRESS);
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
        setSnapshot(EMPTY_FINANCIAL_PROGRESS);
        setLoading(false);
        return;
      }

      const [lessonResult, goalsResult, bondsResult] = await Promise.all([
        supabase
          .from("milo_bank_money_lab_progress")
          .select("lesson_key,completed_at,reward_amount")
          .eq("user_id", user.id),
        supabase
          .from("milo_bank_savings_goals")
          .select("id,name,status,created_at,completed_at")
          .eq("user_id", user.id),
        supabase
          .from("milo_bank_bond_holdings")
          .select("id,bond_name,status,purchased_at,settled_at")
          .eq("user_id", user.id),
      ]);

      if (lessonResult.error) throw lessonResult.error;
      if (goalsResult.error) throw goalsResult.error;
      if (bondsResult.error) throw bondsResult.error;

      const lessons = (lessonResult.data || []) as Array<{
        lesson_key: string;
        completed_at: string;
        reward_amount: number | string;
      }>;
      const goals = (goalsResult.data || []) as Array<{
        id: string;
        name: string;
        status: string;
        created_at: string;
        completed_at: string | null;
      }>;
      const bonds = (bondsResult.data || []) as Array<{
        id: string;
        bond_name: string;
        status: string;
        purchased_at: string;
        settled_at: string | null;
      }>;

      const completedKeys = new Set(lessons.map((item) => item.lesson_key));
      const goalsReached = goals.filter((goal) => Boolean(goal.completed_at)).length;
      const returnsCollected = bonds.filter((bond) => bond.status === "settled").length;

      const history: FinancialProgressEvent[] = [
        ...lessons.map((item) => ({
          id: `lesson-${item.lesson_key}`,
          kind: "lesson" as const,
          title: lessonTitle(item.lesson_key),
          detail: "Financial Foundations lesson completed",
          occurredAt: item.completed_at,
        })),
        ...goals.map((goal) => ({
          id: `goal-${goal.id}`,
          kind: "savings_goal" as const,
          title: goal.name,
          detail: "Savings Goal created",
          occurredAt: goal.created_at,
        })),
        ...goals
          .filter((goal) => Boolean(goal.completed_at))
          .map((goal) => ({
            id: `goal-reached-${goal.id}`,
            kind: "goal_reached" as const,
            title: goal.name,
            detail: "Savings Goal target reached",
            occurredAt: goal.completed_at as string,
          })),
        ...bonds.map((bond) => ({
          id: `bond-${bond.id}`,
          kind: "bond_started" as const,
          title: bond.bond_name,
          detail: "Bank Bond started",
          occurredAt: bond.purchased_at,
        })),
        ...bonds
          .filter((bond) => bond.status === "settled" && Boolean(bond.settled_at))
          .map((bond) => ({
            id: `bond-return-${bond.id}`,
            kind: "bond_return" as const,
            title: bond.bond_name,
            detail: "Bond return collected",
            occurredAt: bond.settled_at as string,
          })),
      ].sort(
        (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
      );

      const skills: FinancialSkillEvidence[] = [
        {
          id: "money-management",
          title: "Money Management",
          description: "Priorities, available resources and everyday money choices.",
          evidence: [
            completedKeys.has("needs-vs-wants") ? "Needs vs wants lesson completed" : null,
            goals.length > 0 ? "Savings Goal created" : null,
          ].filter(Boolean) as string[],
          upcoming: "More evidence will come from budgeting and decision simulations.",
        },
        {
          id: "saving-planning",
          title: "Saving & Planning",
          description: "Goals, reserves and planning ahead for future needs.",
          evidence: [
            completedKeys.has("saving-basics") ? "Saving lesson completed" : null,
            goalsReached > 0 ? "Savings Goal target reached" : null,
          ].filter(Boolean) as string[],
          upcoming: "More evidence will come from longer planning challenges.",
        },
        {
          id: "budgeting",
          title: "Budgeting",
          description: "Allocating limited resources across competing priorities.",
          evidence: [],
          upcoming: "The Budget Simulator will begin assessing this skill.",
        },
        {
          id: "risk-return",
          title: "Risk & Return",
          description: "Understanding uncertainty, fixed returns and changing value.",
          evidence: [
            completedKeys.has("risk-and-return") ? "Risk & return lesson completed" : null,
            completedKeys.has("bond-basics") ? "Bond lesson completed" : null,
            bonds.length > 0 ? "Bank Bond experience recorded" : null,
          ].filter(Boolean) as string[],
          upcoming: "Risk Lab and Exchange activities will add stronger evidence later.",
        },
        {
          id: "financial-decisions",
          title: "Financial Decisions",
          description: "Comparing options, trade-offs and consequences before acting.",
          evidence: [
            completedKeys.has("saving-vs-investing") ? "Saving vs investing lesson completed" : null,
            completedKeys.has("needs-vs-wants") ? "Priorities lesson completed" : null,
          ].filter(Boolean) as string[],
          upcoming: "Case studies and branching decisions will add deeper evidence later.",
        },
      ];

      setSnapshot({
        foundationCompleted: lessons.length,
        foundationTotal: MONEY_LAB_LESSONS.length,
        foundationRewardEarned: lessons.reduce(
          (sum, item) => sum + Number(item.reward_amount || 0),
          0,
        ),
        goalsCreated: goals.length,
        goalsReached,
        bondsStarted: bonds.length,
        returnsCollected,
        appliedActions: goals.length + goalsReached + bonds.length + returnsCollected,
        history,
        skills,
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

    for (const eventName of events) window.addEventListener(eventName, refresh);
    return () => {
      for (const eventName of events) window.removeEventListener(eventName, refresh);
    };
  }, [refresh]);

  return {
    ...snapshot,
    loading,
    error,
    refresh,
  };
}
