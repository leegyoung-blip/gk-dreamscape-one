import { supabase } from "@/lib/supabase";
import type { FinancialAdvisorId, FinancialSkillKey } from "./financial-learning-engine-types";
import type {
  MiloFinanceCourseCompletion,
  MiloFinanceCourseProgressOverview,
  MiloFinanceCourseSkillSummary,
} from "./financial-course-completion-types";

type CourseCompletionRow = {
  course_id: string;
  completed_at: string | null;
  advisor_id: FinancialAdvisorId | null;
  total_lessons: number | string | null;
  completed_lessons: number | string | null;
  is_completed: boolean | null;
};

type CourseSkillSummaryRow = {
  skill_key: FinancialSkillKey;
  title: string;
  evidence_count: number | string | null;
  evidence_points: number | string | null;
  observed_count: number | string | null;
  applied_count: number | string | null;
  demonstrated_count: number | string | null;
  last_evidence_at: string | null;
};

type CourseProgressOverviewRow = {
  course_id: string;
  title: string;
  sort_order: number | string | null;
  access_tier: string | null;
  planned_lessons: number | string | null;
  live_lessons: number | string | null;
  completed_lessons: number | string | null;
  is_completed: boolean | null;
  completed_at: string | null;
  advisor_id: FinancialAdvisorId | null;
};

function apiError(error: unknown, fallback: string): Error {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return new Error(message);
  }
  return new Error(fallback);
}

function mapCompletion(row: CourseCompletionRow): MiloFinanceCourseCompletion {
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
  const row = (Array.isArray(data) ? data[0] : data) as CourseCompletionRow | null | undefined;
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
  const row = (Array.isArray(data) ? data[0] : data) as CourseCompletionRow | null | undefined;
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

  return ((data ?? []) as CourseSkillSummaryRow[]).map((row) => ({
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

export async function listMiloFinanceCourseProgressOverview(): Promise<
  MiloFinanceCourseProgressOverview[]
> {
  const { data, error } = await supabase.rpc("get_milo_finance_course_progress_overview");
  if (error) throw apiError(error, "Could not load Milo Finance course progress.");

  return ((data ?? []) as CourseProgressOverviewRow[]).map((row) => ({
    courseId: row.course_id,
    title: row.title,
    sortOrder: Number(row.sort_order ?? 0),
    accessTier: row.access_tier === "milo_finance" ? "milo_finance" : "free",
    plannedLessons: Number(row.planned_lessons ?? 0),
    liveLessons: Number(row.live_lessons ?? 0),
    completedLessons: Number(row.completed_lessons ?? 0),
    isCompleted: Boolean(row.is_completed),
    completedAt: row.completed_at ?? null,
    advisorId: row.advisor_id ?? null,
  }));
}
