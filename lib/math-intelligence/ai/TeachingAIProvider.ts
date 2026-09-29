import type {
  MathVisualTeachingStep,
} from "../../../components/core-math/visual-engine/MathVisualState";
import type {
  MathIntelligenceAnalysis,
  MathIntelligenceQuestionInput,
} from "../MathIntelligenceTypes";
import type {
  MathVisualTeachingNeedResult,
  MathVisualTeachingRoleResolution,
} from "../MathTeachingVisualTypes";

export type MathTeachingAIRequest = {
  input: MathIntelligenceQuestionInput;
  analysis: MathIntelligenceAnalysis;
  visual_id: string;
  roles: MathVisualTeachingRoleResolution;
  need: MathVisualTeachingNeedResult;
};

export type MathTeachingAIResponse = {
  status: "generated" | "needs_review";
  confidence: number;
  lesson_steps: MathVisualTeachingStep[];
  teach_me_steps: MathVisualTeachingStep[];
  review_reason: string | null;
  model: string;
};

/** Provider-neutral contract. OpenAI Luna is the only implementation today. */
export interface MathTeachingAIProvider {
  readonly providerName: string;
  readonly model: string;
  planVisualTeaching(
    request: MathTeachingAIRequest,
  ): Promise<MathTeachingAIResponse>;
}
