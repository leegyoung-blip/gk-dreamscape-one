'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  diagnosePhase4C4Selection,
  countPhase4BPrerequisiteMetadata,
  PHASE4C4B_F2_DIAGNOSTICS_VERSION,
} = require('../build/math/teaching/strategy-selection/qa/diagnosePhase4C4Selection.js');
const { selectTeachingStrategy } = require('../build/math/teaching/strategy-selection/selector.js');
const { PHASE4B_ALL_PRODUCTION_METHODS } = require('../build/math-intelligence/teaching/method-library/methods/phase4BProductionLibrary.js');
const { runPhase4C4BCohortAudit } = require('../build/math/teaching/strategy-selection/qa/runPhase4C4BCohort.js');
const method = PHASE4B_ALL_PRODUCTION_METHODS[0];
const boundary = {
  questionId: 'diagnostics-fixture', readyForMethodSelection: true,
  teachingContractFingerprint: 'fnv1a32:12345678',
  teachingContractSchema: '4A-3.1', teachingConsumerSchema: '4A-3-CONSUMER.1',
  methodLibrarySchema: '4B.1', methodTaxonomySchema: '4B-1.1',
  primaryFamilyId: method.familyId,
};
const dimensions = ['problem_structure','required_reasoning','curriculum_skill','learner_level','math_domain','representation_fit','prerequisites'];
function selection(affirmed, opts={}) {
  const evidence = {
    methodId: method.methodId, familyId: method.familyId,
    active:opts.active !== false, eligibleLevels:method.applicability.levels,
    mandatoryPrerequisitesSatisfied:affirmed,
    matches:Object.fromEntries(dimensions.map(d=>[d,opts.lowScore ? 0.2 : 1])),
    complexity:method.pedagogy.teachingSequence.length,
  };
  const chosen = selectTeachingStrategy({boundary,learnerLevel:method.applicability.levels[0],candidates:[evidence]});
  const adapter={schemaVersion:'4C-4A.1',status:chosen.status,reasonCodes:[],primaryFamilies:[method.familyId],candidateMethodCount:1,familySelections:[chosen],selection:chosen,composition:null};
  return adapter;
}
const input=(v)=>({verifiedEvidence:v===undefined?undefined:{[method.methodId]:{
  mandatoryPrerequisitesSatisfied:v,curriculumSkillMatch:true,representationFit:true}}});

test('F2 and registry metadata reflect the actual 153-method library',()=>{
  assert.equal(PHASE4C4B_F2_DIAGNOSTICS_VERSION,'4C-4B-F2.1');
  assert.deepEqual(countPhase4BPrerequisiteMetadata(),{
    methods:153,methodsWithPrerequisites:153,methodsWithoutPrerequisites:0,
    byPrerequisiteCount:{'1':15,'2':128,'3':10},
  });
});
test('missing evidence is unverified, NOT confirmed learner non-mastery',()=>{
  const result=selection(false);
  const diag=diagnosePhase4C4Selection(input(undefined),result);
  assert.equal(result.status,'blocked');
  assert.equal(diag.classification,'all_primary_candidates_unverified_prerequisites');
  assert.equal(diag.candidatePrerequisitesUnverified,1);
  assert.equal(diag.familyDiagnostics[0].methods[0].prerequisiteEvidence,'unverified');
  assert.deepEqual(diag.familyDiagnostics[0].methods[0].exclusionCodes,['MANDATORY_PREREQUISITE_MISSING']);
});
test('an explicit false boolean means not affirmed (not necessarily a proven failure)',()=>{
  const diag=diagnosePhase4C4Selection(input(false),selection(false));
  assert.equal(diag.classification,'all_primary_candidates_prerequisite_excluded_mixed_evidence');
  assert.equal(diag.candidatePrerequisitesNotAffirmed,1);
  assert.equal(diag.candidatePrerequisitesUnverified,0);
});
test('genuinely affirmed prerequisite evidence permits a candidate, preserving selector output',()=>{
  const result=selection(true);
  assert.equal(result.status,'selected');
  const diag=diagnosePhase4C4Selection(input(true),result);
  assert.equal(diag.classification,'eligible_candidates_present');
  assert.equal(diag.eligibleCandidates,1);
  assert.equal(diag.candidatePrerequisitesVerified,1);
  assert.equal(diag.familyDiagnostics[0].methods[0].eligibility,'eligible');
});
test('unknown prerequisites do not hide an independent hard exclusion',()=>{
  const diag=diagnosePhase4C4Selection(input(),selection(false,{active:false}));
  assert.equal(diag.classification,'other_or_mixed_exclusions');
  assert.equal(diag.candidateOtherHardExclusions,1);
  assert.deepEqual(diag.familyDiagnostics[0].methods[0].otherExclusionCodes,['METHOD_INACTIVE']);
});
test('low quality with verified prerequisites remains ambiguous, not a forced selection',()=>{
  const result=selection(true,{lowScore:true});
  assert.equal(result.status,'ambiguous');
  const diag=diagnosePhase4C4Selection(input(true),result);
  assert.equal(diag.classification,'eligible_candidates_present');
  assert.equal(diag.eligibleCandidates,1);
  assert.equal(diag.familyDiagnostics[0].status,'ambiguous');
});
test('diagnostic output is deterministic and leaves selector results unchanged',()=>{
  const upstream=selection(false);
  const before=JSON.stringify(upstream);
  const a=diagnosePhase4C4Selection(input(),upstream);
  const b=diagnosePhase4C4Selection(input(),upstream);
  assert.deepEqual(a,b);
  assert.equal(JSON.stringify(upstream),before);
});
test('no-family scenario is marked upstream not reached',()=>{
  const result={schemaVersion:'4C-4A.1',status:'blocked',reasonCodes:['ENVELOPES_REQUIRED'],primaryFamilies:[],candidateMethodCount:0,familySelections:[],selection:null,composition:null};
  const d=diagnosePhase4C4Selection(input(),result);
  assert.equal(d.stage,'upstream_not_reached');
  assert.equal(d.classification,'upstream_not_reached');
});
test('F2 QA extends original runner without altering its expected cohort checks',()=>{
  const report=runPhase4C4BCohortAudit({sample:{seed:'phase-2i-v1',items:[]},results:[]});
  assert.equal(report.schema_version,'4C-4B-QA.1');
  assert.equal(report.summary.checks.matchesExpectedTotal,false);
  assert.equal(report.summary.f2Diagnostics.withFamilyDiagnostics,0);
  assert.equal(report.summary.f2Diagnostics.methodRegistry.methodsWithPrerequisites,153);
});
