/**
 * DREAMSCAPE ONE — Phase 4E-2B-8C-2C.3B.
 * Offline / staff-only review of proposed specialist applicability.
 *
 * IMPORTANT SECURITY/EDUCATION BOUNDARY:
 * - This pure module DOES NOT authenticate a reviewer or validate evidence provenance.
 *   Its caller must independently obtain and review facts from the strict 4A/4B gate.
 * - A "compatible_for_review" result is NOT method eligibility for the live 4B
 *   catalogue, a selector score, an approval, a prerequisite-mastery assertion,
 *   or permission to serve a learner.
 * - These draft methods remain separate from phase4BProductionLibrary.ts.
 * - No raw prompts, answer keys, learner IDs or mathematical results are returned.
 * - No keyword/skill-tag match alone can produce a compatible result.
 */
import { PHASE4E2B8C2C3A_SPECIALIST_DRAFTS } from './phase4E2B8C2C3ASpecialistDrafts';

export const SPECIALIST_APPLICABILITY_VERSION = '4E-2B-8C-2C.3B' as const;

export type SpecialistDraftId =
  | 'heuristic.multi_step.equal_spacing_interval_count'
  | 'heuristic.multi_step.multiplicative_comparison_chain'
  | 'ratio.relationship.before_after_change';

export type SpecialistFact =
  | Readonly<{
      kind: 'equal_spacing_interval_count';
      firstOrdinal: number;
      lastOrdinal: number;
      gapLength: number | null;
      equalAdjacentGaps: boolean | null;
      indexing: 'consecutive' | 'not_consecutive' | 'unknown';
      path: 'straight' | 'circular' | 'unknown';
      goal: 'distance_between_positions' | 'count_objects' | 'unknown';
    }>
  | Readonly<{
      kind: 'multiplicative_comparison_chain';
      quantityKeys: readonly string[];
      relationships: readonly Readonly<{
        quantity: string;
        relativeTo: string;
        numerator: number;
        denominator: number;
      }>[];
      combinedTotalKnown: boolean | null;
      combinedTotalIncludesExactlyTheseQuantities: boolean | null;
      targetQuantity: string | null;
      comparisonType: 'multiplicative' | 'additive' | 'unknown';
    }>
  | Readonly<{
      kind: 'ratio_before_after_change';
      beforeRatio: readonly [number, number];
      afterRatio: readonly [number, number];
      changes: readonly [number | null, number | null];
      changeEvidence: 'both_explicit' | 'one_assumed' | 'unknown';
      quantityType: 'whole_objects' | 'continuous' | 'unknown';
      goal: 'original_quantity' | 'updated_quantity' | 'other';
    }>;

/** Only minimal question-agnostic classification and independently reviewed mathematical facts. */
export type SpecialistApplicabilityReviewInput = Readonly<{
  methodId: string;
  learnerLevel: number;
  domain: string;
  problemStructure: string;
  requiredReasoning: readonly string[];
  primaryFamilies: readonly string[];
  hasVisual: boolean;
  visualReviewed: boolean;
  facts: SpecialistFact | null;
}>;

export type SpecialistApplicabilityStatus = 'compatible_for_review' | 'excluded' | 'insufficient_evidence';
export type SpecialistApplicabilityResult = Readonly<{
  version: typeof SPECIALIST_APPLICABILITY_VERSION;
  status: SpecialistApplicabilityStatus;
  ruleCode: string;
  methodId: SpecialistDraftId | null;
}>;

const IDS: readonly SpecialistDraftId[] = [
  'heuristic.multi_step.equal_spacing_interval_count',
  'heuristic.multi_step.multiplicative_comparison_chain',
  'ratio.relationship.before_after_change',
];

const result = (
  status: SpecialistApplicabilityStatus,
  ruleCode: string,
  methodId: SpecialistDraftId | null,
): SpecialistApplicabilityResult => Object.freeze({version: SPECIALIST_APPLICABILITY_VERSION, status, ruleCode, methodId});

const validPositiveInt = (value: unknown, max = 1_000_000): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= max;
const validSignedInt = (value: unknown, max = 1_000_000): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && Math.abs(value) <= max;
const finitePositive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 1_000_000_000;
const validIds = (values: unknown): values is readonly string[] =>
  Array.isArray(values) && values.every(x => typeof x === 'string' && /^[a-z][a-z0-9_]{0,23}$/i.test(x));

// Keep exact BigInt arithmetic while supporting this repository's ES2017 TS target.
// BigInt literal syntax (e.g. zero/one with the n suffix) requires an ES2020 compilation target;
// constructor calls are valid under ES2017 with the existing esnext library.
const BIGINT_ZERO = BigInt(0);
const BIGINT_ONE = BigInt(1);
type Fraction = Readonly<{ n: bigint; d: bigint }>;
const abs = (n: bigint): bigint => n < BIGINT_ZERO ? -n : n;
function gcd(a: bigint, b: bigint): bigint {
  while (b !== BIGINT_ZERO) [a, b] = [b, a % b];
  return a === BIGINT_ZERO ? BIGINT_ONE : abs(a);
}
function frac(n: bigint, d: bigint): Fraction {
  if (d < BIGINT_ZERO) { n = -n; d = -d; }
  const g = gcd(abs(n), d);
  return {n:n/g, d:d/g};
}
function times(a: Fraction, b: Fraction): Fraction { return frac(a.n * b.n, a.d * b.d); }
function same(a: Fraction, b: Fraction): boolean { return a.n === b.n && a.d === b.d; }

function reviewSpacing(facts: Extract<SpecialistFact, {kind:'equal_spacing_interval_count'}>, id: SpecialistDraftId): SpecialistApplicabilityResult {
  if (!validPositiveInt(facts.firstOrdinal) || !validPositiveInt(facts.lastOrdinal) || facts.lastOrdinal <= facts.firstOrdinal)
    return result('excluded', 'SPECIALIST_8C2C3B_INVALID_ORDINAL_RANGE', id);
  if (facts.path === 'circular' || facts.indexing === 'not_consecutive' || facts.goal === 'count_objects' || facts.equalAdjacentGaps === false)
    return result('excluded', 'SPECIALIST_8C2C3B_SPACING_STRUCTURE_MISMATCH', id);
  if (facts.path !== 'straight' || facts.indexing !== 'consecutive' || facts.goal !== 'distance_between_positions' ||
      facts.equalAdjacentGaps !== true || facts.gapLength === null)
    return result('insufficient_evidence', 'SPECIALIST_8C2C3B_SPACING_FACTS_UNCONFIRMED', id);
  if (!finitePositive(facts.gapLength))
    return result('excluded', 'SPECIALIST_8C2C3B_SPACING_INVALID_LENGTH', id);
  return result('compatible_for_review', 'SPECIALIST_8C2C3B_EQUAL_SPACING_STRUCTURE_SUPPORTED', id);
}

/** An exact rational graph check ensures every quantity has a consistent shared base. */
function reviewComparison(facts: Extract<SpecialistFact, {kind:'multiplicative_comparison_chain'}>, id: SpecialistDraftId): SpecialistApplicabilityResult {
  if (facts.comparisonType === 'additive') return result('excluded', 'SPECIALIST_8C2C3B_ADDITIVE_NOT_MULTIPLICATIVE', id);
  if (facts.comparisonType !== 'multiplicative' || facts.combinedTotalKnown !== true ||
      facts.combinedTotalIncludesExactlyTheseQuantities !== true || facts.targetQuantity === null)
    return result('insufficient_evidence', 'SPECIALIST_8C2C3B_COMPARISON_FACTS_UNCONFIRMED', id);
  if (!validIds(facts.quantityKeys) || facts.quantityKeys.length < 3 || facts.quantityKeys.length > 6 ||
      new Set(facts.quantityKeys).size !== facts.quantityKeys.length ||
      !facts.quantityKeys.includes(facts.targetQuantity) ||
      !Array.isArray(facts.relationships) || facts.relationships.length < 2 || facts.relationships.length > 12)
    return result('excluded', 'SPECIALIST_8C2C3B_INVALID_COMPARISON_GRAPH', id);
  const ids = new Set(facts.quantityKeys);
  const edges = new Map<string, Array<Readonly<{target:string;factor:Fraction}>>>(facts.quantityKeys.map(q=>[q, []]));
  for (const edge of facts.relationships) {
    if (!edge || !ids.has(edge.quantity) || !ids.has(edge.relativeTo) || edge.quantity === edge.relativeTo ||
        !validPositiveInt(edge.numerator, 10_000) || !validPositiveInt(edge.denominator, 10_000))
      return result('excluded', 'SPECIALIST_8C2C3B_INVALID_COMPARISON_GRAPH', id);
    const f = frac(BigInt(edge.numerator), BigInt(edge.denominator));
    edges.get(edge.relativeTo)!.push({target:edge.quantity, factor:f});
    edges.get(edge.quantity)!.push({target:edge.relativeTo, factor:frac(f.d,f.n)});
  }
  const first = facts.quantityKeys[0];
  const values = new Map<string, Fraction>([[first, {n:BIGINT_ONE,d:BIGINT_ONE}]]);
  const queue: string[] = [first];
  while (queue.length) {
    const current = queue.shift()!;
    for (const edge of edges.get(current) ?? []) {
      const expected = times(values.get(current)!, edge.factor);
      const already = values.get(edge.target);
      if (already && !same(already, expected))
        return result('excluded', 'SPECIALIST_8C2C3B_CONTRADICTORY_MULTIPLIERS', id);
      if (!already) {values.set(edge.target, expected); queue.push(edge.target);}
    }
  }
  if (values.size !== facts.quantityKeys.length)
    return result('excluded', 'SPECIALIST_8C2C3B_DISCONNECTED_COMPARISONS', id);
  return result('compatible_for_review', 'SPECIALIST_8C2C3B_MULTIPLICATIVE_CHAIN_SUPPORTED', id);
}

/** Enforce a unique, positive original ratio scale; do not infer an unchanged quantity. */
function reviewChangingRatio(facts: Extract<SpecialistFact, {kind:'ratio_before_after_change'}>, id: SpecialistDraftId): SpecialistApplicabilityResult {
  if (!Array.isArray(facts.beforeRatio) || facts.beforeRatio.length !== 2 ||
      !Array.isArray(facts.afterRatio) || facts.afterRatio.length !== 2 ||
      !facts.beforeRatio.every(v => validPositiveInt(v, 10_000)) ||
      !facts.afterRatio.every(v => validPositiveInt(v, 10_000)))
    return result('excluded', 'SPECIALIST_8C2C3B_INVALID_RATIO_TERMS', id);
  if (facts.changeEvidence === 'one_assumed')
    return result('excluded', 'SPECIALIST_8C2C3B_UNVERIFIED_INVARIANT', id);
  if (facts.changeEvidence !== 'both_explicit' || !Array.isArray(facts.changes) || facts.changes.length !== 2 ||
      facts.changes.some(delta => delta === null) ||
      (facts.quantityType !== 'whole_objects' && facts.quantityType !== 'continuous'))
    return result('insufficient_evidence', 'SPECIALIST_8C2C3B_CHANGES_UNCONFIRMED', id);
  if (!facts.changes.every(delta => validSignedInt(delta)))
    return result('excluded', 'SPECIALIST_8C2C3B_INVALID_CHANGE', id);
  if (facts.goal !== 'original_quantity' && facts.goal !== 'updated_quantity')
    return result('excluded', 'SPECIALIST_8C2C3B_NOT_A_QUANTITY_TARGET', id);
  const [a,b] = facts.beforeRatio.map(BigInt);
  const [c,d] = facts.afterRatio.map(BigInt);
  const [deltaA,deltaB] = facts.changes.map(x => BigInt(x!));
  const denominator = d*a - c*b;
  const numerator = c*deltaB - d*deltaA;
  if (denominator === BIGINT_ZERO) return result('excluded', 'SPECIALIST_8C2C3B_NONUNIQUE_OR_CONTRADICTORY_RATIO', id);
  const x = frac(numerator, denominator);
  if (x.n <= BIGINT_ZERO || (a*x.n + deltaA*x.d) <= BIGINT_ZERO || (b*x.n + deltaB*x.d) <= BIGINT_ZERO)
    return result('excluded', 'SPECIALIST_8C2C3B_NONPOSITIVE_QUANTITIES', id);
  if (facts.quantityType === 'whole_objects' && ((a*x.n) % x.d !== BIGINT_ZERO || (b*x.n) % x.d !== BIGINT_ZERO ||
      (a*x.n + deltaA*x.d) % x.d !== BIGINT_ZERO || (b*x.n + deltaB*x.d) % x.d !== BIGINT_ZERO))
    return result('excluded', 'SPECIALIST_8C2C3B_FRACTIONAL_OBJECT_COUNT', id);
  return result('compatible_for_review', 'SPECIALIST_8C2C3B_CHANGING_RATIO_STRUCTURE_SUPPORTED', id);
}

/**
 * Produces advisory structure compatibility for *inactive drafts* only.
 * Question evidence must come from a separate authenticated staff verification.
 */
export function reviewSpecialistDraftApplicability(input: SpecialistApplicabilityReviewInput): SpecialistApplicabilityResult {
  const methodId = IDS.includes(input?.methodId as SpecialistDraftId) ? input.methodId as SpecialistDraftId : null;
  if (!methodId) return result('excluded', 'SPECIALIST_8C2C3B_UNKNOWN_DRAFT', null);
  const draft = PHASE4E2B8C2C3A_SPECIALIST_DRAFTS.find(m => m.methodId === methodId);
  if (!draft || draft.status !== 'draft') return result('excluded', 'SPECIALIST_8C2C3B_DRAFT_NOT_INACTIVE', methodId);
  if (!Number.isInteger(input.learnerLevel) || !draft.applicability.levels.includes(input.learnerLevel as 1|2|3|4|5|6) ||
      !draft.applicability.domains.includes(input.domain as never) ||
      !draft.applicability.structures.includes(input.problemStructure as never) ||
      !Array.isArray(input.primaryFamilies) || !input.primaryFamilies.includes(draft.familyId) ||
      !Array.isArray(input.requiredReasoning) ||
      !draft.applicability.reasoning.some(reason => input.requiredReasoning.includes(reason)))
    return result('excluded', 'SPECIALIST_8C2C3B_TAXONOMY_MISMATCH', methodId);
  if (typeof input.hasVisual !== 'boolean' || typeof input.visualReviewed !== 'boolean' ||
      (input.hasVisual && !input.visualReviewed))
    return result('insufficient_evidence', 'SPECIALIST_8C2C3B_VISUAL_REVIEW_REQUIRED', methodId);
  if (!input.facts) return result('insufficient_evidence', 'SPECIALIST_8C2C3B_STRUCTURAL_FACTS_MISSING', methodId);
  if (methodId === IDS[0] && input.facts.kind === 'equal_spacing_interval_count') return reviewSpacing(input.facts, methodId);
  if (methodId === IDS[1] && input.facts.kind === 'multiplicative_comparison_chain') return reviewComparison(input.facts, methodId);
  if (methodId === IDS[2] && input.facts.kind === 'ratio_before_after_change') return reviewChangingRatio(input.facts, methodId);
  return result('excluded', 'SPECIALIST_8C2C3B_FACT_KIND_MISMATCH', methodId);
}
