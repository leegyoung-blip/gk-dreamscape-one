import type { MathVisualSpec } from "../../components/core-math/visual-engine/MathVisualTypes";
import type { MathVisualValidationResult } from "../../components/core-math/visual-engine/MathVisualValidator";
import type {
  MathIntelligenceAnalysis,
  MathIntelligencePipelineResult,
  MathVisualStrategy,
} from "./MathIntelligenceTypes";
import type { MathVisualSemanticValidationResult } from "./MathVisualSemanticTypes";

export type MathVisualGenerationStatus =
  | "generated"
  | "skipped"
  | "preserved"
  | "needs_review"
  | "invalid";

export type MathVisualGenerationIssueCode =
  | "NO_GENERATION_REQUIRED"
  | "PRESERVE_EXISTING"
  | "PRESERVE_MEDIA"
  | "ANALYSIS_NEEDS_REVIEW"
  | "UNSUPPORTED_STRATEGY"
  | "MISSING_REQUIRED_QUANTITY"
  | "MISSING_REQUIRED_RELATIONSHIP"
  | "INSUFFICIENT_DISTINCT_VALUES"
  | "ANSWER_LEAK_RISK"
  | "TOO_MANY_CELLS"
  | "INVALID_GENERATED_SPEC"
  | "SEMANTIC_VALIDATION_FAILED"
  | "SEMANTIC_REVIEW_REQUIRED";

export type MathVisualGenerationIssue = {
  code: MathVisualGenerationIssueCode;
  message: string;
};

export type MathVisualSpecGenerationResult = {
  status: MathVisualGenerationStatus;
  strategy: MathVisualStrategy;
  generator_version: string;
  source: MathIntelligenceAnalysis["source"];
  spec: MathVisualSpec | null;
  issues: MathVisualGenerationIssue[];
  structural_validation: MathVisualValidationResult | null;
  semantic_validation: MathVisualSemanticValidationResult | null;
};

export type MathVisualGenerationPipelineResult = MathIntelligencePipelineResult & {
  generation: MathVisualSpecGenerationResult;
};
