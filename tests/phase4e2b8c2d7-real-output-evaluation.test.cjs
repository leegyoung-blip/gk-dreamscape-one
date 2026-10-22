'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const cp=require('node:child_process');
const mod=require('../scripts/phase4e2b8c2d7-real-output-evaluation.cjs');
const HOME=fs.mkdtempSync(path.join(os.tmpdir(),'dreamscape-8c2d7-'));
const uuid1='1bfb648a-c1c3-4f96-9e7c-dff529095749',uuid2='f26851bb-b6ba-4168-992a-1d9f5a84590f';
const validText='First, identify the number of equal gaps between the given positions. Then calculate the stated distance and check the units. This is synthetic test-only text and not real NOVA output.';
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.alloc(50,0)]);
function artifact(file,content=validText){let data=Buffer.isBuffer(content)?content:Buffer.from(content);fs.writeFileSync(path.join(HOME,file),data);return {path:path.join(HOME,file),sha256:mod.digest(data)};}
function valid(){
 return {
  schemaVersion:'8C2D7.v1',templateOnly:false,reviewId:'REAL_TESTCASE_001',comparisonQuestionIdentity:'single_source_question_for_both_variants',
  question:{quizId:uuid1,questionId:uuid2,version:1,fingerprintSha256:'a'.repeat(64),primaryLevel:3,sourceIdentityOrigin:'authenticated_staff_preview',previewedAt:'2026-10-22T10:15:00+08:00'},
  governance:{staffOnly:true,noLearnerData:true,noStoredAnswerKey:true,recordingApproved:false,methodApproved:false,learnerRelease:false,liveAuthenticationVerified:false,liveFreshnessVerified:false},
  specialist:{methodId:'heuristic.multi_step.equal_spacing_interval_count',origin:'captured_nova_output',capturedAt:'2026-10-22T10:10:00+08:00',generatorVersion:'mock-version-for-tests',textArtifact:artifact('specialist.txt'),containsDiagram:false,containsSpecialMathNotation:false,renderedArtifacts:[]},
  incumbent:{methodId:'heuristic.multi_step.identify_subgoals',origin:'staff_authored_reference',capturedAt:'2026-10-22T10:10:00+08:00',generatorVersion:null,textArtifact:artifact('incumbent.txt'),containsDiagram:false,containsSpecialMathNotation:false,renderedArtifacts:[]},
  presentationOrder:{R1:['specialist','incumbent'],R2:['incumbent','specialist']},
  educatorReview:{r1:'PENDING',r2:'PENDING',finalDecision:'UNDECIDED',approved:false}
 };
}
const blocked=(m,code)=>assert.ok(mod.evaluate(m).blockers.includes(code),`${code}: ${JSON.stringify(mod.evaluate(m))}`);
test.after(()=>fs.rmSync(HOME,{recursive:true,force:true}));
test('intact actual-vs-reference pair is review-pending, never method approval',()=>{
 const r=mod.evaluate(valid());assert.equal(r.status,'CAPTURE_INTEGRITY_OK_REVIEW_PENDING');assert.equal(r.blockers.length,0);
 assert.equal(r.comparisonClass,'actual_nova_vs_staff_authored_reference');
 assert.equal(r.releaseAllowed,false);assert.equal(r.methodApproved,false);assert.equal(r.liveVerified,false);
 assert.equal(r.mathematicalCorrectnessVerified,false);
 assert.ok(r.pending.includes('ARITHMETIC_AND_FINAL_ANSWER_REQUIRE_INDEPENDENT_CHECK'));
});
test('actual-vs-actual remains distinguishable from authored comparison',()=>{const m=valid();m.incumbent.origin='captured_existing_method_output';m.incumbent.generatorVersion='real-version-declared';const r=mod.evaluate(m);assert.equal(r.comparisonClass,'actual_nova_vs_actual_incumbent');});
test('visual mathematics needs mobile and desktop rendered evidence',()=>{const m=valid();m.specialist.containsDiagram=true;blocked(m,'SPECIALIST_MOBILE_DESKTOP_RENDERS_REQUIRED');m.specialist.renderedArtifacts=[{device:'mobile',...artifact('visual-mobile.png',png)},{device:'desktop',...artifact('visual-desktop.png',png)}];assert.equal(mod.evaluate(m).status,'CAPTURE_INTEGRITY_OK_REVIEW_PENDING');});
test('visual math on incumbent variant requires its own screenshots',()=>{const m=valid();m.incumbent.containsSpecialMathNotation=true;blocked(m,'INCUMBENT_MOBILE_DESKTOP_RENDERS_REQUIRED');});
test('PNG signature must match declared extension',()=>{const m=valid();m.specialist.renderedArtifacts=[{device:'mobile',...artifact('wrong.png','not-a-real-image-though-it-looks-like-one')}];blocked(m,'SPECIALIST_RENDER_ARTIFACT_FORMAT_INVALID');});
test('template cannot be passed as real output evidence',()=>{const m=valid();m.templateOnly=true;blocked(m,'TEMPLATE_IS_NOT_REAL_OUTPUT');});
test('missing version is blocking',()=>{const m=valid();m.question.version=null;blocked(m,'QUESTION_VERSION_REQUIRED');});
test('wrong question UUID is blocking',()=>{const m=valid();m.question.questionId='wrong';blocked(m,'QUESTION_IDENTITIES_REQUIRED');});
test('source fingerprint is required',()=>{const m=valid();m.question.fingerprintSha256='fake';blocked(m,'SOURCE_FINGERPRINT_REQUIRED');});
test('source must derive from authorised staff preview as attested',()=>{const m=valid();m.question.sourceIdentityOrigin='browser_guess';blocked(m,'SOURCE_PROVENANCE_UNSUPPORTED');});
test('staff preview time must be ISO with timezone',()=>{const m=valid();m.question.previewedAt='yesterday';blocked(m,'SOURCE_PREVIEW_TIME_INVALID');});
test('invalid primary level is rejected',()=>{const m=valid();m.question.primaryLevel=7;blocked(m,'PRIMARY_LEVEL_INVALID');});
test('known specialist is required',()=>{const m=valid();m.specialist.methodId='heuristic.multi_step.unknown';blocked(m,'SPECIALIST_ID_NOT_DRAFT');});
test('specialist grade suitability is checked',()=>{const m=valid();m.question.primaryLevel=2;blocked(m,'SPECIALIST_LEVEL_MISMATCH');});
test('changing ratio specialist supports P5/P6, not P3',()=>{const m=valid();m.specialist.methodId='ratio.relationship.before_after_change';m.incumbent.methodId='ratio.relationship.ratio_units';blocked(m,'SPECIALIST_LEVEL_MISMATCH');});
test('incumbent must be a known existing method for the specialist',()=>{const m=valid();m.incumbent.methodId='invented.method';blocked(m,'INCUMBENT_METHOD_NOT_GROUNDED');});
test('existing ratio scale-table is a legitimate incumbent',()=>{const m=valid();m.question.primaryLevel=6;m.specialist.methodId='ratio.relationship.before_after_change';m.incumbent.methodId='ratio.relationship.scale_table';assert.equal(mod.evaluate(m).status,'CAPTURE_INTEGRITY_OK_REVIEW_PENDING');});
test('actual nova output origin is mandatory for this intake',()=>{const m=valid();m.specialist.origin='staff_authored_reference';blocked(m,'REAL_NOVA_ORIGIN_REQUIRED');});
test('incumbent origin must disclose reference vs actual',()=>{const m=valid();m.incumbent.origin='generated_maybe';blocked(m,'INCUMBENT_ORIGIN_INVALID');});
test('captured incumbent must identify generator version',()=>{const m=valid();m.incumbent.origin='captured_existing_method_output';blocked(m,'INCUMBENT_GENERATOR_VERSION_REQUIRED');});
test('nova generator version required',()=>{const m=valid();m.specialist.generatorVersion='';blocked(m,'NOVA_GENERATOR_VERSION_REQUIRED');});
test('capture timestamp required',()=>{const m=valid();m.specialist.capturedAt='invalid';blocked(m,'CAPTURE_TIMES_INVALID');});
test('not-in-git gate rejects in-repository evidence',()=>{const m=valid();m.specialist.textArtifact={path:path.join(mod.ROOT,'docs','PHASE_8C2D7_REAL_OUTPUT_EVALUATION.md'),sha256:'a'.repeat(64)};blocked(m,'SPECIALIST_ARTIFACT_INSIDE_REPO');});
test('tampering with the file invalidates its hash',()=>{const m=valid();fs.appendFileSync(m.specialist.textArtifact.path,' CHANGED');blocked(m,'SPECIALIST_ARTIFACT_HASH_MISMATCH');});
test('absence of file blocks intake',()=>{const m=valid();m.incumbent.textArtifact.path=path.join(HOME,'absent.txt');blocked(m,'INCUMBENT_ARTIFACT_MISSING');});
test('nonabsolute artifact path is blocked',()=>{const m=valid();m.incumbent.textArtifact.path='./relative.txt';blocked(m,'INCUMBENT_ARTIFACT_ABSOLUTE_PATH_REQUIRED');});
test('missing hash blocks intake',()=>{const m=valid();m.specialist.textArtifact.sha256='';blocked(m,'SPECIALIST_ARTIFACT_HASH_MISSING');});
test('missing diagram flags blocks intake',()=>{const m=valid();delete m.specialist.containsDiagram;blocked(m,'SPECIALIST_VISUAL_FLAGS_REQUIRED');});
test('duplicate device screenshot blocks',()=>{const m=valid();m.specialist.renderedArtifacts=[{device:'desktop',...artifact('c1.png',png)},{device:'desktop',...artifact('c2.png',png)}];blocked(m,'SPECIALIST_DUPLICATE_RENDER_DEVICE');});
test('unrecognised render device blocked',()=>{const m=valid();m.specialist.renderedArtifacts=[{device:'phone',...artifact('c3.png',png)}];blocked(m,'SPECIALIST_RENDER_DEVICE_INVALID');});
test('governance assertions required',()=>{const m=valid();m.governance.noLearnerData=false;blocked(m,'GOVERNANCE_ATTESTATIONS_REQUIRED');});
test('no learner-release or approval claims',()=>{const m=valid();m.governance.learnerRelease=true;blocked(m,'PREMATURE_APPROVAL_OR_RELEASE');});
test('live auth cannot be falsely claimed by offline tool',()=>{const m=valid();m.governance.liveAuthenticationVerified=true;blocked(m,'OFFLINE_LIVE_VERIFICATION_CLAIM');});
test('educator review cannot begin already approved',()=>{const m=valid();m.educatorReview.approved=true;blocked(m,'OFFLINE_REVIEW_MUST_BEGIN_PENDING');});
test('question pairing assertion required',()=>{const m=valid();m.comparisonQuestionIdentity='different_question';blocked(m,'PAIR_SAME_QUESTION_ATTESTATION_MISSING');});
test('counterbalanced blind presentation required',()=>{const m=valid();m.presentationOrder.R2=['specialist','incumbent'];blocked(m,'BLINDED_COUNTERBALANCED_REVIEW_ORDER_REQUIRED');});
test('possible secret in explanation blocks intake and never prints it',()=>{const m=valid();fs.writeFileSync(m.incumbent.textArtifact.path,'This teaching text has unauthorized token authorization: Bearer testsecretsomelongvalue. Do not accept data.');m.incumbent.textArtifact.sha256=mod.digest(fs.readFileSync(m.incumbent.textArtifact.path));blocked(m,'INCUMBENT_POSSIBLE_SECRET_IN_OUTPUT');});
test('only six known paired synthetic references and incumbent IDs remain supported',()=>{
 const p=path.join(mod.ROOT,'tests','fixtures','phase4e2b8c2d3-paired-explanations.json');
 // Optional fixture is part of installed 8C-2D.3; require for this repo-level integration test.
 assert.ok(fs.existsSync(p),'Earlier 8C-2D.3 fixture missing');
 const data=JSON.parse(fs.readFileSync(p));assert.equal(data.comparisons.length,6);
 for(const entry of data.comparisons)assert.ok(mod.incumbentAllowed[entry.specialistMethodId].includes(entry.incumbentMethodId));
});
test('a real private manifest reads without returning output text',()=>{
 const m=valid();const file=path.join(HOME,'private-manifest.json');fs.writeFileSync(file,JSON.stringify(m));
 const result=mod.evaluateFile(file);assert.equal(result.status,'CAPTURE_INTEGRITY_OK_REVIEW_PENDING');
 assert.ok(!JSON.stringify(result).includes('First, identify'));
});
test('private manifest inside repo is rejected regardless of contents',()=>{
 const file=path.join(mod.ROOT,'docs','phase4e2b8c2d7-private-manifest-TEMPLATE.json');
 assert.throws(()=>mod.readManifest(file),/MANIFEST_MUST_BE_OUTSIDE_REPO/);
});
test('template-only CLI reports no actual NOVA captures',()=>{
 const result=cp.spawnSync(process.execPath,[path.join(mod.ROOT,'scripts','phase4e2b8c2d7-real-output-evaluation.cjs'),'--check-template'],{encoding:'utf8'});
 assert.equal(result.status,0);assert.match(result.stdout,/REAL_NOVA_OUTPUTS=0/);
 assert.match(result.stdout,/RELEASE=DISABLED/);
});
test('CLI on bad private manifest returns nonzero without leaking text or path',()=>{
 const m=valid();m.specialist.textArtifact.sha256='b'.repeat(64);
 const file=path.join(HOME,'bad-manifest.json');fs.writeFileSync(file,JSON.stringify(m));
 const result=cp.spawnSync(process.execPath,[path.join(mod.ROOT,'scripts','phase4e2b8c2d7-real-output-evaluation.cjs'),'--manifest',file],{encoding:'utf8'});
 assert.equal(result.status,1);assert.match(result.stdout,/ARTIFACT_HASH_MISMATCH/);
 assert.ok(!result.stdout.includes(HOME));assert.ok(!result.stdout.includes('First, identify'));
});

test('templateOnly cannot be omitted to bypass template safeguard',()=>{const m=valid();delete m.templateOnly;blocked(m,'TEMPLATE_IS_NOT_REAL_OUTPUT');});
test('answer key cannot be smuggled into intake manifest',()=>{const m=valid();m.question.answer_data={secret:'fake'};blocked(m,'PRIVILEGED_OR_SENSITIVE_MANIFEST_FIELD');});
test('credential-shaped fields cannot be in intake manifest',()=>{const m=valid();m.accessToken='token';blocked(m,'PRIVILEGED_OR_SENSITIVE_MANIFEST_FIELD');});
