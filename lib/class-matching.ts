/**
 * Dreamscape One — Phase 3D
 * New-Student Class Matching Contract
 *
 * Decision support only.
 * Never auto-enrol a learner from this result.
 */

export type ClassMatchingReadinessCandidate = {
  class_id: string;
  class_name: string;

  day_of_week: number | null;
  start_time: string | null;

  capacity: number | null;
  current_student_count: number;
  available_seats: number | null;

  class_analytics_report_id: string | null;
  class_analytics_status: string | null;
  class_analytics_generated_at: string | null;
  class_analytics_age_days: number | null;
  class_nova_coverage_pct: number | null;

  scoreable: boolean;
};

export type ClassMatchingReadiness = {
  ready_to_match: boolean;

  organisation_id: string;
  student_user_id: string;

  subject: "english" | "math";
  primary_level: number;

  match_mode:
    | "single_eligible_assessment"
    | "ranked_comparison"
    | null;

  student: {
    active_organisation_student: boolean;
    current_matching_class_count: number;

    nova_report_id: string | null;
    nova_generated_at: string | null;
    nova_age_days: number | null;

    nova_freshness_status: string | null;
    nova_confidence_label: string | null;

    evidence_quiz_count: number;
    evidence_question_count: number;

    need_finding_count: number;
    strength_finding_count: number;
  };

  classes: {
    eligible_class_count: number;
    scoreable_class_count: number;
    unscoreable_class_count: number;

    candidates: ClassMatchingReadinessCandidate[];
  };

  blockers: string[];
};

export type ClassMatchingAlignmentDetailItem = {
  aggregation_key: string;

  skill_code?: string | null;
  skill_name?: string | null;
  topic?: string | null;

  class_classification?: string;
  class_affected_pct?: number;

  class_strength_pct?: number;
};

export type StudentClassMatchingCandidate = {
  candidate_id: string;

  class_id: string;
  class_name: string;

  subject: "english" | "math";
  primary_level: number;

  day_of_week: number | null;
  start_time: string | null;
  timezone: string;

  rank_position: number;

  current_student_count: number;
  class_capacity: number | null;
  available_seats: number | null;

  class_analytics_report_id: string;
  class_analytics_generated_at: string;
  class_analytics_age_days: number;
  class_nova_coverage_pct: number;

  scores: {
    support_alignment: number;
    pace_compatibility: number;
    strength_alignment: number;
    class_data_quality: number;
    capacity_headroom: number;

    decision_support: number;
  };

  alignment_band:
    | "higher_alignment"
    | "moderate_alignment"
    | "limited_alignment";

  matched_need_count: number;
  unmatched_need_count: number;
  pace_mismatch_count: number;
  strength_overlap_count: number;

  alignment_details: {
    matched_needs: ClassMatchingAlignmentDetailItem[];
    unsupported_needs: ClassMatchingAlignmentDetailItem[];
    pace_mismatches: ClassMatchingAlignmentDetailItem[];
    strength_overlap: ClassMatchingAlignmentDetailItem[];
  };
};

export type StudentClassMatch = {
  run: {
    matching_run_id: string;

    organisation_id: string;
    student_user_id: string;

    subject: "english" | "math";
    primary_level: number;

    engine_version: "3D-v1" | string;

    run_mode:
      | "single_eligible_assessment"
      | "ranked_comparison";

    generated_at: string;
    generated_by: string | null;

    methodology: Record<string, unknown>;

    diagnostics: {
      top_score?: number | null;
      second_score?: number | null;
      score_gap?: number | null;

      ranking_separation?:
        | "single_eligible_class"
        | "not_available"
        | "near_tie"
        | "modest_separation"
        | "clearer_separation";

      validation_note?: string;
    };
  };

  student_source: {
    nova_report_id: string;
    nova_generated_at: string;

    freshness_status:
      | "current"
      | "limited_evidence";

    confidence_label:
      | "medium"
      | "high";

    evidence_quiz_count: number;
    evidence_question_count: number;

    need_count: number;
    strength_count: number;
  };

  candidates: StudentClassMatchingCandidate[];
};

export type StudentClassMatchHistoryRow = {
  matching_run_id: string;

  subject: "english" | "math";
  primary_level: number;

  run_mode:
    | "single_eligible_assessment"
    | "ranked_comparison";

  generated_at: string;

  eligible_class_count: number;

  top_class_id: string | null;
  top_class_name: string | null;
  top_decision_support_score: number | null;

  ranking_separation: string | null;
};

export type PrepareClassMatchingAnalyticsRow = {
  candidate_class_id: string;
  candidate_class_name: string;

  report_id: string | null;
  report_status: string | null;
  nova_coverage_pct: number | null;
  report_generated_at: string | null;

  error_message: string | null;
};
