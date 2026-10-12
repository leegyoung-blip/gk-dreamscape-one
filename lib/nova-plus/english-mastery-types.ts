export type EnglishMasteryStage =
  | "Not Yet Assessed"
  | "Starting"
  | "Building"
  | "Progressing"
  | "Developing"
  | "Consolidating"
  | "Strong";

export type EnglishEvidenceConfidence = "Low" | "Moderate" | "High";

export type EnglishMasteryFamily =
  | "Grammar & Sentence Structure"
  | "Vocabulary & Word Knowledge"
  | "Reading Comprehension"
  | "Language Conventions & Editing"
  | string;

export type EnglishMasteryViewerRelationship =
  | "self"
  | "linked"
  | "admin_preview"
  | string;

export type EnglishMasterySummary = {
  masteries: number;
  assessed: number;
  not_yet_assessed: number;
  starting: number;
  building: number;
  progressing: number;
  developing: number;
  consolidating: number;
  strong: number;
  low_evidence_confidence: number;
  moderate_evidence_confidence: number;
  high_evidence_confidence: number;
};

export type EnglishMasteryItem = {
  primary_level: number;
  mastery_family: EnglishMasteryFamily;
  progression_key: string;
  mastery_code: string;
  mastery_name: string;

  // Kept for internal analytics/adaptive logic. C3B must not display this
  // numeric score to the learner.
  score: number | null;

  stage: EnglishMasteryStage;
  evidence_confidence: EnglishEvidenceConfidence;
  evidence_confidence_score: number;

  unique_questions: number;
  effective_evidence_weight: number;
  bands_encountered: number[];
  contexts_seen: string[];
  hard_correct_questions: number;
  hard_accuracy_pct: number | null;
  recent_90_unique: number;
  recent_90_share_pct: number;
  last_evidence_at: string | null;

  calibrated_question_count: number;
  available_difficulty_bands: number[];
  available_contexts: string[];
};

export type EnglishMasteryProfilePayload = {
  model_version: "english-mastery-c1b-v1" | string;
  registry_version: "english-nova-plus-mastery-v1" | string;
  learner_user_id: string;
  viewer_relationship: EnglishMasteryViewerRelationship;
  primary_level: number | null;
  generated_at: string;
  summary: EnglishMasterySummary;
  masteries: EnglishMasteryItem[];
};

export type EnglishMasteryHookState = {
  profile: EnglishMasteryProfilePayload | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};
