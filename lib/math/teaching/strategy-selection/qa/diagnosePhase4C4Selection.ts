/**
 * Phase 4C-4B-F2: read-only, evidence-conservative selection diagnostics.
 *
 * Pedagogical prerequisite concepts in 4B describe method knowledge dependencies.
 * They are NOT proof of a specific learner's mastery. Missing learner evidence is
 * reported as unverified, never as a confirmed learner failure.
 */
import type { Phase4C4AdapterInput, Phase4C4AdapterResult } from '../phase4C4Adapter';
import { PHASE4B_ALL_PRODUCTION_METHODS } from '../../../../math-intelligence/teaching/method-library/methods/phase4BProductionLibrary';
import type { CandidateAssessment, SelectionIssueCode } from '../types';

export const PHASE4C4B_F2_DIAGNOSTICS_VERSION = '4C-4B-F2.1' as const;

export type PrerequisiteEvidenceState =
  | 'not_required'
  | 'verified_satisfied'
  | 'verified_unmet'
  | 'not_affirmed'
  | 'unverified';

export type Phase4C4BMethodDiagnostic = {
  methodId: string;
  familyId: string;
  eligibility: 'eligible' | 'excluded';
  prerequisiteConcepts: string[];
  prerequisiteEvidence: PrerequisiteEvidenceState;
  /** A false Boolean cannot distinguish confirmed non-mastery from unknown. */
  exclusionCodes: string[];
  otherExclusionCodes: string[];
  score: number | null;
  rank: number | null;
};

export type Phase4C4BFamilyDiagnostic = {
  familyId: string;
  status: 'selected' | 'blocked' | 'ambiguous';
  selectorIssues: Array<{ code: SelectionIssueCode; detail: string }>;
  methodCount: number;
  eligibleCount: number;
  excludedByPrerequisitesCount: number;
  unverifiedPrerequisiteCount: number;
  notAffirmedPrerequisiteCount: number;
  otherHardExclusionCount: number;
  methods: Phase4C4BMethodDiagnostic[];
};

export type Phase4C4BF2Diagnostics = {
  schemaVersion: typeof PHASE4C4B_F2_DIAGNOSTICS_VERSION;
  stage: 'upstream_not_reached' | 'family_selector_reached';
  classification:
    | 'upstream_not_reached'
    | 'all_primary_candidates_unverified_prerequisites'
    | 'all_primary_candidates_prerequisite_excluded_mixed_evidence'
    | 'other_or_mixed_exclusions'
    | 'eligible_candidates_present';
  /** Does not assert that the student lacks any of these concepts. */
  candidateAssessments: number;
  eligibleCandidates: number;
  candidatePrerequisitesUnverified: number;
  candidatePrerequisitesNotAffirmed: number;
  candidatePrerequisitesVerified: number;
  /** F3: explicit confirmed non-mastery, distinct from non-affirmed legacy evidence. */
  candidatePrerequisitesVerifiedUnmet: number;
  candidateOtherHardExclusions: number;
  familyDiagnostics: Phase4C4BFamilyDiagnostic[];
};

const methodIndex = new Map(PHASE4B_ALL_PRODUCTION_METHODS.map(m => [m.methodId, m] as const));

export function countPhase4BPrerequisiteMetadata(): {
  methods: number;
  methodsWithPrerequisites: number;
  methodsWithoutPrerequisites: number;
  byPrerequisiteCount: Record<string, number>;
} {
  const counts: Record<string, number> = {};
  for (const method of PHASE4B_ALL_PRODUCTION_METHODS) {
    const size = method.pedagogy.prerequisiteConcepts.length;
    counts[String(size)] = (counts[String(size)] ?? 0) + 1;
  }
  const withPrerequisites = PHASE4B_ALL_PRODUCTION_METHODS.filter(m => m.pedagogy.prerequisiteConcepts.length > 0).length;
  return {methods: PHASE4B_ALL_PRODUCTION_METHODS.length,
    methodsWithPrerequisites: withPrerequisites,
    methodsWithoutPrerequisites: PHASE4B_ALL_PRODUCTION_METHODS.length - withPrerequisites,
    byPrerequisiteCount: counts};
}

function annotateCandidate(candidate: CandidateAssessment, evidence: Phase4C4AdapterInput): Phase4C4BMethodDiagnostic {
  const method = methodIndex.get(candidate.methodId);
  const concepts = [...(method?.pedagogy.prerequisiteConcepts ?? [])];
  const verified = evidence?.verifiedEvidence?.[candidate.methodId]?.mandatoryPrerequisitesSatisfied;
  const learner = evidence?.learnerPrerequisiteEvidence?.[candidate.methodId];
  const prerequisiteEvidence: PrerequisiteEvidenceState = concepts.length === 0 ? 'not_required'
    : learner?.status === 'met' ? 'verified_satisfied'
    : learner?.status === 'unmet' ? 'verified_unmet'
    : verified === true ? 'verified_satisfied'
    : verified === false ? 'not_affirmed'
    : 'unverified';
  const exclusionCodes = candidate.exclusions.map(e => e.code);
  return {
    methodId: candidate.methodId,
    familyId: candidate.familyId,
    eligibility: candidate.eligible ? 'eligible' : 'excluded',
    prerequisiteConcepts: concepts,
    prerequisiteEvidence,
    exclusionCodes,
    otherExclusionCodes: exclusionCodes.filter(code => code !== 'MANDATORY_PREREQUISITE_MISSING'),
    score: candidate.score,
    rank: candidate.rank,
  };
}

/** Emits diagnostics only. It never calls the selector or changes eligibility. */
export function diagnosePhase4C4Selection(
  input: Phase4C4AdapterInput,
  result: Phase4C4AdapterResult,
): Phase4C4BF2Diagnostics {
  const familyDiagnostics: Phase4C4BFamilyDiagnostic[] = result.familySelections.map(selection => {
    const methods = selection.candidates.map(candidate => annotateCandidate(candidate, input));
    return {
      familyId: selection.primaryFamilyId ?? 'unresolved',
      status: selection.status,
      selectorIssues: selection.issues.map(issue => ({code: issue.code, detail: issue.detail})),
      methodCount: methods.length,
      eligibleCount: methods.filter(method => method.eligibility === 'eligible').length,
      excludedByPrerequisitesCount: methods.filter(method => method.exclusionCodes.includes('MANDATORY_PREREQUISITE_MISSING')).length,
      unverifiedPrerequisiteCount: methods.filter(method => method.prerequisiteEvidence === 'unverified').length,
      notAffirmedPrerequisiteCount: methods.filter(method => method.prerequisiteEvidence === 'not_affirmed').length,
      otherHardExclusionCount: methods.filter(method => method.otherExclusionCodes.length > 0).length,
      methods,
    };
  });
  const methods = familyDiagnostics.flatMap(f => f.methods);
  const eligibleCandidates = methods.filter(m => m.eligibility === 'eligible').length;
  const candidatePrerequisitesUnverified = methods.filter(m => m.prerequisiteEvidence === 'unverified').length;
  const candidatePrerequisitesNotAffirmed = methods.filter(m => m.prerequisiteEvidence === 'not_affirmed').length;
  const candidatePrerequisitesVerified = methods.filter(m => m.prerequisiteEvidence === 'verified_satisfied' || m.prerequisiteEvidence === 'not_required').length;
  const candidatePrerequisitesVerifiedUnmet = methods.filter(m => m.prerequisiteEvidence === 'verified_unmet').length;
  const candidateOtherHardExclusions = methods.filter(m => m.otherExclusionCodes.length > 0).length;
  const allPrereqExcluded = methods.length > 0 && methods.every(m =>
    m.eligibility === 'excluded' &&
    m.exclusionCodes.length === 1 && m.exclusionCodes[0] === 'MANDATORY_PREREQUISITE_MISSING');
  const stage = familyDiagnostics.length ? 'family_selector_reached' : 'upstream_not_reached';
  const classification: Phase4C4BF2Diagnostics['classification'] = stage === 'upstream_not_reached'
    ? 'upstream_not_reached'
    : eligibleCandidates > 0 ? 'eligible_candidates_present'
    : allPrereqExcluded && candidatePrerequisitesUnverified === methods.length
      ? 'all_primary_candidates_unverified_prerequisites'
    : allPrereqExcluded ? 'all_primary_candidates_prerequisite_excluded_mixed_evidence'
    : 'other_or_mixed_exclusions';
  return {
    schemaVersion: PHASE4C4B_F2_DIAGNOSTICS_VERSION,
    stage, classification,
    candidateAssessments: methods.length, eligibleCandidates,
    candidatePrerequisitesUnverified, candidatePrerequisitesNotAffirmed,
    candidatePrerequisitesVerified, candidatePrerequisitesVerifiedUnmet, candidateOtherHardExclusions,
    familyDiagnostics,
  };
}
