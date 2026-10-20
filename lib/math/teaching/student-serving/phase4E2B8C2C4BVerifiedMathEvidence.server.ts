/**
 * DREAMSCAPE ONE — Phase 4E-2B-8C-2C.4B.
 * Authenticated source-bound mathematical-evidence CORROBORATION for inactive drafts.
 *
 * This is NOT a human-verification system, durable signed attestation, score,
 * method approval, or learner-serving integration. It recognises only three
 * narrow question-text structures and checks the resulting facts with the
 * specialist applicability reviewer. Broader wording, diagrams, and all
 * non-versioned questions remain pending independent staff verification.
 *
 * Critically: never accept caller-provided facts, `approved`, source text,
 * answer keys, method IDs, question versions, or review flags. Never return
 * question text, extracted facts, solver calculations, or raw error messages.
 */
import 'server-only';

import {
  inspectStaffSpecialistReviewQueue,
} from './phase4E2B8C2C4AStaffSpecialistReview.server';
import {
  resolveStaffMathTeachingSource,
} from './phase4E2A3StaffSourceResolver.server';
import {
  reviewSpecialistDraftApplicability,
  type SpecialistDraftId,
  type SpecialistFact,
} from '../../../math-intelligence/teaching/method-library/methods/phase4E2B8C2C3BApplicabilityReview';
import {
  PHASE4E2B8C2C3A_SPECIALIST_DRAFTS,
} from '../../../math-intelligence/teaching/method-library/methods/phase4E2B8C2C3ASpecialistDrafts';

export const STAFF_MATH_EVIDENCE_VERSION = '4E-2B-8C-2C.4B' as const;
const SPACING: SpecialistDraftId = 'heuristic.multi_step.equal_spacing_interval_count';
const COMPARISON: SpecialistDraftId = 'heuristic.multi_step.multiplicative_comparison_chain';
const CHANGING: SpecialistDraftId = 'ratio.relationship.before_after_change';
const SAFE_IDS: readonly SpecialistDraftId[] = [SPACING, COMPARISON, CHANGING];
const MAX_PROMPT = 1500;
const MAX_VALUE = 1000000;

type Stage = 'query' | 'staff_gate' | 'source' | 'version' | 'evidence';
type Classification = Readonly<{
  methodId: SpecialistDraftId;
  status: 'source_correlated_for_review' | 'manual_verification_required';
  reasonCode: string;
  /** Only from the same freshly retrieved authoritative question row. */
  sourceVersion: number | null;
}>;
type Marker = Readonly<{
  version: typeof STAFF_MATH_EVIDENCE_VERSION;
  previewOnly: true;
  teachingApproved: false;
  studentReleased: false;
  sourceTextDisclosed: false;
  evidenceFactsDisclosed: false;
  persisted: false;
  reusableApprovalProof: false;
  specialistScore: null;
  specialistRank: null;
  pedagogicalRole: 'unresolved';
}>;
export type StaffMathEvidenceReview = Marker & (
  | Readonly<{status: 'blocked'; stage: Stage; reasonCode: string; findings: readonly []}>
  | Readonly<{status: 'pending_manual_review'; stage: 'evidence'; reasonCode: string;
      findings: readonly Classification[]}>
);

const MARKER: Marker = Object.freeze({
  version: STAFF_MATH_EVIDENCE_VERSION,
  previewOnly: true, teachingApproved: false, studentReleased: false,
  sourceTextDisclosed: false, evidenceFactsDisclosed: false, persisted: false,
  reusableApprovalProof: false, specialistScore: null, specialistRank: null,
  pedagogicalRole: 'unresolved',
});
const blocked = (stage: Stage, reasonCode: string): StaffMathEvidenceReview =>
  Object.freeze({...MARKER, status: 'blocked', stage, reasonCode, findings: [] as const});

const isRecord = (x: unknown): x is Record<string, unknown> =>
  x !== null && typeof x === 'object' && !Array.isArray(x);
const hasOnlyIds = (x: unknown): x is {quizId: string; questionId: string} =>
  isRecord(x) && Object.keys(x).sort().join(',') === 'questionId,quizId' &&
  typeof x.quizId === 'string' && typeof x.questionId === 'string';
const integer = (text: string): number | null => {
  if (!/^\d{1,7}$/.test(text)) return null;
  const n = Number(text);
  return Number.isSafeInteger(n) && n > 0 && n <= MAX_VALUE ? n : null;
};
const positiveLength = (text: string): number | null => {
  if (!/^\d{1,6}(?:\.\d{1,3})?$/.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) && n > 0 && n <= MAX_VALUE ? n : null;
};
const safePrompt = (x: unknown): string | null =>
  typeof x === 'string' && x.length > 0 && x.length <= MAX_PROMPT &&
  !/[<>\u0000-\u001f]/.test(x) ? x.trim() : null;

/**
 * VERY RESTRICTED text correlation, not a general-purpose math-language parser.
 * Every regex is anchored, and facts are computed strictly from the trusted DB
 * question row. Recognising a pattern establishes no human review or pedagogy.
 * Altered wording falls back to manual verification rather than guessed facts.
 */
function factsFromTrustedPrompt(methodId: SpecialistDraftId, prompt: string): SpecialistFact | null {
  if (methodId === SPACING) {
    const match = /^Trees are planted (\d{1,6}(?:\.\d{1,3})?) m apart along a straight road\. What is the distance between the (\d{1,7})(?:st|nd|rd|th) tree and the (\d{1,7})(?:st|nd|rd|th) tree\?$/i.exec(prompt);
    if (!match) return null;
    const gap = positiveLength(match[1]);
    const first = integer(match[2]);
    const last = integer(match[3]);
    if (gap === null || first === null || last === null || last <= first) return null;
    return Object.freeze({
      kind: 'equal_spacing_interval_count',
      firstOrdinal: first, lastOrdinal: last, gapLength: gap,
      equalAdjacentGaps: true, indexing: 'consecutive', path: 'straight',
      goal: 'distance_between_positions',
    });
  }
  if (methodId === COMPARISON) {
    const match = /^([A-Za-z]{1,30}) has some marbles\. ([A-Za-z]{1,30}) has (twice|thrice) as many as \1\. ([A-Za-z]{1,30}) has (half|twice|thrice) as many as \2\. Together they have (\d{1,7}) marbles\. How many marbles does ([A-Za-z]{1,30}) have\?$/i.exec(prompt);
    if (!match) return null;
    if (new Set([match[1], match[2], match[4]].map(x => x.toLowerCase())).size !== 3 ||
        integer(match[6]) === null) return null;
    const targetIndex = [match[1], match[2], match[4]].findIndex(x => x.toLowerCase() === match[7].toLowerCase());
    if (targetIndex < 0) return null;
    const factor = (word: string): readonly [number,number] =>
      word.toLowerCase() === 'twice' ? [2,1] : word.toLowerCase() === 'thrice' ? [3,1] : [1,2];
    const firstFactor = factor(match[3]);
    const secondFactor = factor(match[5]);
    return Object.freeze({
      kind: 'multiplicative_comparison_chain', quantityKeys: ['q1','q2','q3'],
      relationships: [
        {quantity:'q2',relativeTo:'q1',numerator:firstFactor[0],denominator:firstFactor[1]},
        {quantity:'q3',relativeTo:'q2',numerator:secondFactor[0],denominator:secondFactor[1]},
      ],
      combinedTotalKnown: true, combinedTotalIncludesExactlyTheseQuantities: true,
      targetQuantity: `q${targetIndex+1}`, comparisonType: 'multiplicative',
    });
  }
  if (methodId === CHANGING) {
    const match = /^The ratio of ([a-z]{2,25}) to ([a-z]{2,25}) was (\d{1,7})\s*:\s*(\d{1,7})\. After ([a-z]{1,30}) bought (\d{1,7}) more \1 and (\d{1,7}) more \2, the ratio became (\d{1,7})\s*:\s*(\d{1,7})\. How many \2 did \5 have at first\?$/i.exec(prompt);
    if (!match || match[1].toLowerCase() === match[2].toLowerCase()) return null;
    const values = [match[3],match[4],match[6],match[7],match[8],match[9]].map(integer);
    if (values.some(x => x === null)) return null;
    const [a,b,da,db,c,d] = values as number[];
    return Object.freeze({
      kind: 'ratio_before_after_change',
      beforeRatio: [a,b] as [number,number], afterRatio: [c,d] as [number,number],
      changes: [da,db] as [number,number],
      changeEvidence: 'both_explicit', quantityType:'whole_objects', goal:'original_quantity',
    });
  }
  return null;
}

/**
 * Authenticate twice (4A queue then fresh DB resolver). These are two READS,
 * not an atomic transaction. This output is consequently a transient staff
 * diagnostic, NEVER a signed evidence receipt or durable source-version proof.
 * Any later persisted human confirmation must independently recheck current
 * question ID, version, text and authorisation in one trusted workflow.
 */
export async function inspectStaffMathSpecialistEvidence(
  request: Request,
  query: Readonly<{quizId: unknown; questionId: unknown}>,
): Promise<StaffMathEvidenceReview> {
  if (!hasOnlyIds(query)) return blocked('query', 'EVIDENCE_8C2C4B_INVALID_QUERY');
  try {
    const queue = await inspectStaffSpecialistReviewQueue(request, query);
    if (queue.status !== 'pending_evidence' || queue.candidates.length === 0)
      return blocked('staff_gate', 'EVIDENCE_8C2C4B_STAFF_QUEUE_NOT_READY');
    const resolved = await resolveStaffMathTeachingSource(request, query);
    if (resolved.status !== 'ready')
      return blocked('source', 'EVIDENCE_8C2C4B_FRESH_SOURCE_NOT_READY');
    if (resolved.sourceIdentity.quizId !== query.quizId ||
        resolved.sourceIdentity.questionId !== query.questionId ||
        !Number.isSafeInteger(resolved.sourceIdentity.questionVersion) ||
        (resolved.sourceIdentity.questionVersion as number) <= 0)
      return blocked('version', 'EVIDENCE_8C2C4B_SOURCE_VERSION_UNAVAILABLE');

    const source = resolved.source as {question?: unknown};
    const question = source.question;
    if (!isRecord(question) || question.id !== query.questionId ||
        typeof question.primary_level !== 'number' ||
        !Number.isInteger(question.primary_level) ||
        typeof question.subject !== 'string' || question.subject !== 'math' ||
        // Reject auxiliary content that might contain diagrams, overlays or
        // material qualifying the otherwise simple prompt.
        (question.content !== null && question.content !== undefined && question.content !== ''))
      return blocked('source', 'EVIDENCE_8C2C4B_SOURCE_NOT_TEXT_ONLY');
    const prompt = safePrompt(question.prompt);
    if (!prompt) return blocked('source', 'EVIDENCE_8C2C4B_PROMPT_NOT_USABLE');

    const findings: Classification[] = [];
    const version = resolved.sourceIdentity.questionVersion;
    for (const candidate of queue.candidates) {
      if (!SAFE_IDS.includes(candidate.methodId) || candidate.status !== 'requires_independently_verified_facts' ||
          candidate.methodStatus !== 'draft' || candidate.structureEvidence !== 'not_verified') continue;
      const draft = PHASE4E2B8C2C3A_SPECIALIST_DRAFTS.find(x => x.methodId === candidate.methodId);
      if (!draft || draft.status !== 'draft' || candidate.familyId !== draft.familyId ||
          !draft.applicability.levels.includes(question.primary_level as 1|2|3|4|5|6)) continue;
      const facts = factsFromTrustedPrompt(candidate.methodId, prompt);
      // Do not invent the applicability context: 4A has already checked exact
      // taxonomy, and only this specific server-side draft's declared values
      // are passed to the *advisory* structure reviewer. This cannot rank.
      const judgement = facts ? reviewSpecialistDraftApplicability({
        methodId: candidate.methodId, learnerLevel: question.primary_level,
        domain: draft.applicability.domains[0],
        problemStructure: draft.applicability.structures[0],
        requiredReasoning: draft.applicability.reasoning,
        primaryFamilies: [candidate.familyId],
        hasVisual: false, visualReviewed: false, facts,
      }) : null;
      const supported = judgement?.status === 'compatible_for_review';
      findings.push(Object.freeze({
        methodId: candidate.methodId,
        status: supported ? 'source_correlated_for_review' : 'manual_verification_required',
        reasonCode: supported ? 'EVIDENCE_8C2C4B_TEXT_STRUCTURE_CORROBORATED' :
          'EVIDENCE_8C2C4B_MANUAL_STRUCTURE_REVIEW_REQUIRED',
        sourceVersion: version,
      }));
    }
    if (findings.length === 0)
      return blocked('evidence', 'EVIDENCE_8C2C4B_NO_VALID_SPECIALIST_DRAFT');
    return Object.freeze({
      ...MARKER, status: 'pending_manual_review', stage: 'evidence',
      reasonCode: 'EVIDENCE_8C2C4B_HUMAN_VERIFICATION_REQUIRED',
      findings: Object.freeze(findings),
    });
  } catch {
    // No question text, answer data, raw database errors or token contents.
    return blocked('evidence', 'EVIDENCE_8C2C4B_INTERNAL_UNAVAILABLE');
  }
}
