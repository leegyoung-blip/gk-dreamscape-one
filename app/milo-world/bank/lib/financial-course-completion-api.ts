import { supabase } from "@/lib/supabase";
import type { FinancialAdvisorId } from "./financial-learning-engine-types";
import type {
  MiloFinanceCourseCompletion,
  MiloFinanceCourseSkillSummary,
} from "./financial-course-completion-types";

function apiError(error: unknown, fallback: string): Error {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return new Error(message);
  }
  return new Error(fallback);
}

function mapCompletion(row: any): MiloFinanceCourseCompletion {
  return {
    courseId: row.course_id,
    completedAt: row.completed_at ?? null,
    advisorId: row.advisor_id ?? null,
    totalLessons: Number(row.total_lessons ?? 0),
    completedLessons: Number(row.completed_lessons ?? 0),
    isCompleted: Boolean(row.is_completed),
  };
}

export async function getMiloFinanceCourseCompletion(
  courseId: string,
): Promise<MiloFinanceCourseCompletion> {
  const { data, error } = await supabase.rpc("get_milo_finance_course_completion", {
    p_course_id: courseId,
  });
  if (error) throw apiError(error, "Could not load course completion.");
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return {
      courseId,
      completedAt: null,
      advisorId: null,
      totalLessons: 0,
      completedLessons: 0,
      isCompleted: false,
    };
  }
  return mapCompletion(row);
}

export async function syncMiloFinanceCourseCompletion(
  courseId: string,
  advisorId: FinancialAdvisorId,
): Promise<MiloFinanceCourseCompletion> {
  const { data, error } = await supabase.rpc("sync_milo_finance_course_completion", {
    p_course_id: courseId,
    p_advisor: advisorId,
  });
  if (error) throw apiError(error, "Could not update course completion.");
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Course completion did not return a result.");
  return mapCompletion(row);
}

export async function getMiloFinanceCourseSkillSummary(
  courseId: string,
): Promise<MiloFinanceCourseSkillSummary[]> {
  const { data, error } = await supabase.rpc("get_milo_finance_course_skill_summary", {
    p_course_id: courseId,
  });
  if (error) throw apiError(error, "Could not load course skill evidence.");

  return ((data ?? []) as any[]).map((row) => ({
    skillKey: row.skill_key,
    title: row.title,
    evidenceCount: Number(row.evidence_count ?? 0),
    evidencePoints: Number(row.evidence_points ?? 0),
    observedCount: Number(row.observed_count ?? 0),
    appliedCount: Number(row.applied_count ?? 0),
    demonstratedCount: Number(row.demonstrated_count ?? 0),
    lastEvidenceAt: row.last_evidence_at ?? null,
  }));
}
