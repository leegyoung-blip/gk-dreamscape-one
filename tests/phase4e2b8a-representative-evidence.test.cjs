const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

require.extensions['.ts'] = (mod, filename) => {
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  mod._compile(js.outputText, filename);
};

const rules = require(path.resolve(__dirname, '../lib/math-intelligence/teaching/understanding/rules/representativeWordProblemEvidence.ts'));
const { analyzeProblemStructure } = require(path.resolve(__dirname, '../lib/math-intelligence/teaching/understanding/rules/structureRules.ts'));
const identify = rules.identifyRepresentativeWordProblemEvidence;
const prompts = Object.freeze({
  p2: 'Which shape has 4 equal straight sides and 4 corners?',
  p3: 'Trees are planted 7 m apart along a straight road. What is the distance between the 5th tree and the 95th tree?',
  p5marbles: 'Bok has some marbles. James has thrice as many as Bok. David has half as many as James. Together they have 209 marbles. How many marbles does David have?',
  p5tables: 'King bought 80 tables and chairs for $1,780. After 20 chairs were given away, the remaining numbers of tables and chairs were equal. Each table cost $6 more than each chair. (a) How many chairs did King buy? (b) What was the cost of each chair?',
  p4: 'A box containing 58 iron balls weighed 2145g. When 46 of the iron balls were removed, the mass of the box and the remaining iron balls weighed 489g. What was the mass of the box?',
});

test('P2 shape properties are matched explicitly without inferring an answer', () => {
  const result = identify(prompts.p2, 'geometry');
  assert.equal(result.reasonCode, 'STRUCTURE_EXPLICIT_EQUAL_SIDE_CORNER_PROPERTIES');
  assert.equal(result.problemStructure, 'property_matching');
  assert.equal(result.computedAnswer, null);
  assert.ok(result.confidence >= 0.78);
});

test('P3 tree-spacing uses 95 - 5 = 90 intervals, then 90 * 7 = 630 m', () => {
  const result = identify(prompts.p3, 'measurement');
  assert.equal(result.reasonCode, 'STRUCTURE_EQUAL_TREE_SPACING_INTERVAL_COUNT');
  assert.equal(result.computedAnswer, '630 m');
  assert.deepEqual(result.requiredReasoning, ['subtraction', 'multiplication']);
});

test('P5 marbles respects three-person multiplicative relationship', () => {
  const result = identify(prompts.p5marbles, 'whole_numbers');
  assert.equal(result.computedAnswer, '57');
  assert.equal(result.problemStructure, 'multi_step');
});

test('P5 tables/chairs verifies dual-cost constraints but does not emit one scalar answer', () => {
  const result = identify(prompts.p5tables, 'whole_numbers');
  assert.equal(result.reasonCode, 'STRUCTURE_TWO_QUANTITY_COST_SYSTEM');
  assert.equal(result.computedAnswer, null);
  assert.ok(result.requiredReasoning.includes('equation_solving'));
});

test('analyzeProblemStructure uses the representative rules before generic fallbacks', () => {
  const cases = [
    [prompts.p2,'geometry','STRUCTURE_EXPLICIT_EQUAL_SIDE_CORNER_PROPERTIES'],
    [prompts.p3,'measurement','STRUCTURE_EQUAL_TREE_SPACING_INTERVAL_COUNT'],
    [prompts.p5marbles,'whole_numbers','STRUCTURE_THREE_PERSON_MULTIPLICATIVE_PARTS'],
    [prompts.p5tables,'whole_numbers','STRUCTURE_TWO_QUANTITY_COST_SYSTEM'],
  ];
  for (const [text,domain,code] of cases) {
    const result = analyzeProblemStructure({text,domain,curriculum:{}});
    assert.equal(result.reasonCode,code);
  }
});

test('refuses unsupported/contradictory equal-spacing variants', () => {
  assert.equal(identify(prompts.p3.replace('7 m apart', 'various distances apart'), 'measurement'), null);
  assert.equal(identify(prompts.p3.replace('95th tree', '5th tree'), 'measurement'), null);
  assert.equal(identify(prompts.p3, 'whole_numbers'), null);
});

test('refuses ungrounded geometry classifications', () => {
  assert.equal(identify('Which shape has a flat surface?', 'geometry'), null);
  assert.equal(identify('Which shape has 4 equal straight sides?', 'geometry'), null);
});

test('refuses inconsistent P5 multiplicative and system constraints', () => {
  assert.equal(identify(prompts.p5marbles.replace('209 marbles', '210 marbles'), 'whole_numbers'), null);
  assert.equal(identify(prompts.p5marbles.replace('thrice as many', 'twice as many'), 'whole_numbers'), null);
  assert.equal(identify(prompts.p5tables.replace('80 tables', '81 tables'), 'whole_numbers'), null);
  assert.equal(identify(prompts.p5tables.replace('remaining numbers of tables and chairs were equal', 'remaining numbers of tables and chairs were different'), 'whole_numbers'), null);
});

test('does not change or bypass the P4 answer-mismatch gate', () => {
  assert.equal(identify(prompts.p4,'whole_numbers'), null);
  assert.equal(identify(prompts.p4,'measurement'), null);
  const source = fs.readFileSync(path.resolve(__dirname, '../lib/math-intelligence/teaching/understanding/rules/readinessGate.ts'),'utf8');
  assert.match(source,/GATE_ANSWER_MISMATCH/);
});

test('never uses question codes or answer_data to choose these rules', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../lib/math-intelligence/teaching/understanding/rules/representativeWordProblemEvidence.ts'),'utf8');
  assert.doesNotMatch(source,/MATH-P\d|answer_data|correct_option_ids|display_answer/);
});

// Full 4A path using internal synthetic answer values for deterministic
// regression ONLY. These are not exported from the live answer bank.
const { normalizeCanonicalTeachingQuestion } = require(path.resolve(__dirname, '../lib/math-intelligence/teaching/canonical/normalizeCanonicalTeachingQuestion.ts'));
const { understandTeachingQuestion } = require(path.resolve(__dirname, '../lib/math-intelligence/teaching/understanding/understandTeachingQuestion.ts'));
function verifyThrough4A(level, topic, skill, questionType, prompt, answerData, options = []) {
  const canonical = normalizeCanonicalTeachingQuestion({
    sourceType: 'quiz', sourceTable: 'math_questions',
    quizId: '11111111-1111-4111-8111-111111111111',
    question: {
      id: '22222222-2222-4222-8222-222222222222',
      code: 'OFFLINE-TEST-ONLY', subject: 'math', primary_level: level,
      topic_title: topic, skill, question_type: questionType,
      prompt, content: {options}, answer_data: answerData,
    },
  });
  assert.equal(canonical.diagnostics.readyForUnderstanding,true);
  return understandTeachingQuestion({question:canonical});
}

test('full 4A path accepts P2 shape properties with strict readiness gates',()=>{
  const u = verifyThrough4A(2,'Geometry','2D Shapes and Lines','multiple_choice',prompts.p2,
    {correct_option_ids:['A']},[{id:'A',text:'square'},{id:'B',text:'rectangle'}]);
  assert.equal(u.problemStructure,'property_matching');
  assert.equal(u.readyForMethodSelection,true);
  assert.deepEqual(u.gateDiagnostics.blockers,[]);
});

test('full 4A path validates P3 equal-spacing result including unit',()=>{
  const u = verifyThrough4A(3,'Measurement','Equal spacing','numeric_unit',prompts.p3,
    {value:630,display_answer:'630 m'});
  assert.equal(u.problemStructure,'multi_step');
  assert.equal(u.answerValidation.status,'matched');
  assert.equal(u.readyForMethodSelection,true);
});

test('full 4A path handles P5 two-part cost system as money domain',()=>{
  const u = verifyThrough4A(5,'Whole Numbers','Quantity and cost system','multiple_choice',prompts.p5tables,
    {correct_option_ids:['C']},[{id:'C',text:'50 chairs; $20'}]);
  assert.equal(u.domain,'money');
  assert.equal(u.problemStructure,'multi_step');
  assert.equal(u.answerValidation.status,'not_checked');
  assert.equal(u.readyForMethodSelection,true);
});

test('full 4A path validates P5 marble comparison without inventing a key',()=>{
  const u = verifyThrough4A(5,'Whole Numbers','Part-whole multiplicative comparison','numeric',prompts.p5marbles,
    {value:57,display_answer:'57'});
  assert.equal(u.problemStructure,'multi_step');
  assert.equal(u.answerValidation.status,'matched');
  assert.equal(u.readyForMethodSelection,true);
});

test('full 4A path continues to block a supplied wrong numerical answer',()=>{
  const u = verifyThrough4A(3,'Measurement','Equal spacing','numeric_unit',prompts.p3,
    {value:700,display_answer:'700 m'});
  assert.equal(u.answerValidation.status,'mismatched');
  assert.equal(u.readyForMethodSelection,false);
  assert.ok(u.gateDiagnostics.blockers.some(b=>b.code==='GATE_ANSWER_MISMATCH'));
});
