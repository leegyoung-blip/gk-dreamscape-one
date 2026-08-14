export type CurriculumRole = "admin" | "curriculum_lead";
export type CoreSubject = "english" | "math";
export type CurriculumSubject = CoreSubject | "science";
export type QuizStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "published"
  | "archived";
export type QuizType = "quick" | "standard" | "challenge" | "assessment";
export type FeedbackMode = "immediate" | "end_of_quiz" | "none";
export type SupportedQuestionType =
  | "multiple_choice"
  | "multiple_select"
  | "true_false"
  | "short_text"
  | "long_text"
  | "sentence_reordering"
  | "matching"
  | "word_bank"
  | "dropdown_cloze"
  | "open_cloze"
  | "editing"
  | "picture_description"
  | "listening_comprehension"
  | "oral_recording"
  | "numeric"
  | "numeric_unit"
  | "fraction"
  | "money"
  | "math_multi_part";

export type CoreMediaAssetType = "image" | "svg" | "audio" | "video";
export type CoreStimulusType =
  | "passage"
  | "visual_text"
  | "image"
  | "audio"
  | "video"
  | "diagram"
  | "table"
  | "graph";

export type CoreTopic = {
  id: string;
  subject: CoreSubject;
  primary_level: number;
  slug: string;
  title: string;
  short_title: string;
  description: string | null;
  quiz_target: number;
  sort_order: number;
  is_assessment_topic: boolean;
  is_active: boolean;
};

export type CoreSkill = {
  id: string;
  subject: CoreSubject;
  topic_id: string;
  code: string;
  title: string;
  description: string | null;
  quiz_target: number;
  sort_order: number;
  is_active: boolean;
};

export type CoreQuiz = {
  id: string;
  subject: CoreSubject;
  topic_id: string;
  skill_id: string | null;
  code: string;
  title: string;
  description: string | null;
  quiz_type: QuizType;
  difficulty: number;
  question_count: number;
  estimated_minutes: number;
  passing_percentage: number;
  quiz_order: number;
  reward_tokens: number;
  reward_gems: number;
  feedback_mode: FeedbackMode;
  randomise_questions: boolean;
  randomise_options: boolean;
  is_published: boolean;
  status: QuizStatus;
  created_by: string | null;
  updated_by: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};

export type JsonObject = Record<string, any>;

export type CoreStimulus = {
  id: string;
  subject: CoreSubject;
  primary_level: number;
  stimulus_type: CoreStimulusType;
  title: string | null;
  body: JsonObject;
  storage_bucket: string | null;
  storage_path: string | null;
  alt_text: string | null;
  transcript: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CoreQuestionAsset = {
  id: string;
  question_id: string;
  asset_type: CoreMediaAssetType;
  storage_bucket: string;
  storage_path: string;
  alt_text: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  metadata: JsonObject;
  sort_order: number;
  created_at: string;
};

export type CoreQuestion = {
  id: string;
  subject: CoreSubject;
  primary_level: number;
  topic_id: string;
  skill_id: string | null;
  stimulus_id: string | null;
  code: string;
  question_type: SupportedQuestionType;
  instruction: string | null;
  prompt: string;
  content: JsonObject;
  answer_data: JsonObject;
  explanation: JsonObject;
  skill: string | null;
  difficulty: number;
  marks: number;
  requires_manual_marking: boolean;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type LinkedQuestion = CoreQuestion & {
  question_order: number;
  marks_override: number | null;
  stimulus: CoreStimulus | null;
  assets: CoreQuestionAsset[];
};

export type QuizFormState = {
  topicId: string;
  skillId: string;
  title: string;
  description: string;
  quizType: QuizType;
  difficulty: number;
  questionCount: number;
  estimatedMinutes: number;
  passingPercentage: number;
  rewardTokens: number;
  rewardGems: number;
  feedbackMode: FeedbackMode;
  randomiseQuestions: boolean;
  randomiseOptions: boolean;
};

export type CurriculumAuditEntityType =
  | "quiz"
  | "question"
  | "stimulus"
  | "asset"
  | "topic"
  | "skill"
  | "operation"
  | "import_batch";

export type CurriculumAuditAction =
  | "created"
  | "updated"
  | "submitted"
  | "changes_requested"
  | "approved"
  | "published"
  | "unpublished"
  | "archived"
  | "restored"
  | "deleted"
  | "reordered"
  | "imported"
  | "previewed";

export type CurriculumAuditEntry = {
  id: string;
  user_id: string;
  entity_type: CurriculumAuditEntityType;
  entity_id: string;
  quiz_id: string | null;
  subject: CoreSubject | null;
  action: CurriculumAuditAction;
  before_data: JsonObject | null;
  after_data: JsonObject | null;
  notes: string | null;
  created_at: string;
};

export type CurriculumInventorySummary = {
  topic_count: number;
  active_topic_count: number;
  inactive_topic_count: number;
  quiz_count: number;
  published_quiz_count: number;
  archived_quiz_count: number;
  question_count: number;
  asset_count: number;
  attempt_count: number;
};

export type CurriculumInventoryTopic = {
  id: string;
  subject: CurriculumSubject;
  primary_level: number;
  slug: string;
  title: string;
  short_title: string;
  sort_order: number;
  is_assessment_topic: boolean;
  is_active: boolean;
  skill_count: number;
  active_skill_count: number;
  quiz_count: number;
  published_quiz_count: number;
  archived_quiz_count: number;
  draft_quiz_count: number;
  review_quiz_count: number;
  question_count: number;
  published_question_count: number;
  question_link_count: number;
  linked_question_count: number;
  stimulus_count: number;
  asset_count: number;
  attempt_count: number;
};

export type CurriculumInventoryPayload = {
  generated_at: string;
  filters: {
    subject: CurriculumSubject | null;
    primary_level: number | null;
    include_inactive: boolean;
  };
  summary: CurriculumInventorySummary;
  topics: CurriculumInventoryTopic[];
};

export type CurriculumOperationPreview = {
  generated_at: string;
  subject: CurriculumSubject;
  scope_type: "topic" | "quiz";
  requested_target_count: number;
  resolved_target_count: number;
  topic_ids: string[];
  quiz_ids: string[];
  summary: {
    topic_count: number;
    skill_count: number;
    quiz_count: number;
    published_quiz_count: number;
    archived_quiz_count: number;
    question_link_count: number;
    question_count: number;
    asset_count: number;
    attempt_count: number;
    answer_count: number;
    reward_claim_count: number;
  };
  has_student_history: boolean;
  hard_delete_safe: false;
  recommended_action: "archive";
  warnings: string[];
  topics: Array<{
    id: string;
    primary_level: number;
    slug: string;
    title: string;
    is_active: boolean;
  }>;
  quizzes: Array<{
    id: string;
    topic_id: string;
    code: string;
    title: string;
    status: QuizStatus;
    is_published: boolean;
    question_count: number;
    attempt_count: number;
  }>;
};

export type CurriculumOperation = {
  id: string;
  operation_type: "archive" | "restore" | "import" | "asset_deployment";
  scope_type: "quiz" | "topic" | "selection" | "batch";
  subject: CurriculumSubject;
  primary_level: number | null;
  target_ids: string[];
  status:
    | "previewed"
    | "pending"
    | "running"
    | "completed"
    | "failed"
    | "cancelled";
  preview_data: JsonObject;
  result_data: JsonObject;
  requested_by: string;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
};
