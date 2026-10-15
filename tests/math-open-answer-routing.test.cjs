'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const script=path.resolve(__dirname,'../scripts/fix-math-open-answer-routing.cjs');
const {update}=require(script);
const base=['app','learning-missions','core','[subject]','[level]','quiz','[quizId]'];
const fixtures={
 stage:`import {resolvePresentationMode} from "./resolvePresentationMode";\nfunction Screen({subject, question}) {\nconst presentationMode = resolvePresentationMode(question, subject);\nif (presentationMode === "math_standard") {\nreturn <><MathQuestionRenderer question={question} /><CoreTeachingEngine question={question} /></>;\n}\nreturn <QuestionResponseEditor question={question}/>;\n}\n`,
 types:`export type QuestionType =\n  | "short_text"\n  | "fraction"\n  | "multiple_choice";\n`,
 utils:`export function responseIsComplete(question,response) {\n switch(question.question_type) {\n    case "fraction":\n    case "short_text":\n      return String(response.text ?? '').trim().length>0;\n }\n}\nexport function formatCoreQuestionType(type) {\nconst labels = {\n    fraction: "Fraction",\n    short_text: "Short Answer",\n}; return labels[type];\n}\n`,
 renderer:`function getMathResponseKind(question) {\nswitch (question.question_type) {\n    case "fraction":\n    case "short_text":\n      return "text";\n    default: return "choice";\n}\n}\nfunction Input() {return <MathAnswerInput />;}\n`,
 input:`function getAnswerInputConfig(question){\n  const inputMode: AnswerInputMode =\n    requestedMode === "numeric" || requestedMode === "decimal"\n      ? requestedMode\n      : "text";\n  return {inputMode};\n}\nfunction View(){return <input onChange={(event) => onChange({ text: event.target.value })} />}\n`,
};
function mkFixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'dreamscape-answer-routing-'));
 const names={stage:['presentation','CoreMissionStage.tsx'],types:['CoreQuizTypes.ts'],utils:['CoreQuizUtils.ts'],renderer:['presentation','renderers','MathQuestionRenderer.tsx'],input:['presentation','renderers','MathAnswerInput.tsx']};
 for(const [key,parts] of Object.entries(names)){const file=path.join(root,...base,...parts);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,fixtures[key]);}
 return {root, names, at:key=>path.join(root,...base,...names[key])};
}
function run(root,mode){return spawnSync(process.execPath,[script,mode],{encoding:'utf8',env:{...process.env,DREAMSCAPE_PROJECT_ROOT:root}});}
test('fraction and supported numeric variants route to math renderer instead of generic fallback',()=>{
 const text=update('stage',fixtures.stage);
 for(const t of ['fraction','numeric','numeric_unit','money']) assert.match(text,new RegExp(`question\\.question_type === "${t}"`));
 assert.match(text,/presentationMode === "math_standard" \|\|/);
 assert.match(text,/<MathQuestionRenderer question=\{question\}/);
 assert.match(text,/<CoreTeachingEngine question=\{question\}/);
 assert.match(text,/return <QuestionResponseEditor question=\{question\}/);
});
test('text-response renderer handles fractions and numeric types without changing choice default',()=>{
 const text=update('renderer',fixtures.renderer);
 for(const t of ['fraction','numeric','numeric_unit','money']) assert.match(text,new RegExp(`case "${t}":`));
 assert.match(text,/default: return "choice"/);
 assert.match(text,/MathAnswerInput/);
});
test('response completion recognizes numeric and fraction text answers',()=>{
 const text=update('utils',fixtures.utils);
 for(const t of ['fraction','numeric','numeric_unit','money']) assert.match(text,new RegExp(`case "${t}":`));
 assert.match(text,/String\(response\.text \?\? ''\)\.trim\(\)\.length>0/);
});
test('question type declaration includes bank-supported numeric values',()=>{
 const text=update('types',fixtures.types);
 for(const t of ['fraction','numeric','numeric_unit','money']) assert.ok(text.includes(`| "${t}"`));
});
test('labels are present for newly routed types',()=>{
 const text=update('utils',fixtures.utils);
 for(const label of ['numeric: "Number"','numeric_unit: "Number and Unit"','money: "Money"','fraction: "Fraction"']) assert.ok(text.includes(label));
});
test('text response remains the canonical answer payload, numeric inputs get decimal keyboard',()=>{
 const text=update('input',fixtures.input);
 assert.match(text,/onChange\(\{ text: event\.target\.value \}\)/);
 assert.match(text,/question\.question_type === "money"/);
 assert.match(text,/\? "decimal"/);
});
test('all transformations are idempotent',()=>{
 for(const [key,source] of Object.entries(fixtures)){
  const once=update(key,source);const twice=update(key,once);assert.equal(once,twice,`${key} not idempotent`);
 }
});
test('Windows CRLF is preserved without changing anchors',()=>{
 for(const [key,source] of Object.entries(fixtures)){
  const once=update(key,source.replace(/\n/g,'\r\n'));
  assert.ok(once.includes('\r\n'));assert.ok(!/(?<!\r)\n/.test(once));
 }
});
test('installer --check is read-only and --apply produces backups',()=>{
 const {root,at}=mkFixture();
 try{
  const before=fs.readFileSync(at('stage'),'utf8');
  const check=run(root,'--check');assert.equal(check.status,0,check.stderr);assert.match(check.stdout,/5 changes needed/);
  assert.equal(fs.readFileSync(at('stage'),'utf8'),before);
  const result=run(root,'--apply');assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/Applied 5 guarded changes/);
  assert.notEqual(fs.readFileSync(at('stage'),'utf8'),before);
  const backup=path.join(root,'qa-artifacts','math-open-answer-routing','backups');assert.equal(fs.readdirSync(backup).length,5);
  const repeated=run(root,'--apply');assert.equal(repeated.status,0,repeated.stderr);assert.match(repeated.stdout,/Already installed/);
 } finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('installer fails closed when a required source file is missing',()=>{
 const {root,at}=mkFixture();
 try {fs.rmSync(at('stage'));const result=run(root,'--apply');assert.notEqual(result.status,0);assert.match(result.stderr,/STOP: Missing source file/);assert.equal(fs.readFileSync(at('utils'),'utf8'),fixtures.utils);}
 finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('installer aborts all updates if renderer-selection anchor drifts',()=>{
 const {root,at}=mkFixture();
 try {fs.writeFileSync(at('stage'),fixtures.stage.replace('if (presentationMode === "math_standard") {','if (presentationMode === dynamicMode) {')); const result=run(root,'--apply');assert.notEqual(result.status,0);assert.match(result.stderr,/STOP:.*CoreMissionStage/);assert.equal(fs.readFileSync(at('types'),'utf8'),fixtures.types);}
 finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('installer does not replace quiz player or modify scoring/SQL',()=>{
 const {root,at}=mkFixture();
 try {const marker=path.join(root,...base,'CoreQuizPlayer.tsx');fs.writeFileSync(marker,'// untouched quiz RPC: p_response_data: currentResponse\n');const result=run(root,'--apply');assert.equal(result.status,0,result.stderr);assert.equal(fs.readFileSync(marker,'utf8'),'// untouched quiz RPC: p_response_data: currentResponse\n');assert.equal(fs.existsSync(path.join(root,'sql')),false);}
 finally{fs.rmSync(root,{recursive:true,force:true});}
});
