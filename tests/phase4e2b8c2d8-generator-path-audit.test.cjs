'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {scanRepo,codeWithoutComments,safeRel,cli}=require('../scripts/phase4e2b8c2d8-generator-path-audit.cjs');
function withRepo(files,fn){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'d8repo-'));
  try{
    for(const [file,contents] of Object.entries(files)){
      const loc=path.join(root,file);fs.mkdirSync(path.dirname(loc),{recursive:true});fs.writeFileSync(loc,contents);
    }
    return fn(root);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
}
test('empty checkout blocks capture and does not invent generator',()=>withRepo({},root=>{
  const r=scanRepo(root);assert.equal(r.captureReadiness,'BLOCKED_NOT_VERIFIED');assert.equal(r.generationPathAssessment,'NO_PROVIDER_CALL_FOUND_IN_SCANNED_SCOPE');assert.deepEqual(r.candidates,[]);
}));
test('direct provider call is candidate, never verified generator',()=>withRepo({
  'app/api/private/math/route.ts':`import 'server-only';\nrequireCurriculumDeveloperApiAccess(request); const x=await openai.responses.create({model:'x'});`,
},root=>{const r=scanRepo(root);assert.equal(r.captureReadiness,'BLOCKED_NOT_VERIFIED');assert.equal(r.counts.providerCallCandidates,1);assert.equal(r.candidates[0].kind,'provider_call_candidate');assert.ok(r.candidates[0].staffGuardHints.includes('curriculum_staff_guard'));}));
test('candidate without staff guard still blocked',()=>withRepo({'lib/ai/engine.ts':`client.chat.completions.create({})`},root=>{
 const r=scanRepo(root);assert.equal(r.candidates[0].staffGuardHints.length,0);assert.equal(r.captureReadiness,'BLOCKED_NOT_VERIFIED');
}));
test('ai sdk and anthropic candidates detected',()=>withRepo({
 'lib/ai/generate.ts':'await generateText({model});',
 'lib/ai/messages.ts':'await anthropic.messages.create({});',
},root=>{const r=scanRepo(root);assert.equal(r.counts.providerCallCandidates,2);assert.ok(r.candidates.some(c=>c.signals.includes('ai_sdk_generate')));assert.ok(r.candidates.some(c=>c.signals.includes('anthropic_messages')));}));
test('preview route is not counted as generator',()=>withRepo({'app/api/curriculum-developer/math-intelligence/method-preview/route.ts':`const p=await previewStaffMathMethod(request,{quizId,questionId});`},root=>{
 const r=scanRepo(root);assert.equal(r.candidates[0].kind,'staff_preview_or_shadow');assert.equal(r.counts.providerCallCandidates,0);
}));
test('named route is discovery hint only',()=>withRepo({'app/api/nova/explain/route.ts':`export async function POST(){return {status:'unavailable'}};`},root=>{
 const r=scanRepo(root);assert.equal(r.candidates[0].kind,'named_api_route_candidate');assert.equal(r.captureReadiness,'BLOCKED_NOT_VERIFIED');
}));
test('comments are not treated as live provider calls',()=>withRepo({'lib/ai/deprecated.ts':`// client.chat.completions.create({})\n/* generateText({}) */\nconst x=1;`},root=>{
 const r=scanRepo(root);assert.equal(r.counts.providerCallCandidates,0);
}));
test('tests, node_modules and backups are excluded',()=>withRepo({
 'tests/foo.test.cjs':'openai.responses.create({})',
 'lib/a.test.ts':'generateText({})',
 'node_modules/x.ts':'generateText({})',
 'lib/ai/old.backup.ts':'generateText({})',
},root=>{const r=scanRepo(root);assert.equal(r.counts.providerCallCandidates,0);}));
test('directory entries marked as symlinks are never scanned (portable fixture)',()=>withRepo({
 'lib/ai/real.ts':'openai.responses.create({})',
 'app/api/alias.ts':'openai.responses.create({})',
},root=>{
 // On Windows, fs.symlinkSync can require Developer Mode or elevation.
 // Instead, simulate the filesystem Dirent for alias.ts being a symlink.
 // This exercises the production scanner's isSymbolicLink() check on all OSes.
 const originalReaddir=fs.readdirSync;
 const aliasDirectory=path.resolve(root,'app/api');
 try {
   fs.readdirSync=function(dir,options){
     const entries=originalReaddir.call(fs,dir,options);
     if(path.resolve(dir)!==aliasDirectory || !options?.withFileTypes) return entries;
     return entries.map(entry=>entry.name==='alias.ts'
       ? {name:entry.name,isSymbolicLink:()=>true}
       : entry);
   };
   const r=scanRepo(root);
   assert.equal(r.counts.providerCallCandidates,1);
   assert.ok(!r.candidates.some(c=>c.relativePath.includes('alias')));
 } finally {
   fs.readdirSync=originalReaddir;
 }
}));
test('same file included by app and app/api scanned only once',()=>withRepo({'app/api/nova/route.ts':'openai.responses.create({})'},root=>{
 const r=scanRepo(root);assert.equal(r.counts.sourceFilesScanned,1);assert.equal(r.counts.providerCallCandidates,1);
}));
test('no source text or fake secrets in report',()=>withRepo({'lib/math/teach.ts':`const privateKey='SUPER_PRIVATE_SENTINEL';openai.responses.create({prompt:privateKey});`},root=>{
 const r=scanRepo(root),s=JSON.stringify(r);assert.equal(s.includes('SUPER_PRIVATE_SENTINEL'),false);assert.equal(s.includes('prompt:'),false);assert.equal(s.includes('openai.responses.create'),false);
}));
test('scan truncation is explicit, never clean claim',()=>withRepo({'lib/a.ts':'a','lib/b.ts':'openai.responses.create({})'},root=>{
 const r=scanRepo(root,{maxFiles:1});assert.equal(r.auditStatus,'PARTIAL_SCAN');assert.equal(r.captureReadiness,'BLOCKED_NOT_VERIFIED');
}));
test('oversize script skipped and flagged',()=>withRepo({'lib/big.ts':' '.repeat(350001)},root=>{
 const r=scanRepo(root);assert.equal(r.counts.oversizedSkipped,1);assert.equal(r.captureReadiness,'BLOCKED_NOT_VERIFIED');
}));
test('relative paths only',()=>withRepo({'lib/nova/generator.ts':'openai.responses.create({})'},root=>{
 const r=scanRepo(root);assert.equal(r.candidates[0].relativePath,'lib/nova/generator.ts');assert.ok(!JSON.stringify(r).includes(root));
}));
test('comment lexer preserves code after comments',()=>{
 const got=codeWithoutComments(`/* ignore */\nclient.messages.create({}); // after`);
 assert.match(got,/client\.messages\.create/);assert.doesNotMatch(got,/ignore/);
});
test('path safety checks prevent traversal',()=>{
 assert.equal(safeRel('/repo','/repo/lib/a.ts'),'lib/a.ts');assert.equal(safeRel('/repo','/elsewhere/secret.ts'),null);
});
test('missing root rejects cleanly',()=>assert.throws(()=>scanRepo('/unlikely-no-such-8c2d8-root'),/ROOT_NOT_FOUND/));
test('CLI rejects arbitrary flags',()=>assert.equal(cli(['--please-leak-secrets']),2));
test('no mutation or production changes made by scanner',()=>withRepo({'lib/nova/test.ts':'openai.responses.create({})'},root=>{
 const filesBefore=fs.readdirSync(path.join(root,'lib/nova')).join(',');scanRepo(root);assert.equal(fs.readdirSync(path.join(root,'lib/nova')).join(','),filesBefore);
}));
test('report keeps beta gates pending even with staff guard and provider call',()=>withRepo({'app/api/admin/math.ts':'await requireCurriculumDeveloperApiAccess(req);await client.messages.create({})'},root=>{
 const r=scanRepo(root);assert.ok(r.stillRequired.includes('BETA_LIVE_AUTH_AND_AUDIT_TESTS_DEFERRED'));assert.equal(r.captureReadiness,'BLOCKED_NOT_VERIFIED');
}));
