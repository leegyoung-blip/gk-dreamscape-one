import { EXPECTED_UPSTREAM_SCHEMAS, STRATEGY_SELECTION_POLICY_VERSION, STRATEGY_SELECTION_SCHEMA_VERSION } from './types';
import type { SelectionInputBoundary, StrategySelection } from './types';
import { RANKING_PRIORITY, SCORE_WEIGHTS, SELECTION_THRESHOLDS, classifyConfidence } from './policy';

export interface ContractValidation { valid: boolean; issues: string[] }
const validText = (x: unknown): x is string => typeof x === 'string' && x.trim().length > 0;
const finiteRange = (x: unknown, low: number, high: number): x is number =>
  typeof x === 'number' && Number.isFinite(x) && x >= low && x <= high;

export function validateSelectionBoundary(input: SelectionInputBoundary): ContractValidation {
  const issues: string[] = [];
  if (!validText(input.questionId)) issues.push('QUESTION_ID_REQUIRED');
  if (!validText(input.teachingContractFingerprint)) issues.push('FINGERPRINT_REQUIRED');
  if (!validText(input.primaryFamilyId)) issues.push('PRIMARY_FAMILY_REQUIRED');
  for (const [property, expected] of Object.entries(EXPECTED_UPSTREAM_SCHEMAS)) {
    const inputProperty = property === 'teachingContract' ? 'teachingContractSchema' :
      property === 'teachingConsumer' ? 'teachingConsumerSchema' :
      property === 'methodLibrary' ? 'methodLibrarySchema' : 'methodTaxonomySchema';
    if (input[inputProperty as keyof SelectionInputBoundary] !== expected) issues.push('SCHEMA_MISMATCH_' + property);
  }
  if (input.readyForMethodSelection !== true) issues.push('UPSTREAM_NOT_READY');
  return { valid: issues.length === 0, issues };
}

export function validateStrategySelection(value: StrategySelection): ContractValidation {
  const issues: string[] = [];
  if (!value || typeof value !== 'object') return { valid: false, issues: ['INVALID_OBJECT'] };
  if (value.schemaVersion !== STRATEGY_SELECTION_SCHEMA_VERSION) issues.push('SCHEMA_VERSION');
  if (!['selected','ambiguous','blocked'].includes(value.status)) issues.push('STATUS');
  if (!validText(value.questionId)) issues.push('QUESTION_ID_REQUIRED');
  if (!Array.isArray(value.supportingMethodIds) || value.supportingMethodIds.length > 0)
    issues.push('SUPPORTING_METHODS_RESERVED_FOR_4C3');
  if (!Array.isArray(value.candidates)) issues.push('CANDIDATES_REQUIRED');
  if (!Array.isArray(value.issues)) issues.push('ISSUES_REQUIRED');
  if (!value.provenance ||
      value.provenance.teachingContractSchema !== EXPECTED_UPSTREAM_SCHEMAS.teachingContract ||
      value.provenance.teachingConsumerSchema !== EXPECTED_UPSTREAM_SCHEMAS.teachingConsumer ||
      value.provenance.methodLibrarySchema !== EXPECTED_UPSTREAM_SCHEMAS.methodLibrary ||
      value.provenance.methodTaxonomySchema !== EXPECTED_UPSTREAM_SCHEMAS.methodTaxonomy ||
      value.provenance.selectionPolicyVersion !== STRATEGY_SELECTION_POLICY_VERSION ||
      !validText(value.provenance.teachingContractFingerprint) ||
      !validText(value.provenance.selectorImplementation)) issues.push('PROVENANCE_INVALID');
  const candidates = Array.isArray(value.candidates) ? value.candidates : [];
  const ids = new Set<string>();
  const ranks = new Set<number>();
  for (const candidate of candidates) {
    if (!validText(candidate.methodId) || ids.has(candidate.methodId)) issues.push('DUPLICATE_OR_INVALID_METHOD_ID');
    ids.add(candidate.methodId);
    if (!validText(candidate.familyId) || !Number.isSafeInteger(candidate.complexity) || candidate.complexity < 0) issues.push('CANDIDATE_FIELDS');
    if (!Array.isArray(candidate.dimensionScores) || !Array.isArray(candidate.positiveEvidence) ||
      !Array.isArray(candidate.penalties) || !Array.isArray(candidate.exclusions) ||
      !Array.isArray(candidate.explanationCodes)) issues.push('CANDIDATE_ARRAYS');
    const dims = new Set<string>();
    let sum = 0;
    for (const d of candidate.dimensionScores ?? []) {
      const maximum = SCORE_WEIGHTS[d.dimension];
      if (maximum === undefined || dims.has(d.dimension) || d.maximum !== maximum ||
          !finiteRange(d.points, 0, maximum)) issues.push('DIMENSION_SCORE_INVALID');
      dims.add(d.dimension);
      sum += d.points;
    }
    if (candidate.eligible) {
      if (candidate.exclusions.length || !finiteRange(candidate.score, 0, 100) ||
        !Number.isSafeInteger(candidate.rank) || (candidate.rank as number) <= 0) issues.push('ELIGIBLE_CANDIDATE_INVALID');
      if (dims.size !== RANKING_PRIORITY.length || Math.abs(sum - (candidate.score ?? -1)) > 1e-8)
        issues.push('SCORE_SUM_INVALID');
      if (candidate.rank !== null && ranks.has(candidate.rank)) issues.push('DUPLICATE_RANK');
      if (candidate.rank !== null) ranks.add(candidate.rank);
    } else if (candidate.rank !== null || candidate.score !== null || candidate.exclusions.length === 0)
      issues.push('EXCLUDED_CANDIDATE_INVALID');
  }
  const eligible = candidates.filter(c => c.eligible).sort((a,b) => (a.rank ?? 9999)-(b.rank ?? 9999));
  eligible.forEach((candidate, i) => { if (candidate.rank !== i+1) issues.push('RANK_SEQUENCE_INVALID'); });
  const top = eligible[0];
  const second = eligible[1];
  if (value.status === 'selected') {
    if (!top || !value.primaryMethodId || value.primaryMethodId !== top.methodId ||
        value.primaryFamilyId !== top.familyId) issues.push('WINNER_MISMATCH');
    if (value.issues.length > 0) issues.push('SELECTED_HAS_ISSUES');
    const margin = top && second ? (top.score as number)-(second.score as number) : null;
    if (value.winnerMargin !== margin || value.confidenceScore !== top?.score ||
        value.confidence !== classifyConfidence(top?.score ?? -1, second?.score ?? null) ||
        value.confidence === 'none') issues.push('CONFIDENCE_INVALID');
    if (value.primaryFamilyId === null) issues.push('SELECTED_FAMILY_REQUIRED');
  } else {
    if (value.primaryMethodId !== null || value.confidence !== 'none' ||
        value.confidenceScore !== null || value.winnerMargin !== null || value.issues.length === 0)
      issues.push('NON_SELECTED_STATE_INVALID');
  }
  if (value.status === 'blocked' && eligible.length > 0) issues.push('BLOCKED_HAS_ELIGIBLE_METHODS');
  if (value.status === 'ambiguous' && eligible.length === 0) issues.push('AMBIGUOUS_WITHOUT_ELIGIBLE_METHODS');
  return { valid: issues.length === 0, issues: [...new Set(issues)] };
}
