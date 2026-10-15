'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { transformTypes,transformUtils,transformRenderer,patchRepo,files }=require('../scripts/fix-math-fraction-answer.cjs');
const types=`export type QuestionType =\n  | "multiple_choice"\n  | "short_text"\n  | "long_text";`;
const utils=`switch (question.question_type) {\n    case "short_text":\n    case "long_text":\n      return String(response.text ?? "").trim().length > 0;\n}\nconst labels = {\n    short_text: "Short Answer",\n    long_text: "Extended Response",\n};`;
const renderer=`const responseBlock = responseKind === "text" ? (\n  <MathAnswerInput\n    question={question}\n    response={response}\n  />\n) : <div />;\nfunction getMathResponseKind(question: QuizQuestion): MathResponseKind {\n  switch (question.question_type) {\n    case "short_text":\n    case "open_cloze":\n      return "text";\n    default:\n      return "choice";\n  }\n}`;
test('adds fractional question type without changing existing types',()=>{
 const s=transformTypes(types); assert.match(s,/\| "fraction"/); assert.match(s,/\| "long_text"/);
});
test('marks response.text complete for fraction through same text path',()=>{
 const s=transformUtils(utils); assert.match(s,/case "fraction":\s*case "short_text":/); assert.match(s,/fraction: "Fraction",/);
});
test('renderer routes fraction into existing text input branch',()=>{
 const s=transformRenderer(renderer); assert.match(s,/case "fraction":\s*return "text"/);
});
test('renderer aliases fraction to supported short_text UI only',()=>{
 const s=transformRenderer(renderer); assert.match(s,/question\.question_type === "fraction" \? \{ \.\.\.question, question_type: "short_text" \} : question/);
 assert.match(s,/function getMathResponseKind/);
});
test('transformations are idempotent',()=>{
 assert.equal(transformTypes(transformTypes(types)),transformTypes(types));
 assert.equal(transformUtils(transformUtils(utils)),transformUtils(utils));
 assert.equal(transformRenderer(transformRenderer(renderer)),transformRenderer(renderer));
});
test('fails closed when renderer has changed',()=>{
 assert.throws(()=>transformRenderer(renderer.replace('case "open_cloze":','case "weird":')),/expected one patch anchor/);
});
test('repo check makes no changes; apply creates backups; rerun no-op',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dreamscape-fraction-'));
 try {
  for(const [k,rel] of Object.entries(files)) {
   const fn=path.join(tmp,...rel.split('/')); fs.mkdirSync(path.dirname(fn),{recursive:true});
   fs.writeFileSync(fn,({types,utils,renderer})[k]);
  }
  const before=patchRepo(tmp,false);
  assert.ok(before.every(x=>x.change==='would-patch'));
  assert.ok(patchRepo(tmp,true).every(x=>x.change==='patched'));
  assert.ok(patchRepo(tmp,true).every(x=>x.change==='already-patched'));
  const backups=fs.readdirSync(path.join(tmp,'qa-artifacts','fraction-answer-hotfix','backups'));
  assert.equal(backups.length,3);
 } finally {fs.rmSync(tmp,{recursive:true,force:true});}
});
test('missing source aborts before any patch writes',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dreamscape-fraction-'));
 try {
  for(const [k,rel] of Object.entries(files)) {
   if(k==='renderer')continue;
   const fn=path.join(tmp,...rel.split('/')); fs.mkdirSync(path.dirname(fn),{recursive:true});fs.writeFileSync(fn,({types,utils})[k]);
  }
  assert.throws(()=>patchRepo(tmp,true),/Missing required source/);
  assert.equal(fs.readFileSync(path.join(tmp,...files.types.split('/')),'utf8'),types);
 } finally {fs.rmSync(tmp,{recursive:true,force:true});}
});
