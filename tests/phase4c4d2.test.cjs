'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const child=require('node:child_process');
const script=require('../scripts/math-4c4d2-server-boundary-audit.cjs');
const make=()=>fs.mkdtempSync(path.join(os.tmpdir(),'dreamscape-4d2-'));
function fixture(dir){
 const data={
 generateRoute:`export async function POST(request: Request) { await requireCurriculumDeveloperApiAccess(request); await generateMathVisualAndTeachingForQuestion({}); } no-store`,
 batchRoute:`export async function POST(request: Request) { await requireCurriculumDeveloperApiAccess(request); await generateMathAuthoringBatch([]); } no-store`,
 curriculumAuth:`import "server-only"; request.headers.get("authorization"); client.auth.getUser(token); client.from("profiles"); if (role !== "admin" && role !== "curriculum_lead") throw 0;`,
 authoringPipeline:`import "server-only"; export async function generateMathVisualAndTeachingForQuestion(){}; analyseMathQuestion({})`,
 visualTeachingPipeline:`generateMathTeachingVisualWithFallback({}); validateMathTeachingVisualDraft({});`,
 learnerPlayer:`"use client"; const CORE_RPCS={get_math_quiz_payload:0, save_math_quiz_answer:0, submit_math_quiz_attempt:0}; supabase.rpc("save_math_quiz_answer",{}); if(payload.quiz.feedback_mode === "immediate"){}; setStage("results");`,
 };
 for(const [kind,rel] of Object.entries(script.REQUIRED)){
  const f=path.join(dir,...rel.split('/'));fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,data[kind]);
 }
 return data;
}
function withFixture(f){const dir=make();try{fixture(dir);return f(dir);}finally{fs.rmSync(dir,{recursive:true,force:true});}}
test('required inventory contains exactly the six explicitly requested project files',()=>{
 assert.equal(Object.keys(script.REQUIRED).length,6);assert.ok(script.REQUIRED.learnerPlayer.includes('[subject]'));
});
test('audit identifies curriculum authoring routes, not a student gateway',()=>withFixture(dir=>{
 const a=script.audit(dir);assert.equal(a.summary.authoringRoutesIdentified,true);assert.equal(a.summary.studentTeachingServiceIdentified,false);
 assert.equal(a.summary.readyToPatchStudentRoute,false);
}));
test('authorization is detected only when guard actually appears in each source',()=>withFixture(dir=>{
 const file=path.join(dir,...script.REQUIRED.generateRoute.split('/'));
 fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('await requireCurriculumDeveloperApiAccess(request);',''));
 assert.equal(script.audit(dir).summary.bothAuthoringRoutesCallAccessHelper,false);
}));
test('generation before authorization is reported rather than assumed safe',()=>withFixture(dir=>{
 const file=path.join(dir,...script.REQUIRED.batchRoute.split('/'));
 fs.writeFileSync(file,`export async function POST(request: Request){await generateMathAuthoringBatch([]); await requireCurriculumDeveloperApiAccess(request);}`);
 assert.equal(script.audit(dir).summary.authoringAuthPrecedesGeneration,false);
}));
test('learner RPCs identify client-to-Supabase path',()=>withFixture(dir=>{
 const a=script.audit(dir);assert.equal(a.summary.learnerUsesDirectSupabaseRpc,true);
 assert.equal(a.rpcMarkers.length,3);assert.ok(a.rpcMarkers.every(m=>m.found));
}));
test('absence of learner RPC detected',()=>withFixture(dir=>{
 const file=path.join(dir,...script.REQUIRED.learnerPlayer.split('/'));
 fs.writeFileSync(file,fs.readFileSync(file,'utf8').replaceAll('submit_math_quiz_attempt','other_rpc'));
 assert.equal(script.audit(dir).summary.learnerUsesDirectSupabaseRpc,false);
}));
test('direct selector or uncontrolled review reference is flagged with path and line',()=>withFixture(dir=>{
 const file=path.join(dir,...script.REQUIRED.batchRoute.split('/'));
 fs.appendFileSync(file,'\nselectFromPhase4A4B({reviewedMathEvidence: x})');
 const a=script.audit(dir);assert.equal(a.summary.b2B4SelectorReferencesInSixFiles,2);
 assert.ok(a.selectorReferences.every(x=>typeof x.line==='number'&&!('excerpt' in x)));
}));
test('report contains no source excerpts or secrets',()=>withFixture(dir=>{
 const file=path.join(dir,...script.REQUIRED.generateRoute.split('/'));
 fs.appendFileSync(file,'\nconst AUTH_SECRET=\'NEVER-LEAK-SECRET-TEXT\';');
 const serial=JSON.stringify(script.audit(dir));assert.doesNotMatch(serial,/NEVER-LEAK-SECRET-TEXT|AUTH_SECRET/);
}));
test('missing required file is explicit, never silently certified',()=>withFixture(dir=>{
 const file=path.join(dir,...script.REQUIRED.curriculumAuth.split('/'));fs.unlinkSync(file);
 const a=script.audit(dir);assert.equal(a.scan.missingFiles.length,1);assert.equal(a.summary.authHelperChecksBearerUserAndRole,false);
 assert.throws(()=>script.writeReport(dir),/Missing required source/);
}));
test('writeReport creates only two QA reports and does not modify source',()=>withFixture(dir=>{
 const src=path.join(dir,...script.REQUIRED.generateRoute.split('/'));const before=fs.readFileSync(src);
 const outputs=script.writeReport(dir);assert.ok(fs.existsSync(outputs.jsonPath));assert.ok(fs.existsSync(outputs.markdownPath));
 assert.deepEqual(fs.readFileSync(src),before);assert.equal(fs.readdirSync(path.dirname(outputs.jsonPath)).length,2);
}));
test('PowerShell/[subject] path compatibility: works on normal platform tempdir',()=>withFixture(dir=>{
 assert.equal(script.audit(dir).scan.readableFiles,6);
 assert.ok(dir.startsWith(os.tmpdir()));
}));
test('generated markdown labels static discovery as noncertification',()=>withFixture(dir=>{
 const md=script.markdown(script.audit(dir));assert.match(md,/Not a security or pedagogical certification/);
 assert.match(md,/B4 remains \*\*disabled\*\*/);
}));
test('cannot infer live authorization from a source-level access helper',()=>withFixture(dir=>{
 const a=script.audit(dir);assert.equal(a.summary.liveAuthorizationVerified,false);
}));
test('prepares focused follow-up files, not 93 unrelated API routes',()=>{
 assert.equal(script.FOLLOWUP.length,7);assert.ok(script.FOLLOWUP.every(f=>!f.includes('/admin/agents/')));
});
