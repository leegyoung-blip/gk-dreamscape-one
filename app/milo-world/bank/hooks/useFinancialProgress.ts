"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  getMiloFinanceSkillSummary,
  listMiloFinanceSkillEvidence,
} from "../lib/financial-skill-evidence-api";
import { listMiloFinanceCourseProgressOverview } from "../lib/financial-course-completion-api";
import type { MiloFinanceCourseProgressOverview } from "../lib/financial-course-completion-types";
import type {
  MiloFinanceSkillEvidenceRecord,
  MiloFinanceSkillSummary,
} from "../lib/financial-skill-evidence-types";
import {
  EMPTY_FINANCIAL_PROGRESS,
  type FinancialProgressEvent,
  type FinancialProgressSnapshot,
  type FinancialSkillEvidence,
} from "../lib/financial-progress-types";

function messageFrom(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Could not load your financial progress.";
}

function stageLabel(summary: {
  demonstratedCount: number;
  appliedCount: number;
  evidenceCount: number;
}): FinancialSkillEvidence["stageLabel"] {
  if (summary.demonstratedCount > 0) return "Demonstrated evidence";
  if (summary.appliedCount > 0) return "Applied evidence";
  if (summary.evidenceCount > 0) return "Evidence observed";
  return "Not assessed yet";
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

      const [
        lessonCatalogResult,
        lessonProgressResult,
        goalsResult,
        bondsResult,
        skillSummaryResult,
        evidenceRecordsResult,
        courseOverviewResult,
      ] = await Promise.all([
        supabase
          .from("milo_finance_lessons")
          .select("id,course_id,lesson_key,title,reward_dt")
          .eq("status", "published"),
        supabase
          .from("milo_finance_lesson_progress")
          .select("lesson_id,status,reward_issued,completed_at")
          .eq("user_id", user.id),
        supabase
          .from("milo_bank_savings_goals")
          .select("id,name,status,created_at,completed_at")
          .eq("user_id", user.id),
        supabase
          .from("milo_bank_bond_holdings")
          .select("id,bond_name,status,purchased_at,settled_at")
          .eq("user_id", user.id),
        getMiloFinanceSkillSummary(),
        listMiloFinanceSkillEvidence(),
        listMiloFinanceCourseProgressOverview(),
      ]);

      if (lessonCatalogResult.error) throw lessonCatalogResult.error;
      if (lessonProgressResult.error) throw lessonProgressResult.error;
      if (goalsResult.error) throw goalsResult.error;
      if (bondsResult.error) throw bondsResult.error;

      const skillSummary: MiloFinanceSkillSummary[] = skillSummaryResult;
      const evidenceRecords: MiloFinanceSkillEvidenceRecord[] = evidenceRecordsResult;
      const courseOverview: MiloFinanceCourseProgressOverview[] = courseOverviewResult;

      const lessons = (lessonCatalogResult.data ?? []) as Array<{
        id: string;
        course_id: string;
        lesson_key: string;
        title: string;
        reward_dt: number | string;
      }>;
      const lessonById = new Map(lessons.map((item) => [item.id, item]));
      const foundationLessonIds = new Set(
        lessons
          .filter((item) => item.course_id === "financial-foundations")
          .map((item) => item.id),
      );
      const progressRows = (lessonProgressResult.data ?? []) as Array<{
        lesson_id: string;
        status: string;
        reward_issued: number | string;
        completed_at: string | null;
      }>;
      const completed = progressRows.filter((item) => item.status === "completed");
      const foundationCompletedRows = completed.filter((item) =>
        foundationLessonIds.has(item.lesson_id),
      );
      const goals = (goalsResult.data ?? []) as Array<{
        id: string;
        name: string;
        status: string;
        created_at: string;
        completed_at: string | null;
      }>;
      const bonds = (bondsResult.data ?? []) as Array<{
        id: string;
        bond_name: string;
        status: string;
        purchased_at: string;
        settled_at: string | null;
      }>;
      const goalsReached = goals.filter((goal) => Boolean(goal.completed_at)).length;
      const returnsCollected = bonds.filter((bond) => bond.status === "settled").length;
      const completedCourses = courseOverview.filter(
        (course: MiloFinanceCourseProgressOverview) => course.isCompleted,
      ).length;

      const history: FinancialProgressEvent[] = [
        ...completed
          .filter((item) => Boolean(item.completed_at))
          .map((item) => ({
            id: `lesson-${item.lesson_id}`,
            kind: "lesson" as const,
            title: lessonById.get(item.lesson_id)?.title ?? "Milo Finance lesson",
            detail: "Interactive Milo Finance lesson completed",
            occurredAt: item.completed_at as string,
          })),
        ...courseOverview
          .filter(
            (course: MiloFinanceCourseProgressOverview) =>
              course.isCompleted && Boolean(course.completedAt),
          )
          .map((course: MiloFinanceCourseProgressOverview) => ({
            id: `course-${course.courseId}`,
            kind: "course_completed" as const,
            title: course.title,
            detail: "Milo Finance course completed",
            occurredAt: course.completedAt as string,
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
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
      );

      const evidenceBySkill = new Map<string, string[]>();
      for (const record of evidenceRecords) {
        const list = evidenceBySkill.get(record.skillKey) ?? [];
        if (!list.includes(record.label)) list.push(record.label);
        evidenceBySkill.set(record.skillKey, list);
      }

      const bankEvidence: Record<string, string[]> = {
        money_management: [goals.length > 0 ? "Savings Goal created" : ""].filter(Boolean),
        saving_planning: [goalsReached > 0 ? "Savings Goal target reached" : ""].filter(Boolean),
        risk_return: [
          bonds.length > 0 ? "Bank Bond experience recorded" : "",
          returnsCollected > 0 ? "Bond return collected" : "",
        ].filter(Boolean),
      };

      const skills: FinancialSkillEvidence[] = skillSummary.map((summary) => ({
        id: summary.skillKey.replaceAll("_", "-"),
        skillKey: summary.skillKey,
        title: summary.title,
        description: summary.description,
        stageLabel: stageLabel(summary),
        evidenceCount: summary.evidenceCount,
        evidencePoints: summary.evidencePoints,
        evidence: [
          ...(evidenceBySkill.get(summary.skillKey) ?? []),
          ...(bankEvidence[summary.skillKey] ?? []),
        ].slice(0, 4),
        upcoming:
          "More evidence will come from later lessons, simulations and activity across Milo World.",
      }));

      setSnapshot({
        foundationCompleted: foundationCompletedRows.length,
        foundationTotal: foundationLessonIds.size || 6,
        foundationRewardEarned: foundationCompletedRows.reduce(
          (sum, item) => sum + Number(item.reward_issued || 0),
          0,
        ),
        goalsCreated: goals.length,
        goalsReached,
        bondsStarted: bonds.length,
        returnsCollected,
        appliedActions: goals.length + goalsReached + bonds.length + returnsCollected,
        completedCourses,
        courses: courseOverview.map((course: MiloFinanceCourseProgressOverview) => ({
          courseId: course.courseId,
          title: course.title,
          plannedLessons: course.plannedLessons,
          liveLessons: course.liveLessons,
          completedLessons: course.completedLessons,
          isCompleted: course.isCompleted,
          completedAt: course.completedAt,
          advisorId: course.advisorId,
          accessTier: course.accessTier,
        })),
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
      "milo-finance-learning-updated",
      "milo-finance-course-updated",
      "dream-tokens-updated",
    ];

    for (const eventName of events) window.addEventListener(eventName, refresh);
    return () => {
      for (const eventName of events) window.removeEventListener(eventName, refresh);
    };
  }, [refresh]);

  return { ...snapshot, loading, error, refresh };
}
