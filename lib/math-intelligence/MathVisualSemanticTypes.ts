import type { MathVisualStrategy } from "./MathIntelligenceTypes";

export type MathVisualSemanticSeverity = "error" | "warning";

export type MathVisualSemanticIssueCode =
  | "MISSING_PROMPT_VISUAL"
  | "STRATEGY_KIND_MISMATCH"
  | "MISSING_EXPECTED_OBJECT"
  | "UNEXPECTED_OBJECT_VALUE"
  | "VALUE_MISMATCH"
  | "RELATIONSHIP_MISMATCH"
  | "UNKNOWN_VALUE_REVEALED"
  | "SOURCE_VALUE_NOT_VISIBLE"
  | "SOURCE_UNIT_NOT_VISIBLE"
  | "SOURCE_LABEL_NOT_VISIBLE"
  | "ANSWER_LEAK_RISK"
  | "SEMANTIC_CHECK_UNSUPPORTED";

export type MathVisualSemanticIssue = {
  code: MathVisualSemanticIssueCode;
  severity: MathVisualSemanticSeverity;
  message: string;
  visual_id?: string;
  object_id?: string;
  expected?: string | number | null;
  actual?: string | number | null;
};

export type MathVisualSemanticCheckedFact = {
  key: string;
  source: string;
  expected: string | number | null;
  actual: string | number | null;
  matched: boolean;
};

export type MathVisualSemanticValidationResult = {
  valid: boolean;
  review_required: boolean;
  validator_version: string;
  strategy: MathVisualStrategy;
  issues: MathVisualSemanticIssue[];
  checked_facts: MathVisualSemanticCheckedFact[];
};
