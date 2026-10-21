'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const cp=require('node:child_process');
const {
 P,DRAFT_IDS,DEFERRED_GATES,auditSources,auditRepo,importHits,
}=require('../scripts/phase4e2b8c2c4e-governance-readiness.cjs');
const root=path.resolve(__dirname,'..');
const sources=Object.fromEntries(Object.values(P).map(x=>[x,fs.readFileSync(path.join(root,x),'utf8')]));
const clone=()=>({...sources});
const failed=(report,id)=>report.checks.find(c=>c.id===id)?.pass===false;
const modified=(key,find,replace)=>{
 const changed=clone();
 const before=changed[P[key]];
 assert.ok(before.includes(find),`fixture mismatch for ${key}: ${find}`);
 changed[P[key]]=before.replace(find,replace);
 return changed;
};

test('4E baseline source gate passes but never claims beta readiness',()=>{
 const r=auditRepo(root);
 assert.equal(r.sourceGate,'SOURCE_CHECKS_PASSED');
 assert.equal(r.failedCount,0);
 assert.ok(r.checkCount>=40);
 assert.equal(r.betaReady,false);
 assert.equal(r.staffWriteEnablementAllowed,false);
 assert.equal(r.methodActivationAllowed,false);
});
test('release blockers include live staff authentication and human teaching review',()=>{
 const ids=DEFERRED_GATES.map(g=>g.id);
 assert.ok(ids.includes('LIVE_ORDINARY_USER_DENIAL'));
 assert.ok(ids.includes('LIVE_STAFF_AUTH_AND_PREVIEW'));
 assert.ok(ids.includes('LIVE_STALE_SOURCE_AND_RECORDING'));
 assert.ok(ids.includes('HUMAN_PEDAGOGICAL_REVIEW'));
 assert.ok(ids.includes('FULL_REPOSITORY_TYPECHECK'));
 assert.equal(DEFERRED_GATES.some(x=>x.status==='passed'),false);
});
test('all three expected specialist IDs are listed for governance',()=>{
 assert.equal(DRAFT_IDS.length,3);
 assert.equal(new Set(DRAFT_IDS).size,3);
});
test('missing dependency fails closed',()=>{
 const x=clone();delete x[P.preflight];
 const r=auditSources(x);
 assert.equal(r.sourceGate,'SOURCE_CHECKS_BLOCKED');
 assert.ok(failed(r,'FILE_PREFLIGHT'));
});
test('draft-to-active promotion is rejected',()=>{
 const x=modified('drafts',"status: 'draft'","status: 'active'");
 assert.ok(failed(auditSources(x),'DRAFT_STATUS'));
});
test('curriculum-skill points cannot be manufactured in draft metadata',()=>{
 const x=modified('drafts','curriculumSkills: []',"curriculumSkills: ['unverified_skill']");
 assert.ok(failed(auditSources(x),'NO_SYNTHETIC_CURRICULUM_SKILLS'));
});
test('production library registration triggers blocker',()=>{
 const x=clone();x[P.production]+="\nimport { x } from './phase4E2B8C2C3ASpecialistDrafts';\n";
 assert.ok(failed(auditSources(x),'LIVE_CATALOGUE_ISOLATION_PRODUCTION'));
});
test('4C selector integration before approval triggers blocker',()=>{
 const x=clone();x[P.selector]+="\nimport '../phase4E2B8C2C4DStaffShadowComparison.server';\n";
 assert.ok(failed(auditSources(x),'LIVE_CATALOGUE_ISOLATION_SELECTOR'));
});
test('missing server-only import is a gate failure',()=>{
 const x=modified('shadow',"import 'server-only';",'');
 assert.ok(failed(auditSources(x),'SERVER_ONLY_SHADOW'));
});
test('caller-supplied mathematical facts must not enter the 4D request',()=>{
 const x=modified('shadow',"'questionId,quizId'","'facts,questionId,quizId'");
 assert.ok(failed(auditSources(x),'SHADOW_INPUT_IDS_ONLY'));
});
test('missing authoritative source resolution fails source gate',()=>{
 const x=modified('shadow','const source=await resolveStaffMathTeachingSource(request,query);','const source=await resolveUntrustedBrowserSource(request,query);');
 assert.ok(failed(auditSources(x),'SHADOW_SOURCE_RESOLVED'));
});
test('source freshness reread cannot silently be removed',()=>{
 const x=modified('shadow','const latest=await resolveStaffMathTeachingSource(request,query);','const latest=source;');
 assert.ok(failed(auditSources(x),'SHADOW_FRESHNESS_REREAD'));
});
test('version-bound specialist evidence is enforced',()=>{
 const x=modified('shadow','finding.sourceVersion!==version','false');
 assert.ok(failed(auditSources(x),'SHADOW_VERSION_BOUND'));
});
test('a false claim of human verification blocks the source gate',()=>{
 const x=modified('shadow','  staffOnly: true, previewOnly: true, sourceCorrelatedOnly: true, humanVerified: false,', '  staffOnly: true, previewOnly: true, sourceCorrelatedOnly: true, humanVerified: true,');
 assert.ok(failed(auditSources(x),'SHADOW_UNVERIFIED_MARKERS'));
});
test('a method activation marker blocks the source gate',()=>{
 const x=modified('shadow','  studentReleased: false, methodActivated: false, scoresModified: false,', '  studentReleased: false, methodActivated: true, scoresModified: false,');
 assert.ok(failed(auditSources(x),'SHADOW_UNVERIFIED_MARKERS'));
});
test('adding database write operation to 4D fails closed',()=>{
 const x=clone();x[P.shadow]+='\nasync function bad(client){await client.insert({x:1});}\n';
 assert.ok(failed(auditSources(x),'SHADOW_NO_DB_WRITES'));
});
test('importing audit writer into shadow comparison fails closed',()=>{
 const x=clone();x[P.shadow]+="\nimport {recordStaffSpecialistStructureReview} from './phase4E2B8C2C4C2BStaffReviewAudit.server';\n";
 const r=auditSources(x);
 assert.ok(failed(r,'SHADOW_NOT_WRITER_CONNECTED'));
});
test('removing visual review gate fails source gate',()=>{
 const x=modified('shadow','hasVisual===true','hasVisual===false');
 assert.ok(failed(auditSources(x),'SHADOW_VISUALS_BLOCKED'));
});
test('audit writer cannot silently omit preflight',()=>{
 const x=modified('audit','const review = await prepareStaffSpecialistStructureReviewIntent(request, {','const review = await unsafeWriteWithoutReview(request, {');
 assert.ok(failed(auditSources(x),'AUDIT_WRITER_SEPARATE'));
});
test('pinned twelve-question baseline detects changed selection counts',()=>{
 const x=clone();
 const b=JSON.parse(x[P.baseline]);b.rows[0].outcome='ambiguous';
 x[P.baseline]=JSON.stringify(b);
 assert.ok(failed(auditSources(x),'BASELINE_5_SELECTED_7_AMBIGUOUS'));
});
test('app and components route imports of staff internals are detected',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamscape-4e-'));
 try {
  const sub=path.join(dir,'app','api','unsafe');fs.mkdirSync(sub,{recursive:true});
  fs.writeFileSync(path.join(sub,'route.ts'),"import { x } from '../../../../lib/math/teaching/student-serving/phase4E2B8C2C4DStaffShadowComparison.server';\n");
  assert.equal(importHits(dir).length,1);
 }finally {fs.rmSync(dir,{recursive:true,force:true});}
});
test('production import findings block the report even if source files pass',()=>{
 const r=auditSources(clone(),['app/api/example/route.ts:unsafe import']);
 assert.ok(failed(r,'NO_PUBLIC_INTEGRATION_IMPORTS'));
});
test('JSON output contains explicit deferred gates and no secrets or question text',()=>{
 const p=cp.spawnSync(process.execPath,[path.join(root,'scripts/phase4e2b8c2c4e-governance-readiness.cjs'),'--json'],{cwd:root,encoding:'utf8'});
 assert.equal(p.status,0,p.stderr);
 const r=JSON.parse(p.stdout);
 assert.equal(r.betaReady,false);
 assert.ok(r.deferredGates.length>0);
 assert.doesNotMatch(p.stdout,/(?:eyJhbGciOi|SUPABASE_SERVICE_ROLE_KEY|Bearer\s+\S+)/);
});
test('strict-beta flag cannot accidentally certify beta readiness',()=>{
 const p=cp.spawnSync(process.execPath,[path.join(root,'scripts/phase4e2b8c2c4e-governance-readiness.cjs'),'--strict-beta'],{cwd:root,encoding:'utf8'});
 assert.equal(p.status,2,p.stderr);
 assert.match(p.stdout,/NOT beta-ready/);
});
