/** Phase 4E-2B-4: source-level regression and deterministic integration tests. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Only inside the test process. No production runtime hook or ts-node dependency.
require.extensions['.ts'] = (mod, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const js = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2020},
  });
  mod._compile(js.outputText, filename);
};

const root = path.resolve(__dirname, '..');
const understandingRoot = path.join(root, 'lib/math-intelligence/teaching');
const { identifyRingArrivalIncrementPattern } = require(path.join(understandingRoot, 'understanding/rules/constantIncrementPattern.ts'));
const { normalizeCanonicalTeachingQuestion } = require(path.join(understandingRoot, 'canonical/normalizeCanonicalTeachingQuestion.ts'));
const { understandTeachingQuestion } = require(path.join(understandingRoot, 'understanding/understandTeachingQuestion.ts'));
const { prepareMathTeachingSourceFromDbRows } = (() => {
  // server-only is a Next.js import sentinel; suppress only for this isolated test.
  const Module = require('node:module'); const original = Module._load;
  Module._load = function(specifier, parent, isMain) {
    if (specifier === 'server-only') return {};
    return original.call(this, specifier, parent, isMain);
  };
  try { return require(path.join(root, 'lib/math/teaching/student-serving/phase4E2A2TrustedSource.server.ts')); }
  finally { Module._load = original; }
})();

const prompt = "George's doorbell rang 20 times during a party. One guest arrived at the first ring, 3 at the second ring, and each later ring brought 2 more guests than the previous ring. How many guests arrived at the 10th ring, and how many guests arrived altogether?";
const ids = Object.freeze({
  quiz: '11111111-1111-4111-8111-111111111111',
  topic: '22222222-2222-4222-8222-222222222222',
  question: '33333333-3333-4333-8333-333333333333',
});
const rows = () => ({
  quiz: {id: ids.quiz,topic_id:ids.topic},
  topic: {id:ids.topic,subject:'math',primary_level:6,title:'Whole Numbers and Algebra'},
  link: {quiz_id:ids.quiz,question_id:ids.question,question_order:1},
  question: {
    id:ids.question,code:'MATH-P6-ALG-007-Q101',subject:'math',primary_level:6,topic_id:ids.topic,
    question_type:'multiple_choice',skill:'Number patterns and sequences',
    skill_tags:['whole-numbers-algebra'],difficulty:3,instruction:'Choose the correct answer.',prompt,
    content:{options:[
      {id:'A',text:'19 guests; 400 guests'},
      {id:'B',text:'19 guests; 200 guests'},
      {id:'C',text:'21 guests; 400 guests'},
      {id:'D',text:'21 guests; 420 guests'},
    ]},answer_data:{correct_option_ids:['A']},version:1,
    reviewed_by:'STAFF_ONLY',
  },
});

test('arithmetic sequence evidence computes 10th term and total safely',()=>{
  const e = identifyRingArrivalIncrementPattern(prompt);
  assert.ok(e);
  assert.deepEqual([e.first,e.second,e.increment,e.requestedRing,e.totalRings,e.requestedValue,e.totalValue],[1,3,2,10,20,19,400]);
});
test('rejects inconsistent first two terms and increment',()=>{
  assert.equal(identifyRingArrivalIncrementPattern(prompt.replace('3 at the second ring','4 at the second ring')),null);
});
test('rejects incomplete sequence claims',()=>{
  assert.equal(identifyRingArrivalIncrementPattern(prompt.replace('2 more guests','some more guests')),null);
  assert.equal(identifyRingArrivalIncrementPattern(prompt.replace('20 times','many times')),null);
  assert.equal(identifyRingArrivalIncrementPattern('Amy had 3 more guests than Bob. How many guests altogether?'),null);
});
test('rejects invalid targets or ambiguous quantities',()=>{
  assert.equal(identifyRingArrivalIncrementPattern(prompt.replace('10th ring','30th ring')),null);
  assert.equal(identifyRingArrivalIncrementPattern(prompt.replace('each later ring brought 2 more','each later ring brought 0 more')),null);
});
test('linked topic title is provided internally without disclosing staff metadata',()=>{
  const result=prepareMathTeachingSourceFromDbRows(rows());
  assert.equal(result.status,'ready');
  assert.equal(result.source.question.topic_title,'Whole Numbers and Algebra');
  assert.equal(result.source.question.answer_data.correct_option_ids[0],'A');
  assert.equal(JSON.stringify(result).includes('STAFF_ONLY'),false);
});
test('supplied inconsistent topic row is rejected',()=>{
  const input=rows();input.topic.id='44444444-4444-4444-8444-444444444444';
  const result=prepareMathTeachingSourceFromDbRows(input);
  assert.equal(result.status,'blocked');
});
test('legacy source calls without topic row remain compatible',()=>{
  const input=rows();delete input.topic;
  const result=prepareMathTeachingSourceFromDbRows(input);
  assert.equal(result.status,'ready');
  assert.equal(result.source.question.topic_title,null);
});
test('P6 algebra example reaches understanding readiness without lowering gates',()=>{
  const prepared=prepareMathTeachingSourceFromDbRows(rows());
  assert.equal(prepared.status,'ready');
  const canonical=normalizeCanonicalTeachingQuestion(prepared.source);
  assert.equal(canonical.diagnostics.readyForUnderstanding,true);
  assert.equal(canonical.curriculum.topicName,'Whole Numbers and Algebra');
  const u=understandTeachingQuestion({question:canonical});
  assert.equal(u.domain,'patterns');
  assert.equal(u.problemStructure,'pattern_rule');
  assert.equal(u.readyForMethodSelection,true);
  assert.equal(u.gateDiagnostics.blockers.length,0);
  assert.ok(u.confidenceBreakdown.domain>=0.75);
  assert.ok(u.confidenceBreakdown.structure>=0.78);
  assert.equal(u.answerValidation.status,'not_checked');
});
test('inconsistent first/second ring retains strict 4A checks',()=>{
  const input=rows();input.question.prompt=prompt.replace('3 at the second ring','4 at the second ring');
  const prepared=prepareMathTeachingSourceFromDbRows(input);
  assert.equal(prepared.status,'ready');
  const u=understandTeachingQuestion({question:normalizeCanonicalTeachingQuestion(prepared.source)});
  assert.notEqual(u.confidenceBreakdown.overall,0.96);
});

test('resolver fetches topic title and passes it to server-only adapter',()=>{
  const src=fs.readFileSync(path.join(root,'lib/math/teaching/student-serving/phase4E2A3StaffSourceResolver.server.ts'),'utf8');
  assert.match(src,/id,subject,primary_level,title/);
  assert.match(src,/prepareMathTeachingSourceFromDbRows\(\{quiz,link,question,topic\}\)/);
  assert.match(src,/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
});
