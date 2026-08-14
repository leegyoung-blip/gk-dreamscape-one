export type ScienceMissionType =
  | "learn"
  | "practice"
  | "investigate"
  | "mastery"
  | "assessment";

export type ScienceQuizStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "archived";

export type ScienceQuestionType =
  | "mcq"
  | "true_false"
  | "image_choice"
  | "sorting"
  | "matching"
  | "classification"
  | "fill_blank"
  | "short_answer"
  | "structured"
  | "diagram_label"
  | "table_analysis"
  | "graph_analysis"
  | "experiment_design";

export type ScienceLevelRow = {
  id: string;
  slug: string;
  level_number: number;
  school_level: string;
  display_name: string;
  subtitle: string | null;
  description: string | null;
  pathway: "science_discovery" | "primary_science";
  planned_quiz_count: number;
  sort_order: number;
  is_active: boolean;
};

export type ScienceTopicRow = {
  id: string;
  level_id: string;
  slug: string;
  title: string;
  summary: string | null;
  icon: string | null;
  learning_areas: string[];
  planned_quiz_count: number;
  sort_order: number;
  status: "draft" | "active" | "archived";
};

export type ScienceQuizRow = {
  id: string;
  topic_id: string;
  slug: string;
  title: string;
  description: string | null;
  mission_type: ScienceMissionType;
  sequence_no: number;
  difficulty: number;
  estimated_minutes: number;
  question_target: number;
  pass_percentage: number;
  mastery_percentage: number;
  status: ScienceQuizStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ScienceQuestionOption = {
  key: string;
  text: string;
  asset_path: string;
};

export type ScienceEditorQuestion = {
  id: string;
  prompt: string;
  instruction: string | null;
  question_type: ScienceQuestionType;
  question_image: string | null;
  default_marks: number;
  difficulty: number;
  content_tags: string[];
  process_skills: string[];
  question_order: number;
  options: ScienceQuestionOption[];
  answer_data: Record<string, unknown>;
  explanation: string | null;
};

export type ScienceEditorQuiz = ScienceQuizRow & {
  topic_slug: string;
  topic_title: string;
  level_slug: string;
  school_level: string;
};

export type ScienceQuizEditorPayload = {
  error?: string;
  quiz: ScienceEditorQuiz | null;
  questions: ScienceEditorQuestion[];
};
