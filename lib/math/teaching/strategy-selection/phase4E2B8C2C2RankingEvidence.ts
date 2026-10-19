/**
 * DREAMSCAPE ONE — Phase 4E-2B-8C-2C.2
 * Staff-only SHADOW evidence review for ambiguous top-two 4C candidates.
 *
 * This code recognises narrowly specified problem structures, NOT correctness,
 * mastery, curriculum equivalence, method approval or a scoring entitlement.
 * In particular, 'specialist_review' means review the candidate taxonomy; it
 * NEVER means that a specific proposed method has been verified or selected.
 *
 * No stored answer, question identifier, raw prompt, personal data or mathematical
 * quantities are returned. It is deliberately impossible to change scores here.
 */
export const RANKING_EVIDENCE_VERSION = '4E-2B-8C-2C.2' as const;

export type RankingEvidenceReview = Readonly<{
  version: typeof RANKING_EVIDENCE_VERSION;
  status: 'specialist_review' | 'complementary' | 'needs_review' | 'not_applicable';
  ruleCode: string;
}>;

type RankingEvidenceInput = Readonly<{
  learnerLevel: number;
  domain: string;
  problemStructure: string;
  prompt: string;
  hasVisual: boolean;
  hasParts: boolean;
  /** Ranked eligible top TWO method IDs only, from the strict 4C selector. */
  topTwoMethodIds: readonly string[];
}>;

const MULTI = new Set([
  'heuristic.multi_step.identify_subgoals',
  'heuristic.multi_step.dependency_order',
  'heuristic.multi_step.final_synthesis',
]);
const RATIO = new Set([
  'ratio.relationship.part_whole_connection',
  'ratio.relationship.ratio_units',
]);
const ANGLE = new Set([
  'geometry.angle.find_unknown',
  'geometry.angle.known_relationships',
]);
const CHANGE = new Set([
  'model.change.find_change',
  'model.change.forward_change',
]);
const METHOD_ID = /^[A-Za-z0-9_.:-]{1,120}$/;

function result(status: RankingEvidenceReview['status'], ruleCode: string): RankingEvidenceReview {
  return { version: RANKING_EVIDENCE_VERSION, status, ruleCode };
}
function exactly(set: Set<string>, pair: readonly string[]): boolean {
  return pair.length === 2 && pair.every(id => set.has(id));
}

/** Return ONLY codes: no new policy scores and no implied primary-method choice. */
export function assessRankingEvidence(input: RankingEvidenceInput): RankingEvidenceReview {
  if (!input || !Number.isInteger(input.learnerLevel) || input.learnerLevel < 1 || input.learnerLevel > 6 ||
      typeof input.domain !== 'string' || typeof input.problemStructure !== 'string' ||
      typeof input.prompt !== 'string' || input.prompt.length < 20 || input.prompt.length > 4000 ||
      typeof input.hasVisual !== 'boolean' || typeof input.hasParts !== 'boolean' ||
      !Array.isArray(input.topTwoMethodIds) || input.topTwoMethodIds.length !== 2 ||
      input.topTwoMethodIds[0] === input.topTwoMethodIds[1] ||
      !input.topTwoMethodIds.every(id => typeof id === 'string' && METHOD_ID.test(id))) {
    return result('not_applicable', '8C2C2_INVALID_OR_UNRANKED_INPUT');
  }

  const pair = input.topTwoMethodIds;
  const multiPair = pair.every(id => MULTI.has(id));
  const ratioPair = exactly(RATIO, pair);
  const anglePair = exactly(ANGLE, pair);
  const changePair = exactly(CHANGE, pair);
  if (!multiPair && !ratioPair && !anglePair && !changePair) {
    return result('not_applicable', '8C2C2_TOP_TWO_FAMILY_NOT_SUPPORTED');
  }
  // Never interpret an uninspected illustration as evidence for a ranking.
  if (input.hasVisual || /\b(?:diagram|figure|picture|drawing|shown\s+(?:below|above))\b/i.test(input.prompt)) {
    return result('needs_review', '8C2C2_VISUAL_REVIEW_REQUIRED');
  }
  // Separate the *structure* evidence from multi-target/part ambiguity.
  if (input.hasParts || (input.prompt.match(/\?/g) ?? []).length !== 1 ||
      /\(\s*a\s*\)[\s\S]{0,300}\(\s*b\s*\)/i.test(input.prompt)) {
    return result('needs_review', '8C2C2_MULTIPART_REVIEW_REQUIRED');
  }

  if (multiPair && input.learnerLevel >= 2 &&
      (input.domain === 'measurement' || input.domain === 'whole_numbers')) {
    // Distinguish ordinal positions from number of intervening equal gaps.
    // Require the specified interval length, two explicit ordinal positions,
    // and a *distance-between* target: ordinal words alone are insufficient.
    const gap = /\b\d+(?:\.\d+)?\s*(?:m|cm|metres?|meters?)\s+apart\b/i.test(input.prompt);
    const ordinalPair = /\bbetween\s+(?:the\s+)?\d{1,4}(?:st|nd|rd|th)\s+(?:\w+\s+){0,3}and\s+(?:the\s+)?\d{1,4}(?:st|nd|rd|th)\b/i.test(input.prompt);
    const spacingQuestion = /\b(?:what\s+is\s+the\s+distance|how\s+far)\s+between\b/i.test(input.prompt);
    if (gap && ordinalPair && spacingQuestion) {
      return result('specialist_review', '8C2C2_EQUAL_SPACING_INTERVAL_COUNT_REVIEW');
    }
  }

  if (multiPair && input.learnerLevel >= 3 &&
      (input.domain === 'whole_numbers' || input.domain === 'model' || input.domain === 'word_problems')) {
    // Only mark a *chain*, not a lone "twice as many" statement. A known
    // combined total and two multiplicative relations must be explicit.
    const relations = input.prompt.match(/\b(?:twice|thrice|double|triple|half|three\s+times|two\s+times)\s+as\s+many\b/gi) ?? [];
    const combinedTotal = /\b(?:together|altogether|in\s+total)\b.{0,48}\b\d{2,6}\b/i.test(input.prompt);
    if (relations.length >= 2 && combinedTotal && /\bhow\s+many\b/i.test(input.prompt)) {
      return result('specialist_review', '8C2C2_MULTIPLICATIVE_CHAIN_REVIEW');
    }
  }

  if (ratioPair && input.learnerLevel >= 5 && input.domain === 'ratio') {
    const ratios = input.prompt.match(/\b\d{1,4}\s*:\s*\d{1,4}\b/g) ?? [];
    const transitioned = /\b(?:after|later|then)\b/i.test(input.prompt) &&
      /\b(?:more|added|removed|gave\s+away|taken\s+away)\b/i.test(input.prompt) &&
      /\b(?:ratio\s+became|ratio\s+changed\s+to|new\s+ratio|ratio\s+was\s+now)\b/i.test(input.prompt);
    if (ratios.length >= 2 && transitioned) {
      return result('specialist_review', '8C2C2_CHANGING_RATIO_REVIEW');
    }
    return result('needs_review', '8C2C2_RATIO_EVIDENCE_UNRESOLVED');
  }

  if (multiPair) {
    // These general-purpose methods may legitimately be used together; the
    // question alone cannot establish a unique pedagogically best choice.
    return result('complementary', '8C2C2_MULTISTEP_METHODS_COMPLEMENTARY');
  }
  if (anglePair) return result('needs_review', '8C2C2_ANGLE_RELATIONSHIP_REVIEW');
  if (changePair) return result('not_applicable', '8C2C2_USE_EXISTING_CHANGE_DIFFERENTIATION');
  return result('not_applicable', '8C2C2_NOT_APPLICABLE');
}
