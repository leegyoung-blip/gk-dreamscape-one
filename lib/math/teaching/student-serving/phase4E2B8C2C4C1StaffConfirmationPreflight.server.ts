/**
 * DREAMSCAPE ONE — Phase 4E-2B-8C-2C.4C-1.
 * STAFF-ONLY specialist-structure review-intent PREFLIGHT, NOT durable confirmation.
 *
 * This module accepts an explicit staff decision about ONE inactive specialist
 * method, rechecks authenticated staff identity, the 4B staff evidence gate,
 * current question version, and a fingerprint of the authoritative source
 * before producing a strict, non-reusable audit-intent envelope.
 *
 * This is deliberately NOT a write, attestation, signed receipt, method
 * approval, trusted human verification, scoring rule, or learner API. Two DB
 * reads cannot be atomic; 4C-2 must revalidate auth, source content and version
 * inside the same DB transaction before persisting a genuine audit event.
 *
 * Never pass raw facts, answer_data, learner evidence, question text,
 * arbitrary notes, or claimed reviewer identity from an HTTP caller.
 */
import 'server-only';

import { createHash } from 'node:crypto';
import { requireCurriculumDeveloperApiAccess } from '@/lib/curriculum-developer/server/CurriculumDeveloperApiAuth';
import { resolveStaffMathTeachingSource } from './phase4E2A3StaffSourceResolver.server';
import { inspectStaffMathSpecialistEvidence } from './phase4E2B8C2C4BVerifiedMathEvidence.server';
import type { SpecialistDraftId } from '../../../math-intelligence/teaching/method-library/methods/phase4E2B8C2C3BApplicabilityReview';

export const STAFF_CONFIRMATION_PREFLIGHT_VERSION = '4E-2B-8C-2C.4C-1' as const;

export type StructureDecision = 'confirmed_structure' | 'rejected_structure' | 'needs_further_review';
export type ReviewReasonCode =
  | 'STRUCTURE_INDEPENDENTLY_CHECKED'
  | 'STRUCTURE_NOT_APPLICABLE'
  | 'EVIDENCE_CONTRADICTS_STRUCTURE'
  | 'INSUFFICIENT_EVIDENCE'
  | 'QUESTION_WORDING_AMBIGUOUS'
  | 'INDEPENDENT_VISUAL_REVIEW_NEEDED';

type ReviewInput = Readonly<{
  quizId: string;
  questionId: string;
  questionVersion: number;
  methodId: SpecialistDraftId;
  decision: StructureDecision;
  reasonCode: ReviewReasonCode;
}>;

type Stage = 'input' | 'staff' | 'source' | 'evidence' | 'freshness';
type Marker = Readonly<{
  version: typeof STAFF_CONFIRMATION_PREFLIGHT_VERSION;
  status?: 'blocked' | 'preflight_only';
  staffOnly: true;
  persisted: false;
  auditEventId: null;
  humanVerificationEstablished: false;
  reusableApprovalProof: false;
  teachingApproved: false;
  studentReleased: false;
  methodActivated: false;
  specialistScore: null;
  specialistRank: null;
  pedagogicalRole: 'unresolved';
}>;

export type StaffConfirmationPreflight = Marker & (
  | Readonly<{status: 'blocked'; stage: Stage; reasonCode: string; auditIntent: null}>
  | Readonly<{status: 'preflight_only'; stage: 'freshness'; reasonCode: 'CONFIRM_8C2C4C1_UNRECORDED_INTENT';
      auditIntent: Readonly<{
        eventType: 'specialist_structure_review_intent';
        reviewerId: string;
        quizId: string;
        questionId: string;
        questionVersion: number;
        methodId: SpecialistDraftId;
        decision: StructureDecision;
        reviewReasonCode: ReviewReasonCode;
        sourceFingerprintSha256: string;
        /** Not an event timestamp. No entry has been persisted. */
        recordedAt: null;
      }>;
    }>
);

const MARKER: Marker = Object.freeze({
  version: STAFF_CONFIRMATION_PREFLIGHT_VERSION,
  staffOnly: true,
  persisted: false,
  auditEventId: null,
  humanVerificationEstablished: false,
  reusableApprovalProof: false,
  teachingApproved: false,
  studentReleased: false,
  methodActivated: false,
  specialistScore: null,
  specialistRank: null,
  pedagogicalRole: 'unresolved',
});
const fail = (stage: Stage, reasonCode: string): StaffConfirmationPreflight =>
  Object.freeze({...MARKER, status: 'blocked' as const, stage, reasonCode, auditIntent: null});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isRecord = (x: unknown): x is Record<string, unknown> =>
  x !== null && typeof x === 'object' && !Array.isArray(x);
const validUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);
const SAFE_METHODS = new Set<SpecialistDraftId>([
  'heuristic.multi_step.equal_spacing_interval_count',
  'heuristic.multi_step.multiplicative_comparison_chain',
  'ratio.relationship.before_after_change',
]);
const REASONS: Readonly<Record<StructureDecision, readonly ReviewReasonCode[]>> = Object.freeze({
  confirmed_structure: ['STRUCTURE_INDEPENDENTLY_CHECKED'],
  rejected_structure: ['STRUCTURE_NOT_APPLICABLE', 'EVIDENCE_CONTRADICTS_STRUCTURE'],
  needs_further_review: ['INSUFFICIENT_EVIDENCE', 'QUESTION_WORDING_AMBIGUOUS', 'INDEPENDENT_VISUAL_REVIEW_NEEDED'],
});
function parseReview(input: unknown): ReviewInput | null {
  if (!isRecord(input) || Object.keys(input).sort().join(',') !==
      'decision,methodId,questionId,questionVersion,quizId,reasonCode') return null;
  if (!validUuid(input.quizId) || !validUuid(input.questionId) ||
      !Number.isSafeInteger(input.questionVersion) || (input.questionVersion as number) <= 0 ||
      typeof input.methodId !== 'string' || !SAFE_METHODS.has(input.methodId as SpecialistDraftId) ||
      typeof input.decision !== 'string' || !Object.prototype.hasOwnProperty.call(REASONS, input.decision) ||
      typeof input.reasonCode !== 'string') return null;
  const decision = input.decision as StructureDecision;
  if (!REASONS[decision].includes(input.reasonCode as ReviewReasonCode)) return null;
  return input as ReviewInput;
}

/** Stable comparison digest, NOT cryptographic authorisation or a signed proof. */
function canonicalJson(value: unknown, depth = 0): string {
  if (depth > 14) throw new Error('Nested source not supported');
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '['+value.map(v => canonicalJson(v, depth + 1)).join(',')+']';
  if (isRecord(value)) {
    return '{'+Object.keys(value).sort().map(k => {
      if (value[k] === undefined) throw new Error('Undefined source field');
      return JSON.stringify(k)+':'+canonicalJson(value[k], depth + 1);
    }).join(',')+'}';
  }
  throw new Error('Unsupported source field');
}

type Snapshot = Readonly<{fingerprint: string; questionVersion: number}>;
async function freshSnapshot(request: Request, input: ReviewInput): Promise<Snapshot | null> {
  const resolved = await resolveStaffMathTeachingSource(request, {quizId: input.quizId, questionId: input.questionId});
  if (resolved.status !== 'ready' ||
      resolved.sourceIdentity.quizId !== input.quizId ||
      resolved.sourceIdentity.questionId !== input.questionId ||
      resolved.sourceIdentity.questionVersion !== input.questionVersion ||
      resolved.source.quizId !== input.quizId ||
      resolved.source.sourceType !== 'quiz' || resolved.source.sourceTable !== 'math_questions') return null;
  const question: unknown = resolved.source.question;
  if (!isRecord(question) || question.id !== input.questionId || question.subject !== 'math') return null;
  const canonical = canonicalJson({
    quizId: input.quizId, questionId: input.questionId, version: input.questionVersion,
    question, quizStatus: resolved.staffReview.quizStatus,
    questionStatus: resolved.staffReview.questionStatus,
    quizPublished: resolved.staffReview.quizPublished,
  });
  if (canonical.length > 300000) return null;
  const fingerprint = createHash('sha256').update(canonical, 'utf8').digest('hex');
  return Object.freeze({fingerprint, questionVersion: input.questionVersion});
}

async function staffIdentity(request: Request): Promise<string | null> {
  const actor = await requireCurriculumDeveloperApiAccess(request);
  return actor && (actor.role === 'admin' || actor.role === 'curriculum_lead') && validUuid(actor.user_id)
    ? actor.user_id : null;
}

/**
 * A human action can request confirmation, but this preflight does NOT prove
 * that the human checked the question. Never treat this output as verified
 * evidence or an auditable record. Durable audit insertion in 4C-2 must lock
 * and freshly recheck the current source inside its transaction.
 */
export async function prepareStaffSpecialistStructureReviewIntent(
  request: Request,
  rawInput: unknown,
): Promise<StaffConfirmationPreflight> {
  const input = parseReview(rawInput);
  if (!input) return fail('input', 'CONFIRM_8C2C4C1_INVALID_REQUEST');
  try {
    const firstActor = await staffIdentity(request);
    if (!firstActor) return fail('staff', 'CONFIRM_8C2C4C1_NOT_AUTHORIZED');
    const before = await freshSnapshot(request, input);
    if (!before) return fail('source', 'CONFIRM_8C2C4C1_SOURCE_NOT_CURRENT');
    const evidence = await inspectStaffMathSpecialistEvidence(request, {
      quizId: input.quizId, questionId: input.questionId,
    });
    if (evidence.status !== 'pending_manual_review' || evidence.persisted !== false ||
        evidence.teachingApproved !== false || evidence.studentReleased !== false)
      return fail('evidence', 'CONFIRM_8C2C4C1_EVIDENCE_GATE_NOT_READY');
    const candidate = evidence.findings.find(item =>
      item.methodId === input.methodId && item.sourceVersion === input.questionVersion);
    if (!candidate) return fail('evidence', 'CONFIRM_8C2C4C1_METHOD_OR_VERSION_MISMATCH');
    // A reviewer may reject or defer any short-listed candidate, but may request
    // structure confirmation only if the source itself corroborates the facts.
    // Even then, this is an unrecorded INTENT, never verified approval.
    if (input.decision === 'confirmed_structure' && candidate.status !== 'source_correlated_for_review')
      return fail('evidence', 'CONFIRM_8C2C4C1_UNCORROBORATED_STRUCTURE');
    const after = await freshSnapshot(request, input);
    if (!after || before.fingerprint !== after.fingerprint)
      return fail('freshness', 'CONFIRM_8C2C4C1_SOURCE_CHANGED_DURING_REVIEW');
    const lastActor = await staffIdentity(request);
    if (!lastActor || lastActor !== firstActor)
      return fail('staff', 'CONFIRM_8C2C4C1_STAFF_IDENTITY_CHANGED');
    const auditIntent = Object.freeze({
      eventType: 'specialist_structure_review_intent' as const,
      reviewerId: lastActor,
      quizId: input.quizId,
      questionId: input.questionId,
      questionVersion: input.questionVersion,
      methodId: input.methodId,
      decision: input.decision,
      reviewReasonCode: input.reasonCode,
      sourceFingerprintSha256: after.fingerprint,
      recordedAt: null,
    });
    return Object.freeze({...MARKER, status: 'preflight_only', stage: 'freshness',
      reasonCode: 'CONFIRM_8C2C4C1_UNRECORDED_INTENT', auditIntent});
  } catch {
    // Raw exceptions may include sensitive source / tokens. Never reflect them.
    return fail('freshness', 'CONFIRM_8C2C4C1_INTERNAL_UNAVAILABLE');
  }
}
