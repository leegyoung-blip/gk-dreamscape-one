/** Read-only Phase 4C-4B cohort audit. It never changes a teaching method or writes to DB. */
import {runPhase4A2QaFromExport} from '../../../../math-intelligence/teaching/qa/runPhase4A2QaFromExport';
import type {MathIntelligenceQaExportLike} from '../../../../math-intelligence/teaching/qa/types';
import {buildTeachingContract} from '../../../../math-intelligence/teaching/contract/buildTeachingContract';
import {createPhase4BMethodLibraryContractView, createPhase4CStrategySelectorContractView} from '../../../../math-intelligence/teaching/contract/consumer';
import {selectFromPhase4A4B} from '../phase4C4Adapter';
import type {Phase4C4AdapterResult} from '../phase4C4Adapter';
import { diagnosePhase4C4Selection, countPhase4BPrerequisiteMetadata } from './diagnosePhase4C4Selection';
import type {Phase4C4BF2Diagnostics} from './diagnosePhase4C4Selection';

export const PHASE4C4B_QA_VERSION='4C-4B-QA.1' as const;
const EXPECTED:Record<string,{ready:number;blocked:number;total:number}>={
 'phase-2i-v1':{ready:179,blocked:61,total:240},
 'phase-4a2c5-holdout-v1':{ready:141,blocked:99,total:240},
};
const increment=(record:Record<string,number>,key:string)=>{record[key]=(record[key]??0)+1;};
function outcome(result:Phase4C4AdapterResult):string {
 return result.reasonCodes[0]??(result.status==='selected'?'SELECTED':result.status==='ambiguous'?'AMBIGUOUS':'BLOCKED');
}
export type Phase4C4BQuestionRecord={
 questionId:string|null;questionCode:string|null;level:number|null;status:'upstream_blocked'|'adapter_blocked'|'ambiguous'|'selected';
 reasonCodes:string[];candidateCount:number;primaryFamilies:string[];selectedMethodId:string|null;
 selectionConfidence:string|null;compositionStatus:string|null;deterministic:boolean;
 /** F2 audit evidence; omitted for upstream-blocked questions. */
 diagnostics?:Phase4C4BF2Diagnostics;
};
export function runPhase4C4BCohortAudit(input:MathIntelligenceQaExportLike){
 const run=runPhase4A2QaFromExport(input);
 const counts={upstreamBlocked:0,adapterBlocked:0,ambiguous:0,selected:0,nondeterministic:0};
 const reasons:Record<string,number>={};
 const levels:Record<string,Record<string,number>>={};
 const f3Counts={policyVersion:'4C-4B-F3.1',readyQuestionsWithUnknownMastery:0,
   unknownMasteryEligibleCandidates:0,verifiedUnmetExcludedCandidates:0,
   selectedWithUnknownMastery:0,ambiguousWithUnknownMastery:0,
   selectedWithVerifiedUnmet:0};
 const f2Counts={withFamilyDiagnostics:0,allCandidatesUnverified:0,prerequisiteExcludedMixedEvidence:0,
   eligibleCandidatesPresent:0,otherOrMixedExclusions:0,candidateAssessments:0,
   unverifiedCandidatePrerequisites:0,notAffirmedCandidatePrerequisites:0,
   verifiedCandidatePrerequisites:0,verifiedUnmetCandidatePrerequisites:0,otherHardExclusions:0};
 const results:Phase4C4BQuestionRecord[]=run.items.map(item=>{
  const level=`P${item.primaryLevel??'unknown'}`;
  const record=(status:Phase4C4BQuestionRecord['status'],code:string,adapter?:Phase4C4AdapterResult,stable=true,diagnostics?:Phase4C4BF2Diagnostics):Phase4C4BQuestionRecord=>{
   const k=status==='upstream_blocked'?'upstreamBlocked':status==='adapter_blocked'?'adapterBlocked':status;
   counts[k]++; if(!stable)counts.nondeterministic++;
   increment(reasons,code); if(!levels[level])levels[level]={};increment(levels[level],status);
   if(diagnostics){
     if(diagnostics.stage==='family_selector_reached')f2Counts.withFamilyDiagnostics++;
     if(diagnostics.classification==='all_primary_candidates_unverified_prerequisites')f2Counts.allCandidatesUnverified++;
     if(diagnostics.classification==='all_primary_candidates_prerequisite_excluded_mixed_evidence')f2Counts.prerequisiteExcludedMixedEvidence++;
     if(diagnostics.classification==='eligible_candidates_present')f2Counts.eligibleCandidatesPresent++;
     if(diagnostics.classification==='other_or_mixed_exclusions')f2Counts.otherOrMixedExclusions++;
     f2Counts.candidateAssessments+=diagnostics.candidateAssessments;
     f2Counts.unverifiedCandidatePrerequisites+=diagnostics.candidatePrerequisitesUnverified;
     f2Counts.notAffirmedCandidatePrerequisites+=diagnostics.candidatePrerequisitesNotAffirmed;
     f2Counts.verifiedCandidatePrerequisites+=diagnostics.candidatePrerequisitesVerified;
     f2Counts.verifiedUnmetCandidatePrerequisites+=diagnostics.candidatePrerequisitesVerifiedUnmet;
     const methods=diagnostics.familyDiagnostics.flatMap(f=>f.methods);
     const unknown=methods.filter(m=>m.prerequisiteEvidence==='unverified');
     if(unknown.length)f3Counts.readyQuestionsWithUnknownMastery++;
     f3Counts.unknownMasteryEligibleCandidates+=unknown.filter(m=>m.eligibility==='eligible').length;
     f3Counts.verifiedUnmetExcludedCandidates+=methods.filter(m=>m.prerequisiteEvidence==='verified_unmet'&&m.eligibility==='excluded').length;
     if(status==='selected' && unknown.length)f3Counts.selectedWithUnknownMastery++;
     if(status==='ambiguous' && unknown.length)f3Counts.ambiguousWithUnknownMastery++;
     if(status==='selected' && methods.some(m=>m.prerequisiteEvidence==='verified_unmet'&&m.eligibility==='eligible'))f3Counts.selectedWithVerifiedUnmet++;
     f2Counts.otherHardExclusions+=diagnostics.candidateOtherHardExclusions;
   }
   return {questionId:item.questionId,questionCode:item.questionCode,level:item.primaryLevel,status,
    reasonCodes:adapter?.reasonCodes??[code],candidateCount:adapter?.candidateMethodCount??0,
    primaryFamilies:adapter?.primaryFamilies??[],selectedMethodId:adapter?.selection?.primaryMethodId??null,
    selectionConfidence:adapter?.selection?.confidence??null,
    compositionStatus:adapter?.composition?.status??null,deterministic:stable,
    ...(diagnostics ? {diagnostics} : {})};
  };
  const teaching=buildTeachingContract(item.understanding);
  if(teaching.status!=='ready')return record('upstream_blocked','UPSTREAM_CONTRACT_BLOCKED');
  const b=createPhase4BMethodLibraryContractView(teaching);
  const c=createPhase4CStrategySelectorContractView(teaching);
  if(b.status!=='ready'||c.status!=='ready')return record('adapter_blocked','CONSUMER_ENVELOPE_BLOCKED');
  const source={methodLibraryEnvelope:b.envelope,strategyEnvelope:c.envelope};
  // Missing learner-specific evidence remains missing; no fabricated approvals.
  const first=selectFromPhase4A4B(source), second=selectFromPhase4A4B(source);
  const stable=JSON.stringify(first)===JSON.stringify(second);
  const diagnostics=diagnosePhase4C4Selection(source,first);
  if(first.status==='selected')return record('selected',outcome(first),first,stable,diagnostics);
  if(first.status==='ambiguous')return record('ambiguous',outcome(first),first,stable,diagnostics);
  return record('adapter_blocked',outcome(first),first,stable,diagnostics);
 });
 const exp=EXPECTED[run.sourceSeed??''];
 const upstreamExpected=exp?counts.upstreamBlocked===exp.blocked:null;
 const summary={total:results.length,...counts,byReason:reasons,byLevel:levels,
  f2Diagnostics:{version:'4C-4B-F2.1',...f2Counts,methodRegistry:countPhase4BPrerequisiteMetadata()},
  f3Policy:f3Counts,
  expected:exp??null,checks:{matchesExpectedTotal:exp?results.length===exp.total:null,
    matchesExpectedUpstreamBlocks:upstreamExpected,totalsReconcile:results.length===counts.upstreamBlocked+counts.adapterBlocked+counts.ambiguous+counts.selected,
    deterministic:counts.nondeterministic===0}};
 return {schema_version:PHASE4C4B_QA_VERSION,source_run_id:run.sourceRunId,source_seed:run.sourceSeed,
  summary,results};
}
