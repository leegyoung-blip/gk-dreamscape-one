'use strict';
/** Staff-only 8C-2B shadow method-comparison unit/regression tests. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const rel='lib/math/teaching/strategy-selection/phase4E2B8C2BMethodDifferentiation.ts';
const raw=fs.readFileSync(path.join(root,rel),'utf8');
const built=ts.transpileModule(raw,{fileName:rel,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
assert.deepEqual((built.diagnostics||[]).map(x=>x.messageText),[]);
const moduleContext={exports:{}};
vm.runInNewContext(built.outputText,{module:moduleContext,exports:moduleContext.exports});
const inspect=moduleContext.exports.differentiateCloselyRelatedMethods;
const topPair=moduleContext.exports.topTwoEligibleMethodIds;
const C=(prompt,eligibleMethodIds,fields={})=>({prompt,eligibleMethodIds,learnerLevel:1,domain:'whole_numbers',problemStructure:'subtraction_change',hasVisual:false,hasParts:false,...fields});
const change=['model.change.forward_change','model.change.find_change'];
const angles=['geometry.angle.find_unknown','geometry.angle.known_relationships'];
const ratio=['ratio.relationship.part_whole_connection','ratio.relationship.ratio_units'];
const multi=['heuristic.multi_step.dependency_order','heuristic.multi_step.final_synthesis'];

test('known starting quantity and explicit decrease favor forward change (shadow only)',()=>{
 const x=inspect(C('A shop has 90 toys and sells 28. How many toys are left?',change));
 assert.equal(x.status,'evidence_found'); assert.equal(x.ruleCode,'8C2B_KNOWN_DECREASE_FINAL_UNKNOWN');
 assert.equal(x.preferredMethodId,change[0]);assert.equal(x.lessSuitableMethodId,change[1]);
});
test('unknown removed quantity plus known remainder favors find-change (shadow only)',()=>{
 const x=inspect(C('A shop has 90 toys. Some toys were sold. 62 toys remained. How many toys were sold?',change));
 assert.equal(x.status,'evidence_found');assert.equal(x.ruleCode,'8C2B_CHANGE_UNKNOWN_FINAL_KNOWN');
 assert.equal(x.preferredMethodId,change[1]);assert.equal(x.lessSuitableMethodId,change[0]);
});
test('insufficient or contradictory change targets must remain unresolved',()=>{
 for(const text of ['A shop sells 28 toys. How many toys were sold?',
 'A shop has 90 toys and sells some toys. How many toys remain?',
 'There are 90 toys and 28 are sold. How many of them are sold?']){
  assert.notEqual(inspect(C(text,change)).status,'evidence_found',text);
 }
});
test('unknown angle target with explicit text relationship is a diagnostic only',()=>{
 const c=C('Angles on a straight line add to 180 degrees. One angle is 70 degrees. What is the size of the other angle?',angles,{learnerLevel:4,domain:'geometry',problemStructure:'angle_relationship'});
 const x=inspect(c);assert.equal(x.status,'evidence_found');assert.equal(x.preferredMethodId,angles[0]);
 assert.equal(inspect({...c,hasVisual:true}).status,'needs_review');
 assert.equal(inspect({...c,prompt:'In the diagram one angle is 70 degrees. What is the other angle?'}).status,'needs_review');
});
test('a named ratio total-to-one-part relation is only a shadow suggestion',()=>{
 const c=C('The ratio of apples to pears is 3:5. There are 40 fruits altogether. How many apples are there?',ratio,{learnerLevel:6,domain:'ratio',problemStructure:'ratio_relationship'});
 const x=inspect(c);assert.equal(x.status,'evidence_found');assert.equal(x.preferredMethodId,ratio[0]);
 assert.equal(inspect({...c,prompt:'The ratio of apples to pears is 3:5. How many apples are there?'}).status,'needs_review');
});
test('multi-step sequence and synthesis remain potentially complementary',()=>{
 const x=inspect(C('Bok has 5 books and buys 6 more. How many books are there?',multi,{learnerLevel:5,problemStructure:'multi_step'}));
 assert.equal(x.status,'needs_review');assert.equal(x.ruleCode,'8C2B_MULTISTEP_DEPENDENCY_SYNTHESIS_OVERLAP');
});
test('strict top-two extraction ignores third-ranked methods even when input is unsorted',()=>{
 const ranked=[
  {methodId:'heuristic.multi_step.final_synthesis',eligible:true,rank:3},
  {methodId:'heuristic.multi_step.dependency_order',eligible:true,rank:2},
  {methodId:'heuristic.multi_step.identify_subgoals',eligible:true,rank:1},
 ];
 const ids=topPair(ranked);
 assert.deepEqual(Array.from(ids),[
  'heuristic.multi_step.identify_subgoals',
  'heuristic.multi_step.dependency_order',
 ]);
 const x=inspect(C('A store has 14 boxes, each holding 12 items. How many items are sold?',ids,{learnerLevel:4,problemStructure:'multi_step'}));
 assert.equal(x.ruleCode,'8C2B_MULTISTEP_SUBGOAL_DEPENDENCY_OVERLAP');
 assert.equal(x.status,'needs_review');
});
test('diagnostic fails closed if given an entire three-method eligible pool',()=>{
 const ids=[
  'heuristic.multi_step.identify_subgoals',
  'heuristic.multi_step.dependency_order',
  'heuristic.multi_step.final_synthesis',
 ];
 const x=inspect(C('A shop has 12 books. How many remain after 3 are sold?',ids,{learnerLevel:4,problemStructure:'multi_step'}));
 assert.equal(x.status,'not_applicable');
 assert.equal(x.ruleCode,'8C2B_EXACT_TOP_PAIR_REQUIRED');
});
test('missing, duplicate, disqualified or invalid ranks cannot manufacture a top pair',()=>{
 for(const example of [
  [{methodId:'a.b',eligible:true,rank:1}],
  [{methodId:'a.b',eligible:true,rank:1},{methodId:'a.b',eligible:true,rank:2}],
  [{methodId:'a.b',eligible:true,rank:1},{methodId:'b.c',eligible:false,rank:2}],
  [{methodId:'a.b',eligible:true,rank:1},{methodId:'b.c',eligible:true,rank:1}],
  [{methodId:'a.b',eligible:true,rank:1},{methodId:'<script>',eligible:true,rank:2}],
 ]) assert.equal(topPair(example).length,0);
});
test('adapter invokes differentiation against ranked top-two only',()=>{
 const source=fs.readFileSync(path.join(root,'lib/math/teaching/strategy-selection/phase4C4Adapter.ts'),'utf8');
 assert.match(source,/eligibleMethodIds:\s*topTwoEligibleMethodIds\(selected\.candidates\)/);
 assert.doesNotMatch(source,/eligibleMethodIds:\s*selected\.candidates\.filter\(m\s*=>\s*m\.eligible\)/);
});
test('invalid, visual, multipart and unknown pairs must fail closed',()=>{
 assert.equal(inspect(C('How many?',change)).status,'not_applicable');
 const c=C('A shop has 90 toys and sells 28. How many toys are left?',change);
 assert.equal(inspect({...c,hasVisual:true}).status,'needs_review');
 assert.equal(inspect({...c,hasParts:true}).status,'needs_review');
 assert.equal(inspect({...c,prompt:c.prompt+' How many did they sell?'}).status,'needs_review');
 assert.equal(inspect({...c,eligibleMethodIds:['unknown.a','unknown.b']}).status,'not_applicable');
});
test('pure analyzer has no access to stored answers, approvals, DB or student data',()=>{
 for(const keyword of ['answer_data','correct_option_ids','display_answer','questionCode','studentId','SUPABASE_SERVICE_ROLE_KEY','createClient','fetch(','insert(','update('])assert.ok(!raw.includes(keyword),keyword);
});
test('selector scoring and 4C confidence rules remain untouched',()=>{
 const a=fs.readFileSync(path.join(root,'lib/math/teaching/strategy-selection/phase4C4Adapter.ts'),'utf8');
 assert.match(a,/selected\.status === 'ambiguous' && !validatedReview/);
 assert.match(a,/methodDifferentiation/);
 assert.match(a,/selectTeachingStrategy/);
 assert.match(a,/SINGLE_FAMILY_SELECTION_AMBIGUOUS/);
 assert.doesNotMatch(a,/matches\.curriculum_skill\s*=\s*1/);
});
test('staff-only response sanitizes all rule codes and method identifiers',()=>{
 const s=fs.readFileSync(path.join(root,'lib/math/teaching/student-serving/phase4E2B1StaffMethodPreview.server.ts'),'utf8');
 assert.match(s,/eligibleMethodIds\.has/);
 assert.match(s,/8C2B_/);
 assert.match(s,/studentReleased: false/);
 assert.match(s,/teachingApproved: false/);
 assert.ok(!s.includes('return selection;'));
});

test('staff-only ambiguous response exposes bounded diagnostic codes, never answers',async()=>{
 const file=path.join(root,'lib/math/teaching/student-serving/phase4E2B1StaffMethodPreview.server.ts');
 const source=fs.readFileSync(file,'utf8');
 const js=ts.transpileModule(source,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
 assert.deepEqual((js.diagnostics||[]).map(x=>x.messageText),[]);
 const secret='PRIVATE_ANSWER_SHOULD_NOT_ESCAPE';
 const quizId='11111111-1111-4111-8111-111111111111';
 const questionId='22222222-2222-4222-8222-222222222222';
 const records=change.map((id,index)=>({methodId:id,familyId:'model.change',eligible:true,rank:index+1,score:77,
  dimensionScores:[{dimension:'curriculum_skill',points:0,maximum:15}],positiveEvidence:[{detail:secret}],exclusions:[]}));
 const selection={status:'ambiguous',reasonCodes:['SINGLE_FAMILY_SELECTION_AMBIGUOUS'],primaryFamilies:['model.change'],
  candidateMethodCount:2,familySelections:[{issues:[{code:'INSUFFICIENT_WINNER_MARGIN',detail:secret}],candidates:records}],
  methodDifferentiation:{version:'4E-2B-8C-2B.1',status:'evidence_found',ruleCode:'8C2B_KNOWN_DECREASE_FINAL_UNKNOWN',preferredMethodId:change[0],lessSuitableMethodId:change[1]}};
 const mocks={
  'server-only':{},
  '../../../math-intelligence/teaching/canonical/normalizeCanonicalTeachingQuestion':{normalizeCanonicalTeachingQuestion:()=>({identity:{quizId,questionId},diagnostics:{readyForUnderstanding:true,issues:[]}})},
  '../../../math-intelligence/teaching/understanding/understandTeachingQuestion':{understandTeachingQuestion:()=>({readyForMethodSelection:true})},
  '../../../math-intelligence/teaching/contract/buildTeachingContract':{buildTeachingContract:()=>({status:'ready'})},
  '../../../math-intelligence/teaching/contract/consumer/boundary':{
   createPhase4BMethodLibraryContractView:()=>({status:'ready',envelope:{consumer:'phase_4b_method_library'}}),
   createPhase4CStrategySelectorContractView:()=>({status:'ready',envelope:{consumer:'phase_4c_strategy_selector'}})
  },
  '../strategy-selection/phase4C4Adapter':{selectFromPhase4A4B:()=>selection},
  './phase4E2A3StaffSourceResolver.server':{resolveStaffMathTeachingSource:async()=>({status:'ready',source:{answer_data:secret},sourceIdentity:{quizId,questionId}})}
 };
 const mod={exports:{}};
 vm.runInNewContext(js.outputText,{exports:mod.exports,module:mod,require:(name)=>{
  if(!Object.prototype.hasOwnProperty.call(mocks,name))throw Error('unexpected import: '+name);
  return mocks[name];
 },Request});
 const preview=await mod.exports.previewStaffMathMethod(new Request('https://example.test'),{quizId,questionId});
 assert.equal(preview.status,'ambiguous');
 assert.equal(preview.scoreComparison.methodDifferentiation.preferredMethodId,change[0]);
 assert.ok(preview.reasonCodes.includes('METHOD_8C2B_KNOWN_DECREASE_FINAL_UNKNOWN'));
 assert.equal(preview.studentReleased,false);assert.equal(preview.teachingApproved,false);
 assert.ok(!JSON.stringify(preview).includes(secret));
 selection.methodDifferentiation={...selection.methodDifferentiation,preferredMethodId:'<script>'+secret};
 const unsafe=await mod.exports.previewStaffMathMethod(new Request('https://example.test'),{quizId,questionId});
 assert.equal(unsafe.scoreComparison.methodDifferentiation,undefined);
 assert.ok(!JSON.stringify(unsafe).includes(secret));
});
