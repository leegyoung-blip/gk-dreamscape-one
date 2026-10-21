'use strict';
/** 8C-2C.4D: authenticated shadow orchestration; local mocks only, never production writes. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'lib/math/teaching/student-serving/phase4E2B8C2C4DStaffShadowComparison.server.ts');
const code=fs.readFileSync(file,'utf8');
const Q='11111111-1111-4111-8111-111111111111';
const Z='22222222-2222-4222-8222-222222222222';
const ids={quizId:Z,questionId:Q};
const SP='heuristic.multi_step.equal_spacing_interval_count';
const CP='heuristic.multi_step.multiplicative_comparison_chain';
const RP='ratio.relationship.before_after_change';
const P3='Trees are planted 7 m apart along a straight road. What is the distance between the 5th tree and the 95th tree?';
const P5='Bok has some marbles. James has thrice as many as Bok. David has half as many as James. Together they have 209 marbles. How many marbles does David have?';
const P6='The ratio of pencils to books was 3 : 2. After Keith bought 10 more pencils and 76 more books, the ratio became 1 : 2. How many books did Keith have at first?';
const SECRET='DO_NOT_DISCLOSE_ANSWER_DATA_OR_PROMPT';
const drafts=[
 {methodId:SP,familyId:'heuristic.multi_step',status:'draft',applicability:{levels:[3,4,5,6],domains:['measurement'],structures:['multi_step'],reasoning:['subtraction','multiplication','comparison']}},
 {methodId:CP,familyId:'heuristic.multi_step',status:'draft',applicability:{levels:[4,5,6],domains:['whole_numbers'],structures:['multi_step'],reasoning:['comparison','multiplication']}},
 {methodId:RP,familyId:'ratio.relationship',status:'draft',applicability:{levels:[5,6],domains:['ratio'],structures:['ratio_relationship'],reasoning:['ratio_scaling','addition']}},
];
const cases=[
 {methodId:SP,level:3,prompt:P3,domain:'measurement',structure:'multi_step',reasons:['subtraction','multiplication'],family:'heuristic.multi_step',facts:'equal_spacing_interval_count',focus:'interval_count_vs_scaffolding'},
 {methodId:CP,level:5,prompt:P5,domain:'whole_numbers',structure:'multi_step',reasons:['comparison','multiplication'],family:'heuristic.multi_step',facts:'multiplicative_comparison_chain',focus:'multiplicative_chain_vs_scaffolding'},
 {methodId:RP,level:6,prompt:P6,domain:'ratio',structure:'ratio_relationship',reasons:['ratio_scaling','addition'],family:'ratio.relationship',facts:'ratio_before_after_change',focus:'changing_ratio_vs_static_ratio'},
];
function load(requires){
 const transpiled=ts.transpileModule(code,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017},reportDiagnostics:true});
 assert.equal(transpiled.diagnostics.filter(x=>x.category===ts.DiagnosticCategory.Error).length,0);
 const mod={exports:{}};
 vm.runInNewContext(transpiled.outputText,{
  module:mod,exports:mod.exports,
  require(id){if(!(id in requires))throw Error('Unexpected dependency '+id);return requires[id];},
  Object,Number,Set,Map,Array,JSON,RegExp,Error,
 },{filename:file,timeout:5000});
 return mod.exports;
}
function scenario(opts={}){
 const config={...cases[0],...opts};
 const calls=[];
 const draft=drafts.find(d=>d.methodId===config.methodId);
 let sourceNumber=0;
 const question={id:Q,subject:'math',primary_level:config.level,prompt:config.prompt,
   content:config.content===undefined?null:config.content,answer_data:SECRET};
 function source(){
  sourceNumber++;
  if(config.sourceFail) return {status:'blocked',reason:'NOT_AUTHORIZED'};
  const changed=sourceNumber===2&&config.changeAfter;
  return {status:'ready',sourceIdentity:{quizId:Z,questionId:Q,questionVersion:changed?2:(config.version??1)},
   source:{question:changed?{...question,prompt:question.prompt+' changed'}:question},
   staffReview:{quizStatus:'active',questionStatus:'active',quizPublished:true}};
 }
 const evidence={status:'pending_manual_review',persisted:false,teachingApproved:false,
  findings:[{methodId:config.methodId,sourceVersion:config.version??1,status:config.uncorroborated?'manual_verification_required':'source_correlated_for_review'}]};
 const ranked={primaryFamilyId:config.family,status:'ambiguous',
  provenance:{selectorImplementation:config.selectorVersion||'4C-2.1'},
  candidates:[
   {methodId:config.family==='ratio.relationship'?'ratio.relationship.part_whole_connection':'heuristic.multi_step.dependency_order',familyId:config.family,eligible:true,rank:1,score:77},
   {methodId:config.family==='ratio.relationship'?'ratio.relationship.ratio_units':'heuristic.multi_step.final_synthesis',familyId:config.family,eligible:true,rank:2,score:77},
  ]};
 const state={status:config.selectionStatus||'ambiguous',primaryFamilies:[config.family],familySelections:[ranked]};
 const innerEnvelope={questionId:Q, contract:{visual:{hasVisual:config.visual||false}}};
 const requires={
  'server-only':{},
  '../../../math-intelligence/teaching/canonical/normalizeCanonicalTeachingQuestion':{
    normalizeCanonicalTeachingQuestion(){calls.push('canonical');return {identity:{quizId:Z,questionId:Q},diagnostics:{readyForUnderstanding:!config.canonicalFail}};},
  },
  '../../../math-intelligence/teaching/understanding/understandTeachingQuestion':{
    understandTeachingQuestion(){calls.push('understanding');return {readyForMethodSelection:!config.understandingFail,gateDiagnostics:{readyFor4C:!config.understandingFail,blockers:[]}};},
  },
  '../../../math-intelligence/teaching/contract/buildTeachingContract':{
    buildTeachingContract(){calls.push('contract');return {status:'ready'};},
  },
  '../../../math-intelligence/teaching/contract/consumer/boundary':{
    createPhase4BMethodLibraryContractView(){return {status:'ready',envelope:innerEnvelope};},
    createPhase4CStrategySelectorContractView(){return {status:'ready',envelope:innerEnvelope};},
  },
  '../../../math-intelligence/teaching/method-library/taxonomy/buildCoverageRequirement':{
    buildPhase4BQuestionCoverageRequirement(){calls.push('coverage');return {status:'covered',requirement:{
      primaryFamilies:config.crossFamily?[config.family,'other.family']:[config.family],learnerLevel:config.level,
      domain:config.domain,problemStructure:config.structure,requiredReasoning:config.reasons,
    }};},
  },
  '../../../math-intelligence/teaching/method-library/methods/phase4E2B8C2C3ASpecialistDrafts':{
    PHASE4E2B8C2C3A_SPECIALIST_DRAFTS:drafts,
  },
  '../../../math-intelligence/teaching/method-library/methods/phase4E2B8C2C3CShadowRankingComparison':{
    compareSpecialistWithIncumbents(input){
      calls.push('compare');assert.equal(input.review.facts.kind,config.facts);
      assert.equal(input.review.domain,config.domain);assert.equal(input.review.problemStructure,config.structure);
      assert.equal(input.review.methodId,config.methodId);assert.deepEqual(Array.from(input.review.primaryFamilies),[config.family]);
      assert.equal(input.existing.selectorImplementation,'4C-2.1');
      assert.equal(input.existing.candidates.length,2);
      assert.equal(input.existing.candidates[0].rank,1);
      return {status:'ready_for_staff_comparison',ruleCode:'SHADOW_8C2C3C_PAIRED_FOR_PEDAGOGICAL_REVIEW',reviewFocus:config.focus,
        incumbents:input.existing.candidates};
    },
  },
  '../strategy-selection/phase4C4Adapter':{
    phase4AConsumerPayloadsAgree(){return true;},
    selectFromPhase4A4B(){calls.push('selector');return state;},
  },
  './phase4E2A3StaffSourceResolver.server':{
    async resolveStaffMathTeachingSource(){calls.push('source');return source();},
  },
  './phase4E2B8C2C4BVerifiedMathEvidence.server':{
    async inspectStaffMathSpecialistEvidence(){calls.push('evidence');if(config.evidenceFail)throw Error(SECRET);return config.evidence||evidence;},
  },
 };
 const service=load(requires);
 return {calls,run:(q=ids)=>service.inspectStaffMathSpecialistShadowComparison(new Request('https://example.invalid'),q)};
}
function safe(result){
 const s=JSON.stringify(result);
 for(const content of [SECRET,P3,P5,P6,'answer_data','quantityKeys','relationships','jwt','sourceFingerprint'])
  assert.equal(s.includes(content),false,'Output leaked '+content);
 assert.equal(result.previewOnly,true);assert.equal(result.humanVerified,false);
 assert.equal(result.persisted,false);assert.equal(result.teachingApproved,false);
 assert.equal(result.studentReleased,false);assert.equal(result.scoresModified,false);
 assert.equal(result.reusableApprovalProof,false);assert.equal(result.methodActivated,false);
}
for(const config of cases)test(`source-bound shadow comparison: ${config.methodId}`,async()=>{
 const h=scenario(config),r=await h.run();safe(r);
 assert.equal(r.status,'pending_manual_review');assert.equal(r.questionVersion,1);
 assert.equal(r.comparisons.length,1);assert.equal(r.comparisons[0].status,'ready_for_staff_comparison');
 assert.equal(r.comparisons[0].incumbentMethods.length,2);
 assert.equal(r.comparisons[0].specialistScore,null);
 assert.equal(r.comparisons[0].pedagogicalRole,'unresolved');
 assert.deepEqual(h.calls.filter(x=>x==='source'),['source','source']);
 assert.equal(h.calls.includes('compare'),true);
});
for(const [label,options,expected] of [
 ['wrong source version',{version:0},'SHADOW_8C2C4D_SOURCE_OR_VERSION_NOT_READY'],
 ['unreviewed source structure',{uncorroborated:true},'SHADOW_8C2C4D_NO_VALID_SOURCE_CORRELATED_PAIR'],
 ['changed question content',{changeAfter:true},'SHADOW_8C2C4D_SOURCE_CHANGED'],
 ['image evidence omitted',{visual:true},'SHADOW_8C2C4D_TAXONOMY_OR_VISUAL_UNRESOLVED'],
 ['supplemental image content',{content:{diagram:'image'}},'SHADOW_8C2C4D_TEXT_SOURCE_REQUIRED'],
 ['multiple primary families',{crossFamily:true},'SHADOW_8C2C4D_TAXONOMY_OR_VISUAL_UNRESOLVED'],
 ['4A canonical blocked',{canonicalFail:true},'SHADOW_8C2C4D_CANONICAL_NOT_READY'],
 ['4A understanding blocked',{understandingFail:true},'SHADOW_8C2C4D_UNDERSTANDING_NOT_READY'],
 ['4C is already selected',{selectionStatus:'selected'},'SHADOW_8C2C4D_4C_NOT_SINGLE_FAMILY_AMBIGUOUS'],
 ['tampered selector implementation',{selectorVersion:'made-up'},'SHADOW_8C2C4D_4C_PROVENANCE_NOT_READY'],
 ['source access denied',{sourceFail:true},'SHADOW_8C2C4D_SOURCE_OR_VERSION_NOT_READY'],
 ['staff evidence exception',{evidenceFail:true},'SHADOW_8C2C4D_INTERNAL_UNAVAILABLE'],
 ['altered mathematical wording',{prompt:P3+' Some gaps differ.'},'SHADOW_8C2C4D_NO_VALID_SOURCE_CORRELATED_PAIR'],
 ])test(`${label}: fail closed`,async()=>{
 const h=scenario(options);const out=await h.run();safe(out);
 assert.equal(out.reasonCode,expected);assert.notEqual(out.status,'pending_manual_review');
});
test('reject caller-injected facts, method IDs and approvals before any source read',async()=>{
 const h=scenario(); const r=await h.run({...ids,facts:{kind:'ratio_before_after_change'},approved:true,methodId:RP});
 safe(r);assert.equal(r.reasonCode,'SHADOW_8C2C4D_INVALID_QUERY');assert.deepEqual(h.calls,[]);
});
test('reject invalid/missing UUIDs',async()=>{
 const h=scenario();for(const v of [{quizId:'bad',questionId:Q},{quizId:Z,questionId:'bad'},null,{}]){
  const r=await h.run(v);safe(r);assert.equal(r.reasonCode,'SHADOW_8C2C4D_INVALID_QUERY');
 }
 assert.deepEqual(h.calls,[]);
});
test('source audit: shadow-only, no route, RPC write, scoring or answer output',()=>{
 assert.match(code,/import 'server-only'/);
 for(const text of ['.insert(','.update(','.delete(','createClient(','SUPABASE_SERVICE_ROLE_KEY','prepareStaffSpecialistStructureReviewIntent','recordStaffSpecialist','POST(','GET('])assert.equal(code.includes(text),false,text);
 assert.match(code,/resolveStaffMathTeachingSource/);
 assert.match(code,/inspectStaffMathSpecialistEvidence/);
 assert.match(code,/selectFromPhase4A4B/);
 assert.match(code,/compareSpecialistWithIncumbents/);
 assert.match(code,/humanVerified: false/);
});
