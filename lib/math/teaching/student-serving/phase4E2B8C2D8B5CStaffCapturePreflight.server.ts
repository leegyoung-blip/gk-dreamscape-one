/**
 * DREAMSCAPE ONE — Phase 4E-2B-8C-2D.8B-5C.
 * Staff-only, read-only end-to-end CAPTURE PREFLIGHT. The existing Luna
 * provider is disabled. This module never calls a model or returns question
 * text / answer data / credentials / generated responses.
 *
 * IMPORTANT: independent source reads are not a transaction. The snapshot
 * digest created here is ephemeral, NOT a database audit fingerprint or
 * permission to reuse facts after the request.
 */
import 'server-only';
import { createHash } from 'node:crypto';
import { inspectTrustedGeneratorMapping } from './phase4E2B8C2D8B2TrustedGeneratorBridge.server';
import { inspectStaffMathSpecialistShadowComparison } from './phase4E2B8C2C4DStaffShadowComparison.server';
import { resolveStaffMathTeachingSource } from './phase4E2A3StaffSourceResolver.server';
import { mapTrustedQuestionToPrivateAuthoringDraft } from './phase4E2B8C2D8B2AuthoringInputPolicy';
import { inspectOfflineSpecialistExplanationInput } from './phase4E2B8C2D8B3ExplanationCaptureContract';
import {
  SPECIALIST_PROVIDER_SCHEMA_VERSION,
  inspectOfflineSpecialistProviderRequest,
  type SpecialistProviderRequest,
  type SpecialistProviderMethodId,
} from './phase4E2B8C2D8B5ASpecialistProviderContract';

export const STAFF_CAPTURE_PREFLIGHT_VERSION = '8C2D8B5C.v1' as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const methodSet = new Set<string>([
  'heuristic.multi_step.equal_spacing_interval_count',
  'heuristic.multi_step.multiplicative_comparison_chain',
  'ratio.relationship.before_after_change',
]);
type Reason = 'INVALID_QUERY' | 'STAFF_GATE_NOT_READY' | 'SOURCE_NOT_READY' |
  'METHOD_NOT_IN_SHADOW_SET' | 'MAPPING_NOT_READY' | 'PROVIDER_SHAPE_INVALID' |
  'SOURCE_CHANGED' | 'INTERNAL_UNAVAILABLE' | 'DISABLED_PROVIDER_DRY_RUN_ONLY';
type Stage = 'request' | 'staff_gate' | 'source' | 'mapping' | 'provider_contract' | 'freshness';
export type StaffCapturePreflight = Readonly<{
  status: 'blocked' | 'dry_run_ready_provider_disabled';
  reasonCode: Reason;
  stage: Stage;
  schemaVersion: typeof STAFF_CAPTURE_PREFLIGHT_VERSION;
  checkedQuestionVersion: number | null;
  methodId: string | null;
  sourceAuthenticatedInThisRead: boolean;
  sourceFreshnessCertificate: false;
  providerInvoked: false;
  responseGenerated: false;
  privateCaptureStored: false;
  correctnessApproved: false;
  educatorApproved: false;
  learnerReleaseAllowed: false;
}>;
function report(status: StaffCapturePreflight['status'], stage: Stage, reasonCode: Reason,
  version: number | null = null, methodId: string | null = null): StaffCapturePreflight {
  return Object.freeze({status,stage,reasonCode,schemaVersion:STAFF_CAPTURE_PREFLIGHT_VERSION,
    checkedQuestionVersion:version,methodId,
    sourceAuthenticatedInThisRead:status==='dry_run_ready_provider_disabled',
    sourceFreshnessCertificate:false as const,providerInvoked:false as const,
    responseGenerated:false as const,privateCaptureStored:false as const,
    correctnessApproved:false as const,educatorApproved:false as const,
    learnerReleaseAllowed:false as const});
}
const record=(v:unknown):v is Record<string,unknown>=>
  v!==null&&typeof v==='object'&&!Array.isArray(v);
const queryValid=(v:unknown):v is {quizId:string;questionId:string;methodId:SpecialistProviderMethodId}=>
  record(v)&&Object.keys(v).sort().join(',')==='methodId,questionId,quizId'&&
  typeof v.quizId==='string'&&UUID.test(v.quizId)&&
  typeof v.questionId==='string'&&UUID.test(v.questionId)&&
  typeof v.methodId==='string'&&methodSet.has(v.methodId);

/** Caller is limited to IDs + a specialist ID; never accepts facts/answers/prompts. */
export async function inspectStaffCapturePreflight(
  request:Request, query:unknown,
):Promise<StaffCapturePreflight>{
  if(!queryValid(query))return report('blocked','request','INVALID_QUERY');
  const ids={quizId:query.quizId,questionId:query.questionId};
  try{
    const bridge=await inspectTrustedGeneratorMapping(request,ids);
    if(bridge.status!=='mapping_validated_capture_disabled'||
      bridge.canInvokeProvider!==false||bridge.studentReleased!==false||
      !bridge.specialistMethodIds.includes(query.methodId))
      return report('blocked','staff_gate','STAFF_GATE_NOT_READY');
    const shadow=await inspectStaffMathSpecialistShadowComparison(request,ids);
    if(shadow.status!=='pending_manual_review'||shadow.teachingApproved!==false||
       shadow.humanVerified!==false||shadow.studentReleased!==false||
       !shadow.comparisons.some(c=>c.specialistMethodId===query.methodId))
      return report('blocked','staff_gate','METHOD_NOT_IN_SHADOW_SET');
    const source=await resolveStaffMathTeachingSource(request,ids);
    if(source.status!=='ready'||source.sourceIdentity.questionId!==ids.questionId||
       source.sourceIdentity.quizId!==ids.quizId||
       !Number.isSafeInteger(source.sourceIdentity.questionVersion)||
       source.sourceIdentity.questionVersion!==bridge.sourceVersion||
       source.sourceIdentity.questionVersion!==shadow.questionVersion)
      return report('blocked','source','SOURCE_NOT_READY');
    const version=source.sourceIdentity.questionVersion as number;
    const mapped=mapTrustedQuestionToPrivateAuthoringDraft(source.source.question,ids.questionId,version);
    if(mapped.status!=='mapped_private_only'||mapped.providerInvocationAllowed!==false)
      return report('blocked','mapping','MAPPING_NOT_READY');
    const explanation=inspectOfflineSpecialistExplanationInput(mapped,query.methodId);
    if(explanation.status!=='offline_contract_ready_capture_disabled'||
       explanation.providerInvocationAllowed!==false||explanation.learnerReleaseAllowed!==false)
      return report('blocked','mapping','MAPPING_NOT_READY');

    // Hash only this private, in-memory source snapshot. It is NOT the stable
    // DB-defined audit fingerprint, so never export or persist it as proof.
    const snapshotHash=createHash('sha256').update(JSON.stringify({
      question:source.source.question,version,staffReview:source.staffReview,
    })).digest('hex');
    const proposal:SpecialistProviderRequest={
      schemaVersion:SPECIALIST_PROVIDER_SCHEMA_VERSION,
      source:{questionId:ids.questionId,questionVersion:version,fingerprintSha256:snapshotHash},
      question:{primaryLevel:explanation.primaryLevel,
        prompt:mapped.privateDraft.prompt,instruction:mapped.privateDraft.instruction},
      teaching:{methodId:query.methodId,requiredStages:explanation.requiredStages},
      controls:{mode:'offline_contract_check_only',store:false,learnerRelease:false},
    };
    const shape=inspectOfflineSpecialistProviderRequest(proposal);
    if(shape.status!=='candidate_shape_valid_provider_disabled'||shape.providerInvocationAllowed!==false)
      return report('blocked','provider_contract','PROVIDER_SHAPE_INVALID');
    // Re-read to detect ordinary changes. This is NOT an atomic transaction.
    const latest=await resolveStaffMathTeachingSource(request,ids);
    if(latest.status!=='ready'||latest.sourceIdentity.questionVersion!==version||
       latest.sourceIdentity.quizId!==ids.quizId||latest.sourceIdentity.questionId!==ids.questionId||
       JSON.stringify(latest.source.question)!==JSON.stringify(source.source.question)||
       JSON.stringify(latest.staffReview)!==JSON.stringify(source.staffReview))
      return report('blocked','freshness','SOURCE_CHANGED');
    // Do not invoke the provider or store/return `proposal` here.
    return report('dry_run_ready_provider_disabled','freshness',
      'DISABLED_PROVIDER_DRY_RUN_ONLY',version,query.methodId);
  }catch{
    return report('blocked','source','INTERNAL_UNAVAILABLE');
  }
}
