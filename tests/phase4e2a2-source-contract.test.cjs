'use strict';
const test=require('node:test'); const assert=require('node:assert/strict');
const fs=require('fs');const path=require('path');const Module=require('node:module');
const ts=require('typescript');
const src=path.resolve(__dirname,'../lib/math/teaching/student-serving/phase4E2A2TrustedSource.server.ts');
const text=fs.readFileSync(src,'utf8');
assert.match(text,/import 'server-only';/);
const js=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const compiled=new Module(src,module);compiled.filename=src;
compiled.require=(id)=>id==='server-only'?{}:require(id);
compiled._compile(js,src);
const {prepareMathTeachingSourceFromDbRows:prepare}=compiled.exports;
const q='d2f1bb2e-a39c-425e-85c1-8fe6748d14a8', k='f2ac70a8-8fa1-424a-b7c7-0ed38d0f148f';
const good=()=>({
  quiz:{id:q,is_published:true}, link:{quiz_id:q,question_id:k},
  question:{id:k,subject:'math',primary_level:6,version:2,code:'MATH-P6',
   answer_data:{display_answer:'3/5'},question_type:'fraction',prompt:'What fraction?',
   content:{options:[]},review_notes:'internal-only',reviewed_by:'private'}
});

test('canonical source built from matching server rows, without reviewer metadata',()=>{
 const result=prepare(good());assert.equal(result.status,'ready');
 assert.equal(result.source.sourceType,'quiz');assert.equal(result.source.sourceTable,'math_questions');
 assert.equal(result.source.quizId,q);assert.equal(result.source.question.answer_data.display_answer,'3/5');
 assert.equal(result.source.question.question_type,'fraction');
 assert.ok(!('review_notes' in result.source.question));
 assert.ok(!('reviewed_by' in result.source.question));
 assert.equal(result.sourceIdentity.questionVersion,2);
});
test('no browser payload: answer_data absent blocks',()=>{
 const d=good();delete d.question.answer_data;
 assert.deepEqual(prepare(d),{status:'blocked',reason:'AUTHORITATIVE_ANSWER_MISSING'});
});
test('empty answer_data blocks',()=>{const d=good();d.question.answer_data={};assert.equal(prepare(d).status,'blocked')});
test('quiz-question link mismatch blocks',()=>{const d=good();d.link.question_id=q;assert.equal(prepare(d).reason,'QUESTION_NOT_LINKED')});
test('quiz id mismatch blocks',()=>{const d=good();d.link.quiz_id=k;assert.equal(prepare(d).reason,'QUESTION_NOT_LINKED')});
test('invalid UUID blocks',()=>{const d=good();d.quiz.id='invalid';assert.equal(prepare(d).reason,'INVALID_IDENTITIES')});
test('wrong subject blocks',()=>{const d=good();d.question.subject='science';assert.equal(prepare(d).reason,'WRONG_SUBJECT')});
test('invalid level blocks',()=>{const d=good();d.question.primary_level=7;assert.equal(prepare(d).reason,'INVALID_LEVEL')});
test('malformed rows block',()=>assert.deepEqual(prepare({}), {status:'blocked',reason:'INVALID_ROWS'}));
test('works for P1 through P6 without elevating readiness',()=>{
 for(let i=1;i<=6;i++){const d=good();d.question.primary_level=i;assert.equal(prepare(d).status,'ready')}
});
