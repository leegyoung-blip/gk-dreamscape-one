'use strict';
/** 4E-2B-8C-2C.1 staff-only curriculum metadata checks. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const rel='lib/math/teaching/strategy-selection/phase4E2B8C2CSkillAudit.ts';
const source=fs.readFileSync(path.join(root,rel),'utf8');
const compiled=ts.transpileModule(source,{fileName:rel,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
assert.deepEqual((compiled.diagnostics||[]).map(x=>x.messageText),[]);
const modAudit={exports:{}};
vm.runInNewContext(compiled.outputText,{module:modAudit,exports:modAudit.exports});
const audit=modAudit.exports.auditTopTwoCurriculumSkillDeclarations;
const M=(methodId,skills)=>({methodId,applicability:{curriculumSkills:skills}});
const base=(pair,methods,keys=['P1 Mathematics — Subtraction: Take Away within 10'])=>({topTwoMethodIds:pair,registeredMethods:methods,curriculumKeys:keys});
const a='model.change.forward_change';
const b='model.change.find_change';
test('two undeclared 4B skills identify structural metadata gap without awarding points',()=>{
 const r=audit(base([a,b],[M(a,[]),M(b,[])]));
 assert.equal(r.status,'undeclared');assert.equal(r.ruleCode,'8C2C_TOP_TWO_SKILLS_UNDECLARED');
 assert.equal(r.undeclaredMethodCount,2);assert.equal(r.exactMatchMethodCount,0);
 assert.equal(JSON.stringify(r).includes('Subtraction:'),false);
});
test('exact authored skill is counted, rather than guessing from topic text',()=>{
 const r=audit(base([a,b],[M(a,['unrelated']),M(b,['P1 Mathematics — Subtraction: Take Away within 10'])]));
 assert.equal(r.status,'exact_match_present');assert.equal(r.exactMatchMethodCount,1);
 const n=audit(base([a,b],[M(a,['take away']),M(b,['within 10'])]));
 assert.equal(n.status,'no_exact_match');
});
test('partial declarations remain a separate metadata state',()=>{
 const r=audit(base([a,b],[M(a,[]),M(b,['unrelated'])]));
 assert.equal(r.status,'partially_declared');assert.equal(r.undeclaredMethodCount,1);
});
test('cannot audit invented, duplicate, missing or unranked candidate pair',()=>{
 for(const bad of [
  base([a],[M(a,[])]),
  base([a,a],[M(a,[])]),
  base([a,b],[M(a,[])]),
  base([a,b],[M(a,[]),M(a,[]),M(b,[])]),
  base([a,'<script>'],[M(a,[]),M('<script>',[])]),
 ]) assert.equal(audit(bad).status,'not_applicable');
});
test('no secret labels or method metadata leave pure diagnostic',()=>{
 const secret='VERY_PRIVATE_ANSWER';
 const r=audit(base([a,b],[M(a,[]),M(b,[])],[secret]));
 assert.equal(JSON.stringify(r).includes(secret),false);
 for(const disallowed of ['answer_data','correct_option_ids','createClient','SUPABASE_SERVICE_ROLE_KEY','learnerPrerequisiteEvidence','fetch(','update(','insert('])
  assert.ok(!source.includes(disallowed),disallowed);
});
test('all nine competing methods have undeclared curriculum skills in submitted library',()=>{
 const specs=[
 ['phase4B4WordProblemHeuristics.ts',[a,b,'heuristic.multi_step.identify_subgoals','heuristic.multi_step.dependency_order','heuristic.multi_step.final_synthesis']],
 ['phase4B5RationalNumber.ts',['ratio.relationship.ratio_units','ratio.relationship.part_whole_connection']],
 ['phase4B6MeasurementGeometryData.ts',['geometry.angle.find_unknown','geometry.angle.known_relationships']],
 ];
 for(const [file,ids] of specs){
  const text=fs.readFileSync(path.join(root,'lib/math-intelligence/teaching/method-library/methods',file),'utf8');
  for(const id of ids){
   const at=text.indexOf('methodId: "'+id+'"');
   assert.ok(at>=0,`${id} found`);
   const block=text.slice(at,at+1700);
   assert.match(block,/curriculumSkills:\s*\[\]/,`${id} has no declared skill keys`);
  }
 }
});
test('adapter uses exact top-two and does not mutate 4C selection inputs',()=>{
 const s=fs.readFileSync(path.join(root,'lib/math/teaching/strategy-selection/phase4C4Adapter.ts'),'utf8');
 assert.match(s,/topTwoMethodIds:\s*topTwoEligibleMethodIds\(selected\.candidates\)/);
 assert.match(s,/curriculumSkillAudit/);
 assert.match(s,/selected\.status === 'ambiguous' && !validatedReview/);
 assert.doesNotMatch(s,/matches\.curriculum_skill\s*=\s*1/);
});
test('P1 explicitly numbered popped balloons have safe positive diagnostic only',()=>{
 const rel2='lib/math/teaching/strategy-selection/phase4E2B8C2BMethodDifferentiation.ts';
 const text=fs.readFileSync(path.join(root,rel2),'utf8');
 const built=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
 const mod={exports:{}};vm.runInNewContext(built.outputText,{module:mod,exports:mod.exports});
 const make=(prompt)=>({learnerLevel:1,domain:'whole_numbers',problemStructure:'subtraction_change',prompt,hasVisual:false,hasParts:false,eligibleMethodIds:[a,b]});
 const yes=mod.exports.differentiateCloselyRelatedMethods(make('There are 8 balloons. 4 pop. How many are left?'));
 assert.equal(yes.status,'evidence_found');assert.equal(yes.preferredMethodId,a);
 const no=mod.exports.differentiateCloselyRelatedMethods(make('There are 8 balloons. 4 people pop balloons. How many are left?'));
 assert.notEqual(no.status,'evidence_found');
});
test('staff output only emits allowlisted 8C2C metadata and static code',()=>{
 const s=fs.readFileSync(path.join(root,'lib/math/teaching/student-serving/phase4E2B1StaffMethodPreview.server.ts'),'utf8');
 assert.match(s,/SKILL_\$\{skillRule\}/);
 // Use explicit discriminant comparisons: Set.has() alone cannot
 // narrow the 'not_applicable' member of the audit status union.
 assert.match(s,/skill\.status === 'undeclared'/);
 assert.match(s,/skill\.status === 'no_exact_match'/);
 assert.match(s,/skill\.status === 'partially_declared'/);
 assert.match(s,/skill\.status === 'exact_match_present'/);
 assert.doesNotMatch(s,/allowedStatuses\.has\(skill\.status\)/);
 assert.match(s,/curriculumSkillAudit/);
 assert.match(s,/studentReleased: false/);assert.match(s,/teachingApproved: false/);
});
test('malformed staff audit metadata is discarded, valid audit adds a bounded reason code',async()=>{
 const file=path.join(root,'lib/math/teaching/student-serving/phase4E2B1StaffMethodPreview.server.ts');
 const src=fs.readFileSync(file,'utf8');
 const built=ts.transpileModule(src,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
 const secret='SECRET_DO_NOT_EMIT';
 const quizId='11111111-1111-4111-8111-111111111111';
 const questionId='22222222-2222-4222-8222-222222222222';
 const selection={status:'ambiguous',reasonCodes:['SINGLE_FAMILY_SELECTION_AMBIGUOUS'],primaryFamilies:['model.change'],candidateMethodCount:2,
  familySelections:[{issues:[],candidates:[a,b].map((id,index)=>({methodId:id,familyId:'model.change',eligible:true,rank:index+1,score:77,dimensionScores:[],exclusions:[]}))}],
  curriculumSkillAudit:{version:'4E-2B-8C-2C.1',status:'undeclared',ruleCode:'8C2C_TOP_TWO_SKILLS_UNDECLARED',auditedMethodCount:2,undeclaredMethodCount:2,exactMatchMethodCount:0}};
 const mocks={
  'server-only':{},
  '../../../math-intelligence/teaching/canonical/normalizeCanonicalTeachingQuestion':{normalizeCanonicalTeachingQuestion:()=>({identity:{quizId,questionId},diagnostics:{readyForUnderstanding:true,issues:[]}})},
  '../../../math-intelligence/teaching/understanding/understandTeachingQuestion':{understandTeachingQuestion:()=>({readyForMethodSelection:true})},
  '../../../math-intelligence/teaching/contract/buildTeachingContract':{buildTeachingContract:()=>({status:'ready'})},
  '../../../math-intelligence/teaching/contract/consumer/boundary':{
   createPhase4BMethodLibraryContractView:()=>({status:'ready',envelope:{}}),
   createPhase4CStrategySelectorContractView:()=>({status:'ready',envelope:{}})},
  '../strategy-selection/phase4C4Adapter':{selectFromPhase4A4B:()=>selection},
  './phase4E2A3StaffSourceResolver.server':{resolveStaffMathTeachingSource:async()=>({status:'ready',source:{answer_data:secret},sourceIdentity:{quizId,questionId}})}
 };
 const mod={exports:{}};
 vm.runInNewContext(built.outputText,{module:mod,exports:mod.exports,require:name=>{
  if(!Object.prototype.hasOwnProperty.call(mocks,name))throw Error('unexpected import');return mocks[name];
 },Request});
 const run=()=>mod.exports.previewStaffMathMethod(new Request('https://example.test'),{quizId,questionId});
 const valid=await run();
 assert.equal(valid.scoreComparison.curriculumSkillAudit.status,'undeclared');
 assert.ok(valid.reasonCodes.includes('SKILL_8C2C_TOP_TWO_SKILLS_UNDECLARED'));
 assert.equal(JSON.stringify(valid).includes(secret),false);
 selection.curriculumSkillAudit={...selection.curriculumSkillAudit,ruleCode:'8C2C_'+secret+'<script>'};
 const invalid=await run();
 assert.equal(invalid.scoreComparison.curriculumSkillAudit,undefined);
 assert.equal(JSON.stringify(invalid).includes(secret),false);
 selection.curriculumSkillAudit={status:'not_applicable',ruleCode:'8C2C_INVALID_EVIDENCE_INPUT',
  auditedMethodCount:0,undeclaredMethodCount:0,exactMatchMethodCount:0};
 const notApplicable=await run();
 assert.equal(notApplicable.scoreComparison.curriculumSkillAudit,undefined);
 assert.ok(!notApplicable.reasonCodes.some(code=>code.startsWith('SKILL_')));
});
