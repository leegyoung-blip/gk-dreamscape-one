import type { MathVisualSpec } from "../../components/core-math/visual-engine/MathVisualTypes";
import type { MathVisualTeachingStep } from "../../components/core-math/visual-engine/MathVisualState";
import type { MathVisualValidationResult } from "../../components/core-math/visual-engine/MathVisualValidator";
import type {
  MathGenerationDisposition,
  MathIntelligenceReasonCode,
  MathIntelligenceSource,
  MathProblemStructure,
  MathQuizVisualRequirement,
  MathTarget,
  MathVisualNeed,
  MathVisualStrategy,
} from "./MathIntelligenceTypes";
import type { MathTeachingSemanticValidationResult } from "./MathTeachingSemanticTypes";
import type { MathVisualSemanticValidationResult } from "./MathVisualSemanticTypes";

export const MATH_AUTHORING_PROPOSAL_SCHEMA_VERSION = 1 as const;

export type MathAuthoringProposalStatus =
  | "generated"
  | "not_needed"
  | "preserved"
  | "needs_review"
  | "invalid";

export type MathAuthoringProposalIssueSeverity = "info" | "warning" | "error";

export type MathAuthoringProposalIssueSource =
  | "analysis"
  | "visual_generation"
  | "visual_structure"
  | "visual_semantic"
  | "teaching_generation"
  | "teaching_validation";

export type MathAuthoringProposalIssue = {
  source: MathAuthoringProposalIssueSource;
  severity: MathAuthoringProposalIssueSeverity;
  code: string;
  message: string;
};

export type MathAuthoringProposalDecision = {
  /** Added in Phase 3A. Optional so older saved QA proposals remain readable. */
  quiz_visual_requirement?: MathQuizVisualRequirement;
  auto_generate_v2?: boolean;
  visual_need: MathVisualNeed;
  disposition: MathGenerationDisposition;
  strategy: MathVisualStrategy;
  domain: string;
  problem_structure: MathProblemStructure;
  target: MathTarget;
  confidence: number;
  reason_codes: MathIntelligenceReasonCode[];
};

export type MathAuthoringProposalSources = {
  interpretation: {
    source: MathIntelligenceSource;
    model: string | null;
  };
  teaching: {
    source: "rules" | "luna" | "none";
    model: string | null;
  };
};

export type MathAuthoringProposalAcceptability = {
  visual: boolean;
  teaching: boolean;
  combined: boolean;
};

export type MathAuthoringVisualProposal = {
  status: "generated" | "skipped" | "preserved" | "needs_review" | "invalid";
  strategy: MathVisualStrategy;
  generator_version: string;
  spec: MathVisualSpec | null;
  structural_validation: MathVisualValidationResult | null;
  semantic_validation: MathVisualSemanticValidationResult | null;
};

export type MathAuthoringTeachingProposal = {
  status: "generated" | "not_needed" | "needs_review" | "invalid";
  source: "rules" | "luna" | "none";
  model: string | null;
  generator_version: string | null;
  template_id: string | null;
  confidence: number | null;
  lesson_steps: MathVisualTeachingStep[];
  teach_me_steps: MathVisualTeachingStep[];
  validation: MathTeachingSemanticValidationResult | null;
  luna: {
    attempted: boolean;
    used: boolean;
    model: string | null;
    error: string | null;
  } | null;
};

export type MathAuthoringProposal = {
  schema_version: typeof MATH_AUTHORING_PROPOSAL_SCHEMA_VERSION;
  proposal_id: string;
  created_at: string;
  question_id: string | null;
  question_fingerprint: string;
  source_fingerprint: string;
  status: MathAuthoringProposalStatus;
  can_accept: MathAuthoringProposalAcceptability;
  decision: MathAuthoringProposalDecision;
  sources: MathAuthoringProposalSources;
  visual: MathAuthoringVisualProposal;
  teaching: MathAuthoringTeachingProposal | null;
  issues: MathAuthoringProposalIssue[];
};

export type MathAuthoringGenerateRequest = {
  question: unknown;
};

export type MathAuthoringGenerateSuccessResponse = {
  ok: true;
  proposal: MathAuthoringProposal;
};

export type MathAuthoringGenerateErrorCode =
  | "INVALID_REQUEST"
  | "QUESTION_REQUIRED"
  | "MATH_ONLY"
  | "QUESTION_TOO_LARGE"
  | "AUTH_REQUIRED"
  | "ACCESS_DENIED"
  | "AUTH_CONFIG_MISSING"
  | "LUNA_NOT_CONFIGURED"
  | "INTELLIGENCE_PROVIDER_FAILED"
  | "GENERATION_FAILED";

export type MathAuthoringGenerateErrorResponse = {
  ok: false;
  error: {
    code: MathAuthoringGenerateErrorCode;
    message: string;
    retryable: boolean;
  };
};

export type MathAuthoringGenerateResponse =
  | MathAuthoringGenerateSuccessResponse
  | MathAuthoringGenerateErrorResponse;
