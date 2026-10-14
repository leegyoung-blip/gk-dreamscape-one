'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const script=require('../scripts/phase4c4d5b1-delegation-audit.cjs');
const defs=script.DELEGATES;
const wrappers=['get_math_quiz_payload','save_math_quiz_answer','submit_math_quiz_attempt'];
function D(n){return {schema_name:'public',routine_name:n,identity_arguments:'p_id uuid',function_owner:'postgres',function_owner_bypass_rls:'true',security_definer:'true',routine_settings:'search_path=public,auth,pg_temp',function_definition:`CREATE OR REPLACE FUNCTION public.${n}(p_id uuid) RETURNS jsonb AS $$ BEGIN PERFORM auth.uid(); RETURN NULL; END; $$ LANGUAGE plpgsql;`};}
function G(n){return {schema_name:'public',routine_name:n,identity_arguments:'p_id uuid',function_owner:'postgres',function_owner_bypass_rls:'true',security_definer:'true',explicit_grants:'',public_execute_granted:'false',anon_can_execute:'false',authenticated_can_execute:wrappers.includes(n)?'true':'false',service_role_can_execute:'true'};}
function pair(){return {a:defs.map(D),b:[...defs,...wrappers].map(G)};}
function audit(a,b){return script.auditDelegates(a,b);}
function rowedit(name,rows){const r=rows.find(x=>x.routine_name===name);assert.ok(r);return r;}
function toCsv(rows){const cols=Object.keys(rows[0]);const quote=v=>`"${String(v??'').replaceAll('"','""')}"`;return cols.join(',')+'\r\n'+rows.map(r=>cols.map(k=>quote(r[k])).join(',')).join('\r\n')+'\r\n';}
const q1=fs.readFileSync(path.join(root,'sql/phase-4c4d5b1-01-readonly-delegated-function-definitions.sql'),'utf8');
const q2=fs.readFileSync(path.join(root,'sql/phase-4c4d5b1-02-readonly-execute-permissions.sql'),'utf8');
test('SQL Query 1 is SELECT only over system catalogs',()=>{assert.match(q1,/\bSELECT\b/i);assert.match(q1,/FROM pg_proc/i);assert.match(q1,/pg_get_functiondef/i);assert.doesNotMatch(q1,/\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|GRANT|REVOKE|TRUNCATE)\s+(?:TABLE|FROM|INTO|FUNCTION|ON|ROLE)/i);assert.doesNotMatch(q1,/FROM public\.math_/i);});
test('SQL Query 2 is SELECT only and checks effective privileges',()=>{assert.match(q2,/\bSELECT\b/i);assert.match(q2,/FROM pg_proc/i);assert.match(q2,/has_function_privilege\('anon'/);assert.match(q2,/has_function_privilege\('authenticated'/);assert.match(q2,/has_function_privilege\('service_role'/);assert.match(q2,/aclexplode/);assert.doesNotMatch(q2,/\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|GRANT|REVOKE|TRUNCATE)\s+(?:TABLE|FROM|INTO|FUNCTION|ON|ROLE)/i);});
test('Query 1 includes all 5 exact delegates',()=>{for(const n of defs)assert.ok(q1.includes(`'${n}'`),n);});
test('Query 1 excludes unrelated routines',()=>{for(const n of wrappers)assert.ok(!q1.includes(`'${n}'`),n);});
test('Query 2 includes exact 8 related routines',()=>{for(const n of [...defs,...wrappers])assert.ok(q2.includes(`'${n}'`),n);});
test('Readme forbids automatic live deployment',()=>{const x=fs.readFileSync(path.join(root,'README-4C4D-5B-1.md'),'utf8');assert.match(x,/B4 gateway stays disabled/);assert.match(x,/do not enable the student endpoint/i);});
test('Well-shaped sample still denies endpoint approval',()=>{const {a,b}=pair();const r=audit(a,b);assert.equal(r.summary.evidenceComplete,true);assert.equal(r.summary.studentEndpointDeploymentAllowed,false);assert.equal(r.summary.studentOwnershipCertified,false);assert.equal(r.summary.feedbackReleaseCertified,false);assert.equal(r.summary.b4GatewayEnabled,false);assert.equal(r.findings.length,0);});
test('Flags PUBLIC execution of unlocked routine',()=>{const {a,b}=pair();rowedit('save_math_quiz_answer_unlocked',b).public_execute_granted='true';const r=audit(a,b);assert.ok(r.findings.some(s=>s.includes('public_execution_of_delegate')));});
test('Flags anonymous execution of unlocked routine',()=>{const {a,b}=pair();rowedit('submit_math_quiz_attempt_unlocked',b).anon_can_execute='true';assert.ok(audit(a,b).findings.some(s=>s.includes('anon_execution_of_delegate')));});
test('Flags authenticated execution of unlocked routine',()=>{const {a,b}=pair();rowedit('get_math_quiz_payload_unlocked',b).authenticated_can_execute='true';assert.ok(audit(a,b).findings.some(s=>s.includes('authenticated_execution_of_delegate')));});
test('Flags PUBLIC access on assertion helpers too',()=>{const {a,b}=pair();rowedit('core_assert_attempt_topic_access',b).public_execute_granted='true';assert.ok(audit(a,b).findings.some(s=>s.includes('public_execution_of_delegate')));});
test('Rejects anonymous access to original wrapper',()=>{const {a,b}=pair();rowedit('get_math_quiz_payload',b).anon_can_execute='true';assert.ok(audit(a,b).findings.some(s=>s.includes('wrapper_anonymous_execute')));});
test('Flags missing delegate definition',()=>{const {a,b}=pair();const r=audit(a.filter(x=>x.routine_name!=='core_assert_quiz_topic_access'),b);assert.ok(r.findings.some(s=>s.includes('missing_or_overloaded_definition')));assert.equal(r.summary.evidenceComplete,false);});
test('Flags unexpected overload',()=>{const {a,b}=pair();a.push({...a[0],identity_arguments:'p_id text'});const r=audit(a,b);assert.ok(r.findings.some(s=>s.includes('missing_or_overloaded_definition')));});
test('Flags missing grant',()=>{const {a,b}=pair();assert.ok(audit(a,b.filter(x=>x.routine_name!=='save_math_quiz_answer')).findings.some(s=>s.includes('missing_or_overloaded_permission')));});
test('Flags mismatched signature',()=>{const {a,b}=pair();rowedit('core_assert_attempt_topic_access',b).identity_arguments='p_id integer';assert.ok(audit(a,b).findings.some(s=>s.includes('identity_arguments_mismatch')));});
test('Rejects unexpected extra definition',()=>{const {a,b}=pair();a.push(D('dangerous_routine'));assert.ok(audit(a,b).findings.some(s=>s.includes('unexpected_definition')));});
test('Rejects unknown boolean rather than silently allowing it',()=>{const {a,b}=pair();rowedit('core_assert_quiz_topic_access',b).anon_can_execute='yes';assert.ok(audit(a,b).findings.some(s=>s.includes('unrecognised_permission_boolean')));});
test('Rejects absent columns',()=>{const {a,b}=pair();delete a[0].function_definition;assert.throws(()=>audit(a,b),/DEFINITIONS_MISSING_COLUMNS|MISSING/);});
test('Generated report cannot reproduce source code',()=>{const {a,b}=pair();a[0].function_definition+=' TOP_SECRET_LITERAL_DO_NOT_SHARE';const r=audit(a,b);const m=script.markdown(r);assert.ok(!JSON.stringify(r).includes('TOP_SECRET_LITERAL_DO_NOT_SHARE'));assert.ok(!m.includes('TOP_SECRET_LITERAL_DO_NOT_SHARE'));});
test('Read-only CLI generates reports in cross-platform temporary directory',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamscape-4d5b1-'));try{
  const {a,b}=pair();const f1=path.join(dir,'defs.csv'),f2=path.join(dir,'grants.csv'),out=path.join(dir,'report');fs.writeFileSync(f1,toCsv(a));fs.writeFileSync(f2,toCsv(b));
  const p=cp.spawnSync(process.execPath,[path.join(root,'scripts/phase4c4d5b1-delegation-audit.cjs'),f1,f2,out],{encoding:'utf8'});
  assert.equal(p.status,0,p.stderr);assert.ok(fs.existsSync(path.join(out,'phase-4c4d5b1-delegated-trust-report.json')));
  const r=JSON.parse(fs.readFileSync(path.join(out,'phase-4c4d5b1-delegated-trust-report.json'),'utf8'));assert.equal(r.summary.studentEndpointDeploymentAllowed,false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('CLI exits with nonzero status when unlocked routine is anonymously callable',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamscape-4d5b1-'));try{
  const {a,b}=pair();rowedit('save_math_quiz_answer_unlocked',b).anon_can_execute='true';const f1=path.join(dir,'defs.csv'),f2=path.join(dir,'grants.csv');fs.writeFileSync(f1,toCsv(a));fs.writeFileSync(f2,toCsv(b));
  const p=cp.spawnSync(process.execPath,[path.join(root,'scripts/phase4c4d5b1-delegation-audit.cjs'),f1,f2,path.join(dir,'out')],{encoding:'utf8'});
  assert.equal(p.status,2,p.stderr);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
