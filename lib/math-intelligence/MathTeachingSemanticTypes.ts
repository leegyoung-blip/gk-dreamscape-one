import type { MathVisualValidationIssue } from "../../components/core-math/visual-engine/MathVisualValidator";
import type { MathVisualStrategy } from "./MathIntelligenceTypes";

export type MathTeachingSemanticSeverity = "error" | "warning";

export type MathTeachingSemanticIssueCode =
  | "DRAFT_NOT_GENERATED"
  | "CROSS_REFERENCE_INVALID"
  | "UNSUPPORTED_TEMPLATE"
  | "TEMPLATE_STRATEGY_MISMATCH"
  | "MISSING_REQUIRED_ROLE_TARGET"
  | "MISSING_REQUIRED_ACTION"
  | "WRONG_PEDAGOGICAL_FOCUS"
  | "GENERATED_ANNOTATION_DISALLOWED"
  | "STEP_TEXT_TOO_LONG"
  | "EMPTY_LESSON_STEPS"
  | "EMPTY_TEACH_ME_STEPS"
  | "VISUAL_ID_MISMATCH"
  | "UNKNOWN_VALUE_STATE_UNSAFE"
  | "LUNA_FALLBACK_NOT_REQUIRED"
  | "LUNA_PLAN_TOO_SHALLOW"
  | "LUNA_PLAN_TARGETS_NO_MATH_OBJECT";

export type MathTeachingSemanticIssue = {
  code: MathTeachingSemanticIssueCode;
  severity: MathTeachingSemanticSeverity;
  message: string;
  channel?: "lesson" | "teach_me";
  step_id?: string;
  object_id?: string;
};

export type MathTeachingCrossReferenceSummary = {
  lesson_valid: boolean;
  teach_me_valid: boolean;
  lesson_issues: MathVisualValidationIssue[];
  teach_me_issues: MathVisualValidationIssue[];
};

export type MathTeachingSemanticValidationResult = {
  valid: boolean;
  review_required: boolean;
  validator_version: string;
  strategy: MathVisualStrategy;
  template_id: string | null;
  issues: MathTeachingSemanticIssue[];
  cross_reference: MathTeachingCrossReferenceSummary;
};
