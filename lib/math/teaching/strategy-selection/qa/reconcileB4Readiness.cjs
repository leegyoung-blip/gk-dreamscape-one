'use strict';
/** B4 read-only baseline and unresolved-approval reconciliation.
 * Does not create approved B2 inputs or change production selection.
 */
const SCHEMA='4C-4C-B4.READINESS.1';
const fail=(x)=>{throw new Error('B4_READINESS_'+x)};
function auditCohort(raw,label,runId,seed){
 if(!raw || raw.source_run_id!==runId || raw.source_seed!==seed ||
    !raw.summary || !Array.isArray(raw.results) || raw.results.length!==240 || raw.summary.total!==240)
   fail('SOURCE_RUN_OR_COHORT_MISMATCH_'+label);
 const counts={upstreamBlocked:0,selected:0,ambiguous:0,adapterBlocked:0,nondeterministic:0};
 const byId=new Map();
 for(const r of raw.results){
   if(!r.questionId || byId.has(r.questionId))fail('DUPLICATE_OR_MISSING_ID_'+label);
   byId.set(r.questionId,r);
   if(r.status==='upstream_blocked')counts.upstreamBlocked++;
   else if(r.status==='selected')counts.selected++;
   else if(r.status==='ambiguous')counts.ambiguous++;
   else if(r.status==='adapter_blocked')counts.adapterBlocked++;
   else fail('UNKNOWN_STATUS_'+label);
   if(r.deterministic!==true)counts.nondeterministic++;
 }
 for(const [key,value] of Object.entries(counts)){
   const summaryName={upstreamBlocked:'upstreamBlocked',selected:'selected',ambiguous:'ambiguous',adapterBlocked:'adapterBlocked',nondeterministic:'nondeterministic'}[key];
   if(value!==raw.summary[summaryName])fail('SUMMARY_MISMATCH_'+label+'_'+key);
 }
 return {counts,byId};
}
function reconcileB4Readiness(fixed,holdout,register){
 if(register?.schemaVersion!=='4C-4C-B3.REVIEW.1' || register.source?.cohorts!=='both_previously_inspected'
  || !Array.isArray(register.rows) || register.rows.length!==24)fail('B3_REGISTER_INVALID');
 const f=auditCohort(fixed,'fixed',register.source.fixedRunId,'phase-2i-v1');
 const h=auditCohort(holdout,'holdout',register.source.holdoutRunId,'phase-4a2c5-holdout-v1');
 const all=new Set([...f.byId.keys(),...h.byId.keys()]);
 if(all.size!==480)fail('COHORT_OVERLAP');
 const queue=[];const seen=new Set();
 for(const r of register.rows){
   if(seen.has(r.questionId))fail('B3_DUPLICATE_CASE');seen.add(r.questionId);
   const result=(r.cohort==='fixed'?f:r.cohort==='holdout'?h:null)?.byId.get(r.questionId);
   if(!result || result.questionCode!==r.questionCode || result.status!==r.f4Status ||
      (result.selectedMethodId??null)!==(r.selectedMethodId??null))fail('B3_F4_JOIN_MISMATCH');
   if(r.scoringAuthorized!==false || r.humanReviewer!==null || r.approvalRef!==null ||
      r.methodFitStatus!=='not_approved' || r.curriculumStatus!=='not_approved')fail('B3_UNAUTHENTICATED_APPROVAL');
   queue.push({questionCode:r.questionCode,questionId:r.questionId,cohort:r.cohort,priority:r.priority,
      selectedMethodId:r.selectedMethodId,pedagogicalFlag:r.pedagogicalFlag,
      teacherReview:r.requiredEducatorReview,diagramStatus:r.diagramStatus,
      imageEvidenceRequired:r.sourceImageReferenceRequired,
      methodFitStatus:'awaiting_authenticated_teacher_review',
      curriculumStatus:'awaiting_independent_curriculum_review',
      imageReviewStatus:r.sourceImageReferenceRequired?'pending_source_image_inspection':'not_applicable',
      approvedForScoring:false});
 }
 const totals=Object.keys(f.counts).reduce((a,key)=>(a[key]=f.counts[key]+h.counts[key],a),{});
 if(totals.upstreamBlocked!==160||totals.selected!==84||totals.ambiguous!==236||totals.adapterBlocked!==0||totals.nondeterministic!==0)
   fail('FROZEN_F4_BASELINE_DRIFT');
 if(queue.filter(x=>x.priority==='P0').length!==11)fail('PRIORITY_ZERO_BASELINE_DRIFT');
 const status={schemaVersion:SCHEMA,cohorts:'previously_inspected_only',
  totals:{questions:480,...totals,curated:24,P0:11,authenticApprovedReviews:0,scoreChanges:0},
  fixed:f.counts,holdout:h.counts,
  checks:{sourceRunsBound:true,questionsMatched:true,noSignedTeacherApprovals:true,baselineFrozen:true,deterministic:true},
  deployment:{gatewayMode:'disabled',productionActivationAuthorized:false,unseenCohortValidated:false,
    curriculumApproved:false,externalImageProofAvailable:false},queue};
 return status;
}
module.exports={SCHEMA,reconcileB4Readiness};
