import type { ScoreDimension, CandidateAssessment, ConfidenceBand } from './types';

/** Score precedence is enforced by ranking logic in 4C-2, not by additive weights alone. */
export const RANKING_PRIORITY: readonly ScoreDimension[] = Object.freeze([
  'problem_structure', 'required_reasoning', 'curriculum_skill',
  'learner_level', 'math_domain', 'representation_fit', 'prerequisites',
]);
/** Maximum points per category, exactly 100 total. Level and mandatory prerequisites are hard gates. */
export const SCORE_WEIGHTS: Readonly<Record<ScoreDimension, number>> = Object.freeze({
  problem_structure: 35,
  required_reasoning: 25,
  curriculum_skill: 15,
  learner_level: 10,
  math_domain: 7,
  representation_fit: 5,
  prerequisites: 3,
});
export const SELECTION_THRESHOLDS = Object.freeze({
  minimumWinnerScore: 75,
  minimumWinnerMargin: 8,
  highConfidenceScore: 90,
  highConfidenceMargin: 15,
  mediumConfidenceScore: 82,
  mediumConfidenceMargin: 10,
});

/** Only a policy helper: no candidates are generated or scored in Phase 4C-1. */
export function classifyConfidence(winnerScore: number, runnerUpScore: number | null): ConfidenceBand {
  if (!Number.isFinite(winnerScore) || winnerScore < SELECTION_THRESHOLDS.minimumWinnerScore) return 'none';
  const margin = runnerUpScore === null ? null : winnerScore - runnerUpScore;
  if (margin !== null && margin < SELECTION_THRESHOLDS.minimumWinnerMargin) return 'none';
  if (winnerScore >= SELECTION_THRESHOLDS.highConfidenceScore &&
      (margin === null || margin >= SELECTION_THRESHOLDS.highConfidenceMargin)) return 'high';
  if (winnerScore >= SELECTION_THRESHOLDS.mediumConfidenceScore &&
      (margin === null || margin >= SELECTION_THRESHOLDS.mediumConfidenceMargin)) return 'medium';
  return 'low';
}

/** Stable ordering used only after substantive pedagogical comparisons tie in 4C-2. */
export function stableTieBreak(a: Pick<CandidateAssessment, 'complexity'|'methodId'>,
                               b: Pick<CandidateAssessment, 'complexity'|'methodId'>): number {
  return a.complexity - b.complexity || (a.methodId < b.methodId ? -1 : a.methodId > b.methodId ? 1 : 0);
}
