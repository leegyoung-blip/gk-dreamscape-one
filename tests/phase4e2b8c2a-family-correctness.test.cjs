/* Phase 4E-2B-8C-2A: positive and negative math-method family checks. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
require.extensions['.ts'] = (mod, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal(result.diagnostics.length, 0);
  mod._compile(result.outputText, filename);
};
const lib = path.join(root, 'lib/math-intelligence/teaching');
const { identifyVerifiedFactorDigitEvidence } = require(path.join(lib, 'understanding/rules/factorDigitEvidence.ts'));
const { PHASE4B_ALL_PRODUCTION_METHODS, listPhase4BProductionCandidateMethods } = require(path.join(lib,'method-library/methods/phase4BProductionLibrary.ts'));
const { validateTeachingMethod } = require(path.join(lib, 'method-library/schema/validateTeachingMethod.ts'));
const { normalizeCanonicalTeachingQuestion } = require(path.join(lib, 'canonical/normalizeCanonicalTeachingQuestion.ts'));
const { understandTeachingQuestion } = require(path.join(lib, 'understanding/understandTeachingQuestion.ts'));
const { buildTeachingContract } = require(path.join(lib, 'contract/buildTeachingContract.ts'));
const { createPhase4BMethodLibraryContractView, createPhase4CStrategySelectorContractView } = require(path.join(lib, 'contract/consumer/boundary.ts'));
const { selectFromPhase4A4B } = require(path.join(root, 'lib/math/teaching/strategy-selection/phase4C4Adapter.ts'));
const Module = require('node:module');
let prepareMathTeachingSourceFromDbRows;
{
  const original = Module._load;
  Module._load = function(id, parent, isMain) { if (id === 'server-only') return {}; return original.call(this,id,parent,isMain); };
  try {({prepareMathTeachingSourceFromDbRows}=require(path.join(root,'lib/math/teaching/student-serving/phase4E2A2TrustedSource.server.ts'))); }
  finally {Module._load = original;}
}
const CASES = [
  {
    level:2, code:'MATH-P2-NUM-106-Q04', skill:'Whole Numbers and Operations Mastery', type:'numeric',
    topic:'Whole Numbers and Operations',
    prompt:'There are 24 candles. Some go out. The number still lit can be divided equally by both 4 and 6. How many could remain if at least one candle went out and the greatest possible number remained?',
    answer:{kind:'numeric',value:12,display_answer:'12',tolerance:0},
    kind:'bounded_common_multiple', expected:'number.factors_multiples.bounded_common_multiple_maximum',
  },
  {
    level:3, code:'MATH-P3-NUM-078-Q104', skill:'Counting arrangements',type:'multiple_choice',
    topic:'Whole Numbers',
    prompt:'How many different 3-digit even numbers can be formed using the digits 2, 5, 6 and 0 without repeating a digit?',
    options:[{id:'A',text:'14'},{id:'B',text:'13'},{id:'C',text:'15'},{id:'D',text:'16'}],
    answer:{correct_option_ids:['A'],display_answer:'14'},kind:'constrained_digit_formation',expected:'number.place_value.constrained_digit_formation',
  },
  {
    level:6,code:'MATH-P6-ALG-032-Q104', skill:'Highest common factor',type:'multiple_choice',
    topic:'Whole Numbers and Algebra',
    prompt:'Bales of cloth are 126 m, 140 m, 154 m and 238 m long. They are cut into equal-length pieces with no waste. What is the greatest possible length of each piece, and how many pieces are obtained altogether?',
    options:[{id:'A',text:'7 m; 94 pieces'},{id:'B',text:'14 m; 47 pieces'},{id:'C',text:'14 m; 44 pieces'},{id:'D',text:'28 m; 24 pieces'}],
    answer:{correct_option_ids:['B'],display_answer:'14 m; 47 pieces'},kind:'common_factor_partition',expected:'number.factors_multiples.hcf_equal_cut_and_count',
  },
];
const uuid={quiz:'11111111-1111-4111-8111-111111111111',topic:'22222222-2222-4222-8222-222222222222',question:'33333333-3333-4333-8333-333333333333'};
function rows(q) {return {
  quiz:{id:uuid.quiz,topic_id:uuid.topic},topic:{id:uuid.topic,subject:'math',primary_level:q.level,title:q.topic},
  link:{quiz_id:uuid.quiz,question_id:uuid.question,question_order:1},
  question:{id:uuid.question,code:q.code,subject:'math',primary_level:q.level,topic_id:uuid.topic,
    question_type:q.type,skill:q.skill,skill_tags:[],difficulty:3,instruction:q.type==='multiple_choice'?'Choose the correct answer.':'Enter the answer.',
    prompt:q.prompt,content:{options:q.options??[]},answer_data:q.answer,version:1},
};}
function evaluate(q) {
  const prepared=prepareMathTeachingSourceFromDbRows(rows(q));
  assert.equal(prepared.status,'ready',JSON.stringify(prepared));
  const canonical=normalizeCanonicalTeachingQuestion(prepared.source);
  assert.equal(canonical.diagnostics.readyForUnderstanding,true,JSON.stringify(canonical.diagnostics));
  const understanding=understandTeachingQuestion({question:canonical});
  if(!understanding.readyForMethodSelection) return {type:'blocked_4a', understanding};
  const built=buildTeachingContract(understanding);
  assert.equal(built.status,'ready',JSON.stringify(built).slice(0,1400));
  const b=createPhase4BMethodLibraryContractView(built);
  const c=createPhase4CStrategySelectorContractView(built);
  assert.equal(b.status,'ready');assert.equal(c.status,'ready');
  return {type:'selector', understanding, result:selectFromPhase4A4B({methodLibraryEnvelope:b.envelope,strategyEnvelope:c.envelope})};
}
for(const q of CASES) {
  test(q.code+' prompt evidence matches its exact mathematics',()=>{
    assert.equal(identifyVerifiedFactorDigitEvidence(q.prompt)?.kind,q.kind);
  });
  test(q.code+' selects the semantically correct teaching family',()=>{
    const output=evaluate(q);
    assert.equal(output.type,'selector',JSON.stringify(output.understanding?.gateDiagnostics).slice(0,1200));

    assert.equal(output.result.status,'selected',JSON.stringify(output.result).slice(0,1800));
    assert.equal(output.result.selection?.primaryMethodId,q.expected);
    assert.ok(output.result.selection?.confidenceScore>=75);
    const margin = output.result.selection?.winnerMargin;
    // With only one eligible candidate there is no runner-up margin to measure.
    assert.ok(margin === null || margin >= 8);
  });
}
test('bounded common multiple excludes equal-to-bound candidate and non-positive results',()=>{
 assert.equal(identifyVerifiedFactorDigitEvidence(CASES[0].prompt)?.greatestRemaining,12);
 assert.equal(identifyVerifiedFactorDigitEvidence(CASES[0].prompt.replace('24 candles','12 candles')),null);
 assert.equal(identifyVerifiedFactorDigitEvidence(CASES[0].prompt.replace('at least one candle went out','all candles stay lit')),null);
});
test('HCF detector works for the entire no-waste piece-count requirement, not only one length',()=>{
 const e=identifyVerifiedFactorDigitEvidence(CASES[2].prompt);
 assert.deepEqual([e.greatestPieceLength,e.totalPieces],[14,47]);
 assert.equal(identifyVerifiedFactorDigitEvidence(CASES[2].prompt.replace('with no waste','with some waste')),null);
 assert.equal(identifyVerifiedFactorDigitEvidence(CASES[2].prompt.replace('and how many pieces are obtained altogether','')),null);
 assert.equal(identifyVerifiedFactorDigitEvidence(CASES[2].prompt.replace('238 m','238 cm')),null);
});
test('digit detector enforces zero, parity, and no repetition',()=>{
 assert.equal(identifyVerifiedFactorDigitEvidence(CASES[1].prompt)?.count,14);
 assert.equal(identifyVerifiedFactorDigitEvidence(CASES[1].prompt.replace('without repeating a digit','with repetition allowed')),null);
 assert.equal(identifyVerifiedFactorDigitEvidence(CASES[1].prompt.replace('3-digit even','3-digit odd')),null);
 assert.equal(identifyVerifiedFactorDigitEvidence(CASES[1].prompt.replace('2, 5, 6 and 0','2, 5, 6 and 6')),null);
});
test('new methods are governed, answer-agnostic, structurally valid',()=>{
 for(const id of [CASES[0].expected,CASES[2].expected]) {
  const methods=PHASE4B_ALL_PRODUCTION_METHODS.filter(m=>m.methodId===id);
  assert.equal(methods.length,1);
  assert.equal(validateTeachingMethod(methods[0]).valid,true,JSON.stringify(validateTeachingMethod(methods[0])));
  assert.equal(methods[0].governance.answerAgnostic,true);
  assert.equal(methods[0].governance.questionAgnostic,true);
 }
});
test('unverified candidate query cannot discover specialist factor methods',()=>{
 for(const q of CASES.filter(q=>q.kind!=='constrained_digit_formation')) {
  const evidence=identifyVerifiedFactorDigitEvidence(q.prompt);
  const query={learnerLevel:q.level,domain:'whole_numbers',problemStructure:evidence.kind,
    requiredReasoning:['division','common_multiple','multiplication','addition','comparison'],candidateFamilies:['number.factors_multiples']};
  assert.equal(listPhase4BProductionCandidateMethods(query).some(m=>m.methodId===q.expected),false);
 }
});
