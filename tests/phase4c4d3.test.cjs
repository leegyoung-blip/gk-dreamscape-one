"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { decideStudentTeachingRelease: check, publicMethodSummary: shape, RELEASE_POLICY_VERSION } =
  require("../lib/math/teaching/student-serving/phase4D3ReleasePolicy.server.cjs");

const choice = {status:"selected",primaryFamilies:["model.change"],selection:{status:"selected",primaryMethodId:"part_whole",confidence:"low"}};
const ready = Object.freeze({ authenticated:true,attemptOwnedByUser:true,
  learningAccessAllowed:true,subject:"math",questionInAttempt:true,quizMatchesAttempt:true,
  published:true,manualReviewPending:false,feedbackMode:"immediate",
  attemptStatus:"in_progress",answerLocked:true,feedbackReleaseConfirmed:true });
function fail(input,code) { const result=check(input); assert.equal(result.allowed,false); assert.equal(result.reason,code); }

test("valid immediate locked and verified feedback allows release",()=>{
  assert.equal(check(ready).allowed,true); assert.equal(check(ready).policyVersion,RELEASE_POLICY_VERSION);
});
test("valid submitted end-of-quiz result allows release",()=>{
  assert.equal(check({...ready,feedbackMode:"end_of_quiz",attemptStatus:"marked",answerLocked:false}).allowed,true);
});
test("valid submitted immediate mode without locked flag still requires released feedback",()=>{
  assert.equal(check({...ready,attemptStatus:"submitted",answerLocked:false}).allowed,true);
});
test("missing record blocked",()=>fail(undefined,"NOT_VERIFIED"));
test("unsigned session blocked",()=>fail({...ready,authenticated:false},"NOT_AUTHORIZED"));
test("wrong attempt owner blocked",()=>fail({...ready,attemptOwnedByUser:false},"NOT_AUTHORIZED"));
test("access required",()=>fail({...ready,learningAccessAllowed:false},"NOT_AUTHORIZED"));
test("math only",()=>fail({...ready,subject:"english"},"WRONG_SUBJECT"));
test("question ownership required",()=>fail({...ready,questionInAttempt:false},"IDENTITY_NOT_VERIFIED"));
test("quiz identity required",()=>fail({...ready,quizMatchesAttempt:false},"IDENTITY_NOT_VERIFIED"));
test("published quiz required",()=>fail({...ready,published:false},"NOT_PUBLISHED"));
test("unknown manual review state fails closed",()=>fail({...ready,manualReviewPending:undefined},"MANUAL_REVIEW_PENDING"));
test("pending manual review blocked",()=>fail({...ready,manualReviewPending:true},"MANUAL_REVIEW_PENDING"));
test("none mode blocks even after submission",()=>fail({...ready,feedbackMode:"none",attemptStatus:"marked"},"FEEDBACK_DISABLED"));
test("unsupported feedback mode blocked",()=>fail({...ready,feedbackMode:"custom"},"INVALID_FEEDBACK_MODE"));
test("unlocked immediate answer blocked",()=>fail({...ready,answerLocked:false},"RESPONSE_NOT_LOCKED"));
test("immediate feedback not released blocked",()=>fail({...ready,feedbackReleaseConfirmed:false},"FEEDBACK_NOT_RELEASED"));
test("unsubmitted end-of-quiz blocked",()=>fail({...ready,feedbackMode:"end_of_quiz"},"SUBMISSION_NOT_CONFIRMED"));
test("submitted but unreleased end-of-quiz blocked",()=>fail({...ready,feedbackMode:"end_of_quiz",attemptStatus:"submitted",feedbackReleaseConfirmed:false},"FEEDBACK_NOT_RELEASED"));
test("client props such as stage do not grant release",()=>fail({...ready,answerLocked:false,stage:"results",clientFeedback:{locked:true}},"RESPONSE_NOT_LOCKED"));
test("unknown policy booleans do not grant release",()=>fail({...ready,authenticated:"true"},"NOT_AUTHORIZED"));
test("summaries unavailable without policy permit",()=>{
  assert.deepEqual(shape(check({...ready,answerLocked:false}),choice),{status:"unavailable"});
});
test("selected summaries whitelist fields, including rejecting raw answers",()=>{
  const result=shape(check(ready),{...choice,answerKey:"42",rawContract:{secret:true},lessonSteps:["secret"]});
  assert.deepEqual(result,{status:"selected",methodId:"part_whole",familyId:"model.change",confidence:"low"});
  assert.equal(Object.isFrozen(result),true);
});
test("unvalidated method ids and arbitrary scores not echoed",()=>{
  assert.deepEqual(shape(check(ready),{...choice,selection:{...choice.selection,primaryMethodId:"<script>"}}),{status:"unavailable"});
  assert.deepEqual(shape(check(ready),{...choice,primaryFamilies:["ok"],selection:{status:"selected",primaryMethodId:"safe",confidence:99}}),{status:"selected",methodId:"safe",familyId:"ok"});
});
test("forged permit is rejected",()=>{
  assert.deepEqual(shape({allowed:true,policyVersion:RELEASE_POLICY_VERSION},choice),{status:"unavailable"});
});
test("selected result must carry native 4C adapter shape",()=>{
  assert.deepEqual(shape(check(ready),{status:"selected",methodId:"forged",familyId:"forged"}),{status:"unavailable"});
  assert.deepEqual(shape(check(ready),{...choice,primaryFamilies:["a","b"]}),{status:"unavailable"});
});
test("ambiguous summary reveals no candidates",()=>{
  assert.deepEqual(shape(check(ready),{status:"ambiguous",candidates:[{methodId:"secret"}]}),{status:"ambiguous"});
});
test("collector avoids secret, binary and SQL contents",()=>{
  const text=fs.readFileSync(path.join(__dirname,"../scripts/package-math-4c4d4-teaching-source.ps1"),"utf8");
  assert.match(text,/CoreTeachingEngine\.tsx/);
  assert.match(text,/LiteralPath/);
  assert.match(text,/Compress-Archive/);
  assert.doesNotMatch(text,/\.env\.local|service_role_key|Get-Content.*\.sql/i);
});
