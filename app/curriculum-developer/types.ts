export type CurriculumRole = "admin" | "curriculum_lead";
export type CoreSubject = "english" | "math";
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
  | "true_false"
  | "short_text"
  | "sentence_reordering"
  | "numeric"
  | "numeric_unit"
  | "fraction"
  | "money"
  | "math_multi_part";

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
