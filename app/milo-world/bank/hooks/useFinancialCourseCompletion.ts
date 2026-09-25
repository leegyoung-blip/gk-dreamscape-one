"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getMiloFinanceCourseCompletion,
  getMiloFinanceCourseSkillSummary,
} from "../lib/financial-course-completion-api";
import type {
  MiloFinanceCourseCompletion,
  MiloFinanceCourseSkillSummary,
} from "../lib/financial-course-completion-types";

function messageFrom(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Could not load this Milo Finance course summary.";
}

export function useFinancialCourseCompletion(courseId: string, isLoggedIn: boolean) {
  const [completion, setCompletion] = useState<MiloFinanceCourseCompletion | null>(null);
  const [skills, setSkills] = useState<MiloFinanceCourseSkillSummary[]>([]);
  const [loading, setLoading] = useState(isLoggedIn);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setCompletion(null);
      setSkills([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    try {
      const [nextCompletion, nextSkills] = await Promise.all([
        getMiloFinanceCourseCompletion(courseId),
        getMiloFinanceCourseSkillSummary(courseId),
      ]);
      setCompletion(nextCompletion);
      setSkills(nextSkills);
      setError(null);
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setLoading(false);
    }
  }, [courseId, isLoggedIn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handle = () => refresh();
    window.addEventListener("milo-finance-course-updated", handle);
    window.addEventListener("milo-finance-learning-updated", handle);
    return () => {
      window.removeEventListener("milo-finance-course-updated", handle);
      window.removeEventListener("milo-finance-learning-updated", handle);
    };
  }, [refresh]);

  return { completion, skills, loading, error, refresh };
}
