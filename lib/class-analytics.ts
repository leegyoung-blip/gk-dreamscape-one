/**
 * Dreamscape One — Phase 3A
 * Rule-Based Class Analytics Contract
 *
 * Phase 3A consumes ONLY the frozen Phase 2D snapshot.
 *
 * It does not:
 * - modify Nova Analytics
 * - read Nova internal mapping tables
 * - analyse raw quiz answers
 * - semantically interpret teacher free-text notes
 * - generate 4/8/12-week teaching plans
 *
 * Phase 3B will consume this output.
 */

export type ClassAnalyticsReportStatus =
  | "insufficient_data"
  | "provisional"
  | "ready";

export type ClassAnalyticsFindingBucket =
  | "need"
  | "strength"
  | "monitor"
  | "other";

export type ClassAnalyticsClassification =
  | "shared_need"
  | "cluster_need"
  | "targeted_cluster"
  | "individual_exception"
  | "shared_strength"
  | "partial_strength"
  | "monitor"
  | "unclassified";

export type ClassAnalyticsPersistenceStatus =
  | "unknown"
  | "new"
  | "persistent"
  | "increased"
  | "reduced"
  | "stable";

export type ClassAnalyticsAggregateMember = {
  student_user_id: string;
  learner_snapshot_id: string;
  finding_snapshot_id: string | null;

  finding_type: string;
  priority_level: string | null;

  severity_score: number | null;
  confidence_score: number | null;
  confidence_label: string | null;

  trend_direction:
    | "improving"
    | "stable"
    | "declining"
    | "unknown";

  current_accuracy_pct: number | null;

  evidence_question_count: number;
  evidence_correct_count: number;

  teacher_focus_match_count: number;
  teacher_observation_match_count: number;
};

export type ClassAnalyticsSkillAggregate = {
  aggregate_id: string;

  aggregation_key: string;
  finding_bucket: ClassAnalyticsFindingBucket;
  classification: ClassAnalyticsClassification;

  rank: number | null;

  subject: string;
  primary_level: number | null;

  domain: string | null;
  topic: string | null;
  skill_code: string | null;
  skill_name: string | null;

  affected_student_count: number;
  denominator_student_count: number;
  affected_pct: number;

  mean_severity_score: number | null;
  mean_confidence_score: number | null;

  total_evidence_question_count: number;
  total_evidence_correct_count: number;

  declining_student_count: number;
  improving_student_count: number;
  stable_student_count: number;
  unknown_trend_student_count: number;

  teacher_context: {
    focus_student_count: number;
    observation_student_count: number;
  };

  prior_affected_pct: number | null;
  persistence_status: ClassAnalyticsPersistenceStatus;

  /**
   * Present only for `need` aggregates.
   *
   * Engine v1:
   * 35% prevalence
   * 20% Nova severity
   * 15% Nova confidence
   * 10% evidence volume
   * 10% declining-trend share
   * 10% persistence
   *
   * Teacher context is NOT blended into this score.
   */
  priority_score: number | null;

  members: ClassAnalyticsAggregateMember[];
};

export type ClassAnalyticsReport = {
  engine_version: "3A-v1" | string;

  report: {
    report_id: string;
    previous_report_id: string | null;

    report_status: ClassAnalyticsReportStatus;

    generated_at: string;
    generated_by: string | null;

    diagnostics: Record<string, boolean | number | string | null>;
    methodology: Record<string, unknown>;
  };

  class: {
    organisation_id: string;
    class_id: string;
    snapshot_batch_id: string;

    class_name: string;
    subject: string;
    primary_level: number | null;

    day_of_week: number | null;
    start_time: string | null;
    timezone: string;
  };

  coverage: {
    active_student_count: number;
    nova_report_student_count: number;
    nova_coverage_pct: number;
    structured_finding_count: number;
  };

  summary: {
    shared_need_count: number;
    cluster_need_count: number;
    targeted_cluster_count: number;
    individual_exception_count: number;
    shared_strength_count: number;
  };

  shared_needs: ClassAnalyticsSkillAggregate[];
  clusters: ClassAnalyticsSkillAggregate[];
  individual_exceptions: ClassAnalyticsSkillAggregate[];
  strengths: ClassAnalyticsSkillAggregate[];
  monitor: ClassAnalyticsSkillAggregate[];
  unclassified: ClassAnalyticsSkillAggregate[];
};

export type ClassAnalyticsReportHistoryRow = {
  report_id: string;
  snapshot_batch_id: string;

  engine_version: string;
  report_status: ClassAnalyticsReportStatus;

  generated_at: string;

  active_student_count: number;
  nova_report_student_count: number;
  nova_coverage_pct: number;
  structured_finding_count: number;

  shared_need_count: number;
  cluster_need_count: number;
  targeted_cluster_count: number;
  individual_exception_count: number;
  shared_strength_count: number;
};
