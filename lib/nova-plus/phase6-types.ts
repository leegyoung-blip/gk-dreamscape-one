export type NovaLearningCycleStatus =
  | "active"
  | "ready_to_check"
  | "resolved"
  | "closed";

export type NovaCheckOutcome =
  | "resolved"
  | "improving"
  | "still_needs_support";

export type NovaLearningCycle = {
  id: string;
  skill_id: string;
  skill_code: string;
  skill_name: string;
  subject: "english" | "math";
  primary_level: number;
  domain: string | null;
  topic: string | null;
  public_explanation: string | null;

  status: NovaLearningCycleStatus;

  baseline_mastery_score: number | null;
  baseline_confidence_score: number | null;
  baseline_recent_accuracy: number | null;
  baseline_status: string | null;

  gap_reason: string | null;

  practice_questions: number;
  practice_activities: number;
  practice_accuracy: number | null;

  required_questions: number;
  required_activities: number;
  required_accuracy: number;

  available_check_questions: number;

  ready_at: string | null;
  check_count: number;
  last_check_percentage: number | null;
  last_check_outcome: NovaCheckOutcome | null;

  recommended_quiz_id: string | null;
  recommended_quiz_title: string | null;
  recommended_quiz_href: string | null;

  nova_check_href: string | null;

  started_at: string;
  updated_at: string;
};

export type NovaLearningCyclesPayload = {
  student_user_id: string;
  generated_at: string;
  open_cycles: NovaLearningCycle[];
  recent_cycles: Array<{
    id: string;
    skill_id: string;
    skill_code: string;
    skill_name: string;
    subject: "english" | "math";
    primary_level: number;
    domain: string | null;
    topic: string | null;
    status: NovaLearningCycleStatus;
    check_count: number;
    last_check_percentage: number | null;
    last_check_outcome: NovaCheckOutcome | null;
    resolved_at: string | null;
    started_at: string;
  }>;
  rules: {
    questions_before_check: number;
    activities_before_check: number;
    minimum_practice_accuracy: number;
    nova_check_questions: number;
    resolved_check_percentage: number;
    improving_check_percentage: number;
  };
};

export type NovaCheckQuestionType =
  | "multiple_choice"
  | "multiple_select"
  | "true_false"
  | "short_text"
  | "sentence_reordering"
  | "numeric"
  | "numeric_unit"
  | "fraction"
  | "money";

export type NovaCheckQuestion = {
  id: string;
  question_order: number;
  question_type: NovaCheckQuestionType;
  instruction: string | null;
  prompt: string;
  content: Record<string, any>;
  skill: string | null;
  difficulty: number;
  marks: number;
};

export type NovaCheckPayload = {
  attempt_id: string;
  resumed: boolean;
  cycle: {
    id: string;
    skill_id: string;
    skill_code: string;
    skill_name: string;
    topic: string | null;
    domain: string | null;
    subject: "english" | "math";
    primary_level: number;
    baseline_mastery_score: number | null;
    practice_questions: number;
    practice_activities: number;
    practice_accuracy: number | null;
    ready_at: string | null;
  };
  check: {
    title: string;
    question_count: number;
    estimated_minutes: number;
    feedback_mode: "end_of_check";
  };
  questions: NovaCheckQuestion[];
  saved_answers: Array<{
    question_id: string;
    response_data: Record<string, any>;
    time_spent_seconds: number | null;
  }>;
};

export type NovaCheckQuestionResult = {
  question_id: string;
  question_order: number;
  prompt: string;
  is_correct: boolean;
  marks_awarded: number;
  maximum_marks: number;
  explanation: string | null;
  correct_response: Record<string, any> | string | null;
};

export type NovaCheckSubmitResult = {
  attempt_id: string;
  cycle_id: string;
  status: "marked";
  correct_count: number;
  total_questions: number;
  score: number;
  maximum_score: number;
  percentage: number;
  outcome: NovaCheckOutcome;
  evidence_rows_written: number;
  mastery_score: number | null;
  mastery_status: string | null;
  next_action:
    | "gap_resolved"
    | "continue_practice"
    | "continue_support";
  question_results: NovaCheckQuestionResult[];
};
