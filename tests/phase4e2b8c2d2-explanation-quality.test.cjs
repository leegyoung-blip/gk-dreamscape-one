'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const validator=require('../scripts/phase4e2b8c2d2-explanation-quality.cjs');
const {book,source,drafts}=validator.load();
const clone=x=>JSON.parse(JSON.stringify(x));
const sample=id=>clone(book.exemplars.find(x=>x.caseId===id));
const src=id=>source.cases.find(x=>x.caseId===id);
const method=x=>drafts.find(d=>d.methodId===x.methodId);
const check=x=>validator.validateExplanation(x,src(x.caseId),method(x));
const rejects=(name,id,mutate,code)=>test(name,()=>{const x=sample(id);mutate(x);const r=check(x);assert.equal(r.pass,false);if(code)assert.ok(r.issues.some(v=>v.startsWith(code)),JSON.stringify(r));});
test('six authentic synthetic 8C2D1 positive fixtures covered exactly once',()=>{
  const ids=source.cases.filter(x=>x.expected.status==='compatible_for_review').map(x=>x.caseId).sort();
  assert.deepEqual(book.exemplars.map(x=>x.caseId).sort(),ids);
});
test('all six authored reference explanations pass machine-checkable gates, never approvals',()=>{
  const r=validator.evaluate(book,source,drafts);
  assert.equal(r.checksPassed,true);assert.equal(r.count,6);assert.equal(r.passed,6);
  assert.equal(r.independentEducatorReview,'pending');assert.equal(r.liveTeachingOutputTested,false);
  assert.equal(r.approvalGranted,false);assert.equal(r.learnerReleaseAllowed,false);assert.equal(r.betaReady,false);
});
test('six rubric dimensions retained',()=>assert.deepEqual(validator.RUBRIC,[
  'mathematical_correctness','conceptual_explanation','representation_clarity',
  'step_progression','misconception_response','learner_accessibility']));
test('source fixture and reference book must be offline synthetic',()=>{
  assert.equal(book.notApproval,true);assert.equal(book.liveGenerationTested,false);
  for(const x of book.exemplars){assert.equal(x.sourceKind,'synthetic_offline_example');assert.equal(x.humanReview,'pending');}
});
test('all three specialist methods remain draft with no authored curriculum points',()=>{
  for(const x of drafts){assert.equal(x.status,'draft');assert.deepEqual(Array.from(x.applicability.curriculumSkills),[]);}
});
test('negative fixtures are not worked examples',()=>{
  for(const x of source.cases.filter(c=>c.expected.status!=='compatible_for_review')){
    const output=clone(book.exemplars[0]);output.caseId=x.caseId;
    assert.ok(validator.validateExplanation(output,x,method(output)).issues.includes('UNSUPPORTED_OR_EXCLUDED_CASE'));
  }
});
for(const x of book.exemplars)test(`${x.caseId}: ordered steps and verified answer`,()=>{
  assert.equal(check(clone(x)).pass,true);assert.deepEqual(x.steps.map(s=>s.stageId),Array.from(method(x).pedagogy.teachingSequence,s=>s.stageId));
});
rejects('wrong interval count cannot pass','SPACING_VALID_MAIN',x=>x.steps[1].calculation.result=9,'INVALID_CALCULATION');
rejects('correct arithmetic but wrong gap operand blocked','SPACING_VALID_MAIN',x=>{x.steps[1].calculation={operation:'subtract',left:13,right:5,result:8}},'SPACING_GAPS');
rejects('counting positions instead of gaps blocked','SPACING_VALID_MAIN',x=>{x.steps[2].calculation={operation:'multiply',left:9,right:6,result:54}},'SPACING_GAPS');
rejects('wrong numerical answer rejected','SPACING_VALID_MAIN',x=>x.answer.value=54,'WRONG_FINAL_ANSWER');
rejects('wrong distance unit rejected','SPACING_VALID_ADJACENT',x=>x.answer.unit='cm','SPACING_LABEL');
rejects('missing interval visual label rejected','SPACING_VALID_ADJACENT',x=>x.representation.labels[2]='two markers','SPACING_LABEL');
rejects('half of wrong reference cannot pass linked ratios','CHAIN_VALID_HALF',x=>x.worked.amounts.chen=6,'COMPARISON_REFERENCE');
rejects('wrong shared unit rejected','CHAIN_VALID_HALF',x=>x.worked.oneUnit=12,'COMPARISON_REFERENCE');
rejects('incorrect half-case target multiplication rejected','CHAIN_VALID_HALF',x=>x.steps[3].calculation.result=36,'INVALID_CALCULATION');
rejects('incorrect number of common parts rejected','CHAIN_VALID_SHARED_BASE',x=>x.worked.totalUnits=7,'COMPARISON_REFERENCE');
rejects('wrong named bar label rejected','CHAIN_VALID_SHARED_BASE',x=>x.representation.labels=x.representation.labels.filter(v=>!v.startsWith('Chen:')),'COMPARISON_BAR_LABEL');
rejects('wrong target person rejected','CHAIN_VALID_SHARED_BASE',x=>x.answer.quantity='bella','COMPARISON_TARGET');
rejects('altered chain total rejected','CHAIN_VALID_HALF',x=>x.worked.combinedTotal=67,'COMPARISON_REFERENCE');
rejects('invented invariant between states blocked','RATIO_VALID_MAIN',x=>x.worked.after[0]=9,'RATIO_STATE');
rejects('same after and before unit without evidence blocked','RATIO_VALID_MAIN',x=>x.worked.afterUnit=3,'RATIO_STATE');
rejects('wrong stated change blocked','RATIO_VALID_DIFFERENT_SCALE',x=>x.worked.changes[1]=15,'RATIO_STATE');
rejects('wrong ratio before ordering blocked','RATIO_VALID_DIFFERENT_SCALE',x=>x.steps[3].calculation.beforeRatio=[3,2],'RATIO_EXPLANATION');
rejects('correct abstract equation but wrong source changes blocked','RATIO_VALID_MAIN',x=>{x.steps[3].calculation={operation:'solve_ratio_scale',beforeRatio:[3,2],afterRatio:[1,2],changes:[8,24],result:2}},'RATIO_EXPLANATION');
rejects('incorrect ratio check state blocked','RATIO_VALID_MAIN',x=>x.steps[4].calculation.after[1]=32,'RATIO_EXPLANATION');
rejects('fictional sign-off status forbidden','RATIO_VALID_MAIN',x=>x.humanReview='approved','INVALID_PROVENANCE');
rejects('injected approval property rejected','RATIO_VALID_MAIN',x=>x.approved=true,'UNSAFE_OR_APPROVAL');
rejects('injected answer_data property rejected','CHAIN_VALID_HALF',x=>x.answer_data={secret:1},'UNSAFE_OR_APPROVAL');
rejects('invented production question ID forbidden','SPACING_VALID_MAIN',x=>x.questionId='fake','UNSAFE_OR_APPROVAL');
rejects('removed misconception correction blocked','CHAIN_VALID_HALF',x=>x.misconception.correction='','MISCONCEPTION');
rejects('wrong misconception key blocked','CHAIN_VALID_HALF',x=>x.misconception.id='unrelated','MISCONCEPTION');
rejects('stage order changed blocked','CHAIN_VALID_HALF',x=>x.steps.reverse(),'TEACHING_STAGE');
rejects('missing stage prose blocked','CHAIN_VALID_HALF',x=>x.steps[0].learnerExplanation='','TEACHING_STAGE');
rejects('unsupported diagram type blocked','SPACING_VALID_MAIN',x=>x.representation.type='pie_chart','REPRESENTATION');
rejects('no representation description blocked','SPACING_VALID_MAIN',x=>x.representation.description='','REPRESENTATION');
rejects('pretend human comparative judgment blocked','RATIO_VALID_MAIN',x=>x.comparison.humanJudgment='approved','HUMAN_COMPARISON');
rejects('pretend production method winner blocked','RATIO_VALID_MAIN',x=>x.comparison.suggestedRole='primary','HUMAN_COMPARISON');
rejects('changed method to production family blocked','CHAIN_VALID_HALF',x=>x.methodId='heuristic.multi_step','MISMATCHED_METHOD');
rejects('missing provenance tag blocked','CHAIN_VALID_HALF',x=>x.authoringClaim='live_output','INVALID_PROVENANCE');
test('removing an exemplar fails whole-book coverage',()=>{
 const altered=clone(book);altered.exemplars.pop();
 assert.equal(validator.evaluate(altered,source,drafts).checksPassed,false);
 assert.ok(validator.evaluate(altered,source,drafts).errors.includes('EXPLANATION_CASE_COVERAGE_INCOMPLETE'));
});
test('duplicate exemplar fails whole-book coverage',()=>{
 const altered=clone(book);altered.exemplars[1]=clone(altered.exemplars[0]);
 const r=validator.evaluate(altered,source,drafts);assert.equal(r.checksPassed,false);
 assert.ok(r.rows.some(x=>x.issues.includes('DUPLICATE_EXEMPLAR')));
});
test('invented production source metadata fails whole-book gate',()=>{
 const altered=clone(book);altered.notApproval=false;
 assert.equal(validator.evaluate(altered,source,drafts).checksPassed,false);
});
