"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  completeMiloFinanceLesson,
  listMiloFinanceLessonProgress,
  loadMiloFinanceLesson,
  saveMiloFinanceLessonCheckpoint,
} from "../lib/financial-learning-content-api";
import type {
  MiloFinanceLessonCompletion,
  MiloFinanceLessonProgress,
  MiloFinanceLessonSummary,
  MiloFinanceLoadedLesson,
} from "../lib/financial-learning-content-types";
import type {
  FinancialAdvisorId,
  FinancialLessonDefinition,
  FinancialLessonResponseMap,
} from "../lib/financial-learning-engine-types";
import { useFinancialCourseCatalog } from "./useFinancialCourseCatalog";

function messageFrom(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Could not load this Milo Finance course.";
}

export function useFinancialCourse(courseId: string, isLoggedIn: boolean) {
  const catalog = useFinancialCourseCatalog(courseId, isLoggedIn);
  const [progress, setProgress] = useState<MiloFinanceLessonProgress[]>([]);
  const [progressLoading, setProgressLoading] = useState(isLoggedIn);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshProgress = useCallback(async () => {
    if (!isLoggedIn) {
      setProgress([]);
      setProgressLoading(false);
      return;
    }
    setProgressLoading(true);
    try {
      setProgress(await listMiloFinanceLessonProgress());
      setError(null);
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setProgressLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    refreshProgress();
  }, [refreshProgress]);

  const lessonIds = useMemo(() => new Set(catalog.lessons.map((lesson) => lesson.id)), [catalog.lessons]);
  const completedLessonIds = useMemo(
    () => new Set(progress.filter((item) => item.status === "completed" && lessonIds.has(item.lessonId)).map((item) => item.lessonId)),
    [progress, lessonIds],
  );
  const completedCount = useMemo(
    () => catalog.lessons.filter((lesson) => completedLessonIds.has(lesson.id)).length,
    [catalog.lessons, completedLessonIds],
  );
  const rewardEarned = useMemo(
    () => progress.filter((item) => completedLessonIds.has(item.lessonId)).reduce((sum, item) => sum + item.rewardIssued, 0),
    [progress, completedLessonIds],
  );
  const maxReward = useMemo(() => catalog.lessons.reduce((sum, lesson) => sum + lesson.rewardDt, 0), [catalog.lessons]);

  const loadLesson = useCallback(async (lesson: MiloFinanceLessonSummary): Promise<MiloFinanceLoadedLesson> => {
    setActionLoading(true);
    setError(null);
    try {
      return await loadMiloFinanceLesson(lesson.lessonKey);
    } catch (caught) {
      const message = messageFrom(caught);
      setError(message);
      throw caught instanceof Error ? caught : new Error(message);
    } finally {
      setActionLoading(false);
    }
  }, []);

  const saveCheckpoint = useCallback(async (
    lesson: FinancialLessonDefinition,
    advisorId: FinancialAdvisorId,
    lastBlockKey: string,
    responses: FinancialLessonResponseMap,
  ) => {
    await saveMiloFinanceLessonCheckpoint({ lessonKey: lesson.id, advisorId, lastBlockKey, responses });
  }, []);

  const completeLesson = useCallback(async (
    lesson: FinancialLessonDefinition,
    advisorId: FinancialAdvisorId,
    responses: FinancialLessonResponseMap,
  ): Promise<MiloFinanceLessonCompletion> => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await completeMiloFinanceLesson({ lessonKey: lesson.id, advisorId, responses });
      await refreshProgress();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("milo-finance-learning-updated"));
        window.dispatchEvent(new Event("dream-tokens-updated"));
      }
      return result;
    } catch (caught) {
      const message = messageFrom(caught);
      setError(message);
      throw caught instanceof Error ? caught : new Error(message);
    } finally {
      setActionLoading(false);
    }
  }, [refreshProgress]);

  return {
    ...catalog,
    progress,
    completedLessonIds,
    completedCount,
    rewardEarned,
    maxReward,
    loading: catalog.loading || progressLoading,
    actionLoading,
    error: error ?? catalog.error,
    refresh: async () => Promise.all([catalog.refresh(), refreshProgress()]).then(() => undefined),
    loadLesson,
    saveCheckpoint,
    completeLesson,
  };
}
