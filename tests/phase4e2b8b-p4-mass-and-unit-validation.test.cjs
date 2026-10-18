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

const ruleFile = path.resolve(__dirname, '../lib/math-intelligence/teaching/understanding/rules/representativeWordProblemEvidence.ts');
const { identifyRepresentativeWordProblemEvidence: detect } = require(ruleFile);
const { analyzeProblemStructure } = require(path.resolve(__dirname, '../lib/math-intelligence/teaching/understanding/rules/structureRules.ts'));
const { normalizeCanonicalTeachingQuestion } = require(path.resolve(__dirname, '../lib/math-intelligence/teaching/canonical/normalizeCanonicalTeachingQuestion.ts'));
const { understandTeachingQuestion } = require(path.resolve(__dirname, '../lib/math-intelligence/teaching/understanding/understandTeachingQuestion.ts'));
const { validateComputedAnswer } = require(path.resolve(__dirname, '../lib/math-intelligence/teaching/understanding/rules/answerValidation.ts'));

const questionText = 'A box containing 58 iron balls weighed 2145g. When 46 of the iron balls were removed, the mass of the box and the remaining iron balls weighed 489g. What was the mass of the box?';
const correctAnswer = { kind: 'numeric_unit', value: 57, display_answer: '57 g', units: ['g'], unit_required: true, tolerance: 0 };
function understand(answerData = correctAnswer, prompt = questionText) {
  const question = normalizeCanonicalTeachingQuestion({
    sourceType: 'quiz',
    sourceTable: 'math_questions',
    question: {
      id: '11111111-1111-4111-8111-111111111111', subject: 'math',
      primary_level: 4, topic_title: 'Whole Numbers',
      skill: 'Multi-step whole-number problem solving',
      question_type: 'numeric_unit', instruction: 'Enter the answer and unit.',
      prompt, content: {}, answer_data: answerData,
    },
  });
  return understandTeachingQuestion({question});
}

test('validates full two-state mass story instead of subtracting ball counts', () => {
  const r = detect(questionText, 'whole_numbers');
  assert.equal(r.problemStructure, 'multi_step');
  assert.equal(r.reasonCode, 'STRUCTURE_TWO_MASS_STATES_EQUAL_BALLS');
  assert.equal(r.computedAnswer, '57 g');
  assert.ok(r.requiredReasoning.includes('division'));
});

test('4A end-to-end has no false answer mismatch for verified 57g', () => {
  const u = understand();
  assert.equal(u.answerValidation.status, 'matched');
  assert.equal(u.answerValidation.computed, '57 g');
  assert.ok(!u.gateDiagnostics.blockers.some(x => x.code === 'GATE_ANSWER_MISMATCH'));
  assert.equal(u.problemStructure, 'multi_step');
});

test('detector also works with other internally consistent integer quantities', () => {
  // Box 20 g; 10 balls at 8 g each: 100 g initially; 7 removed, 44 g remaining.
  const sample = 'A box containing 10 iron balls weighed 100g. When 7 of the iron balls were removed, the mass of the box and the remaining iron balls weighed 44g. What was the mass of the box?';
  assert.equal(detect(sample, 'whole_numbers').computedAnswer, '20 g');
});

test('rejects inconsistent or unsupported mass-story evidence', () => {
  const invalid = [
    questionText.replace('46 of the iron balls', '58 of the iron balls'),
    questionText.replace('46 of the iron balls', '60 of the iron balls'),
    questionText.replace('2145g', '450g'),
    questionText.replace('489g', '489kg'),
    questionText.replace('were removed', 'were added'),
    questionText.replace('iron balls', 'different-sized iron balls'),
  ];
  for (const sample of invalid) {
    assert.equal(detect(sample, 'whole_numbers'), null, sample);
  }
  assert.equal(detect(questionText, 'geometry'), null);
});

test('wrong stored number remains blocked by existing answer-mismatch gate', () => {
  const u = understand({...correctAnswer, value: 58, display_answer: '58 g'});
  assert.equal(u.answerValidation.status, 'mismatched');
  assert.ok(u.gateDiagnostics.blockers.some(x => x.code === 'GATE_ANSWER_MISMATCH'));
});

test('a conflicting explicit physical unit remains a mismatch, even with equal numbers', () => {
  const u = understand({...correctAnswer, value: 57, display_answer: '57 kg', units: ['kg']});
  assert.equal(u.answerValidation.status, 'mismatched');
  assert.ok(u.gateDiagnostics.blockers.some(x => x.code === 'GATE_ANSWER_MISMATCH'));
});

test('unit-aware answer validation accepts identical physical units', () => {
  const answer = {rawAnswer:'57 g',canonicalAnswer:{type:'number',value:57,unit:'g'},acceptableAnswers:[]};
  assert.equal(validateComputedAnswer({answer,computedAnswer:'57g'}).status, 'matched');
  assert.equal(validateComputedAnswer({answer,computedAnswer:'57 kg'}).status, 'mismatched');
});

test('new rule uses question wording, not stored answer values or question IDs', () => {
  const source = fs.readFileSync(ruleFile, 'utf8');
  assert.doesNotMatch(source, /MATH-P[1-6]|answer_data|correct_option_ids|display_answer/);
  const gate = fs.readFileSync(path.resolve(__dirname,'../lib/math-intelligence/teaching/understanding/rules/readinessGate.ts'),'utf8');
  assert.match(gate, /GATE_ANSWER_MISMATCH/);
});
