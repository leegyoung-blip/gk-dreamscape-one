/**
 * DREAMSCAPE ONE / 4E-2B-8C-2B.2
 * Conservative, question-agnostic comparison of closely related method IDs.
 * SHADOW DIAGNOSTIC ONLY: never alters candidate scores, method selection,
 * reviewer approvals, or learner-facing teaching.
 *
 * Input comes exclusively from the validated 4A contract plus eligible 4C
 * method IDs. Never use question codes, stored answers, learner data or LLMs.
 * The output contains only allow-listed static codes and method IDs.
 */
export const METHOD_DIFFERENTIATION_VERSION = '4E-2B-8C-2B.2' as const;

export type MethodDifferentiation = Readonly<{
  version: typeof METHOD_DIFFERENTIATION_VERSION;
  status: 'evidence_found' | 'needs_review' | 'not_applicable';
  ruleCode: string;
  preferredMethodId: string | null;
  lessSuitableMethodId: string | null;
}>;

type ComparisonContext = Readonly<{
  learnerLevel: number;
  domain: string;
  problemStructure: string;
  prompt: string;
  hasVisual: boolean;
  hasParts: boolean;
  eligibleMethodIds: readonly string[];
}>;

const methods = Object.freeze({
  forward: 'model.change.forward_change',
  findChange: 'model.change.find_change',
  unknownAngle: 'geometry.angle.find_unknown',
  knownAngles: 'geometry.angle.known_relationships',
  partWhole: 'ratio.relationship.part_whole_connection',
  ratioUnits: 'ratio.relationship.ratio_units',
  subgoals: 'heuristic.multi_step.identify_subgoals',
  dependency: 'heuristic.multi_step.dependency_order',
  synthesis: 'heuristic.multi_step.final_synthesis',
});

function diagnostic(status: MethodDifferentiation['status'], ruleCode: string,
  preferredMethodId: string | null = null, lessSuitableMethodId: string | null = null,
): MethodDifferentiation {
  return {version: METHOD_DIFFERENTIATION_VERSION, status, ruleCode, preferredMethodId, lessSuitableMethodId};
}

function hasPair(ids: ReadonlySet<string>, a: string, b: string): boolean {
  return ids.has(a) && ids.has(b);
}
/**
 * A differential explanation is only meaningful for the actual two leaders.
 * The selector may have three or more eligible methods; comparing a different
 * pair makes the review label misleading even when the numeric ranking is safe.
 * Reject incomplete, duplicate, unranked and out-of-order candidate records.
 */
export function topTwoEligibleMethodIds(
  candidates: readonly Readonly<{ methodId: string; rank: number | null; eligible: boolean }>[],
): string[] {
  if (!Array.isArray(candidates)) return [];
  const top = candidates.filter(candidate =>
    candidate && candidate.eligible === true &&
    (candidate.rank === 1 || candidate.rank === 2) &&
    typeof candidate.methodId === 'string' &&
    /^[A-Za-z0-9_.:-]{1,120}$/.test(candidate.methodId));
  if (top.length !== 2 || top[0].rank === top[1].rank ||
      top[0].methodId === top[1].methodId) return [];
  return [...top].sort((left,right) => left.rank! - right.rank!).map(item => item.methodId);
}

/**
 * Only an explicit, nonvisual, single-part question may produce a preferred
 * method. Near-synonymous methods are NOT assumed to be mutually exclusive;
 * their unresolved overlap remains eligible for the separate B4 staff review.
 */
export function differentiateCloselyRelatedMethods(input: ComparisonContext): MethodDifferentiation {
  if (!input || typeof input.prompt !== 'string' || input.prompt.length < 12 ||
      input.prompt.length > 4000 || !Number.isInteger(input.learnerLevel) ||
      input.learnerLevel < 1 || input.learnerLevel > 6 ||
      !Array.isArray(input.eligibleMethodIds)) {
    return diagnostic('not_applicable', '8C2B_INVALID_OR_MISSING_EVIDENCE');
  }
  const ids = new Set(input.eligibleMethodIds.filter(x => typeof x === 'string'));
  // Guard against future callers accidentally comparing a third-ranked method.
  if (input.eligibleMethodIds.length !== 2 || ids.size !== 2) {
    return diagnostic('not_applicable', '8C2B_EXACT_TOP_PAIR_REQUIRED');
  }
  const related = [
    [methods.forward, methods.findChange],
    [methods.unknownAngle, methods.knownAngles],
    [methods.partWhole, methods.ratioUnits],
    [methods.dependency, methods.synthesis],
    [methods.subgoals, methods.dependency],
  ].some(([a,b]) => hasPair(ids,a,b));
  if (!related) return diagnostic('not_applicable', '8C2B_NO_RELATED_ELIGIBLE_PAIR');
  // Written references to uninspected visual content are not mathematical proof.
  if (input.hasVisual || input.hasParts ||
      /\b(?:diagram|figure|picture|drawing|shown\s+(?:below|above)|refer\s+to\s+the\s+image)\b/i.test(input.prompt)) {
    return diagnostic('needs_review', '8C2B_VISUAL_OR_MULTIPART_REVIEW_REQUIRED');
  }
  // A lone trailing question is required, to avoid accidentally interpreting
  // one sub-question as the target of another.
  const questions = input.prompt.match(/\?/g) ?? [];
  if (questions.length !== 1) return diagnostic('needs_review', '8C2B_TARGET_NOT_UNIQUE');
  const qmark = input.prompt.indexOf('?');
  const stem = input.prompt.slice(0, qmark);
  const lastSentence = stem.split(/[.!]/).at(-1)?.trim() || '';
  const nums = (stem.match(/\b\d+(?:,\d{3})*\b/g) ?? []).length;

  if (hasPair(ids, methods.forward, methods.findChange) &&
      input.domain === 'whole_numbers' && input.problemStructure === 'subtraction_change' &&
      input.learnerLevel <= 3) {
    const knownDecrease = /\b(?:sells?|sold|spent|gave\s+away|removed|took\s+away|lost|used|ate|flew\s+away)\b\s+(?:\w+\s+){0,2}\d+\b|\b\d+\b(?:\s+\w+){0,3}\s+(?:were\s+|was\s+)?(?:sold|removed|lost|used|taken\s+away)\b/i.test(stem);
    const finalTarget = /\bhow\s+many\b.{0,90}\b(?:left|remain|remaining)\b/i.test(lastSentence);
    if (knownDecrease && finalTarget && nums >= 2 &&
        !/\bhow\s+many\b.{0,60}\b(?:sold|removed|lost|used|taken\s+away)\b/i.test(lastSentence)) {
      return diagnostic('evidence_found', '8C2B_KNOWN_DECREASE_FINAL_UNKNOWN', methods.forward, methods.findChange);
    }
    const unknownDecrease = /\b(?:some|an\s+unknown\s+number\s+of)\b.{0,36}\b(?:sold|removed|lost|used|taken\s+away|flew\s+away)\b/i.test(stem);
    const knownRemainder = /\b\d+\b.{0,25}\b(?:left|remained|remain)\b|\b(?:left|remained|remain)\b.{0,25}\b\d+\b/i.test(stem);
    const changeTarget = /\bhow\s+many\b.{0,75}\b(?:sold|removed|lost|used|taken\s+away|flew\s+away)\b/i.test(lastSentence);
    if (!knownDecrease && unknownDecrease && knownRemainder && changeTarget && nums >= 2) {
      return diagnostic('evidence_found', '8C2B_CHANGE_UNKNOWN_FINAL_KNOWN', methods.findChange, methods.forward);
    }
    return diagnostic('needs_review', '8C2B_CHANGE_TARGET_UNRESOLVED');
  }

  if (hasPair(ids, methods.unknownAngle, methods.knownAngles) &&
      input.domain === 'geometry' && input.learnerLevel >= 3 &&
      /\b(?:angles?|degrees?|straight\s+line|triangle)\b/i.test(stem)) {
    const explicitUnknownTarget = /\b(?:find|what\s+is)\b.{0,55}\b(?:angle|size\s+of\s+(?:the\s+)?angle)\b/i.test(lastSentence);
    const explicitRelationship = /\b(?:straight\s+line|triangle|vertically\s+opposite|around\s+a\s+point|complementary|supplementary)\b/i.test(stem);
    const givenAngle = /\b\d+\s*(?:°|degrees?\b)/i.test(stem);
    if (explicitUnknownTarget && explicitRelationship && givenAngle) {
      return diagnostic('evidence_found', '8C2B_EXPLICIT_UNKNOWN_ANGLE', methods.unknownAngle, methods.knownAngles);
    }
    return diagnostic('needs_review', '8C2B_ANGLE_RELATIONSHIP_ONLY');
  }

  if (hasPair(ids, methods.partWhole, methods.ratioUnits) && input.learnerLevel >= 5) {
    const ratio = /\bratio\s+of\s+([a-z][a-z0-9_-]{0,24})\s+to\s+([a-z][a-z0-9_-]{0,24})\s+is\s+\d+\s*:\s*\d+/i.exec(stem);
    const total = /\b(?:altogether|in\s+total|together|total\s+(?:number|amount)|sum\s+of)\b/i.test(stem);
    if (ratio && total && nums >= 3) {
      const question = lastSentence.toLowerCase();
      const names = [ratio[1], ratio[2]];
      const targeted = names.filter(name => new RegExp('\\b' + name + '\\b', 'i').test(question));
      if (targeted.length === 1 && /\bhow\s+many\b/i.test(question)) {
        return diagnostic('evidence_found', '8C2B_RATIO_TOTAL_TO_ONE_PART', methods.partWhole, methods.ratioUnits);
      }
    }
    return diagnostic('needs_review', '8C2B_RATIO_UNITS_OR_PART_WHOLE_UNRESOLVED');
  }

  if (hasPair(ids, methods.dependency, methods.synthesis)) {
    return diagnostic('needs_review', '8C2B_MULTISTEP_DEPENDENCY_SYNTHESIS_OVERLAP');
  }
  if (hasPair(ids, methods.subgoals, methods.dependency)) {
    return diagnostic('needs_review', '8C2B_MULTISTEP_SUBGOAL_DEPENDENCY_OVERLAP');
  }
  return diagnostic('needs_review', '8C2B_RELATED_METHOD_EVIDENCE_INSUFFICIENT');
}
