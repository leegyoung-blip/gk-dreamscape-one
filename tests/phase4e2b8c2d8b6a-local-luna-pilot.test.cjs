'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const cp=require('node:child_process');
const pilot=require('../scripts/phase4e2b8c2d8b6a-local-luna-pilot.cjs');
function actual(f,answer=String(f.referenceAnswer)){
  return {schemaVersion:'8C2D8B3.v1',questionId:f.questionId,questionVersion:1,methodId:f.methodId,
    steps:f.requiredStages.map((stageId,i)=>({stageId,explanation:`At this stage we explain what the numbers represent and work carefully for step ${i+1}.`,working:i===2?'Use a complete calculation with a check.':''})),
    finalAnswer:answer,finalCheck:'We confirm the result by returning to the original mathematical conditions.',
    visualPlan:{kind:'bar_model',description:'A descriptive schematic for staff discussion.'}};
}
const apiBody=output=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(output)}]}]});
let callCount=0;
const makeTransport=(body,inspect)=>async (url,opts)=>{
  callCount++;
  assert.equal(url,'https://api.openai.com/v1/responses');
  assert.equal(opts.method,'POST');
  assert.equal(opts.headers.Authorization,'Bearer TEST_SECRET_KEY_1234567');
  assert.ok(opts.signal);
  const sent=JSON.parse(opts.body);assert.equal(sent.store,false);
  assert.equal(sent.model,'gpt-6-luna');
  if(inspect)inspect(sent);
  return {ok:true,json:async()=>body};
};
function setup(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamscape-8b6a-'));return {privateDir:path.join(dir,'private'),cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};}
const options=(f,outputDir,fetchImpl,extra={})=>({caseId:f.id,executeLocal:true,
  optIn:pilot.OPT_IN,apiKey:'TEST_SECRET_KEY_1234567',model:'gpt-6-luna',
  root:pilot.ROOT,outputDir,fetchImpl,now:new Date('2026-10-23T10:00:00.000Z'),...extra});
for(const f of Object.values(pilot.FIXTURES)){
  test(`${f.id} dry-run never contacts a provider`,async()=>{
    const result=await pilot.runPilot({caseId:f.id,executeLocal:false,fetchImpl:()=>{throw Error('WOULD_BE_NETWORK');}});
    assert.equal(result.status,'dry_run_only');assert.equal(result.modelInvoked,false);assert.equal(result.privateFileWritten,false);
  });
  test(`${f.id} outbound request excludes synthetic reference answer and authority`,()=>{
    const payload=pilot.createOutboundPayload(f,'gpt-6-luna');
    const sent=JSON.stringify(payload);
    assert.equal(payload.store,false);assert.equal(payload.text.format.strict,true);
    assert.doesNotMatch(sent,/referenceAnswer|correct_answer|answer_data|service_role|access_token|refresh_token|password|supabase|published_quiz/i);
    assert.ok(!sent.includes(`"referenceAnswer":${f.referenceAnswer}`));
    assert.deepEqual(JSON.parse(payload.input[1].content[0].text).requiredStages,[...f.requiredStages]);
  });
  test(`${f.id} mocked real-transport returns only review-pending private synthetic capture`,async()=>{
    const {privateDir,cleanup}=setup();const before=callCount;
    try{
      const transport=makeTransport(apiBody(actual(f)),data=>{
        assert.equal(data.text.format.schema.additionalProperties,false);
        assert.equal(data.input[1].content[0].text.includes('referenceAnswer'),false);
      });
      const result=await pilot.runPilot(options(f,privateDir,transport));
      assert.equal(callCount,before+1);assert.equal(result.modelInvoked,true);
      assert.equal(result.privateFileWritten,true);assert.equal(result.status,'synthetic_luna_output_saved_review_pending');
      assert.equal(result.learnerRelease,false);assert.equal(result.mathematicallyApproved,false);
      assert.equal(path.dirname(result.privateOutputPath),privateDir);
      assert.ok(fs.existsSync(result.privateOutputPath));
      const saved=JSON.parse(fs.readFileSync(result.privateOutputPath,'utf8'));
      assert.equal(saved.origin,'actual_luna_api_call_on_synthetic_fixture');
      assert.equal(saved.isProductionQuestion,false);assert.equal(saved.sourceAuthenticated,false);
      assert.equal(saved.staffSessionVerified,false);assert.equal(saved.checks.teacherApproval,false);
      assert.equal(saved.checks.phase8C2D7Comparable,false);
      assert.equal(saved.checks.structure,'structure_valid_review_pending');
      assert.equal(saved.modelResponse.finalAnswer,String(f.referenceAnswer));
      assert.equal(fs.readFileSync(result.privateOutputPath,'utf8').includes('TEST_SECRET_KEY'),false);
    }finally{cleanup();}
  });
  test(`${f.id} rejects wrong numerical final answer without saving`,async()=>{
    const {privateDir,cleanup}=setup();
    try{
      await assert.rejects(pilot.runPilot(options(f,privateDir,makeTransport(apiBody(actual(f,'999'))))),/SYNTHETIC_REFERENCE_ANSWER_MISMATCH/);
      assert.equal(fs.existsSync(privateDir),false);
    }finally{cleanup();}
  });
  test(`${f.id} rejects incorrect teaching stage without saving`,async()=>{
    const {privateDir,cleanup}=setup();
    try{
      const o=actual(f);o.steps.reverse();
      await assert.rejects(pilot.runPilot(options(f,privateDir,makeTransport(apiBody(o)))),/MODEL_RESPONSE_REJECTED_/);
      assert.equal(fs.existsSync(privateDir),false);
    }finally{cleanup();}
  });
}
test('missing opt-in blocks before network',async()=>{
  const f=pilot.FIXTURES.equal_spacing;const {privateDir,cleanup}=setup();
  try{await assert.rejects(pilot.runPilot(options(f,privateDir,()=>{throw Error('NETWORK');},{optIn:''})),/EXPLICIT_SYNTHETIC_OPT_IN_REQUIRED/);
    assert.equal(fs.existsSync(privateDir),false);
  }finally{cleanup();}
});
test('missing key blocks before network',async()=>{
  const f=pilot.FIXTURES.equal_spacing;const {privateDir,cleanup}=setup();
  try{await assert.rejects(pilot.runPilot(options(f,privateDir,()=>{throw Error('NETWORK');},{apiKey:''})),/OPENAI_API_KEY_REQUIRED/);
    assert.equal(fs.existsSync(privateDir),false);
  }finally{cleanup();}
});
test('invalid model blocks before network',async()=>{
  const f=pilot.FIXTURES.equal_spacing;const {privateDir,cleanup}=setup();
  try{await assert.rejects(pilot.runPilot(options(f,privateDir,()=>{throw Error('NETWORK');},{model:'gpt-6-luna\nHACK'})),/INVALID_MODEL_NAME/);
  }finally{cleanup();}
});
test('malformed JSON and incomplete responses cannot be saved',async()=>{
  const f=pilot.FIXTURES.equal_spacing;const {privateDir,cleanup}=setup();
  try{
    await assert.rejects(pilot.runPilot(options(f,privateDir,makeTransport({output:[]}))),/PROVIDER_OUTPUT_INVALID/);
    await assert.rejects(pilot.runPilot(options(f,privateDir,makeTransport({status:'incomplete',output:[]}))),/PROVIDER_OUTPUT_UNAVAILABLE/);
    await assert.rejects(pilot.runPilot(options(f,privateDir,makeTransport({output:[{content:[{type:'output_text',text:'{not json}'}]}]}))),/MODEL_RESPONSE_REJECTED_/);
    assert.equal(fs.existsSync(privateDir),false);
  }finally{cleanup();}
});
test('provider refusal is denied and never saved',async()=>{
  const f=pilot.FIXTURES.equal_spacing;const {privateDir,cleanup}=setup();
  try{await assert.rejects(pilot.runPilot(options(f,privateDir,makeTransport({output:[{content:[{type:'refusal',refusal:'refused'}]}]}))),/PROVIDER_REFUSAL/);
  assert.equal(fs.existsSync(privateDir),false);
  }finally{cleanup();}
});
test('provider network and HTTP failure block without exposing remote body',async()=>{
  const f=pilot.FIXTURES.equal_spacing;const {privateDir,cleanup}=setup();
  try{
    await assert.rejects(pilot.runPilot(options(f,privateDir,async()=>{throw Error('secret provider data');})),/PROVIDER_NETWORK_FAILED/);
    await assert.rejects(pilot.runPilot(options(f,privateDir,async()=>({ok:false,status:429,json:async()=>({error:'PRIVATE'})}))),/PROVIDER_HTTP_FAILED/);
    assert.equal(fs.existsSync(privateDir),false);
  }finally{cleanup();}
});
test('invalid request identity cannot bypass existing 8B-5A shape rules',()=>{
 const f=pilot.FIXTURES.equal_spacing;const a=pilot.createRequest(f);
 assert.equal(a.controls.mode,'offline_contract_check_only');
 assert.equal(a.controls.store,false);assert.equal(a.controls.learnerRelease,false);
 assert.ok(/^[a-f0-9]{64}$/.test(a.source.fingerprintSha256));
});
test('JSON field extra and forged approval rejected by actual reviewer',async()=>{
 const f=pilot.FIXTURES.equal_spacing;const {privateDir,cleanup}=setup();
 try{const o=actual(f);o.approved=true;
 await assert.rejects(pilot.runPilot(options(f,privateDir,makeTransport(apiBody(o)))),/MODEL_RESPONSE_REJECTED_/);
 assert.equal(fs.existsSync(privateDir),false);
 }finally{cleanup();}
});
test('duplicate JSON identity rejected by actual reviewer',async()=>{
 const f=pilot.FIXTURES.equal_spacing;const {privateDir,cleanup}=setup();
 try{const raw=JSON.stringify(actual(f)).replace('"questionId":','"questionId":"FAKE","questionId":');
 const fake={output:[{content:[{type:'output_text',text:raw}]}]};
 await assert.rejects(pilot.runPilot(options(f,privateDir,makeTransport(fake))),/MODEL_RESPONSE_REJECTED_RESPONSE_DUPLICATE_KEYS/);
 assert.equal(fs.existsSync(privateDir),false);
 }finally{cleanup();}
});
test('unsafe output directory under the repo is blocked',()=>{
 assert.throws(()=>pilot.validateOutputDir(path.join(pilot.ROOT,'private-review')),/OUTPUT_INSIDE_REPO/);
 assert.throws(()=>pilot.validateOutputDir('relative/dir'),/PRIVATE_OUTPUT_MUST_BE_ABSOLUTE/);
});
test('symlink output directory is denied when supported',()=>{
 const {privateDir,cleanup}=setup();
 try{const target=path.join(path.dirname(privateDir),'target');fs.mkdirSync(target);
 const link=path.join(path.dirname(privateDir),'link');
 try{fs.symlinkSync(target,link,'dir');}catch(e){if(['EPERM','EACCES','ENOTSUP'].includes(e.code))return;throw e;}
 assert.throws(()=>pilot.validateOutputDir(link),/OUTPUT_SYMLINK_BLOCKED/);
 }finally{cleanup();}
});
test('unknown flags and unrecognised questions cannot trigger a model call',()=>{
 assert.throws(()=>pilot.parseCli(['--execute-local','--case','published_question','--output-dir',os.tmpdir()]),/UNKNOWN_SYNTHETIC_CASE/);
 assert.throws(()=>pilot.parseCli(['--execute-local','--url','https:\/\/evil.test','--output-dir',os.tmpdir()]),/UNKNOWN_CLI_ARGUMENT/);
 assert.throws(()=>pilot.parseCli(['--execute-local','--case','equal_spacing']),/PRIVATE_OUTPUT_REQUIRED/);
 assert.throws(()=>pilot.parseCli(['--execute-local','--dry-run']),/CONFLICTING_MODES/);
 assert.throws(()=>pilot.parseCli(['--dry-run','--output-dir',os.tmpdir()]),/OUTPUT_ONLY_VALID_FOR_EXECUTION/);
});
test('single number extraction does not pretend to parse full reasoning',()=>{
 assert.equal(pilot.parseNumericFinalAnswer('104 m'),104);
 assert.equal(pilot.parseNumericFinalAnswer('104 or 105 metres'),null);
 assert.equal(pilot.parseNumericFinalAnswer('one hundred metres'),null);
});
test('default local CLI is a network-free dry run',()=>{
 const exec=cp.spawnSync(process.execPath,[path.join(pilot.ROOT,'scripts/phase4e2b8c2d8b6a-local-luna-pilot.cjs')],{encoding:'utf8',timeout:30000,env:{...process.env,OPENAI_API_KEY:''}});
 assert.equal(exec.status,0,exec.stderr);assert.equal(JSON.parse(exec.stdout).status,'dry_run_only');
});
test('script is not an app route or student integration and has no Supabase references',()=>{
 const s=fs.readFileSync(path.join(pilot.ROOT,'scripts/phase4e2b8c2d8b6a-local-luna-pilot.cjs'),'utf8');
 assert.doesNotMatch(s,/from\s*\(\s*['"]profiles['"]\)|['"]@supabase\/supabase-js['"]|serviceRoleKey|\.insert\s*\(/i);
});
