'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const quality=require('../scripts/phase4e2b8c2d5-quality-coverage.cjs');
const earlier=require('../scripts/phase4e2b8c2d1-quality-casebook.cjs');
const ROOT=path.resolve(__dirname,'..');
const book=quality.loadFixture();
const ctx=earlier.dependencies();
const clone=x=>structuredClone(x);
const baseline=quality.evaluate(book,ctx);
const altered=fn=>{const copy=clone(book);fn(copy);return quality.evaluate(copy,ctx);};
const has=(report,part)=>report.issues.some(x=>x.includes(part))||report.rows.some(x=>x.issues.some(y=>y.includes(part)));

test('all 54 expanded synthetic cases pass actual inactive-draft applicability and arithmetic checks',()=>{
  assert.equal(baseline.status,'SYNTHETIC_COVERAGE_CHECKS_PASSED');
  assert.equal(baseline.total,54);assert.equal(baseline.passed,54);assert.equal(baseline.failed,0);
  assert.equal(baseline.positive,27);assert.equal(baseline.excluded,17);assert.equal(baseline.insufficientEvidence,10);
});
test('all nine method-level combinations have valid examples',()=>{
 assert.equal(baseline.methodCount,3);assert.equal(baseline.levelMethodCells,9);
 assert.equal(baseline.gradeDifficultyGaps.length,18);
 assert.ok(baseline.matrix.every(x=>x.untestedPositiveDifficultyBands.every(d=>!x.positiveDifficultyBands.includes(d))));
 assert.ok(baseline.matrix.every(x=>x.positive>0&&x.gapStatus!=='NO_POSITIVE_CASE'));
});
test('difficulty 1 through 5 is relative to grade rather than a global scale',()=>{
  for(const methodId of Object.keys(quality.METHODS)){
    const cases=book.cases.filter(x=>x.methodId===methodId&&x.coverageCategory==='positive');
    assert.deepEqual([...new Set(cases.map(x=>x.difficultyRelativeToLevel))].sort(),[1,2,3,4,5]);
  }
  assert.match(book.difficultyPolicy,/relative to question primary level/);
});
test('expansion cannot be interpreted as educator approval, live NOVA output, or beta readiness',()=>{
 assert.equal(baseline.authenticProductionQuestionEvidenceTested,false);
 assert.equal(baseline.actualNovaExplanationTested,false);
 assert.equal(baseline.independentEducatorReviewCompleted,false);
 assert.equal(baseline.learnerComprehensionMeasured,false);
 assert.equal(baseline.approvalGranted,false);assert.equal(baseline.learnerReleased,false);
 assert.equal(baseline.productionScoringChanged,false);assert.equal(baseline.betaReady,false);
 assert.equal(baseline.expandedCasesWithFullNewTeachingExplanations,0);
 assert.equal(baseline.authoredReferenceExplanationsInPriorPhase,6);
});
test('no production question identifiers or student-specific values in expanded cases',()=>{
  for(const c of book.cases){
    assert.equal(c.caseProvenance,'synthetic_designed_case_not_a_production_question');
    const val=JSON.stringify(c);
    assert.doesNotMatch(val,/"(?:quizId|questionId|answer_data|accessToken|studentId|approved)"\s*:/i);
  }
});
test('coverage matrix export matches fixture-based calculations',()=>{
  const matrix=fs.readFileSync(path.join(ROOT,quality.MATRIX),'utf8');
  assert.equal(matrix,quality.coverageCsv(baseline));
  assert.equal(matrix.trim().split('\n').length,10);
});
for(const methodId of Object.keys(quality.METHODS)){
 test('real 3B applicability is checked for '+methodId,()=>{
   const methodCases=book.cases.filter(x=>x.methodId===methodId);
   assert.equal(methodCases.length,18);
   for(const c of methodCases){const result=ctx.review(c.input);assert.equal(result.status,c.expected.status);assert.equal(result.ruleCode,c.expected.ruleCode);}
 });
}
for(const key of ['EXP_SPACE_POS_01','EXP_CHAIN_POS_02','EXP_RATIO_POS_08']){
 test('arithmetic witness mutation blocked: '+key,()=>{
   const report=altered(b=>{
     const c=b.cases.find(x=>x.caseId===key);
     if(c.mathCheck.kind==='spacing')c.mathCheck.expectedIntervals++;
     else c.mathCheck.expectedTarget++;
   });
   assert.equal(report.status,'SYNTHETIC_COVERAGE_BLOCKED');assert.ok(has(report,'WORKED_ARITHMETIC_INCORRECT'));
 });
}
test('wrong expected applicability blocked even with valid text metadata',()=>{
 const report=altered(b=>{b.cases[0].expected.ruleCode='FAKE_PASS';});
 assert.equal(report.status,'SYNTHETIC_COVERAGE_BLOCKED');assert.ok(has(report,'EXPECTED_APPLICABILITY_MISMATCH'));
});
test('false positive from near-match is blocked',()=>{
 const report=altered(b=>{b.cases.find(x=>x.caseId==='EXP_SPACE_NEG_01').coverageCategory='positive';});
 assert.equal(report.status,'SYNTHETIC_COVERAGE_BLOCKED');assert.ok(has(report,'COVERAGE_CATEGORY_OUTCOME_MISMATCH'));
});
test('unverified diagram cannot be made a positive case',()=>{
 const report=altered(b=>{const x=b.cases.find(x=>x.caseId==='EXP_CHAIN_NEG_08');x.expected.status='compatible_for_review';x.coverageCategory='positive';});
 assert.equal(report.status,'SYNTHETIC_COVERAGE_BLOCKED');assert.ok(has(report,'EXPECTED_APPLICABILITY_MISMATCH'));
});
test('misrepresented lack of evidence is rejected',()=>{
 const report=altered(b=>{const x=b.cases.find(x=>x.caseId==='EXP_RATIO_NEG_09');x.coverageCategory='near_match';});
 assert.equal(report.status,'SYNTHETIC_COVERAGE_BLOCKED');assert.ok(has(report,'NEAR_MATCH_MUST_BE_EXCLUDED'));
});
test('duplicate scenario ID is blocked',()=>{
 const report=altered(b=>{b.cases[1].caseId=b.cases[0].caseId;});
 assert.equal(report.status,'SYNTHETIC_COVERAGE_BLOCKED');assert.ok(has(report,'INVALID_OR_DUPLICATE_CASE_ID'));
});
test('out-of-level compatibility is rejected',()=>{
 const report=altered(b=>{b.cases.find(x=>x.caseId==='EXP_RATIO_POS_01').input.learnerLevel=3;});
 assert.equal(report.status,'SYNTHETIC_COVERAGE_BLOCKED');assert.ok(has(report,'UNSUPPORTED_LEVEL_OR_SPECIALIST'));
});
test('difficulty values outside 1..5 cannot pass coverage',()=>{
 const report=altered(b=>{b.cases[0].difficultyRelativeToLevel=7;});
 assert.equal(report.status,'SYNTHETIC_COVERAGE_BLOCKED');assert.ok(has(report,'INVALID_RELATIVE_DIFFICULTY'));
});
test('missing relative difficulty band is detected even when the cases still pass arithmetic',()=>{
 const report=altered(b=>{
  for(const x of b.cases.filter(c=>c.methodId==='ratio.relationship.before_after_change'&&c.coverageCategory==='positive'&&c.difficultyRelativeToLevel===5))x.difficultyRelativeToLevel=4;
 });
 assert.equal(report.status,'SYNTHETIC_COVERAGE_BLOCKED');assert.ok(has(report,'MISSING_RELATIVE_DIFFICULTY_BAND'));
});
test('method-level coverage gap is detected',()=>{
 const report=altered(b=>{
   for(const x of b.cases.filter(c=>c.methodId==='heuristic.multi_step.equal_spacing_interval_count'&&c.coverageCategory==='positive'&&c.input.learnerLevel===6))x.input.learnerLevel=5;
 });
 assert.equal(report.status,'SYNTHETIC_COVERAGE_BLOCKED');assert.ok(has(report,'LEVEL_METHOD_COMBINATION_UNTESTED'));
});
test('removing a case fails rather than silently passing incomplete suite',()=>{
 const report=altered(b=>{b.cases.pop();});
 assert.equal(report.status,'SYNTHETIC_COVERAGE_BLOCKED');assert.ok(has(report,'INVALID_COVERAGE_BOOK_HEADER'));
});
test('fake production evidence claim fails',()=>{
 const report=altered(b=>{b.casesFromProduction=true;});
 assert.equal(report.status,'SYNTHETIC_COVERAGE_BLOCKED');assert.ok(has(report,'INVALID_COVERAGE_BOOK_HEADER'));
});
test('fake approval field is rejected in case data',()=>{
 const report=altered(b=>{b.cases[0].approved=true;});
 assert.equal(report.status,'SYNTHETIC_COVERAGE_BLOCKED');assert.ok(has(report,'POTENTIALLY_SENSITIVE_FIXTURE_FIELD'));
});
test('unsupported specialist ID fails closed',()=>{
 const report=altered(b=>{b.cases[0].methodId='ratio.relationship.new_active_method';b.cases[0].input.methodId='ratio.relationship.new_active_method';});
 assert.equal(report.status,'SYNTHETIC_COVERAGE_BLOCKED');assert.ok(has(report,'UNSUPPORTED_LEVEL_OR_SPECIALIST'));
});
test('first phase quality casebook remains unchanged',()=>{
 const prev=earlier.evaluateCasebook(JSON.parse(fs.readFileSync(path.join(ROOT,earlier.FIXTURE),'utf8')),ctx);
 assert.equal(prev.checksPassed,true);assert.equal(prev.caseCount,18);
});
test('sources contain no API route, SQL migration, or method activation link',()=>{
 const script=fs.readFileSync(path.join(ROOT,'scripts/phase4e2b8c2d5-quality-coverage.cjs'),'utf8');
 assert.doesNotMatch(script,/\bfetch\s*\(|\bcreateClient\s*\(|\bprocess\.env\.|\bsupabase\.from\s*\(/);
 assert.match(script,/productionScoringChanged:false,learnerReleased:false/);
});
