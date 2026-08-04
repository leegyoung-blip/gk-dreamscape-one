export type MappingSubject = "english" | "math" | "science";

export type MappingReviewStatus =
  | "draft"
  | "reviewed"
  | "approved"
  | "retired";

export type MappingState =
  | "all"
  | "unmapped"
  | MappingReviewStatus;

export type MappingSkill = {
  id: string;
  subject: MappingSubject;
  primary_level: number;
  domain: string;
  topic: string;
  skill_name: string;
  skill_code: string;
  description: string | null;
  public_explanation: string | null;
  internal_mapping_guidance: string | null;
  parent_skill_id: string | null;
  is_topic_level: boolean;
  is_active: boolean;
  review_status: MappingReviewStatus;
  taxonomy_version: number;
  mapped_question_count: number;
  evidence_count: number;
};

export type StoredMapping = {
  id?: string;
  skill_id: string;
  skill_code: string;
  skill_name: string;
  weight: number;
  is_primary: boolean;
  review_status?: MappingReviewStatus;
  mapping_reason?: string | null;
  suggestion_confidence?: number | null;
};

export type MappingQuestion = {
  question_source:
    | "english_questions"
    | "math_questions"
    | "science_questions";
  question_id: string;
  subject: MappingSubject;
  primary_level: number;
  topic_ref: string;
  topic_title: string;
  question_preview: string;
  question_status: string;
  question_version: string | null;
  mapping_version: number | null;
  mapping_state: MappingState;
  primary_skill_code: string | null;
  primary_skill_name: string | null;
  mappings: StoredMapping[];
  mapped_at: string | null;
  reviewed_at: string | null;
};

export type MappingTopic = {
  subject: MappingSubject;
  primary_level: number;
  topic_ref: string;
  topic_title: string;
  question_count: number;
};

export type RuleSuggestion = {
  skill_id: string;
  skill_code: string;
  skill_name: string;
  domain: string;
  topic: string;
  public_explanation: string | null;
  suggestion_score: number;
  reason: string;
};

export type MappingAuditEntry = {
  id: string;
  mapping_id: string | null;
  mapping_version: number | null;
  action: "inserted" | "updated" | "retired" | "deleted";
  changed_by: string | null;
  changed_at: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
};
