/**
 * Phase 8C-2D.8B-2: internal authenticated read-only bridge, NOT generation.
 *
 * The existing Math authoring generator may transmit question text, correct
 * answers and explanations to Luna. This bridge does not call that generator,
 * does not provide an API route and never returns private question material.
 * It establishes a strict, source-version-bound preflight for subsequent
 * controlled capture work. No learner-facing effect or audit write.
 */
import 'server-only';

import { normaliseMathIntelligenceQuestion } from '../../../math-intelligence/MathQuestionNormalizer';
import { resolveStaffMathTeachingSource } from './phase4E2A3StaffSourceResolver.server';
import { inspectStaffMathSpecialistShadowComparison } from './phase4E2B8C2C4DStaffShadowComparison.server';
import { mapTrustedQuestionToPrivateAuthoringDraft } from './phase4E2B8C2D8B2AuthoringInputPolicy';

export const TRUSTED_GENERATOR_BRIDGE_VERSION = '4E-2B-8C-2D.8B-2' as const;
const UUID_V4_COMPAT = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Stage = 'request'|'staff_review'|'source'|'mapping'|'freshness';
type BlockCode = 'INVALID_REQUEST'|'STAFF_SHADOW_NOT_READY'|'SOURCE_UNAVAILABLE'|
  'MAPPING_UNSUPPORTED'|'SOURCE_CHANGED'|'NORMALIZER_MISMATCH'|'INTERNAL_UNAVAILABLE';
type SafeResult = Readonly<{
  status:'blocked'|'mapping_validated_capture_disabled';
  stage:Stage;
  reasonCode:BlockCode|'PRIVATE_AUTHORING_MAPPING_VERIFIED';
  version:typeof TRUSTED_GENERATOR_BRIDGE_VERSION;
  sourceVersion:number|null;
  specialistMethodIds:readonly string[];
  staffOnly:true;
  privateOnly:true;
  canInvokeProvider:false;
  canCaptureRealExplanation:false;
  humanVerified:false;
  teachingApproved:false;
  studentReleased:false;
  persisted:false;
}>;

function stop(stage:Stage,reasonCode:BlockCode):SafeResult {
  return Object.freeze({status:'blocked' as const,stage,reasonCode,
    version:TRUSTED_GENERATOR_BRIDGE_VERSION,sourceVersion:null,
    specialistMethodIds:Object.freeze([]) as readonly string[],
    staffOnly:true as const,privateOnly:true as const,
    canInvokeProvider:false as const,canCaptureRealExplanation:false as const,
    humanVerified:false as const,teachingApproved:false as const,
    studentReleased:false as const,persisted:false as const});
}
function idsOnly(query:unknown):query is {quizId:string;questionId:string} {
  if(!query || typeof query!=='object' || Array.isArray(query))return false;
  const obj=query as Record<string,unknown>;
  const keys=Object.keys(obj);
  return keys.length===2 && keys.includes('quizId') && keys.includes('questionId') &&
    typeof obj.quizId==='string' && typeof obj.questionId==='string' &&
    UUID_V4_COMPAT.test(obj.quizId) && UUID_V4_COMPAT.test(obj.questionId);
}

/** Only identifiers can be supplied by caller; never accept prompt, facts or answers. */
export async function inspectTrustedGeneratorMapping(
  request:Request,query:unknown,
):Promise<SafeResult>{
  if(!idsOnly(query))return stop('request','INVALID_REQUEST');
  try {
    const staff=await inspectStaffMathSpecialistShadowComparison(request,query);
    if(staff.status!=='pending_manual_review'||staff.comparisons.length===0||
       staff.humanVerified!==false||staff.teachingApproved!==false||staff.studentReleased!==false)
      return stop('staff_review','STAFF_SHADOW_NOT_READY');
    const source=await resolveStaffMathTeachingSource(request,query);
    if(source.status!=='ready'||source.sourceIdentity.quizId!==query.quizId||
       source.sourceIdentity.questionId!==query.questionId||
       !Number.isSafeInteger(source.sourceIdentity.questionVersion)||
       (source.sourceIdentity.questionVersion as number)<1||
       source.sourceIdentity.questionVersion!==staff.questionVersion)
      return stop('source','SOURCE_UNAVAILABLE');
    const version=source.sourceIdentity.questionVersion as number;
    const privateQuestion=source.source.question;
    const mapped=mapTrustedQuestionToPrivateAuthoringDraft(privateQuestion,query.questionId,version);
    if(mapped.status!=='mapped_private_only'||mapped.providerInvocationAllowed!==false)
      return stop('mapping','MAPPING_UNSUPPORTED');
    // Runs the actual authoring normalizer on a data-minimised trusted draft,
    // not on the answer-bearing authoritative row. NEVER return its output.
    const normalized=normaliseMathIntelligenceQuestion(mapped.privateDraft);
    if(normalized.id!==query.questionId||normalized.primary_level!==mapped.privateDraft.primary_level||
       normalized.prompt!==mapped.privateDraft.prompt||normalized.correct_answer!==null||
       normalized.explanation!==''||normalized.existing_media.has_real_image||
       normalized.existing_media.has_math_visual_v2||normalized.existing_media.has_legacy_svg||
       normalized.existing_media.has_option_images||normalized.options.length!==0)
      return stop('mapping','NORMALIZER_MISMATCH');
    // Advisory re-read, not a transactionally durable verification certificate.
    const latest=await resolveStaffMathTeachingSource(request,query);
    if(latest.status!=='ready'||latest.sourceIdentity.quizId!==query.quizId||
       latest.sourceIdentity.questionId!==query.questionId||
       latest.sourceIdentity.questionVersion!==version||
       JSON.stringify(latest.source.question)!==JSON.stringify(privateQuestion)||
       JSON.stringify(latest.staffReview)!==JSON.stringify(source.staffReview))
      return stop('freshness','SOURCE_CHANGED');
    return Object.freeze({status:'mapping_validated_capture_disabled' as const,
      stage:'freshness' as const,reasonCode:'PRIVATE_AUTHORING_MAPPING_VERIFIED' as const,
      version:TRUSTED_GENERATOR_BRIDGE_VERSION,sourceVersion:version,
      specialistMethodIds:Object.freeze(staff.comparisons.map(c=>c.specialistMethodId)),
      staffOnly:true as const,privateOnly:true as const,
      canInvokeProvider:false as const,canCaptureRealExplanation:false as const,
      humanVerified:false as const,teachingApproved:false as const,
      studentReleased:false as const,persisted:false as const});
  }catch{
    return stop('source','INTERNAL_UNAVAILABLE');
  }
}
