'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const subject=require('../scripts/phase4e2b8c2d6-review-priority-gap-closure.cjs');
const previous=require('../scripts/phase4e2b8c2d5-quality-coverage.cjs');
const casebook=require('../scripts/phase4e2b8c2d1-quality-casebook.cjs');
const book=subject.loadFixture();
const old=previous.loadFixture();
const deps=casebook.dependencies();
const baseline=subject.evaluate(book,old,deps);
const mutate=fn=>{const copy=JSON.parse(JSON.stringify(book));fn(copy);return subject.evaluate(copy,old,deps);};
const has=(r,value)=>r.errors.some(x=>x.includes(value))||r.results.some(x=>x.issues.some(i=>i.includes(value)));

test('18/18 added synthetic cases pass verified existing draft mathematical applicability',()=>{
 assert.equal(baseline.status,'OFFLINE_GAP_CLOSURE_CHECKS_PASSED');
 assert.equal(baseline.newCases,18);assert.equal(baseline.newPositives,18);
 assert.equal(baseline.results.filter(r=>r.pass).length,18);
});
test('existing 54 synthetic cases preserved and all 18 prior grade/difficulty gaps filled',()=>{
 assert.equal(baseline.existingCases,54);assert.equal(baseline.originalOpenCells,18);
 assert.equal(baseline.remainingCells,0);assert.equal(baseline.distinctPositiveCells,45);
 assert.equal(baseline.totalPossiblePositiveCells,45);
});
test('no completed teaching explanations, human reviews, real NOVA outputs or activation claimed',()=>{
 assert.equal(baseline.authoredReferenceExplanations,6);assert.equal(baseline.previousPairedExplanations,6);
 assert.equal(baseline.newCompleteExplanations,0);assert.equal(baseline.independentEducatorDecisionsMade,0);
 assert.equal(baseline.realNovaOutputsReviewed,0);assert.equal(baseline.betaReady,false);
 assert.equal(baseline.studentReleaseAllowed,false);assert.equal(baseline.methodActivationAllowed,false);
 assert.equal(baseline.relativeDifficultyCalibratedByEducator,false);
});
test('exactly 9 specialist-level cells each carry five unique synthetic positive difficulty bands',()=>{
 assert.equal(baseline.matrix.length,9);
 for(const m of baseline.matrix){assert.deepEqual(m.bands,[1,2,3,4,5]);assert.deepEqual(m.uncovered,[]);assert.equal(m.allPositive,5);}
});
test('review queue has the six original pairs plus 18 new structural-only cases',()=>{
 assert.equal(baseline.queue.length,24);assert.equal(baseline.queue.filter(q=>q.caseType==='existing_paired_explanation').length,6);
 assert.equal(baseline.queue.filter(q=>q.caseType==='new_structural_witness_only').length,18);
 assert.equal(new Set(baseline.queue.map(q=>q.caseId)).size,24);
});
test('review templates are explicitly pending with no filled scoring or approved release',()=>{
 const queue=subject.queueCsv(baseline), reviews=subject.worksheetCsv(baseline);
 assert.equal(queue.trim().split('\n').length,25);assert.equal(reviews.trim().split('\n').length,49);
 assert.equal((reviews.match(/,PENDING/g)||[]).length,48);
 assert.doesNotMatch(reviews,/\bAPPROVED\b|\bRELEASED\b/);
 assert.match(queue,/DISABLED/);
});
test('csv exports are derived from fixture and match packaged assets',()=>{
 for(const [file,fn] of [[subject.MATRIX,subject.matrixCsv],[subject.QUEUE,subject.queueCsv],[subject.WORKSHEET,subject.worksheetCsv]]){
  assert.equal(fs.readFileSync(path.join(ROOT,file),'utf8'),fn(baseline));
 }
});
for(const id of ['GAP_SPACE_01','GAP_SPACE_08','GAP_CHAIN_02','GAP_CHAIN_04','GAP_RATIO_01']){
 test('changing arithmetic answer is rejected for '+id,()=>{
  const result=mutate(b=>{const c=b.cases.find(c=>c.caseId===id);if(c.mathCheck.kind==='spacing')c.mathCheck.expectedIntervals++;
   else c.mathCheck.expectedTarget++;});
  assert.equal(result.status,'GAP_CLOSURE_BLOCKED');assert.equal(has(result,'WORKED_ARITHMETIC_INCORRECT'),true);
 });
}
test('duplicate cell cannot masquerade as the missing gap',()=>{
 const r=mutate(b=>{b.cases[0].difficultyRelativeToLevel=b.cases[1].difficultyRelativeToLevel;});
 assert.equal(r.status,'GAP_CLOSURE_BLOCKED');assert.equal(has(r,'REMAINING_GRADE_DIFFICULTY_GAPS'),true);
});
test('duplicate case ID cannot pass',()=>{
 const r=mutate(b=>{b.cases[1].caseId=b.cases[0].caseId;});assert.equal(r.status,'GAP_CLOSURE_BLOCKED');assert.equal(has(r,'INVALID_OR_DUPLICATE_NEW_CASE_ID'),true);
});
test('unsupported grade cannot be silently counted',()=>{
 const r=mutate(b=>{b.cases.find(c=>c.caseId==='GAP_RATIO_01').input.learnerLevel=3;});
 assert.equal(r.status,'GAP_CLOSURE_BLOCKED');assert.equal(has(r,'NOT_AN_ACTUAL_UNTESTED_POSITIVE_CELL'),true);
});
test('false source provenance is rejected',()=>{
 const r=mutate(b=>{b.casesFromProduction=true;});assert.equal(r.status,'GAP_CLOSURE_BLOCKED');assert.equal(has(r,'INVALID_GAP_BOOK_HEADER'),true);
});
test('claiming human review or release is rejected',()=>{
 for(const k of ['independentEducatorReviewCompleted','studentRelease']){
  const r=mutate(b=>{b[k]=true;});assert.equal(r.status,'GAP_CLOSURE_BLOCKED');
 }
});
test('unverified diagram input cannot count as a positive case',()=>{
 const r=mutate(b=>{const c=b.cases.find(c=>c.caseId==='GAP_SPACE_01');c.input.hasVisual=true;c.input.visualReviewed=false;});
 assert.equal(r.status,'GAP_CLOSURE_BLOCKED');assert.equal(has(r,'EXPECTED_APPLICABILITY_MISMATCH'),true);
});
test('changing ratio must have explicitly supported changes',()=>{
 const r=mutate(b=>{const c=b.cases.find(c=>c.caseId==='GAP_RATIO_01');c.input.facts.changeEvidence='one_assumed';});
 assert.equal(r.status,'GAP_CLOSURE_BLOCKED');assert.equal(has(r,'EXPECTED_APPLICABILITY_MISMATCH'),true);
});
test('comparison must not include a disconnected extra quantity',()=>{
 const r=mutate(b=>{const c=b.cases.find(c=>c.caseId==='GAP_CHAIN_01');c.input.facts.quantityKeys.push('d');});
 assert.equal(r.status,'GAP_CLOSURE_BLOCKED');assert.equal(has(r,'EXPECTED_APPLICABILITY_MISMATCH'),true);
});
test('untrusted approval or key data in fixture rejected by pre-existing 2D.1 validation',()=>{
 const r=mutate(b=>{b.cases[0].answer_data={correct:'hidden'};});
 assert.equal(r.status,'GAP_CLOSURE_BLOCKED');assert.equal(has(r,'POTENTIALLY_SENSITIVE_FIXTURE_FIELD'),true);
});
test('removing any new case exposes missing coverage',()=>{
 const r=mutate(b=>{b.cases.pop();});assert.equal(r.status,'GAP_CLOSURE_BLOCKED');assert.equal(has(r,'INVALID_GAP_BOOK_HEADER'),true);
});
test('existing 2D.5 coverage and original 2D.1 casebook still pass untouched',()=>{
 const r=previous.evaluate(old,deps);assert.equal(r.status,'SYNTHETIC_COVERAGE_CHECKS_PASSED');
 assert.equal(r.gradeDifficultyGaps.length,18);
 const book1=JSON.parse(fs.readFileSync(path.join(ROOT,casebook.FIXTURE),'utf8'));
 assert.equal(casebook.evaluateCasebook(book1,deps).checksPassed,true);
});
test('no runtime network, database calls or production selector imports in this phase',()=>{
 const s=fs.readFileSync(path.join(ROOT,'scripts/phase4e2b8c2d6-review-priority-gap-closure.cjs'),'utf8');
 assert.doesNotMatch(s,/\bfetch\s*\(|\bcreateClient\s*\(|\bprocess\.env\.|\bsupabase\.from\s*\(/);
 assert.match(s,/methodActivationAllowed:false,studentReleaseAllowed:false/);
});
