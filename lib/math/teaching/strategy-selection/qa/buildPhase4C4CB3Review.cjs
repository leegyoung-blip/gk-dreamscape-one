'use strict';
/** DREAMSCAPE 4C-4C-B3: read-only, source-bound pedagogical verification worklist.
 * Output is NEVER approved 4C evidence. No production imports, writes, or scoring.
 */
const {createHash}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const VERSION='4C-4C-B3.REVIEW.1';
const hash=s=>createHash('sha256').update(s,'utf8').digest('hex');
const fail=(code)=>{throw new Error(code);};
const assert=(cond,code)=>{if(!cond)fail(code);};
const normalize=s=>String(s??'').toLowerCase().replace(/\s+/g,' ').replace(/\s*:\s*/g,' : ').trim();
const twoSquares=()=>{const x=[];for(let low=1;low<36;low++)for(let high=low+1;high<40;high++)if(high**2-low**2===36)x.push(low);return x};
// Independently specified calculations on QUESTION-PROMPT facts only; answer_data is read afterwards for comparison.
// Exact prompt hashes protect against applying an old reasoning recipe to edited questions.
const checks={
 'MATH-P1-PROB-057-Q03':()=>String((20-8)/3),
 'MATH-P1-NUM-009-Q04':()=>String(5-4),
 'MATH-P2-MEAS-053-Q07':()=>`${160-(36+21+7+5)} cm`,
 'MATH-P1-NUM-010-Q04':()=>String(10-7),
 'MATH-P1-NUM-010-Q02':()=>String(10-3),
 'MATH-P2-PROB-041-Q03':()=>`${3*12/9} days`,
 'MATH-P2-MEAS-061-Q03':()=>{const mins=16*60+25-15;return `${Math.floor(mins/60)-12}:${String(mins%60).padStart(2,'0')} p.m.`;},
 'MATH-P1-ASSESS-012-Q01':()=>{let row=[1,3,5,7];while(row.length>1)row=row.slice(1).map((n,i)=>row[i]+n);return String(row[0]);},
 'MATH-P1-ASSESS-012-Q06':()=>String(15-(9+2)),
 'MATH-P1-PROB-050-Q02':()=>String(90-28),
 'MATH-P1-GEO-037-Q05':()=>String((4-2+1)*(3-2+1)),
 'MATH-P1-ASSESS-011-Q07':()=> '87 is between 89 and 88.',
 'MATH-P1-DATA-003-Q02':()=>String(2+3),
 'MATH-P3-FRAC-035-Q104':()=>String(18-(18*4/9)-1),
 'MATH-P5-RATIO-RB-Q102':()=> '3 : 10',
 'MATH-P3-PROB-053-Q106':()=>String(10*(6+7+4+9+2)+6+7),
 'MATH-P2-PROB-036-Q04':()=>String(4+3-1),
 'MATH-P2-NUM-094-Q06':()=>String(343+536),
 'MATH-P1-PROB-003-Q05':()=>String(9-2),
 'MATH-P3-GEO-017-Q106':()=>`${twoSquares().length===1?twoSquares()[0]:'not_unique'} cm`,
};
const EXPECTED={fixed:{total:240,upstreamBlocked:61,selected:50,ambiguous:129},holdout:{total:240,upstreamBlocked:99,selected:34,ambiguous:107}};
const COHORT_SEEDS={fixed:'phase-2i-v1',holdout:'phase-4a2c5-holdout-v1'};
const escapeCsv=v=>{let s=String(v??'');if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;return /[",\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;};
const csv=(rows,cols)=>[cols.join(','),...rows.map(r=>cols.map(k=>escapeCsv(r[k])).join(','))].join('\r\n')+'\r\n';
const md=s=>String(s??'').replace(/\|/g,'\\|').replace(/\r?\n/g,' ');
const textFields=q=>({prompt:q.question?.prompt??q.prompt??'',reportedAnswer:q.question?.answer_data?.display_answer??'',questionCode:q.question_code,questionId:q.question_id});
const indexes={};
function validateCohort(kind,source,report){
 assert(source?.sample?.seed===COHORT_SEEDS[kind],`B3_${kind}_COHORT_SEED_MISMATCH`);
 assert(source.sample.items?.length===240,`B3_${kind}_SOURCE_SIZE_INVALID`);
 assert(report?.source_seed===COHORT_SEEDS[kind],`B3_${kind}_REPORT_SEED_MISMATCH`);
 assert(report.source_run_id===source.run_id,`B3_${kind}_RUN_ID_MISMATCH`);
 assert(report.results?.length===240,`B3_${kind}_REPORT_SIZE_INVALID`);
 for(const [key,val] of Object.entries(EXPECTED[kind]))assert(report.summary?.[key]===val,`B3_${kind}_BASELINE_CHANGED_${key}`);
 assert(report.summary.adapterBlocked===0 && report.summary.nondeterministic===0,`B3_${kind}_F4_NOT_CLOSED`);
 const qi=new Map(),ri=new Map();
 for(const q of source.sample.items){assert(q?.question_id&&!qi.has(q.question_id),`B3_${kind}_DUPLICATE_SOURCE_ID`);qi.set(q.question_id,q);}
 for(const r of report.results){assert(r.questionId&&!ri.has(r.questionId),`B3_${kind}_DUPLICATE_REPORT_ID`);ri.set(r.questionId,r);}
 for(const id of qi.keys())assert(ri.has(id),`B3_${kind}_JOIN_MISSING_REPORT`);
 for(const id of ri.keys())assert(qi.has(id),`B3_${kind}_JOIN_MISSING_SOURCE`);
 indexes[kind]={qi,ri,code:new Map([...qi.values()].map(x=>[x.question_code,x]))};
 assert(indexes[kind].code.size===240,`B3_${kind}_DUPLICATE_QUESTION_CODE`);
}
function buildReview({fixedExport,holdoutExport,fixedF4,holdoutF4,proposals,analyses}){
 validateCohort('fixed',fixedExport,fixedF4);validateCohort('holdout',holdoutExport,holdoutF4);
 assert(proposals?.schemaVersion==='4C-4C-B1.CASE_OUTPUT.1'&&proposals.approval==='none'&&proposals.cases?.length===24,'B3_B1_CASES_INVALID');
 assert(analyses?.schemaVersion==='4C-4C-B3.ANALYSES.1'&&analyses.status==='analysis_not_authenticated_review'&&analyses.analyses?.length===24,'B3_ANALYSES_INVALID');
 const byCode=new Map();for(const a of analyses.analyses){assert(a.questionCode&&!byCode.has(a.questionCode),'B3_DUPLICATE_ANALYSIS');byCode.set(a.questionCode,a);}
 const rows=[];
 for(const proposal of proposals.cases){
  const a=byCode.get(proposal.questionCode);assert(a && a.cohort===proposal.cohort,'B3_ANALYSIS_MISSING');
  assert(proposal.scoringAuthorized===false && proposal.reviewerVerdict===null && proposal.proposalState==='proposed_unverified','B3_B1_PROPOSAL_MUST_BE_UNAPPROVED');
  assert(a.scoringAuthorized===false&&a.mathJudgmentApproval==='pending_human_review'&&a.methodApproval==='pending_human_review'&&a.curriculumApproval==='pending_human_review','B3_UNAUTHORIZED_APPROVAL_FLAG');
  const s=indexes[a.cohort];const q=s.code.get(a.questionCode);assert(q,'B3_CASE_NOT_IN_COHORT');
  const x=textFields(q), r=s.ri.get(x.questionId);assert(r && r.status!=='upstream_blocked','B3_CASE_NOT_READY');
  assert(proposal.prompt===x.prompt && proposal.f4Status===r.status && proposal.selectedMethodId===r.selectedMethodId,'B3_B1_F4_MISMATCH');
  assert(a.promptSha256===hash(x.prompt),'B3_PROMPT_CHANGED');
  for(const anchor of proposal.anchors??[])assert(anchor.field==='prompt'&&x.prompt.includes(anchor.text),'B3_ANCHOR_NOT_IN_PROMPT');
  assert(a.independentReasoning?.length>=25&&a.requiredEducatorReview?.length>=15,'B3_ANALYSIS_INSUFFICIENT');
  assert(['requires_original_image','prompt_mathematics_check'].includes(a.verificationMode),'B3_VERIFICATION_MODE_INVALID');
  const factCheck=checks[a.questionCode];
  assert((typeof factCheck==='function')===(a.verificationMode==='prompt_mathematics_check'),'B3_PROMPT_CHECK_COVERAGE_MISMATCH');
  const expected=factCheck?factCheck():null;
  const answerAgreement=expected===null?null:normalize(expected)===normalize(x.reportedAnswer);
  const isExternal=proposal.media?.requiresExternalImageVerification===true;
  if(a.verificationMode==='requires_original_image')assert(isExternal,'B3_UNVERIFIABLE_NOT_MARKED_EXTERNAL');
  const diagramStatus=isExternal?'external_image_not_inspected':proposal.media?.kind==='embedded_diagram'?'embedded_diagram_not_semantically_certified':'not_evaluated';
  const methods=(proposal.selectorFamilies??[]).flatMap(f=>f.assessedMethods??[]);
  const methodIds=[...new Set(methods.map(m=>m.methodId))];
  rows.push({questionId:x.questionId,questionCode:x.questionCode,cohort:a.cohort,level:proposal.level,priority:proposal.reviewPriority,
   f4Status:r.status,selectedMethodId:r.selectedMethodId,methodIds,methodScores:methods.map(m=>({methodId:m.methodId,score:m.score})),
   prompt:x.prompt,reportedAnswer:x.reportedAnswer,independentExpectedAnswer:expected,independentAnswerAgreement:answerAgreement,
   sourceExplanationUsedForCalculation:false,sourceImageReferenceRequired:isExternal,diagramStatus,
   independentRelation:a.independentRelation,independentReasoning:a.independentReasoning,
   verificationMode:a.verificationMode,pedagogicalFlag:a.pedagogicalFlag,requiredEducatorReview:a.requiredEducatorReview,
   mathVerificationStatus:expected===null?'pending_image_evidence':answerAgreement?'prompt_calculation_matches_reported_answer':'PROMPT_CALCULATION_CONFLICT',
   curriculumStatus:'not_approved',methodFitStatus:'not_approved',diagramApproval:'not_approved',
   humanReviewer:null,approvalRef:null,scoringAuthorized:false,
   note:'Authored mathematical analysis is NOT a curriculum-reviewer approval. B2 evidence cannot be emitted.'});
 }
 assert(rows.length===24 && new Set(rows.map(x=>x.questionId)).size===24,'B3_REVIEW_JOIN_INVALID');
 assert(rows.filter(x=>x.priority==='P0').length===11,'B3_P0_COVERAGE_CHANGED');
 const stats={total480:480,ready320:320,selected84:84,ambiguous236:236,upstream160:160,
  curated:rows.length,P0:rows.filter(x=>x.priority==='P0').length,
  textMathChecks:rows.filter(x=>x.independentExpectedAnswer!==null).length,
  matchingSourceAnswers:rows.filter(x=>x.independentAnswerAgreement===true).length,
  conflictingSourceAnswers:rows.filter(x=>x.independentAnswerAgreement===false).length,
  imageDependentUnresolved:rows.filter(x=>x.mathVerificationStatus==='pending_image_evidence').length,
  externalImageReferences:rows.filter(x=>x.sourceImageReferenceRequired).length,
  humanApproved:0,approvedB2Records:0,productionScoreChanges:0};
 assert(stats.textMathChecks+stats.imageDependentUnresolved===24,'B3_MATH_COVERAGE_RECONCILIATION');
 const flags={};for(const r of rows)flags[r.pedagogicalFlag]=(flags[r.pedagogicalFlag]??0)+1;
 return {schemaVersion:VERSION,phase:'review_only_do_not_enable_scoring',source:{fixedRunId:fixedExport.run_id,holdoutRunId:holdoutExport.run_id,cohorts:'both_previously_inspected'},
  policy:{teacherApprovalRequired:true,externalImageVerificationRequired:true,reviewerAuthenticationExternal:true,
   acceptedAsB2ApprovedEvidence:false,scoringThresholds:{quality:75,margin:8}},stats,flags,rows};
}
function renderCasebook(result){
 const a=['# Phase 4C-4C-B3 — Source-Bound Mathematical Review (Not Approved)','',
  '**Status:** AI-assisted prompt mathematics checks, *not* independently authenticated teacher or curriculum approval. No B2-approved records are created. Both cohorts are previously inspected.','',
  `**Cohort coverage:** 480 joined; 320 4A ready; 84 selected; 236 ambiguous; 160 upstream blocked. **Reviewed cases:** ${result.stats.curated} (${result.stats.P0} P0).`,
  `**Prompt-only answer checks:** ${result.stats.textMathChecks} (reported-answer agreement ${result.stats.matchingSourceAnswers}; conflicts ${result.stats.conflictingSourceAnswers}). **Image-dependent answer checks pending:** ${result.stats.imageDependentUnresolved}. **External image references:** ${result.stats.externalImageReferences}.`,
  '', '## Critical review principle','',
  'A correct arithmetic check does **not** establish that a selected teaching method is the best one. An external-image path is not the image; diagram counts and placements require viewing actual pixels. Grade appropriateness is separate from mathematical fit.',''];
 for(const r of result.rows){
  a.push(`## ${r.priority} — ${r.questionCode} (${r.cohort}, P${r.level})`,'',`**Question:** ${md(r.prompt)}`,'',
   `**Current selector:** ${r.f4Status} — ${r.selectedMethodId??'no winner'}`,'',
   `**Method candidates:** ${r.methodScores.map(m=>`${m.methodId} (${m.score})`).join('; ')}`,'',
   `**Prompt structure:** ${r.independentRelation}`,'',
   `**Independent mathematical analysis:** ${md(r.independentReasoning)}`,'',
   `**Calculation:** ${r.independentExpectedAnswer??'Cannot establish from prompt alone'}. **Reported bank answer:** ${md(r.reportedAnswer)}. **Answer comparison:** ${r.mathVerificationStatus}.`,'',
   `**Method-fit review flag:** ${r.pedagogicalFlag}. ${md(r.requiredEducatorReview)}`,'',
   `**Diagram status:** ${r.diagramStatus}. **Curriculum approval:** pending. **Method approval:** pending.`,'','---','');
 }
 return a.join('\n');
}
const outputCols=['cohort','questionCode','level','priority','f4Status','selectedMethodId','pedagogicalFlag','independentRelation','mathVerificationStatus','diagramStatus','requiredEducatorReview','teacher_math_verdict','teacher_method_verdict','curriculum_classification','image_checked_reference','reviewer_id','reviewer_notes','approver_id','approval_reference'];
function flatten(r){return {...r,teacher_math_verdict:'',teacher_method_verdict:'',curriculum_classification:'',image_checked_reference:'',reviewer_id:'',reviewer_notes:'',approver_id:'',approval_reference:''};}
function outputFiles(result,outDir){
 fs.mkdirSync(outDir,{recursive:true});
 const files={
  'phase-4c4c-b3-review-register.json':JSON.stringify(result,null,2)+'\n',
  'phase-4c4c-b3-review-summary.json':JSON.stringify({schemaVersion:VERSION,stats:result.stats,flags:result.flags,policy:result.policy},null,2)+'\n',
  'phase-4c4c-b3-casebook.md':renderCasebook(result)+'\n',
  'phase-4c4c-b3-teacher-review-template.csv':csv(result.rows.map(flatten),outputCols),
 };
 for(const [filename,content] of Object.entries(files))fs.writeFileSync(path.join(outDir,filename),content,'utf8');
 return Object.keys(files);
}
module.exports={VERSION,buildReview,outputFiles,renderCasebook,escapeCsv,checks,EXPECTED};
