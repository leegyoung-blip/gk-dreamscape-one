/** Phase 4C-1. Pure data contract; not a method-selection implementation. */
export const STRATEGY_SELECTION_SCHEMA_VERSION = '4C.1' as const;
export const STRATEGY_SELECTION_POLICY_VERSION = '4C-1.1' as const;
export const EXPECTED_UPSTREAM_SCHEMAS = Object.freeze({
  teachingContract: '4A-3.1',
  teachingConsumer: '4A-3-CONSUMER.1',
  methodLibrary: '4B.1',
  methodTaxonomy: '4B-1.1',
});

export type SelectionStatus = 'selected' | 'ambiguous' | 'blocked';
export type ConfidenceBand = 'high' | 'medium' | 'low' | 'none';
export type ScoreDimension =
  | 'problem_structure' | 'required_reasoning' | 'curriculum_skill'
  | 'learner_level' | 'math_domain' | 'representation_fit' | 'prerequisites';
export type ExclusionCode =
  | 'UPSTREAM_NOT_READY' | 'UPSTREAM_SCHEMA_MISMATCH' | 'METHOD_INACTIVE'
  | 'LEVEL_INCOMPATIBLE' | 'PRIMARY_FAMILY_INCOMPATIBLE'
  | 'MANDATORY_PREREQUISITE_MISSING' | 'METHOD_SCHEMA_INVALID'
  | 'NO_APPLICABLE_CANDIDATES';
export type SelectionIssueCode = ExclusionCode | 'LOW_WINNER_QUALITY'
  | 'INSUFFICIENT_WINNER_MARGIN' | 'NO_CONFIDENT_SELECTION'
  | 'INVALID_SELECTION_INPUT';

export interface SelectionEvidence {
  dimension: ScoreDimension;
  code: string;
  /** Code-level explanation, not an invented teaching script. */
  detail: string;
}
export interface DimensionScore {
  dimension: ScoreDimension;
  points: number; // within policy's dimension weight
  maximum: number;
}
export interface CandidateAssessment {
  methodId: string;
  familyId: string;
  eligible: boolean;
  /** null for hard-excluded candidates */
  rank: number | null;
  score: number | null; // normalized 0..100
  dimensionScores: DimensionScore[];
  positiveEvidence: SelectionEvidence[];
  penalties: SelectionEvidence[];
  exclusions: { code: ExclusionCode; detail: string }[];
  /** Smaller nonnegative integer means less complexity. */
  complexity: number;
  explanationCodes: string[];
}
export interface StrategySelectionProvenance {
  teachingContractSchema: '4A-3.1';
  teachingConsumerSchema: '4A-3-CONSUMER.1';
  methodLibrarySchema: '4B.1';
  methodTaxonomySchema: '4B-1.1';
  selectionPolicyVersion: '4C-1.1';
  /** An upstream deterministic contract fingerprint, not student-answer data. */
  teachingContractFingerprint: string;
  /** Version of 4C-2 implementation; 4C-1 contract fixtures use 'not-built'. */
  selectorImplementation: string;
}
export interface StrategySelection {
  schemaVersion: '4C.1';
  status: SelectionStatus;
  questionId: string;
  primaryFamilyId: string | null;
  primaryMethodId: string | null;
  /** Must be empty until 4C-3 composition has been built. */
  supportingMethodIds: string[];
  confidence: ConfidenceBand;
  confidenceScore: number | null;
  winnerMargin: number | null;
  candidates: CandidateAssessment[];
  issues: { code: SelectionIssueCode; detail: string }[];
  provenance: StrategySelectionProvenance;
}

export interface SelectionInputBoundary {
  questionId: string;
  readyForMethodSelection: boolean;
  teachingContractFingerprint: string;
  teachingContractSchema: string;
  teachingConsumerSchema: string;
  methodLibrarySchema: string;
  methodTaxonomySchema: string;
  /** Only the upstream-designated family is eligible as primary. */
  primaryFamilyId: string;
}
