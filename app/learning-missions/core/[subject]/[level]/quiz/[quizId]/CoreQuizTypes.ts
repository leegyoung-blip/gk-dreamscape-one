export type CoreSubject = "english" | "math";
export type ScreenMode = "desktop" | "tablet" | "mobile";
export type QuizStage =
  | "loading"
  | "intro"
  | "playing"
  | "submitting"
  | "results"
  | "error";

export type QuestionType =
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
  | "oral_recording";

export type JsonObject = Record<string, any>;

export type QuizOption = {
  id: string;
  text: string;
  image_url: string | null;
  image_alt: string | null;
  show_text_with_image: boolean;
};

export type QuestionAsset = {
  id: string;
  asset_type: "image" | "svg" | "audio" | "video";
  storage_bucket: string;
  storage_path: string;
  alt_text: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  metadata: JsonObject;
};

export type QuizStimulus = {
  id: string;
  stimulus_type:
    | "passage"
    | "visual_text"
    | "image"
    | "audio"
    | "video"
    | "diagram"
    | "table"
    | "graph";
  title: string | null;
  body: JsonObject;
  storage_bucket: string | null;
  storage_path: string | null;
  alt_text: string | null;
};

export type QuizQuestion = {
  id: string;
  question_order: number;
  question_type: QuestionType;
  instruction: string | null;
  prompt: string;
  content: JsonObject;
  skill: string | null;
  difficulty: number;
  marks: number;
  requires_manual_marking: boolean;
  stimulus: QuizStimulus | null;
  assets: QuestionAsset[];
};

export type QuizPayload = {
  attempt_id: string;
  resumed: boolean;
  quiz: {
    id: string;
    code: string;
    title: string;
    description: string | null;
    quiz_type: "quick" | "standard" | "challenge" | "assessment";
    difficulty: number;
    question_count: number;
    estimated_minutes: number;
    passing_percentage: number;
    feedback_mode: "immediate" | "end_of_quiz" | "none";
    reward_tokens: number;
    reward_gems: number;
    subject: CoreSubject;
    primary_level: number;
    topic_title: string;
    topic_id?: string;
    topic_slug?: string;
  };
  questions: QuizQuestion[];
  saved_answers: Array<{
    question_id: string;
    response_data: JsonObject;
    is_correct: boolean | null;
    marks_awarded: number | null;
    maximum_marks: number | null;
    locked: boolean;
    pending_manual_review: boolean;
    explanation: string | null;
    correct_response: JsonObject | string | null;
  }>;
};

export type ImmediateFeedback = {
  saved: boolean;
  locked: boolean;
  pending_manual_review: boolean;
  is_correct: boolean | null;
  marks_awarded: number | null;
  maximum_marks: number;
  explanation: string | null;
  correct_response: JsonObject | string | null;
};

export type QuestionResult = {
  question_id: string;
  question_order: number;
  prompt: string;
  response_data: JsonObject;
  is_correct: boolean | null;
  marks_awarded: number | null;
  maximum_marks: number;
  pending_manual_review: boolean;
  explanation: string | null;
  correct_response: JsonObject | string | null;
};

export type SubmitResult = {
  attempt_id: string;
  status: "submitted" | "marked";
  pending_manual_review: boolean;
  score: number;
  maximum_score: number;
  percentage: number;
  correct_count: number;
  total_questions: number;
  tokens_earned: number;
  gems_earned: number;
  first_completion: boolean;
  token_balance: number;
  gem_balance: number;
  rover_progress_count: number;
  question_results: QuestionResult[];
};

export type AnswerMap = Record<string, JsonObject>;
export type FeedbackMap = Record<string, ImmediateFeedback>;
export type TimeMap = Record<string, number>;

export type CoreQuizCheckpoint = {
  version: 1;
  attempt_id: string;
  quiz_id: string;
  question_index: number;
  stage: "intro" | "playing";
  answers: AnswerMap;
  feedback_by_question: FeedbackMap;
  time_by_question: TimeMap;
  current_question_elapsed_seconds: number;
  quiz_elapsed_seconds: number;
  saved_at: number;
};
