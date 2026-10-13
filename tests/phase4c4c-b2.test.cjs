'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {createPhase4BMethodLibraryContractView,createPhase4CStrategySelectorContractView}=require('../build/math-intelligence/teaching/contract/consumer/boundary.js');
const {selectFromPhase4A4B}=require('../build/math/teaching/strategy-selection/phase4C4Adapter.js');
const {validateReviewedStructureEvidence,REVIEWED_STRUCTURE_EVIDENCE_VERSION}=require('../build/math/teaching/strategy-selection/reviewedStructureEvidence.js');
const {runB2PairedEvaluation}=require('../build/math/teaching/strategy-selection/qa/runPhase4C4CB2Evaluation.js');
const prompt='A shop has 90 toys and sells 28. How many toys are left?';
function fixture(){
 const contract={schemaVersion:'4A-3.1',readyForMethodSelection:true,
 identity:{questionId:'b2-fixture-shop',questionCode:'FIXTURE-ONLY',questionFingerprint:null,sourceType:'quiz',sourceTable:null,quizId:null,quizCode:null,quizTitle:null},
 curriculum:{subject:'math',learnerLevel:1,topic:{id:null,name:null},primarySkill:null,secondarySkills:[],legacySkillLabel:null,skillTags:[],difficulty:null},
 content:{instruction:null,prompt,questionType:'mcq',options:[],parts:[]},
 mathematics:{domain:'whole_numbers',problemStructure:'subtraction_change',quantities:[],relationships:[],requiredReasoning:['subtraction'],constraints:[],units:[],target:{kind:'value'}},
 visual:{hasVisual:false,role:'none',dependency:'not_required',manipulability:'none',sourceMedia:[],generatedV2:null},
 multipart:{hasParts:false,parts:[],dependencies:[]},
 internalValidation:{audience:'internal_only',answer:{},answerValidation:{}},
 provenance:{canonicalSchemaVersion:'4A-1.1',understandingSchemaVersion:'4A-2.4',understandingStatus:'ready',curriculumSource:'question',resolution:{},confidenceBreakdown:{},confidence:1}};
 const result={status:'ready',schemaVersion:'4A-3.1',questionId:contract.identity.questionId,contract};
 const b=createPhase4BMethodLibraryContractView(result),c=createPhase4CStrategySelectorContractView(result);
 assert.equal(b.status,'ready',JSON.stringify(b.blockers));assert.equal(c.status,'ready',JSON.stringify(c.blockers));
 return {methodLibraryEnvelope:b.envelope,strategyEnvelope:c.envelope};
}
const goodReview=(input=fixture())=>({schemaVersion:REVIEWED_STRUCTURE_EVIDENCE_VERSION,
 questionId:input.strategyEnvelope.questionId,selectorEnvelopeFingerprint:input.strategyEnvelope.payloadFingerprint,
 reviewId:'TEST_REVIEW_ONLY_001',reviewerId:'TEST_FIXTURE',approvalRef:'TEST_APPROVAL_NOT_PRODUCTION',approvalStatus:'approved',
 scope:'question_structure_only',independentlyChecked:true,
 sourceAnchor:'90 toys and sells 28',relation:'change_known_initial_and_change_final_unknown',curriculumReview:'not_reviewed',
 methodJudgements:[
 {methodId:'model.change.find_change',structuralFit:'incompatible',promptAnchor:'How many toys are left?',rationale:'The change is supplied, and the final quantity is requested.',sourceKind:'question_prompt'},
 {methodId:'model.change.forward_change',structuralFit:'compatible',promptAnchor:'sells 28',rationale:'An initial quantity and subtraction amount are given.',sourceKind:'question_prompt'}]});
const allCandidates=x=>x.familySelections.flatMap(f=>f.candidates);
test('B2 version fixed and baseline remains bytewise unchanged with no reviewer evidence',()=>{
 const input=fixture(),a=selectFromPhase4A4B(input),b=selectFromPhase4A4B({...input});assert.deepEqual(a,b);
 assert.equal(a.b2EvidenceTrace,undefined);
 assert.equal(a.status,'ambiguous');
});
test('approved reviewed structure can downscore mismatch without awarding bonus to fit',()=>{
 const input=fixture(),base=selectFromPhase4A4B(input),review=goodReview(input);
 const v=validateReviewedStructureEvidence(review,input.strategyEnvelope,allCandidates(base).map(x=>x.methodId));
 assert.equal(v.valid,true,JSON.stringify(v.issues));
 const after=selectFromPhase4A4B({...input,reviewedMathEvidence:review});
 assert.equal(after.status,'selected',JSON.stringify(after.reasonCodes));
 assert.equal(after.selection.primaryMethodId,'model.change.forward_change');
 assert.equal(base.status,'ambiguous');
 const old=allCandidates(base),next=allCandidates(after);
 const oldBy=new Map(old.map(x=>[x.methodId,x]));
 for(const x of next){const y=oldBy.get(x.methodId);assert.ok(y);
 if(x.methodId==='model.change.find_change'){
  assert.equal(x.score,y.score-35);assert.ok(x.penalties.some(p=>p.code==='B2_REVIEWED_STRUCTURE_MISMATCH'));
 }else assert.equal(x.score,y.score,'Review must never inflate candidate score');}
 assert.deepEqual(after.b2EvidenceTrace.suppressedStructureMethods,['model.change.find_change']);
 assert.deepEqual(after.b2EvidenceTrace.affirmedStructureMethods,['model.change.forward_change']);
 assert.equal(after.b2EvidenceTrace.diagramAccuracy,'not_evaluated');
 assert.equal(after.b2EvidenceTrace.answerCorrectness,'not_evaluated');
});
test('repeat selection is deterministic with reviewed evidence',()=>{
 const input=fixture(),review=goodReview(input);
 assert.deepEqual(selectFromPhase4A4B({...input,reviewedMathEvidence:review}),selectFromPhase4A4B({...input,reviewedMathEvidence:review}));
});
test('no proof of mastery or prerequisite bonus is invented by reviewed structure',()=>{
 const input=fixture(),x=selectFromPhase4A4B({...input,reviewedMathEvidence:goodReview(input)});
 for(const c of allCandidates(x)){
  assert.equal(c.dimensionScores.find(d=>d.dimension==='prerequisites')?.points,0);
  assert.ok(c.explanationCodes.includes('LEARNER_PREREQUISITES_UNVERIFIED'));
 }
});
test('question mismatch and forged fingerprint fail closed',()=>{
 const input=fixture();for(const update of [{questionId:'other'},{selectorEnvelopeFingerprint:'fnv1a32:11111111'}]){
  const x=selectFromPhase4A4B({...input,reviewedMathEvidence:{...goodReview(input),...update}});
  assert.equal(x.status,'blocked');assert.ok(x.reasonCodes[0].includes('INVALID_REVIEWED_STRUCTURE_EVIDENCE'));
 }
});
test('reviewer provenance and approval must be present; proposed B1 flags not approved',()=>{
 const input=fixture();for(const update of [{approvalStatus:'proposed'},{approvalRef:''},{reviewerId:''},{independentlyChecked:false}]){
  const x=selectFromPhase4A4B({...input,reviewedMathEvidence:{...goodReview(input),...update}});
  assert.equal(x.status,'blocked');
 }
});
test('bank explanation source or ungrounded keyword/diagram assertion is rejected',()=>{
 const input=fixture(),a=goodReview(input);
 for(const m of [{...a.methodJudgements[0],sourceKind:'bank_explanation'},
  {...a.methodJudgements[0],sourceKind:'verified_diagram'},
  {...a.methodJudgements[0],promptAnchor:'inferred from answer key'}]){
  const x=selectFromPhase4A4B({...input,reviewedMathEvidence:{...a,methodJudgements:[m,a.methodJudgements[1]]}});
  assert.equal(x.status,'blocked');}
});
test('duplicate and nonexistent method judgements fail closed',()=>{
 const input=fixture(),a=goodReview(input);
 for(const m of [a.methodJudgements[0],{...a.methodJudgements[0],methodId:'fake.not_in_registry'}]){
  const x=selectFromPhase4A4B({...input,reviewedMathEvidence:{...a,methodJudgements:[...a.methodJudgements,m]}});
  assert.equal(x.status,'blocked');}
});
test('curriculum review is separate: enrichment does not alter scores, eligibility or family choice',()=>{
 const input=fixture(),a=goodReview(input),x=selectFromPhase4A4B({...input,reviewedMathEvidence:{...a,curriculumReview:'enrichment'}});
 const y=selectFromPhase4A4B({...input,reviewedMathEvidence:a});
 assert.deepEqual(x.selection,y.selection);assert.equal(x.b2EvidenceTrace.curriculumReview,'enrichment');
});
test('invalid B2 relationship and unsupported scope are rejected',()=>{
 const input=fixture(),a=goodReview(input);
 for(const update of [{relation:'freeform_bonus'},{scope:'image_scoring'}, {sourceAnchor:'The model says so'}]){
  assert.equal(selectFromPhase4A4B({...input,reviewedMathEvidence:{...a,...update}}).status,'blocked');}
});
test('empty evaluation is NOT described as an unseen holdout or as a passing 480 QA run',()=>{
 const x=runB2PairedEvaluation({sample:{seed:'phase-2i-v1',items:[]},results:[]});
 assert.equal(x.totals.total,0);assert.equal(x.evaluationClass,'unseen_status_not_established');
 assert.equal(x.checks.accounting,true);assert.equal(x.totals.reviewApplied,0);
});
test('paired evaluator rejects malformed reviewer sets and duplicate approvals',()=>{
 assert.throws(()=>runB2PairedEvaluation({sample:{seed:'test',items:[]},results:[]},{schemaVersion:'bad',reviews:[]}));
 const review=goodReview();
 assert.throws(()=>runB2PairedEvaluation({sample:{seed:'test',items:[]},results:[]},{schemaVersion:'4C-4C-B2.REVIEWS.1',reviews:[review,review]}));
 assert.throws(()=>runB2PairedEvaluation({sample:{seed:'test',items:[]},results:[]},{schemaVersion:'4C-4C-B2.REVIEWS.1',reviews:[review]}));
});
