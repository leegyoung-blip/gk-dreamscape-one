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

/* Mock Supabase service-role client. The RPC mirrors the SQL function contract
   (admin re-check, target lock, idempotency before capacity, column-capacity checks,
   balances returned as text) and the ledger insert mirrors the balance trigger. */
const CAPACITY = {smallint:32767n, integer:2147483647n, bigint:9223372036854775807n, numeric:null};
function makeBackend({rpcMissing = false, rpcData, amountType = 'integer', balanceType = 'bigint'} = {}) {
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
   if (rpcData !== undefined) return {data:rpcData, error:null};
   if (TITLES[a.p_action] !== a.p_title) return {data:null, error:{code:'22023'}};
   if (String(profiles[a.p_admin_user_id]?.role || '').trim().toLowerCase() !== 'admin') return {data:null, error:{code:'42501'}};
   const target = profiles[a.p_target_user_id];
   if (!target) return {data:null, error:{code:'P0002'}};
   const prior = audit.get(a.p_request_id);
   if (prior) {
    if (prior.amount !== a.p_amount || prior.target !== a.p_target_user_id || prior.action !== a.p_action) return {data:null, error:{code:'P0001', message:'IDEMPOTENCY_KEY_REUSED'}};
    return {data:[{duplicate:true, ledger_transaction_id:prior.ledgerId, new_balance:String(target.dream_token_balance)}], error:null};
   }
   const amountCap = CAPACITY[amountType], balanceCap = CAPACITY[balanceType];
   const amount = BigInt(a.p_amount), resulting = BigInt(target.dream_token_balance) + amount;
   const abs = (v) => (v < 0n ? -v : v);
   if (amountCap !== null && abs(amount) > amountCap) return {data:null, error:{code:'22003'}};
   if (balanceCap !== null && abs(resulting) > balanceCap) return {data:null, error:{code:'22003'}};
   const row = {id:`tx-${ledger.length + 1}`, user_id:a.p_target_user_id, amount:a.p_amount, token_kind:'virtual', type:a.p_amount < 0 ? 'spend' : 'earn', title:a.p_title};
   ledger.push(row);
   target.dream_token_balance = typeof target.dream_token_balance === 'bigint' || abs(resulting) > BigInt(Number.MAX_SAFE_INTEGER) ? resulting : Number(resulting); // balance trigger
   audit.set(a.p_request_id, {amount:a.p_amount, target:a.p_target_user_id, action:a.p_action, admin:a.p_admin_user_id, ledgerId:row.id});
   return {data:[{duplicate:false, ledger_transaction_id:row.id, new_balance:String(target.dream_token_balance)}], error:null};
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
 assert.deepEqual({...res.body}, {success:true, duplicate:false, amount:250, ledgerTransactionId:'tx-1', newBalance:370});
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
  {amount:0}, {amount:-5}, {amount:2.5}, {amount:'250'}, {amount:null}, {amount:1e20},
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
test('malformed or missing RPC results never report success', async () => {
 const malformed = [
  null, {}, [], [null], ['row'], [{}],
  [{duplicate:'false', ledger_transaction_id:'tx-1', new_balance:'10'}],
  [{duplicate:false, ledger_transaction_id:'', new_balance:'10'}],
  [{duplicate:false, ledger_transaction_id:null, new_balance:'10'}],
  [{duplicate:false, new_balance:'10'}],
  [{duplicate:false, ledger_transaction_id:'tx-1'}, {duplicate:false, ledger_transaction_id:'tx-2'}],
  {duplicate:false, ledger_transaction_id:'tx-1', new_balance:'10'},
 ];
 for (const rpcData of malformed) {
  const t = setup({rpcData});
  const res = await t.call(body());
  assert.equal(res.status, 502, JSON.stringify(rpcData));
  assert.notEqual(res.body.success, true);
 }
});
test('balance values are parsed safely and Number(null) is never reported as 0', async () => {
 const cases = [
  [null, null], [undefined, null], ['', null], ['abc', null], ['12.5', null], [12.5, null],
  ['9223372036854775807', null], [Number.MAX_SAFE_INTEGER + 2, null],
  ['0', 0], [0, 0], ['370', 370], [' 370 ', 370], ['-40', -40], [370, 370],
 ];
 for (const [value, expected] of cases) {
  const t = setup({rpcData:[{duplicate:false, ledger_transaction_id:'tx-1', new_balance:value}]});
  const res = await t.call(body());
  assert.equal(res.status, 200, JSON.stringify(value));
  assert.equal(res.body.newBalance, expected, `new_balance ${JSON.stringify(value)}`);
 }
});
test('credits up to the profile balance capacity succeed; one more DT is refused with no ledger row', async () => {
 const t = setup({amountType:'integer', balanceType:'integer'});
 const headroom = 2147483647 - 120;
 const ok = await t.call(body({amount:headroom, requestId:uuid(30)}));
 assert.equal(ok.status, 200);
 assert.equal(ok.body.newBalance, 2147483647);
 const over = await t.call(body({amount:1, requestId:uuid(31)}));
 assert.equal(over.status, 400);
 assert.match(over.body.error, /database capacity/);
 assert.equal(t.ledger.length, 1);
 assert.equal(t.profiles[ID.student].dream_token_balance, 2147483647);
});
test('a single amount larger than the ledger column capacity is refused; a wider column accepts it', async () => {
 const narrow = setup({amountType:'integer'});
 const refused = await narrow.call(body({amount:2147483648}));
 assert.equal(refused.status, 400);
 assert.equal(narrow.ledger.length, 0);
 const wide = setup({amountType:'bigint', balanceType:'bigint'});
 const accepted = await wide.call(body({amount:5000000000000}));
 assert.equal(accepted.status, 200);
 assert.equal(wide.ledger[0].amount, 5000000000000);
});
test('a confirmed request is still recognised as a duplicate after the balance reaches capacity', async () => {
 const t = setup({balanceType:'integer'});
 await t.call(body({amount:2147483647 - 120, requestId:uuid(40)}));
 const retry = await t.call(body({amount:2147483647 - 120, requestId:uuid(40)}));
 assert.equal(retry.status, 200);
 assert.equal(retry.body.duplicate, true);
 assert.equal(t.ledger.length, 1);
});
test('balances beyond the exact JavaScript range are reported as unknown, not rounded', async () => {
 const t = setup({amountType:'bigint', balanceType:'bigint'});
 t.profiles[ID.student].dream_token_balance = 9007199254740990n;
 const res = await t.call(body({amount:5}));
 assert.equal(res.status, 200);
 assert.equal(res.body.newBalance, null);
 assert.equal(t.profiles[ID.student].dream_token_balance, 9007199254740995n);
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
test('migration validates column types and the exact enabled INSERT balance trigger before creating anything', () => {
 const sql = read(MIGRATION).replace(/--.*$/gm, '');
 const guard = sql.slice(sql.indexOf('$phase2a3b2a_guard$'), sql.lastIndexOf('$phase2a3b2a_guard$'));
 assert.match(guard, /column_name = 'amount'[\s\S]+NOT IN \('smallint', 'integer', 'bigint', 'numeric'\)/);
 assert.match(guard, /column_name = 'dream_token_balance'[\s\S]+NOT IN \('smallint', 'integer', 'bigint', 'numeric'\)/);
 assert.match(guard, /tgenabled IN \('O', 'A'\)/);
 assert.match(guard, /\(t\.tgtype & 4\) <> 0/);
 assert.match(guard, /p\.proname = 'update_profile_dream_token_balance'/);
 assert.match(guard, /v_trigger_count <> 1/);
 assert.match(guard, /relforcerowsecurity[\s\S]+pg_has_role\(current_user, c\.relowner, 'USAGE'\)[\s\S]+rolbypassrls/);
 assert.ok(sql.indexOf('$phase2a3b2a_guard$') < sql.indexOf('CREATE TABLE'), 'guard runs first');
});
test('function enforces capacity after idempotency, writes ledger and audit atomically, and returns text balances', () => {
 const sql = read(MIGRATION).replace(/--.*$/gm, '');
 const fn = sql.slice(sql.indexOf('CREATE FUNCTION public.admin_adjust_dream_tokens'), sql.indexOf('$fn$;'));
 assert.match(fn, /RETURNS TABLE \(duplicate boolean, ledger_transaction_id text, new_balance text\)/);
 assert.match(fn, /information_schema\.columns[\s\S]+'dream_token_transactions'[\s\S]+column_name = 'amount'/);
 assert.match(fn, /information_schema\.columns[\s\S]+'profiles'[\s\S]+column_name = 'dream_token_balance'/);
 assert.equal((fn.match(/ERRCODE = '22003'/g) || []).length, 2);
 const lock = fn.indexOf('FOR UPDATE');
 const duplicateCheck = fn.indexOf('WHERE a.request_id = p_request_id');
 const capacity = fn.indexOf("ERRCODE = '22003'");
 const ledgerInsert = fn.indexOf('INSERT INTO public.dream_token_transactions');
 const auditInsert = fn.indexOf('INSERT INTO public.admin_dream_token_adjustments');
 assert.ok(lock > 0 && lock < duplicateCheck && duplicateCheck < capacity && capacity < ledgerInsert && ledgerInsert < auditInsert);
 assert.match(fn.slice(auditInsert), /ON CONFLICT \(request_id\) DO NOTHING[\s\S]+v_claimed = 0[\s\S]+IDEMPOTENCY_KEY_REUSED/);
 assert.match(sql, /ledger_transaction_id text NOT NULL/);
 assert.ok(!/\bCOMMIT\b|\bROLLBACK\b|EXCEPTION\s+WHEN/i.test(fn), 'no partial commit or swallowed errors inside the function');
});
test('preflight and postflight scripts are read only', () => {
 for (const f of ['sql/phase-2a3b2a-01-readonly-preflight.sql', 'sql/phase-2a3b2a-03-readonly-postflight.sql']) {
  const sql = read(f).replace(/--.*$/gm, '').replace(/'[^']*'/g, "''");
  assert.ok(!/\b(create|alter|drop|insert|update|delete|grant|revoke|truncate)\b/i.test(sql), f);
 }
});
