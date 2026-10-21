'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const validator=require('../scripts/phase4e2b8c2d1-quality-casebook.cjs');
const book=JSON.parse(fs.readFileSync(path.join(root,validator.FIXTURE),'utf8'));
const ctx=validator.dependencies();
const clone=x=>JSON.parse(JSON.stringify(x));
const first=id=>clone(book.cases.find(x=>x.caseId===id));
const cases=book.cases;
const report=validator.evaluateCasebook(book,ctx);
test('full synthetic specialist casebook passes with strictly non-release status',()=>{
  assert.equal(report.caseCount,18);
  assert.equal(report.failed,0);
  assert.equal(report.checksPassed,true);
  assert.equal(report.humanPedagogicalReview,'pending');
  assert.equal(report.answerKeyVerifiedAgainstProduction,false);
  assert.equal(report.sourceVersionChecked,false);
  assert.equal(report.methodActivationAllowed,false);
  assert.equal(report.staffWriteEnablementAllowed,false);
  assert.equal(report.studentReleaseAllowed,false);
  assert.equal(report.betaReady,false);
});
test('three inactive specialist IDs are covered without skill-point promotion',()=>{
  assert.equal(report.methods.length,3);
  for(const m of ctx.drafts){
    assert.equal(m.status,'draft');
    assert.equal(m.applicability.curriculumSkills.length,0);
    assert.equal(m.governance.lunaAllowed,false);
    assert.equal(report.methods.find(row=>row.methodId===m.methodId).cases,6);
  }
});
test('quality review has six teacher-scored criteria and requires two human reviewers',()=>{
  assert.equal(validator.REQUIRED_CRITERIA.length,6);
  assert.equal(report.independentReviewersRequired,2);
  assert.equal(report.comparisonWithExistingTeachingMethods,'not_yet_human_evaluated');
});
for(const row of cases){
  test(row.caseId+' matches real draft applicability + bounded offline maths',()=>{
    const result=validator.validateCase(row,ctx.drafts,ctx.review);
    assert.equal(result.checksPassed,true,result.issues.join(','));
    assert.equal(result.humanPedagogicalReview,'pending');
    assert.equal(result.studentReleaseAllowed,false);
    if(row.expected.status==='compatible_for_review'){
      assert.ok(row.mathCheck);
      assert.ok(row.pedagogyChecklist);
      assert.equal(validator.checkArithmetic(row.input,row.mathCheck),true);
    } else assert.equal(row.mathCheck,undefined);
  });
}
test('rejects a wrong spacing worked answer even when applicability is compatible',()=>{
  const row=first('SPACING_VALID_MAIN');
  row.mathCheck.expectedDistance=54;
  assert.ok(validator.validateCase(row,ctx.drafts,ctx.review).issues.includes('WORKED_ARITHMETIC_INCORRECT'));
});
test('rejects extra endpoint interval in adjacent-position case',()=>{
  const row=first('SPACING_VALID_ADJACENT');
  row.mathCheck.expectedIntervals=2;
  assert.ok(validator.validateCase(row,ctx.drafts,ctx.review).issues.includes('WORKED_ARITHMETIC_INCORRECT'));
});
test('rejects a wrong comparison target even when all relationships hold',()=>{
  const row=first('CHAIN_VALID_HALF');
  row.mathCheck.expectedTarget=36;
  assert.ok(validator.validateCase(row,ctx.drafts,ctx.review).issues.includes('WORKED_ARITHMETIC_INCORRECT'));
});
test('rejects a missing quantity in a purported whole total',()=>{
  const row=first('CHAIN_VALID_HALF');
  delete row.mathCheck.amounts.chen;
  assert.ok(validator.validateCase(row,ctx.drafts,ctx.review).issues.includes('WORKED_ARITHMETIC_INCORRECT'));
});
test('rejects a wrong multiplicative relation even with the same total',()=>{
  const row=first('CHAIN_VALID_HALF');
  row.mathCheck.amounts.alan=15;
  row.mathCheck.amounts.chen=15;
  assert.ok(validator.validateCase(row,ctx.drafts,ctx.review).issues.includes('WORKED_ARITHMETIC_INCORRECT'));
});
test('rejects wrong changed-ratio result when before/after checks do not hold',()=>{
  const row=first('RATIO_VALID_MAIN');
  row.mathCheck.updated=[16,30];
  assert.ok(validator.validateCase(row,ctx.drafts,ctx.review).issues.includes('WORKED_ARITHMETIC_INCORRECT'));
});
test('rejects an incorrect original target despite valid ratio amounts',()=>{
  const row=first('RATIO_VALID_DIFFERENT_SCALE');
  row.mathCheck.expectedTarget=12;
  assert.ok(validator.validateCase(row,ctx.drafts,ctx.review).issues.includes('WORKED_ARITHMETIC_INCORRECT'));
});
test('rejects removing a necessary stage from teaching checklist',()=>{
  const row=first('SPACING_VALID_MAIN');
  row.pedagogyChecklist.requiredStages.push('explain_bowling_rules');
  assert.ok(validator.validateCase(row,ctx.drafts,ctx.review).issues.includes('TEACHING_SEQUENCE_METADATA_INCOMPLETE'));
});
test('rejects a nonexistent misconception strategy',()=>{
  const row=first('CHAIN_VALID_SHARED_BASE');
  row.pedagogyChecklist.misconceptionId='unrelated_skill';
  assert.ok(validator.validateCase(row,ctx.drafts,ctx.review).issues.includes('TEACHING_SEQUENCE_METADATA_INCOMPLETE'));
});
test('rejects a visual representation not supported by the authored draft',()=>{
  const row=first('RATIO_VALID_MAIN');
  row.pedagogyChecklist.visualHint='clock_face';
  assert.ok(validator.validateCase(row,ctx.drafts,ctx.review).issues.includes('TEACHING_SEQUENCE_METADATA_INCOMPLETE'));
});
test('relabels a positive as excluded cannot pass',()=>{
  const row=first('CHAIN_VALID_HALF');
  row.expected.status='excluded';
  assert.ok(validator.validateCase(row,ctx.drafts,ctx.review).issues.includes('EXPECTED_APPLICABILITY_MISMATCH'));
});
test('negative case cannot claim a worked math sign-off',()=>{
  const row=first('RATIO_ASSUMED_UNCHANGED');
  row.mathCheck={kind:'ratio',original:[3,2],updated:[4,8],expectedTarget:2};
  assert.ok(validator.validateCase(row,ctx.drafts,ctx.review).issues.includes('EXCLUDED_CASE_CLAIMS_TEACHING_APPROVAL'));
});
test('rejects method ID swapped to avoid cross-method mistakes',()=>{
  const row=first('SPACING_VALID_MAIN');
  row.methodId='ratio.relationship.before_after_change';
  assert.ok(validator.validateCase(row,ctx.drafts,ctx.review).issues.includes('METHOD_ID_MISMATCH'));
});
test('rejects a fabricated approved specialist method record',()=>{
  const tampered=ctx.drafts.map(x=>({...x}));
  tampered[0]={...tampered[0],status:'active'};
  const row=first('SPACING_VALID_MAIN');
  assert.ok(validator.validateCase(row,tampered,ctx.review).issues.includes('DRAFT_GOVERNANCE_FAILED'));
});
test('rejects invented curriculum-skill declarations as a shortcut',()=>{
  const tampered=ctx.drafts.map(x=>({...x}));
  tampered[0]={...tampered[0],applicability:{...tampered[0].applicability,curriculumSkills:['p3-distance-gap']}};
  assert.ok(validator.validateCase(first('SPACING_VALID_MAIN'),tampered,ctx.review).issues.includes('DRAFT_GOVERNANCE_FAILED'));
});
test('rejects production question IDs, stored answer fields or JWT in a synthetic case',()=>{
  const row=first('SPACING_VALID_MAIN');
  row.questionId='random-uuid';
  row.answer_data={something:'hidden'};
  assert.ok(validator.validateCase(row,ctx.drafts,ctx.review).issues.includes('POTENTIALLY_SENSITIVE_FIXTURE_FIELD'));
});
test('rejects duplicate case IDs in the casebook',()=>{
  const mutated=clone(book);
  mutated.cases[1].caseId=mutated.cases[0].caseId;
  const result=validator.evaluateCasebook(mutated,ctx);
  assert.equal(result.checksPassed,false);
  assert.ok(result.results.some(row=>row.issues.includes('DUPLICATE_CASE_ID')));
});
test('rejects missing positive coverage for a specialist',()=>{
  const mutated=clone(book);
  mutated.cases=mutated.cases.filter(c=>c.caseId!=='RATIO_VALID_DIFFERENT_SCALE');
  const result=validator.evaluateCasebook(mutated,ctx);
  assert.equal(result.checksPassed,false);
  assert.ok(result.suiteErrors.some(x=>x.startsWith('METHOD_CASE_COVERAGE_INCOMPLETE:ratio.relationship.')));
});
test('no code path in this new script accesses the audit writer or production API',()=>{
  const source=fs.readFileSync(path.join(root,'scripts/phase4e2b8c2d1-quality-casebook.cjs'),'utf8');
  assert.doesNotMatch(source,/fetch\s*\(|https?:\/\/|\.rpc\s*\(|\.insert\s*\(|\.update\s*\(|process\.env\.|math_specialist_structure_review_record/);
});
