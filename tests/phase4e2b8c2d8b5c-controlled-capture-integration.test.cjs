'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const base = path.join(__dirname, '../lib/math/teaching/student-serving');
const files = {
  staff: 'phase4E2B8C2D8B5CStaffCapturePreflight.server.ts',
  handoff: 'phase4E2B8C2D8B5COfflineCaptureHandoff.server.ts',
  map: 'phase4E2B8C2D8B2AuthoringInputPolicy.ts',
  contract: 'phase4E2B8C2D8B3ExplanationCaptureContract.ts',
  provider: 'phase4E2B8C2D8B5ASpecialistProviderContract.ts',
  response: 'phase4E2B8C2D8B5BExplanationResponseReview.ts',
};
const state = {
  bridge: null, shadow: null, source: null,
  sourceCalls: 0, throwResolver: false, mutateOnSecondRead: false,
};
const sid = '11111111-1111-4111-8111-111111111111';
const qid = '22222222-2222-4222-8222-222222222222';
const method = 'heuristic.multi_step.equal_spacing_interval_count';
const stages = ['represent_positions','count_intervals','calculate_distance','check_small_case'];
const ids = {quizId: qid, questionId: sid};
const sourceQuestion = () => ({
  id: sid, subject: 'math', primary_level: 3, difficulty: 3, question_type: 'short_text',
  prompt: 'Trees are planted 7 m apart along a straight road. What is the distance between the 5th and 95th tree?',
  instruction: 'Find the distance.', content: null, topic_title: 'Measurement', skill:'Equal spacing',
  answer_data: { correct_answer: '630 m', explanation: 'PRIVATE ANSWER' },
});
function setup() {
  state.sourceCalls = 0; state.throwResolver = false; state.mutateOnSecondRead = false;
  state.bridge = {status:'mapping_validated_capture_disabled',sourceVersion:3,
    specialistMethodIds:[method], canInvokeProvider:false,studentReleased:false};
  state.shadow = {status:'pending_manual_review',questionVersion:3,teachingApproved:false,
    humanVerified:false,studentReleased:false,comparisons:[{specialistMethodId:method}]};
  state.source = {status:'ready',sourceIdentity:{quizId:qid,questionId:sid,questionVersion:3},
    source:{question:sourceQuestion()},staffReview:{quizStatus:'active',questionStatus:'active',studentReleased:false}};
}
setup();
const cache = new Map();
function load(key) {
  if(cache.has(key)) return cache.get(key);
  const abs=path.join(base,files[key]);
  const compiled=ts.transpileModule(fs.readFileSync(abs,'utf8'),{
    fileName:abs,compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,strict:true},
    reportDiagnostics:true
  });
  const errs=(compiled.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
  assert.equal(errs.length,0,ts.formatDiagnosticsWithColorAndContext(errs,{
    getCurrentDirectory:()=>base,getCanonicalFileName:x=>x,getNewLine:()=> '\n' }));
  const m = new Module(abs,module); m.filename=abs; m.paths=Module._nodeModulePaths(path.dirname(abs));
  const orig = m.require.bind(m);
  m.require = id => {
    if(id==='server-only') return {};
    if(id.includes('phase4E2B8C2D8B2TrustedGeneratorBridge.server'))
      return { inspectTrustedGeneratorMapping:async()=>state.bridge };
    if(id.includes('phase4E2B8C2C4DStaffShadowComparison.server'))
      return { inspectStaffMathSpecialistShadowComparison:async()=>state.shadow };
    if(id.includes('phase4E2A3StaffSourceResolver.server'))
      return {resolveStaffMathTeachingSource:async()=>{
        if(state.throwResolver) throw Error('test resolver exception');
        state.sourceCalls++;
        if(state.mutateOnSecondRead&&state.sourceCalls>=2)
          return {...state.source,source:{question:{...sourceQuestion(),prompt:'Changed source question'}}};
        return state.source;
      }};
    const dep = Object.entries(files).find(([,name])=>id.includes(name.replace('.ts','')));
    if(dep)return load(dep[0]);
    return orig(id);
  };
  m._compile(compiled.outputText,abs); cache.set(key,m.exports); return m.exports;
}
const staff=load('staff');
const handoff=load('handoff');
const run=(query={...ids,methodId:method})=>staff.inspectStaffCapturePreflight(new Request('https://example.test/'),query);
function noRelease(o){
  for(const field of ['providerInvoked','responseGenerated','privateCaptureStored','correctnessApproved',
    'educatorApproved','learnerReleaseAllowed','sourceFreshnessCertificate']) assert.equal(o[field],false,field);
}

test('staff-only pipeline validates trusted source then stops with disabled provider',async()=>{
  setup(); const result=await run();
  assert.equal(result.status,'dry_run_ready_provider_disabled');
  assert.equal(result.reasonCode,'DISABLED_PROVIDER_DRY_RUN_ONLY');
  assert.equal(result.checkedQuestionVersion,3);
  assert.equal(result.sourceAuthenticatedInThisRead,true);
  assert.equal(state.sourceCalls,2);
  assert.equal(JSON.stringify(result).includes('PRIVATE ANSWER'),false);
  assert.equal(JSON.stringify(result).includes('Trees are planted'),false);
  noRelease(result);
});
test('extra fields including prompt, facts, approval, token are all rejected',async()=>{
  for(const extra of [{prompt:'attacker'},{facts:{}},{approved:true},{token:'secret'}]) {
    setup(); const result=await run({...ids,methodId:method,...extra});
    assert.equal(result.reasonCode,'INVALID_QUERY'); assert.equal(state.sourceCalls,0);noRelease(result);
  }
});
test('unsupported method cannot be nominated by caller',async()=>{
  setup();const result=await run({...ids,methodId:'heuristic.multi_step.final_synthesis'});
  assert.equal(result.reasonCode,'INVALID_QUERY');
});
test('wrong UUID and missing identifier blocked without DB read',async()=>{
  for(const bad of [{quizId:'not-a-uuid',questionId:sid,methodId:method},{questionId:sid,methodId:method}]) {
    setup();assert.equal((await run(bad)).reasonCode,'INVALID_QUERY');assert.equal(state.sourceCalls,0);
  }
});
test('blocked authenticated shadow bridge fails closed',async()=>{
  setup();state.bridge={status:'blocked'};
  const result=await run();assert.equal(result.reasonCode,'STAFF_GATE_NOT_READY');
  assert.equal(state.sourceCalls,0);noRelease(result);
});
test('method absent from authenticated reviewed set blocked',async()=>{
  setup();state.bridge.specialistMethodIds=['ratio.relationship.before_after_change'];
  assert.equal((await run()).status,'blocked');
});
test('unauthorised shadow method rejected',async()=>{
  setup();state.shadow.comparisons=[];
  assert.equal((await run()).reasonCode,'METHOD_NOT_IN_SHADOW_SET');
});
test('any shadow approval flag prematurely true is rejected',async()=>{
  setup();state.shadow.teachingApproved=true;
  assert.equal((await run()).reasonCode,'METHOD_NOT_IN_SHADOW_SET');
});
test('source version mismatch fails closed',async()=>{
  setup();state.source.sourceIdentity.questionVersion=5;
  assert.equal((await run()).reasonCode,'SOURCE_NOT_READY');
});
test('question with a media asset or option content cannot be silently stripped',async()=>{
  setup();state.source.source.question.assets=[{url:'/private.png'}];
  assert.equal((await run()).reasonCode,'MAPPING_NOT_READY');
});
test('source content changing between resolver calls blocks',async()=>{
  setup();state.mutateOnSecondRead=true;
  const result=await run();assert.equal(result.reasonCode,'SOURCE_CHANGED'); noRelease(result);
});
test('resolver error is caught and does not leak details',async()=>{
  setup();state.throwResolver=true;
  const result=await run();assert.equal(result.reasonCode,'INTERNAL_UNAVAILABLE');
  assert.equal(JSON.stringify(result).includes('test resolver exception'),false);
});
const stagesFor=['represent_positions','count_intervals','calculate_distance','check_small_case'];
const offlineRequest=()=>({
 schemaVersion:'8C2D8B5A.v1',source:{questionId:sid,questionVersion:3,fingerprintSha256:'fa'.repeat(32)},
 question:{primaryLevel:3,prompt:sourceQuestion().prompt,instruction:'Find the distance.'},
 teaching:{methodId:method,requiredStages:[...stagesFor]},
 controls:{mode:'offline_contract_check_only',store:false,learnerRelease:false},
});
const rawOutput=()=>JSON.stringify({
 schemaVersion:'8C2D8B3.v1',questionId:sid,questionVersion:3,methodId:method,
 steps:stagesFor.map((stageId,i)=>({stageId,explanation:'Explain the interval idea in a clear sentence for the learner.',working:i===2?'90 x 7 = 630':''})),
 finalAnswer:'630 m',finalCheck:'Check that 95 minus 5 gives ninety intervals.',
 visualPlan:{kind:'number_line',description:'A simple sequence of evenly spaced markers.'},
});
test('valid offline output produces hash only, with real capture still pending',()=>{
  const result=handoff.inspectOfflinePrivateCaptureHandoff(offlineRequest(),rawOutput());
  assert.equal(result.status,'offline_replay_review_pending');
  assert.match(result.responseSha256,/^[0-9a-f]{64}$/);
  assert.equal(result.responseStageCount,4);
  assert.equal(result.arithmeticCheck,'none');
  for(const key of ['realNovaOriginVerified','artifactsWritten','privateCaptureManifestComplete','educatorApproved','learnerReleaseAllowed'])
    assert.equal(result[key],false,key);
  assert.equal(JSON.stringify(result).includes('630 m'),false);
});
test('different untrusted explanation changes its hash but cannot change approval',()=>{
  const a=handoff.inspectOfflinePrivateCaptureHandoff(offlineRequest(),rawOutput());
  const b=handoff.inspectOfflinePrivateCaptureHandoff(offlineRequest(),rawOutput().replace('clear sentence','simple sentence'));
  assert.notEqual(a.responseSha256,b.responseSha256);
  assert.equal(b.educatorApproved,false);
});
test('malformed, wrong version or non-JSON input fails offline handoff',()=>{
  const a=handoff.inspectOfflinePrivateCaptureHandoff(offlineRequest(),'not-json');
  assert.equal(a.status,'blocked');assert.equal(a.responseSha256,null);
  const r=JSON.parse(rawOutput());r.questionVersion=4;
  assert.equal(handoff.inspectOfflinePrivateCaptureHandoff(offlineRequest(),JSON.stringify(r)).status,'blocked');
});
test('caller supplied source approval and model credentials cannot bypass offline validation',()=>{
  const req={...offlineRequest(),accessToken:'not-allowed'};
  const result=handoff.inspectOfflinePrivateCaptureHandoff(req,rawOutput());
  assert.equal(result.status,'blocked');assert.equal(result.artifactsWritten,false);
});
test('B5C code has no model invocation, persistence, API route or response logging',()=>{
 for(const key of ['staff','handoff']){
  const src=fs.readFileSync(path.join(base,files[key]),'utf8');
  assert.doesNotMatch(src,/\bfetch\s*\(|\b(?:supabase|db|client)\.(?:rpc|insert|upsert|update)\s*\(|\bconsole\s*\.|\.generateForStaffReview\s*\(/);
  assert.match(src,/false as const/);
 }
});
