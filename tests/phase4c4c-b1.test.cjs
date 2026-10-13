'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {buildReview,validateSource,validateCatalog,writeReview,makeCsv,buildCasebook}=require('./build-phase4c4c-b1.cjs');
const artifact=path.resolve(__dirname,'../qa-artifacts/phase4c4c-b1');
const original=path.resolve(__dirname,'../qa-artifacts/phase4c4c-a/phase-4c4c-a-joined-480.json');
// This is installed on top of 4C-4C-A; do not bundle duplicate 480-question artifacts.
assert.ok(fs.existsSync(original),'Missing 4C-4C-A joined artifact; install 4C-4C-A first');
const joined=JSON.parse(fs.readFileSync(original,'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(artifact,'phase-4c4c-b1-rule-catalog.json'),'utf8'));
const curated=JSON.parse(fs.readFileSync(path.join(artifact,'phase-4c4c-b1-curated-cases.json'),'utf8'));
const run=()=>buildReview(joined,catalog,curated);
const clone=x=>JSON.parse(JSON.stringify(x));

test('reconciles all 480 original questions and 320 eligible statuses',()=>{
 const x=run();assert.equal(x.summary.sourceQuestions,480);assert.equal(x.summary.readyQuestions,320);
 assert.equal(x.summary.selected,84);assert.equal(x.summary.ambiguous,236);assert.equal(x.summary.upstreamBlocked,160);
});
test('reviews all eleven highest-priority cases and preserves their identity',()=>{
 const x=run();assert.equal(x.summary.P0,11);assert.equal(x.summary.curatedP0,11);
 const p0=x.cases.filter(r=>r.reviewPriority==='P0');assert.equal(p0.length,11);
 assert.ok(p0.some(r=>r.questionCode==='MATH-P2-PROB-041-Q03'));
 assert.ok(p0.some(r=>r.questionCode==='MATH-P1-NUM-009-Q04'));
});
test('12 separately typed pedagogical rules cannot change frozen thresholds',()=>{
 const known=validateCatalog(catalog);assert.equal(known.size,12);
 const x=run();assert.equal(x.summary.minimumQuality,75);assert.equal(x.summary.minimumMargin,8);
 assert.equal(x.summary.automaticSelectionChanges,0);assert.equal(x.summary.scoringChanges,0);
});
test('curated evidence is explicitly unverified with no fabricated human verdicts',()=>{
 const x=run();assert.equal(x.summary.curatedCases,24);assert.equal(x.summary.humanApprovedCases,0);
 assert.ok(x.cases.every(c=>c.proposalState==='proposed_unverified' && c.scoringAuthorized===false && c.reviewerVerdict===null));
 assert.ok(x.queue.every(q=>q.methodFit==='' && q.reviewer===''));
});
test('flags all seventeen 4A-ready remote-image cases without image verdict',()=>{
 const x=run();assert.equal(x.summary.externalImageReady,17);
 assert.equal(x.queue.filter(q=>q.imageMustBeInspected==='YES').length,17);
 assert.ok(x.cases.filter(c=>c.media.requiresExternalImageVerification).every(c=>c.sourceMediaGate==='image_not_verified'));
});
test('rejects ungrounded invented question evidence anchors',()=>{
 const altered=clone(curated);altered.examples[0].anchors[0].text='A 9000-sided fictional figure';
 assert.throws(()=>buildReview(joined,catalog,altered),/unmatched literal evidence anchor/);
});
test('rejects evidence purportedly coming from inaccessible source media',()=>{
 const altered=clone(curated);altered.examples[0].anchors[0].field='image_verified';
 assert.throws(()=>buildReview(joined,catalog,altered),/anchor source not allowed/);
});
test('rejects scoring-authorized rules and altered 75/8 confidence gates',()=>{
 const ruleChange=clone(catalog);ruleChange.rules[0].scoringAuthorized=true;
 assert.throws(()=>buildReview(joined,ruleChange,curated),/authorized for scoring/);
 const thresholdChange=clone(catalog);thresholdChange.fixedDecisionThresholds.minimumMargin=7;
 assert.throws(()=>buildReview(joined,thresholdChange,curated),/thresholds changed/);
});
test('rejects fabricated reviewer approval or score powers in curated annotations',()=>{
 const a=clone(curated);a.examples[2].humanApproved=true;
 assert.throws(()=>buildReview(joined,catalog,a),/claims human approval/);
 const b=clone(curated);b.examples[0].mayAlterScores=true;
 assert.throws(()=>buildReview(joined,catalog,b),/claims human approval/);
});
test('refuses to overwrite existing human verdicts',()=>{
 const x=clone(joined);x.results[0].pedagogicalJudgement.status='reviewed';
 x.results[0].pedagogicalJudgement.methodFit='appropriate';
 assert.throws(()=>buildReview(x,catalog,curated),/human review verdict would be overwritten/);
});
test('fails closed on baseline drift or duplicate questions',()=>{
 const altered=clone(joined);altered.results[0].f4Status='ambiguous';
 assert.throws(()=>buildReview(altered,catalog,curated),/outcome baselines changed/);
 const dup=clone(joined);dup.results[1].questionCode=dup.results[0].questionCode;
 assert.throws(()=>buildReview(dup,catalog,curated),/duplicate cohort\/questionCode/);
});
test('spreadsheet review queue escapes formula-like source text',()=>{
 const csv=makeCsv([{prompt:'=SUM(1,2)',reviewNotes:'+bad'}],['prompt','reviewNotes']);
 assert.match(csv,/"'=SUM\(1,2\)"/);assert.match(csv,/"'\+bad"/);
});
test('writes isolated review outputs and casebook without touching 4C-A sources',()=>{
 const x=run();const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamscape4c-b1-'));
 try{const names=writeReview(x,dir);
  for(const f of Object.values(names)) assert.ok(fs.statSync(path.join(dir,f)).size>100);
  const summary=JSON.parse(fs.readFileSync(path.join(dir,names.summary),'utf8'));
  assert.equal(summary.curatedCases,24);assert.match(fs.readFileSync(path.join(dir,names.casebook),'utf8'),/fresh unseen holdout/);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
test('P1 part-whole method concern is review-only and no method is swapped',()=>{
 const x=run();const row=x.cases.find(c=>c.questionCode==='MATH-P1-NUM-009-Q04');
 assert.equal(row.selectedMethodId,'number.place_value.compare_order');
 assert.deepEqual(row.ruleIds,['B1-02','B1-07']);assert.equal(row.reviewerVerdict,null);
});
test('holds ambiguous forward-change tie without assigning either method',()=>{
 const x=run();const row=x.cases.find(c=>c.questionCode==='MATH-P1-PROB-050-Q02');
 assert.equal(row.f4Status,'ambiguous');assert.equal(row.selectedMethodId,null);
 const methods=row.selectorFamilies.flatMap(f=>f.assessedMethods);
 assert.equal(methods.find(m=>m.methodId.endsWith('.find_change')).score,77);
 assert.equal(methods.find(m=>m.methodId.endsWith('.forward_change')).score,77);
});
