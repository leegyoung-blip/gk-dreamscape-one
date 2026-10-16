/** Offline tests of the 4E-2B-3 diagnostic upgrade, including denied/blocked paths. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const sourcePath = path.resolve(__dirname, '../lib/math/teaching/student-serving/phase4E2B1StaffMethodPreview.server.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const secret = 'SECRET_ANSWER_NEVER_TO_CLIENT';
const id = '11111111-1111-4111-8111-111111111111';
const quiz = '22222222-2222-4222-8222-222222222222';

const baseResolved = () => ({
  status:'ready',
  source: { question:{answer_data:{answer:secret}}, sourceType:'quiz', quizId:quiz },
  sourceIdentity:{quizId:quiz,questionId:id,questionVersion:1},
  staffReview:{quizStatus:'published',questionStatus:'published',quizPublished:true,studentReleased:false},
});
function harness(config = {}) {
  const calls = [];
  const ready = config.resolved ?? baseResolved();
  const mock = {
    'server-only': {},
    '../../../math-intelligence/teaching/canonical/normalizeCanonicalTeachingQuestion': {
      normalizeCanonicalTeachingQuestion: (v) => { calls.push('canonical'); assert.equal(v.question.answer_data.answer,secret); if(config.throwCanonical)throw Error(secret); return config.canonical ?? {identity:{quizId:quiz,questionId:id}, diagnostics:{readyForUnderstanding:true,issues:[]}}; }
    },
    '../../../math-intelligence/teaching/understanding/understandTeachingQuestion': {
      understandTeachingQuestion: () => {calls.push('understand');return config.understanding ?? {readyForMethodSelection:true};}
    },
    '../../../math-intelligence/teaching/contract/buildTeachingContract': {
      buildTeachingContract: () => {calls.push('contract');return config.contract ?? {status:'ready'};}
    },
    '../../../math-intelligence/teaching/contract/consumer/boundary': {
      createPhase4BMethodLibraryContractView: () => {calls.push('4b');return config.b ?? {status:'ready',envelope:{consumer:'phase_4b_method_library'}};},
      createPhase4CStrategySelectorContractView: () => {calls.push('4c');return config.c ?? {status:'ready',envelope:{consumer:'phase_4c_strategy_selector'}};},
    },
    '../strategy-selection/phase4C4Adapter': {
      selectFromPhase4A4B: (x) => {calls.push('selector');assert.equal(x.verifiedEvidence,undefined);assert.equal(x.learnerPrerequisiteEvidence,undefined);return config.selection ?? {status:'selected',reasonCodes:[],candidateMethodCount:2,selection:{primaryMethodId:'method-1',primaryFamilyId:'family-1',confidence:'high'}};},
    },
    './phase4E2A3StaffSourceResolver.server': {
      resolveStaffMathTeachingSource: async () => {calls.push('resolver');return ready;},
    },
  };
  const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}});
  assert.equal(js.diagnostics?.length || 0,0);
  const module = { exports: {} };
  vm.runInNewContext(js.outputText,{module,exports:module.exports,require:(id)=>{if(!(id in mock))throw Error('Unexpected dependency '+id);return mock[id];}}, {filename:'phase4E2B1StaffMethodPreview.server.ts'});
  return {api:module.exports,calls};
}
const invoke = h => h.api.previewStaffMathMethod(new Request('https://example.test'),{quizId:quiz,questionId:id});
const clean = result => {const j=JSON.stringify(result);assert.ok(!j.includes(secret));assert.ok(!j.includes('answer_data')); assert.ok(!j.includes('source'));assert.equal(result.previewOnly,true);assert.equal(result.teachingApproved,false);assert.equal(result.studentReleased,false);};



test('understanding blockers reveal only allow-listed 4A static codes', async () => {
 const h = harness({ understanding: {
   readyForMethodSelection: false,
   gateDiagnostics: { blockers: [
     { code: 'GATE_STRUCTURE_UNRESOLVED', message: secret, path: secret },
     { code: 'GATE_DOMAIN_LOW_CONFIDENCE', message: secret, path: secret },
     { code: 'GATE_STRUCTURE_UNRESOLVED', message: secret, path: secret },
   ], warnings: [] },
 }});
 const r = await invoke(h);
 clean(r);
 assert.equal(r.status, 'blocked');
 assert.equal(r.stage, 'understanding');
 assert.deepEqual(Array.from(r.reasonCodes), [
   'UNDERSTANDING_NOT_READY', 'GATE_STRUCTURE_UNRESOLVED', 'GATE_DOMAIN_LOW_CONFIDENCE',
 ]);
 assert.deepEqual(h.calls, ['resolver', 'canonical', 'understand']);
});

test('unknown or untrusted diagnostic values are never returned to staff', async () => {
 const h = harness({ understanding: {
   readyForMethodSelection: false,
   gateDiagnostics: { blockers: [
     { code: secret, message: secret, path: secret },
     { code: 'GATE_ANSWER_MISMATCH', message: secret, path: secret },
     { code: 'UNRECOGNISED_MESSAGE_' + secret, message: secret, path: secret },
   ], warnings: [{ code: 'GATE_ANSWER_NOT_CHECKED', message: secret, path: secret }] },
 }});
 const r = await invoke(h);
 clean(r);
 assert.deepEqual(Array.from(r.reasonCodes), ['UNDERSTANDING_NOT_READY', 'GATE_ANSWER_MISMATCH']);
 assert.ok(!JSON.stringify(r).includes('ANSWER_NOT_CHECKED'));
});

test('missing gate diagnostics retains fail-closed generic fallback', async () => {
 const h = harness({ understanding: { readyForMethodSelection: false } });
 const r = await invoke(h);
 clean(r);
 assert.deepEqual(Array.from(r.reasonCodes), ['UNDERSTANDING_NOT_READY']);
});

test('successful method selection behavior remains unchanged', async () => {
 const h = harness(); const r = await invoke(h);
 clean(r);
 assert.equal(r.status, 'selected');
 assert.equal(r.methodId, 'method-1');
 assert.deepEqual(h.calls, ['resolver','canonical','understand','contract','4b','4c','selector']);
});
