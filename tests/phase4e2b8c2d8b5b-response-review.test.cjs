'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const base = path.join(root,'lib/math/teaching/student-serving');
const files = {
  b3:'phase4E2B8C2D8B3ExplanationCaptureContract.ts',
  a:'phase4E2B8C2D8B5ASpecialistProviderContract.ts',
  b:'phase4E2B8C2D8B5BExplanationResponseReview.ts',
};
const cache = new Map();
function load(file) {
  if(cache.has(file)) return cache.get(file);
  const abs=path.join(base,files[file]);
  const output=ts.transpileModule(fs.readFileSync(abs,'utf8'),{fileName:abs,compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,strict:true},reportDiagnostics:true});
  assert.deepEqual((output.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error),[]);
  const m=new Module(abs,module);m.filename=abs;m.paths=Module._nodeModulePaths(path.dirname(abs));
  const orig=m.require.bind(m);
  m.require=(id)=>id.includes('phase4E2B8C2D8B3ExplanationCaptureContract')?load('b3'):id.includes('phase4E2B8C2D8B5ASpecialistProviderContract')?load('a'):orig(id);
  m._compile(output.outputText,abs);cache.set(file,m.exports);return m.exports;
}
const p=load('b');
const ids=[
  ['heuristic.multi_step.equal_spacing_interval_count',3,['represent_positions','count_intervals','calculate_distance','check_small_case']],
  ['heuristic.multi_step.multiplicative_comparison_chain',5,['identify_reference','equivalent_units','find_one_unit','scale_target','check_comparisons']],
  ['ratio.relationship.before_after_change',6,['identify_quantities','represent_before','apply_changes','enforce_after_ratio','solve_and_verify']],
];
function req(i=0){ const [id,lev,stages]=ids[i];return {
  schemaVersion:'8C2D8B5A.v1',
  source:{questionId:'11111111-1111-4111-8111-111111111111',questionVersion:3,fingerprintSha256:'ab'.repeat(32)},
  question:{primaryLevel:lev,prompt:'This synthetic practice problem contains enough words for valid question wording.',instruction:'Find and explain.'},
  teaching:{methodId:id,requiredStages:[...stages]},
  controls:{mode:'offline_contract_check_only',store:false,learnerRelease:false}
};}
function output(i=0, answer='630 m') { const r=req(i);return {
  schemaVersion:'8C2D8B3.v1',questionId:r.source.questionId,questionVersion:r.source.questionVersion,
  methodId:r.teaching.methodId,
  steps:r.teaching.requiredStages.map((stageId,index)=>({stageId,explanation:`We explain this part carefully at teaching stage ${index+1}.`,working:index===2?'90 × 7 = 630':''})),
  finalAnswer:answer,finalCheck:'Check the quantities again using the inverse calculation.',visualPlan:{kind:'number_line',description:'Positions shown in order.'}
};}
const raw=(i=0,answer='630 m')=>JSON.stringify(output(i,answer));
const witness=(i,kind,rest)=>({source:{...req(i).source},methodId:req(i).teaching.methodId,kind,...rest});
const inspect=p.inspectOfflineSpecialistProviderResponse;
const blocked=(result,code)=>{assert.equal(result.status,'blocked');if(code) assert.equal(result.reasonCode,code);assert.equal(result.providerInvocationAllowed,false);};
const noApproval=(result)=>{for(const key of ['sourceAuthenticated','sourceFreshnessVerified','responseOriginVerified','providerInvocationAllowed','providerCalled','mathematicalCorrectnessVerified','reasoningVerified','visualsRenderedVerified','educatorApproved','captureStored','learnerReleaseAllowed']) assert.equal(result[key],false,key);};
for(const [i,method] of ids.entries()) {
  test(`${method[0]} accepts strict structured response only as review pending`,()=>{
    const r=inspect(req(i),raw(i));assert.equal(r.status,'structure_valid_review_pending');assert.equal(r.reasonCode,'STRUCTURE_ONLY_MATH_REVIEW_REQUIRED');assert.equal(r.stageCount,method[2].length);noApproval(r);
  });
  test(`${method[0]} blocks stage reordering`,()=>{
    const o=output(i);o.steps.reverse();blocked(inspect(req(i),JSON.stringify(o)),'RESPONSE_IDENTITY_OR_STAGES_INVALID');
  });
  test(`${method[0]} blocks identity mismatch`,()=>{
    const o=output(i);o.questionVersion=4;blocked(inspect(req(i),JSON.stringify(o)),'RESPONSE_IDENTITY_OR_STAGES_INVALID');
  });
}
test('bad request cannot authorize a returned provider response',()=>{
  blocked(inspect({...req(),approved:true},raw()),'INVALID_PROVIDER_REQUEST');
  blocked(inspect({...req(),source:{...req().source,questionVersion:4}},raw()),'RESPONSE_IDENTITY_OR_STAGES_INVALID');
});
test('must be a raw JSON string, not object or SDK response',()=>{
  blocked(inspect(req(),output()),'RESPONSE_MUST_BE_JSON_STRING');
  blocked(inspect(req(),null),'RESPONSE_MUST_BE_JSON_STRING');
});
test('markdown code fences, prefixes and incomplete streaming are not accepted',()=>{
  for(const x of ['```json\n'+raw()+'\n```','Here is the answer: '+raw(),raw().slice(0,-4)])blocked(inspect(req(),x),'RESPONSE_NOT_JSON');
});
test('oversized, empty response blocked',()=>{
  blocked(inspect(req(),'x'.repeat(24_001)),'RESPONSE_TOO_LARGE');
  blocked(inspect(req(),''),'RESPONSE_TOO_LARGE');
});
test('top-level duplicate keys blocked, including escaped key aliases',()=>{
  const j=raw();
  blocked(inspect(req(),j.replace('"questionId":','"questionId":"extra","questionId":')),'RESPONSE_DUPLICATE_KEYS');
  blocked(inspect(req(),j.replace('"questionId":','"\\u0071uestionId":"extra","questionId":')),'RESPONSE_DUPLICATE_KEYS');
});
test('nested duplicate keys blocked without parsing valid text as JSON tokens',()=>{
  const j=raw();
  blocked(inspect(req(),j.replace('"kind":"number_line"','"kind":"diagram","kind":"number_line"')),'RESPONSE_DUPLICATE_KEYS');
  const o=output();o.steps[0].explanation='Braces inside ordinary prose: {"stageId":"example"}, do not confuse parser.';
  assert.equal(inspect(req(),JSON.stringify(o)).status,'structure_valid_review_pending');
});
test('unsafe JSON properties cannot be inserted',()=>{
  const o=output();o.apiKey='SECRET';blocked(inspect(req(),JSON.stringify(o)),'RESPONSE_STRUCTURE_INVALID');
  const x=raw().replace('"schemaVersion":','"__proto__":{"approved":true},"schemaVersion":');
  blocked(inspect(req(),x),'RESPONSE_STRUCTURE_INVALID');
});
test('no response answer, working or source prompt in return metadata',()=>{
  const o=output();o.steps[1].working='SUPERPRIVATEWORK=837263';o.finalAnswer='SECRETANSWER';
  const r=inspect(req(),JSON.stringify(o));noApproval(r);
  assert.doesNotMatch(JSON.stringify(r),/SUPERPRIVATEWORK|SECRETANSWER|synthetic practice problem|ab{10}/);
});
test('rejects missing checking stage, malformed step, HTML, absent working',()=>{
  const a=output();a.finalCheck='no';blocked(inspect(req(),JSON.stringify(a)),'RESPONSE_STRUCTURE_INVALID');
  const b=output();b.steps[2].working='';blocked(inspect(req(),JSON.stringify(b)),'RESPONSE_STRUCTURE_INVALID');
  const c=output();c.steps[0].explanation='<script>bad</script>';blocked(inspect(req(),JSON.stringify(c)),'RESPONSE_STRUCTURE_INVALID');
});
test('rejects oversized unsafe step and incorrect diagram kind',()=>{
  const o=output();o.steps[0].explanation='x'.repeat(901);blocked(inspect(req(),JSON.stringify(o)),'RESPONSE_STRUCTURE_INVALID');
  const b=output();b.visualPlan.kind='svg_payload';blocked(inspect(req(),JSON.stringify(b)),'RESPONSE_STRUCTURE_INVALID');
});
test('equal-spacing facts recompute 90 gaps x 7, but still no math approval',()=>{
  const f=witness(0,'equal_spacing',{startIndex:5,endIndex:95,gapLength:7});
  const r=inspect(req(),raw(),f);assert.equal(r.status,'structure_valid_review_pending');assert.equal(r.arithmeticStatus,'consistent_with_unverified_facts');noApproval(r);
});
test('equal spacing rejects 91-gap answer',()=>{
  blocked(inspect(req(),raw(0,'637 m'),witness(0,'equal_spacing',{startIndex:5,endIndex:95,gapLength:7})),'ARITHMETIC_ANSWER_MISMATCH');
});
test('equal spacing rejects object-count or invalid ordinal interval witnesses',()=>{
  const x=witness(0,'equal_spacing',{startIndex:95,endIndex:5,gapLength:7});
  blocked(inspect(req(),raw(),x),'ARITHMETIC_FACTS_INVALID');
});
test('multiplicative chain checks shared unit total without floats',()=>{
  const f=witness(1,'multiplicative_chain',{relativeUnits:[1,2,3],total:120,targetIndex:2});
  const r=inspect(req(1),raw(1,'60 marbles'),f);assert.equal(r.arithmeticStatus,'consistent_with_unverified_facts');noApproval(r);
});
test('multiplicative rejects wrong answer and non-divisible unit witness',()=>{
  const f=witness(1,'multiplicative_chain',{relativeUnits:[1,2,3],total:120,targetIndex:2});
  blocked(inspect(req(1),raw(1,'50 marbles'),f),'ARITHMETIC_ANSWER_MISMATCH');
  blocked(inspect(req(1),raw(1,'60 marbles'),{...f,total:121}),'ARITHMETIC_FACTS_INVALID');
});
test('ratio before/after arithmetic requires two states and changes',()=>{
  const f=witness(2,'changing_ratio',{beforeA:3,beforeB:2,afterA:1,afterB:2,deltaA:-8,deltaB:4,target:'original_total'});
  const r=inspect(req(2),raw(2,'25 books'),f);assert.equal(r.arithmeticStatus,'consistent_with_unverified_facts');noApproval(r);
  blocked(inspect(req(2),raw(2,'30 books'),f),'ARITHMETIC_ANSWER_MISMATCH');
});
test('ratio rejects non-unique or non-whole starting units',()=>{
  const f=witness(2,'changing_ratio',{beforeA:3,beforeB:2,afterA:3,afterB:2,deltaA:0,deltaB:0,target:'original_total'});
  blocked(inspect(req(2),raw(2,'25 books'),f),'ARITHMETIC_FACTS_INVALID');
  const g={...f,afterA:1,deltaA:-7,deltaB:4};
  blocked(inspect(req(2),raw(2,'25 books'),g),'ARITHMETIC_FACTS_INVALID');
});
test('witness cannot impersonate another question, method or source fingerprint',()=>{
  const f=witness(0,'equal_spacing',{startIndex:5,endIndex:95,gapLength:7});
  blocked(inspect(req(),raw(),{...f,source:{...f.source,questionVersion:4}}),'ARITHMETIC_FACTS_INVALID');
  blocked(inspect(req(),raw(),{...f,source:{...f.source,fingerprintSha256:'cd'.repeat(32)}}),'ARITHMETIC_FACTS_INVALID');
  blocked(inspect(req(),raw(),{...f,methodId:'ratio.relationship.before_after_change'}),'ARITHMETIC_FACTS_INVALID');
});
test('witness rejects arbitrary extra fields and credential injection',()=>{
  const f=witness(0,'equal_spacing',{startIndex:5,endIndex:95,gapLength:7});
  blocked(inspect(req(),raw(),{...f,approved:true}),'ARITHMETIC_FACTS_INVALID');
  blocked(inspect(req(),raw(),{...f,access_token:'SECRET'}),'ARITHMETIC_FACTS_INVALID');
  blocked(inspect(req(),raw(),{...f,source:{...f.source,answer_data:'SECRET'}}),'ARITHMETIC_FACTS_INVALID');
});
test('non-machine-readable answers stay pending not automatically rejected or approved',()=>{
  const f=witness(0,'equal_spacing',{startIndex:5,endIndex:95,gapLength:7});
  const r=inspect(req(),raw(0,'The total distance is 630 metres.'),f);
  assert.equal(r.status,'structure_valid_review_pending');assert.equal(r.reasonCode,'SUPPLIED_FACTS_ANSWER_NOT_MACHINE_READABLE');noApproval(r);
});
test('method and witness types must agree, not cross-family',()=>{
  blocked(inspect(req(1),raw(1,'60'),witness(1,'equal_spacing',{startIndex:5,endIndex:95,gapLength:7})),'ARITHMETIC_FACTS_INVALID');
});
test('no network, database or writing operations in new pure checker',()=>{
  const src=fs.readFileSync(path.join(base,files.b),'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'');
  assert.doesNotMatch(src,/\bfetch\s*\(|\bwriteFile\s*\(|\.rpc\s*\(|\.insert\s*\(|\bprocess\.env\b|\bconsole\.|\bnew\s+OpenAILunaProvider\b/);
});
test('new source and dependencies pass strict ES2017 TypeScript without cmd.exe quoting',()=>{
  const tscScript=require.resolve('typescript/bin/tsc');
  const run=cp.spawnSync(process.execPath,[tscScript,'--noEmit','--target','ES2017','--lib','es2017,dom','--module','commonjs','--strict','--skipLibCheck',path.join(base,files.b)],{cwd:root,encoding:'utf8',timeout:30000,shell:false});
  assert.equal(run.status,0,(run.stdout||'')+'\n'+(run.stderr||''));
});
