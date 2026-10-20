/** Staff-only 8C-2C.4A gate: no browser-provided specialist facts or approvals. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const file=path.resolve(__dirname,'../lib/math/teaching/student-serving/phase4E2B8C2C4AStaffSpecialistReview.server.ts');
const source=fs.readFileSync(file,'utf8');
const S='SECRET_ANSWER_NEVER_EXPOSED';
const Q='11111111-1111-4111-8111-111111111111';
const Z='22222222-2222-4222-8222-222222222222';
const drafts=[
 {methodId:'heuristic.multi_step.equal_spacing_interval_count',familyId:'heuristic.multi_step',status:'draft',applicability:{levels:[3,4,5,6],domains:['measurement'],structures:['multi_step'],reasoning:['subtraction','multiplication']}},
 {methodId:'heuristic.multi_step.multiplicative_comparison_chain',familyId:'heuristic.multi_step',status:'draft',applicability:{levels:[4,5,6],domains:['whole_numbers'],structures:['multi_step'],reasoning:['comparison','multiplication']}},
 {methodId:'ratio.relationship.before_after_change',familyId:'ratio.relationship',status:'draft',applicability:{levels:[5,6],domains:['ratio'],structures:['ratio_relationship'],reasoning:['ratio_scaling','addition']}},
];
function scenario(extra={}){
 const calls=[];
 const cfg={level:3,domain:'measurement',structure:'multi_step',reasoning:['subtraction','multiplication'],family:'heuristic.multi_step',...extra};
 const requirement={learnerLevel:cfg.level,domain:cfg.domain,problemStructure:cfg.structure,requiredReasoning:cfg.reasoning,primaryFamilies:cfg.families||[cfg.family]};
 const ready=cfg.access || {status:'ready',source:{question:{answer_data:{answer:S}},quizId:Z},sourceIdentity:{questionId:Q,quizId:Z,questionVersion:2}};
 const canonical={identity:{quizId:cfg.canonicalQuizId||Z,questionId:cfg.canonicalQuestionId||Q},diagnostics:{readyForUnderstanding:cfg.canonicalReady!==false}};
 const understanding={readyForMethodSelection:cfg.understandingReady!==false,gateDiagnostics:{readyFor4C:cfg.gateReady!==false,blockers:cfg.blockers||[]}};
 const built=cfg.built || {status:'ready'};
 const envelope={questionId:cfg.envelopeQuestionId||Q,contract:{visual:{hasVisual:!!cfg.hasVisual}}};
 const selection=cfg.selection || {status:'ambiguous',primaryFamilies:cfg.selectorFamilies||[cfg.family]};
 const mocks={
  'server-only':{},
  '../../../math-intelligence/teaching/canonical/normalizeCanonicalTeachingQuestion':{normalizeCanonicalTeachingQuestion(src){calls.push('canonical');assert.equal(src.question.answer_data.answer,S);if(cfg.crashAt==='canonical')throw Error(S);return canonical;}},
  '../../../math-intelligence/teaching/understanding/understandTeachingQuestion':{understandTeachingQuestion(){calls.push('understanding');if(cfg.crashAt==='understanding')throw Error(S);return understanding;}},
  '../../../math-intelligence/teaching/contract/buildTeachingContract':{buildTeachingContract(){calls.push('contract');return built;}},
  '../../../math-intelligence/teaching/contract/consumer/boundary':{
   createPhase4BMethodLibraryContractView(){calls.push('4B');return cfg.consumerBlocked?{status:'blocked'}:{status:'ready',envelope};},
   createPhase4CStrategySelectorContractView(){calls.push('4C');return {status:'ready',envelope};},
  },
  '../../../math-intelligence/teaching/method-library/taxonomy/buildCoverageRequirement':{
   buildPhase4BQuestionCoverageRequirement(){calls.push('coverage');return cfg.uncovered?{status:'uncovered'}:{status:'covered',requirement};}
  },
  '../../../math-intelligence/teaching/method-library/methods/phase4E2B8C2C3ASpecialistDrafts':{PHASE4E2B8C2C3A_SPECIALIST_DRAFTS:cfg.drafts||drafts},
  '../strategy-selection/phase4C4Adapter':{
   phase4AConsumerPayloadsAgree(){calls.push('payload-match');return cfg.samePayload!==false;},
   selectFromPhase4A4B(args){calls.push('select');assert.ok(!Object.prototype.hasOwnProperty.call(args,'reviewedMathEvidence'));assert.ok(!Object.prototype.hasOwnProperty.call(args,'learnerPrerequisiteEvidence'));return selection;},
  },
  './phase4E2A3StaffSourceResolver.server':{async resolveStaffMathTeachingSource(request, ids){calls.push('resolver');assert.equal(ids.questionId,Q);assert.equal(ids.quizId,Z);if(cfg.crashAt==='resolver')throw Error(S);return ready;}},
 };
 const out=ts.transpileModule(source,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017},reportDiagnostics:true});
 assert.deepEqual((out.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error),[]);
 const module={exports:{}};
 vm.runInNewContext(out.outputText,{module,exports:module.exports,require(spec){if(!(spec in mocks))throw new Error('Unexpected dependency '+spec);return mocks[spec];},Object,Set}, {filename:file,timeout:8000});
 return {calls,call:(ids={quizId:Z,questionId:Q})=>module.exports.inspectStaffSpecialistReviewQueue(new Request('https://example.invalid'),ids)};
}
const safe=(r)=>{const s=JSON.stringify(r);assert.ok(!s.includes(S));assert.ok(!s.includes('prompt'));assert.ok(!s.includes('answer_data'));assert.equal(r.previewOnly,true);assert.equal(r.teachingApproved,false);assert.equal(r.studentReleased,false);assert.equal(r.specialistScore,null);assert.equal(r.specialistRank,null);assert.equal(r.pedagogicalRole,'unresolved');};
const positive=[
 {level:3,domain:'measurement',structure:'multi_step',reasoning:['subtraction','multiplication'],family:'heuristic.multi_step',expected:'heuristic.multi_step.equal_spacing_interval_count'},
 {level:5,domain:'whole_numbers',structure:'multi_step',reasoning:['comparison','multiplication'],family:'heuristic.multi_step',expected:'heuristic.multi_step.multiplicative_comparison_chain'},
 {level:6,domain:'ratio',structure:'ratio_relationship',reasoning:['ratio_scaling','addition'],family:'ratio.relationship',expected:'ratio.relationship.before_after_change'},
];
for(const cfg of positive){
 test(`8C-2C.4A queues ${cfg.expected} for facts review only`,async()=>{
  const h=scenario(cfg);const r=await h.call();safe(r);
  assert.equal(r.status,'pending_evidence');assert.equal(r.reasonCode,'SPECIALIST_8C2C4A_FACTS_NOT_VERIFIED');
  assert.deepEqual(Array.from(r.candidates.map(c=>c.methodId)),[cfg.expected]);
  assert.equal(r.candidates[0].structureEvidence,'not_verified');
  assert.equal(r.candidates[0].status,'requires_independently_verified_facts');
  assert.equal(r.candidates[0].methodStatus,'draft');
  assert.ok(h.calls.indexOf('resolver')<h.calls.indexOf('canonical'));
  assert.ok(h.calls.indexOf('payload-match')<h.calls.indexOf('select'));
 });
}
test('denied staff never reaches canonical or scoring',async()=>{
 const h=scenario({access:{status:'blocked',reason:'NOT_AUTHORIZED'}});
 const r=await h.call();safe(r);assert.equal(r.status,'blocked');assert.equal(r.stage,'access');assert.deepEqual(h.calls,['resolver']);
});
for(const [title,config,stage] of [
 ['canonical identity wrong',{canonicalQuestionId:'bad'},'canonical'],
 ['canonical readiness missing',{canonicalReady:false},'canonical'],
 ['understanding gate blocked',{gateReady:false},'understanding'],
 ['understanding blockers present',{blockers:[{code:'SOME_BLOCKER'}]},'understanding'],
 ['understanding not ready',{understandingReady:false},'understanding'],
 ['contract not ready',{built:{status:'blocked'}},'contract'],
 ['consumer contract blocked',{consumerBlocked:true},'consumer'],
 ['consumer payload differs',{samePayload:false},'consumer'],
 ['consumer question identity changed',{envelopeQuestionId:'bad'},'consumer'],
 ['taxonomy not covered',{uncovered:true},'taxonomy'],
 ['4C blocked',{selection:{status:'blocked',primaryFamilies:[]}},'selector'],
])test(title,async()=>{const r=await scenario(config).call();safe(r);assert.equal(r.status,'blocked');assert.equal(r.stage,stage);});
for(const [title,config,reasonCode] of [
 ['4C already selected',{selection:{status:'selected',primaryFamilies:['heuristic.multi_step']}},'SPECIALIST_8C2C4A_4C_NOT_AMBIGUOUS'],
 ['4C cross-family unresolved',{families:['heuristic.multi_step','ratio.relationship'],selectorFamilies:['heuristic.multi_step','ratio.relationship']},'SPECIALIST_8C2C4A_CROSS_FAMILY_UNRESOLVED'],
 ['4C family mismatches 4B requirement',{selectorFamilies:['ratio.relationship']},'SPECIALIST_8C2C4A_CROSS_FAMILY_UNRESOLVED'],
 ['visual remains unreviewed',{hasVisual:true},'SPECIALIST_8C2C4A_VISUAL_REVIEW_REQUIRED'],
 ['wrong domain',{domain:'time'},'SPECIALIST_8C2C4A_NO_TAXONOMY_MATCH'],
 ['wrong level',{level:1},'SPECIALIST_8C2C4A_NO_TAXONOMY_MATCH'],
 ['wrong structure',{structure:'direct_calculation'},'SPECIALIST_8C2C4A_NO_TAXONOMY_MATCH'],
 ['wrong reasoning',{reasoning:['classification']},'SPECIALIST_8C2C4A_NO_TAXONOMY_MATCH'],
 ['unregistered draft status',{drafts:drafts.map(x=>({...x,status:'active'}))},'SPECIALIST_8C2C4A_NO_TAXONOMY_MATCH'],
])test(title,async()=>{const r=await scenario(config).call();safe(r);assert.equal(r.status,'not_applicable');assert.equal(r.reasonCode,reasonCode);assert.equal(r.candidates.length,0);});
test('raw exception is never leaked',async()=>{const r=await scenario({crashAt:'canonical'}).call();safe(r);assert.equal(r.status,'blocked');assert.equal(r.reasonCode,'SPECIALIST_8C2C4A_INTERNAL_UNAVAILABLE');});
test('caller interface has only authenticated request and quiz/question IDs',()=>{
 assert.match(source,/request:\s*Request/);
 assert.match(source,/quizId:\s*unknown;\s*questionId:\s*unknown/);
 assert.doesNotMatch(source,/\b(facts|reviewedMathEvidence|learnerPrerequisiteEvidence)\s*:\s*[^/\n]/);
});
test('server-only boundary is not a route and has no writes, approvals or unsafe output',()=>{
 assert.match(source,/import 'server-only'/);
 assert.doesNotMatch(source,/\bexport\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/);
 for(const phrase of ['createClient(','.insert(','.update(','.delete(', 'SUPABASE_SERVICE_ROLE_KEY','return resolved.source','return built','return understanding']) assert.ok(!source.includes(phrase),phrase);
 assert.match(source,/status: 'requires_independently_verified_facts'/);
});

test('unexpected browser-supplied facts or approval properties are rejected before authentication',async()=>{
 const h=scenario();
 const r=await h.call({quizId:Z,questionId:Q,facts:{kind:'equal_spacing_interval_count'},approved:true});
 safe(r);assert.equal(r.stage,'access');assert.equal(r.reasonCode,'SPECIALIST_8C2C4A_INVALID_QUERY');
 assert.deepEqual(h.calls,[]);
});

test('resolver rejection cannot expose exception text',async()=>{
 const r=await scenario({crashAt:'resolver'}).call();safe(r);
 assert.equal(r.status,'blocked');assert.equal(r.reasonCode,'SPECIALIST_8C2C4A_INTERNAL_UNAVAILABLE');
});
