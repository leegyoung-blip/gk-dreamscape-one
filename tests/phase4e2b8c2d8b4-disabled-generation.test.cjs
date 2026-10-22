'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = process.cwd();
const base = path.join(root, 'lib/math/teaching/student-serving');
const policyFile = path.join(base, 'phase4E2B8C2D8B4DisabledGenerationPolicy.ts');
const adapterFile = path.join(base, 'phase4E2B8C2D8B4DisabledGenerationAdapter.server.ts');

function load(file, imports = {}) {
  const src = fs.readFileSync(file, 'utf8');
  const out = ts.transpileModule(src, { compilerOptions: {
    target: ts.ScriptTarget.ES2017,
    module: ts.ModuleKind.CommonJS,
    strict: true,
  }, reportDiagnostics: true });
  const errors = (out.diagnostics || []).filter(x => x.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, 'TypeScript transpile diagnostics');
  const m = new Module(file, module);
  m.filename = file;
  m.paths = Module._nodeModulePaths(path.dirname(file));
  const original = m.require.bind(m);
  m.require = (id) => Object.prototype.hasOwnProperty.call(imports, id) ? imports[id] : original(id);
  m._compile(out.outputText, file);
  return m.exports;
}
const b3 = load(path.join(base, 'phase4E2B8C2D8B3ExplanationCaptureContract.ts'));
const policy = load(policyFile, {
  './phase4E2B8C2D8B3ExplanationCaptureContract': b3,
});
const validId = '11111111-1111-4111-8111-111111111111';
const methodData = [
  ['heuristic.multi_step.equal_spacing_interval_count', 3, ['represent_positions','count_intervals','calculate_distance','check_small_case']],
  ['heuristic.multi_step.multiplicative_comparison_chain', 5, ['identify_reference','equivalent_units','find_one_unit','scale_target','check_comparisons']],
  ['ratio.relationship.before_after_change', 6, ['identify_quantities','represent_before','apply_changes','enforce_after_ratio','solve_and_verify']],
];
const map = (level = 3) => ({
  status:'mapped_private_only', mappingVersion:'8C2D8B2.v1', sourceVersion:2,
  providerInvocationAllowed:false, learnerReleaseAllowed:false,
  privateDraft:{id:validId,subject:'math',primary_level:level,topic_title:'Word problems',skill:'Math reasoning',difficulty:3,
    question_type:'short_text',instruction:'Solve and check.',
    prompt:'Trees are planted 7 m apart. Find the distance between tree 5 and tree 95.',
    content:{}, answer_data:null, correct_answer:null, explanation:null},
});
const dry = {mode:'disabled_dry_run'};
const output = (method, stages) => ({
  schemaVersion:'8C2D8B3.v1', questionId:validId, questionVersion:2, methodId:method,
  steps:stages.map((stageId,i)=>({stageId,explanation:`Explain why this stage is necessary and how it works (${i}).`,working:i === 2 ? '95 - 5 = 90; 90 x 7 = 630' : 'Reason using equal units.'})),
  finalAnswer:'630 m', finalCheck:'Verify that the number of gaps is one less than the number of indexed positions.',
  visualPlan:{kind:'number_line', description:'Equal intervals between indexed tree positions.'},
});

for (const [method, level, stages] of methodData) {
  test(`${method}: disabled preparation never authorises provider or capture`, () => {
    const r = policy.prepareDisabledSpecialistGeneration(map(level), method, dry);
    assert.equal(r.status,'prepared_provider_disabled');
    assert.equal(r.expectedStageCount,stages.length);
    for (const key of ['providerInvocationAllowed','providerRequestCreated','actualNovaOutputCaptured',
      'sourceAuthenticated','sourceFreshnessVerified','mathematicalCorrectnessVerified',
      'educatorApproved','learnerReleaseAllowed','persisted']) assert.equal(r[key],false,key);
    assert.doesNotMatch(JSON.stringify(r),/Trees are|630 m|Solve and check/);
  });
  test(`${method}: valid offline example is structure-only, not an AI capture`, () => {
    const r = policy.inspectDisabledOfflineCandidate(map(level),method,dry,output(method,stages));
    assert.equal(r.status,'candidate_structure_review_pending');
    assert.equal(r.candidateStructureChecked,true);
    assert.equal(r.actualNovaOutputCaptured,false);
    assert.equal(r.mathematicalCorrectnessVerified,false);
    assert.doesNotMatch(JSON.stringify(r),/Trees are|630 m/);
  });
  test(`${method}: identity/version mismatch fails closed`, () => {
    const sample = output(method,stages);
    assert.equal(policy.inspectDisabledOfflineCandidate(map(level),method,dry,{...sample,questionVersion:9}).status,'blocked');
  });
}

test('rejects missing explicit dry-run control', () => assert.equal(policy.prepareDisabledSpecialistGeneration(map(),methodData[0][0],undefined).reasonCode,'DRY_RUN_CONTROL_REQUIRED'));
test('rejects attempts to enable provider by control value', () => assert.equal(policy.prepareDisabledSpecialistGeneration(map(),methodData[0][0],{mode:'enabled'}).status,'blocked'));
test('rejects injected approval flag', () => assert.equal(policy.prepareDisabledSpecialistGeneration(map(),methodData[0][0],{mode:'disabled_dry_run',approved:true}).status,'blocked'));
test('rejects injected provider key', () => assert.equal(policy.prepareDisabledSpecialistGeneration(map(),methodData[0][0],{mode:'disabled_dry_run',apiKey:'secret'}).status,'blocked'));
test('rejects forged source verified flag', () => assert.equal(policy.prepareDisabledSpecialistGeneration(map(),methodData[0][0],{mode:'disabled_dry_run',sourceAuthenticated:true}).status,'blocked'));
test('rejects answer-bearing draft', () => assert.equal(policy.prepareDisabledSpecialistGeneration({...map(),privateDraft:{...map().privateDraft,correct_answer:'PRIVATE'}},methodData[0][0],dry).status,'blocked'));
test('rejects extra data on draft', () => assert.equal(policy.prepareDisabledSpecialistGeneration({...map(),privateDraft:{...map().privateDraft,token:'PRIVATE'}},methodData[0][0],dry).status,'blocked'));
test('rejects unknown method', () => assert.equal(policy.prepareDisabledSpecialistGeneration(map(),'heuristic.fake',dry).status,'blocked'));
test('rejects unsupported level', () => assert.equal(policy.prepareDisabledSpecialistGeneration(map(2),methodData[0][0],dry).status,'blocked'));
test('rejects malformed output', () => assert.equal(policy.inspectDisabledOfflineCandidate(map(),methodData[0][0],dry,{}).reasonCode,'CANDIDATE_NOT_STRUCTURED'));
test('rejects output with approval claim', () => {
 const v=output(methodData[0][0],methodData[0][2]);
 assert.equal(policy.inspectDisabledOfflineCandidate(map(),methodData[0][0],dry,{...v,approved:true}).status,'blocked');
});
test('rejects missing teaching step', () => {
 const v=output(methodData[0][0],methodData[0][2]);
 assert.equal(policy.inspectDisabledOfflineCandidate(map(),methodData[0][0],dry,{...v,steps:v.steps.slice(1)}).status,'blocked');
});
test('no provider / database / fs invocation in policy', () => {
 const src=fs.readFileSync(policyFile,'utf8');
 assert.doesNotMatch(src,/\bfetch\s*\(|\bwriteFile\b|\.rpc\s*\(|\bOpenAILunaProvider\b|\.insert\s*\(/);
});

test('staff-only adapter requires trusted bridge and remains disabled',async () => {
 const adapter = load(adapterFile, {
  'server-only':{},
  './phase4E2B8C2D8B2TrustedGeneratorBridge.server': {
   inspectTrustedGeneratorMapping: async () => ({status:'mapping_validated_capture_disabled',canInvokeProvider:false,studentReleased:false,specialistMethodIds:[methodData[0][0]]}),
  },
 });
 const r = await adapter.inspectDisabledStaffGenerationPath({}, {quizId:validId,questionId:validId});
 assert.equal(r.status,'trusted_mapping_ready_provider_disabled');
 assert.equal(r.providerInvocationAllowed,false);
 assert.equal(r.sourceTextReturned,false);
 assert.equal(r.captureStored,false);
 assert.equal(r.eligibleDraftCount,1);
});
test('staff-only adapter blocks failed trusted bridge', async () => {
 const adapter=load(adapterFile,{'server-only':{},
  './phase4E2B8C2D8B2TrustedGeneratorBridge.server':{inspectTrustedGeneratorMapping:async()=>({status:'blocked'})}});
 assert.equal((await adapter.inspectDisabledStaffGenerationPath({},{})).status,'blocked');
});
test('staff-only adapter blocks forged invocation rights', async () => {
 const adapter=load(adapterFile,{'server-only':{},
  './phase4E2B8C2D8B2TrustedGeneratorBridge.server':{inspectTrustedGeneratorMapping:async()=>({status:'mapping_validated_capture_disabled',canInvokeProvider:true,studentReleased:false,specialistMethodIds:[methodData[0][0]]})}});
 assert.equal((await adapter.inspectDisabledStaffGenerationPath({},{})).status,'blocked');
});
test('staff-only adapter fails closed on resolver exceptions', async () => {
 const adapter=load(adapterFile,{'server-only':{},
  './phase4E2B8C2D8B2TrustedGeneratorBridge.server':{inspectTrustedGeneratorMapping:async()=>{throw new Error('private source');}}});
 const r=await adapter.inspectDisabledStaffGenerationPath({},{});
 assert.equal(r.status,'blocked');
 assert.doesNotMatch(JSON.stringify(r),/private source/);
});
test('staff adapter cannot call external provider/write files or add a route', () => {
 const src=fs.readFileSync(adapterFile,'utf8');
 assert.match(src,/import 'server-only'/);
 assert.doesNotMatch(src,/\bfetch\s*\(|\bwriteFile\b|\.rpc\s*\(|\bOpenAILunaProvider\b|\.insert\s*\(/);
});
