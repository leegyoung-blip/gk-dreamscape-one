/**
 * DREAMSCAPE ONE — 4E-2B-8C-2C.4A: authenticated staff specialist REVIEW QUEUE.
 *
 * - Internal server-only function. No HTTP route or browser-facing facts API.
 * - Re-verifies staff access, quiz/question linkage, canonical source, 4A gates,
 *   signed consumer envelopes, taxonomy coverage, and unchanged 4C selection.
 * - Uses ONLY gated taxonomy metadata to identify possible inactive drafts.
 * - There are NO verified specialist structural facts in this phase. Consequently
 *   it cannot call specialist applicability, generate a shadow score, rank,
 *   approve, or release any method. All candidates require independent evidence.
 * - Never returns the prompt, the answer key, question contents, or raw errors.
 */
import 'server-only';

import { normalizeCanonicalTeachingQuestion } from '../../../math-intelligence/teaching/canonical/normalizeCanonicalTeachingQuestion';
import { understandTeachingQuestion } from '../../../math-intelligence/teaching/understanding/understandTeachingQuestion';
import { buildTeachingContract } from '../../../math-intelligence/teaching/contract/buildTeachingContract';
import {
  createPhase4BMethodLibraryContractView,
  createPhase4CStrategySelectorContractView,
} from '../../../math-intelligence/teaching/contract/consumer/boundary';
import { buildPhase4BQuestionCoverageRequirement } from '../../../math-intelligence/teaching/method-library/taxonomy/buildCoverageRequirement';
import { PHASE4E2B8C2C3A_SPECIALIST_DRAFTS } from '../../../math-intelligence/teaching/method-library/methods/phase4E2B8C2C3ASpecialistDrafts';
import { selectFromPhase4A4B, phase4AConsumerPayloadsAgree } from '../strategy-selection/phase4C4Adapter';
import { resolveStaffMathTeachingSource } from './phase4E2A3StaffSourceResolver.server';

export const STAFF_SPECIALIST_REVIEW_VERSION = '4E-2B-8C-2C.4A' as const;

type Stage = 'access' | 'canonical' | 'understanding' | 'contract' | 'consumer' | 'taxonomy' | 'selector';
type ReviewCandidate = Readonly<{
  methodId: 'heuristic.multi_step.equal_spacing_interval_count' |
    'heuristic.multi_step.multiplicative_comparison_chain' |
    'ratio.relationship.before_after_change';
  familyId: 'heuristic.multi_step' | 'ratio.relationship';
  status: 'requires_independently_verified_facts';
  structureEvidence: 'not_verified';
  methodStatus: 'draft';
}>;

type Marker = Readonly<{
  version: typeof STAFF_SPECIALIST_REVIEW_VERSION;
  previewOnly: true;
  teachingApproved: false;
  studentReleased: false;
  specialistScore: null;
  specialistRank: null;
  pedagogicalRole: 'unresolved';
}>;

export type StaffSpecialistReviewQueue = Marker & (
  | Readonly<{ status: 'blocked'; stage: Stage; reasonCode: string; candidates: readonly [] }>
  | Readonly<{ status: 'not_applicable'; stage: 'selector'; reasonCode: string; candidates: readonly [] }>
  | Readonly<{ status: 'pending_evidence'; stage: 'selector'; reasonCode: 'SPECIALIST_8C2C4A_FACTS_NOT_VERIFIED';
      candidates: readonly ReviewCandidate[] }>
);

const marker: Marker = Object.freeze({
  version: STAFF_SPECIALIST_REVIEW_VERSION,
  previewOnly: true, teachingApproved: false, studentReleased: false,
  specialistScore: null, specialistRank: null, pedagogicalRole: 'unresolved',
});
const blocked = (stage: Stage, reasonCode: string): StaffSpecialistReviewQueue =>
  ({ ...marker, status: 'blocked', stage, reasonCode, candidates: [] });
const notApplicable = (reasonCode: string): StaffSpecialistReviewQueue =>
  ({ ...marker, status: 'not_applicable', stage: 'selector', reasonCode, candidates: [] });

// IDs and families are literal, audited draft definitions. No caller-provided
// method IDs, prompt fragments, curriculum-skill tags, or structural facts.
const SAFE_DRAFTS = new Set<ReviewCandidate['methodId']>([
  'heuristic.multi_step.equal_spacing_interval_count',
  'heuristic.multi_step.multiplicative_comparison_chain',
  'ratio.relationship.before_after_change',
]);

/**
 * Caller input is IDENTIFIERS ONLY. NEVER accept `facts`, `approved`,
 * `reviewedEvidence`, learner-mastery, answer data, or method preferences here.
 * Staff authentication and RLS are checked fresh on every invocation.
 */
export async function inspectStaffSpecialistReviewQueue(
  request: Request,
  query: Readonly<{ quizId: unknown; questionId: unknown }>,
): Promise<StaffSpecialistReviewQueue> {
  // Reject hidden caller evidence or approval fields rather than accepting
  // an object that merely happens to contain two valid identifier keys.
  if (!query || typeof query !== 'object' || Array.isArray(query) ||
      Object.keys(query).sort().join(',') !== 'questionId,quizId') {
    return blocked('access', 'SPECIALIST_8C2C4A_INVALID_QUERY');
  }
  try {
    const resolved = await resolveStaffMathTeachingSource(request, query);
    if (resolved.status !== 'ready') return blocked('access', resolved.reason);
    const canonical = normalizeCanonicalTeachingQuestion(resolved.source);
    if (canonical.identity.quizId !== resolved.sourceIdentity.quizId ||
        canonical.identity.questionId !== resolved.sourceIdentity.questionId ||
        !canonical.diagnostics.readyForUnderstanding) {
      return blocked('canonical', 'SPECIALIST_8C2C4A_CANONICAL_NOT_READY');
    }
    const understanding = understandTeachingQuestion({ question: canonical });
    if (understanding.readyForMethodSelection !== true ||
        understanding.gateDiagnostics?.readyFor4C !== true ||
        (understanding.gateDiagnostics?.blockers?.length ?? 0) !== 0) {
      return blocked('understanding', 'SPECIALIST_8C2C4A_UNDERSTANDING_NOT_READY');
    }
    const built = buildTeachingContract(understanding);
    if (built.status !== 'ready') return blocked('contract', 'SPECIALIST_8C2C4A_CONTRACT_NOT_READY');
    const b = createPhase4BMethodLibraryContractView(built);
    const c = createPhase4CStrategySelectorContractView(built);
    if (b.status !== 'ready' || c.status !== 'ready')
      return blocked('consumer', 'SPECIALIST_8C2C4A_CONSUMER_NOT_READY');
    if (!phase4AConsumerPayloadsAgree(b.envelope, c.envelope) ||
        b.envelope.questionId !== resolved.sourceIdentity.questionId ||
        c.envelope.questionId !== resolved.sourceIdentity.questionId) {
      return blocked('consumer', 'SPECIALIST_8C2C4A_CONSUMER_IDENTITY_MISMATCH');
    }
    const coverage = buildPhase4BQuestionCoverageRequirement(b.envelope);
    if (coverage.status !== 'covered')
      return blocked('taxonomy', 'SPECIALIST_8C2C4A_TAXONOMY_NOT_COVERED');

    // Unchanged 4C selection: no injected prerequisite assertions, method
    // judgements, staff claims or score adjustments.
    const selection = selectFromPhase4A4B({
      methodLibraryEnvelope: b.envelope,
      strategyEnvelope: c.envelope,
    });
    if (selection.status === 'blocked')
      return blocked('selector', 'SPECIALIST_8C2C4A_4C_BLOCKED');
    if (selection.status !== 'ambiguous')
      return notApplicable('SPECIALIST_8C2C4A_4C_NOT_AMBIGUOUS');

    // 4C cannot compare across families. Never claim a specialist is appropriate
    // when the existing primary family is not uniquely determined.
    const families = coverage.requirement.primaryFamilies;
    if (families.length !== 1 || selection.primaryFamilies.length !== 1 ||
        families[0] !== selection.primaryFamilies[0]) {
      return notApplicable('SPECIALIST_8C2C4A_CROSS_FAMILY_UNRESOLVED');
    }
    const requirement = coverage.requirement;
    // An unreviewed visual may contain the very mathematical structure needed
    // for correct specialist differentiation. Do not shortlist from text alone.
    if (b.envelope.contract.visual.hasVisual === true)
      return notApplicable('SPECIALIST_8C2C4A_VISUAL_REVIEW_REQUIRED');

    const candidates: ReviewCandidate[] = [];
    for (const draft of PHASE4E2B8C2C3A_SPECIALIST_DRAFTS) {
      if (!SAFE_DRAFTS.has(draft.methodId as ReviewCandidate['methodId']) ||
          draft.status !== 'draft' || draft.familyId !== families[0] ||
          !draft.applicability.levels.includes(requirement.learnerLevel as 1|2|3|4|5|6) ||
          !draft.applicability.domains.includes(requirement.domain) ||
          !draft.applicability.structures.includes(requirement.problemStructure) ||
          !draft.applicability.reasoning.some(x => requirement.requiredReasoning.includes(x))) continue;
      candidates.push({
        methodId: draft.methodId as ReviewCandidate['methodId'],
        familyId: draft.familyId as ReviewCandidate['familyId'],
        methodStatus: 'draft', status: 'requires_independently_verified_facts',
        structureEvidence: 'not_verified',
      });
    }
    if (candidates.length === 0) return notApplicable('SPECIALIST_8C2C4A_NO_TAXONOMY_MATCH');
    return {
      ...marker, status: 'pending_evidence', stage: 'selector',
      reasonCode: 'SPECIALIST_8C2C4A_FACTS_NOT_VERIFIED',
      candidates: Object.freeze(candidates.map(item => Object.freeze(item))),
    };
  } catch {
    // Raw exceptions may include answer-bearing material. Never reflect them.
    return blocked('selector', 'SPECIALIST_8C2C4A_INTERNAL_UNAVAILABLE');
  }
}
