'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {generateKeyPairSync,sign}=require('node:crypto');
const gateway=require('../lib/math/teaching/strategy-selection/approval/b4ApprovalGateway.server.cjs');
const {createPhase4BMethodLibraryContractView,createPhase4CStrategySelectorContractView}=require('../build/math-intelligence/teaching/contract/consumer/boundary.js');
const {selectFromPhase4A4B}=require('../build/math/teaching/strategy-selection/phase4C4Adapter.js');
const basePath=path.resolve(__dirname,'../qa-artifacts/phase4c4c-b3/phase-4c4c-b3-review-register.json');
const prompt='A shop has 90 toys and sells 28. How many toys are left?';
function sourceFixture(){
 const contract={schemaVersion:'4A-3.1',readyForMethodSelection:true,
 identity:{questionId:'b4-fixture-shop',questionCode:'B4-TEST-ONLY',questionFingerprint:null,sourceType:'quiz',sourceTable:null,quizId:null,quizCode:null,quizTitle:null},
 curriculum:{subject:'math',learnerLevel:1,topic:{id:null,name:null},primarySkill:null,secondarySkills:[],legacySkillLabel:null,skillTags:[],difficulty:null},
 content:{instruction:null,prompt,questionType:'mcq',options:[],parts:[]},
 mathematics:{domain:'whole_numbers',problemStructure:'subtraction_change',quantities:[],relationships:[],requiredReasoning:['subtraction'],constraints:[],units:[],target:{kind:'value'}},
 visual:{hasVisual:false,role:'none',dependency:'not_required',manipulability:'none',sourceMedia:[],generatedV2:null},
 multipart:{hasParts:false,parts:[],dependencies:[]},
 internalValidation:{audience:'internal_only',answer:{},answerValidation:{}},
 provenance:{canonicalSchemaVersion:'4A-1.1',understandingSchemaVersion:'4A-2.4',understandingStatus:'ready',curriculumSource:'question',resolution:{},confidenceBreakdown:{},confidence:1}};
 const ready={status:'ready',schemaVersion:'4A-3.1',questionId:contract.identity.questionId,contract};
 const b=createPhase4BMethodLibraryContractView(ready),c=createPhase4CStrategySelectorContractView(ready);
 assert.equal(b.status,'ready');assert.equal(c.status,'ready');
 return {methodLibraryEnvelope:b.envelope,strategyEnvelope:c.envelope};
}
function reviewFor(source,changes={}){
 return {schemaVersion:'4C-4C-B2.1',questionId:source.strategyEnvelope.questionId,
 selectorEnvelopeFingerprint:source.strategyEnvelope.payloadFingerprint,reviewId:'B4_TEST_REVIEW_001',reviewerId:'p-teacher',
 approvalRef:'B4_TEST_SIGNED_APPROVAL',approvalStatus:'approved',scope:'question_structure_only',independentlyChecked:true,
 sourceAnchor:'90 toys and sells 28',relation:'change_known_initial_and_change_final_unknown',curriculumReview:'not_reviewed',
 methodJudgements:[
 {methodId:'model.change.find_change',structuralFit:'incompatible',promptAnchor:'How many toys are left?',rationale:'The change is known and the final quantity is sought.',sourceKind:'question_prompt'},
 {methodId:'model.change.forward_change',structuralFit:'compatible',promptAnchor:'sells 28',rationale:'Known initial amount and known decrease imply the final state.',sourceKind:'question_prompt'}],...changes};
}
function authorities(){
 const names=[['reviewer','p-teacher',['math_reviewer']],['approver','p-admin',['approval_authority']],['curriculum','p-curriculum',['curriculum_lead']]];
 const secrets={};const keys=[];
 for(const [id,principalId,roles] of names){
   const pair=generateKeyPairSync('ed25519'); secrets[id]=pair.privateKey;
   keys.push({signerId:id,principalId,roles,publicKeyPem:pair.publicKey.export({type:'spki',format:'pem'}),active:true});
 }
 return {secrets,keys};
}
function signed(review, auth,extra=[]){
 const digest=gateway.reviewDigest(review);
 const attestations=['math_reviewer','approval_authority',...extra].map((role)=>{
  const signerId={math_reviewer:'reviewer',approval_authority:'approver',curriculum_lead:'curriculum'}[role];
  const signatureBase64=sign(null,Buffer.from(gateway.attestationMessage(role,signerId,digest),'utf8'),auth.secrets[signerId]).toString('base64');
  return {role,signerId,signatureBase64};
 });
 return {schemaVersion:gateway.APPROVAL_SCHEMA,review,attestations};
}
const call=(source,config,approvalPackage=null)=>gateway.selectWithB4Approval({source,selectFromPhase4A4B,config,approvalPackage});
test('B4 default disabled keeps old 4C selected/ambiguous output byte-for-byte',()=>{
 const source=sourceFixture(),baseline=selectFromPhase4A4B(source),auth=authorities();
 const output=call(source,{trustedKeys:auth.keys},signed(reviewFor(source),auth));
 assert.equal(output.status,'baseline');assert.deepEqual(output.result,baseline);assert.equal(output.result.b2EvidenceTrace,undefined);
});
test('enabled mode without approved package produces baseline without fabricated review',()=>{
 const source=sourceFixture(),out=call(source,{mode:'enabled',trustedKeys:[]});
 assert.equal(out.status,'baseline');assert.deepEqual(out.result,selectFromPhase4A4B(source));
});
test('B4 authenticated two-person text-only signoff may downscore method with no bonus',()=>{
 const source=sourceFixture(),auth=authorities();const out=call(source,{mode:'enabled',trustedKeys:auth.keys},signed(reviewFor(source),auth));
 assert.equal(out.status,'applied');assert.equal(out.result.status,'selected');
 assert.equal(out.result.selection.primaryMethodId,'model.change.forward_change');
 assert.deepEqual(out.trace.signerRoles,['approval_authority','math_reviewer']);
 assert.equal(out.trace.diagramAccuracy,'not_evaluated');
 assert.deepEqual(out.result.b2EvidenceTrace.suppressedStructureMethods,['model.change.find_change']);
});
test('dry-run shadows reviewed result but does not change production result',()=>{
 const source=sourceFixture(),auth=authorities();const out=call(source,{mode:'dry_run',trustedKeys:auth.keys},signed(reviewFor(source),auth));
 assert.equal(out.status,'dry_run');assert.equal(out.result.status,'ambiguous');assert.equal(out.shadowResult.status,'selected');
 assert.equal(out.trace.applied,false);
});
test('uncontrolled direct B2 review is rejected at B4 production gateway',()=>{
 const source=sourceFixture(),auth=authorities();
 const out=call({...source,reviewedMathEvidence:reviewFor(source)},{mode:'enabled',trustedKeys:auth.keys});
 assert.equal(out.status,'blocked');assert.deepEqual(out.reasonCodes,['B4_UNCONTROLLED_B2_REVIEW_INPUT']);
});
test('reject missing, swapped or duplicated signoffs',()=>{
 const source=sourceFixture(),auth=authorities(),a=signed(reviewFor(source),auth);
 for (const attestations of [[a.attestations[0]],[a.attestations[1],a.attestations[1]],
   [{...a.attestations[0],role:'approval_authority'},a.attestations[1]]]){
  const out=call(source,{mode:'enabled',trustedKeys:auth.keys},{...a,attestations});
  assert.equal(out.status,'blocked');
 }
});
test('tampering with any reviewed judgement or question binding invalidates approval',()=>{
 const source=sourceFixture(),auth=authorities(),a=signed(reviewFor(source),auth);
 for(const change of [{...a.review,methodJudgements:[{...a.review.methodJudgements[0],structuralFit:'compatible'},a.review.methodJudgements[1]]},
   {...a.review,questionId:'wrong-id'}, {...a.review,selectorEnvelopeFingerprint:'forged'}]){
   assert.equal(call(source,{mode:'enabled',trustedKeys:auth.keys},{...a,review:change}).status,'blocked');
 }
});
test('reject signer not in independently configured server trust registry',()=>{
 const source=sourceFixture(),auth=authorities(),a=signed(reviewFor(source),auth);
 assert.equal(call(source,{mode:'enabled',trustedKeys:auth.keys.slice(0,1)},a).status,'blocked');
 assert.equal(call(source,{mode:'enabled',trustedKeys:[{...auth.keys[0],active:false},...auth.keys.slice(1)]},a).status,'blocked');
});
test('independent principals required, even when two valid keys have distinct roles',()=>{
 const source=sourceFixture(),auth=authorities(),a=signed(reviewFor(source),auth);
 const keys=[auth.keys[0],{...auth.keys[1],principalId:auth.keys[0].principalId},auth.keys[2]];
 assert.deepEqual(call(source,{mode:'enabled',trustedKeys:keys},a).reasonCodes,['B4_UNTRUSTED_OR_NONINDEPENDENT_SIGNER']);
});
test('explicit revocation and allowlist prevent scoring even with valid signatures',()=>{
 const source=sourceFixture(),auth=authorities(),a=signed(reviewFor(source),auth),params={mode:'enabled',trustedKeys:auth.keys};
 assert.deepEqual(call(source,{...params,revokedReviewIds:[a.review.reviewId]},a).reasonCodes,['B4_REVIEW_REVOKED']);
 assert.deepEqual(call(source,{...params,revokedDigests:[gateway.reviewDigest(a.review)]},a).reasonCodes,['B4_REVIEW_REVOKED']);
 assert.deepEqual(call(source,{...params,allowReviewIds:['some-other-review']},a).reasonCodes,['B4_REVIEW_NOT_ALLOWLISTED']);
});
test('curriculum core or enrichment requires distinct curriculum-lead approval',()=>{
 const source=sourceFixture(),auth=authorities();
 for(const status of ['core','enrichment']){
  const review=reviewFor(source,{curriculumReview:status});
  assert.equal(call(source,{mode:'enabled',trustedKeys:auth.keys},signed(review,auth)).status,'blocked');
  const out=call(source,{mode:'enabled',trustedKeys:auth.keys},signed(review,auth,['curriculum_lead']));
  assert.equal(out.status,'applied');assert.equal(out.result.b2EvidenceTrace.curriculumReview,status);
 }
});
test('authenticated review cannot assert the contents of an uninspected diagram',()=>{
 const source=sourceFixture(),auth=authorities();
 // Non-mutating fixture test: create valid signed text review but a diagram contract.
 const diagramSource={...source,strategyEnvelope:{...source.strategyEnvelope,contract:{...source.strategyEnvelope.contract,visual:{...source.strategyEnvelope.contract.visual,hasVisual:true}}}};
 const review=reviewFor(diagramSource),out=call(diagramSource,{mode:'enabled',trustedKeys:auth.keys},signed(review,auth));
 assert.deepEqual(out.reasonCodes,['B4_DIAGRAM_VERIFICATION_REQUIRED']);
});
test('B2 validation still rejects independently signed but ungrounded question evidence',()=>{
 const source=sourceFixture(),auth=authorities();
 const review=reviewFor(source,{sourceAnchor:'not present in actual prompt'});
 const out=call(source,{mode:'enabled',trustedKeys:auth.keys},signed(review,auth));
 assert.equal(out.status,'blocked');assert.equal(out.reasonCodes[0],'B4_B2_EVIDENCE_VALIDATION_REJECTED');
});
test('signed review attribution must match trusted human principal',()=>{
 const source=sourceFixture(),auth=authorities(),review=reviewFor(source,{reviewerId:'someone-else'});
 const out=call(source,{mode:'enabled',trustedKeys:auth.keys},signed(review,auth));
 assert.deepEqual(out.reasonCodes,['B4_REVIEWER_IDENTITY_NOT_BOUND_TO_SIGNER']);
});
test('strict signature format and Ed25519 verification must pass',()=>{
 const source=sourceFixture(),auth=authorities(),a=signed(reviewFor(source),auth);
 const malformed={...a,attestations:[{...a.attestations[0],signatureBase64:'!!not-base64!!'},a.attestations[1]]};
 assert.equal(call(source,{mode:'enabled',trustedKeys:auth.keys},malformed).status,'blocked');
 const corrupted={...a,attestations:[{...a.attestations[0],signatureBase64:Buffer.alloc(64).toString('base64')},a.attestations[1]]};
 assert.deepEqual(call(source,{mode:'enabled',trustedKeys:auth.keys},corrupted).reasonCodes,['B4_SIGNATURE_VERIFICATION_FAILED']);
});
test('B3 source register has no actual teacher or curriculum approvals; never activate it',()=>{
 const register=JSON.parse(fs.readFileSync(basePath,'utf8'));
 assert.equal(register.stats.total480,480);assert.equal(register.stats.humanApproved,0);assert.equal(register.stats.approvedB2Records,0);
 assert.equal(register.rows.length,24);
 assert.ok(register.rows.every(x=>x.scoringAuthorized===false && x.methodFitStatus==='not_approved' && x.approvalRef===null));
});
test('B4 canonical digest invariant under object key order; no private keys are bundled',()=>{
 assert.equal(gateway.reviewDigest({a:1,b:2}),gateway.reviewDigest({b:2,a:1}));
 const here=path.resolve(__dirname,'../qa-artifacts/phase4c4c-b4');
 for(const file of fs.readdirSync(here))assert.ok(!/private[-_]?key|\.pem$/i.test(file));
});
test('real F4 report snapshots reconcile with all 24 B3 pending approvals',()=>{
 const {reconcileB4Readiness}=require('../lib/math/teaching/strategy-selection/qa/reconcileB4Readiness.cjs');
 const report=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../qa-artifacts/phase4c4c-b4/phase-4c4c-b4-readiness.json'),'utf8'));
 const b3=JSON.parse(fs.readFileSync(basePath,'utf8'));
 assert.equal(report.schemaVersion,'4C-4C-B4.READINESS.1');assert.equal(report.queue.length,b3.rows.length);
 assert.equal(report.totals.selected,84);assert.equal(report.totals.ambiguous,236);
 assert.equal(report.totals.authenticApprovedReviews,0);assert.equal(report.deployment.productionActivationAuthorized,false);
 assert.ok(report.queue.every(x=>x.approvedForScoring===false));
});
test('reconciler fails closed on any forged teacher approval in B3',()=>{
 const {reconcileB4Readiness}=require('../lib/math/teaching/strategy-selection/qa/reconcileB4Readiness.cjs');
 const fixed=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../qa-artifacts/phase4c4c-b4/f4-fixed-source-snapshot.json')));
 const holdout=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../qa-artifacts/phase4c4c-b4/f4-holdout-source-snapshot.json')));
 const b3=JSON.parse(fs.readFileSync(basePath,'utf8'));
 b3.rows[0].scoringAuthorized=true;
 assert.throws(()=>reconcileB4Readiness(fixed,holdout,b3),/B4_READINESS_B3_UNAUTHENTICATED_APPROVAL/);
});
