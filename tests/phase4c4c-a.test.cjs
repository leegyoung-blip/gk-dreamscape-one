'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {buildAudit,writeAuditFiles,answerChoiceIntegrity,mediaEvidence,rowsToCsv}=require('./build-phase4c4c-a.cjs');
function fixture(seed, opts={}){
 const fixed=seed==='phase-2i-v1', blocked=fixed?61:99, size=240, name=fixed?'fixed':'holdout';
 const runId=`run-${name}`;
 const items=Array.from({length:size},(_,i)=>({question_id:`${name}-${String(i).padStart(3,'0')}`,question_code:`MATH-P1-${name.toUpperCase()}-${i}`,primary_level:1,topic_title:'Mock topic',sample_stratum:'text_direct',prompt:`Sample ${i}`,question:{prompt:`Sample ${i}`,question_type:'multiple_choice',content:{options:[{id:'a',text:'2'},{id:'b',text:'3'}]},answer_data:{display_answer:'2',correct_option_ids:['a']},explanation:{student:'1 + 1 = 2'},skill_mappings:[]}}));
 const results=items.map(item=>({client_id:item.question_id,status:'not_needed',proposal:null,error:null}));
 const f4results=items.map((item,i)=>({questionId:item.question_id,questionCode:item.question_code,level:1,status:i<blocked?'upstream_blocked':(i===blocked?'selected':'ambiguous'),reasonCodes:i<blocked?['UPSTREAM_CONTRACT_BLOCKED']:[],candidateCount:i<blocked?0:1,primaryFamilies:i<blocked?[]:['number.place_value'],selectedMethodId:i===blocked?'number.place_value.compare_order':null,selectionConfidence:i===blocked?'low':i<blocked?null:'none',deterministic:true,diagnostics:i<blocked?undefined:{familyDiagnostics:[{familyId:'number.place_value',status:i===blocked?'selected':'ambiguous',selectorIssues:i===blocked?[]:[{code:'LOW_WINNER_QUALITY'}],methods:[{methodId:'number.place_value.compare_order',rank:1,score:i===blocked?77:64.5,eligibility:'eligible',prerequisiteEvidence:'unverified',exclusionCodes:[]}]}]}}));
 const original={run_id:runId,sample:{seed,items},results};
 const f4={schema_version:'4C-4B-QA.1',source_seed:seed,source_run_id:runId,summary:{total:size,upstreamBlocked:blocked,adapterBlocked:0,nondeterministic:0,selected:1,ambiguous:size-blocked-1,checks:{totalsReconcile:true,deterministic:true}},results:f4results};
 return {original,f4};
}
const two=()=>[fixture('phase-2i-v1'),fixture('phase-4a2c5-holdout-v1')];
test('joins all 480 original questions and F4 selections',()=>{
 const result=buildAudit(two());
 assert.equal(result.rows.length,480);assert.equal(result.summary.ready,320);
 assert.deepEqual(result.summary.byOutcome,{upstream_blocked:160,selected:2,ambiguous:318});
});
test('keeps all judgment fields unreviewed and does not invent labels',()=>{
 const {rows,summary}=buildAudit(two());
 assert.equal(summary.methodologicalLabelsHumanVerified,0);
 for(const row of rows){assert.equal(row.pedagogicalJudgement.methodFit,null);assert.equal(row.pedagogicalJudgement.status,'not_reviewed');}
});
test('rejects mismatched source run and no artifact is produced',()=>{
 const arr=two();arr[0].f4.source_run_id='not-the-original';
 assert.throws(()=>buildAudit(arr),/run_id.*mismatch/);
});
test('rejects mismatched question code',()=>{
 const arr=two();arr[0].f4.results[0].questionCode='WRONG';
 assert.throws(()=>buildAudit(arr),/question code mismatch/);
});
test('rejects duplicate question IDs instead of silently merging',()=>{
 const arr=two();arr[0].original.sample.items[1].question_id=arr[0].original.sample.items[0].question_id;
 assert.throws(()=>buildAudit(arr),/duplicate question_id/);
});
test('rejects changed 4A upstream baseline',()=>{
 const arr=two();arr[1].f4.summary.upstreamBlocked--;
 assert.throws(()=>buildAudit(arr),/changed 4A baseline/);
});
test('rejects F4 technical errors or nondeterminism',()=>{
 const arr=two();arr[0].f4.summary.adapterBlocked=1;
 assert.throws(()=>buildAudit(arr),/technical errors remain/);
 const next=two();next[1].f4.summary.nondeterministic=1;
 assert.throws(()=>buildAudit(next),/nondeterministic/);
});
test('joined selected method includes original question, answer and shortlist scores',()=>{
 const row=buildAudit(two()).rows.find(r=>r.f4Status==='selected');
 assert.equal(row.prompt,'Sample 61');assert.equal(row.answer,'2');
 assert.equal(row.selectedMethodId,'number.place_value.compare_order');
 assert.equal(row.selectorFamilies[0].assessedMethods[0].score,77);
 assert.equal(row.reviewPriority,'P1');
});
test('detects exact answer-option mismatch, but not numeric question without choices',()=>{
 assert.equal(answerChoiceIntegrity({content:{options:[{id:'a',text:'2'}]},answer_data:{correct_option_ids:['a'],display_answer:'5'}}),'display_answer_choice_text_differs');
 assert.equal(answerChoiceIntegrity({content:{options:[]},answer_data:{display_answer:'4'}}),'not_multiple_choice');
});
test('external media is flagged without pretending that the image was inspected',()=>{
 const media=mediaEvidence({prompt:'Count the triangles in the picture',content:{},stimulus:{storage_bucket:'bucket',storage_path:'images/fig.png'}},{has_stimulus:true});
 assert.equal(media.requiresExternalImageVerification,true);
 assert.deepEqual(media.assetReferences,['bucket/images/fig.png']);
 assert.equal(media.diagramMentionInPrompt,true);
});
test('safely escapes potentially executable spreadsheet cells',()=>{
 const row=buildAudit(two()).rows.find(r=>r.f4Status==='selected');
 row.prompt='=1+1';
 const csv=rowsToCsv([row]);
 assert.match(csv,/"'=1\+1"/);
 assert.match(csv,/humanMethodFit/);
});
test('writes complete review artifacts with 320 ready and 160 blocked entries',()=>{
 const result=buildAudit(two());const dir=fs.mkdtempSync(path.join(os.tmpdir(),'phase4c4ca-'));
 try{
  const out=writeAuditFiles(result,dir);
  assert.equal(out.rows,480);assert.equal(out.ready,320);assert.equal(out.upstream,160);
  assert.equal(out.files.length,5);
  const csv=fs.readFileSync(path.join(dir,'phase-4c4c-a-ready-320-review.csv'),'utf8');
  assert.equal(csv.split('\r\n').filter(Boolean).length,321);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
