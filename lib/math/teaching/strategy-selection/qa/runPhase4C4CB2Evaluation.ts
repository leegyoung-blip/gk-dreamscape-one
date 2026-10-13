/** B2: paired baseline/reviewed-evidence audit on a cohort. No persisted modifications. */
import {runPhase4A2QaFromExport} from '../../../../math-intelligence/teaching/qa/runPhase4A2QaFromExport';
import type {MathIntelligenceQaExportLike} from '../../../../math-intelligence/teaching/qa/types';
import {buildTeachingContract} from '../../../../math-intelligence/teaching/contract/buildTeachingContract';
import {createPhase4BMethodLibraryContractView,createPhase4CStrategySelectorContractView} from '../../../../math-intelligence/teaching/contract/consumer';
import {selectFromPhase4A4B,type Phase4C4AdapterResult} from '../phase4C4Adapter';
import type {ReviewedStructureEvidence} from '../reviewedStructureEvidence';

export const B2_EVALUATION_SCHEMA_VERSION='4C-4C-B2.EVAL.1' as const;
export type B2ApprovedReviewSet = {
  schemaVersion:'4C-4C-B2.REVIEWS.1';
  /** These are trusted reviewer approvals, not source-grounded B1 hypotheses. */
  reviews:ReviewedStructureEvidence[];
};
const selectedMethod=(x:Phase4C4AdapterResult)=>x.selection?.primaryMethodId??null;
function pointFor(x:Phase4C4AdapterResult,methodId:string|null){
  if(!methodId)return null;
  const item=x.familySelections.flatMap(s=>s.candidates).find(m=>m.methodId===methodId);
  return item?.score??null;
}
export function runB2PairedEvaluation(
  input:MathIntelligenceQaExportLike,
  approved:B2ApprovedReviewSet={schemaVersion:'4C-4C-B2.REVIEWS.1',reviews:[]},
  alreadyInspectedQuestionIds:readonly string[]=[],
){
  if(approved?.schemaVersion!=='4C-4C-B2.REVIEWS.1'||!Array.isArray(approved.reviews)) throw new Error('B2_APPROVED_REVIEW_SET_INVALID');
  const reviews=new Map<string,ReviewedStructureEvidence>();
  for (const review of approved.reviews){
    if(!review || typeof review.questionId!=='string'||reviews.has(review.questionId))throw new Error('B2_REVIEW_ID_DUPLICATE_OR_INVALID');
    reviews.set(review.questionId,review);
  }
  const run=runPhase4A2QaFromExport(input);
  const inspected=new Set(alreadyInspectedQuestionIds);
  const overlapIds:string[]=[];
  const observedIds=new Set<string>();
  const totals={total:0,upstreamBlocked:0,baselineSelected:0,baselineAmbiguous:0,baselineAdapterBlocked:0,
    reviewedSelected:0,reviewedAmbiguous:0,reviewedAdapterBlocked:0,reviewApplied:0,changedOutcomes:0,changedMethods:0,
    scoreIncreases:0,nondeterministic:0};
  const rows=run.items.map(item=>{
    if(!item.questionId || observedIds.has(item.questionId))throw new Error('B2_DUPLICATE_QUESTION_ID');
    observedIds.add(item.questionId);totals.total++;
    if(inspected.has(item.questionId))overlapIds.push(item.questionId);
    const review=reviews.get(item.questionId);
    const teaching=buildTeachingContract(item.understanding);
    if(teaching.status!=='ready'){
      if(review)throw new Error('B2_REVIEW_FOR_UPSTREAM_BLOCKED_QUESTION:'+item.questionId);
      totals.upstreamBlocked++;
      return {questionId:item.questionId,questionCode:item.questionCode,level:item.primaryLevel,
        status:'upstream_blocked' as const,reviewId:null,baselineStatus:null,reviewedStatus:null,
        baselineMethodId:null,reviewedMethodId:null,previousSelectedMethodScore:null,reviewedPreviousMethodScore:null,
        structurePenaltyAppliedTo:[] as string[],curriculumReview:null};
    }
    const b=createPhase4BMethodLibraryContractView(teaching),c=createPhase4CStrategySelectorContractView(teaching);
    if(b.status!=='ready'||c.status!=='ready') throw new Error('B2_CONSUMER_NOT_READY:'+item.questionId);
    const source={methodLibraryEnvelope:b.envelope,strategyEnvelope:c.envelope};
    const baseline=selectFromPhase4A4B(source);
    const reviewed=review?selectFromPhase4A4B({...source,reviewedMathEvidence:review}):baseline;
    if(review && reviewed.reasonCodes.some(x=>x.startsWith('INVALID_REVIEWED_STRUCTURE_EVIDENCE:')))
      throw new Error('B2_REVIEW_REJECTED:'+item.questionId+':'+reviewed.reasonCodes[0]);
    const repeat=review?selectFromPhase4A4B({...source,reviewedMathEvidence:review}):selectFromPhase4A4B(source);
    if(JSON.stringify(reviewed)!==JSON.stringify(repeat))totals.nondeterministic++;
    const bkey=baseline.status==='selected'?'baselineSelected':baseline.status==='ambiguous'?'baselineAmbiguous':'baselineAdapterBlocked';
    const rkey=reviewed.status==='selected'?'reviewedSelected':reviewed.status==='ambiguous'?'reviewedAmbiguous':'reviewedAdapterBlocked';
    totals[bkey]++;totals[rkey]++;
    if(review)totals.reviewApplied++;
    if(reviewed.status!==baseline.status)totals.changedOutcomes++;
    if(selectedMethod(reviewed)!==selectedMethod(baseline))totals.changedMethods++;
    const ids=new Set([...baseline.familySelections.flatMap(f=>f.candidates.map(m=>m.methodId)),
      ...reviewed.familySelections.flatMap(f=>f.candidates.map(m=>m.methodId))]);
    for(const id of ids){const old=pointFor(baseline,id),next=pointFor(reviewed,id);
      if(old!==null&&next!==null && next>old+1e-6)totals.scoreIncreases++;
    }
    return {questionId:item.questionId,questionCode:item.questionCode,level:item.primaryLevel,
      status:'ready' as const,reviewId:review?.reviewId??null,baselineStatus:baseline.status,reviewedStatus:reviewed.status,
      baselineMethodId:selectedMethod(baseline),reviewedMethodId:selectedMethod(reviewed),
      previousSelectedMethodScore:pointFor(baseline,selectedMethod(baseline)),
      reviewedPreviousMethodScore:pointFor(reviewed,selectedMethod(baseline)),
      structurePenaltyAppliedTo:reviewed.b2EvidenceTrace?.suppressedStructureMethods??[],
      curriculumReview:reviewed.b2EvidenceTrace?.curriculumReview??null};
  });
  for(const id of reviews.keys()) if(!observedIds.has(id))throw new Error('B2_REVIEW_QUESTION_NOT_IN_COHORT:'+id);
  return {schemaVersion:B2_EVALUATION_SCHEMA_VERSION,sourceRunId:run.sourceRunId,sourceSeed:run.sourceSeed,
    evaluationClass:alreadyInspectedQuestionIds.length===0?'unseen_status_not_established':overlapIds.length>0?'exploratory_inspected_overlap':'no_overlap_with_supplied_inspected_ids',
    notice:'No-overlap is not proof of independent sampling. Approvals must be authorized outside this code.',
    totals,inspectedOverlapCount:overlapIds.length,inspectedOverlapQuestionIds:overlapIds,
    checks:{accounting:totals.total===totals.upstreamBlocked+totals.baselineSelected+totals.baselineAmbiguous+totals.baselineAdapterBlocked,
      reviewAccounting:totals.total===totals.upstreamBlocked+totals.reviewedSelected+totals.reviewedAmbiguous+totals.reviewedAdapterBlocked,
      noScoreInflation:totals.scoreIncreases===0,deterministic:totals.nondeterministic===0},rows};
}
