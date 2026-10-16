/** 4E-2B-6: strict bank-skill mapping and complete two-target sequence teaching. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
require.extensions['.ts'] = (mod, filename) => {
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal(compiled.diagnostics.length, 0);
  mod._compile(compiled.outputText, filename);
};
const libBase = path.join(root, 'lib/math-intelligence/teaching');
const gate = require(path.join(libBase, 'understanding/rules/constantIncrementPattern.ts'));
const { PHASE4B_ALL_PRODUCTION_METHODS, listPhase4BProductionCandidateMethods } = require(path.join(libBase, 'method-library/methods/phase4BProductionLibrary.ts'));
const { listPhase4B3CandidateMethods } = require(path.join(libBase, 'method-library/methods/phase4B3NumberArithmetic.ts'));
const { validateTeachingMethod } = require(path.join(libBase, 'method-library/schema/validateTeachingMethod.ts'));
const { normalizeCanonicalTeachingQuestion } = require(path.join(libBase, 'canonical/normalizeCanonicalTeachingQuestion.ts'));
const { understandTeachingQuestion } = require(path.join(libBase, 'understanding/understandTeachingQuestion.ts'));
const { buildTeachingContract } = require(path.join(libBase, 'contract/buildTeachingContract.ts'));
const { createPhase4BMethodLibraryContractView, createPhase4CStrategySelectorContractView } = require(path.join(libBase, 'contract/consumer/boundary.ts'));
const { selectFromPhase4A4B } = require(path.join(root, 'lib/math/teaching/strategy-selection/phase4C4Adapter.ts'));
const { prepareMathTeachingSourceFromDbRows } = (() => {
  const Module = require('node:module'), original = Module._load;
  Module._load = function(id, parent, isMain) {
    if (id === 'server-only') return {};
    return original.call(this, id, parent, isMain);
  };
  try { return require(path.join(root,'lib/math/teaching/student-serving/phase4E2A2TrustedSource.server.ts')); }
  finally { Module._load = original; }
})();
const methodId = 'patterns.sequence_rule.constant_increment_term_and_total';
const prompt = "George's doorbell rang 20 times during a party. One guest arrived at the first ring, 3 at the second ring, and each later ring brought 2 more guests than the previous ring. How many guests arrived at the 10th ring, and how many guests arrived altogether?";
const ids = {quiz:'11111111-1111-4111-8111-111111111111',topic:'22222222-2222-4222-8222-222222222222',question:'33333333-3333-4333-8333-333333333333'};
const rows = () => ({
  quiz:{id:ids.quiz,topic_id:ids.topic},
  topic:{id:ids.topic,subject:'math',primary_level:6,title:'Whole Numbers and Algebra'},
  link:{quiz_id:ids.quiz,question_id:ids.question,question_order:1},
  question:{id:ids.question,code:'MATH-P6-ALG-007-Q101',subject:'math',primary_level:6,topic_id:ids.topic,
    question_type:'multiple_choice',skill:'Number patterns and sequences',skill_tags:['whole-numbers-algebra'],difficulty:3,
    instruction:'Choose the correct answer.',prompt, content:{options:[
      {id:'A',text:'19 guests; 400 guests'}, {id:'B',text:'19 guests; 200 guests'},
      {id:'C',text:'21 guests; 400 guests'}, {id:'D',text:'21 guests; 420 guests'},
    ]}, answer_data:{correct_option_ids:['A']},version:1},
});
function run(inputRows) {
  const prepared = prepareMathTeachingSourceFromDbRows(inputRows);
  assert.equal(prepared.status,'ready');
  const canonical = normalizeCanonicalTeachingQuestion(prepared.source);
  assert.equal(canonical.diagnostics.readyForUnderstanding,true);
  const understanding = understandTeachingQuestion({question:canonical});
  if (!understanding.readyForMethodSelection) return {status:'understanding_blocked',understanding};
  const built = buildTeachingContract(understanding);
  assert.equal(built.status,'ready');
  const b=createPhase4BMethodLibraryContractView(built);
  const c=createPhase4CStrategySelectorContractView(built);
  assert.equal(b.status,'ready'); assert.equal(c.status,'ready');
  return selectFromPhase4A4B({methodLibraryEnvelope:b.envelope,strategyEnvelope:c.envelope});
}
const query = {
  learnerLevel:6, domain:'patterns', problemStructure:'pattern_rule',
  requiredReasoning:['pattern_application','addition','multiplication'],candidateFamilies:['patterns.sequence_rule'],
};
test('new method is reusable, versioned, question-agnostic and schema-valid', () => {
  const found=PHASE4B_ALL_PRODUCTION_METHODS.filter(m => m.methodId===methodId);
  assert.equal(found.length,1);
  const method=found[0];
  assert.equal(validateTeachingMethod(method).valid,true);
  assert.equal(method.governance.questionAgnostic,true);
  assert.deepEqual(method.applicability.curriculumSkills,['Number patterns and sequences']);
  assert.deepEqual(method.applicability.levels,[6]);
  assert.deepEqual(method.applicability.reasoning,['pattern_application','addition','multiplication']);
  assert.ok(method.pedagogy.teachingSequence.some(s=>s.stageId==='sum_all_terms'));
  assert.ok(method.pedagogy.teachingSequence.some(s=>s.stageId==='find_requested_term'));
  assert.ok(method.pedagogy.teachingSequence.some(s=>s.stageId==='verify_both_targets'));
});
test('specialist cannot be discovered from generic pattern query', () => {
  assert.equal(listPhase4BProductionCandidateMethods(query).some(m=>m.methodId===methodId),false);
  assert.equal(listPhase4B3CandidateMethods(query).some(m=>m.methodId===methodId),false);
  assert.equal(listPhase4BProductionCandidateMethods(query).some(m=>m.methodId==='patterns.sequence_rule.repeating_cycle'),true);
});
test('explicit trusted two-target signal includes specialist and excludes repeating cycle', () => {
  for(const fn of [listPhase4BProductionCandidateMethods,listPhase4B3CandidateMethods]) {
    const selected=fn({...query,verifiedConstantIncrementTermAndTotal:true});
    assert.ok(selected.some(m=>m.methodId===methodId));
    assert.ok(!selected.some(m=>m.methodId==='patterns.sequence_rule.repeating_cycle'));
    assert.ok(selected.some(m=>m.methodId==='patterns.sequence_rule.growing_difference'));
  }
});
test('Q101 has complete positive term-and-total evidence', () => {
  const evidence=gate.identifyRingArrivalIncrementPattern(prompt);
  assert.equal(evidence.requestedValue,19);
  assert.equal(evidence.totalValue,400);
});
test('Q101 selects a complete method above frozen 75/8 thresholds', () => {
  const output=run(rows());
  assert.equal(output.status,'selected', JSON.stringify(output).slice(0,900));
  assert.equal(output.selection?.primaryMethodId,methodId);
  assert.ok(output.selection?.confidenceScore>=75);
  assert.ok(output.selection?.winnerMargin>=8);
  assert.equal(output.composition?.status,'primary_only');
  assert.ok(!output.familySelections[0].candidates.some(c=>c.methodId==='patterns.sequence_rule.repeating_cycle'));
  const winner=output.familySelections[0].candidates.find(c=>c.methodId===methodId);
  assert.ok(winner?.dimensionScores.some(d=>d.dimension==='curriculum_skill'&&d.points===15));
  assert.ok(winner?.dimensionScores.some(d=>d.dimension==='required_reasoning'&&d.points===25));
});
test('missing verified bank skill label does not silently enable specialist', () => {
  const input=rows();input.question.skill='Generic arithmetic';
  const result=run(input);
  if(result.status==='understanding_blocked') return;
  assert.notEqual(result.selection?.primaryMethodId,methodId);
  assert.ok(!result.familySelections.flatMap(s=>s.candidates).some(c=>c.methodId===methodId));
});
test('inconsistent increment never enables specialist', () => {
  const input=rows(); input.question.prompt=prompt.replace('3 at the second ring','4 at the second ring');
  assert.equal(gate.identifyRingArrivalIncrementPattern(input.question.prompt),null);
  const result=run(input);
  if(result.status==='understanding_blocked') return;
  assert.ok(!result.familySelections.flatMap(s=>s.candidates).some(c=>c.methodId===methodId));
});
test('one-target story never enables specialist', () => {
  const input=rows(); input.question.prompt=prompt.replace('and how many guests arrived altogether?', '?');
  assert.equal(gate.identifyRingArrivalIncrementPattern(input.question.prompt),null);
  const result=run(input);
  if(result.status==='understanding_blocked') return;
  assert.ok(!result.familySelections.flatMap(s=>s.candidates).some(c=>c.methodId===methodId));
});
test('no answer keys, student APIs or grading/reward changes are introduced',()=>{
  const filenames=[
    'lib/math-intelligence/teaching/method-library/methods/phase4B3NumberArithmetic.ts',
    'lib/math-intelligence/teaching/method-library/methods/phase4BProductionLibrary.ts',
    'lib/math/teaching/strategy-selection/phase4C4Adapter.ts',
  ];
  for(const f of filenames) {
    const src=fs.readFileSync(path.join(root,f),'utf8');
    assert.doesNotMatch(src,/supabase\.auth|submit_math_quiz_attempt|awardDreamTokens|studentReleased:\s*true/);
  }
});
