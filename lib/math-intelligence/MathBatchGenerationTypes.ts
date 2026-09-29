import type { MathAuthoringProposal } from "./MathAuthoringProposalTypes";

export const MATH_AUTHORING_BATCH_SCHEMA_VERSION = 1 as const;

export type MathAuthoringBatchRequestItem = {
  client_id: string;
  question: unknown;
};

export type MathAuthoringBatchRequest = {
  questions: MathAuthoringBatchRequestItem[];
};

export type MathAuthoringBatchItemStatus =
  | "generated"
  | "not_needed"
  | "preserved"
  | "needs_review"
  | "invalid"
  | "failed";

export type MathAuthoringBatchItem = {
  client_id: string;
  status: MathAuthoringBatchItemStatus;
  proposal: MathAuthoringProposal | null;
  error: {
    code: string;
    message: string;
    retryable: boolean;
  } | null;
};

export type MathAuthoringBatchSummary = {
  total: number;
  generated: number;
  not_needed: number;
  preserved: number;
  needs_review: number;
  invalid: number;
  failed: number;
  visual_acceptable: number;
  teaching_acceptable: number;
  combined_acceptable: number;
  interpretation_rules: number;
  interpretation_luna: number;
  teaching_rules: number;
  teaching_luna: number;
  teaching_none: number;
  strategy_counts: Record<string, number>;
};

export type MathAuthoringBatchSuccessResponse = {
  ok: true;
  schema_version: typeof MATH_AUTHORING_BATCH_SCHEMA_VERSION;
  created_at: string;
  summary: MathAuthoringBatchSummary;
  items: MathAuthoringBatchItem[];
};

export type MathAuthoringBatchErrorCode =
  | "INVALID_REQUEST"
  | "EMPTY_BATCH"
  | "BATCH_TOO_LARGE"
  | "QUESTION_TOO_LARGE"
  | "AUTH_REQUIRED"
  | "ACCESS_DENIED"
  | "AUTH_CONFIG_MISSING";

export type MathAuthoringBatchErrorResponse = {
  ok: false;
  error: {
    code: MathAuthoringBatchErrorCode;
    message: string;
    retryable: boolean;
  };
};

export type MathAuthoringBatchResponse =
  | MathAuthoringBatchSuccessResponse
  | MathAuthoringBatchErrorResponse;
