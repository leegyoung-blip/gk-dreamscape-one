/**
 * Dreamscape One — Phase 2D
 * Class Analytics Readiness Contract
 *
 * This is the downstream contract between:
 *
 * Nova output + teacher action data
 *                  ↓
 *       Phase 2D frozen snapshot
 *                  ↓
 *          future Phase 3A
 *
 * It contains no Nova Analytics calculations.
 */

export type ClassAnalyticsSnapshotSummary = {
  snapshot_batch_id: string;
  organisation_id: string;
  class_id: string;
  class_name: string;
  subject: string;
  primary_level: number | null;
  day_of_week: number | null;
  start_time: string | null;
  timezone: string;
  generated_at: string;

  active_student_count: number;
  nova_report_student_count: number;
  nova_coverage_pct: number;
  nova_finding_count: number;
  teacher_focus_item_count: number;
  teacher_observation_count: number;
  observation_lookback_weeks: number;
};

export type ClassAnalyticsNovaFindingSnapshot = {
  finding_snapshot_id: string;
  source_report_id: string | null;
  source_finding_id: string | null;

  finding_order: number;

  subject: string;
  primary_level: number | null;

  domain: string | null;
  topic: string | null;
  skill_code: string | null;
  skill_name: string | null;

  finding_type: string;
  priority_level: string | null;

  severity_score: number | null;
  confidence_score: number | null;
  confidence_label: string | null;

  trend_direction: string;

  current_accuracy_pct: number | null;
  previous_accuracy_pct: number | null;

  evidence_question_count: number;
  evidence_correct_count: number;

  finding_summary: string | null;
  recommendation: string | null;
};

export type ClassAnalyticsNovaSnapshot = {
  snapshot_status: "report_found" | "no_matching_report";

  report_id: string | null;

  subject_scope: string | null;
  primary_level: number | null;

  report_generated_at: string | null;
  evidence_from: string | null;
  evidence_through: string | null;

  evidence_quiz_count: number;
  evidence_question_count: number;

  confidence_score: number | null;
  confidence_label: string | null;
  freshness_status: string | null;

  report_summary: string | null;

  analytics_version: string | null;
  taxonomy_version: string | null;

  findings: ClassAnalyticsNovaFindingSnapshot[];
};

export type ClassAnalyticsTeacherFocusSnapshot = {
  focus_snapshot_id: string;

  source_plan_id: string | null;
  source_focus_item_id: string | null;

  source_type: "nova" | "teacher";

  nova_report_id: string | null;
  nova_finding_id: string | null;

  subject: string | null;
  domain: string | null;
  topic: string | null;
  skill_code: string | null;
  skill_name: string | null;

  focus_label: string;
  priority_level: "low" | "medium" | "high";
  action_status: "active" | "monitoring";

  teacher_note: string | null;

  nova_summary_snapshot: string | null;
  nova_recommendation_snapshot: string | null;

  baseline_accuracy_pct: number | null;
  baseline_evidence_question_count: number | null;
  baseline_trend_direction: string | null;

  added_at: string | null;
};

export type ClassAnalyticsTeacherObservationSnapshot = {
  observation_snapshot_id: string;
  source_observation_id: string | null;

  teacher_user_id: string | null;

  nova_report_id: string | null;
  nova_finding_id: string | null;

  observation_type: string;

  subject: string | null;
  skill_code: string | null;
  skill_name: string | null;

  note: string;

  observed_at: string;
};

export type ClassAnalyticsTeacherContextSnapshot = {
  active_focus_plan_id: string | null;
  focus_items: ClassAnalyticsTeacherFocusSnapshot[];
  observations: ClassAnalyticsTeacherObservationSnapshot[];
};

export type ClassAnalyticsLearnerSnapshot = {
  learner_snapshot_id: string;
  student_user_id: string;
  class_joined_at: string | null;

  nova: ClassAnalyticsNovaSnapshot;
  teacher_context: ClassAnalyticsTeacherContextSnapshot;
};

export type ClassAnalyticsInput = {
  contract_version: "2D-v1" | string;

  snapshot: ClassAnalyticsSnapshotSummary;

  learners: ClassAnalyticsLearnerSnapshot[];
};
