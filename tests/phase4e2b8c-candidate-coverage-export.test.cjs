/** 4E-2B-8C: staff-only candidate scoring export, read-only and fail-closed. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const helper = read('lib/math/teaching/qa/phase4E2B7SamplePlan.ts');
const panel = read('app/curriculum-developer/components/math-intelligence/StaffMathRepresentativeVerificationPanel.tsx');
const source = ts.transpileModule(helper, {compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
assert.equal(source.diagnostics?.length??0,0);
const moduleContext = {exports:{}};
vm.runInNewContext(source.outputText, {exports:moduleContext.exports,module:moduleContext});
const {summarizeSafeStaffPreview,summarizeSafeCandidateDiagnostics} = moduleContext.exports;
const safe = (change={}) => ({
 status:'ambiguous',stage:'selector',previewOnly:true,studentReleased:false,teachingApproved:false,
 reasonCodes:['SINGLE_FAMILY_SELECTION_AMBIGUOUS'],candidateMethodCount:3,
 scoreComparison: {selectionIssueCodes:['LOW_WINNER_QUALITY','UNSAFE!!!'], candidates:[
  {methodId:'patterns.sequence_rule.growing_difference',familyId:'patterns.sequence_rule',eligible:true,rank:1,score:68.67,
   dimensions:[{dimension:'problem_structure',points:35,maximum:35},{dimension:'curriculum_skill',points:0,maximum:15},{dimension:'required_reasoning',points:16.67,maximum:25}]},
  {methodId:'patterns.sequence_rule.recursive_rule',familyId:'patterns.sequence_rule',eligible:true,rank:2,score:60.33,dimensions:[]},
  {methodId:'ineligible',familyId:'patterns.sequence_rule',eligible:false,rank:null,score:null,dimensions:[]},
 ]},answer_data:{value:42}, ...change
});

test('safely summarizes existing candidate scores without raw answer data', () => {
 const result = summarizeSafeCandidateDiagnostics(safe());
 assert.equal(result.topMethod,'patterns.sequence_rule.growing_difference');
 assert.equal(result.topScore,'68.67');
 assert.equal(result.runnerUpMethod,'patterns.sequence_rule.recursive_rule');
 assert.equal(result.runnerUpScore,'60.33');
 assert.equal(result.topTwoGap,'8.34');
 assert.equal(result.weakestDimension,'curriculum_skill');
 assert.equal(result.missingPoints,'15.00');
 assert.equal(result.selectorIssues,'LOW_WINNER_QUALITY');
 assert.equal(result.eligibleCandidates,2);
 assert.ok(!JSON.stringify(result).includes('42'));
 assert.ok(!JSON.stringify(result).includes('UNSAFE'));
});
test('retains original fail-closed preview status mapping',()=>{
 const result=summarizeSafeStaffPreview(safe());
 assert.equal(result.status,'ambiguous');
 assert.equal(result.reason,'SINGLE_FAMILY_SELECTION_AMBIGUOUS');
});
test('ignores answer and arbitrary fields even inside candidate records',()=>{
 const example=safe();
 example.scoreComparison.candidates[0].answer='secret-answer';
 example.scoreComparison.candidates[0].arbitrary={solution:'secret-solution'};
 assert.ok(!JSON.stringify(summarizeSafeCandidateDiagnostics(example)).includes('secret'));
});
test('returns empty diagnostics for missing or unsafe release markers',()=>{
 for (const modified of [
  safe({studentReleased:true}),safe({teachingApproved:true}),safe({previewOnly:false}),
  safe({status:'selected'}),safe({scoreComparison:null}),null,
 ]) {
  const out=summarizeSafeCandidateDiagnostics(modified);
  assert.equal(out.topMethod,'');assert.equal(out.eligibleCandidates,0);
 }
});
test('rejects malicious ids and scores outside 0-100',()=>{
 const ex=safe();
 ex.scoreComparison.candidates=[
  {methodId:'<script>alert(1)</script>',eligible:true,score:99.99},
  {methodId:'too.high',eligible:true,score:101},
  {methodId:'negative',eligible:true,score:-1},
 ];
 const out=summarizeSafeCandidateDiagnostics(ex);
 assert.equal(out.eligibleCandidates,0);assert.equal(out.topMethod,'');
});
test('fails closed on malformed dimensions and candidate arrays',()=>{
 const ex=safe();ex.scoreComparison.candidates=[
  {methodId:'safe.id',eligible:true,score:80,dimensions:[
   {dimension:'curriculum_skill',points:17,maximum:15},
   {dimension:'<script>',points:0,maximum:5},
   {dimension:'problem_structure',points:25,maximum:35},
  ]},
 ];
 const out=summarizeSafeCandidateDiagnostics(ex);
 assert.equal(out.weakestDimension,'problem_structure');assert.equal(out.missingPoints,'10.00');
});
test('does not invent margins when only one eligible candidate exists',()=>{
 const ex=safe();ex.scoreComparison.candidates=ex.scoreComparison.candidates.slice(0,1);
 const out=summarizeSafeCandidateDiagnostics(ex);
 assert.equal(out.topTwoGap,'');assert.equal(out.runnerUpScore,'');
});
test('TypeScript panel compiles syntactically',()=>{
 const out=ts.transpileModule(panel,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext},reportDiagnostics:true});
 assert.equal(out.diagnostics?.length??0,0);
});
test('does not add a new route, database writes, student access or answer fields',()=>{
 assert.match(panel,/summarizeSafeCandidateDiagnostics/);
 assert.match(panel,/Top-two score gap \(not policy margin\)/);
 assert.match(panel,/safeCsvCell/);
 assert.match(panel,/Staff diagnostic only/);
 for(const blocked of ['answer_data','correct_answer','SUPABASE_SERVICE_ROLE_KEY','dangerouslySetInnerHTML','.insert(','.upsert(','.update(']) {
  assert.ok(!panel.includes(blocked), blocked);
 }
});
