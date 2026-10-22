'use strict';
const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const cp=require('node:child_process');
const root=process.cwd();
const rel='lib/math/teaching/student-serving/phase4E2B8C2D8B2AuthoringInputPolicy.ts';
const wrapperRel='lib/math/teaching/student-serving/phase4E2B8C2D8B2TrustedGeneratorBridge.server.ts';
const source=fs.readFileSync(path.join(root,rel),'utf8');
const wrapper=fs.readFileSync(path.join(root,wrapperRel),'utf8');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dreamscape-8b2-'));
after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
const tscArgs=['--target','ES2017','--module','commonjs','--strict','--skipLibCheck','--outDir',tmp,rel];
// Invoke the installed TypeScript compiler with Node directly. This avoids
// cmd.exe /s /c nested-quote corruption on Windows (TS6231: '"commonjs"').
// Resolving from the project root uses the repository's own TypeScript version.
const tscCli=require.resolve('typescript/bin/tsc',{paths:[root]});
const result=cp.spawnSync(process.execPath,[tscCli,...tscArgs],
  {cwd:root,encoding:'utf8',timeout:30000});
assert.equal(result.status,0,`Policy typecheck failed: ${result.stdout}\n${result.stderr}`);
const {mapTrustedQuestionToPrivateAuthoringDraft:map}=require(path.join(tmp,'phase4E2B8C2D8B2AuthoringInputPolicy.js'));
const id='11111111-1111-4111-8111-111111111111';
const base=()=>({id,subject:'math',primary_level:3,difficulty:3,question_type:'short_text',
  prompt:'Trees are planted 7 m apart along a straight road. What is the distance between the 5th and 95th tree?',
  instruction:'Find the distance.',content:null,topic_title:'Measurement',skill:'Equal spacing',
  answer_data:{secretAnswer:630},explanation:'private answer',correct_answer:'PRIVATE',
  reviewed_by:'someone',access_token:'TOKEN'});
test('valid trusted text-only source yields private-only mapping',()=>{
  const o=map(base(),id,2);
  assert.equal(o.status,'mapped_private_only');
  assert.equal(o.providerInvocationAllowed,false);
  assert.equal(o.learnerReleaseAllowed,false);
  assert.equal(o.sourceVersion,2);
});
test('strict output field allowlist omits answer keys and reviewer metadata',()=>{
  const o=map(base(),id,2);
  assert.equal(o.status,'mapped_private_only');
  assert.deepEqual(Object.keys(o.privateDraft).sort(),
    ['id','subject','primary_level','topic_title','skill','difficulty','question_type','instruction','prompt','content','answer_data','correct_answer','explanation'].sort());
  const safe=JSON.stringify(o.privateDraft);
  for(const bad of ['secretAnswer','PRIVATE','someone','TOKEN','reviewed_by','access_token'])assert.equal(safe.includes(bad),false,bad);
  assert.equal(o.privateDraft.answer_data,null);
  assert.equal(o.privateDraft.correct_answer,null);
  assert.equal(o.privateDraft.explanation,null);
});
test('different question ID rejected',()=>assert.equal(map(base(),'22222222-2222-4222-8222-222222222222',2).status,'blocked'));
test('non-math subject rejected',()=>assert.equal(map({...base(),subject:'english'},id,2).status,'blocked'));
test('unversioned question rejected',()=>assert.equal(map(base(),id,0).status,'blocked'));
test('nonpositive learner level rejected',()=>assert.equal(map({...base(),primary_level:0},id,2).status,'blocked'));
test('relative difficulty outside 1–5 rejected',()=>assert.equal(map({...base(),difficulty:6},id,2).status,'blocked'));
test('MCQ not silently stripped of options',()=>assert.equal(map({...base(),question_type:'multiple_choice'},id,2).status,'blocked'));
test('nested content including hidden answers rejected',()=>assert.equal(map({...base(),content:{correct_answer:630}},id,2).status,'blocked'));
test('nonempty option list rejected',()=>assert.equal(map({...base(),content:{options:[{text:'one'}]}},id,2).status,'blocked'));
test('media assets rejected',()=>assert.equal(map({...base(),assets:[{url:'diagram'}]},id,2).status,'blocked'));
test('HTML-bearing prompt rejected',()=>assert.equal(map({...base(),prompt:'A <b>math</b> question'},id,2).status,'blocked'));
test('control-character prompt rejected',()=>assert.equal(map({...base(),prompt:base().prompt+'\nsecret'},id,2).status,'blocked'));
test('oversized prompt rejected',()=>assert.equal(map({...base(),prompt:'A'.repeat(1501)},id,2).status,'blocked'));
test('ordinary example maps without requiring answer serialization',()=>{
  const q={...base(),answer_data:{nested:{lotsofdata:'SECRET'}},content:{}};
  const out=map(q,id,2);
  assert.equal(out.status,'mapped_private_only');
  assert.equal(JSON.stringify(out.privateDraft).includes('SECRET'),false);
});
test('mapping policy never contains network or database APIs',()=>{
  assert.doesNotMatch(source,/\bfetch\s*\(|\.rpc\s*\(|\.insert\s*\(|new\s+OpenAILunaProvider\b/);
});
test('bridge imports existing authenticated staff source and 4D gate',()=>{
  assert.match(wrapper,/resolveStaffMathTeachingSource/);
  assert.match(wrapper,/inspectStaffMathSpecialistShadowComparison/);
  assert.match(wrapper,/normaliseMathIntelligenceQuestion/);
});
test('bridge enforces exact two-identifier request shape',()=>{
  assert.match(wrapper,/keys\.length===2/);
  assert.match(wrapper,/typeof obj\.quizId==='string'/);
  assert.match(wrapper,/typeof obj\.questionId==='string'/);
});
test('bridge re-reads authoritative source and rejects changed content',()=>{
  const matches=wrapper.match(/resolveStaffMathTeachingSource\(request,query\)/g)||[];
  assert.equal(matches.length,2);
  assert.match(wrapper,/SOURCE_CHANGED/);
  assert.match(wrapper,/JSON\.stringify\(latest\.source\.question\)/);
});
test('bridge never calls any authoring generator, provider, or writer',()=>{
  assert.doesNotMatch(wrapper,/\bgenerateMathVisualAndTeachingForQuestion\s*\(/);
  assert.doesNotMatch(wrapper,/\bnew\s+OpenAILunaProvider\s*\(/);
  assert.doesNotMatch(wrapper,/\.rpc\s*\(|\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\bfetch\s*\(/);
});
test('bridge cannot return source question or captured model content',()=>{
  assert.match(wrapper,/canInvokeProvider:false/);
  assert.match(wrapper,/canCaptureRealExplanation:false/);
  assert.match(wrapper,/studentReleased:false/);
  assert.match(wrapper,/humanVerified:false/);
  assert.match(wrapper,/persisted:false/);
  assert.doesNotMatch(wrapper,/JSON\.stringify\(normalized\)/);
});
