'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {selectTeachingStrategy}=require('../build/math/teaching/strategy-selection/selector.js');
const {validateStrategySelection}=require('../build/math/teaching/strategy-selection/validation.js');
const {classifyConfidence}=require('../build/math/teaching/strategy-selection/policy.js');

const boundary={questionId:'f4-margin-precision',readyForMethodSelection:true,
 teachingContractFingerprint:'fnv1a32:f4margin',primaryFamilyId:'model.part_whole',
 teachingContractSchema:'4A-3.1',teachingConsumerSchema:'4A-3-CONSUMER.1',
 methodLibrarySchema:'4B.1',methodTaxonomySchema:'4B-1.1'};
const zeros=()=>({problem_structure:0,required_reasoning:0,curriculum_skill:0,
 learner_level:0,math_domain:0,representation_fit:0,prerequisites:0});
const evidence=(id,matches)=>({methodId:'model.part_whole.'+id,familyId:'model.part_whole',
 active:true,eligibleLevels:[4],mandatoryPrerequisitesSatisfied:false,
 prerequisiteEvidenceState:'unknown',matches:{...zeros(),...matches},complexity:1});
const choose=(candidates)=>selectTeachingStrategy({boundary,learnerLevel:4,candidates});
const score=(candidate)=>candidate?.score;
const noIssue=(selection)=>assert.deepEqual(validateStrategySelection(selection).issues,[]);

// 77.000000 - 68.666667 = 8.333332999999996 in binary; wire margin is 8.333333.
const first=()=>evidence('a',{problem_structure:1,required_reasoning:1,curriculum_skill:1,math_domain:2/7});
const second=()=>evidence('b',{problem_structure:1,required_reasoning:1,curriculum_skill:8.666667/15});

test('F4: reproduces former CONFIDENCE_INVALID for a 6-place fractional winner margin',()=>{
 const selection=choose([first(),second()]);
 assert.equal(selection.status,'selected',JSON.stringify(selection.issues));
 assert.equal(selection.confidence,'low');
 assert.equal(selection.primaryMethodId,'model.part_whole.a');
 assert.equal(selection.winnerMargin,8.333333);
 assert.equal(score(selection.candidates[0]),77);
 assert.equal(score(selection.candidates[1]),68.666667);
 noIssue(selection);
});
test('F4: candidate permutation preserves winner, confidence and canonical margin',()=>{
 const a=choose([first(),second()]);const b=choose([second(),first()]);
 assert.equal(a.status,b.status);assert.equal(a.primaryMethodId,b.primaryMethodId);
 assert.equal(a.confidence,b.confidence);assert.equal(a.winnerMargin,b.winnerMargin);
 assert.deepEqual(a.candidates,b.candidates);noIssue(b);
});
test('F4: exact 8.000000 margin is selected; minimum quality 75 remains enforced',()=>{
 const a=evidence('a',{problem_structure:1,required_reasoning:1,curriculum_skill:1});
 const b=evidence('b',{problem_structure:1,required_reasoning:1,curriculum_skill:7/15});
 const s=choose([a,b]);assert.equal(s.status,'selected');assert.equal(s.confidenceScore,75);
 assert.equal(s.winnerMargin,8);assert.equal(s.confidence,'low');noIssue(s);
});
test('F4: a margin below 8 remains ambiguous without rounding into acceptance',()=>{
 const a=evidence('a',{problem_structure:1,required_reasoning:1,curriculum_skill:1});
 const b=evidence('b',{problem_structure:1,required_reasoning:1,curriculum_skill:7.000001/15});
 const s=choose([a,b]);assert.equal(s.status,'ambiguous');
 assert.equal(s.issues[0].code,'INSUFFICIENT_WINNER_MARGIN');noIssue(s);
});
test('F4: winner score below 75 remains ambiguous even with only one candidate',()=>{
 const s=choose([evidence('a',{problem_structure:1,required_reasoning:1,curriculum_skill:14.999999/15})]);
 assert.equal(s.status,'ambiguous');assert.equal(s.issues[0].code,'LOW_WINNER_QUALITY');noIssue(s);
});
test('F4: 82/10 threshold still classifies medium',()=>{
 const s=choose([evidence('a',{problem_structure:1,required_reasoning:1,curriculum_skill:1,math_domain:1}),
 evidence('b',{problem_structure:1,required_reasoning:1,curriculum_skill:12/15})]);
 assert.equal(s.status,'selected');assert.equal(s.confidence,'medium');assert.equal(s.winnerMargin,10);noIssue(s);
});
test('F4: 90/15 threshold still classifies high',()=>{
 const s=choose([evidence('a',{problem_structure:1,required_reasoning:1,curriculum_skill:1,learner_level:1,representation_fit:1}),
 evidence('b',{problem_structure:1,required_reasoning:1,curriculum_skill:1})]);
 assert.equal(s.status,'selected');assert.equal(s.confidence,'high');assert.equal(s.winnerMargin,15);noIssue(s);
});
test('F4: negative score margin despite lexicographic priority cannot be selected',()=>{
 const s=choose([evidence('a',{problem_structure:1}),
 evidence('b',{problem_structure:0.9,required_reasoning:1,curriculum_skill:1,learner_level:1,math_domain:1,representation_fit:1})]);
 assert.equal(s.candidates[0].methodId,'model.part_whole.a');
 assert.equal(s.status,'ambiguous');assert.equal(s.primaryMethodId,null);noIssue(s);
});
test('F4: a forged rounded margin is rejected, rather than tolerated',()=>{
 const s=choose([first(),second()]);assert.equal(s.status,'selected');
 const forged={...s,winnerMargin:8.333334};
 assert.ok(validateStrategySelection(forged).issues.includes('CONFIDENCE_INVALID'));
});
test('F4: noncanonical raw difference is rejected and rounded wire value accepted',()=>{
 const s=choose([first(),second()]);assert.equal(s.status,'selected');
 const raw=s.candidates[0].score-s.candidates[1].score;
 assert.notEqual(raw,s.winnerMargin);
 assert.ok(validateStrategySelection({...s,winnerMargin:raw}).issues.includes('CONFIDENCE_INVALID'));
 noIssue(s);
});
test('F4: one eligible candidate keeps null margin and original high/medium/low confidence classification',()=>{
 const s=choose([first()]);assert.equal(s.status,'selected');assert.equal(s.winnerMargin,null);
 assert.equal(s.confidence,'low');noIssue(s);
 assert.equal(classifyConfidence(77,null),'low');
});
