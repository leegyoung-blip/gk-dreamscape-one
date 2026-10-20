/** Phase 8C-2C.4B: source-bound, staff-only corroboration; NEVER approval. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname,'..');
const file = path.join(root,'lib/math/teaching/student-serving/phase4E2B8C2C4BVerifiedMathEvidence.server.ts');
const code = fs.readFileSync(file,'utf8');
const eligibilityPath = path.join(root,'lib/math-intelligence/teaching/method-library/methods/phase4E2B8C2C3BApplicabilityReview.ts');
const Q='11111111-1111-4111-8111-111111111111';
const Z='22222222-2222-4222-8222-222222222222';
const ANSWER='DO_NOT_DISCLOSE_THE_ANSWER_OR_PROMPT';
const ids = Object.freeze({quizId:Z,questionId:Q});
const drafts=[
 {methodId:'heuristic.multi_step.equal_spacing_interval_count',familyId:'heuristic.multi_step',status:'draft',applicability:{levels:[3,4,5,6],domains:['measurement'],structures:['multi_step'],reasoning:['subtraction','multiplication','comparison']}},
 {methodId:'heuristic.multi_step.multiplicative_comparison_chain',familyId:'heuristic.multi_step',status:'draft',applicability:{levels:[4,5,6],domains:['whole_numbers'],structures:['multi_step'],reasoning:['comparison','multiplication','division','addition']}},
 {methodId:'ratio.relationship.before_after_change',familyId:'ratio.relationship',status:'draft',applicability:{levels:[5,6],domains:['ratio'],structures:['ratio_relationship'],reasoning:['ratio_scaling','addition','subtraction','comparison']}},
];
const P3='Trees are planted 7 m apart along a straight road. What is the distance between the 5th tree and the 95th tree?';
const P5='Bok has some marbles. James has thrice as many as Bok. David has half as many as James. Together they have 209 marbles. How many marbles does David have?';
const P6='The ratio of pencils to books was 3 : 2. After Keith bought 10 more pencils and 76 more books, the ratio became 1 : 2. How many books did Keith have at first?';
function loadTS(src, name, requires){
 const t=ts.transpileModule(src,{fileName:name,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017},reportDiagnostics:true});
 const errors=(t.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
 assert.equal(errors.length,0,'Transpile errors: '+errors.map(e=>e.messageText));
 const mod={exports:{}};
 vm.runInNewContext(t.outputText,{module:mod,exports:mod.exports,require(x){if(!(x in requires))throw Error('Unexpected dependency '+x);return requires[x];}}, {filename:name,timeout:5000});
 return mod.exports;
}
const eligibility = loadTS(fs.readFileSync(eligibilityPath,'utf8'),eligibilityPath,{
 './phase4E2B8C2C3ASpecialistDrafts':{PHASE4E2B8C2C3A_SPECIALIST_DRAFTS:drafts},
});
const configs=[
 {draft:drafts[0],level:3,prompt:P3},
 {draft:drafts[1],level:5,prompt:P5},
 {draft:drafts[2],level:6,prompt:P6},
];
function scenario(opts={}){
 const cfg={...configs[0],...opts};
 const calls=[];
 const method=cfg.draft;
 const queue=cfg.queue||{status:'pending_evidence',candidates:[{methodId:method.methodId,familyId:method.familyId,status:'requires_independently_verified_facts',methodStatus:'draft',structureEvidence:'not_verified'}]};
 const source=cfg.source || {status:'ready',sourceIdentity:{questionId:Q,quizId:Z,questionVersion:cfg.version===undefined?1:cfg.version},source:{question:{id:Q,primary_level:cfg.level,subject:'math',prompt:cfg.prompt,content:cfg.content===undefined?null:cfg.content,answer_data:{answer:ANSWER}}}};
 const requires={
  'server-only':{},
  './phase4E2B8C2C4AStaffSpecialistReview.server':{
   async inspectStaffSpecialistReviewQueue(r, q){calls.push('staff');assert.equal(q.questionId,Q); if(cfg.crashAt==='staff')throw Error(ANSWER);return queue;},
  },
  './phase4E2A3StaffSourceResolver.server':{
   async resolveStaffMathTeachingSource(r,q){calls.push('source'); if(cfg.crashAt==='source')throw Error(ANSWER);return source;},
  },
  '../../../math-intelligence/teaching/method-library/methods/phase4E2B8C2C3BApplicabilityReview': eligibility,
  '../../../math-intelligence/teaching/method-library/methods/phase4E2B8C2C3ASpecialistDrafts':{PHASE4E2B8C2C3A_SPECIALIST_DRAFTS:drafts},
 };
 const service=loadTS(code,file,requires);
 return {calls,run:(q=ids)=>service.inspectStaffMathSpecialistEvidence(new Request('https://example.invalid',{headers:{Authorization:'Bearer TEST'}}),q)};
}
function secure(out){
 const s=JSON.stringify(out);
 for (const forbidden of [ANSWER,P3,P5,P6,'answer_data','questionContent','rawFacts','jwt','SECRET'])assert.ok(!s.includes(forbidden),forbidden);
 assert.equal(out.previewOnly,true);
 assert.equal(out.teachingApproved,false);
 assert.equal(out.studentReleased,false);
 assert.equal(out.sourceTextDisclosed,false);
 assert.equal(out.evidenceFactsDisclosed,false);
 assert.equal(out.persisted,false);
 assert.equal(out.reusableApprovalProof,false);
 assert.equal(out.specialistScore,null);
 assert.equal(out.specialistRank,null);
 assert.equal(out.pedagogicalRole,'unresolved');
}
for(const cfg of configs){
 test(`real example ${cfg.draft.methodId}: source corroborated but human still required`,async()=>{
  const h=scenario(cfg);const out=await h.run();secure(out);
  assert.equal(out.status,'pending_manual_review');
  assert.equal(out.reasonCode,'EVIDENCE_8C2C4B_HUMAN_VERIFICATION_REQUIRED');
  assert.equal(out.findings.length,1);
  assert.equal(out.findings[0].methodId,cfg.draft.methodId);
  assert.equal(out.findings[0].status,'source_correlated_for_review');
  assert.equal(out.findings[0].sourceVersion,1);
  assert.deepEqual(h.calls,['staff','source']);
 });
}
for(const [label,cfg] of [
 ['circular tree spacing',{prompt:P3.replace('straight road','circular track')}],
 ['unequal gaps',{prompt:P3.replace('7 m apart','different distances apart')}],
 ['non-consecutive indexing',{prompt:P3.replace('5th tree','every fifth tree')}],
 ['question altered after earlier review',{prompt:P3+' The spacing may vary.'}],
 ['comparison additive instead',{...configs[1],prompt:P5.replace('thrice as many','3 more')}],
 ['comparison target not in group',{...configs[1],prompt:P5.replace('David have?','Emma have?')}],
 ['comparison total now describes partial sum',{...configs[1],prompt:P5.replace('Together they have','Bok and James have')}],
 ['ratio missing a stated change',{...configs[2],prompt:P6.replace('76 more books','some books')}],
 ['ratio assumes an invariant',{...configs[2],prompt:P6.replace('10 more pencils and 76 more books','10 more pencils and no new books')}],
 ['ratio path modified',{...configs[2],prompt:P6.replace('books was','books initially was')}],
 ])test(`${label} cannot become corroborated`,async()=>{
  const h=scenario(cfg);const out=await h.run();secure(out);
  assert.equal(out.status,'pending_manual_review');
  assert.equal(out.findings[0].status,'manual_verification_required');
 });
test('extra caller keys, including facts, approval and version, fail before staff gate',async()=>{
 const h=scenario();const out=await h.run({...ids,facts:{kind:'ratio_before_after_change'},approved:true,questionVersion:1});secure(out);
 assert.equal(out.status,'blocked');assert.equal(out.reasonCode,'EVIDENCE_8C2C4B_INVALID_QUERY');assert.deepEqual(h.calls,[]);
});
for(const [label,status] of [['staff denied','blocked'],['not applicable','not_applicable'],['already selected','selected']])test(label,async()=>{
 const h=scenario({queue:{status,candidates:[]}});const out=await h.run();secure(out);
 assert.equal(out.status,'blocked');assert.equal(out.stage,'staff_gate');assert.deepEqual(h.calls,['staff']);
});
for(const v of [null,0,-1,1.1,undefined])test(`unversioned/stale source version ${String(v)} blocks`,async()=>{
 const h=scenario({version:v===undefined?'missing':v});const out=await h.run();secure(out);
 assert.equal(out.status,'blocked');assert.equal(out.stage,'version');
});
test('mismatched source question ID is blocked',async()=>{
 const h=scenario({source:{status:'ready',sourceIdentity:{quizId:Z,questionId:'not-the-same',questionVersion:1},source:{question:{id:Q,prompt:P3}}}});
 const out=await h.run();secure(out);assert.equal(out.status,'blocked');assert.equal(out.stage,'version');
});
test('image or additional question content cannot be ignored',async()=>{
 const h=scenario({content:{image:'diagram.png'}});const out=await h.run();secure(out);assert.equal(out.status,'blocked');assert.equal(out.stage,'source');
});
test('staff source resolver exception is not reflected',async()=>{
 const h=scenario({crashAt:'source'});const out=await h.run();secure(out);assert.equal(out.reasonCode,'EVIDENCE_8C2C4B_INTERNAL_UNAVAILABLE');
});
test('staff gate exception is not reflected',async()=>{
 const h=scenario({crashAt:'staff'});const out=await h.run();secure(out);assert.equal(out.reasonCode,'EVIDENCE_8C2C4B_INTERNAL_UNAVAILABLE');
});
test('unknown candidate and active status cannot be accepted',async()=>{
 const h=scenario({queue:{status:'pending_evidence',candidates:[{methodId:'other.method',familyId:'other',status:'requires_independently_verified_facts',methodStatus:'active',structureEvidence:'not_verified'}]}});
 const out=await h.run();secure(out);assert.equal(out.status,'blocked');assert.equal(out.reasonCode,'EVIDENCE_8C2C4B_NO_VALID_SPECIALIST_DRAFT');
});
test('server-only audit: no HTTP route, database writes, answer access, browser evidence, or score changes',()=>{
 assert.match(code,/import 'server-only'/);
 assert.doesNotMatch(code,/export\s+(?:async\s+)?function\s+(?:POST|GET|PATCH|DELETE|PUT)\s*\(/);
 assert.doesNotMatch(code,/\.insert\(|\.update\(|\.delete\(|createClient\(|SUPABASE_SERVICE_ROLE_KEY/);
 assert.doesNotMatch(code,/return\s+(?:facts|source|question|resolved)\s*;/);
 assert.match(code,/reusableApprovalProof: false/);
 assert.match(code,/resolveStaffMathTeachingSource/);
 assert.match(code,/inspectStaffSpecialistReviewQueue/);
});
