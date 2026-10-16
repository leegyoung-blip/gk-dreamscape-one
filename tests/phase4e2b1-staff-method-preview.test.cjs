/** Offline tests of the 4E-2B-1 preview boundary, including denied/blocked paths. */
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

test('denied staff resolver blocks all processing and leaks no answers', async () => {
 const h = harness({resolved:{status:'blocked',reason:'NOT_AUTHORIZED'}});
 const r=await invoke(h);clean(r);assert.equal(r.status,'blocked');assert.equal(r.stage,'access');assert.deepEqual(h.calls,['resolver']);
});
test('selected preview is only method metadata, not verified teaching',async()=>{
 const h=harness();const r=await invoke(h);clean(r);assert.equal(r.status,'selected');assert.equal(r.methodId,'method-1');assert.equal(r.familyId,'family-1');assert.deepEqual(h.calls,['resolver','canonical','understand','contract','4b','4c','selector']);
});
test('canonical failure blocks before 4A/4C',async()=>{
 const h=harness({canonical:{identity:{quizId:quiz,questionId:id},diagnostics:{readyForUnderstanding:false,issues:[{severity:'blocking',code:'MISSING_ANSWER'}]}}});const r=await invoke(h);clean(r);assert.equal(r.status,'blocked');assert.equal(r.stage,'canonical');assert.deepEqual(h.calls,['resolver','canonical']);
});
test('mismatched source identity blocked before 4A/4C',async()=>{
 const h=harness({canonical:{identity:{quizId:quiz,questionId:'other'},diagnostics:{readyForUnderstanding:true,issues:[]}}});const r=await invoke(h);clean(r);assert.equal(r.status,'blocked');assert.deepEqual(h.calls,['resolver','canonical']);
});
test('understanding blocked before contract and selector',async()=>{
 const h=harness({understanding:{readyForMethodSelection:false}});const r=await invoke(h);clean(r);assert.equal(r.stage,'understanding');assert.ok(!h.calls.includes('selector'));
});
test('contract blocked before selection',async()=>{
 const h=harness({contract:{status:'blocked'}});const r=await invoke(h);clean(r);assert.equal(r.stage,'contract');assert.ok(!h.calls.includes('selector'));
});
test('consumer refusal blocks rather than selecting',async()=>{
 const h=harness({b:{status:'blocked'}});const r=await invoke(h);clean(r);assert.equal(r.stage,'consumer');assert.ok(!h.calls.includes('selector'));
});
test('ambiguous returns candidate count and codes but no answer or selection',async()=>{
 const h=harness({selection:{status:'ambiguous',reasonCodes:['NO_CONFIDENT_SELECTION'],candidateMethodCount:11,primaryFamilies:['family-1','family-2']}});const r=await invoke(h);clean(r);assert.equal(r.status,'ambiguous');assert.equal(r.candidateMethodCount,11);assert.equal(r.methodId,undefined);
});
test('selector blocked does not release method identity',async()=>{
 const h=harness({selection:{status:'blocked',reasonCodes:['NO_4B_PRIMARY_CANDIDATES'],candidateMethodCount:0}});const r=await invoke(h);clean(r);assert.equal(r.status,'blocked');assert.equal(r.methodId,undefined);
});
test('selected with missing ID is blocked',async()=>{
 const h=harness({selection:{status:'selected',reasonCodes:[],candidateMethodCount:2,selection:{primaryMethodId:null,primaryFamilyId:'family-1',confidence:'medium'}}});const r=await invoke(h);clean(r);assert.equal(r.status,'blocked');
});
test('exceptions are sanitized and fail closed',async()=>{
 const h=harness({throwCanonical:true}); const r=await invoke(h);clean(r);assert.equal(r.status,'blocked');assert.equal(r.stage,'selector');assert.deepEqual(Array.from(r.reasonCodes),['INTERNAL_PREVIEW_UNAVAILABLE']);
});
test('no route or student payload added by this source file',()=>{
 assert.ok(source.includes("import 'server-only'"));assert.ok(!source.includes('export async function POST('));assert.ok(!source.includes('NextResponse'));assert.ok(source.includes('resolveStaffMathTeachingSource'));
});
