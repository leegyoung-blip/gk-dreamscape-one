'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const {parseCsv,auditMetadata,reportMarkdown}=require('../scripts/phase4c4d5a-audit-csv.cjs');
const fixtures={
  rpc:'schema_name,routine_name,identity_arguments,return_type,security_definer,volatility,routine_settings,anon_can_execute,authenticated_can_execute,service_role_can_execute\n'+[
    'get_math_quiz_payload,p_quiz_id uuid',
    'save_math_quiz_answer,"p_attempt_id uuid, p_question_id uuid, p_response_data jsonb, p_time_spent_seconds integer"',
    'submit_math_quiz_attempt,"p_attempt_id uuid, p_answers jsonb, p_duration_seconds integer"',
  ].map((x,i)=>`public,${x},jsonb,true,v,"[""search_path=public, auth, pg_temp""]",false,true,true`).join('\n')+'\n',
  rls:'schema_name,relation_name,relation_kind,rls_enabled,rls_forced\n'+[
    'math_attempt_answers','math_quiz_attempts','math_quiz_questions','math_quiz_reward_claims','math_quizzes'
  ].map(x=>`public,${x},r,true,false`).join('\n')+'\n',
};
const rpc=()=>parseCsv(fixtures.rpc),rls=()=>parseCsv(fixtures.rls);
test('parses quoted commas and doubled quotes',()=>{
  const r=rpc();assert.equal(r.length,3);
  assert.equal(r[0].routine_settings,'["search_path=public, auth, pg_temp"]');
  assert.equal(r[1].identity_arguments,'p_attempt_id uuid, p_question_id uuid, p_response_data jsonb, p_time_spent_seconds integer');
});
test('parses CRLF, trailing line and embedded newline',()=>{
  assert.deepEqual(parseCsv('x,y\r\n"a\nb",q\r\n'),[{x:'a\nb',y:'q'}]);
  assert.deepEqual(parseCsv('x,y\r\na,b'),[{x:'a',y:'b'}]);
});
test('rejects empty CSV',()=>assert.throws(()=>parseCsv(''),/EMPTY_CSV/));
test('rejects unclosed quote',()=>assert.throws(()=>parseCsv('x\n"oops'),/UNTERMINATED/));
test('rejects malformed row width',()=>assert.throws(()=>parseCsv('x,y\na'),/COLUMN_MISMATCH/));
test('rejects duplicate column names',()=>assert.throws(()=>parseCsv('x,x\na,b'),/DUPLICATE_HEADER/));
test('audit exactly reconciles known 3/5 metadata baseline',()=>{
 const a=auditMetadata(rpc(),rls());assert.equal(a.summary.metadataShapeMatchesBaseline,true);
 assert.equal(a.summary.securityDefinerRoutines,3);assert.equal(a.summary.rlsEnabledTables,5);
 assert.equal(a.issues.length,0);
});
test('audit never permits live deployment, even if metadata matches',()=>{
 const a=auditMetadata(rpc(),rls());
 assert.equal(a.summary.liveIntegrationAuthorized,false);
 assert.equal(a.summary.routeDeploymentAllowed,false);
 assert.equal(a.summary.functionBodyReviewed,false);
 assert.equal(a.summary.policyExpressionsReviewed,false);
});
test('rejects unexpectedly executable anonymous function',()=>{
 const x=rpc();x[0].anon_can_execute='true';
 assert.ok(auditMetadata(x,rls()).issues.includes('anon_execute_not_denied:get_math_quiz_payload'));
});
test('rejects disabled RLS',()=>{
 const x=rls();x[0].rls_enabled='false';
 assert.ok(auditMetadata(rpc(),x).issues.includes('rls_not_enabled:math_attempt_answers'));
});
test('rejects unapproved extra routine metadata',()=>{
 const x=rpc();x.push({...x[0],routine_name:'unknown_helper'});
 assert.ok(auditMetadata(x,rls()).issues.includes('unexpected_routine_metadata'));
});
test('rejects missing expected function and unexpected overload',()=>{
 const x=rpc();x.pop();assert.ok(auditMetadata(x,rls()).issues.includes('routine_overload_or_missing:submit_math_quiz_attempt'));
 const y=rpc();y.push({...y[0],identity_arguments:'p_quiz_id text'});
 assert.ok(auditMetadata(y,rls()).issues.includes('routine_overload_or_missing:get_math_quiz_payload'));
});
test('rejects missing policy relation',()=>{
 const x=rls();x.pop();assert.ok(auditMetadata(rpc(),x).issues.includes('table_missing_or_duplicate:math_quizzes'));
});
test('markdown explicitly says not security certified',()=>{
 const md=reportMarkdown(auditMetadata(rpc(),rls()));
 assert.match(md,/not authentication, RLS or disclosure certification/);
 assert.match(md,/Not established/);
});
test('SQL uses only SELECT and contains no record-level extraction',()=>{
 for(const name of ['phase-4c4d5a-01-readonly-function-definitions.sql','phase-4c4d5a-02-readonly-table-policies.sql']){
   const sql=fs.readFileSync(path.join(__dirname,'../sql',name),'utf8');
   const noComments=sql.replace(/^\s*--.*$/gm,'');
   assert.match(noComments,/\bSELECT\b/i);
   assert.doesNotMatch(noComments,/\b(?:UPDATE|DELETE|INSERT|TRUNCATE|ALTER|CREATE|DROP|DO|GRANT|REVOKE|COPY|EXECUTE|PERFORM|CALL)\b/i);
   assert.match(sql,/pg_/);
 }
});
test('SQL scopes to exact known routines and relations',()=>{
 const sql=fs.readFileSync(path.join(__dirname,'../sql/phase-4c4d5a-01-readonly-function-definitions.sql'),'utf8');
 for(const name of ['get_math_quiz_payload','save_math_quiz_answer','submit_math_quiz_attempt']) assert.ok(sql.includes("'"+name+"'"));
 const tables=fs.readFileSync(path.join(__dirname,'../sql/phase-4c4d5a-02-readonly-table-policies.sql'),'utf8');
 for(const name of ['math_attempt_answers','math_quiz_attempts','math_quiz_questions','math_quiz_reward_claims','math_quizzes'])assert.ok(tables.includes("'"+name+"'"));
});
test('CLI writes files and reports still blocked (cross-platform temp directory)',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamscape-4d5a-'));
 try{
  const rpcFile=path.join(dir,'r.csv'),rlsFile=path.join(dir,'t.csv'),out=path.join(dir,'out');
  fs.writeFileSync(rpcFile,fixtures.rpc);fs.writeFileSync(rlsFile,fixtures.rls);
  const res=spawnSync(process.execPath,[path.join(__dirname,'../scripts/phase4c4d5a-audit-csv.cjs'),rpcFile,rlsFile,out],{encoding:'utf8'});
  assert.equal(res.status,0,res.stderr);
  const parsed=JSON.parse(fs.readFileSync(path.join(out,'phase-4c4d5a-metadata-audit.json')));
  assert.equal(parsed.summary.routeDeploymentAllowed,false);
  assert.ok(fs.readFileSync(path.join(out,'phase-4c4d5a-metadata-audit.md'),'utf8').includes('SECURITY DEFINER'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('CLI fails on malformed CSV and does not write approved result',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamscape-4d5a-'));
 try{const r=path.join(dir,'r.csv'),t=path.join(dir,'t.csv');fs.writeFileSync(r,fixtures.rpc);fs.writeFileSync(t,'bad');
 const res=spawnSync(process.execPath,[path.join(__dirname,'../scripts/phase4c4d5a-audit-csv.cjs'),r,t,path.join(dir,'out')],{encoding:'utf8'});
 assert.notEqual(res.status,0);assert.match(res.stderr,/METADATA_AUDIT_ERROR/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
