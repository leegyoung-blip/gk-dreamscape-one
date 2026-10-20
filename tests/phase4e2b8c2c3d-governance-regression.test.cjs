'use strict';
/**
 * DREAMSCAPE ONE — Phase 4E-2B-8C-2C.3D.
 * Additive, offline-only regression & governance checks for draft specialist methods.
 * These tests do NOT authorise release, validate staff identity, or verify fact provenance.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname,'..');
const methodsDir = 'lib/math-intelligence/teaching/method-library/methods/';
const {parseCsv,validateCoverage} = require('../scripts/phase4e2b8c2c3d-verify-coverage.cjs');
const baseline = require('./fixtures/phase4e2b8c2c3d-baseline.json');
const cache=new Map();
function load(relative) {
  if(cache.has(relative)) return cache.get(relative).exports;
  const src=fs.readFileSync(path.join(root,relative),'utf8');
  const out=ts.transpileModule(src,{fileName:relative,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}});
  assert.deepEqual((out.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).map(x=>x.messageText),[]);
  const module={exports:{}};
  cache.set(relative,module);
  vm.runInNewContext(out.outputText,{module,exports:module.exports,BigInt,require(spec) {
    if(spec==='../schema' || spec==='../schema/types') return {PHASE4B_METHOD_SCHEMA_VERSION:'4B.1',defineTeachingMethod:x=>x};
    if(!spec.startsWith('.')) throw new Error('Unexpected runtime import '+spec);
    return load(path.posix.normalize(path.posix.join(path.posix.dirname(relative),spec+'.ts')));
  }},{filename:relative,timeout:8000});
  return module.exports;
}
const {PHASE4E2B8C2C3A_SPECIALIST_DRAFTS:drafts}=load(methodsDir+'phase4E2B8C2C3ASpecialistDrafts.ts');
const {PHASE4B_ALL_PRODUCTION_METHODS:production}=load(methodsDir+'phase4BProductionLibrary.ts');
const {compareSpecialistWithIncumbents:compare}=load(methodsDir+'phase4E2B8C2C3CShadowRankingComparison.ts');
const {reviewSpecialistDraftApplicability:review}=load(methodsDir+'phase4E2B8C2C3BApplicabilityReview.ts');
const ID={spacing:'heuristic.multi_step.equal_spacing_interval_count',chain:'heuristic.multi_step.multiplicative_comparison_chain',ratio:'ratio.relationship.before_after_change'};
const INC={multi:['heuristic.multi_step.dependency_order','heuristic.multi_step.final_synthesis'],ratio:['ratio.relationship.part_whole_connection','ratio.relationship.ratio_units']};
const facts={
  spacing:{kind:'equal_spacing_interval_count',firstOrdinal:5,lastOrdinal:95,gapLength:7,equalAdjacentGaps:true,indexing:'consecutive',path:'straight',goal:'distance_between_positions'},
  chain:{kind:'multiplicative_comparison_chain',quantityKeys:['a','b','c'],relationships:[{quantity:'b',relativeTo:'a',numerator:3,denominator:1},{quantity:'c',relativeTo:'b',numerator:1,denominator:2}],combinedTotalKnown:true,combinedTotalIncludesExactlyTheseQuantities:true,targetQuantity:'c',comparisonType:'multiplicative'},
  ratio:{kind:'ratio_before_after_change',beforeRatio:[3,2],afterRatio:[1,2],changes:[10,76],changeEvidence:'both_explicit',quantityType:'whole_objects',goal:'original_quantity'},
};
const cases=[
  {type:'spacing',level:3,domain:'measurement',structure:'multi_step',reasoning:['subtraction','multiplication'],family:'heuristic.multi_step',inc:INC.multi},
  {type:'chain',level:5,domain:'whole_numbers',structure:'multi_step',reasoning:['comparison','multiplication'],family:'heuristic.multi_step',inc:INC.multi},
  {type:'ratio',level:6,domain:'ratio',structure:'ratio_relationship',reasoning:['ratio_scaling','addition'],family:'ratio.relationship',inc:INC.ratio},
];
function input(c) {
  return {review:{methodId:ID[c.type],learnerLevel:c.level,domain:c.domain,
    problemStructure:c.structure,requiredReasoning:c.reasoning,primaryFamilies:[c.family],
    hasVisual:false,visualReviewed:false,facts:facts[c.type]},
    existing:{selectorImplementation:'4C-2.1',status:'ambiguous',primaryFamilyId:c.family,
      candidates:c.inc.map((methodId,i)=>({methodId,familyId:c.family,eligible:true,rank:i+1,score:77}))}};
}
function textSource(relative){return fs.readFileSync(path.join(root,relative),'utf8');}

test('3D: drafts are inactive and have not been registered in the active 4B catalogue',()=>{
  assert.equal(drafts.length,3);
  const unique=new Set(drafts.map(x=>x.methodId));
  assert.equal(unique.size,3);
  for(const d of drafts) {
    assert.equal(d.status,'draft');
    assert.deepEqual(Array.from(d.applicability.curriculumSkills),[]);
    assert.ok(!production.some(x=>x.methodId===d.methodId));
  }
});

test('3D: production entry points do not import specialist draft, applicability, or shadow modules',()=>{
  const productionEntrypoints=[
    methodsDir+'phase4BProductionLibrary.ts',
    'lib/math/teaching/strategy-selection/phase4C4Adapter.ts',
    'lib/math/teaching/student-serving/phase4E2B1StaffMethodPreview.server.ts',
    'lib/math/teaching/student-serving/phase4D4MethodService.server.ts',
  ];
  for(const file of productionEntrypoints) {
    const s=textSource(file);
    assert.doesNotMatch(s,/phase4E2B8C2C3[ABC]/,file);
  }
});

test('3D: specialist comparison and applicability code has no external I/O or answer-key dependency',()=>{
  const files=['phase4E2B8C2C3BApplicabilityReview.ts','phase4E2B8C2C3CShadowRankingComparison.ts'];
  for(const file of files) {
    const source=ts.createSourceFile(file,textSource(methodsDir+file),ts.ScriptTarget.ES2022,true);
    function visit(node){
      if(ts.isImportDeclaration(node)) assert.ok(node.moduleSpecifier.text.startsWith('.'),file);
      if(ts.isCallExpression(node)) {
        const call=node.expression.getText(source);
        assert.ok(!/^(fetch|createClient|eval|exec|writeFile|writeFileSync)$/.test(call),file+':'+call);
      }
      ts.forEachChild(node,visit);
    }
    visit(source);
    for(const key of ['answer_data','service_role','studentId','insert(','.update(','.delete('])
      assert.ok(!source.text.includes(key),file+':'+key);
  }
});

for(const c of cases) {
  test(`3D ${c.type}: compatible means review only, no score, role or release authorisation`,()=>{
    const i=input(c);const r=review(i.review);const s=compare(i);
    assert.equal(r.status,'compatible_for_review');
    assert.equal(s.status,'ready_for_staff_comparison');
    assert.equal(s.specialistStatus,'draft');
    assert.equal(s.specialistScore,null);
    assert.equal(s.specialistRank,null);
    assert.equal(s.scoreDelta,null);
    assert.equal(s.pedagogicalRole,'unresolved');
    assert.equal(s.incumbents.length,2);
    assert.ok(s.incumbents.every(x=>x.structuralCoverage==='not_independently_verified'));
    assert.ok(Object.isFrozen(s));
    assert.ok(Object.isFrozen(s.incumbents));
    assert.ok(Object.isFrozen(s.incumbents[0]));
  });
  test(`3D ${c.type}: unsupported or absent mathematical facts cannot be promoted`,()=>{
    const i=input(c);
    assert.notEqual(compare({...i,review:{...i.review,facts:null}}).status,'ready_for_staff_comparison');
    assert.notEqual(compare({...i,review:{...i.review,hasVisual:true,visualReviewed:false}}).status,'ready_for_staff_comparison');
    assert.notEqual(compare({...i,existing:{...i.existing,status:'selected'}}).status,'ready_for_staff_comparison');
    assert.notEqual(compare({...i,existing:{...i.existing,selectorImplementation:'untrusted'}}).status,'ready_for_staff_comparison');
    assert.notEqual(compare({...i,existing:{...i.existing,candidates:i.existing.candidates.map((x,j)=>({...x,score:j?77:105}))}}).status,'ready_for_staff_comparison');
  });
}

test('3D: top-two report does not invent a preference from tied incumbent scores',()=>{
  for(const c of cases){
    const r=compare(input(c));
    assert.deepEqual(Array.from(r.incumbents,x=>x.rank),[1,2]);
    assert.deepEqual(Array.from(r.incumbents,x=>x.score),[77,77]);
    assert.equal(r.pedagogicalRole,'unresolved');
  }
});

test('3D: P4 visual question is not validated by text-only specialist matching',()=>{
  const c=cases[0];const i=input(c);
  assert.equal(compare({...i,review:{...i.review,hasVisual:true,visualReviewed:false}}).status,'insufficient_evidence');
});

test('3D: no source claims staff authentication or independently verified provenance',()=>{
  // Governance disclosure test: these are pure offline utilities. An authenticated staff
  // source resolver and independently reviewed fact provenance are still integration gates.
  const s=textSource(methodsDir+'phase4E2B8C2C3CShadowRankingComparison.ts');
  assert.match(s,/Callers MUST provide independently reviewed mathematical facts/);
  assert.match(s,/this pure function does not authenticate its origin/);
  const a=textSource(methodsDir+'phase4E2B8C2C3BApplicabilityReview.ts');
  assert.match(a,/DOES NOT authenticate a reviewer or validate evidence provenance/);
});

function csvFromBaseline() {
  const keys=['Question code','Outcome','Method ID','Top candidate','Top score / 100','Second candidate','Second score / 100','Reason codes / error'];
  const rows=baseline.rows.map(x=>[x.code,x.outcome,x.methodId||'',x.topMethodId||'',
    x.topScore===undefined?'':String(x.topScore),x.secondMethodId||'',x.secondScore===undefined?'':String(x.secondScore),
    (x.reasonCodes||[]).join(' · ')]);
  return [keys,...rows].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n')+'\r\n';
}

test('3D: pinned sample includes exactly five selected and seven ambiguous cases',()=>{
  assert.equal(baseline.rows.length,12);
  assert.equal(baseline.rows.filter(x=>x.outcome==='selected').length,5);
  assert.equal(baseline.rows.filter(x=>x.outcome==='ambiguous').length,7);
  assert.equal(new Set(baseline.rows.map(x=>x.code)).size,12);
  assert.deepEqual(validateCoverage(csvFromBaseline(),baseline).issues,[]);
});

test('3D: P4 top-two pair remains identify_subgoals vs dependency_order',()=>{
  const r=baseline.rows.find(x=>x.code==='MATH-P4-NUM-043-Q102');
  assert.ok(r);
  assert.equal(r.topMethodId,'heuristic.multi_step.identify_subgoals');
  assert.equal(r.secondMethodId,'heuristic.multi_step.dependency_order');
  assert.equal(r.topScore,77);
  assert.equal(r.secondScore,70.75);
});

test('3D: specialist reasoning codes exist on P3, P5 and P6 baseline samples',()=>{
  for(const [question,code] of [
    ['MATH-P3-MEAS-013-Q104','RANK_8C2C2_EQUAL_SPACING_INTERVAL_COUNT_REVIEW'],
    ['MATH-P5-NUM-024-Q104','RANK_8C2C2_MULTIPLICATIVE_CHAIN_REVIEW'],
    ['MATH-P6-RATIO-023-Q103','RANK_8C2C2_CHANGING_RATIO_REVIEW'],
  ]){
    assert.ok(baseline.rows.find(x=>x.code===question)?.reasonCodes.includes(code));
  }
});

test('3D: CSV reader accepts quoted commas and escaped quotes',()=>{
  const csv='"Question code","Quiz"\n"A","Work, \""check\"""\n';
  assert.deepEqual(parseCsv(csv),[{'Question code':'A','Quiz':'Work, "check"'}]);
});

test('3D: changed selection is detected as regression',()=>{
  const changed=csvFromBaseline().replace('"MATH-P1-GEO-012-Q03","selected"','"MATH-P1-GEO-012-Q03","ambiguous"');
  assert.ok(validateCoverage(changed,baseline).issues.some(x=>x.includes('outcome changed')));
});

test('3D: changed candidate score is detected as regression',()=>{
  const changed=csvFromBaseline().replace('"77","model.change.forward_change"','"79","model.change.forward_change"');
  assert.ok(validateCoverage(changed,baseline).issues.some(x=>x.includes('Top score')));
});

test('3D: missing mathematical reasoning diagnostic is detected',()=>{
  const changed=csvFromBaseline().replace('RANK_8C2C2_CHANGING_RATIO_REVIEW','RANK_8C2C2_UNKNOWN');
  assert.ok(validateCoverage(changed,baseline).issues.some(x=>x.includes('CHANGING_RATIO_REVIEW')));
});

test('3D: duplicate sample questions are rejected',()=>{
  const src=csvFromBaseline().trimEnd();const last=src.split('\r\n').at(-1);
  assert.throws(()=>validateCoverage(src+'\r\n'+last+'\r\n',baseline),/duplicate question code/);
});

test('3D: incomplete or unparseable coverage fails closed',()=>{
  assert.throws(()=>parseCsv('"broken'),/Unclosed quoted/);
  assert.throws(()=>validateCoverage('no,required,headers\na,b,c\n',baseline),/Missing required/);
});
