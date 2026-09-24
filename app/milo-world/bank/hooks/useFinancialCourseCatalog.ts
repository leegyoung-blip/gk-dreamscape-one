"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listMiloFinanceCourses,
  listMiloFinanceLessons,
  listMiloFinanceModules,
} from "../lib/financial-learning-content-api";
import type {
  MiloFinanceCourse,
  MiloFinanceLessonSummary,
  MiloFinanceModule,
} from "../lib/financial-learning-content-types";

export function useFinancialCourseCatalog(courseId?: string, enabled = true) {
  const [courses, setCourses] = useState<MiloFinanceCourse[]>([]);
  const [modules, setModules] = useState<MiloFinanceModule[]>([]);
  const [lessons, setLessons] = useState<MiloFinanceLessonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setCourses([]);
      setModules([]);
      setLessons([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextCourses = await listMiloFinanceCourses();
      setCourses(nextCourses);
      const selected = courseId ?? nextCourses[0]?.id;
      if (!selected) {
        setModules([]);
        setLessons([]);
        return;
      }
      const [nextModules, nextLessons] = await Promise.all([
        listMiloFinanceModules(selected),
        listMiloFinanceLessons(selected),
      ]);
      setModules(nextModules);
      setLessons(nextLessons);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load Milo Finance learning content.");
    } finally {
      setLoading(false);
    }
  }, [courseId, enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { courses, modules, lessons, loading, error, refresh };
}
