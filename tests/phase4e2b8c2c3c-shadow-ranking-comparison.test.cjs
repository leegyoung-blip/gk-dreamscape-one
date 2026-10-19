'use strict';
/** 8C-2C.3C: bounded, production-isolated comparisons on verified synthetic facts. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const methodsDir = 'lib/math-intelligence/teaching/method-library/methods/';
const cache = new Map();
function load(relative) {
  if (cache.has(relative)) return cache.get(relative).exports;
  const src = fs.readFileSync(path.join(root, relative), 'utf8');
  const out = ts.transpileModule(src, {fileName:relative, reportDiagnostics:true, compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
  assert.deepEqual((out.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>d.messageText),[]);
  const module = {exports:{}};
  cache.set(relative,module);
  vm.runInNewContext(out.outputText, {module,exports:module.exports,require(spec) {
    if (spec === '../schema' || spec === '../schema/types') return {
      PHASE4B_METHOD_SCHEMA_VERSION:'4B.1',
      defineTeachingMethod:x=>x,
    };
    if (!spec.startsWith('.')) throw new Error('Unexpected runtime import: '+spec);
    return load(path.posix.normalize(path.posix.join(path.posix.dirname(relative),spec+'.ts')));
  }},{filename:relative,timeout:8000});
  return module.exports;
}
const {compareSpecialistWithIncumbents:compare} = load(methodsDir+'phase4E2B8C2C3CShadowRankingComparison.ts');
const SPACING = 'heuristic.multi_step.equal_spacing_interval_count';
const CHAIN = 'heuristic.multi_step.multiplicative_comparison_chain';
const RATIO = 'ratio.relationship.before_after_change';
const snapshot = (familyId, ids, scores, status='ambiguous') => ({
  selectorImplementation:'4C-2.1',status,primaryFamilyId:familyId,
  candidates:ids.map((methodId,i)=>({methodId,familyId,eligible:true,rank:i+1,score:scores[i]})),
});
const spFacts = {kind:'equal_spacing_interval_count',firstOrdinal:5,lastOrdinal:95,gapLength:7,equalAdjacentGaps:true,indexing:'consecutive',path:'straight',goal:'distance_between_positions'};
const cpFacts = {kind:'multiplicative_comparison_chain',quantityKeys:['bok','james','david'],relationships:[{quantity:'james',relativeTo:'bok',numerator:3,denominator:1},{quantity:'david',relativeTo:'james',numerator:1,denominator:2}],combinedTotalKnown:true,combinedTotalIncludesExactlyTheseQuantities:true,targetQuantity:'david',comparisonType:'multiplicative'};
const rpFacts = {kind:'ratio_before_after_change',beforeRatio:[3,2],afterRatio:[1,2],changes:[10,76],changeEvidence:'both_explicit',quantityType:'whole_objects',goal:'original_quantity'};
const hId = ['heuristic.multi_step.dependency_order','heuristic.multi_step.final_synthesis'];
const rId = ['ratio.relationship.part_whole_connection','ratio.relationship.ratio_units'];
const review = (methodId,learnerLevel,domain,problemStructure,family,reasoning,facts) => ({
  methodId,learnerLevel,domain,problemStructure,requiredReasoning:reasoning,
  primaryFamilies:[family],hasVisual:false,visualReviewed:false,facts,
});
const sp = () => ({review:review(SPACING,3,'measurement','multi_step','heuristic.multi_step',['subtraction','multiplication'],spFacts),existing:snapshot('heuristic.multi_step',hId,[77,77])});
const cp = () => ({review:review(CHAIN,5,'whole_numbers','multi_step','heuristic.multi_step',['comparison','multiplication'],cpFacts),existing:snapshot('heuristic.multi_step',hId,[77,77])});
const rp = () => ({review:review(RATIO,6,'ratio','ratio_relationship','ratio.relationship',['ratio_scaling','addition'],rpFacts),existing:snapshot('ratio.relationship',rId,[77,77])});
const valid = (input,focus) => {
  const result=compare(input);
  assert.equal(result.version,'4E-2B-8C-2C.3C');
  assert.equal(result.status,'ready_for_staff_comparison');
  assert.equal(result.ruleCode,'SHADOW_8C2C3C_PAIRED_FOR_PEDAGOGICAL_REVIEW');
  assert.equal(result.reviewFocus,focus);
  assert.equal(result.specialistStatus,'draft');
  assert.equal(result.specialistScore,null);
  assert.equal(result.specialistRank,null);
  assert.equal(result.scoreDelta,null);
  assert.equal(result.pedagogicalRole,'unresolved');
  assert.equal(result.incumbents.length,2);
  assert.deepEqual(Array.from(result.incumbents,x=>x.score),[77,77]);
  assert.ok(result.incumbents.every(x=>x.structuralCoverage==='not_independently_verified'));
  assert.equal(Object.isFrozen(result),true);
  assert.equal(Object.isFrozen(result.incumbents),true);
  assert.equal(Object.isFrozen(result.incumbents[0]),true);
  return result;
};
test('P3: compare indexed spacing evidence with existing multi-step candidates (no fabricated score)',()=>valid(sp(),'interval_count_vs_scaffolding'));
test('P5: compare multiplicative chain with multi-step scaffolds (no fabricated score)',()=>valid(cp(),'multiplicative_chain_vs_scaffolding'));
test('P6: compare before/after ratios against static-ratio candidates',()=>valid(rp(),'changing_ratio_vs_static_ratio'));
test('reject unknown and unregistered specialist method ID',()=>assert.equal(compare({...sp(),review:{...sp().review,methodId:'fake.method'}}).status,'excluded'));
test('reject draft whose facts are inconsistent',()=>assert.equal(compare({...cp(),review:{...cp().review,facts:{...cpFacts,comparisonType:'additive'}}}).status,'excluded'));
test('do not rank draft when structural facts absent',()=>assert.equal(compare({...rp(),review:{...rp().review,facts:null}}).status,'insufficient_evidence'));
test('visual work must be confirmed independently',()=>assert.equal(compare({...sp(),review:{...sp().review,hasVisual:true,visualReviewed:false}}).status,'insufficient_evidence'));
test('method must be matched to question taxonomy',()=>assert.equal(compare({...sp(),review:{...sp().review,learnerLevel:2}}).status,'excluded'));
test('malformed missing input fails safely',()=>assert.equal(compare(null).status,'invalid_snapshot'));
test('unknown selector version blocked',()=>assert.equal(compare({...sp(),existing:{...sp().existing,selectorImplementation:'anything'}}).status,'invalid_snapshot'));
test('tampered method ID blocked (not in production catalogue)',()=>assert.equal(compare({...sp(),existing:snapshot('heuristic.multi_step',['made.up.id',hId[1]],[77,77])}).status,'invalid_snapshot'));
test('incumbent draft cannot impersonate active 4B candidate',()=>assert.equal(compare({...sp(),existing:snapshot('heuristic.multi_step',[SPACING,hId[1]],[77,77])}).status,'invalid_snapshot'));
test('wrong family on incumbent candidate blocked',()=>assert.equal(compare({...sp(),existing:snapshot('ratio.relationship',hId,[77,77])}).status,'invalid_snapshot'));
test('cross-family comparisons cannot choose winner',()=>assert.equal(compare({...sp(),existing:snapshot('ratio.relationship',rId,[77,77])}).status,'invalid_snapshot'));
test('question level 6 remains valid for original multi-step incumbents',()=>assert.equal(compare({...sp(),review:{...sp().review,learnerLevel:6}}).status,'ready_for_staff_comparison'));
test('invalid 4C status string cannot be treated as an ordinary non-ambiguous result',()=>assert.equal(compare({...sp(),existing:{...sp().existing,status:'not_a_status'}}).status,'invalid_snapshot'));
test('duplicate incumbent candidates rejected',()=>assert.equal(compare({...sp(),existing:snapshot('heuristic.multi_step',[hId[0],hId[0]],[77,77])}).status,'invalid_snapshot'));
test('invalid over-limit scoring blocked',()=>assert.equal(compare({...sp(),existing:snapshot('heuristic.multi_step',hId,[101,77])}).status,'invalid_snapshot'));
test('negative and non-finite scoring blocked',()=>{for(const n of [-1,Infinity,NaN]) assert.equal(compare({...sp(),existing:snapshot('heuristic.multi_step',hId,[77,n])}).status,'invalid_snapshot');});
test('untrustworthy rank gaps rejected',()=>{const s=sp(); s.existing.candidates[1].rank=3; assert.equal(compare(s).status,'invalid_snapshot');});
test('score ordering contradicted by ranks rejected',()=>assert.equal(compare({...sp(),existing:snapshot('heuristic.multi_step',hId,[70,77])}).status,'invalid_snapshot'));
test('winner ties preserve existing rank order but never resolve margin',()=>{const r=valid(sp(),'interval_count_vs_scaffolding'); assert.equal(r.incumbents[0].rank,1); assert.equal(r.incumbents[1].rank,2);});
test('excluded candidate is allowed but omitted from comparison',()=>{const i=sp(); i.existing.candidates.push({methodId:'heuristic.multi_step.identify_subgoals',familyId:'heuristic.multi_step',eligible:false,rank:null,score:null}); assert.equal(compare(i).status,'ready_for_staff_comparison');});
test('invalid excluded candidate with nonnull score fails closed',()=>{const i=sp(); i.existing.candidates.push({methodId:'heuristic.multi_step.identify_subgoals',familyId:'heuristic.multi_step',eligible:false,rank:null,score:50}); assert.equal(compare(i).status,'invalid_snapshot');});
test('only one eligible method cannot form comparative pair',()=>{const i=sp(); i.existing.candidates.pop(); assert.equal(compare(i).status,'insufficient_evidence');});
test('selected or blocked cases do not trigger comparative ranking',()=>{for(const s of ['selected','blocked']) assert.equal(compare({...sp(),existing:{...sp().existing,status:s}}).status,'not_applicable');});
test('selected outcome cannot be silently changed by this shadow report',()=>{const r=compare({...sp(),existing:{...sp().existing,status:'selected'}}); assert.equal(r.incumbents.length,0); assert.equal(r.specialistScore,null);});
test('top-three score cases report only the true top two',()=>{const ids=['heuristic.multi_step.identify_subgoals',...hId]; const s={...sp(),existing:snapshot('heuristic.multi_step',ids,[77,70.75,70.75])}; const r=compare(s); assert.deepEqual(Array.from(r.incumbents,x=>x.methodId),ids.slice(0,2));});
test('source does not wire drafts into live catalogue/selector/persistence',()=>{
  const production=fs.readFileSync(path.join(root,methodsDir+'phase4BProductionLibrary.ts'),'utf8');
  const selector=fs.readFileSync(path.join(root,'lib/math/teaching/strategy-selection/phase4C4Adapter.ts'),'utf8');
  for(const source of [production,selector]) assert.doesNotMatch(source,/phase4E2B8C2C3CShadowRankingComparison/);
  const source=fs.readFileSync(path.join(root,methodsDir+'phase4E2B8C2C3CShadowRankingComparison.ts'),'utf8');
  for(const forbidden of ['answer_data','correctAnswer','studentId','fetch(','createClient(','insert(','update(','selectTeachingStrategy(','awardDreamTokens']) assert.ok(!source.includes(forbidden),forbidden);
});
