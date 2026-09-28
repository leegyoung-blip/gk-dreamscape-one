import type {
  MathIntelligenceAnalysis,
  MathIntelligenceQuestionInput,
} from "../MathIntelligenceTypes";

export interface MathIntelligenceAIProvider {
  readonly providerName: string;
  analyse(input: MathIntelligenceQuestionInput): Promise<MathIntelligenceAnalysis>;
}
