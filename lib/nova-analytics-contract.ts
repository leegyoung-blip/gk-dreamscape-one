/**
 * Dreamscape One — Nova Analytics Integration Contract
 * Phase 2A
 *
 * IMPORTANT:
 * These types describe Nova's DOWNSTREAM OUTPUT contract only.
 *
 * Do not import Nova's internal SQL mappings, taxonomy implementation,
 * weighting logic, scoring logic or report-generation internals into
 * Teacher Dashboard code.
 *
 * Phase 2B should consume the RPC results represented here.
 */

export type NovaConfidenceLabel =
  | "insufficient"
  | "low"
  | "medium"
  | "high";

export type NovaFreshnessStatus =
  | "current"
  | "limited_evidence"
  | "stale"
  | "insufficient_evidence";

export type NovaTrendDirection =
  | "improving"
  | "stable"
  | "declining"
  | "unknown";

export type NovaReportStatus =
  | "draft"
  | "published"
  | "superseded"
  | "withdrawn";

export type NovaAnalyticsReport = {
  report_id: string;
  student_user_id: string;
  subject_scope: string;
  primary_level: number | null;

  report_status: NovaReportStatus;

  contract_version: string;
  analytics_version: string | null;
  taxonomy_version: string | null;
  source_run_id: string | null;

  generated_at: string;

  evidence_from: string | null;
  evidence_through: string | null;

  evidence_quiz_count: number;
  evidence_question_count: number;

  overall_confidence_score: number | null;
  overall_confidence_label: NovaConfidenceLabel | null;

  freshness_status: NovaFreshnessStatus;

  report_summary: string | null;

  previous_report_id: string | null;

  metadata: Record<string, unknown>;
};

export type NovaAnalyticsReportHistoryRow = Omit<
  NovaAnalyticsReport,
  "source_run_id" | "metadata"
>;

export type NovaAnalyticsFinding = {
  finding_id: string;
  report_id: string;
  finding_order: number;

  subject: string;
  primary_level: number | null;

  domain: string | null;
  topic: string | null;

  skill_code: string | null;
  skill_name: string | null;

  /**
   * Intentionally flexible.
   *
   * Expected examples:
   * - strength
   * - priority_gap
   * - developing
   * - monitor
   * - recent_improvement
   * - recent_decline
   *
   * Nova owns the exact analytical meaning.
   */
  finding_type: string;

  priority_level: string | null;

  severity_score: number | null;

  confidence_score: number | null;
  confidence_label: NovaConfidenceLabel | null;

  trend_direction: NovaTrendDirection;

  current_accuracy_pct: number | null;
  previous_accuracy_pct: number | null;

  evidence_question_count: number;
  evidence_correct_count: number;

  evidence_from: string | null;
  evidence_through: string | null;

  finding_summary: string | null;
  recommendation: string | null;

  metadata: Record<string, unknown>;
};

export type NovaAnalyticsEvidenceRef = {
  evidence_ref_id: string;
  finding_id: string;

  attempt_source: string;
  attempt_id: string;
  question_id: string | null;

  observed_at: string | null;
  is_correct: boolean | null;

  evidence_weight: number | null;
  evidence_note: string | null;

  metadata: Record<string, unknown>;
};

export type NovaLatestReportRequest = {
  p_student_user_id: string;
  p_subject_scope?: string | null;
  p_primary_level?: number | null;

  /**
   * Only used for Dreamscape admin preview of another teacher.
   * Normal teacher / parent / student calls should pass null.
   */
  p_teacher_user_id?: string | null;
};

export type NovaReportHistoryRequest =
  NovaLatestReportRequest & {
    p_limit?: number;
  };

export type NovaReportFindingsRequest = {
  p_report_id: string;
  p_teacher_user_id?: string | null;
};

export type NovaFindingEvidenceRequest = {
  p_finding_id: string;
  p_teacher_user_id?: string | null;
};
