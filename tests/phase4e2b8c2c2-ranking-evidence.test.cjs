'use strict';
/** Phase 8C-2C.2 — shadow structural evidence, no scoring or student release. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname,'..');
const rel = 'lib/math/teaching/strategy-selection/phase4E2B8C2C2RankingEvidence.ts';
const text = fs.readFileSync(path.join(root,rel),'utf8');
const result = ts.transpileModule(text,{fileName:rel,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
assert.deepEqual((result.diagnostics??[]).map(x=>x.messageText),[]);
const mod={exports:{}};
vm.runInNewContext(result.outputText,{module:mod,exports:mod.exports});
const diagnose=mod.exports.assessRankingEvidence;
const multi=['heuristic.multi_step.dependency_order','heuristic.multi_step.final_synthesis'];
const subgoal=['heuristic.multi_step.identify_subgoals','heuristic.multi_step.dependency_order'];
const ratio=['ratio.relationship.part_whole_connection','ratio.relationship.ratio_units'];
const change=['model.change.find_change','model.change.forward_change'];
const angles=['geometry.angle.find_unknown','geometry.angle.known_relationships'];
const base=(prompt,topTwoMethodIds=multi,extra={})=>({learnerLevel:5,domain:'whole_numbers',problemStructure:'multi_step',prompt,hasVisual:false,hasParts:false,topTwoMethodIds,...extra});
const data = {
 p1: 'There are 8 balloons. 4 pop. How many are left?',
 p3: 'Trees are planted 7 m apart along a straight road. What is the distance between the 5th tree and the 95th tree?',
 p4geo: 'Several pairs of lines in the figure are parallel. An acute angle at the top intersection is 76°. Find the exterior angle x at the lower-right intersection.',
 p4mass: 'A box containing 58 iron balls weighed 2145g. When 46 of the iron balls were removed, the mass of the box and the remaining iron balls weighed 489g. What was the mass of the box?',
 p5multi: 'King bought 80 tables and chairs for $1,780. After 20 chairs were given away, the remaining numbers of tables and chairs were equal. Each table cost $6 more than each chair. (a) How many chairs did King buy? (b) What was the cost of each chair?',
 p5marbles: 'Bok has some marbles. James has thrice as many as Bok. David has half as many as James. Together they have 209 marbles. How many marbles does David have?',
 p6ratio: 'The ratio of pencils to books was 3 : 2. After Keith bought 10 more pencils and 76 more books, the ratio became 1 : 2. How many books did Keith have at first?',
};
const checkNoSensitive=(r)=>{for(const v of Object.values(data))assert.ok(!JSON.stringify(r).includes(v));};

test('P3 ordinal equal-spacing requires counting intervals, not the number of objects',()=>{
 const r=diagnose(base(data.p3,multi,{learnerLevel:3,domain:'measurement'}));
 assert.equal(r.status,'specialist_review');assert.equal(r.ruleCode,'8C2C2_EQUAL_SPACING_INTERVAL_COUNT_REVIEW');checkNoSensitive(r);
});
test('P3 gap diagnostic does not accept ordinals without explicit equal spacing and distance target',()=>{
 const candidates=[
 'Trees are planted on a road. What is the distance between the 5th tree and 95th tree?',
 'Trees are planted 7 m apart. How many trees are between the 5th tree and 95th tree?',
 'Trees are planted 7 m apart. What is the distance between the first and last tree?',
 ];
 for(const prompt of candidates)assert.notEqual(diagnose(base(prompt,multi,{learnerLevel:3,domain:'measurement'})).status,'specialist_review');
});
test('P5 multiplicative comparison chain is a candidate-taxonomy review, not a winner',()=>{
 const r=diagnose(base(data.p5marbles));assert.equal(r.status,'specialist_review');
 assert.equal(r.ruleCode,'8C2C2_MULTIPLICATIVE_CHAIN_REVIEW');checkNoSensitive(r);
});
test('a single multiplicative comparison is insufficient to assert a chain',()=>{
 const r=diagnose(base('James has twice as many marbles as Bok. Together they have 30 marbles. How many marbles does James have?'));
 assert.notEqual(r.status,'specialist_review');
});
test('P6 two-state changed-ratio comparison needs specialist review, not part-whole score boosting',()=>{
 const r=diagnose(base(data.p6ratio,ratio,{learnerLevel:6,domain:'ratio',problemStructure:'ratio_relationship'}));
 assert.equal(r.status,'specialist_review');assert.equal(r.ruleCode,'8C2C2_CHANGING_RATIO_REVIEW');checkNoSensitive(r);
});
test('equivalent ratio without an explicit change must not trigger changed-ratio review',()=>{
 const r=diagnose(base('The ratio of pencils to books is 3 : 2. How many pencils are there?',ratio,{learnerLevel:6,domain:'ratio'}));
 assert.equal(r.status,'needs_review');
});
test('P4 subgoal and dependency methods remain potentially complementary',()=>{
 const r=diagnose(base(data.p4mass,subgoal,{learnerLevel:4}));
 assert.equal(r.status,'complementary');assert.equal(r.ruleCode,'8C2C2_MULTISTEP_METHODS_COMPLEMENTARY');
});
test('P5 two-target question retains staff review gate',()=>{
 const r=diagnose(base(data.p5multi,multi,{hasParts:true}));
 assert.equal(r.status,'needs_review');assert.equal(r.ruleCode,'8C2C2_MULTIPART_REVIEW_REQUIRED');
});
test('P4 geometry diagram remains unranked',()=>{
 const r=diagnose(base(data.p4geo,angles,{learnerLevel:4,domain:'geometry',hasVisual:true}));
 assert.equal(r.status,'needs_review');assert.equal(r.ruleCode,'8C2C2_VISUAL_REVIEW_REQUIRED');
});
test('P1 known removal remains the separately validated 8C-2B comparison',()=>{
 const r=diagnose(base(data.p1,change,{learnerLevel:1,domain:'whole_numbers'}));
 assert.equal(r.status,'not_applicable');
});
test('unranked, duplicate, injected and unrecognised pairs fail closed',()=>{
 for(const pair of [[],['a'],[multi[0],multi[0]],['<script>',multi[0]],['foo.bar','foo.baz'],[...multi,'third']]){
   assert.equal(diagnose(base(data.p3,pair)).status,'not_applicable');
 }
 assert.equal(diagnose(base('short',multi)).status,'not_applicable');
});
test('no direct answer keys, score changes, unverified learner data or database operations',()=>{
 const forbidden=['answer_data','correct_option_ids','createClient','SUPABASE_SERVICE_ROLE_KEY','studentId','questionCode','fetch(','insert(','update('];
 for(const name of forbidden)assert.ok(!text.includes(name),name);
 const adapter=fs.readFileSync(path.join(root,'lib/math/teaching/strategy-selection/phase4C4Adapter.ts'),'utf8');
 assert.match(adapter,/assessRankingEvidence/);
 assert.match(adapter,/selected\.status === 'ambiguous' && !validatedReview/);
 assert.match(adapter,/topTwoMethodIds: topTwoEligibleMethodIds\(selected\.candidates\)/);
 assert.doesNotMatch(adapter,/matches\.curriculum_skill\s*=\s*1/);
});
test('staff export boundaries enforce fixed statuses, code syntax and continued block',()=>{
 const source=fs.readFileSync(path.join(root,'lib/math/teaching/student-serving/phase4E2B1StaffMethodPreview.server.ts'),'utf8');
 assert.match(source,/ranking\.status === 'specialist_review'/);
 assert.match(source,/ranking\.status === 'complementary'/);
 assert.match(source,/ranking\.status === 'needs_review'/);
 assert.match(source,/RANK_\$\{rankingRule\}/);
 assert.match(source,/studentReleased: false/); assert.match(source,/teachingApproved: false/);
 assert.match(source,/status: 'ambiguous', stage: 'selector'/);
});
test('unauthorised and arbitrary code values are not emitted to staff',async()=>{
 const file=path.join(root,'lib/math/teaching/student-serving/phase4E2B1StaffMethodPreview.server.ts');
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
 const s='SENSITIVE_ANSWER_21';
 const quizId='11111111-1111-4111-8111-111111111111';
 const questionId='22222222-2222-4222-8222-222222222222';
 const selection={status:'ambiguous',reasonCodes:['SINGLE_FAMILY_SELECTION_AMBIGUOUS'],primaryFamilies:['heuristic.multi_step'],candidateMethodCount:2,
 familySelections:[{issues:[],candidates:multi.map((methodId,index)=>({methodId,familyId:'heuristic.multi_step',eligible:true,rank:index+1,score:77,dimensionScores:[],exclusions:[]}))}],
 rankingEvidenceReview:{version:'4E-2B-8C-2C.2',status:'specialist_review',ruleCode:'8C2C2_MULTIPLICATIVE_CHAIN_REVIEW'}};
 const mocks={
  'server-only':{},
  '../../../math-intelligence/teaching/canonical/normalizeCanonicalTeachingQuestion':{normalizeCanonicalTeachingQuestion:()=>({identity:{quizId,questionId},diagnostics:{readyForUnderstanding:true,issues:[]}})},
  '../../../math-intelligence/teaching/understanding/understandTeachingQuestion':{understandTeachingQuestion:()=>({readyForMethodSelection:true})},
  '../../../math-intelligence/teaching/contract/buildTeachingContract':{buildTeachingContract:()=>({status:'ready'})},
  '../../../math-intelligence/teaching/contract/consumer/boundary':{createPhase4BMethodLibraryContractView:()=>({status:'ready',envelope:{}}),createPhase4CStrategySelectorContractView:()=>({status:'ready',envelope:{}})},
  '../strategy-selection/phase4C4Adapter':{selectFromPhase4A4B:()=>selection},
  './phase4E2A3StaffSourceResolver.server':{resolveStaffMathTeachingSource:async()=>({status:'ready',source:{answer_data:s},sourceIdentity:{quizId,questionId}})},
 };
 const mod={exports:{}};
 vm.runInNewContext(js.outputText,{exports:mod.exports,module:mod,require:(name)=>{if(!Object.hasOwn(mocks,name))throw Error('unmocked import: '+name);return mocks[name];},Request});
 let r=await mod.exports.previewStaffMathMethod(new Request('https://example.test'),{quizId,questionId});
 assert.equal(r.status,'ambiguous');assert.ok(r.reasonCodes.includes('RANK_8C2C2_MULTIPLICATIVE_CHAIN_REVIEW'));
 assert.equal(r.scoreComparison.rankingEvidenceReview.status,'specialist_review');
 assert.ok(!JSON.stringify(r).includes(s));
 selection.rankingEvidenceReview={status:'specialist_review',ruleCode:'8C2C2_'+s+'<injection>'};
 r=await mod.exports.previewStaffMathMethod(new Request('https://example.test'),{quizId,questionId});
 assert.equal(r.scoreComparison.rankingEvidenceReview,undefined);
 assert.ok(!r.reasonCodes.some(x=>x.startsWith('RANK_')));
 selection.rankingEvidenceReview={status:'specialist_review',ruleCode:'8C2C2_INVENTED_BUT_WELL_FORMED'};
 r=await mod.exports.previewStaffMathMethod(new Request('https://example.test'),{quizId,questionId});
 assert.equal(r.scoreComparison.rankingEvidenceReview,undefined);
 selection.rankingEvidenceReview={status:'not_applicable',ruleCode:'8C2C2_NOT_APPLICABLE'};
 r=await mod.exports.previewStaffMathMethod(new Request('https://example.test'),{quizId,questionId});
 assert.equal(r.scoreComparison.rankingEvidenceReview,undefined);
});
