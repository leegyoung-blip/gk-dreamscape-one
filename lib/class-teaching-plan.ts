/**
 * Dreamscape One — Phase 3B
 * Safeguarded Class Teaching Plan Contract
 */

export type ClassTeachingPlanStatus =
  | "draft"
  | "approved"
  | "active"
  | "completed"
  | "archived";

export type ClassTeachingRecommendationScope =
  | "whole_class"
  | "small_group"
  | "individual_follow_up"
  | "strength_maintenance"
  | "monitor";

export type ClassTeachingPlanPriorityMember = {
  student_user_id: string;
  learner_snapshot_id: string;

  severity_score: number | null;
  confidence_score: number | null;

  trend_direction:
    | "improving"
    | "stable"
    | "declining"
    | "unknown";

  current_accuracy_pct: number | null;

  evidence_question_count: number;

  teacher_focus_match_count: number;
  teacher_observation_match_count: number;
};

export type ClassTeachingPlanPriority = {
  priority_id: string;
  source_aggregate_id: string;

  priority_rank: number;

  recommendation_scope: ClassTeachingRecommendationScope;

  subject: string;
  primary_level: number | null;

  domain: string | null;
  topic: string | null;
  skill_code: string | null;
  skill_name: string | null;

  source_classification: string;

  affected_student_count: number;
  denominator_student_count: number;
  affected_pct: number;

  priority_score: number | null;
  persistence_status: string;

  mean_severity_score: number | null;
  mean_confidence_score: number | null;

  total_evidence_question_count: number;

  declining_student_count: number;
  improving_student_count: number;

  teacher_context: {
    focus_student_count: number;
    observation_student_count: number;
  };

  /**
   * Relative share of TARGETED-SUPPORT emphasis only.
   * Not a percentage of total lesson time.
   */
  targeted_support_share_pct: number | null;

  recommendation_text: string;
  rationale_text: string;

  teacher_decision_status:
    | "proposed"
    | "accepted"
    | "modified"
    | "removed"
    | "completed";

  members: ClassTeachingPlanPriorityMember[];
};

export type ClassTeachingPlanPhasePriority = {
  priority_id: string;
  skill_name: string | null;
  topic: string | null;

  recommendation_scope: ClassTeachingRecommendationScope;

  phase_intensity:
    | "primary"
    | "secondary"
    | "monitor";
};

export type ClassTeachingPlanPhase = {
  phase_id: string;
  phase_no: number;

  week_start: number;
  week_end: number;

  phase_type:
    | "priority_instruction"
    | "targeted_practice"
    | "application"
    | "consolidation_checkpoint";

  phase_title: string;
  phase_goal: string;

  reassessment_checkpoint: boolean;

  priorities: ClassTeachingPlanPhasePriority[];
};

export type ClassTeachingPlan = {
  engine_version: "3B-v1" | string;

  plan: {
    plan_id: string;

    class_analytics_report_id: string;
    snapshot_batch_id: string;

    title: string;

    planning_horizon_weeks: 4 | 8 | 12;

    plan_status: ClassTeachingPlanStatus;

    recommended_start_date: string;
    recommended_end_date: string;

    generated_at: string;
    generated_by: string | null;

    approved_at: string | null;
    approved_by: string | null;

    activated_at: string | null;
    activated_by: string | null;

    teacher_note: string | null;

    readiness_snapshot: ClassTeachingPlanReadiness;
    methodology: Record<string, unknown>;
  };

  class: {
    organisation_id: string;
    class_id: string;

    class_name: string;
    subject: string;
    primary_level: number | null;
  };

  source_quality: {
    source_report_status: "ready";

    source_report_generated_at: string;

    active_student_count: number;
    nova_report_student_count: number;
    nova_coverage_pct: number;

    structured_finding_count: number;

    usable_freshness_student_count: number;
    usable_freshness_pct: number;

    medium_high_confidence_student_count: number;
    medium_high_confidence_pct: number;

    actionable_class_need_count: number;
  };

  priorities: ClassTeachingPlanPriority[];

  phases: ClassTeachingPlanPhase[];
};

export type ClassTeachingPlanReadiness = {
  ready_to_generate: boolean;

  report_id: string;
  class_id: string;
  snapshot_batch_id: string;

  checks: {
    phase3a_ready: boolean;

    report_age_days: number;
    report_age_within_14_days: boolean;

    active_student_count: number;

    nova_report_student_count: number;
    minimum_nova_students_met: boolean;

    nova_coverage_pct: number;
    minimum_nova_coverage_met: boolean;

    structured_finding_count: number;
    structured_findings_present: boolean;

    usable_freshness_student_count: number;
    usable_freshness_pct: number;
    minimum_freshness_met: boolean;

    medium_high_confidence_student_count: number;
    medium_high_confidence_pct: number;
    minimum_confidence_met: boolean;

    actionable_class_need_count: number;
    actionable_class_need_present: boolean;
  };

  blockers: string[];
};

export type ClassTeachingPlanHistoryRow = {
  plan_id: string;
  class_analytics_report_id: string;

  planning_horizon_weeks: 4 | 8 | 12;

  title: string;
  plan_status: ClassTeachingPlanStatus;

  generated_at: string;

  source_nova_coverage_pct: number;
  usable_freshness_pct: number;
  medium_high_confidence_pct: number;

  actionable_class_need_count: number;
};
