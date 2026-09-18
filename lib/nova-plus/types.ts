export type NovaPlusTab =
  | "learning"
  | "strengths"
  | "mastery"
  | "recommendations"
  | "progress"
  | "parent";

export type NovaSubjectKey =
  | "english"
  | "math"
  | "science"
  | "knowledge";

export type ProfileSubjectSummary = {
  subject: string;
  mastery_score: number;
  confidence_score: number;
  questions_attempted: number;
  skills_count: number;
  secure_skills: number;
  priority_skills: number;
  last_activity_at: string | null;
};

export type ProfileSkill = {
  skill_id: string;
  subject: string;
  primary_level: number;
  domain: string;
  topic: string;
  skill_name: string;
  skill_code: string;
  /** Taxonomy provenance. NOVA+ uses this to exclude quiz-title fallback rows. */
  source?: string | null;
  external_ref?: string | null;
  public_explanation?: string | null;
  parent_skill_id: string | null;
  is_topic_level: boolean;
  mastery_score: number;
  confidence_score: number;
  recent_accuracy: number | null;
  lifetime_accuracy: number | null;
  questions_attempted: number;
  correct_answers: number;
  wrong_answers: number;
  recent_wrong_answers: number;
  weighted_questions: number;
  unique_activities: number;
  active_weeks: number;
  mapping_coverage: number | null;
  granular_eligible: boolean;
  evidence_quality:
    | "broad"
    | "insufficient_mapping"
    | "limited_primary_evidence"
    | "ready";
  trend_points: number | null;
  trend: "improving" | "declining" | "stable" | "no_data";
  status:
    | "not_enough_data"
    | "needs_support"
    | "emerging"
    | "developing"
    | "secure"
    | "mastered"
    | "review_due";
  first_seen_at: string | null;
  last_attempted_at: string | null;
};


export type CurriculumConcept = {
  skill_id: string;
  subject: "english" | "math" | "science" | string;
  primary_level: number;
  domain: string;
  topic: string;
  skill_name: string;
  skill_code: string;
  source?: string | null;
  external_ref?: string | null;
  /** Parent-friendly explanation used by Mastery Map info tips. */
  public_explanation?: string | null;
  /** Active/review flags exposed by the canonical Mastery Map catalogue. */
  is_active?: boolean;
  review_status?: string | null;
  parent_skill_id?: string | null;
  has_evidence: boolean;
  mastery_score: number | null;
  confidence_score: number | null;
  recent_accuracy: number | null;
  lifetime_accuracy: number | null;
  questions_attempted: number;
  correct_answers: number;
  wrong_answers: number;
  recent_wrong_answers: number;
  unique_activities: number;
  active_weeks: number;
  mapping_coverage: number | null;
  granular_eligible: boolean;
  evidence_quality:
    | "broad"
    | "insufficient_mapping"
    | "limited_primary_evidence"
    | "ready";
  trend_points: number | null;
  trend: "improving" | "declining" | "stable" | "no_data";
  status:
    | "not_enough_data"
    | "needs_support"
    | "emerging"
    | "developing"
    | "secure"
    | "mastered"
    | "review_due";
  first_seen_at: string | null;
  last_attempted_at: string | null;
};

export type ProfilePattern = {
  id: string;
  pattern_key: string;
  subject: string;
  current_value: number | null;
  previous_value: number | null;
  unit: string;
  confidence_score: number;
  evidence_count: number;
  window_start: string | null;
  window_end: string | null;
  interpretation: string | null;
  metadata: Record<string, unknown>;
  calculated_at: string;
};

export type ProfileInsight = {
  id: string;
  insight_key: string;
  insight_type: string;
  subject: string | null;
  skill_id: string | null;
  title: string;
  summary: string;
  confidence_score: number;
  severity: "info" | "low" | "medium" | "high";
  status: "active" | "resolved" | "dismissed";
  evidence: Record<string, unknown>;
  first_detected_at: string;
  last_confirmed_at: string;
  resolved_at: string | null;
};

export type ProfileSnapshot = {
  id?: string;
  snapshot_date?: string;
  snapshot_type?: "weekly" | "monthly" | "manual";
  overall_mastery?: number | null;
  profile_confidence?: number | null;
  strongest_subject?: string | null;
  priority_subject?: string | null;
  strongest_skills?: unknown[];
  priority_skills?: unknown[];
  subject_summaries?: unknown[];
  learning_patterns?: unknown[];
  active_insights?: unknown[];
  source_event_count?: number;
  source_question_count?: number;
  generated_at?: string;
};

export type NovaPlusProfilePayload = {
  student_user_id: string;
  generated_at: string;
  analytics_version?: string;
  latest_snapshot: ProfileSnapshot;
  subject_summaries: ProfileSubjectSummary[];
  skills: ProfileSkill[];
  curriculum_concepts?: CurriculumConcept[];
  patterns: ProfilePattern[];
  insights: ProfileInsight[];
  resolved_insights: ProfileInsight[];
  timeline: ProfileSnapshot[];
  processing: Record<string, unknown>;
  age_context?: Record<string, unknown>;
  age_context_version?: string;
  nova_plus?: boolean;
};

export type NovaPlusLearner = {
  id: string;
  label: string;
  relationship: string;
};


export type NovaRecommendationLane =
  | "focus_now"
  | "build_next"
  | "reassess"
  | "stretch";

export type NovaRecommendationAlternative = {
  quiz_id: string;
  quiz_title: string;
  quiz_type: string | null;
  quiz_href: string | null;
  quiz_skill_coverage_percentage: number | null;
};

export type NovaRecommendationQuiz = {
  quiz_id: string;
  quiz_title: string;
  quiz_type: string | null;
  quiz_href: string | null;
  quiz_skill_coverage_percentage: number | null;
  mapped_question_count: number | null;
  primary_question_count: number | null;
  total_questions: number | null;
  last_accuracy: number | null;
  best_accuracy: number | null;
  last_attempt_at: string | null;
  days_since_last_attempt: number | null;
};

export type NovaRecommendation = {
  id: string;
  lane: NovaRecommendationLane;
  subject: "english" | "math";
  primary_level: number;
  domain: string;
  topic: string;
  skill_id: string;
  skill_code: string;
  skill_name: string;
  public_explanation: string | null;
  mastery_score: number;
  confidence_score: number;
  recent_accuracy: number | null;
  lifetime_accuracy: number | null;
  questions_analyzed: number;
  primary_questions_analyzed: number;
  separate_attempts: number;
  recent_errors: number;
  mapping_coverage: number | null;
  evidence_quality: string;
  trend: "improving" | "declining" | "stable" | "no_data";
  trend_points: number | null;
  last_practised_at: string | null;
  persistent_weakness: boolean;
  review_due: boolean;
  recommendation_score: number;
  reason: string;
  quiz: NovaRecommendationQuiz;
  alternatives: NovaRecommendationAlternative[];
};

export type NovaRecommendationsPayload = {
  student_user_id: string;
  generated_at: string;
  subjects: Array<"english" | "math">;
  science_status?: "not_mapped_yet" | string;
  recommendations: NovaRecommendation[];
  recommendation_count: number;
  rules?: {
    max_visible?: number;
    focus_now_max?: number;
    build_next_max?: number;
    reassess_or_stretch_max?: number;
    focus_requires_repeated_evidence?: boolean;
    unassessed_concepts_are_not_recommended?: boolean;
  };
};
