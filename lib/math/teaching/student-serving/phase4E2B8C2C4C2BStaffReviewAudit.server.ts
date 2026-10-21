/**
 * DREAMSCAPE ONE — Phase 4E-2B-8C-2C.4C-2B.
 * INTERNAL STAFF-ONLY append-only audit writer. NO HTTP route in this phase.
 *
 * Requires a fingerprint captured for the staff review DISPLAY snapshot.
 * Never generates a fresh expected fingerprint silently at the point of write:
 * doing so would let a stale review bind itself to newer question contents.
 *
 * The database rechecks JWT staff role and locks/rehashes source rows in the
 * same recording transaction. This writes a reviewer-declared decision only;
 * it does NOT certify human correctness, activate a method, rank candidates,
 * or release teaching to learners.
 *
 * The earlier Node 4C-1 fingerprint is intentionally NOT used here: SQL uses
 * its own DB-native SHA-256 projection (db_jsonb_sha256_v1).
 */
import 'server-only';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { requireCurriculumDeveloperApiAccess } from '@/lib/curriculum-developer/server/CurriculumDeveloperApiAuth';
import { prepareStaffSpecialistStructureReviewIntent } from './phase4E2B8C2C4C1StaffConfirmationPreflight.server';

const VERSION = '4E-2B-8C-2C.4C-2B' as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA = /^[0-9a-f]{64}$/;
type Input = Readonly<{
  quizId: string;
  questionId: string;
  questionVersion: number;
  methodId: 'heuristic.multi_step.equal_spacing_interval_count' |
    'heuristic.multi_step.multiplicative_comparison_chain' |
    'ratio.relationship.before_after_change';
  decision: 'confirmed_structure' | 'rejected_structure' | 'needs_further_review';
  reasonCode: string;
  /** Must be obtained at display time from the authenticated DB preview RPC. */
  displayedDbFingerprintSha256: string;
}>;
const isRecord = (x: unknown): x is Record<string, unknown> =>
  x !== null && typeof x === 'object' && !Array.isArray(x);

export type StaffAuditWriteResult = Readonly<{
  phase: typeof VERSION;
  status: 'blocked' | 'recorded';
  reasonCode: string;
  persisted: boolean;
  auditEventId: string | null;
  humanVerificationEstablished: false;
  reusableApprovalProof: false;
  teachingApproved: false;
  methodActivated: false;
  studentReleased: false;
}>;
function outcome(status: 'blocked' | 'recorded', reasonCode: string, eventId: string | null = null): StaffAuditWriteResult {
  return Object.freeze({
    phase: VERSION, status, reasonCode,
    persisted: status === 'recorded', auditEventId: status === 'recorded' ? eventId : null,
    humanVerificationEstablished: false as const,
    reusableApprovalProof: false as const,
    teachingApproved: false as const,
    methodActivated: false as const,
    studentReleased: false as const,
  });
}
function parse(input: unknown): Input | null {
  if (!isRecord(input) || Object.keys(input).sort().join(',') !==
      'decision,displayedDbFingerprintSha256,methodId,questionId,questionVersion,quizId,reasonCode') return null;
  if (typeof input.quizId !== 'string' || !UUID.test(input.quizId) ||
      typeof input.questionId !== 'string' || !UUID.test(input.questionId) ||
      typeof input.questionVersion !== 'number' ||
      !Number.isSafeInteger(input.questionVersion) || input.questionVersion <= 0 ||
      typeof input.displayedDbFingerprintSha256 !== 'string' || !SHA.test(input.displayedDbFingerprintSha256) ||
      typeof input.methodId !== 'string' || typeof input.decision !== 'string' ||
      typeof input.reasonCode !== 'string') return null;
  return input as Input;
}
function tokenFromRequest(request: Request): string | null {
  const match = /^Bearer\s+([^\s]+)$/i.exec((request.headers.get('authorization') || '').trim());
  return match?.[1] || null;
}

/**
 * A read-only DB fingerprint can be supplied to a future STAFF UI alongside
 * the exact question being displayed. Do not display or log answer-bearing
 * objects from the staff source resolver in this helper.
 */
export async function getStaffSpecialistDbSourceSnapshot(
  request: Request,
  ids: Readonly<{quizId: string; questionId: string}>,
): Promise<Readonly<{
  status: 'blocked' | 'preview_only';
  reasonCode: string;
  questionVersion: number | null;
  fingerprintSha256: string | null;
  approved: false;
}>> {
  const denied = (reasonCode: string) => Object.freeze({
    status: 'blocked' as const, reasonCode, questionVersion: null,
    fingerprintSha256: null, approved: false as const,
  });
  if (!ids || typeof ids.quizId !== 'string' || !UUID.test(ids.quizId) ||
      typeof ids.questionId !== 'string' || !UUID.test(ids.questionId))
    return denied('INVALID_QUERY');
  try {
    const actor = await requireCurriculumDeveloperApiAccess(request);
    const token = tokenFromRequest(request);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!actor || (actor.role !== 'admin' && actor.role !== 'curriculum_lead') ||
        typeof actor.user_id !== 'string' || !UUID.test(actor.user_id) ||
        !token || !url || !key) return denied('NOT_AUTHORIZED');
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: {Authorization: `Bearer ${token}`} },
    });
    const identity = await client.auth.getUser(token);
    if (identity.error || identity.data.user?.id !== actor.user_id)
      return denied('NOT_AUTHORIZED');
    const result = await client.rpc('math_specialist_structure_review_preview', {
      p_quiz_id: ids.quizId, p_question_id: ids.questionId,
    });
    if (result.error || !isRecord(result.data) || result.data.status !== 'preview_only' ||
        result.data.persisted !== false ||
        result.data.fingerprintVersion !== 'db_jsonb_sha256_v1' ||
        typeof result.data.questionVersion !== 'number' ||
        !Number.isSafeInteger(result.data.questionVersion) || result.data.questionVersion < 1 ||
        typeof result.data.sourceFingerprintSha256 !== 'string' ||
        !SHA.test(result.data.sourceFingerprintSha256))
      return denied('DB_SOURCE_NOT_READY');
    return Object.freeze({
      status: 'preview_only' as const,
      reasonCode: 'DISPLAY_SNAPSHOT_ONLY',
      questionVersion: result.data.questionVersion,
      fingerprintSha256: result.data.sourceFingerprintSha256,
      approved: false as const,
    });
  } catch {
    return denied('DB_SOURCE_UNAVAILABLE');
  }
}

/** NOT connected to any HTTP route or staff UI in this phase. */
export async function recordStaffSpecialistStructureReview(
  request: Request, rawInput: unknown,
): Promise<StaffAuditWriteResult> {
  const input = parse(rawInput);
  if (!input) return outcome('blocked','INVALID_REQUEST');
  try {
    // Strict earlier 4C-1 review intent (includes authenticated source/evidence
    // rereads) rejects unsupported confirmations and caller-supplied facts.
    const review = await prepareStaffSpecialistStructureReviewIntent(request, {
      quizId: input.quizId, questionId: input.questionId,
      questionVersion: input.questionVersion, methodId: input.methodId,
      decision: input.decision, reasonCode: input.reasonCode,
    });
    if (review.status !== 'preflight_only' || !review.auditIntent ||
        review.auditIntent.questionVersion !== input.questionVersion)
      return outcome('blocked','PREFLIGHT_NOT_READY');

    const token = tokenFromRequest(request);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!token || !url || !key) return outcome('blocked','NOT_AUTHORIZED');
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: {Authorization: `Bearer ${token}`} },
    });
    const identity = await client.auth.getUser(token);
    if (identity.error || identity.data.user?.id !== review.auditIntent.reviewerId)
      return outcome('blocked','NOT_AUTHORIZED');

    const preview = await client.rpc('math_specialist_structure_review_preview', {
      p_quiz_id: input.quizId, p_question_id: input.questionId,
    });
    if (preview.error || !isRecord(preview.data) || preview.data.status !== 'preview_only' ||
        preview.data.questionVersion !== input.questionVersion ||
        preview.data.fingerprintVersion !== 'db_jsonb_sha256_v1' ||
        preview.data.sourceFingerprintSha256 !== input.displayedDbFingerprintSha256)
      return outcome('blocked','DISPLAY_SNAPSHOT_STALE');

    // The DB record RPC independently verifies staff role, version, complete
    // source fingerprint and immutable event insertion in one transaction.
    const saved = await client.rpc('math_specialist_structure_review_record', {
      p_quiz_id: input.quizId,
      p_question_id: input.questionId,
      p_question_version: input.questionVersion,
      p_method_id: input.methodId,
      p_decision: input.decision,
      p_reason_code: input.reasonCode,
      p_expected_source_fingerprint: input.displayedDbFingerprintSha256,
      p_request_id: randomUUID(),
    });
    if (saved.error || !isRecord(saved.data) || saved.data.status !== 'recorded' ||
        saved.data.persisted !== true || saved.data.teachingApproved !== false ||
        saved.data.methodActivated !== false || saved.data.studentReleased !== false ||
        typeof saved.data.auditEventId !== 'string' || !UUID.test(saved.data.auditEventId))
      return outcome('blocked','DB_WRITE_UNAVAILABLE');
    return outcome('recorded','AUDIT_EVENT_RECORDED',saved.data.auditEventId);
  } catch {
    // Never echo SQL errors, auth information, or source question contents.
    return outcome('blocked','REVIEW_UNAVAILABLE');
  }
}
