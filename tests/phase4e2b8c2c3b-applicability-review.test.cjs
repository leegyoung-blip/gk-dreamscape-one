'use strict';
/** Phase 8C-2C.3B - positive and adversarial offline specialist applicability checks. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const lib = 'lib/math-intelligence/teaching/method-library/methods/';
const cache = {};
function load(file) {
  if (cache[file]) return cache[file].exports;
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const transpiled = ts.transpileModule(source, {fileName:file, reportDiagnostics:true, compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022}});
  assert.deepEqual((transpiled.diagnostics || []).filter(d=>d.category === ts.DiagnosticCategory.Error).map(d=>d.messageText), []);
  const module = {exports:{}};
  cache[file] = module;
  vm.runInNewContext(transpiled.outputText, {module,exports:module.exports, require(spec) {
    if (spec === '../schema/types') return {PHASE4B_METHOD_SCHEMA_VERSION:'4B.1'};
    if (spec === './phase4E2B8C2C3ASpecialistDrafts') return load(lib+'phase4E2B8C2C3ASpecialistDrafts.ts');
    throw new Error('Unexpected runtime dependency: ' + spec);
  }}, {filename:file, timeout:3000});
  return module.exports;
}
const {reviewSpecialistDraftApplicability:review} = load(lib+'phase4E2B8C2C3BApplicabilityReview.ts');
const SPACING = 'heuristic.multi_step.equal_spacing_interval_count';
const COMPARE = 'heuristic.multi_step.multiplicative_comparison_chain';
const RATIO = 'ratio.relationship.before_after_change';
const base = (methodId,domain,problemStructure,primaryFamilies,reasoning,facts,learnerLevel) => ({
  methodId,learnerLevel,domain,problemStructure,primaryFamilies,requiredReasoning:reasoning,
  hasVisual:false,visualReviewed:false,facts,
});
const spacingFacts = {kind:'equal_spacing_interval_count',firstOrdinal:5,lastOrdinal:95,gapLength:7,equalAdjacentGaps:true,indexing:'consecutive',path:'straight',goal:'distance_between_positions'};
const comparisonFacts = {kind:'multiplicative_comparison_chain',quantityKeys:['bok','james','david'],relationships:[
  {quantity:'james',relativeTo:'bok',numerator:3,denominator:1},
  {quantity:'david',relativeTo:'james',numerator:1,denominator:2},
],combinedTotalKnown:true,combinedTotalIncludesExactlyTheseQuantities:true,targetQuantity:'david',comparisonType:'multiplicative'};
const ratioFacts = {kind:'ratio_before_after_change',beforeRatio:[3,2],afterRatio:[1,2],changes:[10,76],changeEvidence:'both_explicit',quantityType:'whole_objects',goal:'original_quantity'};
const sp = () => base(SPACING,'measurement','multi_step',['heuristic.multi_step'],['subtraction','multiplication'],spacingFacts,3);
const cp = () => base(COMPARE,'whole_numbers','multi_step',['heuristic.multi_step'],['comparison','multiplication'],comparisonFacts,5);
const rp = () => base(RATIO,'ratio','ratio_relationship',['ratio.relationship'],['ratio_scaling','addition'],ratioFacts,6);
const check = (input,status,code) => {
  const r=review(input);
  assert.equal(r.status,status);
  assert.equal(r.ruleCode,`SPECIALIST_8C2C3B_${code}`);
  assert.equal(r.version,'4E-2B-8C-2C.3B');
  assert.equal(Object.isFrozen(r),true);
  assert.equal('score' in r,false);
  assert.equal('answer' in r,false);
  return r;
};
test('P3 trees: equal spacing with ordinal positions is compatible only for review',()=>check(sp(),'compatible_for_review','EQUAL_SPACING_STRUCTURE_SUPPORTED'));
test('P5 marbles: shared comparison units are consistent',()=>check(cp(),'compatible_for_review','MULTIPLICATIVE_CHAIN_SUPPORTED'));
test('P6 pencils and books: changes uniquely determine positive whole counts',()=>check(rp(),'compatible_for_review','CHANGING_RATIO_STRUCTURE_SUPPORTED'));
test('rejects unknown specialist identifier',()=>check({...sp(),methodId:'some.other.method'},'excluded','UNKNOWN_DRAFT'));
test('rejects wrong age level, even with matching mathematical facts',()=>check({...sp(),learnerLevel:2},'excluded','TAXONOMY_MISMATCH'));
test('rejects incorrect mathematical domain',()=>check({...cp(),domain:'ratio'},'excluded','TAXONOMY_MISMATCH'));
test('rejects wrong contract problem structure',()=>check({...rp(),problemStructure:'multi_step'},'excluded','TAXONOMY_MISMATCH'));
test('rejects absence of valid primary family',()=>check({...sp(),primaryFamilies:['rate.scaling']},'excluded','TAXONOMY_MISMATCH'));
test('rejects absence of required reasoning match',()=>check({...cp(),requiredReasoning:['angle_relationship']},'excluded','TAXONOMY_MISMATCH'));
test('visual evidence requires independent review',()=>check({...sp(),hasVisual:true},'insufficient_evidence','VISUAL_REVIEW_REQUIRED'));
test('reviewed visual evidence may be considered without auto-approval',()=>check({...sp(),hasVisual:true,visualReviewed:true},'compatible_for_review','EQUAL_SPACING_STRUCTURE_SUPPORTED'));
test('unavailable structure facts cannot trigger review compatibility',()=>check({...sp(),facts:null},'insufficient_evidence','STRUCTURAL_FACTS_MISSING'));
test('wrong fact kind cannot be mistaken for method evidence',()=>check({...sp(),facts:ratioFacts},'excluded','FACT_KIND_MISMATCH'));
test('spacing: objects counted instead of distance excludes method',()=>check({...sp(),facts:{...spacingFacts,goal:'count_objects'}},'excluded','SPACING_STRUCTURE_MISMATCH'));
test('spacing: nonconsecutive indexing excludes method',()=>check({...sp(),facts:{...spacingFacts,indexing:'not_consecutive'}},'excluded','SPACING_STRUCTURE_MISMATCH'));
test('spacing: circular path excludes method',()=>check({...sp(),facts:{...spacingFacts,path:'circular'}},'excluded','SPACING_STRUCTURE_MISMATCH'));
test('spacing: unequal gaps excludes method',()=>check({...sp(),facts:{...spacingFacts,equalAdjacentGaps:false}},'excluded','SPACING_STRUCTURE_MISMATCH'));
test('spacing: no verified gap length is insufficient',()=>check({...sp(),facts:{...spacingFacts,gapLength:null}},'insufficient_evidence','SPACING_FACTS_UNCONFIRMED'));
test('spacing: invalid ordinal range excludes method',()=>check({...sp(),facts:{...spacingFacts,firstOrdinal:95,lastOrdinal:5}},'excluded','INVALID_ORDINAL_RANGE'));
test('spacing: invalid nonpositive spacing excludes method',()=>check({...sp(),facts:{...spacingFacts,gapLength:0}},'excluded','SPACING_INVALID_LENGTH'));
test('multiplicative: additive comparisons cannot qualify',()=>check({...cp(),facts:{...comparisonFacts,comparisonType:'additive'}},'excluded','ADDITIVE_NOT_MULTIPLICATIVE'));
test('multiplicative: unconfirmed combined total cannot qualify',()=>check({...cp(),facts:{...comparisonFacts,combinedTotalKnown:null}},'insufficient_evidence','COMPARISON_FACTS_UNCONFIRMED'));
test('multiplicative: the total must cover exactly the represented quantities',()=>check({...cp(),facts:{...comparisonFacts,combinedTotalIncludesExactlyTheseQuantities:false}},'insufficient_evidence','COMPARISON_FACTS_UNCONFIRMED'));
test('multiplicative: disconnected graph rejected',()=>check({...cp(),facts:{...comparisonFacts,quantityKeys:['bok','james','david','may'],targetQuantity:'may'}},'excluded','DISCONNECTED_COMPARISONS'));
test('multiplicative: contradictory closed-cycle ratios rejected exactly',()=>check({...cp(),facts:{...comparisonFacts,relationships:[...comparisonFacts.relationships,{quantity:'david',relativeTo:'bok',numerator:2,denominator:1}]}},'excluded','CONTRADICTORY_MULTIPLIERS'));
test('multiplicative: valid redundant fraction path accepted',()=>check({...cp(),facts:{...comparisonFacts,relationships:[...comparisonFacts.relationships,{quantity:'david',relativeTo:'bok',numerator:3,denominator:2}]}},'compatible_for_review','MULTIPLICATIVE_CHAIN_SUPPORTED'));
test('multiplicative: invalid ratio multiplier rejected',()=>check({...cp(),facts:{...comparisonFacts,relationships:[{...comparisonFacts.relationships[0],numerator:0},comparisonFacts.relationships[1]]}},'excluded','INVALID_COMPARISON_GRAPH'));
test('multiplicative: target outside comparison set rejected',()=>check({...cp(),facts:{...comparisonFacts,targetQuantity:'extra'}},'excluded','INVALID_COMPARISON_GRAPH'));
test('changing ratio: assumed unchanged quantity is explicitly blocked',()=>check({...rp(),facts:{...ratioFacts,changeEvidence:'one_assumed'}},'excluded','UNVERIFIED_INVARIANT'));
test('changing ratio: missing changes require review',()=>check({...rp(),facts:{...ratioFacts,changes:[10,null]}},'insufficient_evidence','CHANGES_UNCONFIRMED'));
test('changing ratio: equal ratio with proportional changes cannot determine scale',()=>check({...rp(),facts:{...ratioFacts,afterRatio:[3,2],changes:[3,2]}},'excluded','NONUNIQUE_OR_CONTRADICTORY_RATIO'));
test('changing ratio: negative starting amount rejected',()=>check({...rp(),facts:{...ratioFacts,changes:[100,1]}},'excluded','NONPOSITIVE_QUANTITIES'));
test('changing ratio: fractional original object counts rejected',()=>check({...rp(),facts:{...ratioFacts,changes:[5,11]}},'excluded','FRACTIONAL_OBJECT_COUNT'));
test('changing ratio: fractional scales allowed for continuous measurements',()=>check({...rp(),facts:{...ratioFacts,changes:[5,11],quantityType:'continuous'}},'compatible_for_review','CHANGING_RATIO_STRUCTURE_SUPPORTED'));
test('changing ratio: invalid negative ratio term rejected',()=>check({...rp(),facts:{...ratioFacts,beforeRatio:[-1,2]}},'excluded','INVALID_RATIO_TERMS'));
test('changing ratio: unrelated goal rejected',()=>check({...rp(),facts:{...ratioFacts,goal:'other'}},'excluded','NOT_A_QUANTITY_TARGET'));
test('governance: production catalogue and 4C selector do not import new draft or review',()=>{
  const prod=fs.readFileSync(path.join(root,lib+'phase4BProductionLibrary.ts'),'utf8');
  const selector=fs.readFileSync(path.join(root,'lib/math/teaching/strategy-selection/phase4C4Adapter.ts'),'utf8');
  for (const source of [prod,selector]) {
    assert.doesNotMatch(source,/phase4E2B8C2C3ASpecialistDrafts|phase4E2B8C2C3BApplicabilityReview/);
  }
});
test('governance: does not read stored answers, score candidates, fetch or write to DB',()=>{
  const source=fs.readFileSync(path.join(root,lib+'phase4E2B8C2C3BApplicabilityReview.ts'),'utf8');
  for (const needle of ['answer_data','correctAnswer','studentId','quizId','questionId','createClient(','fetch(','insert(','update(','scoreCandidate(','selectTeachingStrategy(']) {
    assert.ok(!source.includes(needle),needle);
  }
});
