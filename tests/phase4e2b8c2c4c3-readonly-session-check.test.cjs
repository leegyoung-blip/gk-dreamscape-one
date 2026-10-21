'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const m = require('../scripts/phase4e2b8c2c4c3-readonly-session-check.cjs');
const Q = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const S = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const testJWT = `eyJhbGciOiJub25lIn0.${Buffer.from(JSON.stringify({role:'authenticated'})).toString('base64url')}.signature`;
const identity = {id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'};
const good = {status:'preview_only',questionVersion:1,fingerprintVersion:'db_jsonb_sha256_v1',
  sourceFingerprintSha256:'a'.repeat(64), persisted:false, teachingApproved:false,methodActivated:false,studentReleased:false};
const config = {baseUrl:'https://example.supabase.co',publicKey:'sb_publishable_public_123'};
const fake = (value, status=200, authStatus=200) => async (url, options) => url.endsWith(m.AUTH)
  ? {status:authStatus,text:async()=>JSON.stringify(identity)}
  : {status,text:async () => JSON.stringify(value)};

test('unknown roles, duplicate flags and malformed UUIDs are rejected', () => {
  assert.throws(() => m.argsFrom(['--role','admin']));
  assert.throws(() => m.argsFrom(['--role','staff']));
  assert.throws(() => m.argsFrom(['--role','staff','--quiz-id','bad','--question-id',S]));
  assert.throws(() => m.argsFrom(['--role','staff','--role','regular']));
  assert.throws(() => m.argsFrom(['--role','regular','--quiz-id',Q]));
  assert.equal(m.argsFrom(['--role','anonymous']).quizId,m.EMPTY_ID);
});
test('read-only preview endpoint is the only RPC referenced', () => {
  assert.equal(m.RPC,'/rest/v1/rpc/math_specialist_structure_review_preview');
  const src = fs.readFileSync(require.resolve('../scripts/phase4e2b8c2c4c3-readonly-session-check.cjs'),'utf8');
  assert.doesNotMatch(src, /\/rest\/v1\/rpc\/math_specialist_structure_review_record/);
  assert.doesNotMatch(src, /\b(insert|upsert|update|delete)\s*\(/i);
  assert.equal(m.AUTH, '/auth/v1/user');
});
test('anon blocked is a pass, without exposing source data', async () => {
  let seen;
  const fetcher = async (url, options) => {seen = {url, options};return {status:200,text:async()=>JSON.stringify({status:'blocked',reasonCode:'NOT_AUTHORIZED'})};};
  const result = await m.checkSession({role:'anonymous',quizId:Q,questionId:S},config,'',fetcher);
  assert.equal(result.pass,true);assert.equal(result.writesAttempted,0);
  assert.match(seen.url,/review_preview$/);assert.equal(seen.options.method,'POST');
  assert.ok(!seen.options.headers.Authorization);
});
test('anon HTTP 403 is a pass without response leakage', async()=>{
  const r=await m.checkSession({role:'anonymous',quizId:Q,questionId:S},config,'',fake({code:'unauthorized'},403));
  assert.equal(r.pass,true);
});
test('regular denied is a pass', async()=>{
  const r=await m.checkSession({role:'regular',quizId:Q,questionId:S},config,testJWT,fake({status:'blocked',reasonCode:'NOT_AUTHORIZED'}));
  assert.equal(r.pass,true);
});
test('regular seeing a successful preview must fail', async()=>{
  const r=await m.checkSession({role:'regular',quizId:Q,questionId:S},config,testJWT,fake(good));
  assert.equal(r.pass,false);
});
test('staff preview checks complete safe response and masks fingerprint', async()=>{
  const r=await m.checkSession({role:'staff',quizId:Q,questionId:S},config,testJWT,fake(good));
  assert.equal(r.pass,true);assert.equal(r.fingerprintVerified,true);
  assert.doesNotMatch(JSON.stringify(r),/a{20}/);
  assert.doesNotMatch(JSON.stringify(r),new RegExp(testJWT));
});
test('staff failed source or incomplete preview is not success', async()=>{
  assert.equal((await m.checkSession({role:'staff',quizId:Q,questionId:S},config,testJWT,fake({status:'blocked',reasonCode:'SOURCE_NOT_READY'}))).pass,false);
  assert.equal((await m.checkSession({role:'staff',quizId:Q,questionId:S},config,testJWT,fake({...good,methodActivated:true}))).pass,false);
});
test('expired or invalid authenticated session is never counted as ordinary-user denial', async()=>{
  const r=await m.checkSession({role:'regular',quizId:Q,questionId:S},config,testJWT,fake({status:'blocked',reasonCode:'NOT_AUTHORIZED'},200,401));
  assert.equal(r.pass,false);assert.equal(r.outcome,'SESSION_IDENTITY_NOT_VERIFIED');
});
test('rejects service role session tokens and invalid input', async()=>{
  const jwt = `eyJhbGciOiJub25lIn0.${Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')}.sig`;
  await assert.rejects(m.checkSession({role:'staff',quizId:Q,questionId:S},config,jwt,fake(good)),/SERVICE_ROLE_TOKEN_FORBIDDEN/);
  await assert.rejects(m.checkSession({role:'staff',quizId:Q,questionId:S},config,'a b',fake(good)),/INVALID_SESSION_TOKEN/);
});
test('config refuses non-supabase hosts and secret keys',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'4c3-'));
  try {
    assert.throws(()=>m.configFrom(root,{NEXT_PUBLIC_SUPABASE_URL:'https://evil.example',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_x'}));
    assert.throws(()=>m.configFrom(root,{NEXT_PUBLIC_SUPABASE_URL:'https://x.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_secret_x'}));
    assert.equal(m.configFrom(root,{NEXT_PUBLIC_SUPABASE_URL:'https://x.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'test'}).baseUrl,'https://x.supabase.co');
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
test('verification SQL uses only SELECT and no source payload fields',()=>{
  for (const file of ['phase-4e2b8c2c4c3-read-only-question-pair.sql','phase-4e2b8c2c4c3-read-only-audit-count.sql']) {
    const sql=fs.readFileSync(path.join(__dirname,'../sql',file),'utf8').replace(/^--.*$/gm, '');
    assert.match(sql,/SELECT/i);assert.doesNotMatch(sql,/\b(insert|update|delete|truncate|alter|create|grant|revoke|drop)\s+(?:into\s+|table\s+|function\s+)?public\./i);
    assert.doesNotMatch(sql,/answer_data|question_text|prompt/i);
  }
});
