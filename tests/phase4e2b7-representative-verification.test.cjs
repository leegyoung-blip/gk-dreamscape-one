/** 4E-2B-7 — offline verification of deterministic sampling and safety boundary. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('lib/math/teaching/qa/phase4E2B7SamplePlan.ts');
const ui = read('app/curriculum-developer/components/math-intelligence/StaffMathRepresentativeVerificationPanel.tsx');
const page = read('app/curriculum-developer/math-intelligence/representative-verification/page.tsx');
const css = read('app/curriculum-developer/components/math-intelligence/StaffMathRepresentativeVerificationPanel.module.css');
const originalRoute = read('app/api/curriculum-developer/math-intelligence/method-preview/route.ts');

const compiled = ts.transpileModule(source, {
  compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS},
  reportDiagnostics: true,
});
assert.deepEqual(compiled.diagnostics?.map((x) => x.messageText) || [], []);
const mod = {exports:{}};
vm.runInNewContext(compiled.outputText,{exports:mod.exports,module:mod});
const {chooseVerificationQuizzes,chooseVerificationQuestion,summarizeSafeStaffPreview} = mod.exports;
const quiz = (id,title,status='published') => ({id,title,status});
const question = (id,type,order) => ({id,label:`MATH-Q-${id}`,type,order});
const normal = () => ({status:'selected',previewOnly:true,teachingApproved:false,studentReleased:false,methodId:'patterns.sequence_rule.constant_increment_term_and_total',confidence:'high',answer_data:'NEVER_EXPOSE'});

test('samples only published quizzes and caps at 2',()=>{
 const result=chooseVerificationQuizzes([quiz('x','Algebra'),quiz('y','Patterns'),quiz('z','Decimals','draft'),quiz('q','Geometry')]);
 assert.equal(result.length,2);assert.equal(result[0].id,'x');assert.equal(result[1].id,'y');
});
test('case insensitive published status',()=>{
 assert.equal(chooseVerificationQuizzes([quiz('one','Algebra','Published')]).length,1);
});
test('does not allow unpublished or staff-review quizzes',()=>{
 assert.equal(chooseVerificationQuizzes([quiz('a','A','reviewing'),quiz('b','B','draft')]).length,0);
});
test('deduplicates quiz ids',()=>{
 assert.equal(chooseVerificationQuizzes([quiz('a','Algebra'),quiz('a','Algebra again')]).length,1);
});
test('picks distinct first-word topic when available',()=>{
 const picked=chooseVerificationQuizzes([quiz('a','Algebra A'),quiz('b','Algebra B'),quiz('p','Percentage Challenge')]);
 assert.equal(picked[0].id,'a');assert.equal(picked[1].id,'p');
});
test('falls back to another quiz in same topic if needed',()=>{
 const picked=chooseVerificationQuizzes([quiz('a','Algebra A'),quiz('b','Algebra B')]);
 assert.equal(picked.length,2);assert.notEqual(picked[0].id,picked[1].id);
});
test('one-quiz limit returns precisely one even with many',()=>{
 assert.equal(chooseVerificationQuizzes([quiz('a','A'),quiz('b','B')],1).length,1);
});
test('empty quiz list returns no samples',()=>{
 assert.equal(chooseVerificationQuizzes([]).length,0);
});
test('chooses a question deterministically by order, not array position',()=>{
 const picked=chooseVerificationQuestion([question('q3','fraction',3),question('q1','multiple_choice',1),question('q2','numeric',2)]);
 assert.equal(picked.id,'q2');
});
test('prefers a different answer type for second quiz',()=>{
 const picked=chooseVerificationQuestion([question('a','multiple_choice',1),question('b','fraction',2)],['multiple_choice']);
 assert.equal(picked.type,'fraction');
});
test('falls back to same type if no alternative exists',()=>{
 assert.equal(chooseVerificationQuestion([question('a','multiple_choice',1)],['multiple_choice']).id,'a');
});
test('empty question list does not guess question IDs',()=>{
 assert.equal(chooseVerificationQuestion([],[]),null);
});
test('deduplicates repeated question IDs',()=>{
 assert.equal(chooseVerificationQuestion([question('a','fraction',1),question('a','fraction',2)],[]).id,'a');
});
test('selected result is safely reduced to method ID and confidence',()=>{
 const result=summarizeSafeStaffPreview(normal());
 assert.equal(result.status,'selected');assert.equal(result.method,'patterns.sequence_rule.constant_increment_term_and_total');
 assert.ok(!JSON.stringify(result).includes('NEVER_EXPOSE'));
});
test('blocked and ambiguous preserve only safe static reason codes',()=>{
 for(const status of ['blocked','ambiguous']){
  const result=summarizeSafeStaffPreview({status,previewOnly:true,teachingApproved:false,studentReleased:false,stage:'selector',reasonCodes:['LOW_WINNER_QUALITY','BAD!INJECTION',`ANSWER_IS_42${'!'.repeat(100)}`],rawAnswer:'42'});
  assert.equal(result.status,status);assert.equal(result.reason,'LOW_WINNER_QUALITY');
  assert.ok(!JSON.stringify(result).includes('rawAnswer'));
 }
});
test('rejects answer-bearing or student-released preview metadata',()=>{
 assert.equal(summarizeSafeStaffPreview({...normal(),studentReleased:true}),null);
 assert.equal(summarizeSafeStaffPreview({...normal(),teachingApproved:true}),null);
 assert.equal(summarizeSafeStaffPreview({...normal(),previewOnly:false}),null);
});
test('rejects malformed/malicious selected method and confidence',()=>{
 assert.equal(summarizeSafeStaffPreview({...normal(),methodId:'<img onerror=alert(1)>'}),null);
 assert.equal(summarizeSafeStaffPreview({...normal(),confidence:'guaranteed'}),null);
});
test('rejects missing safety markers or unknown status',()=>{
 assert.equal(summarizeSafeStaffPreview({status:'selected'}),null);
 assert.equal(summarizeSafeStaffPreview({...normal(),status:'approved'}),null);
});
test('new files transpile without syntax diagnostics',()=>{
 for(const contents of [ui,page]){
  const result=ts.transpileModule(contents,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext},reportDiagnostics:true});
  assert.deepEqual(result.diagnostics?.map(x=>x.messageText)||[],[]);
 }
});
test('staff client uses existing authorized GET + POST boundary and bearer token',()=>{
 assert.match(ui,/supabase\.auth\.getSession\(\)/);
 assert.match(ui,/Authorization:\s*`Bearer \$\{token\}`/);
 assert.match(ui,/mode=quizzes&level=/);assert.match(ui,/mode=questions&quizId=/);
 assert.match(ui,/method: body \? 'POST' : 'GET'/);
 assert.match(ui,/summarizeSafeStaffPreview/);
 assert.match(originalRoute,/requireCurriculumDeveloperApiAccess/);
});
test('verification is bounded, cancellable, and uses no new API or writes',()=>{
 assert.match(ui,/const levels = \[1, 2, 3, 4, 5, 6\]/);
 assert.match(ui,/useState<1 \| 2>\(2\)/);
 assert.match(ui,/controllerRef\.current\?\.abort\(\)/);
 assert.ok(!ui.includes('SUPABASE_SERVICE_ROLE_KEY'));
 assert.ok(!ui.includes('answer_data'));
 for(const action of ['PUT','PATCH','DELETE','.insert(','.upsert(','.update('])assert.ok(!ui.includes(action),action);
 assert.ok(!ui.includes('dangerouslySetInnerHTML'));
});
test('CSV export produces only diagnostic columns, not answer keys',()=>{
 assert.match(ui,/exportCsv\(rows\)/);
 assert.match(ui,/safeCsvCell/);
 assert.ok(!ui.includes('correct_answer'));
 assert.ok(!ui.includes('solution_steps'));
});
test('page stays noindex and uses staff-specific component',()=>{
 assert.match(page,/robots: \{ index: false, follow: false \}/);
 assert.match(page,/StaffMathRepresentativeVerificationPanel/);
 assert.match(css,/@media/);
});
