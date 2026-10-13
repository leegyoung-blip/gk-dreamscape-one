/** Read-only Phase 4C-4B cohort audit. It never changes a teaching method or writes to DB. */
import {runPhase4A2QaFromExport} from '../../../../math-intelligence/teaching/qa/runPhase4A2QaFromExport';
import type {MathIntelligenceQaExportLike} from '../../../../math-intelligence/teaching/qa/types';
import {buildTeachingContract} from '../../../../math-intelligence/teaching/contract/buildTeachingContract';
import {createPhase4BMethodLibraryContractView, createPhase4CStrategySelectorContractView} from '../../../../math-intelligence/teaching/contract/consumer';
import {selectFromPhase4A4B} from '../phase4C4Adapter';
import type {Phase4C4AdapterResult} from '../phase4C4Adapter';

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
};
export function runPhase4C4BCohortAudit(input:MathIntelligenceQaExportLike){
 const run=runPhase4A2QaFromExport(input);
 const counts={upstreamBlocked:0,adapterBlocked:0,ambiguous:0,selected:0,nondeterministic:0};
 const reasons:Record<string,number>={};
 const levels:Record<string,Record<string,number>>={};
 const results:Phase4C4BQuestionRecord[]=run.items.map(item=>{
  const level=`P${item.primaryLevel??'unknown'}`;
  const record=(status:Phase4C4BQuestionRecord['status'],code:string,adapter?:Phase4C4AdapterResult,stable=true):Phase4C4BQuestionRecord=>{
   const k=status==='upstream_blocked'?'upstreamBlocked':status==='adapter_blocked'?'adapterBlocked':status;
   counts[k]++; if(!stable)counts.nondeterministic++;
   increment(reasons,code); if(!levels[level])levels[level]={};increment(levels[level],status);
   return {questionId:item.questionId,questionCode:item.questionCode,level:item.primaryLevel,status,
    reasonCodes:adapter?.reasonCodes??[code],candidateCount:adapter?.candidateMethodCount??0,
    primaryFamilies:adapter?.primaryFamilies??[],selectedMethodId:adapter?.selection?.primaryMethodId??null,
    selectionConfidence:adapter?.selection?.confidence??null,
    compositionStatus:adapter?.composition?.status??null,deterministic:stable};
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
  if(first.status==='selected')return record('selected',outcome(first),first,stable);
  if(first.status==='ambiguous')return record('ambiguous',outcome(first),first,stable);
  return record('adapter_blocked',outcome(first),first,stable);
 });
 const exp=EXPECTED[run.sourceSeed??''];
 const upstreamExpected=exp?counts.upstreamBlocked===exp.blocked:null;
 const summary={total:results.length,...counts,byReason:reasons,byLevel:levels,
  expected:exp??null,checks:{matchesExpectedTotal:exp?results.length===exp.total:null,
    matchesExpectedUpstreamBlocks:upstreamExpected,totalsReconcile:results.length===counts.upstreamBlocked+counts.adapterBlocked+counts.ambiguous+counts.selected,
    deterministic:counts.nondeterministic===0}};
 return {schema_version:PHASE4C4B_QA_VERSION,source_run_id:run.sourceRunId,source_seed:run.sourceSeed,
  summary,results};
}
