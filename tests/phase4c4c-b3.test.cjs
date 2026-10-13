'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {buildReview,outputFiles,escapeCsv}=require('../lib/math/teaching/strategy-selection/qa/buildPhase4C4CB3Review.cjs');
const root=path.resolve(__dirname,'..');
const artifact=name=>JSON.parse(fs.readFileSync(path.join(root,'qa-artifacts/phase4c4c-b3',name),'utf8'));
const reg=artifact('phase-4c4c-b3-review-register.json');
const analyses=artifact('independent-assessments.json');
const summary=artifact('phase-4c4c-b3-review-summary.json');
function create(){
 const proposal={schemaVersion:'4C-4C-B1.CASE_OUTPUT.1',approval:'none',cases:[]};
 const all={fixed:[],holdout:[]};
 for(const r of reg.rows){
  all[r.cohort].push({q:{question_id:r.questionId,question_code:r.questionCode,question:{prompt:r.prompt,answer_data:{display_answer:r.reportedAnswer}}},
  report:{questionId:r.questionId,questionCode:r.questionCode,status:r.f4Status,selectedMethodId:r.selectedMethodId}});
  proposal.cases.push({cohort:r.cohort,questionCode:r.questionCode,level:r.level,reviewPriority:r.priority,
   prompt:r.prompt,f4Status:r.f4Status,selectedMethodId:r.selectedMethodId,
   selectorFamilies:[{familyId:'synthetic',assessedMethods:r.methodScores}],
   anchors:[{field:'prompt',text:r.prompt.slice(0,Math.min(24,r.prompt.length))}],
   media:{kind:r.sourceImageReferenceRequired?'external_image_reference':'text_only',
    requiresExternalImageVerification:r.sourceImageReferenceRequired},
   proposalState:'proposed_unverified',scoringAuthorized:false,reviewerVerdict:null});
 }
 function finish(kind,tot){
  const rows=all[kind], seen={selected:rows.filter(r=>r.report.status==='selected').length,ambiguous:rows.filter(r=>r.report.status==='ambiguous').length,upstreamBlocked:0};
  for(const [state,key] of [['selected','selected'],['ambiguous','ambiguous'],['upstream_blocked','upstreamBlocked']]){
   const remaining=tot[key]-seen[key]; a.ok(remaining>=0);
   for(let i=0;i<remaining;i++){
    const id=`${kind}-${state}-filler-${i}`,code=`${kind}-${state}-FILL-${i}`;
    rows.push({q:{question_id:id,question_code:code,question:{prompt:'Synthetic filler',answer_data:{display_answer:'0'}}},report:{questionId:id,questionCode:code,status:state,selectedMethodId:null}});
   }
  }
  a.equal(rows.length,240);
  const seed=kind==='fixed'?'phase-2i-v1':'phase-4a2c5-holdout-v1';
  return {source:{run_id:`fake-${kind}`,sample:{seed,items:rows.map(r=>r.q)}},
   f4:{source_seed:seed,source_run_id:`fake-${kind}`,summary:{...tot,adapterBlocked:0,nondeterministic:0},results:rows.map(r=>r.report)}};
 }
 const fixed=finish('fixed',{total:240,upstreamBlocked:61,selected:50,ambiguous:129});
 const holdout=finish('holdout',{total:240,upstreamBlocked:99,selected:34,ambiguous:107});
 return {fixedExport:fixed.source,holdoutExport:holdout.source,fixedF4:fixed.f4,holdoutF4:holdout.f4,proposals:proposal,analyses:structuredClone(analyses)};
}
test('precomputed B3 frozen baseline reconciles',()=>{a.deepEqual(reg.stats,summary.stats);a.equal(reg.rows.length,24);a.equal(reg.stats.total480,480);a.equal(reg.stats.P0,11);});
test('20 prompt calculations, all match source; 4 image-only checks pending',()=>{a.equal(reg.stats.textMathChecks,20);a.equal(reg.stats.matchingSourceAnswers,20);a.equal(reg.stats.imageDependentUnresolved,4);a.equal(reg.stats.conflictingSourceAnswers,0)});
test('9 external images remain uninspected, even when text math checks pass',()=>{a.equal(reg.stats.externalImageReferences,9);a.equal(reg.rows.filter(x=>x.diagramStatus==='external_image_not_inspected').length,9);});
test('no B2 evidence produced or approved; no scoring changes',()=>{a.equal(reg.policy.acceptedAsB2ApprovedEvidence,false);a.equal(reg.stats.humanApproved,0);a.equal(reg.stats.productionScoreChanges,0);a.ok(reg.rows.every(r=>r.scoringAuthorized===false&&r.approvalRef===null&&r.humanReviewer===null));});
test('full 480-question source-bound synthetic fixture joins correctly',()=>{const result=buildReview(create());a.equal(result.rows.length,24);a.equal(result.stats.matchingSourceAnswers,20);a.equal(result.stats.P0,11);});
test('reject changed question wording even with same question ID',()=>{const x=create();x.fixedExport.sample.items.find(q=>q.question_code==='MATH-P1-PROB-050-Q02').question.prompt+=' edited';a.throws(()=>buildReview(x),/B3_B1_F4_MISMATCH|B3_PROMPT_CHANGED/)});
test('reject changed prompt hash in independent notes',()=>{const x=create();x.analyses.analyses[0].promptSha256='bad';a.throws(()=>buildReview(x),/B3_PROMPT_CHANGED/)});
test('reject mismatched run ID',()=>{const x=create();x.holdoutF4.source_run_id='unrelated';a.throws(()=>buildReview(x),/B3_holdout_RUN_ID_MISMATCH/)});
test('reject drift in upstream and selection baseline',()=>{const x=create();x.fixedF4.summary.selected=51;a.throws(()=>buildReview(x),/B3_fixed_BASELINE_CHANGED_selected/)});
test('reject duplicate source question IDs',()=>{const x=create();x.fixedExport.sample.items[239].question_id=x.fixedExport.sample.items[238].question_id;a.throws(()=>buildReview(x),/B3_fixed_DUPLICATE_SOURCE_ID/)});
test('reject forged approvals in B1 proposal',()=>{const x=create();x.proposals.cases[0].scoringAuthorized=true;a.throws(()=>buildReview(x),/B3_B1_PROPOSAL_MUST_BE_UNAPPROVED/)});
test('reject fraudulent signed approval flag in mathematical analyses',()=>{const x=create();x.analyses.analyses[0].mathJudgmentApproval='approved';a.throws(()=>buildReview(x),/B3_UNAUTHORIZED_APPROVAL_FLAG/)});
test('bank answer conflicts are reported, not silently trusted',()=>{const x=create();x.fixedExport.sample.items.find(q=>q.question_code==='MATH-P1-PROB-050-Q02').question.answer_data.display_answer='999';const z=buildReview(x);a.equal(z.stats.conflictingSourceAnswers,1);a.equal(z.rows.find(r=>r.questionCode==='MATH-P1-PROB-050-Q02').mathVerificationStatus,'PROMPT_CALCULATION_CONFLICT')});
test('reject B1 anchor absent from original prompt',()=>{const x=create();x.proposals.cases[0].anchors[0].text='not present in prompt';a.throws(()=>buildReview(x),/B3_ANCHOR_NOT_IN_PROMPT/)});
test('CSV formula strings are escaped for spreadsheet reviewers',()=>{for(const s of ['=1+1','+A1','-2','@SUM(1)',' \t=HYPERLINK'])a.ok(escapeCsv(s).startsWith("'"));});
test('generated review template contains blank reviewer and approval cells',()=>{const x=create(),z=buildReview(x);const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dreamscape-b3-test-'));try{const files=outputFiles(z,tmp);a.equal(files.length,4);const lines=fs.readFileSync(path.join(tmp,'phase-4c4c-b3-teacher-review-template.csv'),'utf8').trim().split('\r\n');a.equal(lines.length,25);a.ok(lines[0].includes('approval_reference'));a.ok(lines[1].endsWith(',,,,,,,')||lines[1].includes(',,,'));}finally{fs.rmSync(tmp,{recursive:true,force:true});}});
