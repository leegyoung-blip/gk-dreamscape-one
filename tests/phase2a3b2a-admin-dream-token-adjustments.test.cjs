/** 2A-3B-2A: admin Dream Token adjustments are server-verified, idempotent and use the existing ledger. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const ROUTE = 'app/api/admin/dream-tokens/credit/route.ts';
const PAGE = 'app/admin/dream-tokens/page.tsx';
const MIGRATION = 'sql/phase-2a3b2a-02-admin-dream-token-adjustments.sql';

const ID = {
 admin: '11111111-1111-4111-8111-111111111111',
 student: '22222222-2222-4222-8222-222222222222',
 agent: '33333333-3333-4333-8333-333333333333',
 teacher: '44444444-4444-4444-8444-444444444444',
 missing: '55555555-5555-4555-8555-555555555555',
};
const TITLES = {class_attendance:'Class Attendance Reward', manual_add:'Admin Manual Add', manual_deduct:'Admin Manual Deduct'};
const uuid = (n) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, '0')}`;

/* Mock Supabase service-role client. The RPC mirrors the SQL function contract and
   the ledger insert mirrors the balance trigger (balance += amount). */
function makeBackend({rpcMissing = false} = {}) {
 const profiles = {
  [ID.admin]: {id:ID.admin, role:' Admin ', dream_token_balance:1000000},
  [ID.student]: {id:ID.student, role:'student', dream_token_balance:120},
  [ID.agent]: {id:ID.agent, role:'regular', is_simulation_user:true, dream_token_balance:500},
  [ID.teacher]: {id:ID.teacher, role:'teacher', dream_token_balance:0},
 };
 const tokens = {'admin-token':ID.admin, 'student-token':ID.student, 'teacher-token':ID.teacher};
 const ledger = [], audit = new Map(), tableCalls = [], rpcCalls = [];
 const fromProfiles = () => {
  const filters = [];
  const b = {select(){ return b; }, eq(c, v){ filters.push([c, v]); return b; },
   maybeSingle: async () => { const row = Object.values(profiles).find((p) => filters.every(([c, v]) => p[c] === v)); return {data: row ? {...row} : null, error:null}; }};
  return b;
 };
 const client = {
  auth:{getUser: async (token) => tokens[token] ? {data:{user:{id:tokens[token]}}, error:null} : {data:{user:null}, error:new Error('bad jwt')}},
  from(table){ tableCalls.push(table); if (table !== 'profiles') throw new Error(`unexpected table ${table}`); return fromProfiles(); },
  async rpc(name, a){
   rpcCalls.push({name, a});
   if (name !== 'admin_adjust_dream_tokens') throw new Error(`unexpected rpc ${name}`);
   if (rpcMissing) return {data:null, error:{code:'PGRST202', message:'Could not find the function'}};
   if (TITLES[a.p_action] !== a.p_title) return {data:null, error:{code:'22023'}};
   if (String(profiles[a.p_admin_user_id]?.role || '').trim().toLowerCase() !== 'admin') return {data:null, error:{code:'42501'}};
   if (!profiles[a.p_target_user_id]) return {data:null, error:{code:'P0002'}};
   const prior = audit.get(a.p_request_id);
   if (prior) {
    if (prior.amount !== a.p_amount || prior.target !== a.p_target_user_id || prior.action !== a.p_action) return {data:null, error:{code:'P0001', message:'IDEMPOTENCY_KEY_REUSED'}};
    return {data:[{duplicate:true, ledger_transaction_id:prior.ledgerId, new_balance:profiles[a.p_target_user_id].dream_token_balance}], error:null};
   }
   const row = {id:`tx-${ledger.length + 1}`, user_id:a.p_target_user_id, amount:a.p_amount, token_kind:'virtual', type:a.p_amount < 0 ? 'spend' : 'earn', title:a.p_title};
   ledger.push(row);
   profiles[a.p_target_user_id].dream_token_balance += a.p_amount; // balance trigger
   audit.set(a.p_request_id, {amount:a.p_amount, target:a.p_target_user_id, action:a.p_action, admin:a.p_admin_user_id, ledgerId:row.id});
   return {data:[{duplicate:false, ledger_transaction_id:row.id, new_balance:profiles[a.p_target_user_id].dream_token_balance}], error:null};
  },
 };
 return {client, profiles, ledger, audit, tableCalls, rpcCalls};
}

function loadRoute(backend) {
 const out = ts.transpileModule(read(ROUTE), {compilerOptions:{target:ts.ScriptTarget.ES2020, module:ts.ModuleKind.CommonJS}, reportDiagnostics:true});
 assert.equal(out.diagnostics?.length ?? 0, 0);
 const mod = {exports:{}};
 const stubs = {
  'next/server': {NextResponse:{json:(body, init = {}) => ({status:init.status ?? 200, body})}},
  '@/lib/supabase/admin': {createAdminClient: () => backend.client},
 };
 vm.runInNewContext(out.outputText, {exports:mod.exports, module:mod, require:(n) => { if (!(n in stubs)) throw new Error(`unexpected import ${n}`); return stubs[n]; }, console:{error(){}, warn(){}, log(){}}});
 return mod.exports.POST;
}

function setup(opts) {
 const backend = makeBackend(opts);
 const POST = loadRoute(backend);
 const call = (body, token = 'admin-token') => POST(new Request('http://local.test/api/admin/dream-tokens/credit', {
  method:'POST', headers:{...(token ? {authorization:`Bearer ${token}`} : {}), 'content-type':'application/json'},
  body: typeof body === 'string' ? body : JSON.stringify(body),
 }));
 return {...backend, call};
}
const body = (over = {}) => ({userId:ID.student, action:'manual_add', amount:250, requestId:uuid(1), ...over});

test('authorised admin credit writes one virtual earn row and updates the balance via the trigger', async () => {
 const t = setup();
 const res = await t.call(body());
 assert.equal(res.status, 200);
 assert.deepEqual({...res.body}, {success:true, duplicate:false, amount:250, newBalance:370});
 assert.equal(t.ledger.length, 1);
 assert.deepEqual({...t.ledger[0], id:undefined}, {id:undefined, user_id:ID.student, amount:250, token_kind:'virtual', type:'earn', title:'Admin Manual Add'});
 assert.equal(t.audit.get(uuid(1)).admin, ID.admin, 'acting admin recorded');
});
test('authorised admin debit writes a spend row with a negative amount', async () => {
 const t = setup();
 const res = await t.call(body({action:'manual_deduct', amount:40}));
 assert.equal(res.status, 200);
 assert.equal(t.ledger[0].amount, -40); assert.equal(t.ledger[0].type, 'spend'); assert.equal(t.ledger[0].title, 'Admin Manual Deduct');
 assert.equal(t.profiles[ID.student].dream_token_balance, 80);
});
test('class attendance is fixed at 100 DT regardless of the submitted amount', async () => {
 const t = setup();
 await t.call(body({action:'class_attendance', amount:999999}));
 assert.equal(t.ledger[0].amount, 100); assert.equal(t.ledger[0].title, 'Class Attendance Reward');
});
test('large authorised credits of 500,000 DT and above are accepted without a business cap', async () => {
 const t = setup();
 for (const [i, amount] of [500000, 1000000, 25000000, 2147483647].entries()) {
  const res = await t.call(body({userId:ID.admin, amount, requestId:uuid(10 + i)}));
  assert.equal(res.status, 200, `amount ${amount}`);
 }
 assert.deepEqual(t.ledger.map((r) => r.amount), [500000, 1000000, 25000000, 2147483647]);
});
test('admin, student, teacher and simulation agent accounts can all be adjusted', async () => {
 const t = setup();
 for (const [i, userId] of [ID.admin, ID.student, ID.teacher, ID.agent].entries()) {
  const res = await t.call(body({userId, requestId:uuid(20 + i)}));
  assert.equal(res.status, 200);
 }
 assert.deepEqual(t.ledger.map((r) => r.user_id), [ID.admin, ID.student, ID.teacher, ID.agent]);
});
test('ordinary users receive 403 and write nothing', async () => {
 for (const token of ['student-token', 'teacher-token']) {
  const t = setup();
  const res = await t.call(body({userId:ID.student}), token);
  assert.equal(res.status, 403);
  assert.equal(t.ledger.length, 0); assert.equal(t.rpcCalls.length, 0);
 }
});
test('missing or invalid session receives 401 before the body is read', async () => {
 for (const token of [null, 'forged-token']) {
  const t = setup();
  const res = await t.call('{not json', token);
  assert.equal(res.status, 401);
  assert.equal(t.rpcCalls.length, 0);
 }
});
test('invalid or zero amounts and actions are rejected before any write', async () => {
 const bad = [
  {amount:0}, {amount:-5}, {amount:2.5}, {amount:'250'}, {amount:null}, {amount:2147483648},
  {amount:Number.MAX_SAFE_INTEGER + 1}, {action:'manual_mint'}, {action:undefined},
 ];
 for (const over of bad) {
  const t = setup();
  const res = await t.call(body(over));
  assert.equal(res.status, 400, JSON.stringify(over));
  assert.equal(t.rpcCalls.length, 0);
 }
});
test('invalid targets are rejected: malformed id 400, unknown account 404', async () => {
 const t = setup();
 assert.equal((await t.call(body({userId:'not-a-uuid'}))).status, 400);
 assert.equal((await t.call(body({userId:ID.missing}))).status, 404);
 assert.equal(t.ledger.length, 0);
});
test('a missing or malformed request id is rejected', async () => {
 const t = setup();
 assert.equal((await t.call(body({requestId:undefined}))).status, 400);
 assert.equal((await t.call(body({requestId:'retry-1'}))).status, 400);
 assert.equal(t.rpcCalls.length, 0);
});
test('a duplicate request does not double-credit', async () => {
 const t = setup();
 const first = await t.call(body({amount:500000}));
 const second = await t.call(body({amount:500000}));
 assert.equal(first.status, 200); assert.equal(second.status, 200);
 assert.equal(second.body.duplicate, true);
 assert.equal(t.ledger.length, 1);
 assert.equal(t.profiles[ID.student].dream_token_balance, 500120);
});
test('reusing a request id for a different adjustment is refused with 409', async () => {
 const t = setup();
 await t.call(body({amount:10}));
 const res = await t.call(body({amount:20}));
 assert.equal(res.status, 409);
 assert.equal(t.ledger.length, 1);
});
test('client-supplied titles are ignored', async () => {
 const t = setup();
 await t.call({...body(), title:'Free money'});
 assert.equal(t.ledger[0].title, 'Admin Manual Add');
});
test('fails closed with 503 when the migration is not applied, with no direct ledger fallback', async () => {
 const t = setup({rpcMissing:true});
 const res = await t.call(body());
 assert.equal(res.status, 503);
 assert.ok(!t.tableCalls.includes('dream_token_transactions'));
});
test('route never touches the ledger table directly and does not leak database errors', () => {
 const src = read(ROUTE);
 assert.ok(!src.includes('"dream_token_transactions"'));
 assert.ok(!/\.eq\("role",\s*"student"\)/.test(src), 'student-only target restriction removed');
 assert.ok(!/error:\s*\w+Error\.message/.test(src) && !/error\.message\s*}/.test(src));
});
test('admin page no longer inserts ledger rows from the browser and calls the API with a request id', () => {
 const src = read(PAGE);
 assert.ok(!/from\(\s*["']dream_token_transactions["']\s*\)\s*\.insert/.test(src));
 assert.ok(src.includes('"/api/admin/dream-tokens/credit"'));
 assert.ok(/Authorization:\s*`Bearer \$\{session\.access_token\}`/.test(src));
 assert.ok(src.includes('crypto.randomUUID()') && src.includes('requestId: pendingTokenRequest.current.requestId'));
 assert.ok(src.includes('"admin_adjust_dream_gems"'), 'Dream Gem flow unchanged');
});
test('migration is additive, uses the existing ledger and keeps the trigger and Dream Gems untouched', () => {
 const sql = read(MIGRATION).replace(/--.*$/gm, '');
 assert.match(sql, /INSERT INTO public\.dream_token_transactions AS t \(user_id, amount, token_kind, type, title\)/);
 assert.match(sql, /SECURITY DEFINER\s+SET search_path = ''/);
 assert.match(sql, /REVOKE ALL ON FUNCTION public\.admin_adjust_dream_tokens[^;]+FROM PUBLIC, anon, authenticated;/);
 assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.admin_adjust_dream_tokens[^;]+TO service_role;/);
 assert.match(sql, /ERRCODE = '42501'/);
 assert.match(sql, /FOR UPDATE/);
 for (const title of Object.values(TITLES)) assert.ok(sql.includes(`'${title}'`));
 assert.ok(!/ALTER TABLE public\.dream_token_transactions|DROP TRIGGER|UPDATE public\.dream_token_transactions|DELETE FROM public\.dream_token_transactions|UPDATE public\.profiles/i.test(sql));
 assert.ok(!/dream_gem/i.test(sql));
 assert.ok(!/\b(cap|limit)\b/i.test(sql.replace(/LIMIT 1/g, '')), 'no business caps');
});
test('preflight and postflight scripts are read only', () => {
 for (const f of ['sql/phase-2a3b2a-01-readonly-preflight.sql', 'sql/phase-2a3b2a-03-readonly-postflight.sql']) {
  const sql = read(f).replace(/--.*$/gm, '').replace(/'[^']*'/g, "''");
  assert.ok(!/\b(create|alter|drop|insert|update|delete|grant|revoke|truncate)\b/i.test(sql), f);
 }
});
