'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');

// No child_process/shell; Windows and macOS are equally supported.
const root=process.cwd();
const rel='lib/math/teaching/student-serving/phase4E2B8C2D8B3ExplanationCaptureContract.ts';
const file=path.join(root,rel);
const source=fs.readFileSync(file,'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,strict:true},reportDiagnostics:true});
assert.equal((compiled.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0,'TypeScript transpilation diagnostics');
const m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(path.dirname(file));m._compile(compiled.outputText,file);
const {inspectOfflineSpecialistExplanationInput:input,inspectOfflineSpecialistExplanationStructure:output}=m.exports;
const id='11111111-1111-4111-8111-111111111111';
const defs={
 spacing:{method:'heuristic.multi_step.equal_spacing_interval_count',level:3,stages:['represent_positions','count_intervals','calculate_distance','check_small_case']},
 comparison:{method:'heuristic.multi_step.multiplicative_comparison_chain',level:5,stages:['identify_reference','equivalent_units','find_one_unit','scale_target','check_comparisons']},
 ratio:{method:'ratio.relationship.before_after_change',level:6,stages:['identify_quantities','represent_before','apply_changes','enforce_after_ratio','solve_and_verify']},
};
const mapping=(level=3)=>({status:'mapped_private_only',mappingVersion:'8C2D8B2.v1',sourceVersion:2,
 providerInvocationAllowed:false,learnerReleaseAllowed:false,
 privateDraft:{id,subject:'math',primary_level:level,topic_title:'Maths',skill:'Word problems',difficulty:3,
 question_type:'short_text',instruction:'Find the result.',
 prompt:'Trees are planted 7 m apart. Find the distance between tree 5 and tree 95.',
 content:{},answer_data:null,correct_answer:null,explanation:null}});
const intent=(which='spacing')=>input(mapping(defs[which].level),defs[which].method);
const explanation=(which='spacing')=>({schemaVersion:'8C2D8B3.v1',questionId:id,questionVersion:2,methodId:defs[which].method,
 steps:defs[which].stages.map((stageId,i)=>({stageId,explanation:'Explain the mathematical relationship and why this stage is needed '+i+'.',working:i===2?'95 - 5 = 90; 90 x 7 = 630':'Using equal quantities in this stage.'})),
 finalAnswer:'630 m',finalCheck:'The adjacent trees have one gap, and the units are metres.',
 visualPlan:{kind:'number_line',description:'Show positions and the equal gaps.'}});

for(const which of Object.keys(defs)){
 test(`${which}: valid mapped source is contract-only and cannot invoke provider`,()=>{
   const x=intent(which);
   assert.equal(x.status,'offline_contract_ready_capture_disabled');
   assert.equal(x.sourceAuthenticated,false);
   assert.equal(x.sourceFingerprintVerified,false);
   assert.equal(x.providerInvocationAllowed,false);
   assert.equal(x.captureStored,false);
   assert.equal(x.humanApproved,false);
   assert.equal(x.learnerReleaseAllowed,false);
   assert.equal(JSON.stringify(x).includes('Trees are'),false);
 });
 test(`${which}: structurally valid response remains unverified`,()=>{
   const x=output(intent(which),explanation(which));
   assert.equal(x.status,'structure_valid_review_pending');
   assert.equal(x.mathematicallyVerified,false);
   assert.equal(x.originalGenerationVerified,false);
   assert.equal(x.captureStored,false);
   assert.equal(x.educatorApproved,false);
   assert.equal(x.learnerReleaseAllowed,false);
   assert.equal(x.stepCount,defs[which].stages.length);
   assert.equal(JSON.stringify(x).includes('630 m'),false);
 });
}

test('rejects missing staff mapping shape',()=>assert.equal(input({},defs.spacing.method).status,'blocked'));
test('rejects legacy/unknown mapping version',()=>assert.equal(input({...mapping(),mappingVersion:'v0'},defs.spacing.method).status,'blocked'));
test('rejects arbitrarily-added authority key in mapping',()=>assert.equal(input({...mapping(),approved:true},defs.spacing.method).status,'blocked'));
test('rejects mapping that claims provider authorisation',()=>assert.equal(input({...mapping(),providerInvocationAllowed:true},defs.spacing.method).status,'blocked'));
test('rejects model-side leaked correct answer',()=>assert.equal(input({...mapping(),privateDraft:{...mapping().privateDraft,correct_answer:'PRIVATE_KEY'}},defs.spacing.method).status,'blocked'));
test('rejects model-side leaked solution text',()=>assert.equal(input({...mapping(),privateDraft:{...mapping().privateDraft,explanation:'SECRET'}},defs.spacing.method).status,'blocked'));
test('rejects unexpected draft metadata',()=>assert.equal(input({...mapping(),privateDraft:{...mapping().privateDraft,accessToken:'SECRET'}},defs.spacing.method).status,'blocked'));
test('rejects nested content',()=>assert.equal(input({...mapping(),privateDraft:{...mapping().privateDraft,content:{answer_data:'HIDDEN'}}},defs.spacing.method).status,'blocked'));
test('rejects ambiguous question type',()=>assert.equal(input({...mapping(),privateDraft:{...mapping().privateDraft,question_type:'multiple_choice'}},defs.spacing.method).status,'blocked'));
test('rejects unversioned source',()=>assert.equal(input({...mapping(),sourceVersion:0},defs.spacing.method).status,'blocked'));
test('rejects unrecognised specialist method',()=>assert.equal(input(mapping(),'ratio.unsupported').status,'blocked'));
test('rejects unsupported P2 specialist method',()=>assert.equal(input(mapping(2),defs.spacing.method).status,'blocked'));
test('rejects HTML-bearing content',()=>assert.equal(input({...mapping(),privateDraft:{...mapping().privateDraft,prompt:'<script>alert(1)</script> Find number.'}},defs.spacing.method).status,'blocked'));
test('rejects oversized text',()=>assert.equal(input({...mapping(),privateDraft:{...mapping().privateDraft,prompt:'x'.repeat(1501)}},defs.spacing.method).status,'blocked'));
test('rejects answer-bearing extra response field',()=>assert.equal(output(intent(),{...explanation(),answerKey:'PRIVATE'}).status,'blocked'));
test('rejects model claiming approved',()=>assert.equal(output(intent(),{...explanation(),approved:true}).status,'blocked'));
test('rejects output identity mismatch',()=>assert.equal(output(intent(),{...explanation(),questionId:'22222222-2222-4222-8222-222222222222'}).reasonCode,'OUTPUT_IDENTITY_MISMATCH'));
test('rejects output source version mismatch',()=>assert.equal(output(intent(),{...explanation(),questionVersion:3}).reasonCode,'OUTPUT_IDENTITY_MISMATCH'));
test('rejects specialist ID mismatch',()=>assert.equal(output(intent(),{...explanation(),methodId:defs.ratio.method}).reasonCode,'OUTPUT_IDENTITY_MISMATCH'));
test('rejects stage reordering',()=>{
 const x=explanation();[x.steps[0],x.steps[1]]=[x.steps[1],x.steps[0]];
 assert.equal(output(intent(),x).reasonCode,'OUTPUT_STAGE_MISMATCH');
});
test('rejects missing stages',()=>assert.equal(output(intent(),{...explanation(),steps:explanation().steps.slice(1)}).reasonCode,'OUTPUT_STAGE_MISMATCH'));
test('rejects extra stage action arguments',()=>{
 const x=explanation();x.steps[0].toolCall='fetch(secret)';
 assert.equal(output(intent(),x).reasonCode,'OUTPUT_STAGE_MISMATCH');
});
test('rejects missing final answer',()=>assert.equal(output(intent(),{...explanation(),finalAnswer:''}).reasonCode,'OUTPUT_CONTENT_INVALID'));
test('rejects missing self-check',()=>assert.equal(output(intent(),{...explanation(),finalCheck:''}).reasonCode,'OUTPUT_CONTENT_INVALID'));
test('rejects unsupported visual object',()=>assert.equal(output(intent(),{...explanation(),visualPlan:{kind:'svg',description:'some graphic'}}).reasonCode,'OUTPUT_CONTENT_INVALID'));
test('rejects visual assets in the response',()=>assert.equal(output(intent(),{...explanation(),visualPlan:{...explanation().visualPlan,svg:'<svg/>'}}).reasonCode,'OUTPUT_CONTENT_INVALID'));
test('rejects HTML script inside step',()=>{
 const x=explanation();x.steps[0].explanation='<script>alert(1)</script> something';
 assert.equal(output(intent(),x).reasonCode,'OUTPUT_CONTENT_INVALID');
});
test('rejects empty computations for every teaching step',()=>{
 const x=explanation();x.steps.forEach(s=>s.working='');
 assert.equal(output(intent(),x).reasonCode,'OUTPUT_CONTENT_INVALID');
});
test('rejects tampered contract stage list',()=>{
 const x={...intent(),requiredStages:['foo']};
 assert.equal(output(x,explanation()).reasonCode,'INPUT_CONTRACT_INVALID');
});
test('never returns raw generated answer/explanation',()=>{
 const x=output(intent(),explanation());
 assert.equal(JSON.stringify(x).includes('630 m'),false);
 assert.equal(JSON.stringify(x).includes('Trees are'),false);
});
test('offline module cannot call provider, database or fs',()=>{
 assert.doesNotMatch(source,/\bfetch\s*\(|\.rpc\s*\(|\bnew\s+OpenAILunaProvider\b|\bwriteFile\b|\.insert\s*\(/);
});
test('three method IDs match existing inactive draft method library',()=>{
 const p=path.join(root,'lib/math-intelligence/teaching/method-library/methods/phase4E2B8C2C3ASpecialistDrafts.ts');
 const draft=fs.readFileSync(p,'utf8');
 for(const d of Object.values(defs)){
   assert.ok(draft.includes(`methodId: '${d.method}'`));
   for(const s of d.stages)assert.ok(draft.includes(`stage('${s}'`));
 }
 assert.match(draft,/status: 'draft'/);
});
test('existing Luna provider currently includes answers and must remain disconnected',()=>{
 const provider=fs.readFileSync(path.join(root,'lib/math-intelligence/ai/OpenAILunaProvider.ts'),'utf8');
 assert.match(provider,/correct_answer:\s*input\.correct_answer/);
 assert.match(provider,/explanation:\s*input\.explanation/);
});
