/**
 * DREAMSCAPE ONE — Phase 4E-2B-8C-2C.3C: staff/offline shadow comparison.
 *
 * Advisory ONLY. Does not register drafts, score them, adjust 4C margins, select
 * methods, claim learner prerequisites, authenticate callers or serve learners.
 * Callers MUST provide independently reviewed mathematical facts from the
 * existing authenticated staff flow. Do not accept arbitrary browser facts.
 *
 * An inactive specialist has no 4C score. The existing incumbent scores may
 * be displayed for context, but neither a numerical score delta nor the
 * specialist's primary/supporting role can be concluded from those scores.
 */
import { PHASE4B_ALL_PRODUCTION_METHODS } from './phase4BProductionLibrary';
import { PHASE4E2B8C2C3A_SPECIALIST_DRAFTS } from './phase4E2B8C2C3ASpecialistDrafts';
import {
  reviewSpecialistDraftApplicability,
  type SpecialistApplicabilityReviewInput,
  type SpecialistDraftId,
} from './phase4E2B8C2C3BApplicabilityReview';

export const SHADOW_RANKING_COMPARISON_VERSION = '4E-2B-8C-2C.3C' as const;

/** Sanitised, rank-preserving snapshot FROM 4C, never an alternative selector input. */
export type IncumbentCandidateSnapshot = Readonly<{
  methodId: string;
  familyId: string;
  eligible: boolean;
  rank: number | null;
  score: number | null;
}>;
export type ExistingSelectionSnapshot = Readonly<{
  selectorImplementation: '4C-2.1';
  status: 'ambiguous' | 'selected' | 'blocked';
  primaryFamilyId: string;
  candidates: readonly IncumbentCandidateSnapshot[];
}>;
export type SpecialistShadowComparisonInput = Readonly<{
  /** A verified staff review; this pure function does not authenticate its origin. */
  review: SpecialistApplicabilityReviewInput;
  existing: ExistingSelectionSnapshot;
}>;
export type ShadowIncumbent = Readonly<{
  methodId: string;
  familyId: string;
  rank: number;
  score: number;
  structuralCoverage: 'not_independently_verified';
}>;
export type SpecialistShadowComparison = Readonly<{
  version: typeof SHADOW_RANKING_COMPARISON_VERSION;
  status: 'ready_for_staff_comparison' | 'insufficient_evidence' | 'excluded' | 'invalid_snapshot' | 'not_applicable';
  ruleCode: string;
  specialistMethodId: SpecialistDraftId | null;
  specialistStatus: 'draft' | null;
  specialistStructureCode: string | null;
  /** Deliberately unavailable: drafts have never been scored by 4C. */
  specialistScore: null;
  specialistRank: null;
  scoreDelta: null;
  pedagogicalRole: 'unresolved';
  reviewFocus: 'interval_count_vs_scaffolding' | 'multiplicative_chain_vs_scaffolding' | 'changing_ratio_vs_static_ratio' | null;
  incumbents: readonly ShadowIncumbent[];
}>;

const FOCUS = Object.freeze({
  'heuristic.multi_step.equal_spacing_interval_count': 'interval_count_vs_scaffolding',
  'heuristic.multi_step.multiplicative_comparison_chain': 'multiplicative_chain_vs_scaffolding',
  'ratio.relationship.before_after_change': 'changing_ratio_vs_static_ratio',
} as const);
const productionById = new Map(PHASE4B_ALL_PRODUCTION_METHODS.map(m => [m.methodId, m]));
const draftById = new Map(PHASE4E2B8C2C3A_SPECIALIST_DRAFTS.map(m => [m.methodId, m]));

function response(
  status: SpecialistShadowComparison['status'],
  ruleCode: string,
  methodId: SpecialistDraftId | null = null,
  structureCode: string | null = null,
  incumbents: readonly ShadowIncumbent[] = [],
): SpecialistShadowComparison {
  const d = methodId ? draftById.get(methodId) : undefined;
  return Object.freeze({
    version: SHADOW_RANKING_COMPARISON_VERSION,
    status,
    ruleCode,
    specialistMethodId: methodId,
    specialistStatus: d?.status === 'draft' ? 'draft' : null,
    specialistStructureCode: structureCode,
    specialistScore: null,
    specialistRank: null,
    scoreDelta: null,
    pedagogicalRole: 'unresolved',
    reviewFocus: status === 'ready_for_staff_comparison' && methodId ? FOCUS[methodId] : null,
    incumbents: Object.freeze(incumbents.map(x => Object.freeze({...x}))),
  });
}

function isCandidate(value: unknown): value is IncumbentCandidateSnapshot {
  if (!value || typeof value !== 'object') return false;
  const c = value as Partial<IncumbentCandidateSnapshot>;
  if (typeof c.methodId !== 'string' || typeof c.familyId !== 'string' || typeof c.eligible !== 'boolean') return false;
  if (c.eligible) return Number.isSafeInteger(c.rank) && (c.rank as number) >= 1 &&
    typeof c.score === 'number' && Number.isFinite(c.score) && c.score >= 0 && c.score <= 100;
  return c.rank === null && c.score === null;
}

function verifiedSnapshot(existing: ExistingSelectionSnapshot | undefined, level: number): readonly ShadowIncumbent[] | null {
  if (!existing || existing.selectorImplementation !== '4C-2.1' ||
      !['ambiguous', 'selected', 'blocked'].includes(existing.status) ||
      typeof existing.primaryFamilyId !== 'string' || !existing.primaryFamilyId.trim() ||
      !Array.isArray(existing.candidates) || existing.candidates.length > 100 ||
      existing.candidates.some(x => !isCandidate(x))) return null;
  const known = new Set<string>();
  const eligible: ShadowIncumbent[] = [];
  for (const c of existing.candidates) {
    const production = productionById.get(c.methodId);
    if (known.has(c.methodId) || !production || production.status !== 'active' ||
        production.familyId !== c.familyId || production.familyId !== existing.primaryFamilyId ||
        !production.applicability.levels.includes(level as 1|2|3|4|5|6)) return null;
    known.add(c.methodId);
    if (c.eligible) eligible.push({
      methodId: c.methodId, familyId: c.familyId, rank: c.rank as number,
      score: c.score as number, structuralCoverage: 'not_independently_verified',
    });
  }
  eligible.sort((a,b) => a.rank - b.rank);
  if (eligible.some((c, i) => c.rank !== i + 1)) return null;
  // Scores are a display of existing 4C data, not an independent ranking policy.
  if (eligible.some((c, i) => i > 0 && c.score > eligible[i-1].score)) return null;
  return eligible;
}

/**
 * Shadow comparison of VERIFIED specialist structure against ranked incumbent IDs.
 * Existing scores are read-only context. No promotion, margin adjustment,
 * preference, approval, or live method comparison is possible from this output.
 */
export function compareSpecialistWithIncumbents(input: SpecialistShadowComparisonInput): SpecialistShadowComparison {
  if (!input?.review || !input.existing ||
      !Number.isInteger(input.review.learnerLevel) || input.review.learnerLevel < 1 || input.review.learnerLevel > 6)
    return response('invalid_snapshot', 'SHADOW_8C2C3C_MISSING_OR_INVALID_INPUT');
  const eligibility = reviewSpecialistDraftApplicability(input.review);
  const id = eligibility.methodId;
  if (!id) return response('excluded', 'SHADOW_8C2C3C_UNKNOWN_SPECIALIST');
  if (eligibility.status === 'excluded')
    return response('excluded', 'SHADOW_8C2C3C_SPECIALIST_EXCLUDED', id, eligibility.ruleCode);
  if (eligibility.status === 'insufficient_evidence')
    return response('insufficient_evidence', 'SHADOW_8C2C3C_SPECIALIST_EVIDENCE_INSUFFICIENT', id, eligibility.ruleCode);
  const ranked = verifiedSnapshot(input.existing, input.review.learnerLevel);
  if (!ranked) return response('invalid_snapshot', 'SHADOW_8C2C3C_INVALID_4C_CANDIDATE_SNAPSHOT', id);
  if (input.existing.status !== 'ambiguous')
    return response('not_applicable', 'SHADOW_8C2C3C_ONLY_AMBIGUOUS_4C_CASES', id);
  const draft = draftById.get(id);
  if (!draft || draft.status !== 'draft' || draft.familyId !== input.existing.primaryFamilyId ||
      !input.review.primaryFamilies.includes(input.existing.primaryFamilyId))
    return response('invalid_snapshot', 'SHADOW_8C2C3C_PRIMARY_FAMILY_MISMATCH', id);
  if (ranked.length < 2)
    return response('insufficient_evidence', 'SHADOW_8C2C3C_NO_TOP_TWO_ELIGIBLE_INCUMBENTS', id);
  return response('ready_for_staff_comparison', 'SHADOW_8C2C3C_PAIRED_FOR_PEDAGOGICAL_REVIEW',
    id, eligibility.ruleCode, ranked.slice(0, 2));
}
