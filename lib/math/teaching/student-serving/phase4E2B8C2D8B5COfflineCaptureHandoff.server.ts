/**
 * DREAMSCAPE ONE — Phase 8C-2D.8B-5C, private OFFLINE replay handoff.
 * NOT a provider call, staff certificate, NOVA-origin proof or file capture.
 * No filesystem writes; use Phase 8C-2D.7 separately on authorised real files
 * that have been stored outside Git. Do not call this from a public route.
 */
import 'server-only';
import { createHash } from 'node:crypto';
import { inspectOfflineSpecialistProviderResponse } from './phase4E2B8C2D8B5BExplanationResponseReview';

export const OFFLINE_CAPTURE_HANDOFF_VERSION='8C2D8B5C.offline.v1' as const;
type Outcome=Readonly<{
  status:'blocked'|'offline_replay_review_pending';
  reasonCode:string;
  version:typeof OFFLINE_CAPTURE_HANDOFF_VERSION;
  responseSha256:string|null;
  responseStageCount:number;
  arithmeticCheck:'none'|'consistent_with_unverified_facts'|'not_machine_readable'|'mismatch';
  realNovaOriginVerified:false;
  authenticatedStaffSessionVerified:false;
  sourceFreshnessCertificate:false;
  artifactsWritten:false;
  privateCaptureManifestComplete:false;
  educatorApproved:false;
  learnerReleaseAllowed:false;
}>;
function out(status:Outcome['status'],reasonCode:string,hash:string|null=null,stages=0,
  arithmetic:Outcome['arithmeticCheck']='none'):Outcome{
  return Object.freeze({status,reasonCode,version:OFFLINE_CAPTURE_HANDOFF_VERSION,
    responseSha256:hash,responseStageCount:stages,arithmeticCheck:arithmetic,
    realNovaOriginVerified:false as const,authenticatedStaffSessionVerified:false as const,
    sourceFreshnessCertificate:false as const,artifactsWritten:false as const,
    privateCaptureManifestComplete:false as const,educatorApproved:false as const,
    learnerReleaseAllowed:false as const});
}
/** Strictly an offline fixture validator; never pass browser data as proof. */
export function inspectOfflinePrivateCaptureHandoff(
  proposedRequest:unknown,rawResponse:unknown,
):Outcome{
  try{
    const reviewed=inspectOfflineSpecialistProviderResponse(proposedRequest,rawResponse);
    if(reviewed.status!=='structure_valid_review_pending'||typeof rawResponse!=='string')
      return out('blocked',reviewed.reasonCode);
    // The digest is not an origin signature, and it is not a captured artifact.
    const hash=createHash('sha256').update(rawResponse,'utf8').digest('hex');
    return out('offline_replay_review_pending','PRIVATE_CAPTURE_REQUIRES_REAL_ARTIFACTS_AND_EDUCATORS',
      hash,reviewed.stageCount,reviewed.arithmeticStatus);
  }catch{return out('blocked','OFFLINE_REVIEW_UNAVAILABLE');}
}
