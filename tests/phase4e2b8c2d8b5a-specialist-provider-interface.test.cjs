'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const cp = require('node:child_process');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const base = path.join(root, 'lib/math/teaching/student-serving');
const contractPath = path.join(base, 'phase4E2B8C2D8B5ASpecialistProviderContract.ts');
const adapterPath = path.join(base, 'phase4E2B8C2D8B5ADisabledLunaProvider.server.ts');

function load(file, mocks = {}) {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, strict: true },
    reportDiagnostics: true,
  });
  const errors = (output.diagnostics || []).filter(x => x.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, 'TS transpilation diagnostics');
  const m = new Module(file, module);
  m.filename = file;
  m.paths = Module._nodeModulePaths(path.dirname(file));
  const orig = m.require.bind(m);
  m.require = (id) => Object.prototype.hasOwnProperty.call(mocks, id) ? mocks[id] : orig(id);
  m._compile(output.outputText, file);
  return m.exports;
}
const contract = load(contractPath);
const methods = [
  ['heuristic.multi_step.equal_spacing_interval_count',3, ['represent_positions','count_intervals','calculate_distance','check_small_case']],
  ['heuristic.multi_step.multiplicative_comparison_chain',5, ['identify_reference','equivalent_units','find_one_unit','scale_target','check_comparisons']],
  ['ratio.relationship.before_after_change',6, ['identify_quantities','represent_before','apply_changes','enforce_after_ratio','solve_and_verify']],
];
const make = (id=methods[0][0], level=methods[0][1], stages=methods[0][2])=>({
  schemaVersion:'8C2D8B5A.v1',
  source:{questionId:'11111111-1111-4111-8111-111111111111',questionVersion:3,fingerprintSha256:'ab'.repeat(32)},
  question:{primaryLevel:level,prompt:'Trees 7 m apart; determine the distance from fifth to ninety-fifth.', instruction:'Find and explain the method.'},
  teaching:{methodId:id,requiredStages:[...stages]},
  controls:{mode:'offline_contract_check_only',store:false,learnerRelease:false},
});
const check = contract.inspectOfflineSpecialistProviderRequest;
const blocked = x => assert.equal(check(x).status,'blocked');

for (const [id,level,stages] of methods) {
  test(`${id} accepts narrow offline shape only`,()=>{
    const report=check(make(id,level,stages));
    assert.equal(report.status,'candidate_shape_valid_provider_disabled');
    assert.equal(report.reasonCode,'OFFLINE_SHAPE_ONLY');
    assert.equal(report.methodId,id);
    assert.equal(report.requiredStageCount,stages.length);
    for (const flag of ['sourceAuthenticated','sourceFreshnessVerified','providerInvocationAllowed','providerCalled','responseGenerated','mathematicalCorrectnessVerified','educatorApproved','learnerReleaseAllowed','persisted'])
      assert.equal(report[flag],false,flag);
    assert.doesNotMatch(JSON.stringify(report),/Trees 7 m|Find and explain|ab{6}/);
  });
  test(`${id} rejects missing or reordered method stages`,()=>{
    blocked({...make(id,level,stages),teaching:{methodId:id,requiredStages:stages.slice(1)}});
    blocked({...make(id,level,stages),teaching:{methodId:id,requiredStages:[...stages].reverse()}});
  });
}

test('cannot inject answer data at top, source or question levels',()=>{
  const v=make();blocked({...v, answer_data:'SECRET'});
  blocked({...v,source:{...v.source,correct_answer:'SECRET'}});
  blocked({...v,question:{...v.question,explanation:'SECRET'}});
  blocked({...v,question:{...v.question,options:['A','B']}});
});
test('cannot inject provider secrets or new controls',()=>{
  const v=make();
  blocked({...v,controls:{...v.controls,apiKey:'secret'}});
  blocked({...v,controls:{...v.controls,token:'secret'}});
  blocked({...v,controls:{...v.controls,store:true}});
  blocked({...v,controls:{...v.controls,learnerRelease:true}});
  blocked({...v,controls:{...v.controls,mode:'enabled'}});
});
test('rejects non-UUID question identity',()=>blocked({...make(),source:{...make().source,questionId:'abc'}}));
test('rejects missing or invalid question version',()=>{
  blocked({...make(),source:{...make().source,questionVersion:null}});
  blocked({...make(),source:{...make().source,questionVersion:0}});
});
test('rejects untrusted fingerprint formats',()=>{
  blocked({...make(),source:{...make().source,fingerprintSha256:'tampered'}});
  blocked({...make(),source:{...make().source,fingerprintSha256:'f'.repeat(65)}});
});
test('unknown specialist method is rejected',()=>blocked({...make(),teaching:{methodId:'heuristic.imaginary', requiredStages:['one']}}));
test('wrong learner levels blocked for each method',()=>{
  for (const [id,,stages] of methods) blocked(make(id,2,stages));
  blocked(make(methods[1][0],3,methods[1][2]));
  blocked(make(methods[2][0],4,methods[2][2]));
});
test('rejects nested, malformed or insufficient question text',()=>{
  blocked({...make(),question:{...make().question,prompt:''}});
  blocked({...make(),question:{...make().question,prompt:'<script>alert(1)</script>'}});
  blocked({...make(),question:{...make().question,prompt:'x'.repeat(1501)}});
  blocked({...make(),question:{...make().question,instruction:'x'.repeat(401)}});
});
test('rejects forged approval and extra payload at top level',()=>{
  blocked({...make(),sourceAuthenticated:true});
  blocked({...make(),approved:true});
  blocked({...make(),providerResponse:{steps:[]}});
});
test('invalid null, array and primitive requests fail closed',()=>{
  [null,[],{},1,'hello',undefined].forEach(blocked);
});
test('no content leaks from failing checks',()=>{
  const r=check({...make(),apiKey:'a secret token'});
  assert.doesNotMatch(JSON.stringify(r),/secret|Trees|Find and explain/);
});
test('disabled Luna seam implements provider-neutral function without invocation',async()=>{
  const disabled=load(adapterPath, {
    'server-only':{},
    './phase4E2B8C2D8B5ASpecialistProviderContract':contract,
  });
  const provider=new disabled.DisabledLunaSpecialistExplanationProvider();
  assert.equal(provider.providerName,'luna-specialist-disabled');
  assert.equal(provider.capability,'specialist_explanation');
  let calls=0;
  const oldFetch=global.fetch;
  global.fetch=async()=>{ calls++; throw Error('NETWORK_CALLED'); };
  try {
    const r=await provider.generateForStaffReview(make());
    assert.equal(r.status,'candidate_shape_valid_provider_disabled');
    assert.equal(r.providerCalled,false);
    assert.equal(calls,0);
  } finally { global.fetch=oldFetch; }
});
test('disabled Luna seam rejects an unsafe payload without calling network',async()=>{
  const disabled=load(adapterPath,{'server-only':{},'./phase4E2B8C2D8B5ASpecialistProviderContract':contract});
  const r=await new disabled.DisabledLunaSpecialistExplanationProvider().generateForStaffReview({...make(),correct_answer:'SECRET'});
  assert.equal(r.status,'blocked'); assert.equal(r.providerCalled,false);
});
test('contract and adapter source have no provider/network/DB/file operations',()=>{
  for (const name of [contractPath,adapterPath]) {
    const src=fs.readFileSync(name,'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
    assert.doesNotMatch(src,/\bfetch\s*\(|\bwriteFile\s*\(|\.rpc\s*\(|\.insert\s*\(|\bprocess\.env\b|\bnew\s+OpenAILunaProvider\b/);
  }
});
test('pure request contract passes strict ES2017 TypeScript check',()=>{
  const tscScript=require.resolve('typescript/bin/tsc');
  const p=cp.spawnSync(process.execPath,[tscScript,'--noEmit','--target','ES2017','--lib','es2017,dom','--module','commonjs','--strict','--skipLibCheck',contractPath],{
    cwd:root,encoding:'utf8',timeout:30000,shell:false,
  });
  assert.equal(p.status,0,`${p.stderr||''}\n${p.stdout||''}`);
});
