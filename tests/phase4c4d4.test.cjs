'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {createPhase4D4MethodService,VERSION} = require('../lib/math/teaching/student-serving/phase4D4MethodService.server.cjs');
const request=()=>({quizId:'quiz_1',attemptId:'attempt_1',questionId:'question_1'});
const context=()=>({
 principal:{userId:'user_1',authenticated:true,learningAccessAllowed:true},
 attempt:{id:'attempt_1',quizId:'quiz_1',ownerUserId:'user_1',status:'in_progress'},
 quiz:{id:'quiz_1',subject:'math',published:true,feedbackMode:'immediate'},
 question:{id:'question_1',quizId:'quiz_1'},
 grading:{attemptId:'attempt_1',questionId:'question_1',manualReviewPending:false,answerLocked:true,feedbackReleaseConfirmed:true},
 contractBuildResult:{status:'ready',questionId:'question_1'},
});
function dependencies(update,overrides={}){
 let calls={resolver:0,envelopes:0,selector:0};
 let trusted=context(); update?.(trusted);
 const makeConsumerEnvelopes=(build)=>{
  calls.envelopes++;
  return {methodLibraryEnvelope:{questionId:build.questionId},strategyEnvelope:{questionId:build.questionId},
   reviewedMathEvidence:{injected:true}};
 };
 const selectFromPhase4A4B=(source)=>{
  calls.selector++;
  assert.deepEqual(Object.keys(source).sort(),['methodLibraryEnvelope','strategyEnvelope']);
  return {status:'selected',primaryFamilies:['number.place_value'],selection:{status:'selected',primaryMethodId:'place_value_01',confidence:'low'},
    internalAnswerKey:'DO_NOT_RETURN',scores:[100]};
 };
 return {calls,svc:createPhase4D4MethodService({resolveTrustedContext:async q=>{
  calls.resolver++;
  assert.deepEqual(Object.keys(q).sort(),['attemptId','questionId','quizId']);
  return trusted;
 }, makeConsumerEnvelopes,selectFromPhase4A4B,...overrides})};
}
test('4D4 version and valid disabled-gateway path return only method summary',async()=>{
 const {svc,calls}=dependencies(); assert.equal(svc.version,VERSION);
 assert.deepEqual(await svc.getPublicMethod(request()),{status:'selected',methodId:'place_value_01',familyId:'number.place_value',confidence:'low'});
 assert.equal(calls.resolver,1);assert.equal(calls.envelopes,1);assert.equal(calls.selector,1);
});
test('forwards ONLY three query IDs, ignores attacker-supplied release proofs and approvals',async()=>{
 const {svc}=dependencies();
 const result=await svc.getPublicMethod({...request(),role:'admin',mode:'enabled',approvalPackage:{},
  facts:{feedbackReleaseConfirmed:true},reviewedMathEvidence:{}});
 assert.equal(result.status,'selected');
});
test('forbidden client supplied data cannot override DB denial',async()=>{
 const {svc,calls}=dependencies(c=>c.grading.feedbackReleaseConfirmed=false);
 const answer=await svc.getPublicMethod({...request(),feedbackReleaseConfirmed:true,locked:true});
 assert.deepEqual(answer,{status:'unavailable'}); assert.equal(calls.selector,0);
});
const denyCases=[
 ['anonymous',ctx=>ctx.principal.authenticated=false],
 ['missing learning entitlement',ctx=>ctx.principal.learningAccessAllowed=false],
 ['wrong attempt owner',ctx=>ctx.attempt.ownerUserId='user_2'],
 ['wrong attempt',ctx=>ctx.attempt.id='attempt_2'],
 ['wrong attempt quiz',ctx=>ctx.attempt.quizId='quiz_2'],
 ['wrong quiz',ctx=>ctx.quiz.id='quiz_2'],
 ['wrong question',ctx=>ctx.question.id='question_2'],
 ['question belongs to another quiz',ctx=>ctx.question.quizId='quiz_2'],
 ['feedback from another attempt',ctx=>ctx.grading.attemptId='attempt_2'],
 ['feedback from another question',ctx=>ctx.grading.questionId='question_2'],
 ['English must not receive math selector',ctx=>ctx.quiz.subject='english'],
 ['unpublished quiz',ctx=>ctx.quiz.published=false],
 ['manual review pending',ctx=>ctx.grading.manualReviewPending=true],
 ['feedback mode none',ctx=>ctx.quiz.feedbackMode='none'],
 ['unknown feedback mode',ctx=>ctx.quiz.feedbackMode='invalid'],
 ['answer still editable',ctx=>ctx.grading.answerLocked=false],
 ['feedback not released',ctx=>ctx.grading.feedbackReleaseConfirmed=false],
 ['quiz submission not confirmed',ctx=>ctx.quiz.feedbackMode='end_of_quiz'],
 ['missing contract',ctx=>ctx.contractBuildResult=null],
 ['blocked contract',ctx=>ctx.contractBuildResult.status='blocked'],
 ['contract for different question',ctx=>ctx.contractBuildResult.questionId='question_2'],
];
for(const [name,update] of denyCases){
 test('fail closed: '+name,async()=>{
  const {svc,calls}=dependencies(update);
  assert.deepEqual(await svc.getPublicMethod(request()),{status:'unavailable'});
  assert.equal(calls.selector,0);
 });
}
test('cross-quiz contract binding rejected',async()=>{
 const {svc,calls}=dependencies(c=>c.contractBuildResult.contract={identity:{quizId:'quiz_2'}});
 assert.deepEqual(await svc.getPublicMethod(request()),{status:'unavailable'});assert.equal(calls.selector,0);
});
test('end-of-quiz requires submitted attempt and released feedback',async()=>{
 const {svc}=dependencies(c=>{c.quiz.feedbackMode='end_of_quiz';c.attempt.status='submitted';c.grading.answerLocked=false;});
 assert.equal((await svc.getPublicMethod(request())).status,'selected');
});
test('invalid/overlong request ID fails before resolver',async()=>{
 const {svc,calls}=dependencies();
 for(const q of [{},null,{...request(),quizId:'x/../x'},{...request(),questionId:'x'.repeat(130)}]) {
  assert.deepEqual(await svc.getPublicMethod(q),{status:'unavailable'});
 }
 assert.equal(calls.resolver,0);
});
test('resolver, contract projection and selector exceptions all fail closed',async()=>{
 for(const key of ['resolveTrustedContext','makeConsumerEnvelopes','selectFromPhase4A4B']){
  const {svc}=dependencies(null,{[key]:()=>{throw new Error('private db error');}});
  assert.deepEqual(await svc.getPublicMethod(request()),{status:'unavailable'});
 }
});
test('ambiguous selector has no method details',async()=>{
 const {svc}=dependencies(null,{selectFromPhase4A4B:()=>({status:'ambiguous',candidates:[{answer:'secret'}]})});
 assert.deepEqual(await svc.getPublicMethod(request()),{status:'ambiguous'});
});
test('blocked selector has no method details',async()=>{
 const {svc}=dependencies(null,{selectFromPhase4A4B:()=>({status:'blocked',reasonCodes:['private']})});
 assert.deepEqual(await svc.getPublicMethod(request()),{status:'unavailable'});
});
test('wrong envelope/question bindings are rejected before selector',async()=>{
 const {svc,calls}=dependencies(null,{makeConsumerEnvelopes:()=>({methodLibraryEnvelope:{questionId:'wrong'},strategyEnvelope:{questionId:'question_1'}})});
 assert.deepEqual(await svc.getPublicMethod(request()),{status:'unavailable'});assert.equal(calls.selector,0);
});
test('server dependency injection mandatory',()=>{
 for(const x of [undefined,{}, {resolveTrustedContext:()=>{}}, {resolveTrustedContext:()=>{},makeConsumerEnvelopes:()=>{}}])
 assert.throws(()=>createPhase4D4MethodService(x),/4D4_SERVER_DEPENDENCIES_REQUIRED/);
});
test('B4 remains disabled even when someone adds a signed approval to trusted context',async()=>{
 const {svc}=dependencies(c=>{c.approvalPackage={mode:'enabled',attestations:[]};c.mode='enabled';});
 assert.equal((await svc.getPublicMethod(request())).status,'selected');
});
test('source files never create an HTTP route or modify quiz components',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const file=fs.readFileSync(path.resolve(__dirname,'../lib/math/teaching/student-serving/phase4D4MethodService.server.cjs'),'utf8');
 assert.match(file,/mode:'disabled'/);
 assert.doesNotMatch(file,/\bapp\/api\/|NextResponse|res\.json|router\./);
});
