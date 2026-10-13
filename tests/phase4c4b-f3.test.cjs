'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {selectTeachingStrategy}=require('../build/math/teaching/strategy-selection/selector.js');
const {selectFromPhase4A4B,PHASE4C4_F3_POLICY_VERSION}=require('../build/math/teaching/strategy-selection/phase4C4Adapter.js');
const {diagnosePhase4C4Selection}=require('../build/math/teaching/strategy-selection/qa/diagnosePhase4C4Selection.js');
const {runPhase4C4BCohortAudit}=require('../build/math/teaching/strategy-selection/qa/runPhase4C4BCohort.js');
const {PHASE4B_ALL_PRODUCTION_METHODS}=require('../build/math-intelligence/teaching/method-library/methods/phase4BProductionLibrary.js');
const {PHASE4B_STRUCTURE_COVERAGE_RULES}=require('../build/math-intelligence/teaching/method-library/taxonomy/methodFamilyTaxonomy.js');
const {createPhase4BMethodLibraryContractView,createPhase4CStrategySelectorContractView}=require('../build/math-intelligence/teaching/contract/consumer/boundary.js');
const boundary={questionId:'f3-selector-fixture',readyForMethodSelection:true,
 teachingContractFingerprint:'fnv1a32:12345678',teachingContractSchema:'4A-3.1',
 teachingConsumerSchema:'4A-3-CONSUMER.1',methodLibrarySchema:'4B.1',
 methodTaxonomySchema:'4B-1.1',primaryFamilyId:'number.place_value'};
const score=(prereq=0)=>({problem_structure:1,required_reasoning:1,curriculum_skill:1,learner_level:1,math_domain:1,representation_fit:1,prerequisites:prereq});
const candidate=(state,opts={})=>({methodId:opts.id||'number.place_value.test',familyId:boundary.primaryFamilyId,
 active:opts.active!==false,eligibleLevels:[1],mandatoryPrerequisitesSatisfied:state==='verified_satisfied'||state==='not_required',
 prerequisiteEvidenceState:state,matches:score(state==='verified_satisfied'||state==='not_required'?1:0),complexity:1});
const choose=(methods)=>selectTeachingStrategy({boundary,learnerLevel:1,candidates:methods});

test('F3 policy version pinned',()=>assert.equal(PHASE4C4_F3_POLICY_VERSION,'4C-4B-F3.1'));
test('unknown mastery remains eligible but scores ZERO prerequisite points and records unknown status',()=>{
 const result=choose([candidate('unknown')]);
 assert.equal(result.status,'selected');
 assert.equal(result.confidenceScore,97);
 assert.equal(result.candidates[0].eligible,true);
 assert.equal(result.candidates[0].dimensionScores.find(x=>x.dimension==='prerequisites').points,0);
 assert.ok(result.candidates[0].explanationCodes.includes('LEARNER_PREREQUISITES_UNVERIFIED'));
 assert.ok(!result.candidates[0].positiveEvidence.some(e=>e.dimension==='prerequisites'));
});
test('verified learner weakness is excluded and cannot be selected',()=>{
 const result=choose([candidate('verified_unmet')]);
 assert.equal(result.status,'blocked');
 assert.deepEqual(result.candidates[0].exclusions.map(x=>x.code),['MANDATORY_PREREQUISITE_MISSING']);
});
test('unknown method may win over verified-unmet method, without an invented mastery assertion',()=>{
 const result=choose([candidate('verified_unmet',{id:'number.place_value.unsafe'}),candidate('unknown',{id:'number.place_value.safe'})]);
 assert.equal(result.status,'selected');assert.equal(result.primaryMethodId,'number.place_value.safe');
});
test('legacy Boolean false remains a hard exclusion, with no behavior change to 4C-2 callers',()=>{
 const method=candidate('unknown');delete method.prerequisiteEvidenceState;
 assert.equal(choose([method]).status,'blocked');
});
test('inactive, wrong-level and unknown-input payloads remain fail closed',()=>{
 assert.equal(choose([candidate('unknown',{active:false})]).status,'blocked');
 assert.equal(choose([{...candidate('unknown'),eligibleLevels:[2]}]).status,'blocked');
 assert.equal(choose([{...candidate('unknown'),matches:score(1)}]).issues[0].code,'INVALID_SELECTION_INPUT');
});
test('two equally plausible unknown-mastery methods stay ambiguous',()=>{
 const result=choose([candidate('unknown',{id:'number.place_value.a'}),candidate('unknown',{id:'number.place_value.b'})]);
 assert.equal(result.status,'ambiguous');assert.equal(result.primaryMethodId,null);
});

// A real 4B method, real taxonomy and real validated 4A consumer boundary, not mocked adapter internals.
const method=PHASE4B_ALL_PRODUCTION_METHODS.find(m=>m.methodId==='number.place_value.compare_order');
assert.ok(method,'production registry fixture missing');
const rule=PHASE4B_STRUCTURE_COVERAGE_RULES.find(r=>r.primaryFamilies.includes(method.familyId) && method.applicability.structures.includes(r.structure));
assert.ok(rule,'production taxonomy fixture missing');
function realEnvelopes(){
 const contract={schemaVersion:'4A-3.1',readyForMethodSelection:true,
  identity:{questionId:'f3-real-registry-test',questionCode:null,questionFingerprint:null,sourceType:'quiz',sourceTable:null,quizId:null,quizCode:null,quizTitle:null},
  curriculum:{subject:'math',learnerLevel:method.applicability.levels[0],topic:{id:null,name:null},primarySkill:null,secondarySkills:[],legacySkillLabel:null,skillTags:[...method.applicability.curriculumSkills],difficulty:null},
  content:{instruction:null,prompt:'Which number is greater?',questionType:'mcq',options:[],parts:[]},
  mathematics:{domain:method.applicability.domains[0],problemStructure:rule.structure,quantities:[],relationships:[],requiredReasoning:[method.applicability.reasoning[0]],constraints:[],units:[],target:{kind:'value'}},
  visual:{hasVisual:false,role:'none',dependency:'not_required',manipulability:'none',sourceMedia:[],generatedV2:null},
  multipart:{hasParts:false,parts:[],dependencies:[]},
  internalValidation:{audience:'internal_only',answer:{},answerValidation:{}},
  provenance:{canonicalSchemaVersion:'4A-1.1',understandingSchemaVersion:'4A-2.4',understandingStatus:'ready',curriculumSource:'question',resolution:{},confidenceBreakdown:{},confidence:1},
 };
 const build={status:'ready',schemaVersion:'4A-3.1',questionId:contract.identity.questionId,contract};
 const b=createPhase4BMethodLibraryContractView(build),c=createPhase4CStrategySelectorContractView(build);
 assert.equal(b.status,'ready',JSON.stringify(b.blockers));assert.equal(c.status,'ready',JSON.stringify(c.blockers));
 return {methodLibraryEnvelope:b.envelope,strategyEnvelope:c.envelope};
}
test('real 4A consumer envelopes + real 4B candidate registry reach 4C with unknown mastery',()=>{
 const input=realEnvelopes(); const a=selectFromPhase4A4B(input),b=selectFromPhase4A4B(input);
 assert.deepEqual(a,b);assert.notEqual(a.reasonCodes[0],'FAMILY_SELECTION_BLOCKED');
 assert.ok(a.familySelections.length>=1);assert.ok(a.familySelections.flatMap(f=>f.candidates).some(c=>c.eligible));
 const d=diagnosePhase4C4Selection(input,a);
 assert.ok(d.candidatePrerequisitesUnverified>=1);assert.ok(d.eligibleCandidates>=1);
 assert.ok(d.familyDiagnostics.some(f=>f.methods.some(m=>m.prerequisiteEvidence==='unverified'&&m.eligibility==='eligible')));
});
test('real adapter excludes explicitly verified unmet prerequisites; diagnostics distinguish from unknown',()=>{
 const base=realEnvelopes();
 const input={...base,learnerPrerequisiteEvidence:{[method.methodId]:{status:'unmet',source:'verified mastery assessment'}}};
 const result=selectFromPhase4A4B(input);const diag=diagnosePhase4C4Selection(input,result);
 const target=diag.familyDiagnostics.flatMap(f=>f.methods).find(m=>m.methodId===method.methodId);
 assert.ok(target);assert.equal(target.prerequisiteEvidence,'verified_unmet');assert.equal(target.eligibility,'excluded');
 assert.ok(target.exclusionCodes.includes('MANDATORY_PREREQUISITE_MISSING'));
 assert.equal(diag.candidatePrerequisitesVerifiedUnmet,1);
});
test('real adapter rejects unsourced and conflicting learner assertions',()=>{
 const base=realEnvelopes();
 const unsourced=selectFromPhase4A4B({...base,learnerPrerequisiteEvidence:{[method.methodId]:{status:'met',source:''}}});
 assert.deepEqual(unsourced.reasonCodes,['INVALID_LEARNER_PREREQUISITE_EVIDENCE']);
 const contradictory=selectFromPhase4A4B({...base,learnerPrerequisiteEvidence:{[method.methodId]:{status:'unmet',source:'assessment'}},
  verifiedEvidence:{[method.methodId]:{mandatoryPrerequisitesSatisfied:true,curriculumSkillMatch:true,representationFit:true}}});
 assert.deepEqual(contradictory.reasonCodes,['CONFLICTING_PREREQUISITE_EVIDENCE']);
});
test('QA report contains additive F3 metadata without pretending zero-question cohort has passed',()=>{
 const r=runPhase4C4BCohortAudit({sample:{seed:'phase-2i-v1',items:[]},results:[]});
 assert.equal(r.summary.f3Policy.policyVersion,'4C-4B-F3.1');
 assert.equal(r.summary.f3Policy.unknownMasteryEligibleCandidates,0);
 assert.equal(r.summary.checks.matchesExpectedTotal,false);
});
