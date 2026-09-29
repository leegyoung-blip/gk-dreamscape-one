import type { MathAuthoringProposal } from "./MathAuthoringProposalTypes";

export const MATH_QA_SCHEMA_VERSION = 1 as const;
export const MATH_QA_SAMPLING_VERSION = "2I.1" as const;

export type MathQASampleStratum =
  | "existing_v2"
  | "legacy_visual"
  | "text_word_problem"
  | "text_direct";

export type MathQAVerdict =
  | "unreviewed"
  | "pass"
  | "minor"
  | "fail"
  | "not_applicable";

export type MathQAIssueCode =
  | "wrong_need_decision"
  | "wrong_strategy"
  | "wrong_values_or_relationships"
  | "answer_leak"
  | "missing_visual"
  | "unnecessary_visual"
  | "visual_clarity"
  | "teaching_sequence"
  | "teaching_wording"
  | "unsupported_v2_semantics"
  | "luna_unnecessary"
  | "luna_needed_but_not_used"
  | "legacy_media_should_be_preserved"
  | "other";

export type MathQACandidate = {
  question_id: string;
  question_code: string;
  primary_level: number;
  topic_id: string;
  topic_title: string;
  quiz_id: string | null;
  quiz_code: string | null;
  quiz_title: string | null;
  quiz_published: boolean;
  question_type: string;
  prompt: string;
  sample_stratum: MathQASampleStratum;
  has_question_asset: boolean;
  has_stimulus: boolean;
  question: Record<string, unknown>;
};

export type MathQASampleItem = MathQACandidate & {
  sample_rank: number;
};

export type MathQALevelSummary = {
  primary_level: number;
  selected: number;
  topic_count: number;
  strata: Record<MathQASampleStratum, number>;
};

export type MathQASampleSelection = {
  schema_version: typeof MATH_QA_SCHEMA_VERSION;
  sampling_version: typeof MATH_QA_SAMPLING_VERSION;
  seed: string;
  target_size: number;
  actual_size: number;
  generated_at: string;
  levels: MathQALevelSummary[];
  items: MathQASampleItem[];
};

export type MathQAStoredItem = {
  id: string;
  run_id: string;
  question_id: string;
  primary_level: number;
  topic_id: string;
  topic_title: string;
  quiz_id: string | null;
  quiz_code: string | null;
  question_code: string;
  sample_stratum: MathQASampleStratum;
  sample_rank: number;
  question_snapshot: Record<string, unknown>;
  question_fingerprint: string | null;
  generation_status: string | null;
  generation_error: { code?: string; message?: string; retryable?: boolean } | null;
  proposal: MathAuthoringProposal | null;
  strategy: string | null;
  interpretation_source: string | null;
  teaching_source: string | null;
  verdict: MathQAVerdict;
  issue_codes: MathQAIssueCode[];
  reviewer_notes: string;
  reviewed_at: string | null;
};

export type MathQAStrategySummary = {
  strategy: string;
  sampled: number;
  generated: number;
  needs_review: number;
  invalid_or_failed: number;
  luna_used: number;
  human_pass: number;
  human_minor: number;
  human_fail: number;
  unreviewed: number;
};
