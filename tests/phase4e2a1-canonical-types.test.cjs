'use strict';
const {test, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root=process.cwd();
const normalizerPath=path.join(root,'lib/math-intelligence/teaching/canonical/normalizeCanonicalTeachingQuestion.ts');
assert.ok(fs.existsSync(normalizerPath), 'Run from project root');
const originalHandler=Module._extensions['.ts'];
Module._extensions['.ts']=function(mod,file){
  const source=fs.readFileSync(file,'utf8');
  const compiled=ts.transpileModule(source,{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
  const errs=(compiled.diagnostics || []).filter(d=>d.category===ts.DiagnosticCategory.Error);
  assert.equal(errs.length,0,errs.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('; '));
  mod._compile(compiled.outputText,file);
};
after(()=>{if(originalHandler) Module._extensions['.ts']=originalHandler;else delete Module._extensions['.ts'];});
const {normalizeCanonicalTeachingQuestion}=require(normalizerPath);
function make(type,answer,level=6) {
  return normalizeCanonicalTeachingQuestion({
    question:{id:'fixture-q', primary_level:level, prompt:'Find the answer.',question_type:type,
      content:{},difficulty:3,...(answer===undefined?{}:{answer_data:{display_answer:answer}})},
    sourceType:'quiz',skillMappings:[{id:'test-skill',name:'Synthetic QA skill'}],
  });
}
const cases=[
  ['fraction','3/4','text'],
  ['numeric_unit','12 cm','number'],
  ['money','$12.50','number'],
  ['short_text','half','text'],
  ['numeric','3','number'],
  ['open_ended','5','number'],
];
for(const [type,value,answerType] of cases){
  test(`P1–P6 live alias ${type} maps safely`,()=>{
    for(let level=1;level<=6;level++) {
      const q=make(type,value,level);
      assert.equal(q.content.questionType,'open_ended');
      assert.equal(q.curriculum.level,level);
      assert.equal(q.answer.canonicalAnswer?.type,answerType);
      assert.equal(q.diagnostics.readyForUnderstanding,true);
    }
  });
}
test('Unknown new question type remains unknown/fail-closed',()=>{
  const q=make('math_unrecognized_future','1');
  assert.equal(q.content.questionType,'unknown');
  assert.ok(q.diagnostics.issues.some(issue=>issue.code==='UNKNOWN_QUESTION_TYPE'));
});
test('Live browser payload lacking answer_data cannot become ready for understanding',()=>{
  const q=make('fraction',undefined);
  assert.equal(q.content.questionType,'open_ended');
  assert.equal(q.diagnostics.readyForUnderstanding,false);
  assert.ok(q.diagnostics.issues.some(issue=>issue.code==='MISSING_ANSWER' && issue.severity==='blocking'));
});
test('MCQ remains MCQ (no unintended reclassification)',()=>{
  const q=normalizeCanonicalTeachingQuestion({question:{id:'mcq',primary_level:6,question_type:'multiple_choice',prompt:'Select the correct value',
    content:{options:[{id:'a',text:'1'},{id:'b',text:'2'}]},answer_data:{correct_option_ids:['b']}},
    skillMappings:[{id:'s',name:'s'}]});
  assert.equal(q.content.questionType,'mcq');
  assert.equal(q.answer.canonicalAnswer?.type,'option');
  assert.equal(q.diagnostics.readyForUnderstanding,true);
});
test('Multiple-select remains canonical multi_select',()=>{
  const q=normalizeCanonicalTeachingQuestion({question:{id:'multi',primary_level:6,question_type:'multiple_select',prompt:'Select',
    content:{options:[{id:'a',text:'1'},{id:'b',text:'2'}]},answer_data:{correct_option_ids:['a','b']}},
    skillMappings:[{id:'s',name:'s'}]});
  assert.equal(q.content.questionType,'multi_select');
  assert.equal(q.answer.canonicalAnswer?.type,'multiple_options');
  assert.equal(q.diagnostics.readyForUnderstanding,true);
});
test('No change to live quiz RPC/UI/rewards or approval modes',()=>{
  const installer=fs.readFileSync(path.join(__dirname,'../scripts/phase4e2a1-canonical-types.cjs'),'utf8');
  assert.ok(installer.includes('normalizeCanonicalTeachingQuestion.ts'));
  assert.ok(!installer.includes('CoreQuizPlayer.tsx'));
  assert.ok(!installer.includes('UPDATE public.'));
});
