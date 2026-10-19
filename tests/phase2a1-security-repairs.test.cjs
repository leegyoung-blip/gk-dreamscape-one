/** 2A-1: builders admin auth ignores user_metadata; schoolwork analyse authorises before any write. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

function load(file, stubs, env = {}) {
 const out = ts.transpileModule(read(file), {compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 assert.equal(out.diagnostics?.length ?? 0, 0);
 const mod = {exports:{}};
 const req = (name) => { if (!(name in stubs)) throw new Error(`unexpected import ${name}`); return stubs[name]; };
 vm.runInNewContext(out.outputText, {
  exports:mod.exports, module:mod, require:req, console:{error(){},warn(){},log(){}},
  process:{env:{NEXT_PUBLIC_SUPABASE_URL:'http://local.test',NEXT_PUBLIC_SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service',...env}},
  URL, Date, setTimeout, clearTimeout, Buffer, TextEncoder, TextDecoder,
 });
 return mod.exports;
}

/* In-memory Supabase table mock that records every operation. */
function makeDb(tables, {failOn} = {}) {
 const ops = [];
 const matches = (row, filters) => filters.every(([c, v]) => row[c] === v);
 function from(table) {
  const q = {table, op:'select', cols:null, filters:[], payload:null};
  const exec = (single) => {
   ops.push({...q, filters:[...q.filters]});
   if (failOn && failOn(q)) return Promise.resolve({data:null, error:new Error(`forced failure on ${table}.${q.op}`)});
   const rows = (tables[table] ||= []).filter((r) => matches(r, q.filters));
   if (q.op === 'update') rows.forEach((r) => Object.assign(r, q.payload));
   const data = single ? (rows[0] ? {...rows[0]} : null) : rows.map((r) => ({...r}));
   if (single === 'strict' && !data) return Promise.resolve({data:null, error:new Error('no rows')});
   return Promise.resolve({data, error:null});
  };
  const b = {
   select(cols){ if (q.op === 'select') q.cols = cols; return b; },
   update(p){ q.op = 'update'; q.payload = p; return b; },
   insert(p){ q.op = 'insert'; q.payload = p; return b; },
   eq(c, v){ q.filters.push([c, v]); return b; },
   order(){ return b; }, limit(){ return b; }, gte(){ return b; }, in(){ return b; },
   maybeSingle(){ return exec(true); }, single(){ return exec('strict'); },
   then(res, rej){ return exec(false).then(res, rej); },
  };
  return b;
 }
 return {from, ops};
}

/* ---------------- FIX 1: lib/buildersAdminAuth.ts ---------------- */

function buildersAuth({user, profiles = [], profileFails = false}) {
 const db = makeDb({profiles}, {failOn: profileFails ? (q) => q.table === 'profiles' : null});
 const stubs = {'@supabase/supabase-js': {createClient: () => ({
  auth: {getUser: async (token) => (token === 'valid' && user ? {data:{user}, error:null} : {data:{user:null}, error:new Error('bad token')})},
  from: db.from,
 })}};
 return load('lib/buildersAdminAuth.ts', stubs);
}
const req = (token) => new Request('http://local.test/api/admin/builders', {headers: token ? {authorization:`Bearer ${token}`} : {}});
const baseUser = (extra = {}) => ({id:'u-1', email:'user@example.test', app_metadata:{}, user_metadata:{}, ...extra});

test('builders: user_metadata.role=admin no longer grants admin (profile is regular)', async () => {
 const {requireAdmin} = buildersAuth({user: baseUser({user_metadata:{role:'admin'}}), profiles:[{id:'u-1', role:'regular'}]});
 const r = await requireAdmin(req('valid'));
 assert.equal(r.ok, false); assert.equal(r.status, 403);
});
test('builders: user_metadata.role=admin with no profile row is refused', async () => {
 const {requireAdmin} = buildersAuth({user: baseUser({user_metadata:{role:'admin'}})});
 const r = await requireAdmin(req('valid'));
 assert.equal(r.ok, false); assert.equal(r.status, 403);
});
test('builders: user_metadata.role=admin is refused when the profile lookup fails', async () => {
 const {requireAdmin} = buildersAuth({user: baseUser({user_metadata:{role:'admin'}}), profileFails:true});
 assert.equal((await requireAdmin(req('valid'))).ok, false);
});
test('builders: profiles.role=admin keeps legitimate access', async () => {
 const {requireAdmin} = buildersAuth({user: baseUser(), profiles:[{id:'u-1', role:'admin'}]});
 assert.equal((await requireAdmin(req('valid'))).ok, true);
});
test('builders: service-role-only app_metadata.role=admin keeps legitimate access', async () => {
 const {requireAdmin} = buildersAuth({user: baseUser({app_metadata:{role:'admin'}})});
 assert.equal((await requireAdmin(req('valid'))).ok, true);
});
test('builders: missing or invalid token is 401', async () => {
 const {requireAdmin} = buildersAuth({user: baseUser()});
 assert.equal((await requireAdmin(req(null))).status, 401);
 assert.equal((await requireAdmin(req('forged'))).status, 401);
});
test('builders: source never reads user_metadata', () => {
 assert.ok(!/user_metadata\s*\?*\.\s*role/.test(read('lib/buildersAdminAuth.ts')));
});

/* ---------------- FIX 2: app/api/nova-plus/schoolwork/analyse/route.ts ---------------- */

const VICTIM_UPLOAD = () => ({id:'up-victim', student_user_id:'victim', subject_hint:'english', primary_level_hint:3, status:'uploaded', mime_type:'text/plain', file_size_bytes:100});

function analyseRoute({canView, rpcError = null, failOn = null, upload = VICTIM_UPLOAD()}) {
 const tables = {nova_schoolwork_uploads:[upload], nova_schoolwork_settings:[{id:1, enabled:true}], nova_schoolwork_analyses:[], nova_schoolwork_analysis_runs:[]};
 const db = makeDb(tables, {failOn});
 const rpcCalls = [];
 const userClient = {
  auth:{getUser: async () => ({data:{user:{id:'attacker'}}, error:null})},
  rpc: async (name, args) => { rpcCalls.push({name, args, opIndex: db.ops.length}); return rpcError ? {data:null, error:rpcError} : {data:canView, error:null}; },
 };
 const stubs = {
  '@supabase/supabase-js': {createClient: () => userClient},
  'next/server': {NextResponse:{json:(body, init = {}) => ({status:init.status ?? 200, body})}},
  '@/lib/supabase-admin': {supabaseAdmin:{from:db.from, storage:{from(){ throw new Error('storage not expected in test'); }}}},
 };
 const {POST} = load('app/api/nova-plus/schoolwork/analyse/route.ts', stubs);
 const call = (body) => POST(new Request('http://local.test/api/nova-plus/schoolwork/analyse', {method:'POST', headers:{authorization:'Bearer valid','content-type':'application/json'}, body:JSON.stringify(body)}));
 return {call, db, tables, rpcCalls};
}
const uploadWrites = (db) => db.ops.filter((o) => o.table === 'nova_schoolwork_uploads' && o.op !== 'select');
const preAuthUploadReads = (db, rpcCalls) => db.ops.slice(0, rpcCalls[0]?.opIndex ?? db.ops.length).filter((o) => o.table === 'nova_schoolwork_uploads');

test('analyse: unauthorised caller gets 403 and the victim upload is unchanged', async () => {
 const t = analyseRoute({canView:false});
 const before = JSON.stringify(t.tables.nova_schoolwork_uploads[0]);
 const res = await t.call({upload_id:'up-victim', subject_hint:'math', primary_level_hint:6});
 assert.equal(res.status, 403);
 assert.equal(uploadWrites(t.db).length, 0);
 assert.equal(JSON.stringify(t.tables.nova_schoolwork_uploads[0]), before);
 assert.equal(t.db.ops.filter((o) => o.table === 'nova_schoolwork_analyses' || o.table === 'nova_schoolwork_analysis_runs').length, 0);
});
test('analyse: access RPC error is treated as denied with no writes', async () => {
 const t = analyseRoute({canView:true, rpcError:new Error('rpc down')});
 const res = await t.call({upload_id:'up-victim', subject_hint:'math'});
 assert.equal(res.status, 403);
 assert.equal(uploadWrites(t.db).length, 0);
});
test('analyse: only the owner column is read before authorisation', async () => {
 const t = analyseRoute({canView:false});
 await t.call({upload_id:'up-victim', subject_hint:'math'});
 assert.equal(t.rpcCalls.length, 1);
 assert.equal(t.rpcCalls[0].args.p_student_user_id, 'victim');
 const reads = preAuthUploadReads(t.db, t.rpcCalls);
 assert.equal(reads.length, 1);
 assert.equal(reads[0].cols, 'id,student_user_id');
});
test('analyse: failure before authorisation never reaches markFailed on the target upload', async () => {
 const t = analyseRoute({canView:false, failOn:(q) => q.table === 'nova_schoolwork_uploads' && q.op === 'select'});
 const before = JSON.stringify(t.tables.nova_schoolwork_uploads[0]);
 const res = await t.call({upload_id:'up-victim', subject_hint:'math'});
 assert.equal(res.status, 500);
 assert.equal(t.rpcCalls.length, 0);
 assert.equal(uploadWrites(t.db).length, 0);
 assert.equal(JSON.stringify(t.tables.nova_schoolwork_uploads[0]), before);
});
test('analyse: unknown upload is 404 with no writes', async () => {
 const t = analyseRoute({canView:true});
 const res = await t.call({upload_id:'missing'});
 assert.equal(res.status, 404);
 assert.equal(uploadWrites(t.db).length, 0);
});
test('analyse: authorised caller still applies hints, after the access check', async () => {
 const t = analyseRoute({canView:true});
 const res = await t.call({upload_id:'up-victim', subject_hint:'math', primary_level_hint:6});
 assert.equal(res.status, 400); // stops at the unsupported mime type used by this fixture
 const writes = uploadWrites(t.db);
 assert.equal(writes.length, 1);
 assert.ok(t.db.ops.indexOf(writes[0]) >= t.rpcCalls[0].opIndex, 'hint write must follow authorisation');
 assert.equal(t.tables.nova_schoolwork_uploads[0].subject_hint, 'math');
 assert.equal(t.tables.nova_schoolwork_uploads[0].primary_level_hint, 6);
});
test('analyse: failures after authorisation still mark the caller\'s own upload as failed', async () => {
 const t = analyseRoute({canView:true, failOn:(q) => q.table === 'nova_schoolwork_uploads' && q.op === 'update' && 'subject_hint' in (q.payload || {})});
 const res = await t.call({upload_id:'up-victim', subject_hint:'math'});
 assert.equal(res.status, 500);
 assert.equal(t.tables.nova_schoolwork_uploads[0].status, 'failed');
});
test('analyse: source orders the access RPC before the first upload write', () => {
 const src = read('app/api/nova-plus/schoolwork/analyse/route.ts');
 const post = src.slice(src.indexOf('export async function POST'));
 const rpc = post.indexOf('"nova_plus_can_view_student"');
 assert.ok(rpc > 0);
 assert.ok(rpc < post.indexOf('.update('));
 assert.ok(rpc < post.indexOf('uploadId = requestedUploadId'));
 assert.ok(rpc < post.indexOf('.select("*")'));
});
