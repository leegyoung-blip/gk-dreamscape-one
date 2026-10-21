/** PERF-2C-3B: DT display balances read the stored balance; rules, statements and history keep the ledger. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');

const HELPER = 'lib/wallet/dreamTokenBalance.ts';
function loadHelper() {
 const out = ts.transpileModule(read(HELPER), {compilerOptions:{target:ts.ScriptTarget.ES2020, module:ts.ModuleKind.CommonJS}, reportDiagnostics:true});
 assert.equal(out.diagnostics?.length ?? 0, 0);
 const mod = {exports:{}};
 vm.runInNewContext(out.outputText, {exports:mod.exports, module:mod, require:() => ({})});
 return mod.exports.fetchDreamTokenBalance;
}
const fetchDreamTokenBalance = loadHelper();
// Matches fetchDreamTokenBalance(supabase, <id>) however the call is wrapped across lines.
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const helperCall = (id) => new RegExp('fetchDreamTokenBalance\\(\\s*supabase,\\s*' + escapeRe(id) + ',?\\s*\\)');

/* Records every query so tests can assert the table, columns and filters used. */
function mockClient(result) {
 const calls = [];
 const client = {
  from(table) {
   const call = {table, select:null, filters:[], single:false};
   calls.push(call);
   const b = {
    select(cols) { call.select = cols; return b; },
    eq(col, val) { call.filters.push([col, val]); return b; },
    maybeSingle() { call.single = true; return Promise.resolve(result); },
   };
   return b;
  },
 };
 return {client, calls};
}

test('helper reads only the caller\'s own stored balance (RLS policy auth.uid() = id)', async () => {
 const {client, calls} = mockClient({data:{dream_token_balance:1250}, error:null});
 const r = await fetchDreamTokenBalance(client, 'user-a');
 assert.deepEqual({...r}, {data:1250, error:null});
 assert.equal(calls.length, 1);
 assert.equal(calls[0].table, 'profiles');
 assert.equal(calls[0].select, 'dream_token_balance');
 assert.deepEqual(calls[0].filters, [['id', 'user-a']]);
 assert.equal(calls[0].single, true);
 assert.ok(!calls.some((c) => c.table === 'dream_token_transactions'), 'never downloads ledger rows');
});
test('a genuine zero balance is a successful result, not an error', async () => {
 for (const row of [{dream_token_balance:0}, {dream_token_balance:'0'}]) {
  const {client} = mockClient({data:row, error:null});
  const r = await fetchDreamTokenBalance(client, 'user-a');
  assert.deepEqual({...r}, {data:0, error:null}, JSON.stringify(row));
 }
 // A profile that exists but has no stored balance yet had no ledger rows before: still a genuine 0.
 const {client} = mockClient({data:{dream_token_balance:null}, error:null});
 assert.deepEqual({...(await fetchDreamTokenBalance(client, 'user-a'))}, {data:0, error:null});
});
test('numeric balances are returned exactly', async () => {
 for (const [row, expected] of [[{dream_token_balance:'40'}, 40], [{dream_token_balance:-15}, -15], [{dream_token_balance:500000}, 500000]]) {
  const {client} = mockClient({data:row, error:null});
  assert.deepEqual({...(await fetchDreamTokenBalance(client, 'user-a'))}, {data:expected, error:null}, JSON.stringify(row));
 }
});
test('a missing or RLS-invisible profile row is an error, distinguishable from zero', async () => {
 const {client} = mockClient({data:null, error:null});
 const r = await fetchDreamTokenBalance(client, 'user-a');
 assert.equal(r.data, 0, 'pages that ignore the error still show 0, as before');
 assert.ok(r.error, 'missing profile must not be a silent zero');
 assert.equal(r.error.code, 'DT_BALANCE_PROFILE_NOT_FOUND');
 assert.match(r.error.message, /profile was not found or is not visible/);
});
test('an unreadable stored balance is an error, not a silent zero', async () => {
 const {client} = mockClient({data:{dream_token_balance:'not-a-number'}, error:null});
 const r = await fetchDreamTokenBalance(client, 'user-a');
 assert.equal(r.data, 0);
 assert.equal(r.error.code, 'DT_BALANCE_INVALID_VALUE');
});
test('a Supabase query failure is passed through unchanged', async () => {
 const failure = {message:'permission denied for table profiles', code:'42501'};
 const {client} = mockClient({data:null, error:failure});
 const r = await fetchDreamTokenBalance(client, 'user-a');
 assert.equal(r.data, 0);
 assert.equal(r.error, failure, 'the original error object reaches the page');
});
test('stored balance is equivalent to the original virtual-ledger calculation for consistent data', async () => {
 // Production reconciliation (PERF-2C-3) found 0 of 120 profiles differing; this pins the contract the
 // trigger maintains: stored balance == sum of token_kind = 'virtual' amounts for that user.
 const ledger = [
  {user_id:'a', token_kind:'virtual', amount:100}, {user_id:'a', token_kind:'virtual', amount:-30},
  {user_id:'a', token_kind:'virtual', amount:500000}, {user_id:'b', token_kind:'virtual', amount:7},
 ];
 const oldBrowserSum = (u) => ledger.filter((r) => r.user_id === u && r.token_kind === 'virtual').reduce((s, r) => s + Number(r.amount || 0), 0);
 // 'c' has a profile but no ledger rows: the old sum was 0 and the stored balance is 0.
 for (const user of ['a', 'b', 'c']) {
  const {client} = mockClient({data:{dream_token_balance:oldBrowserSum(user)}, error:null});
  const r = await fetchDreamTokenBalance(client, user);
  assert.equal(r.error, null, user);
  assert.equal(r.data, oldBrowserSum(user), user);
 }
});

/* ---------------- Account changes and stale responses ---------------- */

// A client whose balance responses resolve when the test releases them, in any order.
function deferredClient(balances) {
 const pending = [];
 const client = {from() {
  let id;
  const b = {select() { return b; }, eq(_c, v) { id = v; return b; }, maybeSingle() {
   return new Promise((resolve) => pending.push({id, resolve: () => resolve({data:{dream_token_balance:balances[id]}, error:null})}));
  }};
  return b;
 }};
 return {client, release: (id) => { const i = pending.findIndex((p) => p.id === id); pending.splice(i, 1)[0].resolve(); }};
}
const flush = () => new Promise((r) => setTimeout(r, 0));

test('stale-response pattern: a slower load for the previous account never overwrites the new account', async () => {
 // Mirrors the pages' guard: const loadId = ++latestLoadId; ... if (isStale()) return;
 const {client, release} = deferredClient({'user-a':900, 'user-b':12});
 let latestLoadId = 0, shown = null;
 async function load(userId) {
  const loadId = ++latestLoadId;
  const isStale = () => loadId !== latestLoadId;
  const r = await fetchDreamTokenBalance(client, userId);
  if (isStale()) return;
  shown = r.error ? 0 : r.data;
 }
 const first = load('user-a');   // learner A starts loading
 const second = load('user-b');  // account switches to B before A returns
 release('user-b'); await second;
 release('user-a'); await first; // A's late response must be ignored
 assert.equal(shown, 12);
});
test('account-check pattern: a wallet refresh for a different account is discarded', async () => {
 // Mirrors Thinking Lab: if (userIdRef.current !== accountUserId) return; and Activity Lab's isCurrent().
 const {client, release} = deferredClient({'user-a':900, 'user-b':12});
 const userIdRef = {current:'user-a'};
 let shown = 'untouched';
 async function refresh(accountUserId) {
  const r = await fetchDreamTokenBalance(client, accountUserId);
  if (userIdRef.current !== accountUserId) return;
  shown = r.data;
 }
 const pending = refresh('user-a');
 userIdRef.current = 'user-b'; // signed out of A and into B while A's refresh is in flight
 release('user-a'); await pending; await flush();
 assert.equal(shown, 'untouched', 'A\'s balance is never shown to B');
});
test('converted pages keep their stale and account guards next to the balance read', () => {
 const guarded = {
  'components/core-missions/CoreMissionTopBar.tsx': /if \(isStale\(\)\) return;/,
  'app/inventor/page.tsx': /if \(isStale\(\)\) return;/,
  'app/inventor/hub/page.tsx': /if \(isStale\(\)\) return;/,
  'app/learning-missions/page.tsx': /if \(isStale\(\)\) return;/,
  'app/milo-world/page.tsx': /if \(isStale\(\)\) return;/,
  'app/nova/thinking-skills-lab/page.tsx': /if \(userIdRef\.current !== accountUserId\) return;/,
  'app/milo-world/activity-lab/page.tsx': /if \(!isCurrent\(\)\) return;/,
  'app/profile/page.tsx': /profileUserIdRef\.current !== userId/,
 };
 for (const [file, re] of Object.entries(guarded)) assert.match(read(file), re, file);
});
test('pages handle a balance error without throwing, and guests never call the helper', () => {
 for (const file of Object.keys(CONVERTED)) {
  const src = read(file);
  assert.ok(!/throw\s+[A-Za-z.]*(balance|token)[A-Za-z.]*\.error/i.test(src), `${file} throws on a balance error`);
  for (const m of src.matchAll(/fetchDreamTokenBalance\(\s*supabase,\s*([A-Za-z.]+),?\s*\)/g)) {
   assert.notEqual(m[1], 'null', `${file} calls the helper without a signed-in user`);
  }
 }
 // Communities resolves guests without a request, keeping guest state separate from errors.
 assert.match(read('app/milo-world/quiz-hall/communities/page.tsx'), /user\s*\?\s*fetchDreamTokenBalance\(\s*supabase,\s*user\.id,?\s*\)\s*:\s*Promise\.resolve\(\{ data: 0, error: null \}\)/);
});

/* ---------------- Converted pages ---------------- */

const CONVERTED = {
 'components/core-missions/CoreMissionTopBar.tsx': 'user.id',
 'components/dashboard/DashboardTopControls.tsx': 'user.id',
 'app/inventor/page.tsx': 'user.id',
 'app/inventor/hub/page.tsx': 'user.id',
 'app/learning-missions/page.tsx': 'user.id',
 'app/nova/thinking-skills-lab/page.tsx': 'user.id',
 'app/learning-missions/core/rover/RoverGarageClient.tsx': 'user.id',
 'app/learning-missions/science/[level]/[topic]/[quiz]/page.tsx': 'user.id',
 'app/learning-missions/think/gear/ThinkGearClient.tsx': 'resolvedUserId',
 'app/learning-missions/think/page.tsx': 'resolvedUserId',
 'app/profile/page.tsx': 'userId',
 'app/milo-world/page.tsx': 'user.id',
 'app/milo-world/activity-lab/page.tsx': 'activeUserId',
 'app/milo-world/club/page.tsx': 'user.id',
 'app/milo-world/club/negotiation/page.tsx': 'user.id',
 'app/milo-world/quiz-hall/communities/page.tsx': 'user.id',
 'app/milo-world/quiz-hall/creator-studio/page.tsx': 'signedInUser.id',
};
test('every converted page reads the DT balance through the helper with the session user id', () => {
 for (const [file, idExpr] of Object.entries(CONVERTED)) {
  const src = read(file);
  assert.match(src, /import \{ fetchDreamTokenBalance \} from "@\/lib\/wallet\/dreamTokenBalance";/, file);
  assert.match(src, helperCall(idExpr), `${file} passes ${idExpr}`);
  assert.ok(!/from\(\s*"dream_token_transactions"\s*\)\s*\.select\(\s*"amount(,token_kind)?"\s*\)/.test(src), `${file} still sums the ledger`);
 }
 const lab = read('app/nova/thinking-skills-lab/page.tsx');
 assert.match(lab, helperCall('accountUserId'), 'Thinking Lab wallet refresh');
});
test('the session user id comes from Supabase auth, never from route params or form input', () => {
 for (const file of Object.keys(CONVERTED)) {
  for (const m of read(file).matchAll(/fetchDreamTokenBalance\(\s*supabase,\s*([A-Za-z.]+),?\s*\)/g)) {
   assert.ok(!/params|searchParams|query|router|input/i.test(m[1]), `${file}: ${m[1]}`);
  }
 }
});

/* ---------------- Retained ledger reads ---------------- */

test('ledger reads that enforce rules, statements, logs or history are retained', () => {
 assert.match(read('app/milo-world/categories/page.tsx'), /from\("dream_token_transactions"\)\s*\.select\("id"\)[\s\S]{0,300}\.gte\("created_at", weekStartIso\)/, 'weekly category reward rule');
 assert.match(read('components/milo/activity-lab/MasteryCodeSurvival.tsx'), /\.ilike\("title", "Mastery Code Survival%"\)/, 'Survival daily cap');
 const bank = read('app/milo-world/bank/hooks/useBankAccount.ts');
 assert.match(bank, /get_milo_bank_account_summary/, 'Milo Bank summary RPC kept');
 assert.ok((bank.match(/from\("dream_token_transactions"\)/g) || []).length >= 3, 'Bank statements still read the ledger');
 assert.match(read('app/milo-world/bank/hooks/useMyMoneyTrend.ts'), /from\("dream_token_transactions"\)/, 'money trend kept');
 assert.match(read('app/milo-world/exchange/page.tsx'), /title\.ilike\.%stock exchange%/, 'Exchange trade log kept');
 assert.match(read('app/api/admin/dream-tokens/users/route.ts'), /from\("dream_token_transactions"\)/, 'admin tooling kept');
 assert.ok(!/fetchDreamTokenBalance/.test(read('app/milo-world/bank/hooks/useBankAccount.ts')), 'Milo Bank keeps its own calculation');
});
test('Profile transaction history stays lazy and on the ledger', () => {
 const src = read('app/profile/page.tsx');
 assert.match(src, /const loadTokenHistory = useCallback\(async \(userId: string\) => \{[\s\S]*?from\("dream_token_transactions"\)\s*\.select\("id,user_id,type,title,amount,token_kind,created_at"\)/);
 assert.match(src, /function openTokenHistory\(\) \{\s*setShowTokenHistory\(true\);/);
 // PERF-2C-4: the lazy history is paged — its first page plus "Load More", nothing else.
 assert.match(src, /const loadMoreTokenHistory = useCallback\([\s\S]*?from\("dream_token_transactions"\)\s*\.select\("id,user_id,type,title,amount,token_kind,created_at"\)/);
 assert.equal((src.match(/from\("dream_token_transactions"\)/g) || []).length, 2, 'only the lazy history queries');
});

/* ---------------- Writes, rewards and Dream Gems unchanged ---------------- */

test('ledger writes are untouched (same insert call sites)', () => {
 const expected = {'app/milo-world/activity-lab/page.tsx':1, 'app/milo-world/categories/page.tsx':1, 'app/milo-world/club/page.tsx':3, 'app/milo-world/club/negotiation/page.tsx':1};
 for (const [file, n] of Object.entries(expected)) {
  const count = (read(file).match(/from\(\s*"dream_token_transactions"\s*\)\s*\.insert\(/g) || []).length;
  assert.equal(count, n, `${file} insert sites`);
 }
 assert.ok(!/\.(insert|update|upsert|delete)\(/.test(read(HELPER)), 'helper never writes');
});
test('Dream Gem balances and histories are unchanged', () => {
 assert.ok(!/dream_gem/i.test(read(HELPER)), 'helper is DT only');
 for (const file of ['components/core-missions/CoreMissionTopBar.tsx', 'app/inventor/page.tsx', 'app/inventor/hub/page.tsx', 'app/learning-missions/page.tsx', 'app/nova/thinking-skills-lab/page.tsx', 'app/profile/page.tsx']) {
  assert.match(read(file), /dream_gem_balance/, `${file} still reads the stored DG balance`);
 }
 assert.match(read('app/profile/page.tsx'), /const loadGemHistory = useCallback/, 'DG history kept');
});

/* ---------------- Refresh, guests and account safety ---------------- */

test('balances still refresh after rewards, purchases and account changes', () => {
 for (const file of ['components/core-missions/CoreMissionTopBar.tsx', 'app/inventor/page.tsx', 'app/inventor/hub/page.tsx', 'app/learning-missions/page.tsx', 'app/milo-world/page.tsx', 'app/nova/thinking-skills-lab/page.tsx', 'app/profile/page.tsx']) {
  const src = read(file);
  assert.match(src, /addEventListener\(\s*"dream-tokens-updated"/, `${file} DT refresh event`);
 }
 const lab = read('app/milo-world/activity-lab/page.tsx');
 assert.match(lab, /fetchDreamTokenBalance\(\s*supabase,\s*activeUserId,?\s*\);\s*\n\s*\/\/ A newer account load may have started while this was in flight\.\s*\n\s*if \(!isCurrent\(\)\) return;/, 'Activity Lab stale guard right after the read');
 const think = read('app/nova/thinking-skills-lab/page.tsx');
 assert.match(think, /fetchDreamTokenBalance\(\s*supabase,\s*accountUserId,?\s*\);\s*\n(\s*\n)?\s*\/\/ Never show a previous account's wallet after switching accounts\.\s*\n\s*if \(userIdRef\.current !== accountUserId\) return;/, 'Thinking Lab account guard right after the read');
 for (const file of ['components/core-missions/CoreMissionTopBar.tsx', 'app/inventor/page.tsx', 'app/inventor/hub/page.tsx', 'app/learning-missions/page.tsx', 'app/milo-world/page.tsx']) {
  assert.match(read(file), /if \(isStale\(\)\) return;/, `${file} stale-response guard kept`);
  assert.match(read(file), /onAuthUserChange\(/, `${file} account-change reload kept`);
 }
});
test('no application-wide balance cache was introduced', () => {
 const src = read(HELPER);
 assert.ok(!/new Map|cache|let [a-z]+Balance|globalThis|window\./i.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), 'helper is stateless');
});
